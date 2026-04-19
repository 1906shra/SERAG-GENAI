'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

class EmbeddingService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.embeddingModel = 'text-embedding-ada-002';
    this.dimension = parseInt(process.env.VECTOR_DIMENSION) || 1536;
    this.maxRetries = 5;
    this.baseRetryDelay = 2000; // 2s base, doubles each retry
    // Conservative defaults to stay within free-tier rate limits
    // text-embedding-ada-002: 3,000 RPM on free tier
    this.batchSize = 5;         // texts per API call
    this.interBatchDelay = 500; // ms between batches
  }

  // ── Single embedding ────────────────────────────────────────────────────────

  async generateEmbedding(text, retryCount = 0) {
    try {
      if (!this.openaiApiKey) throw new Error('OpenAI API key is not configured');
      if (!text || text.trim().length === 0) throw new Error('Text cannot be empty');

      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        { input: text.substring(0, 8000), model: this.embeddingModel },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data?.data?.length) throw new Error('Invalid response from OpenAI API');

      const embedding = response.data.data[0].embedding;
      if (embedding.length !== this.dimension) {
        throw new Error(`Embedding dimension mismatch. Expected ${this.dimension}, got ${embedding.length}`);
      }
      return embedding;
    } catch (error) {
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        const waitMs = this._retryWait(error, retryCount);
        logger.warn(`Embedding rate limited, retrying in ${waitMs}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        await this.delay(waitMs);
        return this.generateEmbedding(text, retryCount + 1);
      }
      logger.error(`Embedding generation failed after ${retryCount + 1} attempts:`, error.message);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  // ── Batch embeddings (sequential, with backoff) ─────────────────────────────

  async generateBatchEmbeddings(texts, options = {}) {
    if (!texts || texts.length === 0) return [];

    const { batchSize = this.batchSize, onProgress = null } = options;
    const embeddings = [];
    const totalBatches = Math.ceil(texts.length / batchSize);

    logger.info(`Generating embeddings: ${texts.length} texts in ${totalBatches} sequential batches`);

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      let retryCount = 0;
      let batchResult;

      while (true) {
        try {
          batchResult = await this.processBatch(batch);
          break;
        } catch (error) {
          if (this.isRetryableError(error) && retryCount < this.maxRetries) {
            const waitMs = this._retryWait(error, retryCount);
            logger.warn(`Batch ${batchNum}/${totalBatches} rate limited, retrying in ${waitMs}ms`);
            await this.delay(waitMs);
            retryCount++;
          } else {
            logger.error(`Batch ${batchNum}/${totalBatches} failed permanently:`, error.message);
            throw new Error(`Failed to generate batch embeddings: ${error.message}`);
          }
        }
      }

      embeddings.push(...batchResult);

      if (onProgress) {
        onProgress(Math.min((i + batchSize) / texts.length, 1), embeddings.length);
      }

      // Pause between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await this.delay(this.interBatchDelay);
      }
    }

    logger.info(`Successfully generated ${embeddings.length} embeddings`);
    return embeddings;
  }

  // ── Single batch API call ───────────────────────────────────────────────────

  async processBatch(texts) {
    if (!this.openaiApiKey) throw new Error('OpenAI API key is not configured');

    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      { input: texts.map(t => t.substring(0, 8000)), model: this.embeddingModel },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    if (!response.data?.data) throw new Error('Invalid response from OpenAI API');
    return response.data.data.map(item => item.embedding);
  }

  // ── Chunk embeddings ────────────────────────────────────────────────────────

  async generateChunkEmbeddings(chunks, options = {}) {
    try {
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await this.generateBatchEmbeddings(texts, options);

      const enrichedChunks = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index] || null
      }));

      const validChunks = enrichedChunks.filter(chunk => chunk.embedding !== null);

      if (validChunks.length !== chunks.length) {
        logger.warn(`Missing embeddings for ${chunks.length - validChunks.length} chunks`);
      }

      return validChunks;
    } catch (error) {
      logger.error('Chunk embedding generation error:', error);
      throw new Error(`Failed to generate chunk embeddings: ${error.message}`);
    }
  }

  // ── Retry helpers ───────────────────────────────────────────────────────────

  /**
   * Respects the Retry-After header from OpenAI when present (in seconds).
   * Falls back to exponential backoff: 2s, 4s, 8s, 16s, 32s.
   */
  _retryWait(error, retryCount) {
    const retryAfter = error?.response?.headers?.['retry-after'];
    if (retryAfter) return (parseInt(retryAfter, 10) + 1) * 1000;
    return this.baseRetryDelay * Math.pow(2, retryCount);
  }

  isRetryableError(error) {
    const status = error?.response?.status;
    const code = error?.response?.data?.error?.code;

    // Never retry quota exhaustion or auth errors — they won't resolve on retry
    if (code === 'insufficient_quota' || code === 'invalid_api_key') return false;
    if (status === 401 || status === 403) return false;

    // Retry on rate limit (429) and server errors (5xx)
    if (status === 429 || status >= 500) return true;

    // Retry on network-level errors
    return error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Static helpers ──────────────────────────────────────────────────────────

  static cosineSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    let dotProduct = 0, norm1 = 0, norm2 = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  static findSimilar(queryEmbedding, embeddings, topK = 10) {
    return embeddings
      .map((embedding, index) => ({
        index,
        similarity: EmbeddingService.cosineSimilarity(queryEmbedding, embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  validateEmbedding(embedding) {
    if (!Array.isArray(embedding)) throw new Error('Embedding must be an array');
    if (embedding.length !== this.dimension) throw new Error(`Embedding must have ${this.dimension} dimensions`);
    for (const value of embedding) {
      if (typeof value !== 'number' || !isFinite(value)) throw new Error('Embedding must contain only finite numbers');
    }
    return true;
  }

  static normalizeEmbedding(embedding) {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm === 0) return embedding;
    return embedding.map(val => val / norm);
  }

  static getEmbeddingStats(embeddings) {
    if (!embeddings || embeddings.length === 0) return null;
    const dimension = embeddings[0].length;
    const stats = { count: embeddings.length, dimension, mean: new Array(dimension).fill(0), std: new Array(dimension).fill(0) };
    embeddings.forEach(e => { for (let i = 0; i < dimension; i++) stats.mean[i] += e[i]; });
    for (let i = 0; i < dimension; i++) stats.mean[i] /= embeddings.length;
    embeddings.forEach(e => { for (let i = 0; i < dimension; i++) { const d = e[i] - stats.mean[i]; stats.std[i] += d * d; } });
    for (let i = 0; i < dimension; i++) stats.std[i] = Math.sqrt(stats.std[i] / embeddings.length);
    return stats;
  }
}

module.exports = EmbeddingService;
