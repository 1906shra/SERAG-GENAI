const mongoose = require('mongoose');
const Analytics = require('../models/Analytics');
const SearchQuery = require('../models/SearchQuery');
const Document = require('../models/Document');
const logger = require('../utils/logger');

// @desc    Get user analytics dashboard
// @route   GET /api/analytics/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;

    // Get aggregated analytics
    const aggregatedAnalytics = await Analytics.getAggregatedAnalytics(userId, parseInt(days));

    // Get recent search performance
    const performanceMetrics = await SearchQuery.getPerformanceMetrics({
      userId,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      endDate: new Date()
    });

    // Get document statistics
    const documentStats = await getDocumentStatistics(userId);

    // Get top queries
    const topQueries = await SearchQuery.getPopularQueries({ limit: 10 });

    // Get daily analytics for chart
    const dailyAnalytics = await Analytics.getAnalyticsRange(
      userId,
      new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      new Date()
    );

    const dashboard = {
      overview: aggregatedAnalytics[0] || {
        totalQueries: 0,
        uniqueQueries: 0,
        avgResponseTime: 0,
        documentsUploaded: 0,
        avgRating: 0,
        helpfulPercentage: 0
      },
      performance: performanceMetrics[0] || {
        totalQueries: 0,
        avgResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        avgRating: 0,
        totalRatings: 0,
        helpfulCount: 0,
        helpfulPercentage: 0
      },
      documents: documentStats,
      topQueries: topQueries.filter(q => q.count > 0).slice(0, 5),
      dailyData: dailyAnalytics.map(day => ({
        date: day.date,
        queries: day.metrics.totalQueries,
        avgResponseTime: day.metrics.avgResponseTime,
        documentsUploaded: day.metrics.documentsUploaded
      }))
    };

    res.status(200).json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    next(error);
  }
};

// @desc    Get detailed search analytics
// @route   GET /api/analytics/search
// @access  Private
const getSearchAnalytics = async (req, res, next) => {
  try {
    const { days = 30, granularity = 'daily' } = req.query;
    const userId = req.user.id;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    let searchAnalytics;

    if (granularity === 'hourly') {
      searchAnalytics = await getHourlySearchAnalytics(userId, startDate, endDate);
    } else {
      searchAnalytics = await getDailySearchAnalytics(userId, startDate, endDate);
    }

    res.status(200).json({
      success: true,
      data: searchAnalytics
    });
  } catch (error) {
    logger.error('Get search analytics error:', error);
    next(error);
  }
};

// @desc    Get document analytics
// @route   GET /api/analytics/documents
// @access  Private
const getDocumentAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const documentStats = await getDocumentStatistics(userId);

    res.status(200).json({
      success: true,
      data: documentStats
    });
  } catch (error) {
    logger.error('Get document analytics error:', error);
    next(error);
  }
};

// @desc    Get usage trends
// @route   GET /api/analytics/trends
// @access  Private
const getUsageTrends = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;

    const trends = await calculateUsageTrends(userId, parseInt(days));

    res.status(200).json({
      success: true,
      data: trends
    });
  } catch (error) {
    logger.error('Get usage trends error:', error);
    next(error);
  }
};

// @desc    Export analytics data
// @route   GET /api/analytics/export
// @access  Private
const exportAnalytics = async (req, res, next) => {
  try {
    const { days = 30, format = 'json' } = req.query;
    const userId = req.user.id;

    const exportData = await prepareExportData(userId, parseInt(days));

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${days}-days.csv"`);
      res.send(convertToCSV(exportData));
    } else {
      res.status(200).json({
        success: true,
        data: exportData
      });
    }
  } catch (error) {
    logger.error('Export analytics error:', error);
    next(error);
  }
};

