const Election = require('../models/electionModel');
const House = require('../models/houseModel');
const Society = require('../models/societyModel');
const User = require('../models/userModel');

// Check if user has ownership of an election
exports.checkElectionOwnership = async (req, res, next) => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;
    
    const election = await Election.findById(electionId);
    
    if (!election) {
      return res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
    }
    
    // Admin has access to all elections
    if (req.user.role === 'admin') {
      req.election = election;
      return next();
    }
    
    // Check if user is the creator of this election
    if (election.createdBy.toString() === userId) {
      req.election = election;
      return next();
    }
    
    // Check if user has role-based access to this election
    if (election.type === 'house' && req.user.role === 'house') {
      if (req.user.house && req.user.house.toString() === election.house.toString()) {
        req.election = election;
        return next();
      }
    }
    
    if (election.type === 'society' && req.user.role === 'society') {
      if (req.user.societies && req.user.societies.some(s => s.toString() === election.society.toString())) {
        req.election = election;
        return next();
      }
    }
    
    return res.status(403).json({
      status: 'fail',
      message: 'You do not have permission to modify this election'
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get all elections
exports.getAllElections = async (req, res) => {
  try {
    // Build query - filter by status if provided
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    let query = Election.find(filter)
      .populate({
        path: 'createdBy',
        select: 'name'
      });
      
    // If type is provided, filter by type
    if (req.query.type) {
      query = query.find({ type: req.query.type });
    }
    
    // If house is provided, filter by house
    if (req.query.house) {
      query = query.find({ house: req.query.house });
    }
    
    // If society is provided, filter by society
    if (req.query.society) {
      query = query.find({ society: req.query.society });
    }
    
    // Execute query
    const elections = await query;
    
    res.status(200).json({
      status: 'success',
      results: elections.length,
      data: {
        elections
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific election
exports.getElection = async (req, res) => {
  try {
    const election = await Election.findById(req.params.id)
      .populate({
        path: 'createdBy',
        select: 'name email'
      })
      .populate({
        path: 'house',
        select: 'name'
      })
      .populate({
        path: 'society',
        select: 'name'
      });
    
    if (!election) {
      return res.status(404).json({
        status: 'fail',
        message: 'No election found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Create a new election
exports.createElection = async (req, res) => {
  try {
    // Add the creator to the request body
    req.body.createdBy = req.user.id;
    
    // Validate election type specific fields
    if (req.body.type === 'house' && !req.body.house) {
      return res.status(400).json({
        status: 'fail',
        message: 'House elections must specify a house'
      });
    }
    
    if (req.body.type === 'society' && !req.body.society) {
      return res.status(400).json({
        status: 'fail',
        message: 'Society elections must specify a society'
      });
    }
    
    // If user is not admin, verify they have access to create this type of election
    if (req.user.role !== 'admin') {
      if (req.body.type === 'house' && req.user.role === 'house') {
        // Verify user belongs to this house
        if (!req.user.house || req.user.house.toString() !== req.body.house) {
          return res.status(403).json({
            status: 'fail',
            message: 'You can only create elections for your own house'
          });
        }
      } else if (req.body.type === 'society' && req.user.role === 'society') {
        // Verify user is associated with this society
        if (!req.user.societies || !req.user.societies.includes(req.body.society)) {
          return res.status(403).json({
            status: 'fail',
            message: 'You can only create elections for societies you are a lead of'
          });
        }
      } else if (req.body.type === 'university') {
        return res.status(403).json({
          status: 'fail',
          message: 'Only administrators can create university-wide elections'
        });
      }
    }
    
    const newElection = await Election.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        election: newElection
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Submit a nomination for an election
exports.submitNomination = async (req, res) => {
  try {
    const { id } = req.params;
    const { position, manifesto } = req.body;
    
    if (!position) {
      return res.status(400).json({
        status: 'fail',
        message: 'Position is required'
      });
    }
    
    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
    }
    
    // Check if election is in nomination period
    const now = new Date();
    if (now < new Date(election.nominationStart) || now > new Date(election.nominationEnd)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Nomination period is not active'
      });
    }
    
    // Find position in election
    const positionIndex = election.positions.findIndex(p => p.title === position);
    
    if (positionIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Position not found in this election'
      });
    }
    
    // Check if user has already nominated themselves for this position
    const alreadyNominated = election.positions[positionIndex].candidates.some(
      c => c.user.toString() === req.user.id
    );
    
    if (alreadyNominated) {
      return res.status(400).json({
        status: 'fail',
        message: 'You have already nominated yourself for this position'
      });
    }
    
    // Add nomination
    election.positions[positionIndex].candidates.push({
      user: req.user.id,
      approved: false,
      manifesto: manifesto || ''
    });
    
    await election.save();
    
    res.status(201).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Approve a nomination
exports.approveNomination = async (req, res) => {
  try {
    const { id } = req.params;
    const { position, candidateId } = req.body;
    
    if (!position || !candidateId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Position and candidateId are required'
      });
    }
    
    const election = await Election.findById(id);
    
    if (!election) {
      return res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
    }
    
    // Find position in election
    const positionIndex = election.positions.findIndex(p => p.title === position);
    
    if (positionIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Position not found in this election'
      });
    }
    
    // Find candidate in position
    const candidateIndex = election.positions[positionIndex].candidates.findIndex(
      c => c.user.toString() === candidateId
    );
    
    if (candidateIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Candidate not found for this position'
      });
    }
    
    // Approve nomination
    election.positions[positionIndex].candidates[candidateIndex].approved = true;
    election.positions[positionIndex].candidates[candidateIndex].approvedBy = req.user.id;
    election.positions[positionIndex].candidates[candidateIndex].approvedAt = Date.now();
    
    await election.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update an election
exports.updateElection = async (req, res) => {
  try {
    // election is already available from checkElectionOwnership middleware
    const election = req.election;
    
    // Don't allow status updates if the election is already completed
    if (election.status === 'completed' && req.body.status) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot update a completed election'
      });
    }
    
    // Update election properties
    const updatedElection = await Election.findByIdAndUpdate(
      election._id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        election: updatedElection
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Delete an election
exports.deleteElection = async (req, res) => {
  try {
    // election is already available from checkElectionOwnership middleware
    const election = req.election;
    
    // Don't allow deleting an active or completed election
    if (['active', 'completed'].includes(election.status)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot delete an active or completed election'
      });
    }
    
    await Election.findByIdAndDelete(election._id);
    
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

// Add a position to an election
exports.addPosition = async (req, res) => {
  try {
    // election is already available from checkElectionOwnership middleware
    const election = req.election;
    
    // Don't allow adding positions if the election is not in draft status
    if (election.status !== 'draft') {
      return res.status(400).json({
        status: 'fail',
        message: 'Can only add positions to elections in draft status'
      });
    }
    
    const { title, description } = req.body;
    
    if (!title) {
      return res.status(400).json({
        status: 'fail',
        message: 'Position title is required'
      });
    }
    
    // Check if position already exists
    const positionExists = election.positions.some(p => p.title === title);
    
    if (positionExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'A position with this title already exists'
      });
    }
    
    // Add new position
    election.positions.push({
      title,
      description: description || '',
      candidates: []
    });
    
    await election.save();
    
    res.status(201).json({
      status: 'success',
      data: {
        election
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
