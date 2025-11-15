// models/UserBadge.js
import mongoose from 'mongoose';

const UserBadgeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
    required: true
  },
  earnedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const UserBadge = mongoose.model('UserBadge', UserBadgeSchema);
export default UserBadge;
