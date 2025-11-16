import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FaHome, FaBook, FaUser, FaUsers, FaSignOutAlt } from 'react-icons/fa';
// Share the same dashboard look-and-feel as the user dashboard
import '../Dashboard.css';
import '../LandingPage.css';
import './Admin.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="db-layout">
      <aside className="db-sidebar">
        <div className="db-brand" onClick={() => navigate('/admin/profile')}>
          <div className="logo-icon">⚡</div>
          <span className="logo-text">DevQuest Admin</span>
        </div>
        <nav className="db-nav">
          <NavLink to="/admin/dashboard" className={({ isActive }) => `db-nav-item${isActive ? ' active' : ''}`}>
            <FaHome className="nav-icon" />
            Dashboard
          </NavLink>
          <NavLink to="/admin/quests" className={({ isActive }) => `db-nav-item${isActive ? ' active' : ''}`}>
            <FaBook className="nav-icon" />
            Manage Quests
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `db-nav-item${isActive ? ' active' : ''}`}>
            <FaUsers className="nav-icon" />
            Manage Users
          </NavLink>
          <NavLink to="/admin/profile" className={({ isActive }) => `db-nav-item${isActive ? ' active' : ''}`}>
            <FaUser className="nav-icon" />
            Profile
          </NavLink>
          <button type="button" onClick={handleLogout} className="db-nav-item" style={{width: '100%', textAlign:'left'}}>
            <FaSignOutAlt className="nav-icon" /> Logout
          </button>
        </nav>
      </aside>

      <main className="db-main">
        <header className="admin-header">
          <div className="header-left">
            <h1 className="admin-title">Admin Dashboard</h1>
          </div>
          <div className="header-right" style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
            <span className="admin-name">{user.name || 'Admin'}</span>
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'A')}&background=7F56D9&color=fff`} 
              alt="Admin" 
              className="admin-avatar"
              style={{marginLeft: '0.5rem', cursor: 'pointer'}}
              onClick={() => navigate('/admin/profile')}
            />
          </div>
        </header>
        
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
