import express, { Request, Response } from 'express';
import { getAllElections, getElection, submitNomination, createElection, approveNomination, checkElectionOwnership, updateElection, deleteElection, addPosition } from '../controllers/electionController';
const authMiddleware = require("../middleware/authMiddleware")

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Routes accessible to all authenticated users
router.get('/', getAllElections);
router.get('/:id', getElection);

// Nominate a candidate
router.post('/:id/nominate', submitNomination as (req: Request, res: Response) => Promise<void>);

// Routes restricted to admin, house, or society roles
router.post('/',
    authMiddleware.restrictTo('admin', 'house', 'society'),
    createElection as (req: Request, res: Response) => Promise<void>
);

// // Approve a nomination
router.patch('/:id/approve-nomination',
    authMiddleware.restrictTo('admin', 'house', 'society'),
    approveNomination as (req: Request, res: Response) => Promise<void>
);

// // Routes that need election creator or admin check
router.route('/:id')
    .patch(
        checkElectionOwnership as (req: Request, res: Response) => Promise<void>,
        updateElection as (req: Request, res: Response) => Promise<void>)
    .delete(
        checkElectionOwnership as (req: Request, res: Response) => Promise<void>,
        deleteElection as (req: Request, res: Response) => Promise<void>);

// // Add a position to an election
router.post('/:id/position',
    checkElectionOwnership as (req: Request, res: Response) => Promise<void>,
    addPosition as (req: Request, res: Response) => Promise<void>
);

export default router;
