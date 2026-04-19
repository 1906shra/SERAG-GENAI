const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  upload,
  uploadFile,
  uploadURL,
  getUploadStatus,
  getUserDocuments,
  deleteDocument
} = require('../controllers/uploadController');

const { protect } = require('../middleware/auth');

// Validation middleware
const uploadFileValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('tags')
    .optional()
    .trim()
    .custom(value => {
      if (value) {
        const tags = value.split(',');
        if (tags.length > 10) {
          throw new Error('Cannot have more than 10 tags');
        }
        for (const tag of tags) {
          if (tag.trim().length > 50) {
            throw new Error('Each tag cannot exceed 50 characters');
          }
        }
      }
      return true;
    }),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

const uploadURLValidation = [
  body('url')
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Please provide a valid HTTP or HTTPS URL'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('tags')
    .optional()
    .trim(),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category cannot exceed 50 characters'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
];

// Protected routes
router.post('/file', protect, upload.single('file'), uploadFileValidation, uploadFile);
router.post('/url', protect, uploadURLValidation, uploadURL);
router.get('/status/:id', protect, getUploadStatus);
router.get('/documents', protect, getUserDocuments);
router.delete('/documents/:id', protect, deleteDocument);

module.exports = router;
