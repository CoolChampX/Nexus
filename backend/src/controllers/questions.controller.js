import { Question } from "../models/Question.js";
import { Answer } from "../models/Answer.js";
import { Comment } from "../models/Comment.js";
import { Vote } from "../models/Vote.js";
import { User } from "../models/User.js";
import { buildAvatarImageUrl, resolveAvatarColor } from "../utils/avatar.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteNotificationsForQuestion } from "../services/notification.service.js";

const buildQuestionPayload = (question, { answerCount = 0, author = null, currentUserVote = 0 } = {}) => ({
  ...question,
  questionId: String(question._id),
  postId: String(question._id),
  authorId: author?.email || question.authorId,
  answerCount,
  author: author
    ? {
        id: author.userId,
        name: author.name,
        email: author.email,
        avatarImageUrl: buildAvatarImageUrl(author.name, author.avatarColor, author.avatarImageUrl),
        avatarColor: resolveAvatarColor(author.avatarColor)
      }
    : {
        id: question.authorId,
        name: question.authorId,
        email: "",
        avatarImageUrl: buildAvatarImageUrl(question.authorId, "#F48024"),
        avatarColor: "#F48024"
      },
  currentUserVote
});

const hydrateQuestions = async (questions, currentUserId) => {
  const questionIds = questions.map((question) => question._id);
  const authorIds = [...new Set(questions.map((question) => question.authorId))];

  const [authors, answerCounts, currentUserVotes] = await Promise.all([
    User.find({ userId: { $in: authorIds } })
      .select("userId name email avatarImageUrl avatarColor")
      .lean(),
    Answer.aggregate([
      { $match: { questionId: { $in: questionIds } } },
      { $group: { _id: "$questionId", count: { $sum: 1 } } }
    ]),
    currentUserId
      ? Vote.find({
          targetType: "question",
          targetId: { $in: questionIds },
          userId: currentUserId
        })
          .select("targetId value")
          .lean()
      : []
  ]);

  const authorsById = Object.fromEntries(authors.map((author) => [author.userId, author]));
  const answerCountByQuestionId = Object.fromEntries(
    answerCounts.map((item) => [String(item._id), item.count])
  );
  const currentUserVoteByQuestionId = Object.fromEntries(
    currentUserVotes.map((vote) => [String(vote.targetId), vote.value])
  );

  return questions.map((question) =>
    buildQuestionPayload(question, {
      answerCount: answerCountByQuestionId[String(question._id)] || 0,
      author: authorsById[question.authorId] || null,
      currentUserVote: currentUserVoteByQuestionId[String(question._id)] || 0
    })
  );
};

export const listQuestions = async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 }).limit(50).lean();
  const payload = await hydrateQuestions(questions, req.header("x-user-id"));
  res.json(payload);
};

export const createQuestion = async (req, res) => {
  const question = await Question.create({
    ...req.body,
    authorId: req.user.id
  });

  const [payload] = await hydrateQuestions([question.toObject()], req.user.id);

  res.status(201).json(payload);
};

export const getQuestionById = async (req, res) => {
  const question = await Question.findById(req.params.questionId).lean();

  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  const [payload] = await hydrateQuestions([question], req.header("x-user-id"));

  res.json(payload);
};

export const deleteQuestion = async (req, res) => {
  const question = await Question.findById(req.params.questionId);

  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  if (question.authorId !== req.user.id) {
    throw new ApiError(403, "You can only delete your own questions.");
  }

  const answers = await Answer.find({ questionId: question._id }).select("_id").lean();
  const answerIds = answers.map((answer) => answer._id);

  await Promise.all([
    Answer.deleteMany({ questionId: question._id }),
    Comment.deleteMany({
      $or: [
        { targetType: "question", targetId: question._id },
        ...(answerIds.length
          ? [{ targetType: "answer", targetId: { $in: answerIds } }]
          : [])
      ]
    }),
    Vote.deleteMany({
      $or: [
        { targetType: "question", targetId: question._id },
        ...(answerIds.length ? [{ targetType: "answer", targetId: { $in: answerIds } }] : [])
      ]
    }),
    deleteNotificationsForQuestion(question._id),
    question.deleteOne()
  ]);

  res.json({ success: true, questionId: req.params.questionId });
};
