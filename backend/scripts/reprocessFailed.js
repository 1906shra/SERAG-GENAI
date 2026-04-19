'use strict';

/**
 * Reprocesses all documents stuck in 'pending' or 'failed' state.
 * Run once: node scripts/reprocessFailed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('../models/Document');
const DocumentService = require('../services/documentService');
const ChunkingService = require('../services/chunkingService');
const EmbeddingService = require('../services/embeddingService');
const logger = require('../utils/logger');

async function reprocess(doc) {
  const documentService = new DocumentService();
  const chunkingService = new ChunkingService();
  const embeddingService = new EmbeddingService();

  console.log(`\nProcessing: "${doc.title}" (${doc._id})`);

  try {
    await Document.findByIdAndUpdate(doc._id, { processingStatus: 'processing', processingError: null });

    // If content already extracted, skip re-extraction
    let content = doc.content;
    if (!content || content.trim().length === 0) {
      console.log('  Extracting content...');
      const result = await documentService.processDocument(doc.source, doc.contentType, doc.source);
      content = result.content;
      await Document.findByIdAndUpdate(doc._id, {
        content,
        originalContent: content,
        'metadata.wordCount': result.metadata.wordCount,
        'metadata.fileSize': result.metadata.fileSize,
        'metadata.language': result.metadata.language,
      });
    }

    // Chunk
    const chunks = chunkingService.chunkDocument(content, { chunkSize: 1000, chunkOverlap: 200 });
    console.log(`  Chunked into ${chunks.length} pieces`);

    // Try embeddings (optional)
    let finalChunks = chunks;
    try {
      finalChunks = await embeddingService.generateChunkEmbeddings(chunks, { batchSize: 5 });
      console.log(`  Embeddings generated: ${finalChunks.length} chunks`);
    } catch (embErr) {
      console.log(`  Embeddings skipped (${embErr.message.split(':')[0]}) — keyword search only`);
    }

    await Document.findByIdAndUpdate(doc._id, { chunks: finalChunks, processingStatus: 'completed' });
    console.log(`  ✓ Completed`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    await Document.findByIdAndUpdate(doc._id, { processingStatus: 'failed', processingError: err.message });
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const docs = await Document.find({
    processingStatus: { $in: ['pending', 'failed'] }
  }).select('_id title source contentType content');

  console.log(`Found ${docs.length} document(s) to reprocess`);

  for (const doc of docs) {
    await reprocess(doc);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
