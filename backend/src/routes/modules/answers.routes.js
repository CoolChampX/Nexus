import { Router } from "express";

import {
  createAnswer,
  deleteAnswer,
  listAnswers
} from "../../controllers/answers.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const answerRouter = Router();

answerRouter.get("/:questionId/answers", requireAuth, asyncHandler(listAnswers));
answerRouter.post("/:questionId/answers", requireAuth, asyncHandler(createAnswer));
answerRouter.delete("/answers/:answerId", requireAuth, asyncHandler(deleteAnswer));
