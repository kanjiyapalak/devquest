import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { FaUsers, FaBook, FaChartLine } from 'react-icons/fa';
import './Admin.css';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ✅ Moved to top
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalQuests: 0,
    loading: true,
    error: null
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await api.get('admin/dashboard');
        setUser(res.data.user);
      } catch (err) {
        if (err.response?.status === 403) {
          navigate('/');
        } else {
          setError('Failed to load admin dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true }));
        const [usersRes, questsRes] = await Promise.all([
            api.get('/admin/users/count'),
            api.get('/admin/topics/count')
        ]);
        
        setStats({
          totalUsers: usersRes.data.count,
          totalQuests: questsRes.data.count,
          loading: false,
          error: null
        });
      } catch (err) {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load statistics'
        }));
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="welcome-text">Welcome back, {user?.name || 'Admin'}!</p>
      </div>

      {stats.error && <div className="alert alert-error">{stats.error}</div>}

      <div className="dashboard-cards">
        <div className="dashboard-card users-card">
          <div className="card-icon">
            <FaUsers />
          </div>
          <div className="card-content">
            <h3>Total Users</h3>
            <div className="card-number">
              {stats.loading ? 'Loading...' : stats.totalUsers.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="dashboard-card quests-card">
          <div className="card-icon">
            <FaBook />
          </div>
          <div className="card-content">
            <h3>Total Quests</h3>
            <div className="card-number">
              {stats.loading ? 'Loading...' : stats.totalQuests.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
