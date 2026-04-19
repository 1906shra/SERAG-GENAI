const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  metrics: {
    totalQueries: {
      type: Number,
      default: 0
    },
    uniqueQueries: {
      type: Number,
      default: 0
    },
    avgResponseTime: {
      type: Number,
      default: 0
    },
    totalDocuments: {
      type: Number,
      default: 0
    },
    documentsUploaded: {
      type: Number,
      default: 0
    },
    avgRating: {
      type: Number,
      default: 0
    },
    helpfulPercentage: {
      type: Number,
      default: 0
    }
  },
  breakdown: {
    queriesByHour: [{
      hour: Number,
      count: Number
    }],
    topQueries: [{
      query: String,
      count: Number,
      avgRating: Number
    }],
    documentTypes: [{
      type: String,
      count: Number
    }],
    searchModels: [{
      model: String,
      count: Number,
      avgResponseTime: Number
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
analyticsSchema.index({ userId: 1, date: -1 });
analyticsSchema.index({ date: 1 });

// Static method to get or create daily analytics
analyticsSchema.statics.getDailyAnalytics = async function(userId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  let analytics = await this.findOne({
    userId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });

  if (!analytics) {
    analytics = await this.create({
      userId,
      date: startOfDay,
      metrics: {
        totalQueries: 0,
        uniqueQueries: 0,
        avgResponseTime: 0,
        totalDocuments: 0,
        documentsUploaded: 0,
        avgRating: 0,
        helpfulPercentage: 0
      },
      breakdown: {
        queriesByHour: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
        topQueries: [],
        documentTypes: [],
        searchModels: []
      }
    });
  }

  return analytics;
};

// Static method to get analytics for date range
analyticsSchema.statics.getAnalyticsRange = function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: -1 });
};

// Static method to get aggregated analytics
analyticsSchema.statics.getAggregatedAnalytics = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalQueries: { $sum: '$metrics.totalQueries' },
        uniqueQueries: { $sum: '$metrics.uniqueQueries' },
        avgResponseTime: { $avg: '$metrics.avgResponseTime' },
        documentsUploaded: { $sum: '$metrics.documentsUploaded' },
        avgRating: { $avg: '$metrics.avgRating' },
        helpfulPercentage: { $avg: '$metrics.helpfulPercentage' },
        dailyData: {
          $push: {
            date: '$date',
            queries: '$metrics.totalQueries',
            responseTime: '$metrics.avgResponseTime'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalQueries: 1,
        uniqueQueries: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        documentsUploaded: 1,
        avgRating: { $round: [{ $ifNull: ['$avgRating', 0] }, 2] },
        helpfulPercentage: { $round: ['$helpfulPercentage', 2] },
        dailyData: {
          $slice: ['$dailyData', -30] // Last 30 days
        }
      }
    }
  ]);
};

// Instance method to update metrics
analyticsSchema.methods.updateMetrics = function(searchData) {
  const hour = new Date().getHours();
  
  // Update basic metrics
  this.metrics.totalQueries += 1;
  this.metrics.avgResponseTime = 
    (this.metrics.avgResponseTime * (this.metrics.totalQueries - 1) + searchData.responseTime) / 
    this.metrics.totalQueries;

  // Update hourly breakdown
  const hourData = this.breakdown.queriesByHour.find(h => h.hour === hour);
  if (hourData) {
    hourData.count += 1;
  }

  // Update top queries
  const queryIndex = this.breakdown.topQueries.findIndex(q => q.query === searchData.query);
  if (queryIndex >= 0) {
    this.breakdown.topQueries[queryIndex].count += 1;
    if (searchData.rating) {
      this.breakdown.topQueries[queryIndex].avgRating = 
        (this.breakdown.topQueries[queryIndex].avgRating * (this.breakdown.topQueries[queryIndex].count - 1) + searchData.rating) /
        this.breakdown.topQueries[queryIndex].count;
    }
  } else {
    this.breakdown.topQueries.push({
      query: searchData.query,
      count: 1,
      avgRating: searchData.rating || 0
    });
  }

  // Keep only top 10 queries
  this.breakdown.topQueries.sort((a, b) => b.count - a.count);
  this.breakdown.topQueries = this.breakdown.topQueries.slice(0, 10);

  // Update search models breakdown
  if (searchData.model) {
    const modelIndex = this.breakdown.searchModels.findIndex(m => m.model === searchData.model);
    if (modelIndex >= 0) {
      this.breakdown.searchModels[modelIndex].count += 1;
      this.breakdown.searchModels[modelIndex].avgResponseTime = 
        (this.breakdown.searchModels[modelIndex].avgResponseTime * (this.breakdown.searchModels[modelIndex].count - 1) + searchData.responseTime) /
        this.breakdown.searchModels[modelIndex].count;
    } else {
      this.breakdown.searchModels.push({
        model: searchData.model,
        count: 1,
        avgResponseTime: searchData.responseTime
      });
    }
  }

  return this.save();
};

// Instance method to add document upload
analyticsSchema.methods.addDocumentUpload = function(contentType) {
  this.metrics.documentsUploaded += 1;
  
  const typeIndex = this.breakdown.documentTypes.findIndex(t => t.type === contentType);
  if (typeIndex >= 0) {
    this.breakdown.documentTypes[typeIndex].count += 1;
  } else {
    this.breakdown.documentTypes.push({
      type: contentType,
      count: 1
    });
  }

  return this.save();
};

module.exports = mongoose.model('Analytics', analyticsSchema);
