import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './AuthCommon.css';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      const data = response.data;

      setSuccess(data.message || 'OTP verified successfully!');

      if (data.token) {
        // Store values in global state & local storage
        login(data.token, data.role, data.user);
        
        setTimeout(() => {
          if (data.role === 'student') {
            navigate('/student-dashboard');
          } else if (data.role === 'tpo') {
            navigate('/tpo-dashboard');
          } else if (data.role === 'hr') {
            navigate('/hr-dashboard');
          }
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'OTP verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email first to resend OTP.');
      return;
    }

    setResendLoading(true);
    setError('');
    setResendMessage('');

    try {
      const response = await api.post('/auth/resend-otp', { email });
      setResendMessage(response.data.message || 'New OTP sent successfully!');
      setTimeout(() => setResendMessage(''), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setResendLoading(false);
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
        <span className="auth-eyebrow-v2">EMAIL VERIFICATION</span>
        <h2 className="auth-title-v2">Verify Your Email</h2>

        {error && <div className="auth-alert-v2 auth-alert-error-v2">{error}</div>}
        {success && <div className="auth-alert-v2 auth-alert-success-v2">{success}</div>}
        {resendMessage && <div className="auth-alert-v2 auth-alert-success-v2">{resendMessage}</div>}

        {/* HR pending approval state after verification */}
        {success && !localStorage.getItem('token') && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <p style={{ color: 'var(--slate)', marginBottom: '1.5rem', fontFamily: 'var(--font-body)', fontSize: '14px' }}>
              Your email has been verified. Since you registered as an HR, your account is now pending approval by the TPO.
            </p>
            <Link to="/login" className="auth-btn-v2" style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}>
              Go to Login Page
            </Link>
          </div>
        )}

        {/* Normal verification form */}
        {!success && (
          <form onSubmit={handleVerify}>
            {/* Email Field (Disabled if passed from registration, editable otherwise) */}
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
                disabled={!!location.state?.email}
              />
            </div>

            {/* OTP Field */}
            <div className="auth-form-group-v2">
              <label className="auth-label-v2" htmlFor="otp" style={{ textAlign: 'center', display: 'block' }}>One-Time Password (OTP)</label>
              <input
                type="text"
                id="otp"
                className="auth-input-v2 auth-input-otp-v2"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                pattern="^[0-9]{6}$"
                maxLength="6"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn-v2"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}

        {!success && (
          <div className="auth-footer-v2">
            <p>
              Didn't receive the code?{' '}
              <button
                type="button"
                className="auth-link-v2"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            </p>
          </div>
        )}

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

export default VerifyOTP;
