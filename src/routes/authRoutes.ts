import express from "express";
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

import { signup, login, updatePassword, refreshToken, checkAuthStatus } from "../controllers/authController";

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.patch(
    '/update-password',
    authMiddleware.protect,
    updatePassword
);

// Route to check authentication status
router.get('/status', authMiddleware.protect, checkAuthStatus);

export default router;
