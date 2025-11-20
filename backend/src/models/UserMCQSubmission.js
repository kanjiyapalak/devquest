import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    selected: { type: String, required: true },
  },
  { _id: false }
);

const UserMCQSubmissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    level: { type: Number, required: true },
    answers: { type: [AnswerSchema], default: [] },
    correctCount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('UserMCQSubmission', UserMCQSubmissionSchema);
