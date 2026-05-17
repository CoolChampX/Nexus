import { Router } from "express";

import {
  changeCurrentUserPassword,
  completeMagicLinkLogin,
  completeOAuthLogin,
  completePasswordReset,
  getCurrentUser,
  listAdminUsers,
  getOAuthUrl,
  loginUser,
  logoutCurrentUser,
  redirectOAuth,
  redirectMagicLink,
  redirectPasswordReset,
  requestPasswordReset,
  requestMagicLink,
  registerUser,
  updateUserRole,
  updateCurrentUser
} from "../../controllers/auth.controller.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.post("/register", asyncHandler(registerUser));
authRouter.post("/login", asyncHandler(loginUser));
authRouter.post("/magic-link", asyncHandler(requestMagicLink));
authRouter.get("/magic-link/redirect", asyncHandler(redirectMagicLink));
authRouter.post("/password-reset", asyncHandler(requestPasswordReset));
authRouter.get("/password-reset/redirect", asyncHandler(redirectPasswordReset));
authRouter.get("/oauth/url", asyncHandler(getOAuthUrl));
authRouter.get("/oauth/redirect", asyncHandler(redirectOAuth));
authRouter.post("/oauth/appwrite", asyncHandler(completeOAuthLogin));
authRouter.post("/magic-link/complete", asyncHandler(completeMagicLinkLogin));
authRouter.post("/password-reset/complete", asyncHandler(completePasswordReset));
authRouter.post("/me/password", requireAuth, asyncHandler(changeCurrentUserPassword));
authRouter.post("/logout", requireAuth, asyncHandler(logoutCurrentUser));
authRouter.get("/me", requireAuth, asyncHandler(getCurrentUser));
authRouter.put("/me", requireAuth, asyncHandler(updateCurrentUser));
authRouter.get("/admin/users", requireAuth, asyncHandler(listAdminUsers));
authRouter.put("/admin/users/:userId/role", requireAuth, asyncHandler(updateUserRole));
