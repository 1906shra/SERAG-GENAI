'use strict';

/**
 * CacheService — in-memory TTL cache for search results and embeddings.
 *
 * Uses a Map with per-entry expiry timestamps.
 * No external dependencies — zero latency overhead.
 */

const logger = require('../utils/logger');

class CacheService {
  constructor(options = {}) {
    this.store      = new Map();          // key → { value, expiresAt }
    this.defaultTTL = options.ttl  || 60_000;   // 60 s
    this.maxSize    = options.maxSize || 1_000;  // max entries
    this.hits       = 0;
    this.misses     = 0;

    // Periodic cleanup every 2 minutes
    this._cleanupInterval = setInterval(() => this._cleanup(), 120_000);
    this._cleanupInterval.unref(); // don't block process exit
  }

  // ── Core ops ───────────────────────────────────────────────────────────────

  set(key, value, ttl = this.defaultTTL) {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  stats() {
    const total = this.hits + this.misses;
    return {
      size:     this.store.size,
      maxSize:  this.maxSize,
      hits:     this.hits,
      misses:   this.misses,
      hitRate:  total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%',
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Build a deterministic cache key from a query + options object */
  static buildKey(prefix, query, options = {}) {
    const stable = JSON.stringify({ q: query.toLowerCase().trim(), ...options });
    // Simple djb2 hash — fast, no crypto needed
    let hash = 5381;
    for (let i = 0; i < stable.length; i++) {
      hash = ((hash << 5) + hash) ^ stable.charCodeAt(i);
      hash = hash >>> 0; // keep unsigned 32-bit
    }
    return `${prefix}:${hash}`;
  }

  _cleanup() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) { this.store.delete(key); removed++; }
    }
    if (removed > 0) logger.debug(`Cache cleanup: removed ${removed} expired entries`);
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this.store.clear();
  }
}

// Singleton instances — shared across the process
const searchCache    = new CacheService({ ttl: 60_000,  maxSize: 500  }); // 60s, 500 queries
const embeddingCache = new CacheService({ ttl: 300_000, maxSize: 2000 }); // 5 min, 2K embeddings

module.exports = { CacheService, searchCache, embeddingCache };
