const express = require('express');
const voteController = require('../controllers/voteController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Cast a vote in an election
router.post('/:electionId', voteController.castVote);

// Get user's voting history
router.get('/my', voteController.getMyVotes);

module.exports = router;
