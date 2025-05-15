import { Request, Response } from 'express';
const User = require('../models/userModel');

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

// Get current user profile
exports.getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('house')
      .populate('societies');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update current user profile
exports.updateMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if user is trying to update password
    if (req.body.password) {
      return res.status(400).json({
        status: 'fail',
        message: 'This route is not for password updates. Please use /update-password.'
      });
    }

    // Filter out unwanted fields that should not be updated
    const filteredBody = filterObj(req.body, 'name', 'email');

    // Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Helper function to filter object
const filterObj = <T extends object>(obj: T, ...allowedFields: string[]) => {
  const newObj: Partial<T> = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el as keyof T] = obj[el as keyof T];
  });
  return newObj;
};

// ADMIN HANDLERS

// Get all users
exports.getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new user
exports.createUser = async (req: Request, res: Response) => {
  try {
    const newUser = await User.create(req.body);

    // Remove password from output
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific user
exports.getUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('house')
      .populate('societies');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a user
exports.updateUser = async (req: Request, res:Response) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with that ID'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a user
exports.deleteUser = async (req: Request, res:Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with that ID'
      });
    }

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
