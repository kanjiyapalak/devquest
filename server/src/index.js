import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
// removed: ai routes
import adminRoutes from './routes/admin.js';
import topicsRoutes from './routes/topics.js';
import questRoutes from './routes/quest.js';
import dashboardRoutes from './routes/dashboard.js';
import userRoutes from './routes/user.js';
// removed: ai chat modes



dotenv.config();
const app = express();

// Connect MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/quest', questRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user', userRoutes);
// removed: /api/ai mounts



// removed: legacy AI routes and chat modes

// Mount quests routes
// app.use('/api/quests', userRoutes); // Using userRoutes for quests endpoints

// Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
