import { Router } from "express";

import { castVote } from "../../controllers/votes.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const voteRouter = Router();

voteRouter.post("/:targetType/:targetId", requireAuth, asyncHandler(castVote));
