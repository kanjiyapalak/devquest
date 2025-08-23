import express from 'express';
import Topic from '../models/Topic.js';

const router = express.Router();

// Public: list topics with optional search and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const search = (req.query.search || '').trim();
    const skip = (page - 1) * limit;

    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [topics, total] = await Promise.all([
      Topic.find(searchQuery).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Topic.countDocuments(searchQuery),
    ]);

    res.json({ topics, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ message: 'Error fetching topics' });
  }
});

export default router;
