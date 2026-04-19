const mongoose = require('mongoose');

const searchQuerySchema = new mongoose.Schema({
  query: {
    type: String,
    required: [true, 'Search query is required'],
    trim: true,
    maxlength: [500, 'Query cannot exceed 500 characters']
  },
  rewrittenQuery: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  results: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    chunkIndex: {
      type: Number,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    scores: {
      semantic: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      },
      keyword: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      },
      final: {
        type: Number,
        required: true,
        min: 0,
        max: 1
      }
    },
    metadata: {
      documentTitle: String,
      contentType: String,
      source: String
    }
  }],
  aiResponse: {
    answer: String,
    citations: [{
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      },
      chunkIndex: Number,
      text: String,
      relevance: Number
    }],
    model: String,
    tokensUsed: Number,
    responseTime: Number
  },
  searchSettings: {
    maxResults: Number,
    semanticWeight: Number,
    keywordWeight: Number,
    searchModel: String
  },
  performance: {
    totalTime: {
      type: Number,
      required: true
    },
    keywordSearchTime: Number,
    vectorSearchTime: Number,
    rankingTime: Number,
    llmTime: Number
  },
  userFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    helpful: Boolean,
    comments: String
  },
  sessionId: String,
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for analytics
searchQuerySchema.index({ userId: 1, createdAt: -1 });
searchQuerySchema.index({ query: 'text' }); // Text search for query analysis
searchQuerySchema.index({ createdAt: -1 });
searchQuerySchema.index({ 'performance.totalTime': -1 });
searchQuerySchema.index({ sessionId: 1 });
searchQuerySchema.index({ 'userFeedback.rating': 1 });

// Static method to get user search history
searchQuerySchema.statics.getUserSearchHistory = function(userId, options = {}) {
  const query = { userId };

  if (options.sessionId) {
    query.sessionId = options.sessionId;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .select('query aiResponse.answer performance totalTime createdAt userFeedback');
};

// Static method to get popular queries
searchQuerySchema.statics.getPopularQueries = function(options = {}) {
  return this.aggregate([
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        avgRating: { $avg: '$userFeedback.rating' },
        totalTime: { $avg: '$performance.totalTime' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: options.limit || 20
    },
    {
      $project: {
        query: '$_id',
        count: 1,
        avgRating: { $round: ['$avgRating', 2] },
        avgTime: { $round: ['$totalTime', 2] },
        _id: 0
      }
    }
  ]);
};

// Static method to get performance metrics
searchQuerySchema.statics.getPerformanceMetrics = function(options = {}) {
  const matchStage = {};
  
  if (options.userId) {
    matchStage.userId = new mongoose.Types.ObjectId(options.userId);
  }
  
  if (options.startDate && options.endDate) {
    matchStage.createdAt = {
      $gte: new Date(options.startDate),
      $lte: new Date(options.endDate)
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalQueries: { $sum: 1 },
        avgResponseTime: { $avg: '$performance.totalTime' },
        minResponseTime: { $min: '$performance.totalTime' },
        maxResponseTime: { $max: '$performance.totalTime' },
        avgRating: { $avg: '$userFeedback.rating' },
        totalRatings: { $sum: { $cond: ['$userFeedback.rating', 1, 0] } },
        helpfulCount: { $sum: { $cond: ['$userFeedback.helpful', 1, 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalQueries: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        minResponseTime: { $round: ['$minResponseTime', 2] },
        maxResponseTime: { $round: ['$maxResponseTime', 2] },
        avgRating: { $round: [{ $ifNull: ['$avgRating', 0] }, 2] },
        totalRatings: 1,
        helpfulCount: 1,
        helpfulPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$helpfulCount', '$totalQueries'] }, 100] },
            2
          ]
        }
      }
    }
  ]);
};

// Instance method to add user feedback
searchQuerySchema.methods.addFeedback = function(feedback) {
  this.userFeedback = {
    ...this.userFeedback,
    ...feedback
  };
  return this.save();
};

// Pre-save middleware to ensure scores are properly calculated
searchQuerySchema.pre('save', function(next) {
  if (this.results && this.results.length > 0) {
    this.results.forEach(result => {
      if (result.scores && 
          result.scores.semantic !== undefined && 
          result.scores.keyword !== undefined) {
        // Calculate final score if not provided
        if (result.scores.final === undefined) {
          const semanticWeight = this.searchSettings?.semanticWeight || 0.6;
          const keywordWeight = this.searchSettings?.keywordWeight || 0.4;
          result.scores.final = 
            (result.scores.semantic * semanticWeight) + 
            (result.scores.keyword * keywordWeight);
        }
      }
    });
  }
  next();
});

module.exports = mongoose.model('SearchQuery', searchQuerySchema);
