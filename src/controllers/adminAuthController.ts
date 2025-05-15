import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/userModel';
import { IUser } from '../../types/interfaces';

// Generate JWT token with proper type assertions
const signToken = (id: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] || '90d'
  };

  // Use explicit type assertion for the secret
  return jwt.sign({ id }, secret as jwt.Secret, options);
};

interface LoginRequestBody {
  email: string;
  password: string;
}

export const login = async (req: Request<{}, {}, LoginRequestBody>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Only allow admin email from .env
    if (email !== process.env.ADMIN_EMAIL) {
      res.status(401).json({
        status: 'fail',
        message: 'Invalid credentials'
      });
      return;
    }

    // Find admin user
    const user = await User.findOne({ email, role: 'admin' }).select('+password') as (IUser & { password: string }) | null;
    if (!user) {
      console.log(`Admin user not found for email: ${email}`);
      res.status(401).json({
        status: 'fail',
        message: 'Admin user not found'
      });
      return;
    }

    // Check password
    const correct = await bcrypt.compare(password, user.password);
    if (!correct) {
      console.log(password);
      console.log(correct);
      console.log('Hashed password in DB:', user.password);
      console.log(await bcrypt.hash(password, 12));
      res.status(401).json({
        status: 'fail',
        message: 'Invalid password'
      });
      return;
    }

    // Generate token
    const token = signToken(user._id);

    // Remove password from output
    const userWithoutPassword = { ...user.toObject() };
    delete userWithoutPassword.password;

    res.status(200).json({
      status: 'success',
      token,
      data: {
        user: userWithoutPassword
      }
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
