const express = require('express');
const electionController = require('../controllers/electionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Routes accessible to all authenticated users
router.get('/', electionController.getAllElections);
router.get('/:id', electionController.getElection);

// Nominate a candidate
router.post('/:id/nominate', electionController.submitNomination);

// Routes restricted to admin, house, or society roles
router.post('/',
  authMiddleware.restrictTo('admin', 'house', 'society'),
  electionController.createElection
);

// Approve a nomination
router.patch('/:id/approve-nomination',
  authMiddleware.restrictTo('admin', 'house', 'society'),
  electionController.approveNomination
);

// Routes that need election creator or admin check
router.route('/:id')
  .patch(electionController.checkElectionOwnership, electionController.updateElection)
  .delete(electionController.checkElectionOwnership, electionController.deleteElection);

// Add a position to an election
router.post('/:id/position',
  electionController.checkElectionOwnership,
  electionController.addPosition
);

export default router;
