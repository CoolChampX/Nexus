import { Router } from "express";

import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  listQuestions
} from "../../controllers/questions.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const questionRouter = Router();

questionRouter.get("/", asyncHandler(listQuestions));
questionRouter.get("/:questionId", asyncHandler(getQuestionById));
questionRouter.post("/", requireAuth, asyncHandler(createQuestion));
questionRouter.delete("/:questionId", requireAuth, asyncHandler(deleteQuestion));
