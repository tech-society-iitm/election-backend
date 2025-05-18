import { clerkAuthMiddleware } from "../middleware/authMiddleware";

const express = require('express');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes after this middleware
router.use(clerkAuthMiddleware);

// User profile routes
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);

// Admin only routes
router.use(authMiddleware.restrictTo('admin'));
router.route('/')
  .get(userController.getAllUsers)
  // .post(userController.createUser);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

export default router;
