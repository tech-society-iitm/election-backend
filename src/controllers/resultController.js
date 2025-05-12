const Election = require('../models/electionModel');
const Vote = require('../models/voteModel');

// Get election results
exports.getElectionResults = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    // Check if election exists
    const election = await Election.findById(electionId);
    
    if (!election) {
      return res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
    }
    
    // Check if results should be visible
    const now = new Date();
    const votingEnd = new Date(election.votingEnd);
    
    // If election is not completed and current time is before voting end
    if (election.status !== 'completed' && now < votingEnd) {
      return res.status(403).json({
        status: 'fail',
        message: 'Results are not available until the election is completed'
      });
    }
    
    // Get all votes for this election
    const votes = await Vote.find({ election: electionId })
      .select('position candidate')
      .populate({
        path: 'candidate',
        select: 'name studentId'
      });
    
    // Structure results by position
    const results = {};
    
    // Initialize results object with positions from election
    election.positions.forEach(position => {
      results[position.title] = {
        candidates: [],
        totalVotes: 0
      };
      
      // Initialize candidates with zero votes
      position.candidates
        .filter(candidate => candidate.approved)
        .forEach(candidate => {
          results[position.title].candidates.push({
            candidate: {
              id: candidate.user._id,
              name: candidate.user.name,
              studentId: candidate.user.studentId
            },
            votes: 0
          });
        });
    });
    
    // Count votes for each candidate
    votes.forEach(vote => {
      const position = vote.position;
      const candidateId = vote.candidate._id.toString();
      
      if (results[position]) {
        results[position].totalVotes += 1;
        
        const candidateIndex = results[position].candidates.findIndex(
          c => c.candidate.id.toString() === candidateId
        );
        
        if (candidateIndex !== -1) {
          results[position].candidates[candidateIndex].votes += 1;
        }
      }
    });
    
    // Calculate percentage for each candidate
    Object.keys(results).forEach(position => {
      const totalVotes = results[position].totalVotes;
      
      results[position].candidates.forEach(candidate => {
        candidate.percentage = totalVotes > 0
          ? Math.round((candidate.votes / totalVotes) * 100)
          : 0;
      });
      
      // Sort candidates by votes (descending)
      results[position].candidates.sort((a, b) => b.votes - a.votes);
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        election: {
          id: election._id,
          title: election.title,
          type: election.type,
          status: election.status
        },
        results
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
