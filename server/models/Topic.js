  import mongoose from 'mongoose';

  const TopicSchema = new mongoose.Schema({
    title: String, // e.g., "HTML", "Array"
    description: String,
    category: { type: String, enum: ['general', 'DSA'], default: 'general' },
    questionType: { type: String, enum: ['mcq', 'coding'], required: true },
    totalXP: { type: Number, default: 75 },
    levels: [{
      level: Number,
      xpRequired: Number,
      description: String
    }]
  }, {
    timestamps: true // ➤ This adds createdAt and updatedAt automatically
  });

  const Topic = mongoose.model('Topic', TopicSchema);
  export default Topic;
