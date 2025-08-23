import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import UserGlobalXP from '../models/UserGlobalXP.js';
import UserTopicProgress from '../models/UserTopicProgress.js';
import Topic from '../models/Topic.js';

dotenv.config();

async function main() {
  try {
    const userId = process.argv[2];
    if (!userId) {
      console.error('Usage: node scripts/seedUserTestData.js <userId>');
      process.exit(1);
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid userId format. Provide a valid MongoDB ObjectId.');
      process.exit(1);
    }

    await connectDB();

    // 1) Upsert UserGlobalXP
    const totalXP = 1250; // adjust as desired
    await UserGlobalXP.findOneAndUpdate(
      { userId },
      { $set: { totalXP } },
      { upsert: true, new: true }
    );

    // 2) Get some topics to mark as running and completed
    const topics = await Topic.find({}).sort({ createdAt: 1 }).limit(5).lean();
    if (!topics || topics.length === 0) {
      console.warn('No Topic documents found. Create topics first, then re-run.');
      process.exit(0);
    }

    const runningTopic = topics[0];
    const completedTopic = topics[1] || topics[0];

    // 3) Seed a Running progress
    await UserTopicProgress.findOneAndUpdate(
      { userId, topicId: runningTopic._id },
      {
        $set: {
          currentLevel: 3,
          totalTopicXP: 150,
          passedLevels: 2,
          levels: [
            { level: 1, xpEarned: 50, passed: true },
            { level: 2, xpEarned: 100, passed: true },
            { level: 3, xpEarned: 0, passed: false },
          ],
          completed: false,
        },
      },
      { upsert: true, new: true }
    );

    // 4) Seed a Completed progress
    await UserTopicProgress.findOneAndUpdate(
      { userId, topicId: completedTopic._id },
      {
        $set: {
          currentLevel: 5,
          totalTopicXP: 300,
          passedLevels: 5,
          levels: [
            { level: 1, xpEarned: 50, passed: true },
            { level: 2, xpEarned: 50, passed: true },
            { level: 3, xpEarned: 75, passed: true },
            { level: 4, xpEarned: 75, passed: true },
            { level: 5, xpEarned: 50, passed: true },
          ],
          completed: true,
        },
      },
      { upsert: true, new: true }
    );

    console.log('✅ Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

main();
