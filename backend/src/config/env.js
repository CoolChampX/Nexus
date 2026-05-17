import dotenv from "dotenv";

dotenv.config();

const parseCsv = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:8081",
  publicBackendUrl: process.env.PUBLIC_BACKEND_URL || "",
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbUriFallback: process.env.MONGODB_URI_FALLBACK || "",
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || "",
  appwriteProjectId: process.env.APPWRITE_PROJECT_ID || "",
  appwriteApiKey: process.env.APPWRITE_API_KEY || "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  cloudflareImagesApiToken: process.env.CLOUDFLARE_IMAGES_API_TOKEN || "",
  cloudflareImagesDeliveryBaseUrl: process.env.CLOUDFLARE_IMAGES_DELIVERY_BASE_URL || "",
  primaryAdminEmails: parseCsv(process.env.PRIMARY_ADMIN_EMAILS),
  primaryAdminUserIds: parseCsv(process.env.PRIMARY_ADMIN_USER_IDS),
  openAiApiKey:
    process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY || process.env.OPEN_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash"
};
