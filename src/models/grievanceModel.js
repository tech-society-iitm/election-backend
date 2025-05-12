const mongoose = require('mongoose');

const grievanceSchema = new mongoose.Schema({
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
    type: mongoose.Schema.ObjectId,
    ref: 'Election'
  },
  status: {
    type: String,
    enum: ['pending', 'under-review', 'resolved', 'rejected'],
    default: 'pending'
  },
  submittedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A grievance must be submitted by a user']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  assignedTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  resolution: {
    comment: String,
    resolvedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }
});

// Middleware to populate references when querying
grievanceSchema.pre(/^find/, function(next) {
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

const Grievance = mongoose.model('Grievance', grievanceSchema);

module.exports = Grievance;
