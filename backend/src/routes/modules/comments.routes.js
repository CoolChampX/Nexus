import { Router } from "express";

import {
  createComment,
  deleteComment,
  listComments
} from "../../controllers/comments.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const commentRouter = Router();

commentRouter.get("/:targetType/:targetId", asyncHandler(listComments));
commentRouter.post(
  "/:targetType/:targetId",
  requireAuth,
  asyncHandler(createComment)
);
commentRouter.delete(
  "/:commentId",
  requireAuth,
  asyncHandler(deleteComment)
);
