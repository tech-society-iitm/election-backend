const express = require('express');
const resultController = require('../controllers/resultController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Get election results
router.get('/:electionId', resultController.getElectionResults);

module.exports = router;
