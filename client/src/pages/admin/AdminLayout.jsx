import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FaHome, FaBook, FaUser, FaUsers, FaSignOutAlt } from 'react-icons/fa';
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
    <div className="admin-container">
      <aside className="admin-sidebar" style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
        <div className="admin-logo" style={{cursor: 'pointer'}} onClick={() => navigate('/admin/profile')}>
          <h2>DevQuest Admin</h2>
        </div>
        <nav className="admin-nav" style={{flex: 1}}>
          <Link to="/admin/dashboard" className="nav-link">
            <FaHome className="nav-icon" />
            Dashboard
          </Link>
          <Link to="/admin/quests" className="nav-link">
            <FaBook className="nav-icon" />
            Manage Quests
          </Link>
          <Link to="/admin/users" className="nav-link">
            <FaUsers className="nav-icon" />
            Manage Users
          </Link>
          <Link to="/admin/profile" className="nav-link">
            <FaUser className="nav-icon" />
            Profile
          </Link>
        </nav>
        <button 
          onClick={handleLogout} 
          className="action-btn" 
          style={{background: '#ef4444', color: '#fff', borderRadius: '8px', fontWeight: 500, fontSize: '1rem', padding: '0.8rem 1.2rem', margin: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
          title="Logout"
        >
          <FaSignOutAlt /> Logout
        </button>
      </aside>
      
      <main className="admin-main">
        <header className="admin-header">
          <div className="header-left">
            <h1>Admin Dashboard</h1>
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
