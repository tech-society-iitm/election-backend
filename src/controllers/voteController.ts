import { Request, Response } from 'express';
import crypto from 'crypto';
import Vote from '../models/voteModel';
import Election from '../models/electionModel';
import { IElection } from '../../types/interfaces';

// Define interfaces for type safety
interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    [key: string]: any;
  };
}



// Helper to generate client hash for fraud prevention
const generateClientHash = (req: Request): string => {
  const data = `${req.ip}-${req.headers['user-agent']}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Cast a vote in an election
export const castVote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { electionId } = req.params;
    const { position, candidate } = req.body;

    // Check if the election exists and is active
    const election = await Election.findById(electionId) as IElection | null;
    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    if (election.status !== 'active') {
      res.status(400).json({
        status: 'fail',
        message: 'Voting is not currently active for this election'
      });
      return;
    }

    const now = new Date();
    if (now < new Date(election.votingStart) || now > new Date(election.votingEnd)) {
      res.status(400).json({
        status: 'fail',
        message: 'Voting period is not active'
      });
      return;
    }

    // Check if the position exists in this election
    const positionExists = election.positions.some(p => p.title === position);
    if (!positionExists) {
      res.status(400).json({
        status: 'fail',
        message: 'Invalid position'
      });
      return;
    }

    // Check if the candidate is valid for this position
    const positionObj = election.positions.find(p => p.title === position);

    if (!positionObj) {
      res.status(400).json({
        status: 'fail',
        message: 'Position not found'
      });
      return;
    }

    const candidateValid = positionObj.candidates.some(c =>
      c.user._id.toString() === candidate && c.approved
    );

    if (!candidateValid) {
      res.status(400).json({
        status: 'fail',
        message: 'Invalid or unapproved candidate'
      });
      return;
    }

    // Create vote with client hash for fraud prevention
    const vote = await Vote.create({
      election: electionId,
      position,
      candidate,
      voter: req.user._id,
      clientHash: generateClientHash(req)
    });

    res.status(201).json({
      status: 'success',
      data: {
        vote
      }
    });
  } catch (err: any) {
    // If error is a duplicate key error, user has already voted
    if (err.code === 11000) {
      res.status(400).json({
        status: 'fail',
        message: 'You have already voted for this position in this election'
      });
      return;
    }

    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get user's voting history
export const getMyVotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const votes = await Vote.find({ voter: req.user._id })
      .populate({
        path: 'election',
        select: 'title type status'
      })
      .populate({
        path: 'candidate',
        select: 'name'
      });

    res.status(200).json({
      status: 'success',
      results: votes.length,
      data: {
        votes
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
