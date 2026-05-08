import { Router } from "express";

import { explainCodeSnippet } from "../../controllers/ai.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const aiRouter = Router();

aiRouter.post("/explain", requireAuth, asyncHandler(explainCodeSnippet));
