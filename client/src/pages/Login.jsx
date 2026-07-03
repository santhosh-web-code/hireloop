import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, HelpCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;

      // Save user session in context & local storage
      login(data.token, data.role, data.user);

      // Route to correct dashboard based on role
      if (data.role === 'student') {
        navigate('/student-dashboard');
      } else if (data.role === 'hr') {
        navigate('/hr-dashboard');
      } else if (data.role === 'tpo') {
        navigate('/tpo-dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button
        type="button"
        onClick={toggleTheme}
        style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sharp)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '14px',
          zIndex: 1000,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>

      <div className="login-card">
        <span className="login-eyebrow">PLACEMENT PORTAL</span>
        <h2 className="login-title">Login to HireLoop</h2>

        {error && (
          <div className="login-alert">
            {error}
            {error.toLowerCase().includes('verify') && (
              <div style={{ marginTop: '0.5rem' }}>
                <Link 
                  to="/verify-otp" 
                  state={{ email }} 
                  className="login-link" 
                  style={{ textDecoration: 'underline', color: 'inherit', fontWeight: 'bold' }}
                >
                  Verify OTP now
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="login-form-group">
            <label className="login-label" htmlFor="email">Email Address</label>
            <div className="login-input-wrapper">
              <Mail className="login-input-icon" size={16} />
              <input
                type="email"
                id="email"
                className="login-input login-input-with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="login-form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="login-label" htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ marginBottom: '6px' }} className="login-link">
                Forgot Password?
              </Link>
            </div>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" size={16} />
              <input
                type="password"
                id="password"
                className="login-input login-input-with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account?{' '}
          <Link to="/register" className="login-link">
            Register
          </Link>
        </p>

        <div style={{ marginTop: '8px', textAlign: 'center' }}>
          <Link 
            to="/help" 
            style={{ 
              color: 'var(--slate)', 
              fontSize: '13px', 
              textDecoration: 'none'
            }}
          >
            ❓ Need help using HireLoop? View Instructions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
