import mongoose from "mongoose";

const voteSchema = new mongoose.Schema(
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
    userId: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      enum: [-1, 1],
      required: true
    }
  },
  {
    timestamps: true
  }
);

voteSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });

export const Vote = mongoose.model("Vote", voteSchema);
