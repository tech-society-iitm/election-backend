import { Request, Response, NextFunction } from 'express';
import Society from '../models/societyModel';
import User from '../models/userModel';
import { ISociety, ISocietyMember } from '../../types/interfaces';
import mongoose from 'mongoose';

// Extended request interface with user and society
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
  };
  society?: ISociety;
}

interface MemberData {
  userId: string;
  role?: 'member' | 'lead' | 'coordinator';
}

// Check if user has access to modify a society
export const checkSocietyAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const societyId = req.params.id;
    const userId = req.user.id;

    // Admin has access to all societies
    if (req.user.role === 'admin') {
      return next();
    }

    const society = await Society.findById(societyId);

    if (!society) {
      res.status(404).json({
        status: 'fail',
        message: 'Society not found'
      });
      return;
    }

    // Check if user is a lead of this society
    const isLead = society.leads.some(lead => lead.toString() === userId);

    if (!isLead && req.user.role !== 'society') {
      res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to modify this society'
      });
      return;
    }

    // Store society for next middleware
    req.society = society;
    next();
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all societies
export const getAllSocieties = async (req: Request, res: Response): Promise<void> => {
  try {
    const societies = await Society.find()
      .populate({
        path: 'leads',
        select: 'name email'
      })
      .populate({
        path: 'members.user',
        select: 'name email studentId'
      });

    res.status(200).json({
      status: 'success',
      results: societies.length,
      data: {
        societies
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific society
export const getSociety = async (req: Request, res: Response): Promise<void> => {
  try {
    const society = await Society.findById(req.params.id)
      .populate({
        path: 'leads',
        select: 'name email'
      })
      .populate({
        path: 'members.user',
        select: 'name email studentId'
      });

    if (!society) {
      res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new society
export const createSociety = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Add the creator to the request body
    req.body.createdBy = req.user.id;

    // If leads aren't specified, make the creator a lead
    if (!req.body.leads || req.body.leads.length === 0) {
      req.body.leads = [req.user.id];
    }

    // Create the society
    const newSociety = await Society.create(req.body);

    // Add user to society's member list if not already there
    if (!newSociety.members.some(member => member.user.toString() === req.user.id)) {
      newSociety.members.push({
        user: req.user.id as unknown as mongoose.Types.ObjectId,
        role: 'lead',
        joinedAt: new Date()
      });
      await newSociety.save();
    }

    // Update the user to include this society
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { societies: newSociety._id }
    });

    res.status(201).json({
      status: 'success',
      data: {
        society: newSociety
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a society
export const updateSociety = async (req: Request, res: Response): Promise<void> => {
  try {
    // Set the update timestamp
    req.body.updatedAt = new Date();

    const society = await Society.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!society) {
      res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a society
export const deleteSociety = async (req: Request, res: Response): Promise<void> => {
  try {
    const society = await Society.findByIdAndDelete(req.params.id);

    if (!society) {
      res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
      return;
    }

    // Remove society reference from all users
    await User.updateMany(
      { societies: req.params.id },
      { $pull: { societies: req.params.id } }
    );

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

// Add members to a society
export const addMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { members } = req.body as { members: MemberData[] };

    if (!members || !Array.isArray(members)) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide an array of member IDs'
      });
      return;
    }

    const society = await Society.findById(req.params.id);

    if (!society) {
      res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
      return;
    }

    // Process each member
    for (const memberData of members) {
      const { userId, role = 'member' } = memberData;

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({
          status: 'fail',
          message: `User with ID ${userId} not found`
        });
        return;
      }

      // Check if user is already a member
      const existingMember = society.members.find(
        m => m.user.toString() === userId
      );

      if (existingMember) {
        // Update role if different
        if (existingMember.role !== role) {
          existingMember.role = role;
        }
      } else {
        // Add as new member
        society.members.push({
          user: userId as unknown as mongoose.Types.ObjectId,
          role,
          joinedAt: new Date()
        });

        // Update user's societies list
        await User.findByIdAndUpdate(userId, {
          $addToSet: { societies: society._id }
        });
      }

      // Update leads list if role is lead
      if (role === 'lead') {
        if (!society.leads.some(lead => lead.toString() === userId)) {
          society.leads.push(userId as unknown as mongoose.Types.ObjectId);
        }
      } else {
        // Remove from leads if role is not lead
        society.leads = society.leads.filter(lead => lead.toString() !== userId);
      }
    }

    await society.save();

    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Remove a member from a society
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;

    const society = await Society.findById(id);

    if (!society) {
      res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
      return;
    }

    // Remove user from members
    society.members = society.members.filter(
      member => member.user.toString() !== userId
    );

    // Remove user from leads
    society.leads = society.leads.filter(lead => lead.toString() !== userId);

    await society.save();

    // Remove society reference from user
    await User.findByIdAndUpdate(userId, {
      $pull: { societies: society._id }
    });

    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
