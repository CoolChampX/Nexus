import { env } from "../config/env.js";

const normalizeIdentityValue = (value) => String(value || "").trim().toLowerCase();

export const isPrimaryAdminUser = (user) => {
  const userId = normalizeIdentityValue(user?.id || user?.userId);
  const email = normalizeIdentityValue(user?.email);

  return (
    (userId && env.primaryAdminUserIds.includes(userId)) ||
    (email && env.primaryAdminEmails.includes(email))
  );
};

export const resolveUserRole = (user) =>
  isPrimaryAdminUser(user) || user?.role === "admin" ? "admin" : "user";

export const isAdminUser = (user) => resolveUserRole(user) === "admin";

export const canManageAdminRoles = (user) => isPrimaryAdminUser(user);

export const canModerateResource = (user, ownerId) =>
  Boolean(user?.id && ownerId && (user.id === ownerId || isAdminUser(user)));
