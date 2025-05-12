const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'House must have a name'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#000000'
  },
  logo: String,
  members: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  secretaries: [{
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
    required: [true, 'A house must have a creator']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});

const House = mongoose.model('House', houseSchema);

module.exports = House;
