const express = require('express');
const grievanceController = require('../controllers/grievanceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Routes for authenticated users
router.get('/my', grievanceController.getMyGrievances);
router.post('/', grievanceController.submitGrievance);

// Routes with ownership check
router.get('/:id', grievanceController.checkGrievanceAccess, grievanceController.getGrievance);

// Admin only routes
router.use(authMiddleware.restrictTo('admin'));

router.get('/', grievanceController.getAllGrievances);
router.patch('/:id', grievanceController.updateGrievanceStatus);
router.post('/:id/resolve', grievanceController.resolveGrievance);

export default router;
