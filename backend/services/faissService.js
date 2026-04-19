'use strict';

/**
 * FaissService — manages an in-process FAISS index for fast ANN search.
 *
 * Index type: IndexHNSWFlat (approximate, very fast, good recall)
 * Fallback:   IndexFlatIP  (exact, slower but always correct)
 *
 * Metadata (documentId, chunkIndex, text snippet) is stored in a parallel
 * in-memory array so we never need to re-query MongoDB just to get the
 * chunk text for the top-k results.
 *
 * The index is persisted to disk so it survives server restarts.
 */

const fs     = require('fs');
const path   = require('path');
const logger = require('../utils/logger');

// faiss-node requires native binaries — may not be available on all platforms
let faiss = null;
try {
  faiss = require('faiss-node');
} catch (e) {
  logger.warn('faiss-node not available — semantic search disabled. Install faiss-node for vector search.');
}

const INDEX_DIR  = path.join(__dirname, '..', 'data');
const INDEX_FILE = path.join(INDEX_DIR, 'faiss.index');
const META_FILE  = path.join(INDEX_DIR, 'faiss_meta.json');

class FaissService {
  constructor() {
    this.dimension  = parseInt(process.env.VECTOR_DIMENSION) || 1536;
    this.index      = null;   // faiss index object
    this.metadata   = [];     // parallel array: [{ documentId, chunkIndex, text, documentTitle, source }]
    this.ready      = false;
    this.totalVectors = 0;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Load index from disk if it exists, otherwise create a fresh one.
   * Called once at server startup.
   */
  async initialize() {
    try {
      if (!faiss) {
        logger.warn('FaissService: faiss-node unavailable — running keyword-only mode');
        this.ready = true;
        return;
      }

      fs.mkdirSync(INDEX_DIR, { recursive: true });

      if (fs.existsSync(INDEX_FILE) && fs.existsSync(META_FILE)) {
        logger.info('FaissService: loading index from disk…');
        this.index    = faiss.read_index(INDEX_FILE);
        this.metadata = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
        this.totalVectors = this.index.ntotal();
        logger.info(`FaissService: loaded ${this.totalVectors.toLocaleString()} vectors`);
      } else {
        logger.info('FaissService: no index on disk — creating empty HNSW index');
        this._createFreshIndex();
      }

      this.ready = true;
    } catch (err) {
      logger.error('FaissService: initialization failed:', err.message);
      this._createFreshIndex();
      this.ready = true;
    }
  }

  /**
   * Add a batch of vectors + metadata to the index.
   * @param {number[][]} embeddings  — array of float32 arrays, each length = dimension
   * @param {object[]}   metaItems   — parallel array of metadata objects
   */
  addBatch(embeddings, metaItems) {
    if (!this.ready) throw new Error('FaissService not initialized');
    if (!faiss || !this.index) return; // no-op if faiss unavailable
    if (embeddings.length !== metaItems.length) {
      throw new Error('embeddings and metaItems must have the same length');
    }
    if (embeddings.length === 0) return;

    const flat = new Float32Array(embeddings.length * this.dimension);
    for (let i = 0; i < embeddings.length; i++) {
      flat.set(embeddings[i], i * this.dimension);
    }

    this.index.add(flat);
    this.metadata.push(...metaItems);
    this.totalVectors += embeddings.length;
  }

  search(queryEmbedding, k = 10) {
    if (!this.ready) throw new Error('FaissService not initialized');
    if (!faiss || !this.index || this.totalVectors === 0) return [];

    const safeK = Math.min(k, this.totalVectors);
    const flat  = new Float32Array(queryEmbedding);

    const { labels, distances } = this.index.search(flat, safeK);

    const results = [];
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (label < 0 || label >= this.metadata.length) continue;
      results.push({
        label,
        distance: distances[i],
        meta: this.metadata[label],
      });
    }

    return results;
  }

  save() {
    if (!faiss || !this.ready || this.totalVectors === 0) return;
    try {
      fs.mkdirSync(INDEX_DIR, { recursive: true });
      faiss.write_index(this.index, INDEX_FILE);
      fs.writeFileSync(META_FILE, JSON.stringify(this.metadata), 'utf8');
      logger.info(`FaissService: saved ${this.totalVectors.toLocaleString()} vectors to disk`);
    } catch (err) {
      logger.error('FaissService: save failed:', err.message);
    }
  }

  reset() {
    this._createFreshIndex();
    this.metadata     = [];
    this.totalVectors = 0;
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  status() {
    return {
      ready:        this.ready,
      totalVectors: this.totalVectors,
      dimension:    this.dimension,
      indexFile:    INDEX_FILE,
      metaFile:     META_FILE,
      indexExists:  fs.existsSync(INDEX_FILE),
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _createFreshIndex() {
    if (!faiss) { this.index = null; return; }
    try {
      this.index = new faiss.IndexHNSWFlat(this.dimension, 32);
      logger.info(`FaissService: created IndexHNSWFlat(dim=${this.dimension}, M=32)`);
    } catch {
      this.index = new faiss.IndexFlatIP(this.dimension);
      logger.info(`FaissService: created IndexFlatIP(dim=${this.dimension}) [fallback]`);
    }
  }
}

// Singleton — one index per process
const faissService = new FaissService();
module.exports = faissService;
