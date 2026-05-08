import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.js";

// This placeholder keeps Express routes protected until Appwrite JWT/session
// validation is wired with the mobile client.
export const requireAuth = async (req, _res, next) => {
  const userId = req.header("x-user-id");

  if (!userId) {
    return next(new ApiError(401, "Unauthorized"));
  }

  const user = await User.findOne({ userId });

  if (!user) {
    return next(new ApiError(401, "User not found."));
  }

  req.user = {
    id: user.userId,
    name: user.name,
    email: user.email
  };
  req.userDocument = user;

  next();
};
