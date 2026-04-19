'use strict';
/**
 * Creates MongoDB indexes for fast search.
 * Run once: node scripts/createIndexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  // Full-text index on chunk text for fast keyword search
  try {
    await db.collection('documents').createIndex(
      { 'chunks.text': 'text', title: 'text' },
      { name: 'chunks_text_search', weights: { title: 10, 'chunks.text': 1 } }
    );
    console.log('✓ Text index on chunks.text + title');
  } catch (e) { console.log('  Text index:', e.message); }

  // Compound index for document queries
  try {
    await db.collection('documents').createIndex(
      { isActive: 1, processingStatus: 1, isPublic: 1, uploadedBy: 1 },
      { name: 'doc_search_compound' }
    );
    console.log('✓ Compound index on isActive+processingStatus+isPublic+uploadedBy');
  } catch (e) { console.log('  Compound index:', e.message); }

  // Index for analytics queries
  try {
    await db.collection('searchqueries').createIndex(
      { userId: 1, createdAt: -1 },
      { name: 'user_search_history' }
    );
    console.log('✓ Index on searchqueries.userId+createdAt');
  } catch (e) { console.log('  SearchQuery index:', e.message); }

  console.log('\nDone.');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
