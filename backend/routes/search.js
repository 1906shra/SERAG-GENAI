const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const {
  search,
  getSearchSuggestions,
  getPopularQueries,
  getSearchHistory,
  addFeedback,
  getSearchAnalytics
} = require('../controllers/searchController');

const { protect } = require('../middleware/auth');

// Validation middleware
const searchValidation = [
  body('query')
    .trim()
    .notEmpty()
    .withMessage('Query is required')
    .isLength({ min: 2, max: 500 })
    .withMessage('Query must be between 2 and 500 characters'),
  body('options.maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('maxResults must be between 1 and 50'),
  body('options.semanticWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('semanticWeight must be between 0 and 1'),
  body('options.keywordWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('keywordWeight must be between 0 and 1'),
  body('options.generateResponse')
    .optional()
    .isBoolean()
    .withMessage('generateResponse must be a boolean'),
  body('options.rewriteQuery')
    .optional()
    .isBoolean()
    .withMessage('rewriteQuery must be a boolean'),
  body('options.includePublic')
    .optional()
    .isBoolean()
    .withMessage('includePublic must be a boolean')
];

const feedbackValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('helpful')
    .optional()
    .isBoolean()
    .withMessage('Helpful must be a boolean'),
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Comments cannot exceed 500 characters')
];

const suggestionsValidation = [
  query('q')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Query must be at least 2 characters long')
];

const popularQueriesValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('timeRange')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Time range must be between 1 and 365 days')
];

const searchHistoryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sessionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Session ID cannot exceed 100 characters')
];

const analyticsValidation = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

// Protected routes
router.post('/', protect, searchValidation, search);
router.get('/suggestions', protect, suggestionsValidation, getSearchSuggestions);
router.get('/popular', protect, popularQueriesValidation, getPopularQueries);
router.get('/history', protect, searchHistoryValidation, getSearchHistory);
router.post('/:searchId/feedback', protect, feedbackValidation, addFeedback);
router.get('/analytics', protect, analyticsValidation, getSearchAnalytics);

// FAISS index status (protected)
router.get('/index-status', protect, (req, res) => {
  const faissService = require('../services/faissService');
  const { searchCache, embeddingCache } = require('../services/cacheService');
  res.json({
    success: true,
    data: {
      faiss:          faissService.status(),
      searchCache:    searchCache.stats(),
      embeddingCache: embeddingCache.stats(),
    }
  });
});

module.exports = router;
