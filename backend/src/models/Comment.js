import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ["question", "answer"],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    body: {
      type: String,
      required: true
    },
    authorId: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const Comment = mongoose.model("Comment", commentSchema);
