import { Request, Response, NextFunction } from 'express';
import Grievance from '../models/grievanceModel';
import { IGrievance } from '../../types/interfaces';

// Define interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    [key: string]: any;
  };
  grievance?: IGrievance;
}

// Check if user has access to a grievance
export const checkGrievanceAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const grievanceId = req.params.id;
    const userId = req.user.id;

    const grievance = await Grievance.findById(grievanceId);

    if (!grievance) {
      res.status(404).json({
        status: 'fail',
        message: 'Grievance not found'
      });
      return;
    }

    // Admin has access to all grievances
    if (req.user.role === 'admin') {
      req.grievance = grievance;
      next();
      return;
    }

    // Check if user is the submitter of this grievance
    if (grievance.submittedBy._id.toString() !== userId) {
      res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this grievance'
      });
      return;
    }

    // Store grievance for next middleware
    req.grievance = grievance;
    next();
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get user's grievances
export const getMyGrievances = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const grievances = await Grievance.find({ submittedBy: req.user.id });

    res.status(200).json({
      status: 'success',
      results: grievances.length,
      data: {
        grievances
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Submit a new grievance
export const submitGrievance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Add submitter to request body
    req.body.submittedBy = req.user.id;

    const newGrievance = await Grievance.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        grievance: newGrievance
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific grievance
export const getGrievance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // grievance is already available from checkGrievanceAccess middleware
    const grievance = req.grievance;

    res.status(200).json({
      status: 'success',
      data: {
        grievance
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ADMIN HANDLERS

// Get all grievances
export const getAllGrievances = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const grievances = await Grievance.find();

    res.status(200).json({
      status: 'success',
      results: grievances.length,
      data: {
        grievances
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a grievance status
export const updateGrievanceStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status, assignedTo } = req.body;

    if (!['pending', 'under-review', 'resolved', 'rejected'].includes(status)) {
      res.status(400).json({
        status: 'fail',
        message: 'Invalid status value'
      });
      return;
    }

    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      { status, assignedTo },
      { new: true, runValidators: true }
    );

    if (!grievance) {
      res.status(404).json({
        status: 'fail',
        message: 'No grievance found with that ID'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        grievance
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Resolve a grievance
export const resolveGrievance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { comment } = req.body;

    if (!comment) {
      res.status(400).json({
        status: 'fail',
        message: 'Resolution comment is required'
      });
      return;
    }

    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolution: {
          comment,
          resolvedBy: req.user.id,
          resolvedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    );

    if (!grievance) {
      res.status(404).json({
        status: 'fail',
        message: 'No grievance found with that ID'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        grievance
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
