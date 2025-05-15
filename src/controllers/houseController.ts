import { Request, Response } from 'express';
import mongoose from 'mongoose';
import House from '../models/houseModel';
import User from '../models/userModel';

// Define interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

// Get all houses
export const getAllHouses = async (req: Request, res: Response): Promise<void> => {
  try {
    const houses = await House.find()
      .populate({
        path: 'secretaries',
        select: 'name email'
      })
      .populate({
        path: 'members',
        select: 'name email studentId'
      });

    res.status(200).json({
      status: 'success',
      results: houses.length,
      data: {
        houses
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific house
export const getHouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const house = await House.findById(req.params.id)
      .populate({
        path: 'secretaries',
        select: 'name email'
      })
      .populate({
        path: 'members',
        select: 'name email studentId'
      });

    if (!house) {
      res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new house
export const createHouse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Add the creator to the request body
    req.body.createdBy = req.user.id;

    const newHouse = await House.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        house: newHouse
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a house
export const updateHouse = async (req: Request, res: Response): Promise<void> => {
  try {
    // Set the update timestamp
    req.body.updatedAt = new Date();

    const house = await House.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!house) {
      res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a house
export const deleteHouse = async (req: Request, res: Response): Promise<void> => {
  try {
    const house = await House.findByIdAndDelete(req.params.id);

    if (!house) {
      res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
      return;
    }

    // Remove house reference from all users
    await User.updateMany(
      { house: req.params.id },
      { $unset: { house: 1 } }
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

// Add members to a house
export const addMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { members } = req.body as { members: string[] };

    if (!members || !Array.isArray(members)) {
      res.status(400).json({
        status: 'fail',
        message: 'Please provide an array of member IDs'
      });
      return;
    }

    const house = await House.findById(req.params.id);

    if (!house) {
      res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
      return;
    }

    for (const userId of members) {
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
      const userIdObj = new mongoose.Types.ObjectId(userId);
      if (!house.members.some(member => member.equals(userIdObj))) {
        house.members.push(userIdObj);
      }

      // Update user's house
      await User.findByIdAndUpdate(userId, { house: house._id });
    }

    await house.save();

    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Remove a member from a house
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, userId } = req.params;

    const house = await House.findById(id);

    if (!house) {
      res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
      return;
    }

    // Remove user from members
    house.members = house.members.filter(
      member => member.toString() !== userId
    );

    // Remove user from secretaries
    house.secretaries = house.secretaries.filter(
      secretary => secretary.toString() !== userId
    );

    await house.save();

    // Remove house reference from user
    await User.findByIdAndUpdate(userId, {
      $unset: { house: 1 }
    });

    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
