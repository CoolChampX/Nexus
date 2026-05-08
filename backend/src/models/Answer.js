import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true
    },
    body: {
      type: String,
      required: true
    },
    codeSnippet: {
      type: String,
      default: ""
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

export const Answer = mongoose.model("Answer", answerSchema);
