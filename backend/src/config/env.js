import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:8081",
  mongodbUri: process.env.MONGODB_URI || "",
  mongodbUriFallback: process.env.MONGODB_URI_FALLBACK || "",
  appwriteEndpoint: process.env.APPWRITE_ENDPOINT || "",
  appwriteProjectId: process.env.APPWRITE_PROJECT_ID || "",
  appwriteApiKey: process.env.APPWRITE_API_KEY || "",
  openAiApiKey:
    process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY || process.env.OPEN_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash"
};
