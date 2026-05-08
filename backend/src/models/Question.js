import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    body: {
      type: String,
      required: true
    },
    codeSnippet: {
      type: String,
      default: ""
    },
    tags: {
      type: [String],
      default: []
    },
    authorId: {
      type: String,
      required: true
    },
    voteScore: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

export const Question = mongoose.model("Question", questionSchema);
