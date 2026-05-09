import crypto from "crypto";
import mongoose from "mongoose";

const authSessionSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const createSessionToken = () => crypto.randomBytes(48).toString("hex");

export const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const AuthSession = mongoose.model("AuthSession", authSessionSchema);
