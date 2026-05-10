import { Account, AppwriteException, Client, OAuthProvider } from "node-appwrite";
import crypto from "crypto";

import { appwriteClient, appwriteUsers } from "../config/appwrite.js";
import { env } from "../config/env.js";
import { Answer } from "../models/Answer.js";
import { Comment } from "../models/Comment.js";
import { Question } from "../models/Question.js";
import { User } from "../models/User.js";
import { buildAvatarImageUrl, resolveAvatarColor } from "../utils/avatar.js";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createUserSession, revokeSessionToken, revokeUserSessions } from "../utils/session.js";

const createUserId = (name, email) => {
  const base = (name || email.split("@")[0] || "developer")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${base || "developer"}-${Math.random().toString(36).slice(2, 7)}`;
};

const createRandomPassword = () =>
  `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}A1!`;

const SOCIAL_PROVIDERS = {
  github: OAuthProvider.Github,
  google: OAuthProvider.Google
};

const buildAuthPayload = (user) => ({
  id: user.userId,
  name: user.name,
  email: user.email,
  headline: user.headline,
  bio: user.bio,
  location: user.location,
  website: user.website,
  avatarImageUrl: buildAvatarImageUrl(user.name, user.avatarColor, user.avatarImageUrl),
  bannerImageUrl: user.bannerImageUrl,
  avatarColor: resolveAvatarColor(user.avatarColor),
  preferredTags: user.preferredTags,
  joinedAt: user.createdAt
});

const buildAuthResponse = async (user) => ({
  user: buildAuthPayload(user),
  session: await createUserSession(user.userId)
});

const destroyCloudinaryImage = async (publicId) => {
  if (!publicId?.trim()) {
    return;
  }

  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash("sha1")
    .update(`invalidate=true&public_id=${publicId.trim()}&timestamp=${timestamp}${env.cloudinaryApiSecret}`)
    .digest("hex");

  const body = new URLSearchParams();
  body.set("public_id", publicId.trim());
  body.set("invalidate", "true");
  body.set("timestamp", String(timestamp));
  body.set("api_key", env.cloudinaryApiKey);
  body.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/destroy`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    }
  );

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new ApiError(502, payload.trim() || "Could not delete the previous Cloudinary image.");
  }
};

const getPublicRequestBaseUrl = (req) => {
  if (env.publicBackendUrl?.trim()) {
    return env.publicBackendUrl.trim().replace(/\/$/, "");
  }

  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string" && forwardedProto.trim()
      ? forwardedProto.split(",")[0].trim()
      : req.protocol;
  const host = req.get("host");

  return host ? `${protocol}://${host}` : "";
};

