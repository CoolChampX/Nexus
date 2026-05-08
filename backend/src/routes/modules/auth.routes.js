import { Router } from "express";

import {
  completeMagicLinkLogin,
  completeOAuthLogin,
  completePasswordReset,
  getCurrentUser,
  getOAuthUrl,
  loginUser,
  redirectPasswordReset,
  requestPasswordReset,
  requestMagicLink,
  registerUser,
  updateCurrentUser
} from "../../controllers/auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(registerUser));
authRouter.post("/login", asyncHandler(loginUser));
authRouter.post("/magic-link", asyncHandler(requestMagicLink));
authRouter.post("/password-reset", asyncHandler(requestPasswordReset));
authRouter.get("/password-reset/redirect", asyncHandler(redirectPasswordReset));
authRouter.get("/oauth/url", asyncHandler(getOAuthUrl));
authRouter.post("/oauth/appwrite", asyncHandler(completeOAuthLogin));
authRouter.post("/magic-link/complete", asyncHandler(completeMagicLinkLogin));
authRouter.post("/password-reset/complete", asyncHandler(completePasswordReset));
authRouter.get("/me", requireAuth, asyncHandler(getCurrentUser));
authRouter.put("/me", requireAuth, asyncHandler(updateCurrentUser));
