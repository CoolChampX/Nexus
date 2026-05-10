import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    appwriteUserId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    headline: {
      type: String,
      default: "Building in public"
    },
    bio: {
      type: String,
      default: "Curious developer exploring bugs, ideas, and better solutions."
    },
    location: {
      type: String,
      default: "India"
    },
    website: {
      type: String,
      default: ""
    },
    avatarImageUrl: {
      type: String,
      default: ""
    },
    avatarImagePublicId: {
      type: String,
      default: ""
    },
    bannerImageUrl: {
      type: String,
      default: ""
    },
    bannerImagePublicId: {
      type: String,
      default: ""
    },
    avatarColor: {
      type: String,
      default: "#F48024"
    },
    preferredTags: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const User = mongoose.model("User", userSchema);
