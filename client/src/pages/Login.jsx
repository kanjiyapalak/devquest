import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      
      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Redirect based on role after successful login
      if (user?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo" onClick={() => navigate('/')}>
              <div className="logo-icon">⚡</div>
              <span className="logo-text">QuestLearn</span>
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in to continue your coding journey</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              className={`auth-button primary ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing In...
                </>
              ) : (
                <>
                  <span className="button-icon">🚀</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Don't have an account?{' '}
              <button
                className="link-button"
                onClick={() => navigate('/signup')}
              >
                Create Free Account
              </button>
            </p>
            <button
              className="link-button"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