// Helper function to get document statistics
async function getDocumentStatistics(userId) {
  try {
    const stats = await Document.aggregate([
      {
        $match: {
          uploadedBy: new mongoose.Types.ObjectId(userId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalChunks: { $sum: { $size: '$chunks' } },
          avgChunksPerDocument: { $avg: { $size: '$chunks' } },
          totalWords: { $sum: { $ifNull: ['$metadata.wordCount', 0] } },
          avgWordsPerDocument: { $avg: { $ifNull: ['$metadata.wordCount', 0] } },
          types: { $push: '$contentType' }
        }
      },
      {
        $project: {
          _id: 0,
          totalDocuments: 1,
          totalChunks: 1,
          avgChunksPerDocument: { $round: ['$avgChunksPerDocument', 2] },
          totalWords: 1,
          avgWordsPerDocument: { $round: ['$avgWordsPerDocument', 2] },
          types: 1
        }
      }
    ]);

    if (!stats[0]) {
      return {
        totalDocuments: 0,
        totalChunks: 0,
        avgChunksPerDocument: 0,
        totalWords: 0,
        avgWordsPerDocument: 0,
        documentTypes: {}
      };
    }

    // Count document types in JS
    const documentTypes = {};
    (stats[0].types || []).forEach(type => {
      documentTypes[type] = (documentTypes[type] || 0) + 1;
    });

    return {
      totalDocuments: stats[0].totalDocuments,
      totalChunks: stats[0].totalChunks,
      avgChunksPerDocument: stats[0].avgChunksPerDocument,
      totalWords: stats[0].totalWords,
      avgWordsPerDocument: stats[0].avgWordsPerDocument,
      documentTypes
    };
  } catch (error) {
    logger.error('Document statistics error:', error);
    return {
      totalDocuments: 0,
      totalChunks: 0,
      avgChunksPerDocument: 0,
      totalWords: 0,
      avgWordsPerDocument: 0,
      documentTypes: {}
    };
  }
}

// Helper function to get daily search analytics
async function getDailySearchAnalytics(userId, startDate, endDate) {
  try {
    return await SearchQuery.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          totalQueries: { $sum: 1 },
          avgResponseTime: { $avg: '$performance.totalTime' },
          minResponseTime: { $min: '$performance.totalTime' },
          maxResponseTime: { $max: '$performance.totalTime' },
          uniqueQueries: { $addToSet: '$query' },
          avgRating: { $avg: '$userFeedback.rating' },
          helpfulCount: { $sum: { $cond: ['$userFeedback.helpful', 1, 0] } }
        }
      },
      {
        $project: {
          date: '$_id',
          totalQueries: 1,
          avgResponseTime: { $round: ['$avgResponseTime', 2] },
          minResponseTime: { $round: ['$minResponseTime', 2] },
          maxResponseTime: { $round: ['$maxResponseTime', 2] },
          uniqueQueries: { $size: '$uniqueQueries' },
          avgRating: { $round: [{ $ifNull: ['$avgRating', 0] }, 2] },
          helpfulCount: 1,
          helpfulPercentage: {
            $round: [
              { $multiply: [{ $divide: ['$helpfulCount', '$totalQueries'] }, 100] },
              2
            ]
          },
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);
  } catch (error) {
    logger.error('Daily search analytics error:', error);
    return [];
  }
}

// Helper function to get hourly search analytics
async function getHourlySearchAnalytics(userId, startDate, endDate) {
  try {
    return await SearchQuery.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$createdAt' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          totalQueries: { $sum: 1 },
          avgResponseTime: { $avg: '$performance.totalTime' }
        }
      },
      {
        $project: {
          date: '$_id.date',
          hour: '$_id.hour',
          totalQueries: 1,
          avgResponseTime: { $round: ['$avgResponseTime', 2] },
          _id: 0
        }
      },
      { $sort: { date: 1, hour: 1 } }
    ]);
  } catch (error) {
    logger.error('Hourly search analytics error:', error);
    return [];
  }
}

