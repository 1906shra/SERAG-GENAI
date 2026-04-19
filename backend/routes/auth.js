const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  register,
  login,
  getMe,
  updateProfile,
  updateSettings,
  changePassword
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

// Validation middleware
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

const updateSettingsValidation = [
  body('settings.searchModel')
    .optional()
    .isIn(['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'claude-3'])
    .withMessage('Invalid search model'),
  body('settings.maxResults')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max results must be between 1 and 50'),
  body('settings.semanticWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Semantic weight must be between 0 and 1'),
  body('settings.keywordWeight')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Keyword weight must be between 0 and 1')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidation, updateProfile);
router.put('/settings', protect, updateSettingsValidation, updateSettings);
router.put('/password', protect, changePasswordValidation, changePassword);

module.exports = router;
