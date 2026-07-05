import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Search, Clipboard, Bell } from 'lucide-react';
import './TPODashboard.css';

const TPODashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [pendingHRs, setPendingHRs] = useState([]);
  const [pendingJDs, setPendingJDs] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [approvedHRs, setApprovedHRs] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfileData, setStudentProfileData] = useState(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalHRs: 0,
    pendingHRApprovals: 0,
    totalApplications: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const [processingId, setProcessingId] = useState(null);
  const [rejectingJDId, setRejectingJDId] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: 'Confirm Removal',
    message: '',
    onConfirm: null
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, hrsRes, jdsRes, appsRes, activeHRsRes, studentsRes, notificationsRes] = await Promise.all([
        api.get('/tpo/dashboard-stats'),
        api.get('/tpo/pending-hrs'),
        api.get('/jd/pending'),
        api.get('/tpo/all-applications'),
        api.get('/tpo/hrs'),
        api.get('/tpo/all-students'),
        api.get('/tpo/notifications'),
      ]);
      setStats(statsRes.data);
      setPendingHRs(hrsRes.data || []);
      setPendingJDs(jdsRes.data || []);
      setAllApplications(appsRes.data || []);
      setApprovedHRs(activeHRsRes.data || []);
      setAllStudents(studentsRes.data || []);
      setNotifications(notificationsRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // HR Approvals
  const handleApproveHR = async (hrId) => {
    setProcessingId(hrId);
    setNotificationMessage('');
    try {
      await api.put(`/tpo/approve-hr/${hrId}`);
      setNotificationMessage('HR account approved successfully.');
      setTimeout(() => setNotificationMessage(''), 4000);
      
      // Update local lists
      setPendingHRs(pendingHRs.filter(hr => hr._id !== hrId));
      setStats(prev => ({
        ...prev,
        totalHRs: prev.totalHRs + 1,
        pendingHRApprovals: Math.max(0, prev.pendingHRApprovals - 1),
      }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to approve HR.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectHR = async (hrId) => {
    setProcessingId(hrId);
    setNotificationMessage('');
    try {
      await api.delete(`/tpo/reject-hr/${hrId}`);
      setNotificationMessage('HR account rejected and deleted.');
      setTimeout(() => setNotificationMessage(''), 4000);
      
      setPendingHRs(pendingHRs.filter(hr => hr._id !== hrId));
      setStats(prev => ({
        ...prev,
        pendingHRApprovals: Math.max(0, prev.pendingHRApprovals - 1),
      }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to reject HR.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);
      
      if (seconds < 60) return 'just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch (err) {
      return '';
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const res = await api.put(`/tpo/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => n._id === notificationId ? res.data : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/tpo/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    setProcessingId(studentId);
    setNotificationMessage('');
    try {
      await api.delete(`/tpo/remove-student/${studentId}`);
      setNotificationMessage('Student account removed successfully.');
      setTimeout(() => setNotificationMessage(''), 4000);
      
      // Update applications state
      setAllApplications(allApplications.filter(app => app.student?._id !== studentId));
      
      // Update allStudents state
      setAllStudents(allStudents.filter(item => item.student?._id !== studentId));
      
      // Update statistics
      setStats(prev => ({
        ...prev,
        totalStudents: Math.max(0, prev.totalStudents - 1),
      }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove student.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveHR = async (hrId) => {
    setProcessingId(hrId);
    setNotificationMessage('');
    try {
      await api.delete(`/tpo/remove-hr/${hrId}`);
      setNotificationMessage('HR company and all associated postings/applications removed.');
      setTimeout(() => setNotificationMessage(''), 4000);
      
      // Update approvedHRs list
      setApprovedHRs(approvedHRs.filter(hr => hr._id !== hrId));

      // Re-fetch statistics and applications to make sure counts reflect removals
      const [statsRes, appsRes] = await Promise.all([
        api.get('/tpo/dashboard-stats'),
        api.get('/tpo/all-applications'),
      ]);
      setStats(statsRes.data);
      setAllApplications(appsRes.data || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove HR.');
    } finally {
      setProcessingId(null);
    }
  };

  // JD Approvals
  const handleApproveJD = async (jdId) => {
    setProcessingId(jdId);
    setNotificationMessage('');
    try {
      const response = await api.put(`/jd/approve/${jdId}`);
      const data = response.data;
      setNotificationMessage(`JD Approved! ${data.notifiedStudentsCount || 0} eligible students notified.`);
      setTimeout(() => setNotificationMessage(''), 5000);

      setPendingJDs(pendingJDs.filter(jd => jd._id !== jdId));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to approve JD.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectJD = async (jdId) => {
    if (!rejectionReasonInput.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setProcessingId(jdId);
    try {
      await api.put(`/jd/${jdId}/reject`, { rejectionReason: rejectionReasonInput });
      setNotificationMessage('JD rejected and HR notified.');
      setTimeout(() => setNotificationMessage(''), 4000);

      setPendingJDs(pendingJDs.filter(jd => jd._id !== jdId));
      setRejectingJDId(null);
      setRejectionReasonInput('');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to reject JD.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenProfileModal = async (studentId) => {
    setSelectedStudent(studentId);
    setProfileModalLoading(true);
    try {
      const res = await api.get(`/tpo/student-profile/${studentId}`);
      setStudentProfileData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch student profile details.');
      setSelectedStudent(null);
    } finally {
      setProfileModalLoading(false);
    }
  };

  const handleDownloadResume = async (studentId, fileName) => {
    try {
      const res = await api.get(`/student/resume/${studentId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download resume.');
    }
  };

  const handleDownloadResumeBase64 = (base64String, fileName) => {
    try {
      let href = base64String;
      if (!href.startsWith('data:')) {
        href = `data:application/pdf;base64,${base64String}`;
      }
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to download resume.');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Applied':
        return 'applied';
      case 'Eligible':
        return 'eligible';
      case 'Not Eligible':
        return 'not-eligible';
      case 'Shortlisted':
        return 'shortlisted';
      case 'Interview Scheduled':
        return 'interview-scheduled';
      case 'Selected':
        return 'selected';
      case 'Rejected':
        return 'rejected';
      default:
        return 'applied';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'Applied':
        return '#64748b'; // slate
      case 'Eligible':
        return '#0284c7'; // blue
      case 'Not Eligible':
        return '#ef4444'; // red
      case 'Shortlisted':
        return '#1e3a8a'; // navy
      case 'Interview Scheduled':
        return '#8b5cf6'; // purple
      case 'Selected':
        return '#10b981'; // green
      case 'Rejected':
        return '#ef4444'; // red
      default:
        return '#64748b';
    }
  };

  return (
    <div className="app-container">
      <Navbar title="TPO Dashboard" subtitle="Approve HR credentials, JDs, and monitor college stats" />

      <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>

        {/* TPO Page Header & Notifications Bell */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '1rem',
          position: 'relative'
        }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '28px', fontWeight: '700' }}>TPO Control Panel</h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Welcome back, administrator. Manage and monitor campus recruitments.</p>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                position: 'relative',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)'
              }}
              title="Notifications"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  borderRadius: '50%',
                  minWidth: '18px',
                  height: '18px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px',
                  boxShadow: '0 0 0 2px var(--bg-page)'
                }}>
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '52px',
                right: 0,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                width: '320px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>Notifications</span>
                  {notifications.filter(n => !n.isRead).length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => handleMarkAsRead(notification._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          backgroundColor: notification.isRead ? 'var(--bg-card)' : 'var(--bg-surface)',
                          transition: 'background-color 0.2s ease',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{
                          fontSize: '16px',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(30, 58, 138, 0.05)'
                        }}>
                          👤
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                            {notification.message}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        {!notification.isRead && (
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent)',
                            marginTop: '6px',
                            flexShrink: 0
                          }} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="tpo-tabs-container">
          <button
            onClick={() => setActiveTab('overview')}
            className={`tpo-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('pendingHRs')}
            className={`tpo-tab-btn ${activeTab === 'pendingHRs' ? 'active' : ''}`}
          >
            Pending HR Approvals
          </button>
          <button
            onClick={() => setActiveTab('pendingJDs')}
            className={`tpo-tab-btn ${activeTab === 'pendingJDs' ? 'active' : ''}`}
          >
            Pending JD Approvals
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`tpo-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
          >
            All Students
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {notificationMessage && <div className="alert alert-success">{notificationMessage}</div>}

        {loading ? (
          <div className="loader-container">
            <span className="spinner"></span>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="tpo-stats-grid">
                  <div className="stats-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <span className="stats-label">Total Students</span>
                    <span className="stats-val" style={{ color: '#3b82f6' }}>{stats.totalStudents}</span>
                  </div>
                  <div className="stats-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <span className="stats-label">Total HRs</span>
                    <span className="stats-val" style={{ color: '#10b981' }}>{stats.totalHRs}</span>
                  </div>
                  <div className="stats-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <span className="stats-label">Pending HR Approvals</span>
                    <span className="stats-val" style={{ color: '#f59e0b' }}>{stats.pendingHRApprovals}</span>
                  </div>
                  <div className="stats-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <span className="stats-label">Total Applications</span>
                    <span className="stats-val" style={{ color: '#8b5cf6' }}>{stats.totalApplications}</span>
                  </div>
                </div>

                {/* All Applications Section */}
                <div className="panel-card">
                  {/* SECTION HEADER */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderBottom: '1px solid var(--slate-light)',
                    paddingBottom: '10px',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '20px', fontWeight: 600 }}>
                      All Applications
                    </h3>
                    <span style={{
                      backgroundColor: 'var(--navy-deep)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: '600',
                      padding: '2px 10px',
                      borderRadius: '20px'
                    }}>
                      {allApplications.length}
                    </span>
                  </div>

                  {/* SEARCH BAR */}
                  <div style={{ position: 'relative', width: '100%', marginBottom: '1.5rem' }}>
                    <Search
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--slate)',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search students, companies, or positions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: '36px',
                        margin: 0,
                        border: '1px solid var(--slate-light)',
                        borderRadius: 'var(--radius-sharp)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* CARDS LIST or EMPTY STATE */}
                  {(() => {
                    const filteredApps = allApplications.filter((app) => {
                      const studentName = app.student?.name?.toLowerCase() || '';
                      const company = app.jobDescription?.companyName?.toLowerCase() || '';
                      const jdTitle = app.jobDescription?.title?.toLowerCase() || '';
                      const query = searchQuery.toLowerCase();
                      return studentName.includes(query) || company.includes(query) || jdTitle.includes(query);
                    });

                    if (filteredApps.length === 0) {
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '3rem',
                          color: 'var(--slate)'
                        }}>
                          <Clipboard size={48} style={{ marginBottom: '1rem', opacity: 0.6 }} />
                          <p style={{ margin: 0, fontSize: '15px' }}>No applications found</p>
                        </div>
                      );
                    }

                    return (
                      <div className="tpo-app-cards-container">
                        {filteredApps.map((app) => (
                          <div
                            key={app._id}
                            className="tpo-app-card"
                            style={{ borderLeft: `4px solid ${getStatusBorderColor(app.status)}` }}
                          >
                            {/* LEFT section */}
                            <div className="tpo-app-card-left">
                              <h4 className="tpo-app-card-name">
                                {app.student?.name || 'N/A'}
                              </h4>
                              <div className="tpo-app-card-meta">
                                <span className="tpo-app-card-branch">
                                  {app.student?.branch || 'N/A'}
                                </span>
                                {app.student?.degreeCGPA !== undefined && app.student?.degreeCGPA !== null && (
                                  <span className="tpo-app-card-cgpa">
                                    CGPA: {app.student.degreeCGPA}
                                  </span>
                                )}
                              </div>
                              <span className="tpo-app-card-email">
                                {app.student?.email || 'N/A'}
                              </span>
                            </div>

                            {/* MIDDLE section */}
                            <div className="tpo-app-card-middle">
                              <span className="tpo-app-card-title" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                                {app.jobDescription?.title || 'N/A'}
                              </span>
                              <span className="tpo-app-card-company" style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                                {app.jobDescription?.companyName || 'N/A'}
                              </span>
                              <span className="tpo-app-card-date">
                                Applied on {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>

                            {/* RIGHT section */}
                            <div className="tpo-app-card-right">
                              <span className={`sd-status-badge ${getStatusClass(app.status)}`} style={{ display: 'inline-block', marginBottom: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                {app.status}
                              </span>
                              <span className="tpo-app-card-score">
                                Mock: {app.mockInterviewScore !== null ? `${app.mockInterviewScore}/100` : '—'}
                              </span>
                              <span className="tpo-app-card-score">
                                Assessment: {app.assessmentAttempted && app.assessmentScore !== null ? `${app.assessmentScore}%` : '—'}
                              </span>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'stretch' }}>
                                <button
                                  onClick={() => handleOpenProfileModal(app.student?._id)}
                                  className="tpo-app-card-btn"
                                  style={{ margin: 0, flex: 1, whiteSpace: 'nowrap' }}
                                >
                                  View Profile
                                </button>
                                {app.student?._id && (
                                  <button
                                    onClick={() => {
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Confirm Student Removal',
                                        message: `Are you sure you want to remove student "${app.student.name || 'this student'}"? This will delete ALL their applications and data permanently.`,
                                        onConfirm: () => handleRemoveStudent(app.student._id)
                                      });
                                    }}
                                    style={{
                                      border: '1px solid var(--danger)',
                                      color: 'var(--danger)',
                                      background: 'transparent',
                                      padding: '6px 10px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      borderRadius: 'var(--radius-sharp)',
                                      fontWeight: '600',
                                      fontFamily: 'var(--font-body)',
                                      flex: 1,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    Remove Student
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Active HR Companies Section */}
                <div className="panel-card">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '10px',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600 }}>
                      Active HR Companies
                    </h3>
                    <span style={{
                      backgroundColor: 'var(--brand)',
                      color: 'var(--text-on-dark)',
                      fontSize: '13px',
                      fontWeight: '600',
                      padding: '2px 10px',
                      borderRadius: '20px'
                    }}>
                      {approvedHRs.length}
                    </span>
                  </div>

                  {approvedHRs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No active HR companies.
                    </div>
                  ) : (
                    <div className="tpo-table-wrapper">
                      <table className="tpo-table">
                        <thead>
                          <tr>
                            <th>Company Name</th>
                            <th>HR Rep Name</th>
                            <th>Email Address</th>
                            <th>Join Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedHRs.map((hr) => (
                            <tr key={hr._id}>
                              <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{hr.companyName || 'N/A'}</td>
                              <td>{hr.name}</td>
                              <td>{hr.email}</td>
                              <td>
                                {new Date(hr.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td>
                                <button
                                  onClick={() => {
                                    setConfirmModal({
                                      isOpen: true,
                                      title: 'Confirm Company Removal',
                                      message: `Are you sure you want to remove the HR company "${hr.companyName || hr.name}" and ALL their job postings and applications? Continue?`,
                                      onConfirm: () => handleRemoveHR(hr._id)
                                    });
                                  }}
                                  style={{
                                    border: '1px solid var(--danger)',
                                    color: 'var(--danger)',
                                    background: 'transparent',
                                    padding: '6px 10px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    borderRadius: 'var(--radius-sharp)',
                                    fontWeight: '600',
                                    fontFamily: 'var(--font-body)'
                                  }}
                                >
                                  Remove Company
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PENDING HR APPROVALS */}
            {activeTab === 'pendingHRs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="panel-card">
                  <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '22px' }}>Pending HR Registrations ({pendingHRs.length})</h3>
                  {pendingHRs.length === 0 ? (
                    <p style={{ color: 'var(--slate)', textAlign: 'center', padding: '2.5rem' }}>No pending HR approvals.</p>
                  ) : (
                    <div className="tpo-table-wrapper">
                      <table className="tpo-table">
                        <thead>
                          <tr>
                            <th>HR Name</th>
                            <th>Email Address</th>
                            <th>Company Name</th>
                            <th>Registered Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingHRs.map((hr) => (
                            <tr key={hr._id}>
                              <td data-label="HR Name" style={{ fontWeight: '600' }}>{hr.name}</td>
                              <td data-label="Email Address">{hr.email}</td>
                              <td data-label="Company Name">{hr.companyName || 'N/A'}</td>
                              <td data-label="Registered Date">
                                {new Date(hr.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td data-label="Actions">
                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => handleApproveHR(hr._id)}
                                    className="btn btn-primary"
                                    disabled={processingId !== null}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', background: '#10b981', borderRadius: 'var(--radius-sharp)' }}
                                  >
                                    {processingId === hr._id ? 'Processing...' : 'Approve'}
                                  </button>
                                  <button
                                    onClick={() => handleRejectHR(hr._id)}
                                    className="btn btn-danger"
                                    disabled={processingId !== null}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', borderRadius: 'var(--radius-sharp)' }}
                                  >
                                    {processingId === hr._id ? 'Processing...' : 'Reject'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="panel-card">
                  <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '22px' }}>Approved HR Accounts ({approvedHRs.length})</h3>
                  {approvedHRs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem' }}>No approved HR accounts found.</p>
                  ) : (
                    <div className="tpo-table-wrapper">
                      <table className="tpo-table">
                        <thead>
                          <tr>
                            <th>HR Name</th>
                            <th>Email Address</th>
                            <th>Company Name</th>
                            <th>Registered Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedHRs.map((hr) => (
                            <tr key={hr._id}>
                              <td data-label="HR Name" style={{ fontWeight: '600' }}>{hr.name}</td>
                              <td data-label="Email Address">{hr.email}</td>
                              <td data-label="Company Name" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{hr.companyName || 'N/A'}</td>
                              <td data-label="Registered Date">
                                {new Date(hr.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td data-label="Actions">
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  <button
                                    onClick={() => {
                                      setConfirmModal({
                                        isOpen: true,
                                        title: 'Confirm HR Removal',
                                        message: `Are you sure you want to remove HR "${hr.name}" of "${hr.companyName || 'N/A'}"? This will delete their account and ALL associated job postings and applications permanently.`,
                                        onConfirm: () => handleRemoveHR(hr._id)
                                      });
                                    }}
                                    style={{
                                      border: '1px solid var(--danger)',
                                      color: 'var(--danger)',
                                      background: 'transparent',
                                      padding: '6px 12px',
                                      fontSize: '13px',
                                      cursor: 'pointer',
                                      borderRadius: 'var(--radius-sharp)',
                                      fontWeight: '600',
                                      fontFamily: 'var(--font-body)'
                                    }}
                                  >
                                    Remove HR
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PENDING JD APPROVALS */}
            {activeTab === 'pendingJDs' && (
              <div>
                <div className="panel-card">
                  <h3 style={{ marginBottom: '1.5rem' }}>Pending Job Descriptions ({pendingJDs.length})</h3>
                  {pendingJDs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem' }}>No pending JD approvals.</p>
                  ) : (
                    <div className="dashboard-grid">
                      {pendingJDs.map((jd) => (
                        <div key={jd._id} className="jd-card">
                          <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.15rem' }}>{jd.title}</h4>
                          <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)', fontWeight: '600' }}>
                            {jd.companyName}
                          </h5>

                          <div className="jd-meta" style={{ margin: '0.25rem 0 1rem 0' }}>
                            <span className="jd-meta-item">💼 {jd.package || 'N/A'}</span>
                            <span className="jd-meta-item">📍 {jd.location || 'Remote'}</span>
                          </div>

                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {jd.description}
                          </p>

                          <div className="jd-skills" style={{ marginBottom: '1rem' }}>
                            {jd.requiredSkills.map((skill, idx) => (
                              <span key={idx} className="skill-tag">{skill}</span>
                            ))}
                          </div>

                          <div style={{ backgroundColor: 'var(--slate-bg)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', textAlign: 'left' }}>
                            <p style={{ margin: '0 0 0.25rem 0' }}><strong>Eligible Branches:</strong> {jd.allowedBranches.join(', ')}</p>
                            <p style={{ margin: '0 0 0.25rem 0' }}><strong>Min CGPA:</strong> {jd.minCGPA}</p>
                            <p style={{ margin: 0 }}><strong>Max Backlogs:</strong> {jd.maxBacklogs}</p>
                          </div>

                          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                            {rejectingJDId !== jd._id ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => handleApproveJD(jd._id)}
                                  className="btn btn-primary"
                                  disabled={processingId !== null}
                                  style={{ flex: 1, background: '#10b981' }}
                                >
                                  Approve & Notify
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingJDId(jd._id);
                                    setRejectionReasonInput('');
                                  }}
                                  className="btn btn-danger"
                                  disabled={processingId !== null}
                                  style={{ flex: 1 }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div style={{ textAlign: 'left' }}>
                                <label className="form-label" htmlFor={`reason-${jd._id}`} style={{ fontSize: '0.85rem' }}>
                                  Rejection Reason
                                </label>
                                <textarea
                                  id={`reason-${jd._id}`}
                                  className="form-input"
                                  value={rejectionReasonInput}
                                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                                  placeholder="Enter why this JD is rejected..."
                                  style={{ minHeight: '80px', fontSize: '0.85rem', marginBottom: '0.5rem' }}
                                  required
                                />
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => handleRejectJD(jd._id)}
                                    className="btn btn-danger"
                                    disabled={processingId !== null}
                                    style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                  >
                                    Confirm Reject
                                  </button>
                                  <button
                                    onClick={() => setRejectingJDId(null)}
                                    className="btn btn-secondary"
                                    style={{ flex: 1, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="panel-card">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '10px',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '22px' }}>
                      All Registered Students
                    </h3>
                    <span style={{
                      backgroundColor: 'var(--brand)',
                      color: 'var(--text-on-dark)',
                      fontSize: '13px',
                      fontWeight: '600',
                      padding: '2px 10px',
                      borderRadius: '20px'
                    }}>
                      {allStudents.length}
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', width: '100%', marginBottom: '1.5rem' }}>
                    <Search
                      size={18}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)',
                        pointerEvents: 'none'
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search students by name, branch, skills, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: '36px',
                        margin: 0,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sharp)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {(() => {
                    const filteredStudents = allStudents.filter((item) => {
                      const name = item.student?.name?.toLowerCase() || '';
                      const branch = item.student?.branch?.toLowerCase() || '';
                      const email = item.student?.email?.toLowerCase() || '';
                      const skills = item.student?.skills?.map(s => s.toLowerCase()).join(' ') || '';
                      const query = searchQuery.toLowerCase();
                      return name.includes(query) || branch.includes(query) || email.includes(query) || skills.includes(query);
                    });

                    const appliedStudents = filteredStudents.filter(item => item.totalApplications > 0);
                    const notAppliedStudents = filteredStudents.filter(item => item.totalApplications === 0);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Section A: Applied Students */}
                        <div>
                          <h4 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '18px',
                            color: 'var(--text-primary)',
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            Applied Students
                            <span style={{ fontSize: '12px', background: 'var(--brand)', color: 'var(--text-on-dark)', padding: '2px 8px', borderRadius: '12px' }}>
                              {appliedStudents.length}
                            </span>
                          </h4>

                          {appliedStudents.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem 0' }}>No students with active applications.</p>
                          ) : (
                            <div className="tpo-app-cards-container">
                              {appliedStudents.map(({ student, applications, totalApplications }) => (
                                <div
                                  key={student._id}
                                  className="tpo-app-card"
                                  style={{ borderLeft: '4px solid var(--accent)' }}
                                >
                                  {/* Left Section */}
                                  <div className="tpo-app-card-left">
                                    <h4 className="tpo-app-card-name">{student.name || 'N/A'}</h4>
                                    <div className="tpo-app-card-meta">
                                      <span className="tpo-app-card-branch">{student.branch || 'N/A'}</span>
                                      {student.degreeCGPA && (
                                        <span className="tpo-app-card-cgpa">CGPA: {student.degreeCGPA}</span>
                                      )}
                                    </div>
                                    <span className="tpo-app-card-email">{student.email || 'N/A'}</span>
                                  </div>

                                  {/* Middle Section */}
                                  <div className="tpo-app-card-middle" style={{ gap: '6px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                      <strong>College:</strong> {student.collegeName || 'N/A'}
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                      {student.skills?.slice(0, 5).map((skill, idx) => (
                                        <span key={idx} className="skill-tag" style={{ margin: 0, fontSize: '10px', padding: '2px 6px' }}>{skill}</span>
                                      ))}
                                      {student.skills?.length > 5 && (
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{student.skills.length - 5} more</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right Section */}
                                  <div className="tpo-app-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      backgroundColor: 'rgba(30, 58, 138, 0.1)',
                                      color: 'var(--navy-mid)',
                                      padding: '3px 8px',
                                      borderRadius: '4px'
                                    }}>
                                      {totalApplications} {totalApplications === 1 ? 'Application' : 'Applications'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                      <button
                                        onClick={() => handleOpenProfileModal(student._id)}
                                        className="tpo-app-card-btn"
                                        style={{ margin: 0, padding: '6px 12px', fontSize: '12px' }}
                                      >
                                        View Profile
                                      </button>
                                      <button
                                        onClick={() => {
                                          setConfirmModal({
                                            isOpen: true,
                                            title: 'Confirm Student Removal',
                                            message: `Are you sure you want to remove student "${student.name || 'this student'}"? This will delete ALL their applications and data permanently.`,
                                            onConfirm: () => handleRemoveStudent(student._id)
                                          });
                                        }}
                                        style={{
                                          border: '1px solid var(--danger)',
                                          color: 'var(--danger)',
                                          background: 'transparent',
                                          padding: '6px 12px',
                                          fontSize: '12px',
                                          cursor: 'pointer',
                                          borderRadius: 'var(--radius-sharp)',
                                          fontWeight: '600',
                                          fontFamily: 'var(--font-body)'
                                        }}
                                      >
                                        Remove Student
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section B: Registered (Not Applied) */}
                        <div>
                          <h4 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '18px',
                            color: 'var(--text-primary)',
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            Registered (Not Applied)
                            <span style={{ fontSize: '12px', background: 'var(--text-secondary)', color: 'var(--bg-card)', padding: '2px 8px', borderRadius: '12px' }}>
                              {notAppliedStudents.length}
                            </span>
                          </h4>

                          {notAppliedStudents.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem 0' }}>No unregistered/unapplied students.</p>
                          ) : (
                            <div className="tpo-app-cards-container">
                              {notAppliedStudents.map(({ student, totalApplications }) => (
                                <div
                                  key={student._id}
                                  className="tpo-app-card"
                                  style={{ borderLeft: '4px solid var(--border)' }}
                                >
                                  {/* Left Section */}
                                  <div className="tpo-app-card-left">
                                    <h4 className="tpo-app-card-name">{student.name || 'N/A'}</h4>
                                    <div className="tpo-app-card-meta">
                                      <span className="tpo-app-card-branch">{student.branch || 'N/A'}</span>
                                      {student.degreeCGPA && (
                                        <span className="tpo-app-card-cgpa">CGPA: {student.degreeCGPA}</span>
                                      )}
                                    </div>
                                    <span className="tpo-app-card-email">{student.email || 'N/A'}</span>
                                  </div>

                                  {/* Middle Section */}
                                  <div className="tpo-app-card-middle" style={{ gap: '6px' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                      <strong>College:</strong> {student.collegeName || 'N/A'}
                                    </span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      Joined: {new Date(student.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </span>
                                  </div>

                                  {/* Right Section */}
                                  <div className="tpo-app-card-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      backgroundColor: 'var(--bg-surface)',
                                      color: 'var(--text-secondary)',
                                      padding: '3px 8px',
                                      borderRadius: '4px'
                                    }}>
                                      No applications yet
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                      <button
                                        onClick={() => handleOpenProfileModal(student._id)}
                                        className="tpo-app-card-btn"
                                        style={{ margin: 0, padding: '6px 12px', fontSize: '12px' }}
                                      >
                                        View Profile
                                      </button>
                                      <button
                                        onClick={() => {
                                          setConfirmModal({
                                            isOpen: true,
                                            title: 'Confirm Student Removal',
                                            message: `Are you sure you want to remove student "${student.name || 'this student'}"? This will delete ALL their applications and data permanently.`,
                                            onConfirm: () => handleRemoveStudent(student._id)
                                          });
                                        }}
                                        style={{
                                          border: '1px solid var(--danger)',
                                          color: 'var(--danger)',
                                          background: 'transparent',
                                          padding: '6px 12px',
                                          fontSize: '12px',
                                          cursor: 'pointer',
                                          borderRadius: 'var(--radius-sharp)',
                                          fontWeight: '600',
                                          fontFamily: 'var(--font-body)'
                                        }}
                                      >
                                        Remove Student
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

          </>
        )}
      </main>

      {/* Student Profile Modal Overlay */}
      {selectedStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--slate-light)',
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'left'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--slate-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              {profileModalLoading ? (
                <h3 style={{ margin: 0, color: 'var(--navy-deep)' }}>Loading Profile...</h3>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '24px' }}>
                      {studentProfileData?.student?.name}
                    </h3>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: studentProfileData?.student?.verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: studentProfileData?.student?.verified ? '#10b981' : '#f59e0b',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      {studentProfileData?.student?.verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </div>
                  <span style={{ color: 'var(--slate)', fontSize: '0.9rem' }}>
                    {studentProfileData?.student?.email}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentProfileData(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate)',
                  fontSize: '24px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: 0
                }}
              >
                &times;
              </button>
            </div>

            {profileModalLoading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <span className="spinner"></span>
                <p style={{ marginTop: '1rem', color: 'var(--slate)' }}>Fetching profile details...</p>
              </div>
            ) : (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Academic Info */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', borderBottom: '1px solid var(--slate-light)', paddingBottom: '6px' }}>
                    Academic Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
                    <div><span style={{ color: 'var(--slate)' }}>Branch:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.branch || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--slate)' }}>Degree CGPA:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.degreeCGPA || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--slate)' }}>Passed Out Year:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.passedOutYear || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--slate)' }}>10th Percentage:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.tenthPercentage ? `${studentProfileData.student.tenthPercentage}%` : 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--slate)' }}>12th Percentage:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.twelfthPercentage ? `${studentProfileData.student.twelfthPercentage}%` : 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--slate)' }}>Active Backlogs:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.backlogs !== undefined ? studentProfileData.student.backlogs : 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--slate)' }}>College Name:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.collegeName || 'N/A'}</strong></div>
                    <div><span style={{ color: 'var(--slate)' }}>Student ID / Roll No:</span> <strong style={{ color: 'var(--navy-mid)' }}>{studentProfileData?.student?.studentId || 'N/A'}</strong></div>
                  </div>
                  {studentProfileData?.student?.bio && (
                    <div style={{ marginTop: '14px', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--slate)' }}>Bio:</span>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--navy-deep)', lineHeight: 1.5 }}>{studentProfileData.student.bio}</p>
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', borderBottom: '1px solid var(--slate-light)', paddingBottom: '6px' }}>
                    Skills & Core Competencies
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {studentProfileData?.student?.skills && studentProfileData.student.skills.length > 0 ? (
                      studentProfileData.student.skills.map((skill, idx) => (
                        <span key={idx} style={{
                          backgroundColor: 'rgba(27, 38, 59, 0.05)',
                          border: '1px solid var(--navy-mid)',
                          color: 'var(--navy-mid)',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--slate)', fontSize: '0.9rem', fontStyle: 'italic' }}>No skills listed.</span>
                    )}
                  </div>
                </div>

                {/* Resume Download */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', borderBottom: '1px solid var(--slate-light)', paddingBottom: '6px' }}>
                    Resume Document
                  </h4>
                  {studentProfileData?.student?.resumeBase64 ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px dashed var(--slate-light)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--slate-bg)'
                    }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--navy-deep)' }}>
                        📄 {studentProfileData.student.resumeFileName || 'resume.pdf'}
                      </span>
                      <button
                        onClick={() => handleDownloadResumeBase64(studentProfileData.student.resumeBase64, studentProfileData.student.resumeFileName)}
                        className="hr-btn-outline"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          width: 'auto',
                          cursor: 'pointer'
                        }}
                      >
                        Download Resume
                      </button>
                    </div>
                  ) : studentProfileData?.student?.resumeFileName ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      border: '1px dashed var(--slate-light)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--slate-bg)'
                    }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--navy-deep)' }}>
                        📄 {studentProfileData.student.resumeFileName}
                      </span>
                      <button
                        onClick={() => handleDownloadResume(studentProfileData.student._id, studentProfileData.student.resumeFileName)}
                        className="hr-btn-outline"
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          width: 'auto',
                          cursor: 'pointer'
                        }}
                      >
                        Download Resume
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--slate)', fontSize: '0.9rem', fontStyle: 'italic' }}>No resume uploaded.</span>
                  )}
                </div>

                {/* Application History */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', borderBottom: '1px solid var(--slate-light)', paddingBottom: '6px' }}>
                    Application History
                  </h4>
                  {studentProfileData?.applications && studentProfileData.applications.length > 0 ? (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--slate-light)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--slate-bg)', borderBottom: '1px solid var(--slate-light)' }}>
                            <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: 'var(--navy-deep)' }}>JD Title</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: 'var(--navy-deep)' }}>Company</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: 'var(--navy-deep)' }}>Status</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontWeight: '600', color: 'var(--navy-deep)' }}>Applied Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentProfileData.applications.map((app, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < studentProfileData.applications.length - 1 ? '1px solid var(--slate-light)' : 'none' }}>
                              <td style={{ padding: '10px', fontWeight: '600', color: 'var(--navy-mid)' }}>{app.jobDescription?.title || 'N/A'}</td>
                              <td style={{ padding: '10px' }}>{app.jobDescription?.companyName || 'N/A'}</td>
                              <td style={{ padding: '10px' }}>
                                <span className={`sd-status-badge ${getStatusClass(app.status)}`} style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                  {app.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px' }}>
                                {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--slate)', fontSize: '0.9rem', fontStyle: 'italic' }}>No job applications found.</span>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--slate-light)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--slate-bg)',
              borderRadius: '0 0 12px 12px'
            }}>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentProfileData(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.5rem 1.5rem', width: 'auto', borderRadius: '4px' }}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-display)', fontSize: '20px' }}>
              {confirmModal.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                style={{
                  background: 'var(--danger)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TPODashboard;
