import { Answer } from "../models/Answer.js";
import { Comment } from "../models/Comment.js";
import { Vote } from "../models/Vote.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import {
  createAnswerNotifications,
  deleteNotificationsForAnswer
} from "../services/notification.service.js";

const buildAnswerPayload = (answer, author = null) => ({
  ...answer,
  answerId: String(answer._id),
  questionId: String(answer.questionId),
  authorId: author?.email || answer.authorId,
  author: author
    ? {
        id: author.userId,
        name: author.name,
        email: author.email,
        avatarImageUrl: author.avatarImageUrl,
        avatarColor: author.avatarColor
      }
    : {
        id: answer.authorId,
        name: answer.authorId,
        email: "",
        avatarImageUrl: "",
        avatarColor: "#F48024"
      }
});

const hydrateAnswers = async (answers) => {
  const authorIds = [...new Set(answers.map((answer) => answer.authorId))];
  const authors = await User.find({ userId: { $in: authorIds } })
    .select("userId name email avatarImageUrl avatarColor")
    .lean();
  const authorsById = Object.fromEntries(authors.map((author) => [author.userId, author]));

  return answers.map((answer) => buildAnswerPayload(answer, authorsById[answer.authorId] || null));
};

export const listAnswers = async (req, res) => {
  const answers = await Answer.find({ questionId: req.params.questionId }).sort({
    voteScore: -1,
    createdAt: 1
  }).lean();

  res.json(await hydrateAnswers(answers));
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

  const [payload] = await hydrateAnswers([answer.toObject()]);

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