// Helper function to calculate usage trends
async function calculateUsageTrends(userId, days) {
  try {
    const currentPeriod = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const previousPeriod = new Date(Date.now() - (days * 2) * 24 * 60 * 60 * 1000);

    const [currentStats, previousStats] = await Promise.all([
      SearchQuery.getPerformanceMetrics({
        userId,
        startDate: currentPeriod,
        endDate: new Date()
      }),
      SearchQuery.getPerformanceMetrics({
        userId,
        startDate: previousPeriod,
        endDate: currentPeriod
      })
    ]);

    const current = currentStats[0] || { totalQueries: 0, avgResponseTime: 0, avgRating: 0 };
    const previous = previousStats[0] || { totalQueries: 0, avgResponseTime: 0, avgRating: 0 };

    return {
      queries: {
        current: current.totalQueries,
        previous: previous.totalQueries,
        change: previous.totalQueries > 0
          ? ((current.totalQueries - previous.totalQueries) / previous.totalQueries * 100).toFixed(2)
          : 0
      },
      responseTime: {
        current: current.avgResponseTime,
        previous: previous.avgResponseTime,
        change: previous.avgResponseTime > 0
          ? ((current.avgResponseTime - previous.avgResponseTime) / previous.avgResponseTime * 100).toFixed(2)
          : 0
      },
      rating: {
        current: current.avgRating || 0,
        previous: previous.avgRating || 0,
        change: previous.avgRating > 0
          ? ((current.avgRating - previous.avgRating) / previous.avgRating * 100).toFixed(2)
          : 0
      }
    };
  } catch (error) {
    logger.error('Usage trends calculation error:', error);
    return {
      queries: { current: 0, previous: 0, change: 0 },
      responseTime: { current: 0, previous: 0, change: 0 },
      rating: { current: 0, previous: 0, change: 0 }
    };
  }
}

// Helper function to prepare export data
async function prepareExportData(userId, days) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [searchData, documentData] = await Promise.all([
      SearchQuery.find({
        userId,
        createdAt: { $gte: startDate, $lte: endDate }
      })
        .select('query performance.totalTime userFeedback.rating userFeedback.helpful createdAt')
        .lean(),
      Document.find({
        uploadedBy: userId,
        isActive: true
      })
        .select('title contentType metadata.wordCount searchCount createdAt')
        .lean()
    ]);

    return {
      searchQueries: searchData.map(query => ({
        query: query.query,
        responseTime: query.performance?.totalTime,
        rating: query.userFeedback?.rating,
        helpful: query.userFeedback?.helpful,
        date: query.createdAt
      })),
      documents: documentData.map(doc => ({
        title: doc.title,
        contentType: doc.contentType,
        wordCount: doc.metadata?.wordCount,
        searchCount: doc.searchCount,
        uploadDate: doc.createdAt
      })),
      exportDate: new Date(),
      period: `${days} days`
    };
  } catch (error) {
    logger.error('Export data preparation error:', error);
    return { searchQueries: [], documents: [], exportDate: new Date(), period: `${days} days` };
  }
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = ['Type', 'Query/Title', 'Response Time/Word Count', 'Rating/Search Count', 'Helpful/Upload Date', 'Date'];
  const rows = [headers.join(',')];

  data.searchQueries.forEach(query => {
    rows.push([
      'Search',
      escapeCSV(query.query),
      query.responseTime || '',
      query.rating || '',
      query.helpful !== undefined ? query.helpful : '',
      query.date ? new Date(query.date).toISOString() : ''
    ].join(','));
  });

  data.documents.forEach(doc => {
    rows.push([
      'Document',
      escapeCSV(doc.title),
      doc.wordCount || '',
      doc.searchCount || '',
      '',
      doc.uploadDate ? new Date(doc.uploadDate).toISOString() : ''
    ].join(','));
  });

  return rows.join('\n');
}

module.exports = {
  getDashboard,
  getSearchAnalytics,
  getDocumentAnalytics,
  getUsageTrends,
  exportAnalytics
};
