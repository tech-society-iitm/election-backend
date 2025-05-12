const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
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
      type: mongoose.Schema.ObjectId,
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
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  active: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A society must have a creator']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

const Society = mongoose.model('Society', societySchema);

module.exports = Society;
