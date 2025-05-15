import { Request, Response } from 'express';
import Election from '../models/electionModel';
import Vote from '../models/voteModel';
import { IElection, IPosition } from '../../types/interfaces';
import mongoose from 'mongoose';

// Define interfaces for the results structure
interface CandidateResult {
  candidate: {
    id: string;
    name: string;
    studentId: string;
  };
  votes: number;
  percentage?: number;
}

interface PositionResult {
  candidates: CandidateResult[];
  totalVotes: number;
}

interface ElectionResults {
  [position: string]: PositionResult;
}

// Get election results
export const getElectionResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { electionId } = req.params;

    // Check if election exists
    const election = await Election.findById(electionId) as IElection | null;

    if (!election) {
      res.status(404).json({
        status: 'fail',
        message: 'Election not found'
      });
      return;
    }

    // Check if results should be visible
    const now = new Date();
    const votingEnd = new Date(election.votingEnd);

    // If election is not completed and current time is before voting end
    if (election.status !== 'completed' && now < votingEnd) {
      res.status(403).json({
        status: 'fail',
        message: 'Results are not available until the election is completed'
      });
      return;
    }

    // Get all votes for this election
    const votes = await Vote.find({ election: electionId })
      .select('position candidate')
      .populate({
        path: 'candidate',
        select: 'name studentId'
      });

    // Structure results by position
    const results: ElectionResults = {};

    // Initialize results object with positions from election
    election.positions.forEach((position: IPosition) => {
      results[position.title] = {
        candidates: [],
        totalVotes: 0
      };

      // Initialize candidates with zero votes
      position.candidates
        .filter(candidate => candidate.approved)
        .forEach(candidate => {
          const user = candidate.user as any; // Cast to any since we're accessing properties dynamically
          results[position.title].candidates.push({
            candidate: {
              id: user._id,
              name: user.name,
              studentId: user.studentId
            },
            votes: 0
          });
        });
    });

    // Count votes for each candidate
    // votes.forEach(vote => {
    //   const position = vote.position;
    //   const candidateId = (vote.candidate as any)._id.toString();

    //   if (results[position]) {
    //     results[position].totalVotes += 1;

    //     const candidateIndex = results[position].candidates.findIndex(
    //       c => c.candidate.id.toString() === candidateId
    //     );

    //     if (candidateIndex !== -1) {
    //       results[position].candidates[candidateIndex].votes += 1;
    //     }
    //   }
    // });

    votes.forEach((vote: any) => {
      // Extract the position title from the position object or string
      let positionTitle: string;

      if (typeof vote.position === 'string') {
        positionTitle = vote.position;
      } else if (vote.position && typeof vote.position === 'object') {
        // If position is an object (IPosition), get its title
        positionTitle = vote.position.title;
      } else if (vote.position instanceof mongoose.Types.ObjectId) {
        // If it's an ObjectId, convert to string for lookup
        positionTitle = vote.position.toString();
      } else {
        // Skip this vote if position is invalid
        return;
      }

      const candidateId = vote.candidate._id.toString();

      if (results[positionTitle]) {
        results[positionTitle].totalVotes += 1;

        const candidateIndex = results[positionTitle].candidates.findIndex(
          c => c.candidate.id.toString() === candidateId
        );

        if (candidateIndex !== -1) {
          results[positionTitle].candidates[candidateIndex].votes += 1;
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
  } catch (err: any) {
    res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
};
