import { AuthSession, createSessionToken, hashSessionToken } from "../models/AuthSession.js";

const DEFAULT_SESSION_TTL_DAYS = 30;

export const buildSessionPayload = (token, expiresAt) => ({
  token,
  expiresAt
});

export const createUserSession = async (userId, ttlDays = DEFAULT_SESSION_TTL_DAYS) => {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await AuthSession.create({
    tokenHash: hashSessionToken(token),
    userId: userId.trim(),
    expiresAt
  });

  return buildSessionPayload(token, expiresAt);
};

export const findValidSession = async (token) => {
  const tokenHash = hashSessionToken(token.trim());

  return AuthSession.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() }
  });
};

export const revokeSessionToken = async (token) => {
  await AuthSession.deleteOne({ tokenHash: hashSessionToken(token.trim()) });
};

export const revokeUserSessions = async (userId) => {
  await AuthSession.deleteMany({ userId: userId.trim() });
};