const buildProfilePayload = async (user) => {
  const [questionCount, answerCount, commentCount, recentQuestions, recentAnswers] = await Promise.all([
    Question.countDocuments({ authorId: user.userId }),
    Answer.countDocuments({ authorId: user.userId }),
    Comment.countDocuments({ authorId: user.userId }),
    Question.find({ authorId: user.userId }).sort({ createdAt: -1 }).limit(10),
    Answer.find({ authorId: user.userId }).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  const questionIds = [...new Set(recentAnswers.map((answer) => String(answer.questionId)))];
  const questionDocs =
    questionIds.length > 0 ? await Question.find({ _id: { $in: questionIds } }).lean() : [];
  const questionsById = Object.fromEntries(
    questionDocs.map((question) => [String(question._id), question])
  );
  const questionAuthorIds = [
    ...new Set(questionDocs.map((question) => question.authorId).filter(Boolean))
  ];
  const questionAuthors =
    questionAuthorIds.length > 0
      ? await User.find({ userId: { $in: questionAuthorIds } }).select("userId email").lean()
      : [];
  const questionAuthorsById = Object.fromEntries(
    questionAuthors.map((author) => [author.userId, author])
  );

  const hydratedAnswers = recentAnswers.map((answer) => {
    const linkedQuestion = questionsById[String(answer.questionId)];
    const linkedQuestionAuthor = linkedQuestion
      ? questionAuthorsById[linkedQuestion.authorId]
      : null;

    return {
      ...answer,
      questionTitle: linkedQuestion?.title || "Original question",
      questionBody: linkedQuestion?.body || "",
      questionAuthorId: linkedQuestion?.authorId || "",
      questionAuthorEmail: linkedQuestionAuthor?.email || linkedQuestion?.authorId || "",
      questionCreatedAt: linkedQuestion?.createdAt || null
    };
  });

  return {
    ...buildAuthPayload(user),
    stats: {
      questions: questionCount,
      answers: answerCount,
      comments: commentCount
    },
    recentQuestions,
    recentAnswers: hydratedAnswers
  };
};

const createSessionClient = (sessionSecret) =>
  new Client()
    .setEndpoint(env.appwriteEndpoint)
    .setProject(env.appwriteProjectId)
    .setSession(sessionSecret);

const findOrCreateUserForEmail = async (email, fallbackName) => {
  const normalizedEmail = email.trim().toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    return user;
  }

  const userId = createUserId(fallbackName, normalizedEmail);

  try {
    if (appwriteUsers) {
      await appwriteUsers.create(
        userId,
        normalizedEmail,
        undefined,
        createRandomPassword(),
        fallbackName.trim()
      );
    }
  } catch (error) {
    if (error instanceof AppwriteException && error.code !== 409) {
      throw new ApiError(502, error.message);
    }
  }

  user = await User.create({
    userId,
    appwriteUserId: userId,
    name: fallbackName.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(createRandomPassword())
  });

  return user;
};

const finalizeAppwriteTokenLogin = async (userId, secret) => {
  const account = new Account(appwriteClient);
  const session = await account.createSession(userId.trim(), secret.trim());

  if (!session?.secret) {
    throw new ApiError(502, "Appwrite did not return a usable session.");
  }

  const sessionAccount = new Account(createSessionClient(session.secret));
  const remoteUser = await sessionAccount.get();

  if (!remoteUser?.email) {
    throw new ApiError(502, "Appwrite provider did not return an email address.");
  }

  const normalizedEmail = remoteUser.email.trim().toLowerCase();
  let user = await User.findOne({
    $or: [{ email: normalizedEmail }, { appwriteUserId: remoteUser.$id }]
  });

  if (!user) {
    user = await User.create({
      userId: createUserId(remoteUser.name, normalizedEmail),
      appwriteUserId: remoteUser.$id,
      name: (remoteUser.name || normalizedEmail.split("@")[0]).trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(createRandomPassword())
    });
  } else {
    user.appwriteUserId = remoteUser.$id;
    user.name = (remoteUser.name || user.name).trim();
    user.email = normalizedEmail;
    await user.save();
  }

  return user;
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw new ApiError(400, "Name, email, and password are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const userId = createUserId(name, normalizedEmail);
  const passwordHash = await hashPassword(password);

  try {
    if (appwriteUsers) {
      await appwriteUsers.create(userId, normalizedEmail, undefined, password, name.trim());
    }
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }

  const user = await User.create({
    userId,
    appwriteUserId: userId,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash
  });

  res.status(201).json(await buildAuthResponse(user));
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    throw new ApiError(400, "Email and password are required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new ApiError(401, "Invalid email or password.");
  }

  res.json(await buildAuthResponse(user));
};

export const getOAuthUrl = async (req, res) => {
  const { provider, success, failure } = req.query;

  if (!provider || typeof provider !== "string" || !SOCIAL_PROVIDERS[provider]) {
    throw new ApiError(400, "Unsupported OAuth provider.");
  }

  if (!success || typeof success !== "string") {
    throw new ApiError(400, "A success callback URL is required.");
  }

  const apiBaseUrl = getPublicRequestBaseUrl(req);

  if (!apiBaseUrl) {
    throw new ApiError(500, "PUBLIC_BACKEND_URL is not configured for OAuth redirects.");
  }

  const successRedirect = `${apiBaseUrl}/api/auth/oauth/redirect?redirect=${encodeURIComponent(
    success
  )}&flow=oauth&provider=${encodeURIComponent(provider)}`;
  const failureRedirect = `${apiBaseUrl}/api/auth/oauth/redirect?redirect=${encodeURIComponent(
    typeof failure === "string" ? failure : success
  )}&flow=oauth&provider=${encodeURIComponent(provider)}`;

  try {
    const account = new Account(appwriteClient);
    const url = await account.createOAuth2Token(
      SOCIAL_PROVIDERS[provider],
      successRedirect,
      failureRedirect
    );

    res.json({ url });
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }
};

export const requestMagicLink = async (req, res) => {
  const { email, callbackUrl } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required.");
  }

  if (!callbackUrl?.trim()) {
    throw new ApiError(400, "A callback URL is required.");
  }

  const fallbackName = email.trim().split("@")[0] || "developer";
  const user = await findOrCreateUserForEmail(email, fallbackName);

  try {
    const account = new Account(appwriteClient);
    await account.createMagicURLToken(user.appwriteUserId, user.email, callbackUrl.trim());

    res.json({
      message: "Magic link sent."
    });
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }
};

export const requestPasswordReset = async (req, res) => {
  const { email, callbackUrl } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required.");
  }

  if (!callbackUrl?.trim()) {
    throw new ApiError(400, "A callback URL is required.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    res.json({
      message: "If an account exists for this email, a password reset email has been sent."
    });
    return;
  }

  try {
    const account = new Account(appwriteClient);
    await account.createRecovery(normalizedEmail, callbackUrl.trim());

    res.json({
      message: "If an account exists for this email, a password reset email has been sent."
    });
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }
};

