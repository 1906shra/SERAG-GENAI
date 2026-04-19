const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { validationResult } = require('express-validator');
const Document = require('../models/Document');
const DocumentService = require('../services/documentService');
const ChunkingService = require('../services/chunkingService');
const EmbeddingService = require('../services/embeddingService');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_PATH || './uploads';
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.txt', '.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} not supported. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
});

// @desc    Upload and process document
// @route   POST /api/upload/file
// @access  Private
const uploadFile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { title, tags, category, isPublic } = req.body;
    const userId = req.user.id;

    // Determine content type from file extension
    const ext = path.extname(req.file.originalname).toLowerCase();
    const contentTypeMap = {
      '.txt': 'text',
      '.pdf': 'pdf',
      '.docx': 'docx'
    };
    const contentType = contentTypeMap[ext];

    if (!contentType) {
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type'
      });
    }

    // Create document record
    const document = new Document({
      title: title || path.basename(req.file.originalname, ext),
      contentType,
      source: req.file.originalname,
      uploadedBy: userId,
      metadata: {
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        category: category || 'general'
      },
      isPublic: isPublic === 'true',
      processingStatus: 'pending'
    });

    await document.save();

    // Process document asynchronously
    processDocumentAsync(document._id, req.file.path, contentType)
      .catch(error => {
        logger.error(`Document processing failed for ${document._id}:`, error);
        Document.findByIdAndUpdate(document._id, {
          processingStatus: 'failed',
          processingError: error.message
        }).catch(err => logger.error('Failed to update document status:', err));
      });

    logger.info(`Document uploaded: ${document._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        id: document._id,
        title: document.title,
        contentType: document.contentType,
        processingStatus: document.processingStatus,
        uploadedAt: document.createdAt
      }
    });
  } catch (error) {
    logger.error('File upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }
    
    next(error);
  }
};

// @desc    Upload and process URL
// @route   POST /api/upload/url
// @access  Private
const uploadURL = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { url, title, tags, category, isPublic } = req.body;
    const userId = req.user.id;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    // Create document record
    const document = new Document({
      title: title || url,
      contentType: 'url',
      source: url,
      uploadedBy: userId,
      metadata: {
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        category: category || 'web'
      },
      isPublic: isPublic === 'true',
      processingStatus: 'pending'
    });

    await document.save();

    // Process URL asynchronously
    processDocumentAsync(document._id, url, 'url')
      .catch(error => {
        logger.error(`URL processing failed for ${document._id}:`, error);
        Document.findByIdAndUpdate(document._id, {
          processingStatus: 'failed',
          processingError: error.message
        }).catch(err => logger.error('Failed to update document status:', err));
      });

    logger.info(`URL uploaded: ${document._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        id: document._id,
        title: document.title,
        contentType: document.contentType,
        processingStatus: document.processingStatus,
        uploadedAt: document.createdAt
      }
    });
  } catch (error) {
    logger.error('URL upload error:', error);
    next(error);
  }
};

// @desc    Get upload status
// @route   GET /api/upload/status/:id
// @access  Private
const getUploadStatus = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: document._id,
        title: document.title,
        processingStatus: document.processingStatus,
        processingError: document.processingError,
        chunkCount: document.chunks.length,
        uploadedAt: document.createdAt,
        updatedAt: document.updatedAt
      }
    });
  } catch (error) {
    logger.error('Get upload status error:', error);
    next(error);
  }
};

