  import mongoose from 'mongoose';

  const UserTopicProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
    currentLevel: { type: Number, default: 1 },
    totalTopicXP: { type: Number, default: 0 },
    passedLevels: { type: Number, default: 0 },
    levels: [{
      level: Number,
      xpEarned: { type: Number, default: 0 },
      passed: { type: Boolean, default: false }
    }],
    completed: { type: Boolean, default: false },
    // New fields for review details
    lastSubmissionAt: { type: Date },
    completedAt: { type: Date }
  }, { timestamps: true });
  const UserTopicProgress = mongoose.model('UserTopicProgress', UserTopicProgressSchema);
  export default UserTopicProgress;
