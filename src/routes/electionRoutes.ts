import express, { Request, Response } from 'express';
import { getAllElections, getElection, submitNomination, createElection, approveNomination, checkElectionOwnership, updateElection, deleteElection, addPosition } from '../controllers/electionController';
import { clerkAuthMiddleware } from '../middleware/authMiddleware'

const router = express.Router();

// Protect all routes
// router.use(authMiddleware.protect);

// Routes accessible to all authenticated users
router.get('/', getAllElections);
router.get('/:id', getElection);

// Nominate a candidate
// router.post('/:id/nominate', submitNomination);

// Routes restricted to admin, house, or society roles
// router.post('/',
//     clerkAuthMiddleware as unknown as express.RequestHandler,
//     createElection as (req: Request, res: Response) => Promise<void>
// );

// // Approve a nomination
// router.patch('/:id/approve-nomination',
//   authMiddleware.restrictTo('admin', 'house', 'society'),
//   approveNomination
// );

// // Routes that need election creator or admin check
// router.route('/:id')
//   .patch(checkElectionOwnership, updateElection)
//   .delete(checkElectionOwnership, deleteElection);

// // Add a position to an election
// router.post('/:id/position',
//   checkElectionOwnership,
//   addPosition
// );

export default router;
