// models/UserActivity.js
import mongoose from 'mongoose';

const UserActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  date: { type: Date, required: true }, // Each document = one day of activity
  
  submissions: { type: Number, default: 0 }, // Number of submissions that day

  xpEarned: { type: Number, default: 0 }, // Optional: track XP earned that day

  lastUpdated: { type: Date, default: Date.now }
});

UserActivitySchema.index({ userId: 1, date: 1 }, { unique: true }); // Prevent duplicates

const UserActivity = mongoose.model('UserActivity', UserActivitySchema);
export default UserActivity;
