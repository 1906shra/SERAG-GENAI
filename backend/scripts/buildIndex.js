'use strict';

/**
 * buildIndex.js — offline FAISS index builder.
 *
 * Reads all completed documents from MongoDB, generates embeddings for
 * any chunks that don't have them yet, then builds and saves the FAISS index.
 *
 * Run:  node scripts/buildIndex.js
 *
 * Options (env vars):
 *   BATCH_SIZE=100   — chunks per embedding batch
 *   DRY_RUN=1        — print stats without writing index
 */

require('dotenv').config();
const mongoose        = require('mongoose');
const Document        = require('../models/Document');
const EmbeddingService = require('../services/embeddingService');
const faissService    = require('../services/faissService');
const logger          = require('../utils/logger');

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 100;
const DRY_RUN    = process.env.DRY_RUN === '1';

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         FAISS Index Builder                      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB\n');

  const embeddingService = new EmbeddingService();

  // Reset index
  faissService.reset();

  // Fetch all completed documents
  const docs = await Document.find({ processingStatus: 'completed', isActive: true })
    .select('_id title source chunks')
    .lean();

  console.log(`Found ${docs.length} documents\n`);

  let totalChunks    = 0;
  let indexedChunks  = 0;
  let skippedChunks  = 0;
  let embeddingErrors = 0;

  for (const doc of docs) {
    const chunksToEmbed = [];
    const chunkMeta     = [];

    for (const chunk of doc.chunks) {
      totalChunks++;
      if (!chunk.text || chunk.text.trim().length === 0) { skippedChunks++; continue; }

      // If embedding already exists, add directly to FAISS
      if (chunk.embedding && chunk.embedding.length > 0) {
        faissService.addBatch([chunk.embedding], [{
          documentId:    doc._id.toString(),
          chunkIndex:    chunk.metadata?.chunkIndex ?? 0,
          text:          chunk.text.substring(0, 500),
          documentTitle: doc.title,
          source:        doc.source,
        }]);
        indexedChunks++;
        continue;
      }

      // Queue for embedding generation
      chunksToEmbed.push(chunk);
      chunkMeta.push({
        documentId:    doc._id.toString(),
        chunkIndex:    chunk.metadata?.chunkIndex ?? 0,
        text:          chunk.text.substring(0, 500),
        documentTitle: doc.title,
        source:        doc.source,
      });
    }

    // Generate embeddings in batches
    if (chunksToEmbed.length > 0 && !DRY_RUN) {
      for (let i = 0; i < chunksToEmbed.length; i += BATCH_SIZE) {
        const batch     = chunksToEmbed.slice(i, i + BATCH_SIZE);
        const batchMeta = chunkMeta.slice(i, i + BATCH_SIZE);
        const texts     = batch.map(c => c.text);

        try {
          const embeddings = await embeddingService.generateBatchEmbeddings(texts, { batchSize: 5 });

          // Persist embeddings back to MongoDB
          for (let j = 0; j < batch.length; j++) {
            if (embeddings[j]) {
              await Document.updateOne(
                { _id: doc._id, 'chunks.metadata.chunkIndex': batch[j].metadata?.chunkIndex },
                { $set: { 'chunks.$.embedding': embeddings[j] } }
              );
            }
          }

          // Add to FAISS
          const validPairs = embeddings
            .map((e, j) => ({ e, m: batchMeta[j] }))
            .filter(p => p.e && p.e.length > 0);

          faissService.addBatch(validPairs.map(p => p.e), validPairs.map(p => p.m));
          indexedChunks += validPairs.length;

          process.stdout.write(`\r  ${doc.title.substring(0,30).padEnd(30)} — ${indexedChunks} indexed`);
        } catch (err) {
          embeddingErrors += batch.length;
          logger.warn(`Embedding failed for doc ${doc._id}: ${err.message}`);
        }
      }
    }
  }

  console.log('\n');
  console.log(`  Total chunks    : ${totalChunks.toLocaleString()}`);
  console.log(`  Indexed         : ${indexedChunks.toLocaleString()}`);
  console.log(`  Skipped (empty) : ${skippedChunks.toLocaleString()}`);
  console.log(`  Embedding errors: ${embeddingErrors.toLocaleString()}`);
  console.log(`  FAISS vectors   : ${faissService.totalVectors.toLocaleString()}`);

  if (!DRY_RUN && faissService.totalVectors > 0) {
    faissService.save();
    console.log('\n✓ Index saved to disk');
  } else if (DRY_RUN) {
    console.log('\n[DRY RUN] Index NOT saved');
  } else {
    console.log('\n⚠ No vectors to save');
  }

  await mongoose.disconnect();
  console.log('✓ Done\n');
}

main().catch(err => { console.error(err); process.exit(1); });
