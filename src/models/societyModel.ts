import mongoose, { Schema, Model } from 'mongoose';
import { ISociety } from '../../types/interfaces';


// Create the schema
const societySchema = new Schema<ISociety>({
  name: {
    type: String,
    required: [true, 'Society must have a name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['cultural', 'technical', 'sports', 'academic', 'social', 'other'],
    required: [true, 'Society must have a category']
  },
  logo: String,
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['member', 'lead', 'coordinator'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  leads: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A society must have a creator']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

// Create and export the model
const Society: Model<ISociety> = mongoose.model<ISociety>('Society', societySchema);

export default Society;
