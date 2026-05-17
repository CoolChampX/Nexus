import { Comment } from "../models/Comment.js";
import { Answer } from "../models/Answer.js";
import { User } from "../models/User.js";
import { buildAvatarImageUrl, resolveAvatarColor } from "../utils/avatar.js";
import { ApiError } from "../utils/ApiError.js";
import { canModerateResource } from "../utils/permissions.js";
import { createCommentNotifications } from "../services/notification.service.js";

const buildCommentPayload = (comment, { author = null, questionId = null, answerId = null, postId = null } = {}) => ({
  ...comment,
  commentId: String(comment._id),
  targetId: String(comment.targetId),
  questionId,
  answerId,
  postId,
  authorId: author?.email || comment.authorId,
  author: author
    ? {
        id: author.userId,
        name: author.name,
        email: author.email,
        avatarImageUrl: buildAvatarImageUrl(author.name, author.avatarColor, author.avatarImageUrl),
        avatarColor: resolveAvatarColor(author.avatarColor)
      }
    : {
        id: comment.authorId,
        name: comment.authorId,
        email: "",
        avatarImageUrl: buildAvatarImageUrl(comment.authorId, "#F48024"),
        avatarColor: "#F48024"
      }
});

const hydrateComments = async (comments) => {
  const authorIds = [...new Set(comments.map((comment) => comment.authorId))];
  const answerTargetIds = [
    ...new Set(
      comments
        .filter((comment) => comment.targetType === "answer")
        .map((comment) => String(comment.targetId))
    )
  ];
  const authors = await User.find({ userId: { $in: authorIds } })
    .select("userId name email avatarImageUrl avatarColor")
    .lean();
  const linkedAnswers =
    answerTargetIds.length > 0
      ? await Answer.find({ _id: { $in: answerTargetIds } }).select("_id questionId").lean()
      : [];
  const authorsById = Object.fromEntries(authors.map((author) => [author.userId, author]));
  const answersById = Object.fromEntries(
    linkedAnswers.map((answer) => [String(answer._id), String(answer.questionId)])
  );

  return comments.map((comment) => {
    const targetId = String(comment.targetId);
    const questionId = comment.targetType === "question" ? targetId : answersById[targetId] || null;
    const answerId = comment.targetType === "answer" ? targetId : null;

    return buildCommentPayload(comment, {
      author: authorsById[comment.authorId] || null,
      questionId,
      answerId,
      postId: questionId
    });
  });
};

export const listComments = async (req, res) => {
  const comments = await Comment.find({
    targetType: req.params.targetType,
    targetId: req.params.targetId
  }).sort({ createdAt: 1 }).lean();

  res.json(await hydrateComments(comments));
};

export const createComment = async (req, res) => {
  const comment = await Comment.create({
    targetType: req.params.targetType,
    targetId: req.params.targetId,
    body: req.body.body,
    authorId: req.user.id
  });

  await createCommentNotifications({
    actorId: req.user.id,
    commentId: comment._id,
    targetType: comment.targetType,
    targetId: comment.targetId,
    body: comment.body
  });

  const [payload] = await hydrateComments([comment.toObject()]);

  res.status(201).json(payload);
};

export const deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found.");
  }

  if (!canModerateResource(req.user, comment.authorId)) {
    throw new ApiError(403, "You can only delete your own comments unless you are an admin.");
  }

  await comment.deleteOne();

  res.json({
    success: true,
    commentId: req.params.commentId
  });
};
