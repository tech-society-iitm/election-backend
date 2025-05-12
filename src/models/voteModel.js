const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.ObjectId,
    ref: 'Election',
    required: [true, 'A vote must be associated with an election']
  },
  position: {
    type: String,
    required: [true, 'A vote must be for a specific position']
  },
  candidate: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A vote must be for a candidate']
  },
  voter: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A vote must be cast by a voter']
  },
  castAt: {
    type: Date,
    default: Date.now
  },
  // Store a hash of IP + User Agent for fraud prevention
  clientHash: {
    type: String,
    select: false
  }
});

// Compound index to ensure a voter can only vote once for a position in an election
voteSchema.index({ election: 1, position: 1, voter: 1 }, { unique: true });

// Hide voter information in query results for ballot secrecy
voteSchema.pre(/^find/, function(next) {
  this.select('-voter -clientHash');
  next();
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
