import express from 'express';
import UserGlobalXP from '../models/UserGlobalXP.js';
import UserTopicProgress from '../models/UserTopicProgress.js';
import Topic from '../models/Topic.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/dashboard/stats
// Returns all dashboard data for the authenticated user
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
  // Get user's global XP (schema uses userId + totalXP)
  const globalXP = await UserGlobalXP.findOne({ userId });
  const streak = 0; // UserActivity not implemented; default to 0
    
    // First get all topics
    const allTopics = await Topic.find().lean();
    
    // Then get all progress for this user
    const userProgress = await UserTopicProgress.find({
      userId: userId
    }).lean();
    
    // Create a map of progress by topicId for easy lookup
    const progressMap = userProgress.reduce((map, progress) => {
      map[progress.topicId.toString()] = progress;
      return map;
    }, {});
    
    // Combine topics with their progress
    const topics = allTopics.map(topic => {
      const progress = progressMap[topic._id.toString()];
      return {
        ...topic,
        progress: progress || null,
        status: progress ? 
          (progress.completed ? 'completed' : 
           (progress.currentLevel > 0 ? 'inProgress' : 'notStarted')) 
          : 'notStarted'
      };
    });
    
    // Sort topics: inProgress first, then notStarted, then completed
    topics.sort((a, b) => {
      const statusOrder = { inProgress: 0, notStarted: 1, completed: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    // Calculate stats
    const stats = {
      totalXP: globalXP ? globalXP.totalXP : 0,
      streak: streak,
      completed: topics.filter(t => t.status === 'completed').length,
      inProgress: topics.filter(t => t.status === 'inProgress').length
    };

    // Log the response for debugging
    console.log('Sending dashboard data:', {
      stats,
      topicCount: topics.length,
      sampleTopic: topics[0]
    });

    res.json({
      stats,
      topics
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Error fetching dashboard stats' });
  }
});

export default router;
