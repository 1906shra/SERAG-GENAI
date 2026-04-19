'use strict';

/**
 * SearchService — upgraded hybrid search pipeline.
 *
 * Pipeline:
 *   1. Check query cache (instant return if hit)
 *   2. Normalize query
 *   3. Run keyword search (BM25-like, in-memory over chunk texts)
 *   4. Run FAISS semantic search (if index has vectors)
 *      — query embedding is cached separately
 *   5. Merge + rank via RankingService (normalized scores)
 *   6. Cache result
 *   7. Return top-k
 *
 * Target latency: < 200ms for cached queries, < 500ms cold.
 */

const mongoose        = require('mongoose');
const Document        = require('../models/Document');
const EmbeddingService = require('../services/embeddingService');
const faissService    = require('../services/faissService');
const RankingService  = require('../services/rankingService');
const { searchCache, embeddingCache, CacheService } = require('../services/cacheService');
const logger          = require('../utils/logger');

// Stop-words to skip during tokenization
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'this','that','these','those','it','its','i','you','he','she','we','they',
]);

class SearchService {
  constructor(options = {}) {
    this.embeddingService = new EmbeddingService();
    this.rankingService   = new RankingService({
      semantic: options.semanticWeight ?? 0.70,
      keyword:  options.keywordWeight  ?? 0.30,
    });
    this.defaultMaxResults = 10;
    this.minQueryLength    = 2;
    this.faiss             = faissService;
  }

  // ── Main entry point ───────────────────────────────────────────────────────

  async hybridSearch(query, options = {}) {
    const t0 = Date.now();

    const {
      userId,
      maxResults    = this.defaultMaxResults,
      semanticWeight = 0.70,
      keywordWeight  = 0.30,
      includePublic  = true,
      filters        = {},
    } = options;

    if (!query || query.trim().length < this.minQueryLength) {
      throw new Error(`Query must be at least ${this.minQueryLength} characters`);
    }

    const normalizedQuery = this._normalize(query);

    // ── 1. Query cache ───────────────────────────────────────────────────────
    const cacheKey = CacheService.buildKey('search', normalizedQuery, {
      userId, maxResults, semanticWeight, keywordWeight, includePublic,
      ...filters,
    });

    const cached = searchCache.get(cacheKey);
    if (cached) {
      logger.info(`Search cache HIT: "${normalizedQuery}" (${Date.now() - t0}ms)`);
      return { ...cached, fromCache: true, searchTime: Date.now() - t0 };
    }

    // ── 2. Fetch documents (metadata + chunks, no full content) ──────────────
    const docQuery = this._buildDocQuery(userId, includePublic, filters);

    // First: fast $text search to find relevant document IDs
    let relevantDocIds = null;
    try {
      const textMatches = await Document.find({
        ...docQuery,
        $text: { $search: normalizedQuery },
      })
        .select('_id')
        .limit(20)
        .lean();

      if (textMatches.length > 0) {
        relevantDocIds = textMatches.map(d => d._id);
      }
    } catch { /* text index unavailable — fetch all */ }

    // Fetch only relevant documents (or all if text search found nothing)
    const fetchQuery = relevantDocIds
      ? { ...docQuery, _id: { $in: relevantDocIds } }
      : docQuery;

    const documents = await Document.find(fetchQuery)
      .select('_id title source chunks metadata contentType')
      .lean();

    if (documents.length === 0) {
      return { results: [], query: normalizedQuery, totalResults: 0, searchTime: Date.now() - t0 };
    }

    // ── 3. Parallel: keyword search + FAISS semantic search ──────────────────
    const [keywordResults, semanticResults] = await Promise.all([
      this._keywordSearch(normalizedQuery, documents),
      this._faissSearch(normalizedQuery, documents, maxResults * 2),
    ]);

    const tSearch = Date.now() - t0;

    // ── 4. Merge + rank ───────────────────────────────────────────────────────
    const rankingService = new RankingService({ semantic: semanticWeight, keyword: keywordWeight });
    const ranked = rankingService.mergeAndRank(keywordResults, semanticResults, maxResults);

    const totalTime = Date.now() - t0;

    const payload = {
      results:      ranked,
      query:        normalizedQuery,
      totalResults: ranked.length,
      searchTime:   totalTime,
      fromCache:    false,
      performance: {
        keywordTime:  tSearch,
        semanticTime: tSearch,
        rankingTime:  totalTime - tSearch,
        faissVectors: this.faiss.totalVectors,
        cacheStats:   searchCache.stats(),
      },
    };

    // ── 5. Cache result ───────────────────────────────────────────────────────
    searchCache.set(cacheKey, payload);

    logger.info(
      `Search: "${normalizedQuery}" → ${ranked.length} results in ${totalTime}ms ` +
      `(kw:${keywordResults.length} sem:${semanticResults.length} faiss:${this.faiss.totalVectors})`
    );

    return payload;
  }

