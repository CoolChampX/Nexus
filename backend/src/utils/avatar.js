const DEFAULT_AVATAR_COLOR = "#F48024";

const normalizeHexColor = (value) => {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return DEFAULT_AVATAR_COLOR;
  }

  return trimmed.toUpperCase();
};

export const buildAvatarImageUrl = (name, avatarColor, explicitUrl = "") => {
  const trimmedUrl = typeof explicitUrl === "string" ? explicitUrl.trim() : "";

  if (trimmedUrl) {
    return trimmedUrl;
  }

  const safeName = (name || "Developer").trim() || "Developer";
  const background = normalizeHexColor(avatarColor).slice(1);

  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    safeName
  )}&background=${background}&color=FFFFFF&bold=true&format=png&size=256`;
};

export const resolveAvatarColor = (value) => normalizeHexColor(value);
