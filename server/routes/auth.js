import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password and create user with default 'user' role
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      name,
      email: normalizedEmail, 
      password: hash,
      role: 'user' // Always set to user for new signups
    });
    
    // Create token with user role
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.status(201).json({ 
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').toLowerCase().trim();
    // Use case-insensitive exact match to support legacy records with mixed-case emails
    const user = await User.findOne({ email: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