  // ── Keyword search — uses MongoDB $text index for speed ──────────────────

  async _keywordSearch(query, documents) {
    const terms = this._tokenize(query);
    if (terms.length === 0) return [];

    // Build allowed document ID set for access control
    const allowedIds = new Set(documents.map(d => d._id.toString()));

    try {
      // Use MongoDB full-text search — O(log n) via text index
      const textResults = await Document.find({
        $text: { $search: query },
        _id: { $in: Array.from(allowedIds) },
        isActive: true,
        processingStatus: 'completed',
      })
        .select({ _id: 1, title: 1, source: 1, chunks: 1, metadata: 1, score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(20)
        .lean();

      if (textResults.length > 0) {
        const results = [];
        for (const doc of textResults) {
          const textScore = doc.score || 0;
          for (const chunk of doc.chunks) {
            if (!chunk.text || chunk.text.trim().length === 0) continue;
            // Refine with BM25 within the chunk
            const chunkScore = this._bm25Score(chunk.text, terms, doc.title);
            const combined   = Math.min((textScore * 0.1 + chunkScore) / 2, 1);
            if (combined > 0) {
              results.push({
                documentId:    doc._id.toString(),
                chunkIndex:    chunk.metadata?.chunkIndex ?? 0,
                text:          chunk.text,
                documentTitle: doc.title,
                documentSource: doc.source,
                contentType:   doc.metadata?.contentType || doc.contentType || 'text',
                scores:        { keyword: combined, semantic: 0 },
              });
            }
          }
        }
        return results.sort((a, b) => b.scores.keyword - a.scores.keyword).slice(0, 50);
      }
    } catch (textErr) {
      // $text search failed — fall back to in-memory BM25
      logger.debug('$text search unavailable, using in-memory BM25:', textErr.message);
    }

    // ── Fallback: in-memory BM25 over pre-fetched documents ─────────────────
    const results = [];
    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        if (!chunk.text || chunk.text.trim().length === 0) continue;
        const score = this._bm25Score(chunk.text, terms, doc.title);
        if (score > 0) {
          results.push({
            documentId:    doc._id.toString(),
            chunkIndex:    chunk.metadata?.chunkIndex ?? 0,
            text:          chunk.text,
            documentTitle: doc.title,
            documentSource: doc.source,
            contentType:   doc.metadata?.contentType || doc.contentType || 'text',
            scores:        { keyword: score, semantic: 0 },
          });
        }
      }
    }
    return results.sort((a, b) => b.scores.keyword - a.scores.keyword).slice(0, 50);
  }

  // ── FAISS semantic search ──────────────────────────────────────────────────

  async _faissSearch(query, documents, k = 20) {
    if (!this.faiss.ready || this.faiss.totalVectors === 0) return [];

    // Build a set of allowed documentIds for this user/filter
    const allowedIds = new Set(documents.map(d => d._id.toString()));

    try {
      // Embedding cache
      const embKey = CacheService.buildKey('emb', query, {});
      let queryEmbedding = embeddingCache.get(embKey);

      if (!queryEmbedding) {
        queryEmbedding = await this.embeddingService.generateEmbedding(query);
        embeddingCache.set(embKey, queryEmbedding);
      }

      const faissResults = this.faiss.search(queryEmbedding, k);

      // Filter to only documents this user can see
      return faissResults
        .filter(r => allowedIds.has(r.meta.documentId))
        .map(r => ({
          documentId:    r.meta.documentId,
          chunkIndex:    r.meta.chunkIndex,
          text:          r.meta.text,
          documentTitle: r.meta.documentTitle,
          documentSource: r.meta.source,
          contentType:   'text',
          scores:        { keyword: 0, semantic: Math.max(0, r.distance) },
        }));
    } catch (err) {
      logger.warn('FAISS search skipped:', err.message);
      return [];
    }
  }

