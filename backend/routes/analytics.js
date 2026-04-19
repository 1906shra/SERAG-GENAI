const express = require('express');
const { query } = require('express-validator');
const router = express.Router();

const {
  getDashboard,
  getSearchAnalytics,
  getDocumentAnalytics,
  getUsageTrends,
  exportAnalytics
} = require('../controllers/analyticsController');

const { protect } = require('../middleware/auth');

// Validation middleware
const dashboardValidation = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

const searchAnalyticsValidation = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  query('granularity')
    .optional()
    .isIn(['daily', 'hourly'])
    .withMessage('Granularity must be either daily or hourly')
];

const trendsValidation = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

const exportValidation = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be either json or csv')
];

// Protected routes
router.get('/dashboard', protect, dashboardValidation, getDashboard);
router.get('/search', protect, searchAnalyticsValidation, getSearchAnalytics);
router.get('/documents', protect, getDocumentAnalytics);
router.get('/trends', protect, trendsValidation, getUsageTrends);
router.get('/export', protect, exportValidation, exportAnalytics);

module.exports = router;
