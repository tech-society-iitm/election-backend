const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.patch(
  '/update-password',
  authMiddleware.protect,
  authController.updatePassword
);

// Route to check authentication status
router.get('/status', authMiddleware.protect, authController.checkAuthStatus);

export default router;