  // ── BM25-like scoring ──────────────────────────────────────────────────────

  _bm25Score(text, terms, title = '') {
    const k1 = 1.5, b = 0.75;
    const words      = text.toLowerCase().split(/\s+/);
    const docLen     = words.length;
    const avgDocLen  = 200; // approximate average chunk length

    let score = 0;
    let matched = 0;

    for (const term of terms) {
      const tf = words.filter(w => w === term || w.startsWith(term)).length;
      if (tf === 0) continue;
      matched++;

      // BM25 TF component
      const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLen)));
      // Simplified IDF (no corpus stats — use log(1 + 1/tf) as proxy)
      const idf = Math.log(1 + 1 / (tf + 0.5));
      score += tfNorm * idf;

      // Phrase bonus
      if (text.toLowerCase().includes(term)) score += 0.3;
    }

    if (docLen > 0) score /= Math.sqrt(docLen);
    if (matched === terms.length) score *= 1.5;

    // Title match bonus
    const titleLower = title.toLowerCase();
    if (terms.some(t => titleLower.includes(t))) score *= 1.3;

    return Math.min(score, 1);
  }

  // ── Suggestions ────────────────────────────────────────────────────────────

  async getSearchSuggestions(partialQuery, userId, options = {}) {
    try {
      const { limit = 10 } = options;
      if (!partialQuery || partialQuery.length < 2) return [];

      const SearchQuery = mongoose.model('SearchQuery');
      const recent = await SearchQuery.find({
        userId,
        query: { $regex: partialQuery, $options: 'i' },
      })
        .sort({ createdAt: -1 })
        .limit(limit * 2)
        .select('query')
        .lean();

      return [...new Set(recent.map(q => q.query))].slice(0, limit);
    } catch (err) {
      logger.error('Suggestions error:', err);
      return [];
    }
  }

  async getPopularQueries(options = {}) {
    try {
      const SearchQuery = mongoose.model('SearchQuery');
      return await SearchQuery.getPopularQueries({ limit: options.limit || 20 });
    } catch (err) {
      logger.error('Popular queries error:', err);
      return [];
    }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  validateSearchParams(params) {
    const errors = [];
    if (params.maxResults && (params.maxResults < 1 || params.maxResults > 50))
      errors.push('maxResults must be between 1 and 50');
    if (params.semanticWeight !== undefined && (params.semanticWeight < 0 || params.semanticWeight > 1))
      errors.push('semanticWeight must be between 0 and 1');
    if (params.keywordWeight !== undefined && (params.keywordWeight < 0 || params.keywordWeight > 1))
      errors.push('keywordWeight must be between 0 and 1');
    return errors;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _normalize(query) {
    return query.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  _tokenize(query) {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2 && !STOP_WORDS.has(t))
      .filter((t, i, arr) => arr.indexOf(t) === i);
  }

  _buildDocQuery(userId, includePublic, filters) {
    const q = { isActive: true, processingStatus: 'completed' };
    const or = [{ uploadedBy: userId }];
    if (includePublic) or.push({ isPublic: true });
    q.$or = or;
    if (filters.contentType)              q.contentType          = filters.contentType;
    if (filters.tags?.length)             q['metadata.tags']     = { $in: filters.tags };
    if (filters.category)                 q['metadata.category'] = filters.category;
    if (filters.dateRange?.start)         q.createdAt            = { $gte: new Date(filters.dateRange.start), $lte: new Date(filters.dateRange.end) };
    return q;
  }
}

module.exports = SearchService;
