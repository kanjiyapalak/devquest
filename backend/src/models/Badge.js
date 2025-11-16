// models/Badge.js
import mongoose from 'mongoose';

const BadgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  }
}, {
  timestamps: true
});

const Badge = mongoose.model('Badge', BadgeSchema);
export default Badge;
