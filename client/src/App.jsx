import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';
import UserDashboard from './pages/UserDashboard';
import MyQuests from './pages/MyQuests';
import Help from './pages/Help';
import Activity from './pages/Activity';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Profile from './pages/admin/Profile';
import UserProfile from './pages/Profile';
import Users from './pages/admin/Users';
import Quests from './pages/admin/Quests';
import Quest from './pages/Quest';
import ReviewQuest from './pages/ReviewQuest';
// Removed SavedQuest page as generated quests are no longer stored/displayed

// ✅ Protected route wrapper - requires authentication
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If admin route but not admin, redirect to dashboard
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }

  return children || <Outlet />;
};

// ✅ Redirect based on authentication status
const AuthRedirect = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');
  
  if (token) {
    // If logged in, redirect based on role
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/home" replace />;
  }
  
  // If not logged in, redirect to landing
  return <Navigate to="/landing" replace />;
};

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Root redirect based on auth status */}
        <Route path="/" element={<AuthRedirect />} />
        
        {/* Public Routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected User Routes */}
        <Route element={<ProtectedRoute />}> 
          <Route path="/home" element={<UserDashboard />} />
          <Route path="/my-quests" element={<MyQuests />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/help" element={<Help />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/quest/:id" element={<Quest />} />
          {/* Saved quests route removed */}
          <Route path="/code/:id" element={<Home />} />
          <Route path="/review/:id" element={<ReviewQuest />} />
        </Route>
        


        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute adminOnly={true} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/profile" element={<Profile />} />
            <Route path="/admin/quests" element={<Quests />} />
            <Route path="/admin/users" element={<Users />} />
            {/* Default index inside /admin */}
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
