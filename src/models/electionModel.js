const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
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
    type: mongoose.Schema.ObjectId,
    ref: 'House',
    required: function() { return this.type === 'house'; }
  },
  society: {
    type: mongoose.Schema.ObjectId,
    ref: 'Society',
    required: function() { return this.type === 'society'; }
  },
  positions: [{
    title: {
      type: String,
      required: [true, 'A position must have a title']
    },
    description: String,
    candidates: [{
      user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'A candidate must be associated with a user']
      },
      approved: {
        type: Boolean,
        default: false
      },
      approvedBy: {
        type: mongoose.Schema.ObjectId,
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
    type: mongoose.Schema.ObjectId,
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
electionSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'positions.candidates.user',
    select: 'name email studentId'
  });
  next();
});

const Election = mongoose.model('Election', electionSchema);

module.exports = Election;
