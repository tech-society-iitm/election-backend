const House = require('../models/houseModel');
const User = require('../models/userModel');

// Get all houses
exports.getAllHouses = async (req, res) => {
  try {
    const houses = await House.find()
      .populate({
        path: 'secretaries',
        select: 'name email'
      })
      .populate({
        path: 'members',
        select: 'name email studentId'
      });
    
    res.status(200).json({
      status: 'success',
      results: houses.length,
      data: {
        houses
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific house
exports.getHouse = async (req, res) => {
  try {
    const house = await House.findById(req.params.id)
      .populate({
        path: 'secretaries',
        select: 'name email'
      })
      .populate({
        path: 'members',
        select: 'name email studentId'
      });
    
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new house
exports.createHouse = async (req, res) => {
  try {
    // Add the creator to the request body
    req.body.createdBy = req.user.id;
    
    const newHouse = await House.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        house: newHouse
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a house
exports.updateHouse = async (req, res) => {
  try {
    // Set the update timestamp
    req.body.updatedAt = Date.now();
    
    const house = await House.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a house
exports.deleteHouse = async (req, res) => {
  try {
    const house = await House.findByIdAndDelete(req.params.id);
    
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
    }
    
    // Remove house reference from all users
    await User.updateMany(
      { house: req.params.id },
      { $unset: { house: 1 } }
    );
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Add members to a house
exports.addMembers = async (req, res) => {
  try {
    const { members } = req.body;
    
    if (!members || !Array.isArray(members)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide an array of member IDs'
      });
    }
    
    const house = await House.findById(req.params.id);
    
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
    }
    
    for (const userId of members) {
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'fail',
          message: `User with ID ${userId} not found`
        });
      }
      
      // Check if user is already a member
      if (!house.members.includes(userId)) {
        house.members.push(userId);
      }
      
      // Update user's house
      await User.findByIdAndUpdate(userId, { house: house._id });
    }
    
    await house.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Remove a member from a house
exports.removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const house = await House.findById(id);
    
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: 'No house found with that ID'
      });
    }
    
    // Remove user from members
    house.members = house.members.filter(
      member => member.toString() !== userId
    );
    
    // Remove user from secretaries
    house.secretaries = house.secretaries.filter(
      secretary => secretary.toString() !== userId
    );
    
    await house.save();
    
    // Remove house reference from user
    await User.findByIdAndUpdate(userId, {
      $unset: { house: 1 }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        house
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
