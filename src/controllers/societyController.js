const Society = require('../models/societyModel');
const User = require('../models/userModel');

// Check if user has access to modify a society
exports.checkSocietyAccess = async (req, res, next) => {
  try {
    const societyId = req.params.id;
    const userId = req.user.id;
    
    // Admin has access to all societies
    if (req.user.role === 'admin') {
      return next();
    }
    
    const society = await Society.findById(societyId);
    
    if (!society) {
      return res.status(404).json({
        status: 'fail',
        message: 'Society not found'
      });
    }
    
    // Check if user is a lead of this society
    const isLead = society.leads.some(lead => lead.toString() === userId);
    
    if (!isLead && req.user.role !== 'society') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to modify this society'
      });
    }
    
    // Store society for next middleware
    req.society = society;
    next();
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all societies
exports.getAllSocieties = async (req, res) => {
  try {
    const societies = await Society.find()
      .populate({
        path: 'leads',
        select: 'name email'
      })
      .populate({
        path: 'members.user',
        select: 'name email studentId'
      });
    
    res.status(200).json({
      status: 'success',
      results: societies.length,
      data: {
        societies
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific society
exports.getSociety = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id)
      .populate({
        path: 'leads',
        select: 'name email'
      })
      .populate({
        path: 'members.user',
        select: 'name email studentId'
      });
    
    if (!society) {
      return res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new society
exports.createSociety = async (req, res) => {
  try {
    // Add the creator to the request body
    req.body.createdBy = req.user.id;
    
    // If leads aren't specified, make the creator a lead
    if (!req.body.leads || req.body.leads.length === 0) {
      req.body.leads = [req.user.id];
    }
    
    // Create the society
    const newSociety = await Society.create(req.body);
    
    // Add user to society's member list if not already there
    if (!newSociety.members.some(member => member.user.toString() === req.user.id)) {
      newSociety.members.push({
        user: req.user.id,
        role: 'lead',
        joinedAt: Date.now()
      });
      await newSociety.save();
    }
    
    // Update the user to include this society
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { societies: newSociety._id }
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        society: newSociety
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a society
exports.updateSociety = async (req, res) => {
  try {
    // Set the update timestamp
    req.body.updatedAt = Date.now();
    
    const society = await Society.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!society) {
      return res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete a society
exports.deleteSociety = async (req, res) => {
  try {
    const society = await Society.findByIdAndDelete(req.params.id);
    
    if (!society) {
      return res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
    }
    
    // Remove society reference from all users
    await User.updateMany(
      { societies: req.params.id },
      { $pull: { societies: req.params.id } }
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

// Add members to a society
exports.addMembers = async (req, res) => {
  try {
    const { members } = req.body;
    
    if (!members || !Array.isArray(members)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide an array of member IDs'
      });
    }
    
    const society = await Society.findById(req.params.id);
    
    if (!society) {
      return res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
    }
    
    // Process each member
    for (const memberData of members) {
      const { userId, role = 'member' } = memberData;
      
      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          status: 'fail',
          message: `User with ID ${userId} not found`
        });
      }
      
      // Check if user is already a member
      const existingMember = society.members.find(
        m => m.user.toString() === userId
      );
      
      if (existingMember) {
        // Update role if different
        if (existingMember.role !== role) {
          existingMember.role = role;
        }
      } else {
        // Add as new member
        society.members.push({
          user: userId,
          role,
          joinedAt: Date.now()
        });
        
        // Update user's societies list
        await User.findByIdAndUpdate(userId, {
          $addToSet: { societies: society._id }
        });
      }
      
      // Update leads list if role is lead
      if (role === 'lead') {
        if (!society.leads.includes(userId)) {
          society.leads.push(userId);
        }
      } else {
        // Remove from leads if role is not lead
        society.leads = society.leads.filter(lead => lead.toString() !== userId);
      }
    }
    
    await society.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Remove a member from a society
exports.removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const society = await Society.findById(id);
    
    if (!society) {
      return res.status(404).json({
        status: 'fail',
        message: 'No society found with that ID'
      });
    }
    
    // Remove user from members
    society.members = society.members.filter(
      member => member.user.toString() !== userId
    );
    
    // Remove user from leads
    society.leads = society.leads.filter(lead => lead.toString() !== userId);
    
    await society.save();
    
    // Remove society reference from user
    await User.findByIdAndUpdate(userId, {
      $pull: { societies: society._id }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        society
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