export const completePasswordReset = async (req, res) => {
  const { userId, secret, password } = req.body;

  if (!userId?.trim() || !secret?.trim() || !password?.trim()) {
    throw new ApiError(400, "Reset userId, secret, and password are required.");
  }

  if (password.trim().length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long.");
  }

  try {
    const account = new Account(appwriteClient);
    await account.updateRecovery(userId.trim(), secret.trim(), password, password);

    const user = await User.findOne({ appwriteUserId: userId.trim() });

    if (!user) {
      throw new ApiError(404, "Could not find the account for this reset request.");
    }

    user.passwordHash = await hashPassword(password);
    await Promise.all([user.save(), revokeUserSessions(user.userId)]);

    res.json({
      message: "Password reset successful."
    });
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }
};

export const redirectPasswordReset = async (req, res) => {
  const { redirect, userId, secret } = req.query;

  if (!redirect || typeof redirect !== "string") {
    throw new ApiError(400, "A redirect URL is required.");
  }

  if (!userId || typeof userId !== "string" || !secret || typeof secret !== "string") {
    throw new ApiError(400, "Reset userId and secret are required.");
  }

  let target;

  try {
    target = new URL(redirect);
  } catch {
    throw new ApiError(400, "Redirect URL is invalid.");
  }

  target.searchParams.set("userId", userId);
  target.searchParams.set("secret", secret);

  res.redirect(target.toString());
};

export const redirectMagicLink = async (req, res) => {
  const { redirect, userId, secret } = req.query;

  if (!redirect || typeof redirect !== "string") {
    throw new ApiError(400, "A redirect URL is required.");
  }

  if (!userId || typeof userId !== "string" || !secret || typeof secret !== "string") {
    throw new ApiError(400, "Magic link userId and secret are required.");
  }

  let target;

  try {
    target = new URL(redirect);
  } catch {
    throw new ApiError(400, "Redirect URL is invalid.");
  }

  target.searchParams.set("userId", userId);
  target.searchParams.set("secret", secret);

  res.redirect(target.toString());
};

export const redirectOAuth = async (req, res) => {
  const { redirect, userId, secret, flow, provider, error, error_description } = req.query;

  if (!redirect || typeof redirect !== "string") {
    throw new ApiError(400, "A redirect URL is required.");
  }

  let target;

  try {
    target = new URL(redirect);
  } catch {
    throw new ApiError(400, "Redirect URL is invalid.");
  }

  if (typeof flow === "string" && flow.trim()) {
    target.searchParams.set("flow", flow);
  }

  if (typeof provider === "string" && provider.trim()) {
    target.searchParams.set("provider", provider);
  }

  if (typeof error === "string" && error.trim()) {
    target.searchParams.set("error", error);

    if (typeof error_description === "string" && error_description.trim()) {
      target.searchParams.set("error_description", error_description);
    }

    res.redirect(target.toString());
    return;
  }

  if (!userId || typeof userId !== "string" || !secret || typeof secret !== "string") {
    throw new ApiError(400, "OAuth userId and secret are required.");
  }

  target.searchParams.set("userId", userId);
  target.searchParams.set("secret", secret);

  res.redirect(target.toString());
};

export const completeOAuthLogin = async (req, res) => {
  const { userId, secret } = req.body;

  if (!userId?.trim() || !secret?.trim()) {
    throw new ApiError(400, "OAuth userId and secret are required.");
  }

  try {
    const user = await finalizeAppwriteTokenLogin(userId, secret);

    res.json(await buildAuthResponse(user));
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }
};

export const completeMagicLinkLogin = async (req, res) => {
  const { userId, secret } = req.body;

  if (!userId?.trim() || !secret?.trim()) {
    throw new ApiError(400, "Magic link userId and secret are required.");
  }

  try {
    const user = await finalizeAppwriteTokenLogin(userId, secret);

    res.json(await buildAuthResponse(user));
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }
};

export const getCurrentUser = async (req, res) => {
  const profile = await buildProfilePayload(req.userDocument);

  res.json(profile);
};

export const logoutCurrentUser = async (req, res) => {
  const authorizationHeader = req.header("authorization");
  const token =
    typeof authorizationHeader === "string" && authorizationHeader.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length).trim()
      : "";

  if (token) {
    await revokeSessionToken(token);
  }

  res.json({
    message: "Logged out successfully."
  });
};

