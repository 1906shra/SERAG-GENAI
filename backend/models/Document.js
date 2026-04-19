const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    default: ''
  },
  originalContent: {
    type: String,
    default: ''
  },
  contentType: {
    type: String,
    enum: ['text', 'pdf', 'docx', 'url'],
    required: true
  },
  source: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chunks: [{
    text: {
      type: String,
      required: true
    },
    embedding: [{
      type: Number
    }],
    metadata: {
      chunkIndex: {
        type: Number,
        required: true
      },
      startIndex: Number,
      endIndex: Number,
      wordCount: Number
    }
  }],
  metadata: {
    fileSize: Number,
    pageCount: Number,
    wordCount: Number,
    language: String,
    tags: [String],
    category: String
  },
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: String,
  isPublic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  searchCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date
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

// Indexes for better performance
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ contentType: 1 });
documentSchema.index({ 'chunks.text': 'text' }); // Text search index
documentSchema.index({ isActive: 1, isPublic: 1 });
documentSchema.index({ searchCount: -1 });
documentSchema.index({ 'metadata.tags': 1 });

// Update search count when document is accessed in search results
documentSchema.methods.incrementSearchCount = function() {
  this.searchCount += 1;
  this.lastAccessed = new Date();
  return this.save({ validateBeforeSave: false });
};

// Get chunks with embeddings for search
documentSchema.methods.getSearchableChunks = function() {
  return this.chunks.filter(chunk => 
    chunk.embedding && chunk.embedding.length > 0
  );
};

// Static method to get user documents
documentSchema.statics.getUserDocuments = function(userId, options = {}) {
  const query = {
    uploadedBy: userId,
    isActive: true,
    processingStatus: 'completed'
  };

  if (options.contentType) {
    query.contentType = options.contentType;
  }

  if (options.tags && options.tags.length > 0) {
    query['metadata.tags'] = { $in: options.tags };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
};

// Static method for public documents
documentSchema.statics.getPublicDocuments = function(options = {}) {
  const query = {
    isPublic: true,
    isActive: true,
    processingStatus: 'completed'
  };

  return this.find(query)
    .sort({ searchCount: -1, createdAt: -1 })
    .limit(options.limit || 50);
};

// Pre-save middleware to update word count if content changes
documentSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.metadata.wordCount = this.content.split(/\s+/).length;
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);
