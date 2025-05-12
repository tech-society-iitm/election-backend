const Grievance = require('../models/grievanceModel');

// Check if user has access to a grievance
exports.checkGrievanceAccess = async (req, res, next) => {
  try {
    const grievanceId = req.params.id;
    const userId = req.user.id;
    
    const grievance = await Grievance.findById(grievanceId);
    
    if (!grievance) {
      return res.status(404).json({
        status: 'fail',
        message: 'Grievance not found'
      });
    }
    
    // Admin has access to all grievances
    if (req.user.role === 'admin') {
      req.grievance = grievance;
      return next();
    }
    
    // Check if user is the submitter of this grievance
    if (grievance.submittedBy._id.toString() !== userId) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this grievance'
      });
    }
    
    // Store grievance for next middleware
    req.grievance = grievance;
    next();
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get user's grievances
exports.getMyGrievances = async (req, res) => {
  try {
    const grievances = await Grievance.find({ submittedBy: req.user.id });
    
    res.status(200).json({
      status: 'success',
      results: grievances.length,
      data: {
        grievances
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Submit a new grievance
exports.submitGrievance = async (req, res) => {
  try {
    // Add submitter to request body
    req.body.submittedBy = req.user.id;
    
    const newGrievance = await Grievance.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        grievance: newGrievance
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get a specific grievance
exports.getGrievance = async (req, res) => {
  try {
    // grievance is already available from checkGrievanceAccess middleware
    const grievance = req.grievance;
    
    res.status(200).json({
      status: 'success',
      data: {
        grievance
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// ADMIN HANDLERS

// Get all grievances
exports.getAllGrievances = async (req, res) => {
  try {
    const grievances = await Grievance.find();
    
    res.status(200).json({
      status: 'success',
      results: grievances.length,
      data: {
        grievances
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Update a grievance status
exports.updateGrievanceStatus = async (req, res) => {
  try {
    const { status, assignedTo } = req.body;
    
    if (!['pending', 'under-review', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid status value'
      });
    }
    
    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      { status, assignedTo },
      { new: true, runValidators: true }
    );
    
    if (!grievance) {
      return res.status(404).json({
        status: 'fail',
        message: 'No grievance found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        grievance
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Resolve a grievance
exports.resolveGrievance = async (req, res) => {
  try {
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({
        status: 'fail',
        message: 'Resolution comment is required'
      });
    }
    
    const grievance = await Grievance.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        resolution: {
          comment,
          resolvedBy: req.user.id,
          resolvedAt: Date.now()
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!grievance) {
      return res.status(404).json({
        status: 'fail',
        message: 'No grievance found with that ID'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        grievance
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
