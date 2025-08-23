import express from 'express';
import { adminAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import Topic from '../models/Topic.js';

const router = express.Router();

// Protected admin route
router.get('/dashboard', adminAuth, (req, res) => {
  try {
    res.json({
      message: 'Welcome to the Admin Dashboard',
      user: req.user
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get total user count
router.get('/users/count', adminAuth, async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ message: 'Error fetching user count' });
  }
});

// Get total quests count
router.get('/topics/count', adminAuth, async (req, res) => {
  try {
    const count = await Topic.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error fetching topics count:', error);
    res.status(500).json({ message: 'Error fetching topics count' });
  }
});

// Quest Management Endpoints

// Get all quests with pagination and search
router.get('/quests', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const searchQuery = search 
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [quests, total] = await Promise.all([
      Topic.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Topic.countDocuments(searchQuery)
    ]);

    res.json({
      quests,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    res.status(500).json({ message: 'Error fetching quests' });
  }
});

// Create a new quest
router.post('/quests', adminAuth, async (req, res) => {
  try {
    const { title, description, category, questionType, totalXP, levels } = req.body;
    
    const quest = new Topic({
      title,
      description,
      category: category || 'general', // default to 'general' if not provided
      questionType,
      totalXP: totalXP || 75, // default XP if not provided
      levels: levels || []
    });

    await quest.save();
    res.status(201).json(quest);
  } catch (error) {
    console.error('Error creating quest:', error);
    res.status(500).json({ message: 'Error creating quest' });
  }
});

// Update a quest
router.put('/quests/:id', adminAuth, async (req, res) => {
  try {
    const { title, description, category, questionType, totalXP, levels } = req.body;
    
    const updatedQuest = await Topic.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        description, 
        category, 
        questionType, 
        totalXP,
        levels
      },
      { new: true, runValidators: true }
    );

    if (!updatedQuest) {
      return res.status(404).json({ message: 'Quest not found' });
    }

    res.json(updatedQuest);
  } catch (error) {
    console.error('Error updating quest:', error);
    res.status(500).json({ message: 'Error updating quest' });
  }
});

// Delete a quest
router.delete('/quests/:id', adminAuth, async (req, res) => {
  try {
    const deletedQuest = await Topic.findByIdAndDelete(req.params.id);
    
    if (!deletedQuest) {
      return res.status(404).json({ message: 'Quest not found' });
    }

    res.json({ message: 'Quest deleted successfully' });
  } catch (error) {
    console.error('Error deleting quest:', error);
    res.status(500).json({ message: 'Error deleting quest' });
  }
});

// Get all users with pagination and search
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search 
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(searchQuery, 'name email role createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(searchQuery)
    ]);

    res.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

export default router;
