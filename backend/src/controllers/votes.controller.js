import { Answer } from "../models/Answer.js";
import { Question } from "../models/Question.js";
import { Vote } from "../models/Vote.js";
import { ApiError } from "../utils/ApiError.js";

const targetModelMap = {
  question: Question,
  answer: Answer
};

export const castVote = async (req, res) => {
  const { targetType, targetId } = req.params;
  const { value } = req.body;
  let currentUserVote = value;

  const Model = targetModelMap[targetType];

  if (!Model) {
    throw new ApiError(400, "Invalid vote target type");
  }

  if (value !== -1 && value !== 1) {
    throw new ApiError(400, "Vote value must be -1 or 1.");
  }

  const target = await Model.findById(targetId);

  if (!target) {
    throw new ApiError(404, "Vote target not found.");
  }

  const existingVote = await Vote.findOne({
    targetType,
    targetId,
    userId: req.user.id
  });
  let currentVoteId = existingVote ? String(existingVote._id) : null;

  if (existingVote) {
    if (existingVote.value === value) {
      await existingVote.deleteOne();
      currentUserVote = 0;
      currentVoteId = null;
    } else {
      existingVote.value = value;
      await existingVote.save();
      currentUserVote = value;
      currentVoteId = String(existingVote._id);
    }
  } else {
    const createdVote = await Vote.create({
      targetType,
      targetId,
      userId: req.user.id,
      value
    });
    currentUserVote = value;
    currentVoteId = String(createdVote._id);
  }

  const votes = await Vote.find({ targetType, targetId });
  const rawVoteScore = votes.reduce((sum, vote) => sum + vote.value, 0);
  const voteScore = Math.max(rawVoteScore, 0);

  target.voteScore = voteScore;
  await target.save();

  const questionId =
    targetType === "question" ? String(target._id) : String(target.questionId);
  const answerId = targetType === "answer" ? String(target._id) : null;

  res.json({
    voteId: currentVoteId,
    targetId,
    targetType,
    questionId,
    answerId,
    postId: questionId,
    voteScore,
    currentUserVote
  });
};
