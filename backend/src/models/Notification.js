import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    actorId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["answer", "comment", "mention"],
      required: true
    },
    targetType: {
      type: String,
      enum: ["question", "answer", "comment"],
      required: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true
    },
    answerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Answer",
      default: null
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null
    },
    questionTitle: {
      type: String,
      default: ""
    },
    bodyPreview: {
      type: String,
      default: ""
    },
    readAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Notification = mongoose.model("Notification", notificationSchema);
