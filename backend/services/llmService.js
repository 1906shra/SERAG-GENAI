const axios = require('axios');
const logger = require('../utils/logger');

class LLMService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = 2000;
    this.temperature = 0.7;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Generate AI response using RAG
   */
  async generateRAGResponse(query, searchResults, options = {}) {
    try {
      const {
        model = this.defaultModel,
        maxTokens = this.maxTokens,
        temperature = this.temperature,
        includeCitations = true
      } = options;

      if (!this.openaiApiKey) {
        throw new Error('OpenAI API key is not configured');
      }

      // Build context from search results
      const context = this.buildContext(searchResults);
      
      // Build prompt
      const prompt = this.buildRAGPrompt(query, context);

      // Generate response
      const response = await this.callOpenAI(prompt, {
        model,
        maxTokens,
        temperature
      });

      // Extract answer and citations
      const { answer, citations } = this.extractAnswerAndCitations(
        response.content,
        searchResults,
        includeCitations
      );

      return {
        answer,
        citations,
        model,
        tokensUsed: response.usage?.totalTokens || 0,
        responseTime: response.responseTime || 0
      };
    } catch (error) {
      logger.error('RAG response generation error:', error);
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Rewrite query for better search results
   */
  async rewriteQuery(originalQuery, options = {}) {
    try {
      const {
        model = this.defaultModel,
        maxTokens = 200,
        temperature = 0.3
      } = options;

      const prompt = this.buildQueryRewritePrompt(originalQuery);

      const response = await this.callOpenAI(prompt, {
        model,
        maxTokens,
        temperature
      });

      // Extract rewritten query
      const rewrittenQuery = response.content.trim();
      
      // Validate rewritten query
      if (!rewrittenQuery || rewrittenQuery.length < 3) {
        return originalQuery; // Fallback to original
      }

      return rewrittenQuery;
    } catch (error) {
      logger.error('Query rewrite error:', error);
      return originalQuery; // Fallback to original
    }
  }

  /**
   * Generate summary of search results
   */
  async generateSummary(searchResults, options = {}) {
    try {
      const {
        model = this.defaultModel,
        maxTokens = 500,
        temperature = 0.5
      } = options;

      if (!searchResults || searchResults.length === 0) {
        return 'No results to summarize.';
      }

      const prompt = this.buildSummaryPrompt(searchResults);

      const response = await this.callOpenAI(prompt, {
        model,
        maxTokens,
        temperature
      });

      return response.content.trim();
    } catch (error) {
      logger.error('Summary generation error:', error);
      return 'Unable to generate summary.';
    }
  }

  /**
   * Call OpenAI API
   */
  async callOpenAI(prompt, options, retryCount = 0) {
    try {
      const startTime = Date.now();

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: options.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant. Provide accurate, concise answers based on the given context.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: options.maxTokens,
          temperature: options.temperature,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const responseTime = Date.now() - startTime;

      if (!response.data || !response.data.choices || response.data.choices.length === 0) {
        throw new Error('Invalid response from OpenAI API');
      }

      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        responseTime
      };
    } catch (error) {
      logger.error(`OpenAI API error (attempt ${retryCount + 1}):`, error);

      // Retry logic
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount));
        return this.callOpenAI(prompt, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Build context from search results
   */
  buildContext(searchResults) {
    if (!searchResults || searchResults.length === 0) {
      return '';
    }

    const contextItems = searchResults.map((result, index) => {
      return `[${index + 1}] ${result.documentTitle}\n${result.text}\n`;
    });

    return contextItems.join('\n');
  }

  /**
   * Build RAG prompt
   */
  buildRAGPrompt(query, context) {
    return `Based on the following context, please answer the user's question. Use only the information provided in the context. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${query}

Please provide a comprehensive answer based on the context above. Include specific details and cite your sources when possible.`;
  }

  /**
   * Build query rewrite prompt
   */
  buildQueryRewritePrompt(originalQuery) {
    return `Rewrite the following search query to make it more effective for finding relevant information. Keep the core meaning but make it more specific and comprehensive.

Original query: "${originalQuery}"

Rewritten query:`;
  }

  /**
   * Build summary prompt
   */
  buildSummaryPrompt(searchResults) {
    const context = this.buildContext(searchResults);
    
    return `Based on the following search results, provide a concise summary of the key information found:

${context}

Summary:`;
  }

  /**
   * Extract answer and citations from response
   */
  extractAnswerAndCitations(response, searchResults, includeCitations) {
    const answer = response.trim();
    const citations = [];

    if (!includeCitations || !searchResults || searchResults.length === 0) {
      return { answer, citations };
    }

    // Simple citation extraction - look for numbered references
    const citationPattern = /\[(\d+)\]/g;
    const matches = answer.match(citationPattern);

    if (matches) {
      matches.forEach(match => {
        const index = parseInt(match.replace(/\[|\]/g, '')) - 1;
        if (index >= 0 && index < searchResults.length) {
          const result = searchResults[index];
          citations.push({
            documentId: result.documentId,
            chunkIndex: result.chunkIndex,
            text: result.text.substring(0, 200) + '...',
            documentTitle: result.documentTitle,
            relevance: result.scores.final
          });
        }
      });
    }

    // If no explicit citations, include top results as implicit citations
    if (citations.length === 0) {
      searchResults.slice(0, 3).forEach(result => {
        citations.push({
          documentId: result.documentId,
          chunkIndex: result.chunkIndex,
          text: result.text.substring(0, 200) + '...',
          documentTitle: result.documentTitle,
          relevance: result.scores.final
        });
      });
    }

    return { answer, citations };
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    if (error.response) {
      const status = error.response.status;
      return status === 429 || status >= 500; // Rate limit or server errors
    }
    
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  /**
   * Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate API response
   */
  validateResponse(response) {
    if (!response.content || typeof response.content !== 'string') {
      throw new Error('Invalid response content');
    }

    if (response.content.length === 0) {
      throw new Error('Empty response content');
    }

    return true;
  }

  /**
   * Get model information
   */
  getModelInfo(model = this.defaultModel) {
    const models = {
      'gpt-3.5-turbo': {
        name: 'GPT-3.5 Turbo',
        maxTokens: 4096,
        costPer1KTokens: 0.002,
        description: 'Fast and efficient model for general use'
      },
      'gpt-4': {
        name: 'GPT-4',
        maxTokens: 8192,
        costPer1KTokens: 0.03,
        description: 'More capable model for complex tasks'
      },
      'gpt-4-turbo': {
        name: 'GPT-4 Turbo',
        maxTokens: 128000,
        costPer1KTokens: 0.01,
        description: 'Latest GPT-4 model with larger context'
      }
    };

    return models[model] || models[this.defaultModel];
  }

  /**
   * Estimate token usage
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit token limit
   */
  truncateToTokenLimit(text, maxTokens = 4000) {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }

    // Truncate to approximately fit the token limit
    const maxChars = maxTokens * 4;
    return text.substring(0, maxChars) + '...';
  }
}

module.exports = LLMService;
