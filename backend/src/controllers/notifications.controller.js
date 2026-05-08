import { Notification } from "../models/Notification.js";
import { buildNotificationPayloads } from "../services/notification.service.js";

export const listNotifications = async (req, res) => {
  const notifications = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json(await buildNotificationPayloads(notifications));
};

export const getUnreadNotificationCount = async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    userId: req.user.id,
    readAt: null
  });

  res.json({ unreadCount });
};

export const markNotificationRead = async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.notificationId, userId: req.user.id },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();

  if (!notification) {
    return res.status(404).json({ message: "Notification not found." });
  }

  const [payload] = await buildNotificationPayloads([notification]);
  res.json(payload);
};

export const markAllNotificationsRead = async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, readAt: null },
    { $set: { readAt: new Date() } }
  );

  const unreadCount = await Notification.countDocuments({
    userId: req.user.id,
    readAt: null
  });

  res.json({ success: true, unreadCount });
};
