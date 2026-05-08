import { Router } from "express";

import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../../controllers/notifications.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const notificationRouter = Router();

notificationRouter.get("/", requireAuth, asyncHandler(listNotifications));
notificationRouter.get("/unread-count", requireAuth, asyncHandler(getUnreadNotificationCount));
notificationRouter.post("/read-all", requireAuth, asyncHandler(markAllNotificationsRead));
notificationRouter.post("/:notificationId/read", requireAuth, asyncHandler(markNotificationRead));
