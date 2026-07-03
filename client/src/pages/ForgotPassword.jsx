import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './AuthCommon.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess(response.data.message || 'OTP sent successfully!');
      setTimeout(() => {
        navigate('/reset-password', { state: { email } });
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to request password reset OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-v2">
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

      <div className="auth-card-v2">
        <span className="auth-eyebrow-v2">ACCOUNT RECOVERY</span>
        <h2 className="auth-title-v2">Forgot Password</h2>

        {error && <div className="auth-alert-v2 auth-alert-error-v2">{error}</div>}
        {success && <div className="auth-alert-v2 auth-alert-success-v2">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="auth-form-group-v2">
            <label className="auth-label-v2" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="auth-input-v2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-btn-v2"
            disabled={loading}
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>

        <p className="auth-footer-v2">
          Remember your password?{' '}
          <Link to="/login" className="auth-link-v2">
            Back to Login
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

export default ForgotPassword;