// @desc    Get user documents
// @route   GET /api/upload/documents
// @access  Private
const getUserDocuments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, contentType, tags, search } = req.query;
    const userId = req.user.id;

    const options = {
      limit: parseInt(limit),
      contentType,
      tags: tags ? tags.split(',') : undefined
    };

    let documents = await Document.getUserDocuments(userId, options);

    // Apply text search if provided
    if (search) {
      documents = documents.filter(doc =>
        doc.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedDocuments = documents.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: {
        documents: paginatedDocuments.map(doc => ({
          id: doc._id,
          title: doc.title,
          contentType: doc.contentType,
          source: doc.source,
          processingStatus: doc.processingStatus,
          chunkCount: doc.chunks.length,
          metadata: doc.metadata,
          isPublic: doc.isPublic,
          searchCount: doc.searchCount,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: documents.length,
          pages: Math.ceil(documents.length / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get user documents error:', error);
    next(error);
  }
};

// @desc    Delete document
// @route   DELETE /api/upload/documents/:id
// @access  Private
const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Soft delete (set isActive to false)
    document.isActive = false;
    await document.save();

    logger.info(`Document deleted: ${document._id} by user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Delete document error:', error);
    next(error);
  }
};

// Async document processing function
async function processDocumentAsync(documentId, source, contentType) {
  const documentService = new DocumentService();
  const chunkingService = new ChunkingService();
  const embeddingService = new EmbeddingService();

  try {
    // Update status to processing
    await Document.findByIdAndUpdate(documentId, { processingStatus: 'processing' });

    // Extract text content from file/URL
    const { content, metadata } = await documentService.processDocument(source, contentType, source);

    // Persist extracted content + metadata
    await Document.findByIdAndUpdate(documentId, {
      content,
      originalContent: content,
      'metadata.wordCount': metadata.wordCount,
      'metadata.fileSize': metadata.fileSize,
      'metadata.language': metadata.language,
      'metadata.pageCount': metadata.pageCount
    });

    // Split into overlapping chunks
    const chunks = chunkingService.chunkDocument(content, {
      chunkSize: 1000,
      chunkOverlap: 200
    });

    // ── Embedding generation (optional) ──────────────────────────────────────
    // If the OpenAI key has no quota or is unavailable, we still mark the
    // document as completed so keyword search works. Semantic search will
    // simply return no results for this document until embeddings are added.
    let finalChunks = chunks; // chunks without embeddings (keyword-only)

    try {
      const enrichedChunks = await embeddingService.generateChunkEmbeddings(chunks, {
        batchSize: 5,
        onProgress: (progress, completed) => {
          logger.info(
            `Document ${documentId} embedding progress: ` +
            `${Math.round(progress * 100)}% (${completed}/${chunks.length})`
          );
        }
      });
      finalChunks = enrichedChunks;
      logger.info(`Embeddings generated for document ${documentId}: ${finalChunks.length} chunks`);
    } catch (embeddingError) {
      // Detect quota / auth errors — no point retrying
      const isQuotaError =
        embeddingError.message?.includes('insufficient_quota') ||
        embeddingError.message?.includes('invalid_api_key') ||
        embeddingError.message?.includes('429');

      if (isQuotaError) {
        logger.warn(
          `OpenAI quota/key issue for document ${documentId} — ` +
          `saving chunks without embeddings (keyword search only). Error: ${embeddingError.message}`
        );
      } else {
        logger.error(
          `Embedding generation failed for document ${documentId} — ` +
          `saving chunks without embeddings. Error: ${embeddingError.message}`
        );
      }
      // finalChunks stays as plain chunks (no embeddings) — document still usable
    }

    // Save chunks (with or without embeddings) and mark completed
    await Document.findByIdAndUpdate(documentId, {
      chunks: finalChunks,
      processingStatus: 'completed'
    });

    logger.info(`Document processing completed: ${documentId} (${finalChunks.length} chunks, embeddings: ${finalChunks[0]?.embedding ? 'yes' : 'no'})`);
  } catch (error) {
    logger.error(`Document processing failed for ${documentId}:`, error);
    await Document.findByIdAndUpdate(documentId, {
      processingStatus: 'failed',
      processingError: error.message
    });
    throw error;
  }
}

module.exports = {
  upload,
  uploadFile,
  uploadURL,
  getUploadStatus,
  getUserDocuments,
  deleteDocument
};
