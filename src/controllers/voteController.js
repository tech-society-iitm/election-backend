const Vote = require('../models/voteModel');
const Election = require('../models/electionModel');
const crypto = require('crypto');

// Helper to generate client hash for fraud prevention
const generateClientHash = (req) => {
  const data = `${req.ip}-${req.headers['user-agent']}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Cast a vote in an election
exports.castVote = async (req, res) => {
  try {
    const { electionId } = req.params;
    const { position, candidate } = req.body;
    
    // Check if the election exists and is active
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
    }
    
    if (election.status !== 'active') {
      return res.status(400).json({
        status: 'fail',
        message: 'Voting is not currently active for this election'
      });
    }
    
    const now = new Date();
    if (now < new Date(election.votingStart) || now > new Date(election.votingEnd)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Voting period is not active'
      });
    }
    
    // Check if the position exists in this election
    const positionExists = election.positions.some(p => p.title === position);
    if (!positionExists) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid position'
      });
    }
    
    // Check if the candidate is valid for this position
    const positionObj = election.positions.find(p => p.title === position);
    const candidateValid = positionObj.candidates.some(c => 
      c.user._id.toString() === candidate && c.approved
    );
    
    if (!candidateValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid or unapproved candidate'
      });
    }
    
    // Create vote with client hash for fraud prevention
    const vote = await Vote.create({
      election: electionId,
      position,
      candidate,
      voter: req.user._id,
      clientHash: generateClientHash(req)
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        vote
      }
    });
  } catch (err) {
    // If error is a duplicate key error, user has already voted
    if (err.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'You have already voted for this position in this election'
      });
    }
    
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};

// Get user's voting history
exports.getMyVotes = async (req, res) => {
  try {
    const votes = await Vote.find({ voter: req.user._id })
      .populate({
        path: 'election',
        select: 'title type status'
      })
      .populate({
        path: 'candidate',
        select: 'name'
      });
    
    res.status(200).json({
      status: 'success',
      results: votes.length,
      data: {
        votes
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
