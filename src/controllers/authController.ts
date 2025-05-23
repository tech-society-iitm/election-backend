import { Request, Response } from "express";
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require("../models/userModel");

// Generate JWT token
const signToken = (id: any) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Generate refresh token
const signRefreshToken = (id: any) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  });
};

// Create and send tokens
const createSendTokens = (user: { _id: any; password: undefined; }, statusCode: number, res: { status: (arg0: any) => { (): any; new(): any; json: { (arg0: { status: string; token: any; refreshToken: any; data: { user: any; }; }): void; new(): any; }; }; }) => {
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    data: {
      user
    }
  });
};

// Register a new user
const signup = async (req: { body: { name: any; email: any; password: any; studentId: any; role: any; house: any; }; }, res: { status: any; }) => {
  try {
    const currentUser = await User.findOne({ email: req.body.email });
    if (currentUser) {
      console.log(currentUser);
    }

    // createSendTokens(newUser, 201, res);
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};



// // Log in a user
const login = async (req: { body: { email: any; password: any; }; }, res: { status: any; }) => {

  try {
    const { email, password } = req.body;

    // 1) Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide email and password'
      });
    }

    // 2) Check if user exists && password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // 3) Check if user is admin by matching email with ADMIN_EMAIL
    if (email === process.env.ADMIN_EMAIL && user.role !== 'admin') {
      // Update the user role to admin if it matches admin email
      user.role = 'admin';
      await user.save({ validateBeforeSave: false });
    }

    // 4) If everything ok, send token to client
    createSendTokens(user, 200, res);
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Refresh access token using refresh token
const refreshToken = async (req: any, res: any) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: 'fail',
        message: 'No refresh token provided'
      });
    }

    // Verify refresh token
    const decoded = await promisify(jwt.verify)(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists'
      });
    }

    // Issue new access token
    const newToken = signToken(currentUser._id);

    res.status(200).json({
      status: 'success',
      token: newToken
    });
  } catch (err) {
    res.status(401).json({
      status: 'fail',
      message: 'Invalid refresh token'
    });
  }
};

// Update password
const updatePassword = async (req: any, res: any) => {
  try {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // 2) Check if POSTed current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Your current password is incorrect'
      });
    }

    // 3) If so, update password
    user.password = req.body.newPassword;
    await user.save();

    // 4) Log user in, send JWT
    createSendTokens(user, 200, res);
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Check authentication status
const checkAuthStatus = (req: any, res: any) => {
  // If this controller is reached, authMiddleware.protect has successfully authenticated the user
  // req.user is populated by the protect middleware
  res.status(200).json({
    status: 'success',
    isLoggedIn: true,
    user: req.user // Send user data back
  });
};

export { signup, login, refreshToken, checkAuthStatus, updatePassword };
