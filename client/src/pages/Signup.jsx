import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './Auth.css';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Basic validation
    if (!name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }
    
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      setLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    
    try {
      const res = await api.post('/auth/signup', {
        name,
        email,
        password,
      });
      const { token, user } = res.data;
      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating account');
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
            <h1 className="auth-title">Start Your Journey</h1>
            <p className="auth-subtitle">Create your free account and begin mastering code</p>
          </div>

          <form className="auth-form" onSubmit={handleSignup}>
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            

            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 6 characters)"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating Account...
                </>
              ) : (
                <>
                  <span className="button-icon">✨</span>
                  Create Free Account
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <button
                className="link-button"
                onClick={() => navigate('/login')}
              >
                Sign In
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
