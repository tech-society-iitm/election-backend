const jwt = require('jsonwebtoken');
const { promisify } = require('util');
import { Request, Response, NextFunction } from 'express';
const User = require('../models/userModel');
import { AuthenticatedRequest } from "../../types/interfaces";
import { clerkClient, verifyToken } from '@clerk/express';

interface VerifyTokenOptions {
  audience?: string;
  issuer?: string;
  jwtKey?: string;
}


export const clerkAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const options: VerifyTokenOptions = {
      audience: process.env.CLERK_AUDIENCE || 'https://localhost:3000' // Typically your application identifier
    };
    const session = await verifyToken(token, options);

    if (!session) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Get user details from Clerk
    const clerkUser = await clerkClient.users.getUser(session.sub);

    if (!clerkUser) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    // Find or create user in MongoDB
    let user = await User.findOne({ clerkId: clerkUser.id });

    if (!user) {
      // Create new user in MongoDB
      user = new User({
        _id: clerkUser.id, // Use Clerk ID as MongoDB ID
        email: clerkUser.emailAddresses[0].emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        role: 'user', // Default role
        active: true,
        clerkId: clerkUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await user.save();
    }

    // Set user in request
    const authReq = req as AuthenticatedRequest;
    authReq.user = {
      _id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      studentId: user.studentId,
      houseId: user.houseId,
      societyId: user.societyId,
      clerkId: clerkUser.id
    };

    authReq.clerkUser = clerkUser; // Optional: Store raw Clerk user data

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Unauthorized: Authentication failed' });
  }
};

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
