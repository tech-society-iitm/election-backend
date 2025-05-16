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
    return res.status(200).json({
      user: req.user
    })
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Update current user profile
exports.updateMe = async (req: AuthenticatedRequest, res:Response) => {
  try {
    const { studentId, name } = req.body;

    if (!req.user.id) {
      return res.status(400).json({ message: 'User ID not found' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(studentId && { studentId }),
        ...(name && { name }),
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        studentId: updatedUser.studentId,
        role: updatedUser.role,
        houseId: updatedUser.houseId,
        societyId: updatedUser.societyId,
        clerkId: updatedUser.clerkId
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ message: 'Internal server error' });
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
