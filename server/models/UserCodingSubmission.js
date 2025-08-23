import mongoose from 'mongoose';

const UserCodingSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  level: { type: Number, required: true },
  language: { type: String, default: 'python' },
  passed: { type: Boolean, default: false },
  code: { type: String, default: '' },
  meta: { type: Object, default: {} },
}, { timestamps: true });

export default mongoose.model('UserCodingSubmission', UserCodingSubmissionSchema);
