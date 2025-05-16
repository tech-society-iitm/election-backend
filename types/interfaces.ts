import mongoose, {Document} from "mongoose";
import { Request } from "express";

// User interfaces
export interface IUser extends Document {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  password: string;
  studentId: string;
  role: "user" | "admin" | "society" | "house";
  houseId?: string;
  societyId?: string;
  passwordChangedAt: Date,
  passwordResetToken: string,
  passwordResetExpires: Date,
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  data: {
    id: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
      verification: {
        status: string;
        strategy: string;
      };
    }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    created_at: number;
    updated_at: number;
    [key: string]: any;
  };
  object: string;
  type: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
    role: string;
    _id?: string;
    email?: string;
    name?: string;
    studentId?: string;
    houseId?: string;
    societyId?: string;
    clerkId?: string; // Add Clerk ID for reference
  };
  clerkUser?: any; // Optional: Raw Clerk user data if needed
}


// Define interface for House document
export interface IHouse extends Document {
  name: string;
  description?: string;
  color: string;
  logo?: string;
  members: mongoose.Types.ObjectId[];
  secretaries: mongoose.Types.ObjectId[];
  active: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}


// Election interfaces
export interface IElection extends Document {
  _id: string;
  title: string;
  description?: string;
  type: 'university' | 'house' | 'society';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  house?: mongoose.Types.ObjectId;
  society?: mongoose.Types.ObjectId;
  positions: IPosition[];
  nominationStart: Date;
  nominationEnd: Date;
  votingStart: Date;
  votingEnd: Date;
  resultsReleasedAt?: Date;
  createdBy: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt?: Date;
}

export interface IPosition {
  title: string;
  description?: string;
  candidates: ICandidate[];
  maxSelections: number;
}

// Candidate interface
export interface ICandidate {
  user: mongoose.Types.ObjectId | IUser;
  approved: boolean;
  approvedBy?: mongoose.Types.ObjectId | IUser;
  approvedAt?: Date;
  manifesto?: string;
  nominatedAt: Date;
}

// Vote interface
export interface IVote {
  _id: string;
  election: mongoose.Types.ObjectId | IElection;
  voter: mongoose.Types.ObjectId | IUser;
  candidate: mongoose.Types.ObjectId | IUser;
  position: mongoose.Types.ObjectId | IPosition;
  timestamp: Date;
  ipAddress: string;
  clientHash: string;
}


// Define types for society members
export interface ISocietyMember {
  user: mongoose.Types.ObjectId;
  role: 'member' | 'lead' | 'coordinator';
  joinedAt: Date;
}

// Define interface for Society document
export interface ISociety extends Document {
  name: string;
  description?: string;
  category: 'cultural' | 'technical' | 'sports' | 'academic' | 'social' | 'other';
  logo?: string;
  members: ISocietyMember[];
  leads: mongoose.Types.ObjectId[];
  active: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt?: Date;
}


// Define interfaces for the schema
interface IResolution {
  comment?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
}

export interface IGrievance extends Document {
  title: string;
  description: string;
  election?: mongoose.Types.ObjectId;
  status: 'pending' | 'under-review' | 'resolved' | 'rejected';
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  assignedTo?: mongoose.Types.ObjectId;
  resolution?: IResolution;
}
