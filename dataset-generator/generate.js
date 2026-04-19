'use strict';

const fs   = require('fs');
const path = require('path');
const { generateEntry } = require('./generators');

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const TOTAL        = 100_000;
const BATCH_SIZE   = 1_000;
const LOG_EVERY    = 10_000;
const OUTPUT_FILE  = path.join(__dirname, '..', 'dataset.json');
const MAX_RETRIES  = 10;   // max attempts to find a unique sentence per slot

// ─── DEDUPLICATION ───────────────────────────────────────────────────────────
// Use a Set of normalized text fingerprints (lowercase, collapsed whitespace)
const seen = new Set();

function fingerprint(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isDuplicate(text) {
  const fp = fingerprint(text);
  if (seen.has(fp)) return true;
  seen.add(fp);
  return false;
}

// ─── BATCH GENERATION ────────────────────────────────────────────────────────
function generateBatch(size) {
  const batch = [];
  let attempts = 0;

  while (batch.length < size) {
    attempts++;
    if (attempts > size * MAX_RETRIES) {
      // Safety valve: if we can't fill the batch after many tries, break
      console.warn(`  [warn] Could only generate ${batch.length}/${size} unique entries after ${attempts} attempts`);
      break;
    }

    const entry = generateEntry();
    if (!entry || !entry.text || entry.text.trim().length < 20) continue;
    if (isDuplicate(entry.text)) continue;

    batch.push({ text: entry.text.trim(), topic: entry.topic });
  }

  return batch;
}

// ─── STREAMING WRITER ────────────────────────────────────────────────────────
// Write JSON array incrementally to avoid holding 100K entries in memory
class StreamingJSONWriter {
  constructor(filePath) {
    this.filePath = filePath;
    this.fd = fs.openSync(filePath, 'w');
    this.count = 0;
    fs.writeSync(this.fd, '[\n');
  }

  writeBatch(entries) {
    for (const entry of entries) {
      const prefix = this.count === 0 ? '  ' : ',\n  ';
      fs.writeSync(this.fd, prefix + JSON.stringify(entry));
      this.count++;
    }
  }

  close() {
    fs.writeSync(this.fd, '\n]\n');
    fs.closeSync(this.fd);
  }
}

// ─── PROGRESS LOGGER ─────────────────────────────────────────────────────────
function logProgress(generated, total, startTime) {
  const elapsed = (Date.now() - startTime) / 1000;
  const rate    = Math.round(generated / elapsed);
  const eta     = Math.round((total - generated) / rate);
  const bar     = '█'.repeat(Math.floor(generated / total * 20)).padEnd(20, '░');
  console.log(`  [${bar}] ${generated.toLocaleString()} / ${total.toLocaleString()}  |  ${rate}/s  |  ETA: ${eta}s`);
}

// ─── TOPIC STATS ─────────────────────────────────────────────────────────────
function printTopicStats(entries) {
  const counts = {};
  for (const e of entries) {
    counts[e.topic] = (counts[e.topic] || 0) + 1;
  }
  console.log('\n  Topic distribution:');
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([topic, count]) => {
      const bar = '▪'.repeat(Math.round(count / entries.length * 40));
      console.log(`    ${topic.padEnd(18)} ${String(count).padStart(6)}  ${bar}`);
    });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     Dataset Generation Pipeline  —  100K entries     ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Output : ${OUTPUT_FILE}`);
  console.log(`  Total  : ${TOTAL.toLocaleString()} entries`);
  console.log(`  Batch  : ${BATCH_SIZE.toLocaleString()} entries/batch`);
  console.log('');

  const writer    = new StreamingJSONWriter(OUTPUT_FILE);
  const startTime = Date.now();
  let generated   = 0;
  // Keep a sample for stats (last 10K)
  const sample    = [];

  const numBatches = Math.ceil(TOTAL / BATCH_SIZE);

  for (let b = 0; b < numBatches; b++) {
    const remaining  = TOTAL - generated;
    const batchSize  = Math.min(BATCH_SIZE, remaining);

    // Use setImmediate to yield to the event loop between batches
    await new Promise(resolve => setImmediate(resolve));

    const batch = generateBatch(batchSize);
    writer.writeBatch(batch);
    generated += batch.length;

    // Keep rolling sample for stats
    sample.push(...batch);
    if (sample.length > 10_000) sample.splice(0, sample.length - 10_000);

    if (generated % LOG_EVERY === 0 || generated >= TOTAL) {
      logProgress(generated, TOTAL, startTime);
    }
  }

  writer.close();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(1);

  console.log('');
  console.log('  ✓ Generation complete!');
  console.log(`  ✓ Entries written : ${generated.toLocaleString()}`);
  console.log(`  ✓ Unique entries  : ${seen.size.toLocaleString()}`);
  console.log(`  ✓ File size       : ${fileSizeMB} MB`);
  console.log(`  ✓ Time elapsed    : ${elapsed}s`);

  printTopicStats(sample);
  console.log('');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
