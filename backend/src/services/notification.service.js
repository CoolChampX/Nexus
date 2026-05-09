import { Answer } from "../models/Answer.js";
import { Comment } from "../models/Comment.js";
import { Notification } from "../models/Notification.js";
import { Question } from "../models/Question.js";
import { User } from "../models/User.js";
import { buildAvatarImageUrl, resolveAvatarColor } from "../utils/avatar.js";

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const HANDLE_REGEX = /@([a-z0-9._-]+)/gi;

const createPreview = (value = "", maxLength = 160) => {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const resolveMentionRecipients = async (body, actorId) => {
  const emailMatches = unique((body.match(EMAIL_REGEX) || []).map((item) => item.toLowerCase()));
  const handleMatches = unique(
    [...body.matchAll(HANDLE_REGEX)].map((match) => match[1]?.trim().toLowerCase())
  );

  if (emailMatches.length === 0 && handleMatches.length === 0) {
    return [];
  }

  const users = await User.find({
    $or: [
      ...(emailMatches.length ? [{ email: { $in: emailMatches } }] : []),
      ...(handleMatches.length ? [{ userId: { $in: handleMatches } }] : [])
    ]
  })
    .select("userId email")
    .lean();

  return users
    .filter((user) => user.userId !== actorId)
    .filter((user) => {
      const localPart = user.email.split("@")[0]?.toLowerCase();

      return (
        emailMatches.includes(user.email.toLowerCase()) ||
        handleMatches.includes(user.userId.toLowerCase()) ||
        (localPart ? handleMatches.includes(localPart) : false)
      );
    })
    .map((user) => user.userId);
};

const createNotifications = async (notifications) => {
  const payload = notifications.filter((item) => item.userId && item.userId !== item.actorId);

  if (!payload.length) {
    return;
  }

  await Notification.insertMany(payload, { ordered: false });
};

export const createAnswerNotifications = async ({ actorId, answerId, questionId, body }) => {
  const question = await Question.findById(questionId).select("authorId title").lean();

  if (!question) {
    return;
  }

  await createNotifications([
    {
      userId: question.authorId,
      actorId,
      type: "answer",
      targetType: "answer",
      questionId,
      answerId,
      questionTitle: question.title || "",
      bodyPreview: createPreview(body)
    }
  ]);
};

export const createCommentNotifications = async ({ actorId, commentId, targetType, targetId, body }) => {
  let recipientId = "";
  let questionId = null;
  let answerId = null;
  let questionTitle = "";

  if (targetType === "question") {
    const question = await Question.findById(targetId).select("authorId title").lean();

    if (!question) {
      return;
    }

    recipientId = question.authorId;
    questionId = question._id;
    questionTitle = question.title || "";
  } else {
    const answer = await Answer.findById(targetId).select("authorId questionId").lean();

    if (!answer) {
      return;
    }

    const question = await Question.findById(answer.questionId).select("title").lean();

    recipientId = answer.authorId;
    questionId = answer.questionId;
    answerId = answer._id;
    questionTitle = question?.title || "";
  }

  const mentionRecipients = await resolveMentionRecipients(body, actorId);
  const baseNotification = {
    actorId,
    questionId,
    answerId,
    commentId,
    questionTitle,
    bodyPreview: createPreview(body)
  };

  const notifications = [];

  if (recipientId && !mentionRecipients.includes(recipientId)) {
    notifications.push({
      ...baseNotification,
      userId: recipientId,
      type: "comment",
      targetType: "comment"
    });
  }

  for (const userId of mentionRecipients) {
    notifications.push({
      ...baseNotification,
      userId,
      type: "mention",
      targetType: "comment"
    });
  }

  await createNotifications(notifications);
};

export const deleteNotificationsForQuestion = async (questionId) => {
  await Notification.deleteMany({ questionId });
};

export const deleteNotificationsForAnswer = async (answerId) => {
  await Notification.deleteMany({ answerId });
};

export const buildNotificationPayloads = async (notifications) => {
  const actorIds = unique(notifications.map((notification) => notification.actorId));
  const actors = await User.find({ userId: { $in: actorIds } })
    .select("userId name email avatarImageUrl avatarColor")
    .lean();
  const actorsById = Object.fromEntries(actors.map((actor) => [actor.userId, actor]));

  return notifications.map((notification) => {
    const actor = actorsById[notification.actorId];
    const title =
      notification.type === "answer"
        ? "New answer on your question"
        : notification.type === "mention"
          ? "You were mentioned in a comment"
          : notification.answerId
            ? "New comment on your answer"
            : "New comment on your question";

    const body =
      notification.type === "answer"
        ? `${actor?.name || actor?.email || "Someone"} replied to "${notification.questionTitle || "your thread"}".`
        : notification.type === "mention"
          ? `${actor?.name || actor?.email || "Someone"} mentioned you: ${notification.bodyPreview}`
          : `${actor?.name || actor?.email || "Someone"} commented: ${notification.bodyPreview}`;

    return {
      _id: String(notification._id),
      type: notification.type,
      targetType: notification.targetType,
      questionId: String(notification.questionId),
      answerId: notification.answerId ? String(notification.answerId) : null,
      commentId: notification.commentId ? String(notification.commentId) : null,
      questionTitle: notification.questionTitle,
      bodyPreview: notification.bodyPreview,
      title,
      body,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      actor: actor
        ? {
            id: actor.userId,
            name: actor.name,
            email: actor.email,
            avatarImageUrl: buildAvatarImageUrl(actor.name, actor.avatarColor, actor.avatarImageUrl),
            avatarColor: resolveAvatarColor(actor.avatarColor)
          }
        : null
    };
  });
};
