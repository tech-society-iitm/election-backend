import mongoose, { Schema, Model, Query } from 'mongoose';
import { IGrievance } from '../../types/interfaces';


// Create the schema
const grievanceSchema = new Schema<IGrievance>({
  title: {
    type: String,
    required: [true, 'A grievance must have a title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'A grievance must have a description'],
    trim: true
  },
  election: {
    type: Schema.Types.ObjectId,
    ref: 'Election'
  },
  status: {
    type: String,
    enum: ['pending', 'under-review', 'resolved', 'rejected'],
    default: 'pending'
  },
  submittedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A grievance must be submitted by a user']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: {
    comment: String,
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }
});

// Middleware to populate references when querying
grievanceSchema.pre<Query<any, IGrievance>>(/^find/, function(next) {
  this.populate({
    path: 'submittedBy',
    select: 'name email studentId'
  }).populate({
    path: 'assignedTo',
    select: 'name email'
  }).populate({
    path: 'resolution.resolvedBy',
    select: 'name email'
  });
  next();
});

// Create and export the model
const Grievance: Model<IGrievance> = mongoose.model<IGrievance>('Grievance', grievanceSchema);

export default Grievance;