export const updateCurrentUser = async (req, res) => {
  const {
    name,
    headline,
    bio,
    location,
    website,
    avatarColor,
    avatarImageUrl,
    avatarImagePublicId,
    bannerImageUrl,
    bannerImagePublicId,
    preferredTags
  } = req.body;
  const user = req.userDocument;

  if (typeof name === "string" && !name.trim()) {
    throw new ApiError(400, "Name cannot be empty.");
  }

  if (typeof website === "string" && website.trim()) {
    try {
      new URL(website.trim());
    } catch {
      throw new ApiError(400, "Website must be a valid URL.");
    }
  }

  if (typeof avatarImageUrl === "string" && avatarImageUrl.trim()) {
    try {
      new URL(avatarImageUrl.trim());
    } catch {
      throw new ApiError(400, "Profile image must be a valid URL.");
    }
  }

  if (typeof bannerImageUrl === "string" && bannerImageUrl.trim()) {
    try {
      new URL(bannerImageUrl.trim());
    } catch {
      throw new ApiError(400, "Banner image must be a valid URL.");
    }
  }

  if (typeof avatarImagePublicId !== "undefined" && typeof avatarImagePublicId !== "string") {
    throw new ApiError(400, "Profile image public id must be a string.");
  }

  if (typeof bannerImagePublicId !== "undefined" && typeof bannerImagePublicId !== "string") {
    throw new ApiError(400, "Banner image public id must be a string.");
  }

  const previousAvatarImagePublicId = user.avatarImagePublicId;
  const previousBannerImagePublicId = user.bannerImagePublicId;

  if (
    typeof avatarColor === "string" &&
    avatarColor.trim() &&
    !/^#[0-9A-Fa-f]{6}$/.test(avatarColor.trim())
  ) {
    throw new ApiError(400, "Avatar color must be a valid hex code like #8B5CF6.");
  }

  if (
    typeof preferredTags !== "undefined" &&
    (!Array.isArray(preferredTags) ||
      preferredTags.some((tag) => typeof tag !== "string" || !tag.trim()))
  ) {
    throw new ApiError(400, "Preferred tags must be a list of non-empty strings.");
  }

  if (typeof name === "string") {
    user.name = name.trim();
  }

  if (typeof headline === "string") {
    user.headline = headline.trim();
  }

  if (typeof bio === "string") {
    user.bio = bio.trim();
  }

  if (typeof location === "string") {
    user.location = location.trim();
  }

  if (typeof website === "string") {
    user.website = website.trim();
  }

  if (typeof avatarImageUrl === "string") {
    user.avatarImageUrl = avatarImageUrl.trim();
  }

  if (typeof avatarImagePublicId === "string") {
    user.avatarImagePublicId = avatarImagePublicId.trim();
  }

  if (typeof bannerImageUrl === "string") {
    user.bannerImageUrl = bannerImageUrl.trim();
  }

  if (typeof bannerImagePublicId === "string") {
    user.bannerImagePublicId = bannerImagePublicId.trim();
  }

  if (typeof avatarColor === "string") {
    user.avatarColor = avatarColor.trim();
  }

  if (Array.isArray(preferredTags)) {
    user.preferredTags = [...new Set(preferredTags.map((tag) => tag.trim()))];
  }

  await user.save();

  const cleanupTasks = [];

  if (
    typeof avatarImagePublicId === "string" &&
    previousAvatarImagePublicId &&
    previousAvatarImagePublicId !== user.avatarImagePublicId
  ) {
    cleanupTasks.push(destroyCloudinaryImage(previousAvatarImagePublicId));
  }

  if (
    typeof bannerImagePublicId === "string" &&
    previousBannerImagePublicId &&
    previousBannerImagePublicId !== user.bannerImagePublicId
  ) {
    cleanupTasks.push(destroyCloudinaryImage(previousBannerImagePublicId));
  }

  if (cleanupTasks.length) {
    await Promise.all(cleanupTasks);
  }

  const profile = await buildProfilePayload(user);
  res.json(profile);
};

export const changeCurrentUserPassword = async (req, res) => {
  const { password } = req.body;
  const user = req.userDocument;

  if (!password?.trim()) {
    throw new ApiError(400, "A new password is required.");
  }

  if (password.trim().length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters long.");
  }

  if (!appwriteUsers) {
    throw new ApiError(500, "Password updates are not configured.");
  }

  try {
    await appwriteUsers.updatePassword(user.appwriteUserId, password.trim());
    user.passwordHash = await hashPassword(password.trim());
    await Promise.all([user.save(), revokeUserSessions(user.userId)]);

    res.json({
      message: "Password updated successfully."
    });
  } catch (error) {
    if (error instanceof AppwriteException) {
      throw new ApiError(502, error.message);
    }

    throw error;
  }
};
