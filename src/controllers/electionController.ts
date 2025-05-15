import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Election from '../models/electionModel';
import { IElection } from '../../types/interfaces';

// Define interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    house?: string;
    societies?: string[];
    [key: string]: any;
  };
  election?: IElection;
}

// Check if user has ownership of an election
export const checkElectionOwnership = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;

    const election = await Election.findById(electionId);

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    // Admin has access to all elections
    if (req.user.role === 'admin') {
      req.election = election;
      next();
      return;
    }

    // Check if user is the creator of this election
    if (election.createdBy.toString() === userId) {
      req.election = election;
      next();
      return;
    }

    // Check if user has role-based access to this election
    if (election.type === 'house' && req.user.role === 'house') {
      if (req.user.house && req.user.house.toString() === election.house?.toString()) {
        req.election = election;
        next();
        return;
      }
    }

    if (election.type === 'society' && req.user.role === 'society') {
      if (req.user.societies && req.user.societies.some(s => s.toString() === election.society?.toString())) {
        req.election = election;
        next();
        return;
      }
    }

    res.status(403).json({
      status: 'fail',
      message: 'You do not have permission to modify this election'
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all elections
export const getAllElections = async (req: Request, res: Response): Promise<void> => {
  try {
    // Build query - filter by status if provided
    const filter: Record<string, any> = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    let query = Election.find(filter)
      .populate({
        path: 'createdBy',
        select: 'name'
      });

    // If type is provided, filter by type
    if (req.query.type) {
      query = query.find({ type: req.query.type });
    }

    // If house is provided, filter by house
    if (req.query.house) {
      query = query.find({ house: req.query.house });
    }

    // If society is provided, filter by society
    if (req.query.society) {
      query = query.find({ society: req.query.society });
    }

    // Execute query
    const elections = await query;

    res.status(200).json({
      status: 'success',
      results: elections.length,
      data: {
        elections
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific election
export const getElection = async (req: Request, res: Response): Promise<void> => {
  try {
    const election = await Election.findById(req.params.id)
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .populate({
        path: 'house',
        select: 'name'
      })
      .populate({
        path: 'society',
        select: 'name'
      });

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'No election found with that ID'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new election
export const createElection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Add the creator to the request body
    req.body.createdBy = req.user.id;

    // Validate election type specific fields
    if (req.body.type === 'house' && !req.body.house) {
      res.status(400).json({
        status: 'fail',
        message: 'House elections must specify a house'
      });
      return;
    }

    if (req.body.type === 'society' && !req.body.society) {
      res.status(400).json({
        status: 'fail',
        message: 'Society elections must specify a society'
      });
      return;
    }

    // If user is not admin, verify they have access to create this type of election
    if (req.user.role !== 'admin') {
      if (req.body.type === 'house' && req.user.role === 'house') {
        // Verify user belongs to this house
        if (!req.user.house || req.user.house.toString() !== req.body.house) {
          res.status(403).json({
            status: 'fail',
            message: 'You can only create elections for your own house'
          });
          return;
        }
      } else if (req.body.type === 'society' && req.user.role === 'society') {
        // Verify user is associated with this society
        if (!req.user.societies || !req.user.societies.includes(req.body.society)) {
          res.status(403).json({
            status: 'fail',
            message: 'You can only create elections for societies you are a lead of'
          });
          return;
        }
      } else if (req.body.type === 'university') {
        res.status(403).json({
          status: 'fail',
          message: 'Only administrators can create university-wide elections'
        });
        return;
      }
    }

    const newElection = await Election.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        election: newElection
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Submit a nomination for an election
export const submitNomination = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { position, manifesto } = req.body;

    if (!position) {
      res.status(400).json({
        status: 'fail',
        message: 'Position is required'
      });
      return;
    }

    const election = await Election.findById(id);

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    // Check if election is in nomination period
    const now = new Date();
    if (now < new Date(election.nominationStart) || now > new Date(election.nominationEnd)) {
      res.status(400).json({
        status: 'fail',
        message: 'Nomination period is not active'
      });
      return;
    }

    // Find position in election
    const positionIndex = election.positions.findIndex(p => p.title === position);

    if (positionIndex === -1) {
      res.status(404).json({
        status: 'fail',
        message: 'Position not found in this election'
      });
      return;
    }

    // Check if user has already nominated themselves for this position
    const alreadyNominated = election.positions[positionIndex].candidates.some(
      c => c.user.toString() === req.user.id
    );

    if (alreadyNominated) {
      res.status(400).json({
        status: 'fail',
        message: 'You have already nominated yourself for this position'
      });
      return;
    }

    // Add nomination
    election.positions[positionIndex].candidates.push({
      user: req.user.id as unknown as mongoose.Types.ObjectId,
      approved: false,
      manifesto: manifesto || '',
      nominatedAt: new Date()
    });

    await election.save();

    res.status(201).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Approve a nomination
export const approveNomination = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { position, candidateId } = req.body;

    if (!position || !candidateId) {
      res.status(400).json({
        status: 'fail',
        message: 'Position and candidateId are required'
      });
      return;
    }

    const election = await Election.findById(id);

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    // Find position in election
    const positionIndex = election.positions.findIndex(p => p.title === position);

    if (positionIndex === -1) {
      res.status(404).json({
        status: 'fail',
        message: 'Position not found in this election'
      });
      return;
    }

    // Find candidate in position
    const candidateIndex = election.positions[positionIndex].candidates.findIndex(
      c => c.user.toString() === candidateId
    );

    if (candidateIndex === -1) {
      res.status(404).json({
        status: 'fail',
        message: 'Candidate not found for this position'
      });
      return;
    }

    // Approve nomination
    election.positions[positionIndex].candidates[candidateIndex].approved = true;
    election.positions[positionIndex].candidates[candidateIndex].approvedBy = req.user.id as unknown as mongoose.Types.ObjectId;
    election.positions[positionIndex].candidates[candidateIndex].approvedAt = new Date();

    await election.save();

    res.status(200).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update an election
export const updateElection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // election is already available from checkElectionOwnership middleware
    const election = req.election;

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    // Don't allow status updates if the election is already completed
    if (election.status === 'completed' && req.body.status) {
      res.status(400).json({
        status: 'fail',
        message: 'Cannot update a completed election'
      });
      return;
    }

    // Update election properties
    const updatedElection = await Election.findByIdAndUpdate(
      election._id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        election: updatedElection
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete an election
export const deleteElection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // election is already available from checkElectionOwnership middleware
    const election = req.election;

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    // Don't allow deleting an active or completed election
    if (['active', 'completed'].includes(election.status)) {
      res.status(400).json({
        status: 'fail',
        message: 'Cannot delete an active or completed election'
      });
      return;
    }

    await Election.findByIdAndDelete(election._id);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Add a position to an election
export const addPosition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // election is already available from checkElectionOwnership middleware
    const election = req.election;

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    // Don't allow adding positions if the election is not in draft status
    if (election.status !== 'draft') {
      res.status(400).json({
        status: 'fail',
        message: 'Can only add positions to elections in draft status'
      });
      return;
    }

    const { title, description } = req.body;

    if (!title) {
      res.status(400).json({
        status: 'fail',
        message: 'Position title is required'
      });
      return;
    }

    // Check if position already exists
    const positionExists = election.positions.some(p => p.title === title);

    if (positionExists) {
      res.status(400).json({
        status: 'fail',
        message: 'A position with this title already exists'
      });
      return;
    }

    // Add new position
    election.positions.push({
      title,
      description: description || '',
      candidates: [],
      maxSelections: 1
    });

    await election.save();

    res.status(201).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
