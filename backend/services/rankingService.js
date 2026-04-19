'use strict';

/**
 * RankingService — normalizes and combines multiple relevance signals
 * into a single final_score used to rank search results.
 *
 * Scoring formula (configurable weights):
 *   final = w_semantic * semantic_norm
 *         + w_keyword  * keyword_norm
 *         + w_click    * click_norm    (optional)
 *         + w_recency  * recency_norm  (optional)
 */

class RankingService {
  constructor(weights = {}) {
    // Default weights — must sum to 1.0
    this.weights = {
      semantic : weights.semantic  ?? 0.70,
      keyword  : weights.keyword   ?? 0.30,
      click    : weights.click     ?? 0.00,
      recency  : weights.recency   ?? 0.00,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Rank an array of result objects.
   * Each result must have: { scores: { keyword, semantic }, documentId, ... }
   * Optional: scores.click, scores.recency
   *
   * Returns results sorted by final_score descending.
   */
  rank(results, topK = 20) {
    if (!results || results.length === 0) return [];

    // 1. Normalize each signal independently across the result set
    const keywordNorm  = this._normalizeField(results, r => r.scores.keyword);
    const semanticNorm = this._normalizeField(results, r => r.scores.semantic);
    const clickNorm    = this._normalizeField(results, r => r.scores.click   ?? 0);
    const recencyNorm  = this._normalizeField(results, r => r.scores.recency ?? 0);

    // 2. Compute final score
    const ranked = results.map((r, i) => ({
      ...r,
      scores: {
        ...r.scores,
        keywordNorm:  keywordNorm[i],
        semanticNorm: semanticNorm[i],
        clickNorm:    clickNorm[i],
        recencyNorm:  recencyNorm[i],
        final: this._finalScore(keywordNorm[i], semanticNorm[i], clickNorm[i], recencyNorm[i]),
      },
    }));

    // 3. Sort descending and return top-k
    return ranked
      .sort((a, b) => b.scores.final - a.scores.final)
      .slice(0, topK);
  }

  /**
   * Merge keyword results and FAISS semantic results into a unified list,
   * then rank them.
   */
  mergeAndRank(keywordResults, semanticResults, topK = 20) {
    const map = new Map();

    // Index keyword results
    for (const r of keywordResults) {
      const key = `${r.documentId}::${r.chunkIndex}`;
      map.set(key, { ...r, scores: { keyword: r.scores.keyword, semantic: 0 } });
    }

    // Merge semantic results
    for (const r of semanticResults) {
      const key = `${r.documentId}::${r.chunkIndex}`;
      if (map.has(key)) {
        map.get(key).scores.semantic = r.scores.semantic;
      } else {
        map.set(key, { ...r, scores: { keyword: 0, semantic: r.scores.semantic } });
      }
    }

    return this.rank(Array.from(map.values()), topK);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Min-max normalization of a single field across all results.
   * Returns an array of normalized values in [0, 1].
   */
  _normalizeField(results, accessor) {
    const values = results.map(accessor);
    const min    = Math.min(...values);
    const max    = Math.max(...values);
    const range  = max - min;
    if (range === 0) return values.map(() => max > 0 ? 1 : 0);
    return values.map(v => (v - min) / range);
  }

  _finalScore(kw, sem, click, recency) {
    return (
      this.weights.semantic * sem   +
      this.weights.keyword  * kw    +
      this.weights.click    * click +
      this.weights.recency  * recency
    );
  }
}

module.exports = RankingService;
