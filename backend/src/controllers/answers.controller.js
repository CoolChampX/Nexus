import { Answer } from "../models/Answer.js";
import { Comment } from "../models/Comment.js";
import { Vote } from "../models/Vote.js";
import { User } from "../models/User.js";
import { buildAvatarImageUrl, resolveAvatarColor } from "../utils/avatar.js";
import { ApiError } from "../utils/ApiError.js";
import {
  createAnswerNotifications,
  deleteNotificationsForAnswer
} from "../services/notification.service.js";

const buildAnswerPayload = (answer, { author = null, currentUserVote = 0 } = {}) => ({
  ...answer,
  answerId: String(answer._id),
  questionId: String(answer.questionId),
  authorId: author?.email || answer.authorId,
  currentUserVote,
  author: author
    ? {
        id: author.userId,
        name: author.name,
        email: author.email,
        avatarImageUrl: buildAvatarImageUrl(author.name, author.avatarColor, author.avatarImageUrl),
        avatarColor: resolveAvatarColor(author.avatarColor)
      }
    : {
        id: answer.authorId,
        name: answer.authorId,
        email: "",
        avatarImageUrl: buildAvatarImageUrl(answer.authorId, "#F48024"),
        avatarColor: "#F48024"
      }
});

const hydrateAnswers = async (answers, currentUserId = null) => {
  const authorIds = [...new Set(answers.map((answer) => answer.authorId))];
  const answerIds = answers.map((answer) => answer._id);
  const [authors, currentUserVotes] = await Promise.all([
    User.find({ userId: { $in: authorIds } })
      .select("userId name email avatarImageUrl avatarColor")
      .lean(),
    currentUserId
      ? Vote.find({
          targetType: "answer",
          targetId: { $in: answerIds },
          userId: currentUserId
        })
          .select("targetId value")
          .lean()
      : []
  ]);
  const authorsById = Object.fromEntries(authors.map((author) => [author.userId, author]));
  const currentUserVoteByAnswerId = Object.fromEntries(
    currentUserVotes.map((vote) => [String(vote.targetId), vote.value])
  );

  return answers.map((answer) =>
    buildAnswerPayload(answer, {
      author: authorsById[answer.authorId] || null,
      currentUserVote: currentUserVoteByAnswerId[String(answer._id)] || 0
    })
  );
};

export const listAnswers = async (req, res) => {
  const answers = await Answer.find({ questionId: req.params.questionId }).sort({
    voteScore: -1,
    createdAt: 1
  }).lean();

  res.json(await hydrateAnswers(answers, req.user?.id || null));
};

export const createAnswer = async (req, res) => {
  const answer = await Answer.create({
    questionId: req.params.questionId,
    body: req.body.body,
    codeSnippet: req.body.codeSnippet || "",
    authorId: req.user.id
  });

  await createAnswerNotifications({
    actorId: req.user.id,
    answerId: answer._id,
    questionId: answer.questionId,
    body: answer.body
  });

  const [payload] = await hydrateAnswers([answer.toObject()], req.user.id);

  res.status(201).json(payload);
};

export const deleteAnswer = async (req, res) => {
  const answer = await Answer.findById(req.params.answerId);

  if (!answer) {
    throw new ApiError(404, "Answer not found");
  }

  if (answer.authorId !== req.user.id) {
    throw new ApiError(403, "You can only delete your own answers.");
  }

  await Promise.all([
    Comment.deleteMany({ targetType: "answer", targetId: answer._id }),
    Vote.deleteMany({ targetType: "answer", targetId: answer._id }),
    deleteNotificationsForAnswer(answer._id),
    answer.deleteOne()
  ]);

  res.json({ success: true, answerId: req.params.answerId, questionId: String(answer.questionId) });
};
