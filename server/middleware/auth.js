import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
    try {
      // Get token from header
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded.userId) {
        return res.status(401).json({ message: 'Invalid token format' });
      }
      
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Add user role check if needed in the future
      // if (requiredRole && user.role !== requiredRole) {
      //   return res.status(403).json({ message: 'Not authorized to access this route' });
      // }

      // Add user from payload
      req.user = user;
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token is not valid' });
      }
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired' });
      }
      res.status(500).json({ message: 'Server Error' });
    }
  };

export const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      next();
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
