import mongoose, { Schema, model, Query } from "mongoose";
import bcrypt from 'bcryptjs';

import { IUser } from "../../types/interfaces";

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Please provide your name']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  studentId: {
    type: String,
    required: [true, 'Please provide a student ID'],
    unique: true
  },
  role: {
    type: String,
    enum: ['admin', 'house', 'society', 'user'],
    default: 'user'
  },
  houseId: {
    type: Schema.Types.ObjectId,
    ref: 'House'
  },
  societyId: [{
    type: Schema.Types.ObjectId,
    ref: 'Society'
  }],
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
  }
});

// Pre-save middleware to hash the password
userSchema.pre('save', async function(next) {
  // Only run this function if password was modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// Update passwordChangedAt property
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = new Date(Date.now() - 1000); // Ensure token is created after password change
  next();
});

// Query middleware to filter out inactive users
userSchema.pre<Query<any, IUser>>(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// Instance method to check if password is correct
userSchema.methods.correctPassword = async function(candidatePassword: string, userPassword: string) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp: number) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const User = model<IUser>('User', userSchema);

export default User;
