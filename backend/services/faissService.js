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
const faiss  = require('faiss-node');
const logger = require('../utils/logger');

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
      // Fall back to empty index so the server still starts
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
    if (embeddings.length !== metaItems.length) {
      throw new Error('embeddings and metaItems must have the same length');
    }
    if (embeddings.length === 0) return;

    // faiss-node expects a flat Float32Array
    const flat = new Float32Array(embeddings.length * this.dimension);
    for (let i = 0; i < embeddings.length; i++) {
      flat.set(embeddings[i], i * this.dimension);
    }

    this.index.add(flat);
    this.metadata.push(...metaItems);
    this.totalVectors += embeddings.length;
  }

  /**
   * Search for top-k nearest neighbours.
   * @param {number[]} queryEmbedding — float32 array of length = dimension
   * @param {number}   k              — number of results to return
   * @returns {{ label: number, distance: number, meta: object }[]}
   */
  search(queryEmbedding, k = 10) {
    if (!this.ready) throw new Error('FaissService not initialized');
    if (this.totalVectors === 0) return [];

    const safeK = Math.min(k, this.totalVectors);
    const flat  = new Float32Array(queryEmbedding);

    const { labels, distances } = this.index.search(flat, safeK);

    const results = [];
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (label < 0 || label >= this.metadata.length) continue; // FAISS returns -1 for empty slots
      results.push({
        label,
        distance: distances[i],   // inner product (higher = more similar for IndexFlatIP)
        meta: this.metadata[label],
      });
    }

    return results;
  }

  /**
   * Persist index + metadata to disk.
   */
  save() {
    if (!this.ready || this.totalVectors === 0) return;
    try {
      fs.mkdirSync(INDEX_DIR, { recursive: true });
      faiss.write_index(this.index, INDEX_FILE);
      fs.writeFileSync(META_FILE, JSON.stringify(this.metadata), 'utf8');
      logger.info(`FaissService: saved ${this.totalVectors.toLocaleString()} vectors to disk`);
    } catch (err) {
      logger.error('FaissService: save failed:', err.message);
    }
  }

  /**
   * Rebuild the index from scratch (used by buildIndex.js script).
   */
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
    // HNSW: fast approximate search, good recall, low memory
    // M=32 (connections per node), efConstruction=40 (build quality)
    try {
      this.index = new faiss.IndexHNSWFlat(this.dimension, 32);
      logger.info(`FaissService: created IndexHNSWFlat(dim=${this.dimension}, M=32)`);
    } catch {
      // Fallback to exact search if HNSW not available in this build
      this.index = new faiss.IndexFlatIP(this.dimension);
      logger.info(`FaissService: created IndexFlatIP(dim=${this.dimension}) [fallback]`);
    }
  }
}

// Singleton — one index per process
const faissService = new FaissService();
module.exports = faissService;
