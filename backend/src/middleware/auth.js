import { ApiError } from "../utils/ApiError.js";
import { findValidSession } from "../utils/session.js";
import { User } from "../models/User.js";
import { canManageAdminRoles, resolveUserRole } from "../utils/permissions.js";

export const requireAuth = async (req, _res, next) => {
  const authorizationHeader = req.header("authorization");
  const bearerPrefix = "Bearer ";
  const token =
    typeof authorizationHeader === "string" && authorizationHeader.startsWith(bearerPrefix)
      ? authorizationHeader.slice(bearerPrefix.length).trim()
      : "";

  if (!token) {
    return next(new ApiError(401, "Unauthorized"));
  }

  const session = await findValidSession(token);

  if (!session) {
    return next(new ApiError(401, "Session expired or invalid."));
  }

  const user = await User.findOne({ userId: session.userId });

  if (!user) {
    return next(new ApiError(401, "User not found."));
  }

  req.user = {
    id: user.userId,
    name: user.name,
    email: user.email,
    role: resolveUserRole(user),
    canManageAdmins: canManageAdminRoles(user)
  };
  req.userDocument = user;
  req.authSession = session;

  next();
};
