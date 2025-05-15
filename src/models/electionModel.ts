import mongoose, { Document, Schema, Model, Query } from 'mongoose';
import { IUser, IElection, ICandidate, IPosition } from '../../types/interfaces'; // Adjust the path as needed

// Create the schema
const electionSchema = new Schema<IElection>({
  title: {
    type: String,
    required: [true, 'An election must have a title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'An election must have a type'],
    enum: ['university', 'house', 'society']
  },
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  house: {
    type: Schema.Types.ObjectId,
    ref: 'House',
    required: function(this: IElection) { return this.type === 'house'; }
  },
  society: {
    type: Schema.Types.ObjectId,
    ref: 'Society',
    required: function(this: IElection) { return this.type === 'society'; }
  },
  positions: [{
    title: {
      type: String,
      required: [true, 'A position must have a title']
    },
    description: String,
    candidates: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'A candidate must be associated with a user']
      },
      approved: {
        type: Boolean,
        default: false
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: Date,
      manifesto: String,
      nominatedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  nominationStart: {
    type: Date,
    required: [true, 'An election must have a nomination start date']
  },
  nominationEnd: {
    type: Date,
    required: [true, 'An election must have a nomination end date']
  },
  votingStart: {
    type: Date,
    required: [true, 'An election must have a voting start date']
  },
  votingEnd: {
    type: Date,
    required: [true, 'An election must have a voting end date']
  },
  resultsReleasedAt: Date,
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'An election must be created by a user']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

// Middleware to populate references when querying
electionSchema.pre<Query<any, IElection>>(/^find/, function(next) {
  this.populate({
    path: 'positions.candidates.user',
    select: 'name email studentId'
  });
  next();
});

// Create and export the model
const Election: Model<IElection> = mongoose.model<IElection>('Election', electionSchema);

export default Election;
