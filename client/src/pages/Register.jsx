import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { User, Mail, Lock, GraduationCap, Star, Tags, Building, AlertCircle, IdCard, Calendar, Percent, HelpCircle, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [branch, setBranch] = useState('CSE');
  const [studentId, setStudentId] = useState('');
  const [passedOutYear, setPassedOutYear] = useState('');
  const [tenthPercent, setTenthPercent] = useState('');
  const [twelfthPercent, setTwelfthPercent] = useState('');
  const [degreeCGPA, setDegreeCGPA] = useState('');
  const [backlogs, setBacklogs] = useState('0');
  const [skills, setSkills] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [collegeName, setCollegeName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Construct request payload based on the role
    const payload = {
      name,
      email,
      password,
      role,
    };

    if (role === 'student') {
      payload.branch = branch;
      payload.studentId = studentId || null;
      payload.passedOutYear = passedOutYear ? parseInt(passedOutYear) : null;
      payload.tenthPercent = tenthPercent ? parseFloat(tenthPercent) : null;
      payload.twelfthPercent = twelfthPercent ? parseFloat(twelfthPercent) : null;
      payload.degreeCGPA = degreeCGPA ? parseFloat(degreeCGPA) : null;
      payload.backlogs = backlogs ? parseInt(backlogs) : 0;
      payload.skills = skills ? skills.split(',').map(s => s.trim()).filter(s => s !== '') : [];
      payload.collegeName = collegeName;
    } else if (role === 'hr') {
      payload.companyName = companyName;
    } else if (role === 'tpo') {
      payload.collegeName = collegeName;
    }

    try {
      const response = await api.post('/auth/register', payload);
      setSuccess(response.data.message || 'Registration successful!');
      setTimeout(() => {
        navigate('/verify-otp', { state: { email } });
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
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

      <div className="register-card">
        <span className="register-eyebrow">CREATE ACCOUNT</span>
        <h2 className="register-title">Register for HireLoop</h2>

        {error && <div className="register-alert register-alert-error">{error}</div>}
        {success && <div className="register-alert register-alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="register-form-grid">
          {/* Role Selector */}
          <div className="register-form-group full-width">
            <label className="register-label">Register As</label>
            <div className="role-segmented-control">
              <button
                type="button"
                className={`role-segmented-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => setRole('student')}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-segmented-btn ${role === 'hr' ? 'active' : ''}`}
                onClick={() => setRole('hr')}
              >
                HR Representative
              </button>
              <button
                type="button"
                className={`role-segmented-btn ${role === 'tpo' ? 'active' : ''}`}
                onClick={() => setRole('tpo')}
              >
                TPO Officer
              </button>
            </div>
          </div>

          {/* Name Field */}
          <div className="register-form-group full-width">
            <label className="register-label" htmlFor="name">Full Name</label>
            <div className="register-input-wrapper">
              <User className="register-input-icon" size={16} />
              <input
                type="text"
                id="name"
                className="register-input register-input-with-icon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="register-form-group full-width">
            <label className="register-label" htmlFor="email">Email Address</label>
            <div className="register-input-wrapper">
              <Mail className="register-input-icon" size={16} />
              <input
                type="email"
                id="email"
                className="register-input register-input-with-icon"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="register-form-group full-width">
            <label className="register-label" htmlFor="password">Password</label>
            <div className="register-input-wrapper">
              <Lock className="register-input-icon" size={16} />
              <input
                type="password"
                id="password"
                className="register-input register-input-with-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Role-Specific Fields */}
          {role === 'student' && (
            <>
              {/* Row 4: Student ID | Passed Out Year */}
              <div className="register-form-group">
                <label className="register-label" htmlFor="studentId">Student ID</label>
                <div className="register-input-wrapper">
                  <IdCard className="register-input-icon" size={16} />
                  <input
                    type="text"
                    id="studentId"
                    className="register-input register-input-with-icon"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter your college student ID"
                    required
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label" htmlFor="passedOutYear">Passed Out Year</label>
                <div className="register-input-wrapper">
                  <Calendar className="register-input-icon" size={16} />
                  <input
                    type="number"
                    id="passedOutYear"
                    className="register-input register-input-with-icon"
                    value={passedOutYear}
                    onChange={(e) => setPassedOutYear(e.target.value)}
                    placeholder="e.g. 2025"
                    min="2020"
                    max="2030"
                    required
                  />
                </div>
              </div>

              {/* Row 5: 10th % | 12th / Diploma % */}
              <div className="register-form-group">
                <label className="register-label" htmlFor="tenthPercent">10th %</label>
                <div className="register-input-wrapper">
                  <Percent className="register-input-icon" size={16} />
                  <input
                    type="number"
                    id="tenthPercent"
                    className="register-input register-input-with-icon"
                    value={tenthPercent}
                    onChange={(e) => setTenthPercent(e.target.value)}
                    placeholder="e.g. 85.5"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label" htmlFor="twelfthPercent">12th / Diploma %</label>
                <div className="register-input-wrapper">
                  <Percent className="register-input-icon" size={16} />
                  <input
                    type="number"
                    id="twelfthPercent"
                    className="register-input register-input-with-icon"
                    value={twelfthPercent}
                    onChange={(e) => setTwelfthPercent(e.target.value)}
                    placeholder="e.g. 78.0"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              {/* Row 6: Degree CGPA | Backlogs */}
              <div className="register-form-group">
                <label className="register-label" htmlFor="degreeCGPA">Degree CGPA</label>
                <div className="register-input-wrapper">
                  <Star className="register-input-icon" size={16} />
                  <input
                    type="number"
                    id="degreeCGPA"
                    className="register-input register-input-with-icon"
                    value={degreeCGPA}
                    onChange={(e) => setDegreeCGPA(e.target.value)}
                    placeholder="e.g. 8.5"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label" htmlFor="backlogs">Active Backlogs</label>
                <div className="register-input-wrapper">
                  <AlertCircle className="register-input-icon" size={16} />
                  <input
                    type="number"
                    id="backlogs"
                    className="register-input register-input-with-icon"
                    value={backlogs}
                    onChange={(e) => setBacklogs(e.target.value)}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Row 7: Branch | College Name */}
              <div className="register-form-group">
                <label className="register-label" htmlFor="branch">Branch</label>
                <select
                  id="branch"
                  className="register-input"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  required
                >
                  <option value="CSE">CSE</option>
                  <option value="IT">IT</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>

              <div className="register-form-group">
                <label className="register-label" htmlFor="collegeName">College Name</label>
                <div className="register-input-wrapper">
                  <GraduationCap className="register-input-icon" size={16} />
                  <input
                    type="text"
                    id="collegeName"
                    className="register-input register-input-with-icon"
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="Enter your college"
                    required
                  />
                </div>
              </div>

              {/* Row 8: Skills */}
              <div className="register-form-group full-width">
                <label className="register-label" htmlFor="skills">Skills (comma-separated)</label>
                <div className="register-input-wrapper">
                  <Tags className="register-input-icon" size={16} />
                  <input
                    type="text"
                    id="skills"
                    className="register-input register-input-with-icon"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="Java, React, Node.js, Python"
                  />
                </div>
              </div>
            </>
          )}

          {role === 'hr' && (
            <div className="register-form-group full-width">
              <label className="register-label" htmlFor="companyName">Company Name</label>
              <div className="register-input-wrapper">
                <Building className="register-input-icon" size={16} />
                <input
                  type="text"
                  id="companyName"
                  className="register-input register-input-with-icon"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>
            </div>
          )}

          {role === 'tpo' && (
            <div className="register-form-group full-width">
              <label className="register-label" htmlFor="collegeName">College Name</label>
              <div className="register-input-wrapper">
                <GraduationCap className="register-input-icon" size={16} />
                <input
                  type="text"
                  id="collegeName"
                  className="register-input register-input-with-icon"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="Enter college name"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="register-btn full-width"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="register-footer">
          Already have an account?{' '}
          <Link to="/login" className="register-link">
            Login
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

export default Register;
