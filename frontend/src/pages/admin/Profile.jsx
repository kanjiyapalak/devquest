import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { FaEnvelope, FaShieldAlt, FaCog, FaChartLine, FaUsers, FaBook } from 'react-icons/fa';
import './Admin.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);
      } catch (err) {
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const accessItems = [
    { icon: <FaShieldAlt />, title: 'Admin Access', description: 'Full administrative privileges' },
    { icon: <FaUsers />, title: 'User Management', description: 'Manage all user accounts and permissions' },
    { icon: <FaBook />, title: 'Quest Management', description: 'Create, edit, and delete quests' },
    { icon: <FaChartLine />, title: 'Analytics', description: 'View platform analytics and reports' },
    { icon: <FaCog />, title: 'Settings', description: 'Configure platform settings' },
  ];

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Admin Profile</h1>
      </div>
      
      <div className="profile-content">
        <div className="profile-info">
          <div className="profile-avatar">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=7F56D9&color=fff&size=150`} 
              alt={user?.name || 'Admin'}
            />
          </div>
          
          <div className="profile-details">
            <h2>{user?.name || 'Admin'}</h2>
            <div className="profile-email">
              <FaEnvelope className="email-icon" />
              <span>{user?.email || 'admin@example.com'}</span>
            </div>
          </div>
        </div>
        
        <div className="access-section">
          <h3>Admin Access</h3>
          <div className="access-grid">
            {accessItems.map((item, index) => (
              <div key={index} className="access-item">
                <div className="access-icon">
                  {item.icon}
                </div>
                <div className="access-details">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
