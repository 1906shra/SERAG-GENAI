'use strict';
/**
 * Imports dataset.json into MongoDB as public searchable documents.
 * Groups entries by topic → one Document per topic (chunked by entry).
 * Run: node scripts/importDataset.js
 */

require('dotenv').config();
const fs       = require('fs');
const path     = require('path');
const mongoose = require('mongoose');
const Document = require('../models/Document');
const logger   = require('../utils/logger');

const DATASET_PATH = path.join(__dirname, '../../dataset.json');
const BATCH_SIZE   = 500;

async function main() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  // Check if already imported
  const existing = await Document.countDocuments({ 'metadata.category': 'knowledge-base', isPublic: true });
  if (existing > 0) {
    console.log(`Knowledge base already imported (${existing} documents). Skipping.`);
    console.log('To re-import, delete documents with category "knowledge-base" first.');
    await mongoose.disconnect();
    return;
  }

  console.log('Reading dataset.json…');
  const raw  = fs.readFileSync(DATASET_PATH, 'utf8');
  const data = JSON.parse(raw);
  console.log(`Loaded ${data.length.toLocaleString()} entries.\n`);

  // Group by topic
  const byTopic = {};
  for (const entry of data) {
    const topic = entry.topic || 'General';
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic].push(entry.text);
  }

  const topics = Object.keys(byTopic);
  console.log(`Topics (${topics.length}): ${topics.join(', ')}\n`);

  let totalDocs   = 0;
  let totalChunks = 0;

  for (const topic of topics) {
    const texts     = byTopic[topic];
    const chunkSize = 50; // entries per chunk
    const chunks    = [];

    for (let i = 0; i < texts.length; i += chunkSize) {
      const batch = texts.slice(i, i + chunkSize);
      chunks.push({
        text: batch.join('\n\n'),
        embedding: [],
        metadata: {
          chunkIndex: chunks.length,
          startIndex: i,
          endIndex:   Math.min(i + chunkSize, texts.length),
          wordCount:  batch.join(' ').split(/\s+/).length,
        }
      });
    }

    const content = texts.join('\n\n');

    const doc = new Document({
      title:          `${topic} Knowledge Base`,
      content,
      originalContent: content,
      contentType:    'text',
      source:         `knowledge-base/${topic.toLowerCase().replace(/\s+/g, '-')}`,
      uploadedBy:     new mongoose.Types.ObjectId('000000000000000000000001'), // system user
      chunks,
      metadata: {
        wordCount:  content.split(/\s+/).length,
        fileSize:   Buffer.byteLength(content, 'utf8'),
        language:   'en',
        tags:       [topic.toLowerCase(), 'knowledge-base', 'ai-generated'],
        category:   'knowledge-base',
      },
      processingStatus: 'completed',
      isPublic:  true,
      isActive:  true,
    });

    await doc.save();
    totalDocs++;
    totalChunks += chunks.length;
    console.log(`  ✓ ${topic.padEnd(20)} ${texts.length.toLocaleString().padStart(6)} entries → ${chunks.length} chunks`);
  }

  console.log(`\nDone! Imported ${totalDocs} documents, ${totalChunks} chunks total.`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
