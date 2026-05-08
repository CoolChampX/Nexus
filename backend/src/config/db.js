import mongoose from "mongoose";

import { env } from "./env.js";

export const connectDatabase = async () => {
  if (!env.mongodbUri && !env.mongodbUriFallback) {
    console.warn("MONGODB_URI is not configured. Skipping MongoDB connection.");
    return;
  }

  try {
    if (!env.mongodbUri) {
      throw new Error("Primary MongoDB URI is not configured.");
    }

    await mongoose.connect(env.mongodbUri);
    console.log("Connected to MongoDB");
  } catch (error) {
    const isSrvLookupFailure =
      error?.syscall === "querySrv" || error?.message?.includes("querySrv ECONNREFUSED");

    if (isSrvLookupFailure && env.mongodbUriFallback) {
      console.warn(
        "MongoDB SRV lookup failed. Retrying with MONGODB_URI_FALLBACK."
      );

      await mongoose.connect(env.mongodbUriFallback);
      console.log("Connected to MongoDB using fallback URI");
      return;
    }

    if (isSrvLookupFailure) {
      error.message =
        `${error.message}. ` +
        "Your machine cannot resolve the Atlas SRV record from Node.js. " +
        "Add MONGODB_URI_FALLBACK with the non-SRV connection string from MongoDB Atlas.";
    }

    throw error;
  }
};
