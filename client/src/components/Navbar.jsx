import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, HelpCircle, LogOut } from 'lucide-react';

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: '56px',
    backgroundColor: '#0A0A0A',
    borderBottom: '1px solid #1F1F1F',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    boxSizing: 'border-box',
  };

  const logoStyle = {
    fontFamily: 'var(--font-display)',
    fontSize: '20px',
    fontWeight: '700',
    color: '#E8B84B',
    cursor: 'pointer',
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
  };

  const rightSectionStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  };

  const userBadgeStyle = {
    backgroundColor: '#1A1A1A',
    border: '1px solid #333333',
    color: '#FFFFFF',
    padding: '6px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  };

  const iconBtnStyle = {
    background: 'transparent',
    border: '1px solid #333333',
    color: '#FFFFFF',
    padding: '7px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '13px',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  };

  const getRoleLabel = (role) => {
    if (role === 'student') return 'Student';
    if (role === 'hr') return 'HR';
    if (role === 'tpo') return 'TPO';
    return role;
  };

  return (
    <nav style={navStyle}>
      {/* Logo */}
      <span style={logoStyle} onClick={() => navigate('/')}>
        HireLoop
      </span>

      {/* Right section */}
      <div style={rightSectionStyle}>
        {/* User badge */}
        {user && (
          <span style={userBadgeStyle}>
            {user.name} ({getRoleLabel(role)})
          </span>
        )}

        {/* My Profile - only for students */}
        {role === 'student' && (
          <button
            style={iconBtnStyle}
            onClick={() => navigate('/student-profile')}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Profile
          </button>
        )}

        {/* Theme toggle */}
        <button
          style={iconBtnStyle}
          onClick={toggleTheme}
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </button>

        {/* Help */}
        <button
          style={iconBtnStyle}
          onClick={() => navigate('/help')}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1A1A1A'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <HelpCircle size={15} />
          Help
        </button>

        {/* Logout */}
        <button
          style={{
            ...iconBtnStyle,
            border: '1px solid #E8B84B',
            color: '#E8B84B',
          }}
          onClick={handleLogout}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#E8B84B';
            e.currentTarget.style.color = '#0A0A0A';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#E8B84B';
          }}
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </nav>
  );
}
