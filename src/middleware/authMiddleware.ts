const jwt = require('jsonwebtoken');
const { promisify } = require('util');
import { Request, Response, NextFunction } from 'express';
const User = require('../models/userModel');

interface AuthenticatedRequest extends Request {
  user: {
    role: string;
  };
}

// Protect routes - verify user is logged in
exports.protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1) Get token from authorization header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password. Please log in again.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token or authentication failure'
    });
  }
};

// Restrict access to certain roles
exports.restrictTo = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

// Check if user is associated with a specific house
exports.isHouseMember = async (req: { params: { houseId: any; }; body: { houseId: any; }; user: { role: string; house: { toString: () => any; }; }; }, res: Response, next: NextFunction) => {
  try {
    const houseId = req.params.houseId || req.body.houseId;

    if (!houseId) {
      return res.status(400).json({
        status: 'fail',
        message: 'House ID is required'
      });
    }

    // Admin has access to all houses
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is associated with the house
    if (!req.user.house || req.user.house.toString() !== houseId) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this house'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Error checking house membership'
    });
  }
};

// Check if user is associated with a specific society
exports.isSocietyMember = async (req: { params: { societyId: any; }; body: { societyId: any; }; user: { role: string; societies: any[]; }; }, res: Response, next: NextFunction) => {
  try {
    const societyId = req.params.societyId || req.body.societyId;

    if (!societyId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Society ID is required'
      });
    }

    // Admin has access to all societies
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is associated with the society
    if (!req.user.societies || !req.user.societies.some(s => s.toString() === societyId)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this society'
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Error checking society membership'
    });
  }
};
