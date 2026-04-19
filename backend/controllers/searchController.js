const mongoose = require('mongoose');
const SearchQuery = require('../models/SearchQuery');
const SearchService = require('../services/searchService');
const LLMService = require('../services/llmService');
const Analytics = require('../models/Analytics');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

// @desc    Perform search with RAG
// @route   POST /api/search
// @access  Private
const search = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { query, options = {} } = req.body;
    const userId = req.user.id;

    // Validate query
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters long'
      });
    }

    // Get user settings for search
    const userSettings = req.user.settings;
    const searchOptions = {
      userId,
      maxResults: options.maxResults || userSettings.maxResults || 10,
      semanticWeight: options.semanticWeight || userSettings.semanticWeight || 0.6,
      keywordWeight: options.keywordWeight || userSettings.keywordWeight || 0.4,
      includePublic: options.includePublic !== false,
      filters: options.filters || {}
    };

    // Validate search parameters
    const searchService = new SearchService();
    const validationErrors = searchService.validateSearchParams(searchOptions);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters',
        errors: validationErrors
      });
    }

    const startTime = Date.now();

    // Optional: Rewrite query for better results
    let finalQuery = query.trim();
    if (options.rewriteQuery !== false) {
      const llmService = new LLMService();
      try {
        finalQuery = await llmService.rewriteQuery(query);
        logger.info(`Query rewritten: "${query}" -> "${finalQuery}"`);
      } catch (error) {
        logger.warn('Query rewrite failed, using original:', error);
      }
    }

    // Perform hybrid search
    const searchResults = await searchService.hybridSearch(finalQuery, searchOptions);

    // Generate AI response if requested
    let aiResponse = null;
    if (options.generateResponse !== false && searchResults.results.length > 0) {
      const llmService = new LLMService();
      try {
        aiResponse = await llmService.generateRAGResponse(
          finalQuery,
          searchResults.results,
          {
            model: userSettings.searchModel,
            includeCitations: true
          }
        );
      } catch (error) {
        logger.error('AI response generation failed:', error);
        // Continue without AI response
      }
    }

    const totalTime = Date.now() - startTime;

    // Create search query record
    const searchQuery = new SearchQuery({
      query: query.trim(),
      rewrittenQuery: finalQuery !== query ? finalQuery : undefined,
      userId,
      results: searchResults.results.map(result => ({
        documentId: result.documentId,
        chunkIndex: result.chunkIndex,
        text: result.text,
        scores: result.scores,
        metadata: {
          documentTitle: result.documentTitle,
          contentType: result.contentType,
          source: result.documentSource
        }
      })),
      aiResponse: aiResponse ? {
        answer: aiResponse.answer,
        citations: aiResponse.citations,
        model: aiResponse.model,
        tokensUsed: aiResponse.tokensUsed,
        responseTime: aiResponse.responseTime
      } : undefined,
      searchSettings: {
        maxResults: searchOptions.maxResults,
        semanticWeight: searchOptions.semanticWeight,
        keywordWeight: searchOptions.keywordWeight,
        searchModel: userSettings.searchModel
      },
      performance: {
        totalTime,
        keywordSearchTime: searchResults.performance?.keywordTime,
        vectorSearchTime: searchResults.performance?.semanticTime,
        rankingTime: searchResults.performance?.rankingTime,
        llmTime: aiResponse?.responseTime
      },
      sessionId: req.session?.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await searchQuery.save();

    // Update analytics
    try {
      const analytics = await Analytics.getDailyAnalytics(userId);
      await analytics.updateMetrics({
        query: query.trim(),
        responseTime: totalTime,
        model: aiResponse?.model,
        rating: null
      });
    } catch (error) {
      logger.error('Analytics update failed:', error);
    }

    // Update document search counts
    if (searchResults.results.length > 0) {
      const Document = require('../models/Document');
      const uniqueDocumentIds = [...new Set(searchResults.results.map(r => r.documentId))];
      
      Document.updateMany(
        { _id: { $in: uniqueDocumentIds } },
        { $inc: { searchCount: 1 }, lastAccessed: new Date() }
      ).catch(error => logger.error('Failed to update document search counts:', error));
    }

    logger.info(`Search completed: ${searchResults.results.length} results in ${totalTime}ms for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        query: query.trim(),
        rewrittenQuery: finalQuery !== query ? finalQuery : undefined,
        results: searchResults.results,
        aiResponse,
        performance: {
          totalTime,
          breakdown: searchResults.performance
        },
        searchId: searchQuery._id
      }
    });
  } catch (error) {
    logger.error('Search error:', error);
    next(error);
  }
};

// @desc    Get search suggestions
// @route   GET /api/search/suggestions
// @access  Private
const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q: partialQuery } = req.query;
    const userId = req.user.id;

    if (!partialQuery || partialQuery.length < 2) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    const searchService = new SearchService();
    const suggestions = await searchService.getSearchSuggestions(partialQuery, userId);

    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Get search suggestions error:', error);
    next(error);
  }
};

// @desc    Get popular queries
// @route   GET /api/search/popular
// @access  Private
const getPopularQueries = async (req, res, next) => {
  try {
    const { limit = 20, timeRange = 30 } = req.query;

    const searchService = new SearchService();
    const popularQueries = await searchService.getPopularQueries({
      limit: parseInt(limit),
      timeRange: parseInt(timeRange)
    });

    res.status(200).json({
      success: true,
      data: popularQueries
    });
  } catch (error) {
    logger.error('Get popular queries error:', error);
    next(error);
  }
};

// @desc    Get search history for user
// @route   GET /api/search/history
// @access  Private
const getSearchHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sessionId } = req.query;
    const userId = req.user.id;

    const searchHistory = await SearchQuery.getUserSearchHistory(userId, {
      sessionId,
      limit: parseInt(limit)
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedHistory = searchHistory.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        history: paginatedHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: searchHistory.length,
          pages: Math.ceil(searchHistory.length / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get search history error:', error);
    next(error);
  }
};

// @desc    Add feedback to search query
// @route   POST /api/search/:searchId/feedback
// @access  Private
const addFeedback = async (req, res, next) => {
  try {
    const { searchId } = req.params;
    const { rating, helpful, comments } = req.body;
    const userId = req.user.id;

    // Validate search query belongs to user
    const searchQuery = await SearchQuery.findOne({
      _id: searchId,
      userId
    });

    if (!searchQuery) {
      return res.status(404).json({
        success: false,
        message: 'Search query not found'
      });
    }

    // Validate feedback data
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Add feedback
    await searchQuery.addFeedback({
      rating,
      helpful,
      comments
    });

    // Update analytics with feedback
    try {
      const analytics = await Analytics.getDailyAnalytics(userId);
      await analytics.updateMetrics({
        query: searchQuery.query,
        responseTime: searchQuery.performance.totalTime,
        model: searchQuery.aiResponse?.model,
        rating
      });
    } catch (error) {
      logger.error('Analytics feedback update failed:', error);
    }

    logger.info(`Feedback added for search ${searchId} by user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Feedback added successfully'
    });
  } catch (error) {
    logger.error('Add feedback error:', error);
    next(error);
  }
};

// @desc    Get search analytics
// @route   GET /api/search/analytics
// @access  Private
const getSearchAnalytics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const performanceMetrics = await SearchQuery.getPerformanceMetrics({
      userId,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      endDate: new Date()
    });

    res.status(200).json({
      success: true,
      data: performanceMetrics[0] || {
        totalQueries: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        avgRating: 0,
        totalRatings: 0,
        helpfulCount: 0,
        helpfulPercentage: 0
      }
    });
  } catch (error) {
    logger.error('Get search analytics error:', error);
    next(error);
  }
};

module.exports = {
  search,
  getSearchSuggestions,
  getPopularQueries,
  getSearchHistory,
  addFeedback,
  getSearchAnalytics
};
