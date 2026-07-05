import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Search, Clipboard, Bell, Edit, Trash2, ShieldAlert,
  ShieldCheck, Download, ChevronLeft, ChevronRight, User, Check, AlertTriangle
} from 'lucide-react';
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
  
  // Student Management System (SMS) States
  const [editStudentData, setEditStudentData] = useState(null);
  const [smsSearchQuery, setSmsSearchQuery] = useState('');
  const [smsBranchFilter, setSmsBranchFilter] = useState('All');
  const [smsYearFilter, setSmsYearFilter] = useState('All');
  const [smsCgpaFilter, setSmsCgpaFilter] = useState('All');
  const [smsEligibleFilter, setSmsEligibleFilter] = useState('All');
  const [smsPlacementFilter, setSmsPlacementFilter] = useState('All');
  const [smsAppliedFilter, setSmsAppliedFilter] = useState('All');
  const [smsSortBy, setSmsSortBy] = useState('Newest');
  const [smsCurrentPage, setSmsCurrentPage] = useState(1);
  const [smsRowsPerPage, setSmsRowsPerPage] = useState(10);
  
  // Notification Center States
  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [notifReadFilter, setNotifReadFilter] = useState('All');
  const [notifFieldFilter, setNotifFieldFilter] = useState('All');
  const [expandedNotifs, setExpandedNotifs] = useState({});
  const [eligibilityHistory, setEligibilityHistory] = useState([]);
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
        api.get('/tpo/students'),
        api.get('/tpo/notifications'),
        api.get('/tpo/eligibility-history'),
      ]);
      setStats(statsRes.data);
      setPendingHRs(hrsRes.data || []);
      setPendingJDs(jdsRes.data || []);
      setAllApplications(appsRes.data || []);
      setApprovedHRs(activeHRsRes.data || []);
      setAllStudents(studentsRes.data || []);
      setNotifications(notificationsRes.data || []);
      setEligibilityHistory(historyRes.data || []);
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

  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.delete(`/tpo/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n._id !== notificationId));
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

  const calculateCompletion = (s) => {
    if (!s) return 0;
    const fields = ['name', 'email', 'studentId', 'branch', 'cgpa', 'tenthPercent', 'twelfthPercent', 'passedOutYear', 'bio', 'skills', 'resumeBase64'];
    const filled = fields.filter(f => {
      if (f === 'skills') return s.skills && s.skills.length > 0;
      return s[f] !== null && s[f] !== undefined && s[f] !== '';
    }).length;
    return Math.round((filled / fields.length) * 100);
  };

  const handleToggleStudentStatus = async (studentId, currentDisabled) => {
    try {
      const response = await api.put(`/tpo/student/${studentId}`, { isDisabled: !currentDisabled });
      const updatedItem = response.data;
      
      // Update allStudents list state
      setAllStudents(allStudents.map(item => item.student._id === studentId ? {
        ...item,
        student: updatedItem.student
      } : item));
      
      setNotificationMessage(`Student account status updated successfully.`);
      setTimeout(() => setNotificationMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update student status.');
    }
  };

  const handleEditStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/tpo/student/${editStudentData._id}`, editStudentData);
      const updatedItem = response.data;
      
      // Update allStudents list state
      setAllStudents(allStudents.map(item => item.student._id === editStudentData._id ? {
        ...item,
        student: updatedItem.student,
        applications: updatedItem.applications
      } : item));
      
      setEditStudentData(null);
      setNotificationMessage('Student details updated successfully.');
      setTimeout(() => setNotificationMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update student profile.');
    }
  };

  const exportToCSV = (data) => {
    // Generate headers
    const headers = [
      'Name', 'Roll Number', 'Email', 'Phone', 'Branch', 'Year', 'CGPA', 
      'Resume Uploaded', 'Disabled', 'Placement Status', 'Applications Count', 'Last Updated'
    ];
    
    const rows = data.map(item => {
      const student = item.student || {};
      const isPlaced = item.applications.some(app => app.status === 'Selected') ? 'Placed' : 'Not Placed';
      return [
        `"${student.name || ''}"`,
        `"${student.studentId || ''}"`,
        `"${student.email || ''}"`,
        `"${student.phone || ''}"`,
        `"${student.branch || ''}"`,
        `"${student.passedOutYear || ''}"`,
        student.cgpa || student.degreeCGPA || 'N/A',
        (student.resumeBase64 || student.resumeFileName) ? 'Yes' : 'No',
        student.isDisabled ? 'Yes' : 'No',
        isPlaced,
        item.totalApplications,
        new Date(student.updatedAt || student.createdAt).toLocaleDateString()
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const res = await api.get(`/tpo/student/${studentId}`);
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
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar title="TPO Dashboard" subtitle="Approve HR credentials, JDs, and monitor college stats" />

      <div className="tpo-layout-wrapper">
        {/* Left Sidebar */}
        <aside className="tpo-sidebar">
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeTab === 'overview' ? 'var(--navy-mid)' : 'transparent',
              color: activeTab === 'overview' ? 'white' : 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              textAlign: 'left',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('pendingHRs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeTab === 'pendingHRs' ? 'var(--navy-mid)' : 'transparent',
              color: activeTab === 'pendingHRs' ? 'white' : 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              textAlign: 'left',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            🔑 HR Approvals
            {pendingHRs.length > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px' }}>
                {pendingHRs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pendingJDs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeTab === 'pendingJDs' ? 'var(--navy-mid)' : 'transparent',
              color: activeTab === 'pendingJDs' ? 'white' : 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              textAlign: 'left',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            📋 JD Approvals
            {pendingJDs.length > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px' }}>
                {pendingJDs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('students')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeTab === 'students' ? 'var(--navy-mid)' : 'transparent',
              color: activeTab === 'students' ? 'white' : 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              textAlign: 'left',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            🎓 Students
          </button>
          <button
            onClick={() => setActiveTab('notifications-center')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: activeTab === 'notifications-center' ? 'var(--navy-mid)' : 'transparent',
              color: activeTab === 'notifications-center' ? 'white' : 'var(--text-primary)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              textAlign: 'left',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            🔔 Notifications
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px' }}>
                {notifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>
        </aside>

        {/* Right Content Panel */}
        <main className="tpo-content-panel" style={{ flex: 1, backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', overflowX: 'hidden' }}>

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



        {error && <div className="alert alert-error">{error}</div>}
        {notificationMessage && <div className="alert alert-success">{notificationMessage}</div>}

        {loading ? (
          <div className="loader-container">
            <span className="spinner"></span>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', gap: '2rem', flexDirection: 'row', flexWrap: 'wrap' }} className="tpo-overview-layout">
                {/* Left Column */}
                <div style={{ flex: '2 1 650px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border)',
                      paddingBottom: '10px',
                      marginBottom: '16px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600 }}>
                          All Applications
                        </h3>
                        <span style={{
                          backgroundColor: 'var(--brand)',
                          color: 'var(--text-on-dark)',
                          fontSize: '13px',
                          fontWeight: '600',
                          padding: '2px 10px',
                          borderRadius: '20px'
                        }}>
                          {allApplications.length}
                        </span>
                      </div>

                      {/* SEARCH BAR */}
                      <div style={{ position: 'relative', width: '260px' }}>
                        <Search
                          size={16}
                          style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--slate)',
                            pointerEvents: 'none'
                          }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Search applicant or company..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{
                            width: '100%',
                            paddingLeft: '32px',
                            margin: 0,
                            height: '36px',
                            fontSize: '13px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px'
                          }}
                        />
                      </div>
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
                            textAlign: 'center',
                            padding: '3rem 1.5rem',
                            color: 'var(--text-secondary)'
                          }}>
                            <Clipboard size={48} style={{ strokeWidth: 1, color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No matching applications found.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="tpo-app-cards-container">
                          {filteredApps.map((app) => (
                            <div key={app._id} className="tpo-app-card" style={{ borderLeft: `4px solid ${getStatusBorderColor(app.status)}` }}>
                              {/* LEFT section */}
                              <div className="tpo-app-card-left">
                                <h4 className="tpo-app-card-name">
                                  {app.student?.name || 'N/A'}
                                </h4>
                                <div className="tpo-app-card-meta">
                                  <span className="tpo-app-card-branch">
                                    {app.student?.branch || 'N/A'}
                                  </span>
                                  {app.student?.degreeCGPA && (
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
                {/* Statistics Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div className="stats-card" style={{ borderLeft: '4px solid var(--navy-mid)' }}>
                    <span className="stats-label">Total Registered</span>
                    <span className="stats-val" style={{ color: 'var(--navy-mid)' }}>{allStudents.length}</span>
                  </div>
                  <div className="stats-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <span className="stats-label">Placed Students</span>
                    <span className="stats-val" style={{ color: '#10b981' }}>
                      {allStudents.filter(item => item.applications.some(app => app.status === 'Selected')).length}
                    </span>
                  </div>
                  <div className="stats-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <span className="stats-label">Not Applied</span>
                    <span className="stats-val" style={{ color: '#ef4444' }}>
                      {allStudents.filter(item => item.totalApplications === 0).length}
                    </span>
                  </div>
                </div>

                <div className="panel-card">
                  {/* Title & Actions */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '12px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '22px' }}>
                      Student Directory
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => exportToCSV(allStudents)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-sharp)',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={16} /> Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Search and Filters Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    {/* Search by Name/Roll/Email */}
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search Name, Roll, Email..."
                        value={smsSearchQuery}
                        onChange={(e) => { setSmsSearchQuery(e.target.value); setSmsCurrentPage(1); }}
                        style={{ paddingLeft: '36px', margin: 0, width: '100%' }}
                      />
                    </div>

                    {/* Filter Branch */}
                    <div>
                      <select
                        className="form-select"
                        value={smsBranchFilter}
                        onChange={(e) => { setSmsBranchFilter(e.target.value); setSmsCurrentPage(1); }}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                      >
                        <option value="All">All Branches</option>
                        {Array.from(new Set(allStudents.map(item => item.student?.branch).filter(Boolean))).map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Year */}
                    <div>
                      <select
                        className="form-select"
                        value={smsYearFilter}
                        onChange={(e) => { setSmsYearFilter(e.target.value); setSmsCurrentPage(1); }}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                      >
                        <option value="All">All Graduation Years</option>
                        {Array.from(new Set(allStudents.map(item => item.student?.passedOutYear).filter(Boolean))).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter CGPA range */}
                    <div>
                      <select
                        className="form-select"
                        value={smsCgpaFilter}
                        onChange={(e) => { setSmsCgpaFilter(e.target.value); setSmsCurrentPage(1); }}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                      >
                        <option value="All">All CGPA ranges</option>
                        <option value="9">CGPA &gt;= 9.0</option>
                        <option value="8">CGPA &gt;= 8.0</option>
                        <option value="7">CGPA &gt;= 7.0</option>
                        <option value="6">CGPA &gt;= 6.0</option>
                        <option value="below6">CGPA &lt; 6.0</option>
                      </select>
                    </div>

                    {/* Filter Eligibility */}
                    <div>
                      <select
                        className="form-select"
                        value={smsEligibleFilter}
                        onChange={(e) => { setSmsEligibleFilter(e.target.value); setSmsCurrentPage(1); }}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                      >
                        <option value="All">All Eligibility statuses</option>
                        <option value="Eligible">Eligible (All applied eligible)</option>
                        <option value="Ineligible">Ineligible (Has ineligible apps)</option>
                      </select>
                    </div>

                    {/* Filter Placement Status */}
                    <div>
                      <select
                        className="form-select"
                        value={smsPlacementFilter}
                        onChange={(e) => { setSmsPlacementFilter(e.target.value); setSmsCurrentPage(1); }}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                      >
                        <option value="All">All Placement statuses</option>
                        <option value="Placed">Placed (Selected)</option>
                        <option value="Not Placed">Not Placed</option>
                      </select>
                    </div>

                    {/* Filter Applied Status */}
                    <div>
                      <select
                        className="form-select"
                        value={smsAppliedFilter}
                        onChange={(e) => { setSmsAppliedFilter(e.target.value); setSmsCurrentPage(1); }}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                      >
                        <option value="All">All Applied statuses</option>
                        <option value="Applied">Applied (&gt;= 1 job)</option>
                        <option value="Not Applied">Not Applied (0 jobs)</option>
                      </select>
                    </div>

                    {/* Sort criteria */}
                    <div>
                      <select
                        className="form-select"
                        value={smsSortBy}
                        onChange={(e) => { setSmsSortBy(e.target.value); setSmsCurrentPage(1); }}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                      >
                        <option value="Newest">Sort: Newest Joined</option>
                        <option value="Oldest">Sort: Oldest Joined</option>
                        <option value="Highest CGPA">Sort: Highest CGPA</option>
                        <option value="Lowest CGPA">Sort: Lowest CGPA</option>
                      </select>
                    </div>
                  </div>

                  {/* Grid Table */}
                  {(() => {
                    // Filter logic
                    let processed = allStudents.filter(item => {
                      const student = item.student || {};
                      
                      // Search Query
                      const name = student.name?.toLowerCase() || '';
                      const roll = student.studentId?.toLowerCase() || '';
                      const email = student.email?.toLowerCase() || '';
                      const query = smsSearchQuery.toLowerCase();
                      if (smsSearchQuery && !name.includes(query) && !roll.includes(query) && !email.includes(query)) {
                        return false;
                      }

                      // Branch Filter
                      if (smsBranchFilter !== 'All' && student.branch !== smsBranchFilter) return false;

                      // Year Filter
                      if (smsYearFilter !== 'All' && String(student.passedOutYear) !== smsYearFilter) return false;

                      // CGPA Filter
                      const actualCGPA = student.cgpa || student.degreeCGPA || 0;
                      if (smsCgpaFilter === '9' && actualCGPA < 9) return false;
                      if (smsCgpaFilter === '8' && actualCGPA < 8) return false;
                      if (smsCgpaFilter === '7' && actualCGPA < 7) return false;
                      if (smsCgpaFilter === '6' && actualCGPA < 6) return false;
                      if (smsCgpaFilter === 'below6' && actualCGPA >= 6) return false;

                      // Eligibility Filter
                      const hasIneligible = item.applications.some(app => app.status === 'Not Eligible');
                      if (smsEligibleFilter === 'Eligible' && hasIneligible) return false;
                      if (smsEligibleFilter === 'Ineligible' && !hasIneligible) return false;

                      // Placement status Filter
                      const isPlaced = item.applications.some(app => app.status === 'Selected');
                      if (smsPlacementFilter === 'Placed' && !isPlaced) return false;
                      if (smsPlacementFilter === 'Not Placed' && isPlaced) return false;

                      // Applied status Filter
                      if (smsAppliedFilter === 'Applied' && item.totalApplications === 0) return false;
                      if (smsAppliedFilter === 'Not Applied' && item.totalApplications > 0) return false;

                      return true;
                    });

                    // Sort logic
                    processed.sort((a, b) => {
                      const cgpaA = a.student?.cgpa || a.student?.degreeCGPA || 0;
                      const cgpaB = b.student?.cgpa || b.student?.degreeCGPA || 0;
                      const dateA = new Date(a.student?.createdAt || 0);
                      const dateB = new Date(b.student?.createdAt || 0);

                      if (smsSortBy === 'Highest CGPA') return cgpaB - cgpaA;
                      if (smsSortBy === 'Lowest CGPA') return cgpaA - cgpaB;
                      if (smsSortBy === 'Oldest') return dateA - dateB;
                      return dateB - dateA; // Newest by default
                    });

                    // Pagination logic
                    const totalRows = processed.length;
                    const startIndex = (smsCurrentPage - 1) * smsRowsPerPage;
                    const paginated = processed.slice(startIndex, startIndex + smsRowsPerPage);
                    const totalPages = Math.ceil(totalRows / smsRowsPerPage) || 1;

                    return (
                      <div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="tpo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '12px 16px' }}>Student Info</th>
                                <th style={{ padding: '12px 16px' }}>Branch & Year</th>
                                <th style={{ padding: '12px 16px' }}>Academic details</th>
                                <th style={{ padding: '12px 16px' }}>Resume</th>
                                <th style={{ padding: '12px 16px' }}>Current Status</th>
                                <th style={{ padding: '12px 16px' }}>Placement Status</th>
                                <th style={{ padding: '12px 16px' }}>Applications & Best Scores</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.length === 0 ? (
                                <tr>
                                  <td colSpan="8" style={{ padding: '32px', fontStyle: 'italic', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No registered students found matching criteria.
                                  </td>
                                </tr>
                              ) : (
                                paginated.map(({ student, applications, totalApplications }) => {
                                  const actualCGPA = student.cgpa || student.degreeCGPA || 'N/A';
                                  const isPlaced = applications.some(app => app.status === 'Selected');
                                  const hasResume = !!(student.resumeBase64 || student.resumeFileName);
                                  const bestAssessment = applications.reduce((max, app) => app.assessmentScore > max ? app.assessmentScore : max, 0);
                                  const bestMock = applications.reduce((max, app) => app.mockInterviewScore > max ? app.mockInterviewScore : max, 0);

                                  return (
                                    <tr key={student._id} style={{ borderBottom: '1px solid var(--border)', fontSize: '13.5px' }}>
                                      {/* Student Info */}
                                      <td style={{ padding: '16px 16px' }} data-label="Student Info">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <strong style={{ color: 'var(--navy-deep)', fontSize: '15px' }}>{student.name}</strong>
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Roll: {student.studentId || 'N/A'}</span>
                                          <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>{student.email}</span>
                                          {student.phone && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>📞 {student.phone}</span>}
                                        </div>
                                      </td>

                                      {/* Branch & Year */}
                                      <td style={{ padding: '16px 16px' }} data-label="Branch & Year">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <span className="tpo-app-card-branch" style={{ alignSelf: 'flex-start' }}>{student.branch || 'N/A'}</span>
                                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Grad: {student.passedOutYear || 'N/A'}</span>
                                        </div>
                                      </td>

                                      {/* Academic details */}
                                      <td style={{ padding: '16px 16px' }} data-label="Academic details">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <span>CGPA: <strong>{actualCGPA}</strong></span>
                                          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Backlogs: {student.backlogs || 0}</span>
                                        </div>
                                      </td>

                                      {/* Resume */}
                                      <td style={{ padding: '16px 16px' }} data-label="Resume">
                                        <span style={{
                                          fontSize: '11px',
                                          fontWeight: 'bold',
                                          backgroundColor: hasResume ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                          color: hasResume ? '#10b981' : '#ef4444',
                                          padding: '2px 8px',
                                          borderRadius: '4px'
                                        }}>
                                          {hasResume ? 'Uploaded' : 'Missing'}
                                        </span>
                                      </td>

                                      {/* Current Status */}
                                      <td style={{ padding: '16px 16px' }} data-label="Current Status">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            backgroundColor: student.isDisabled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: student.isDisabled ? '#ef4444' : '#10b981',
                                            padding: '2px 8px',
                                            borderRadius: '4px'
                                          }}>
                                            {student.isDisabled ? 'Disabled' : 'Active'}
                                          </span>
                                          <button
                                            onClick={() => handleToggleStudentStatus(student._id, student.isDisabled)}
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              cursor: 'pointer',
                                              padding: '4px',
                                              color: 'var(--text-secondary)'
                                            }}
                                            title={student.isDisabled ? "Enable User" : "Disable User"}
                                          >
                                            {student.isDisabled ? <ShieldCheck size={18} style={{ color: '#10b981' }} /> : <ShieldAlert size={18} style={{ color: '#ef4444' }} />}
                                          </button>
                                        </div>
                                      </td>

                                      {/* Placement Status */}
                                      <td style={{ padding: '16px 16px' }} data-label="Placement Status">
                                        <span style={{
                                          fontSize: '12px',
                                          fontWeight: 'bold',
                                          backgroundColor: isPlaced ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                          color: isPlaced ? '#10b981' : '#64748b',
                                          padding: '4px 10px',
                                          borderRadius: '20px'
                                        }}>
                                          {isPlaced ? '🎓 Placed' : 'Not Placed'}
                                        </span>
                                      </td>

                                      {/* Applications & Best Scores */}
                                      <td style={{ padding: '16px 16px' }} data-label="Applications & Best Scores">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <span>Applied: <strong>{totalApplications} jobs</strong></span>
                                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Best Assessment: {bestAssessment || 'N/A'}</span>
                                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Best Mock: {bestMock || 'N/A'}</span>
                                        </div>
                                      </td>

                                      {/* Actions */}
                                      <td style={{ padding: '16px 16px', textAlign: 'right' }} data-label="Actions">
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                          <button
                                            onClick={() => handleOpenProfileModal(student._id)}
                                            className="tpo-app-card-btn"
                                            style={{ margin: 0, padding: '4px 8px', fontSize: '12px' }}
                                            title="View Profile"
                                          >
                                            View
                                          </button>
                                          <button
                                            onClick={() => setEditStudentData(student)}
                                            style={{
                                              border: '1px solid var(--border)',
                                              color: 'var(--text-primary)',
                                              background: 'transparent',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                            title="Edit Student"
                                          >
                                            <Edit size={14} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setConfirmModal({
                                                isOpen: true,
                                                title: 'Confirm Student Removal',
                                                message: `Are you sure you want to remove student "${student.name}"? This will delete ALL their applications and data permanently.`,
                                                onConfirm: () => handleRemoveStudent(student._id)
                                              });
                                            }}
                                            style={{
                                              border: '1px solid var(--danger)',
                                              color: 'var(--danger)',
                                              background: 'transparent',
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                            title="Remove Student"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Row */}
                        {totalRows > 0 && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '20px',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}>
                            <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                              Showing {startIndex + 1} to {Math.min(startIndex + smsRowsPerPage, totalRows)} of {totalRows} students
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <select
                                className="form-select"
                                value={smsRowsPerPage}
                                onChange={(e) => { setSmsRowsPerPage(Number(e.target.value)); setSmsCurrentPage(1); }}
                                style={{ margin: 0, height: '36px', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px' }}
                              >
                                <option value={10}>10 rows</option>
                                <option value={20}>20 rows</option>
                                <option value={50}>50 rows</option>
                              </select>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => setSmsCurrentPage(prev => Math.max(prev - 1, 1))}
                                  disabled={smsCurrentPage === 1}
                                  style={{
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: smsCurrentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    cursor: smsCurrentPage === 1 ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <ChevronLeft size={16} />
                                </button>
                                <span style={{ fontSize: '13.5px', padding: '0 8px' }}>
                                  Page {smsCurrentPage} of {totalPages}
                                </span>
                                <button
                                  onClick={() => setSmsCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                  disabled={smsCurrentPage === totalPages}
                                  style={{
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    color: smsCurrentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    cursor: smsCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'notifications-center' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  <div className="stats-card" style={{ borderLeft: '4px solid var(--navy-mid)' }}>
                    <span className="stats-label">Total Notifications</span>
                    <span className="stats-val" style={{ color: 'var(--navy-mid)' }}>{notifications.length}</span>
                  </div>
                  <div className="stats-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <span className="stats-label">Unread Alerts</span>
                    <span className="stats-val" style={{ color: '#ef4444' }}>{notifications.filter(n => !n.isRead).length}</span>
                  </div>
                  <div className="stats-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <span className="stats-label">Profile Audits</span>
                    <span className="stats-val" style={{ color: '#f59e0b' }}>{notifications.filter(n => n.type === 'profile_update').length}</span>
                  </div>
                </div>

                <div className="panel-card">
                  {/* Header Actions */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '12px',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '22px' }}>
                      Notification & Audit Logs
                    </h3>
                    <button
                      onClick={handleMarkAllRead}
                      disabled={notifications.filter(n => !n.isRead).length === 0}
                      className="btn btn-secondary"
                      style={{ margin: 0, width: 'auto', padding: '6px 14px', fontSize: '13px' }}
                    >
                      ✓ Mark All as Read
                    </button>
                  </div>

                  {/* Filter controls */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                  }}>
                    {/* Text Search */}
                    <div style={{ position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search student or message..."
                        value={notifSearchQuery}
                        onChange={(e) => setNotifSearchQuery(e.target.value)}
                        style={{ paddingLeft: '36px', margin: 0, width: '100%' }}
                      />
                    </div>

                    {/* Read status filter */}
                    <div>
                      <select
                        className="form-select"
                        value={notifReadFilter}
                        onChange={(e) => setNotifReadFilter(e.target.value)}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      >
                        <option value="All">All statuses</option>
                        <option value="Unread">Unread Only</option>
                        <option value="Read">Read Only</option>
                      </select>
                    </div>

                    {/* Changed Field Filter */}
                    <div>
                      <select
                        className="form-select"
                        value={notifFieldFilter}
                        onChange={(e) => setNotifFieldFilter(e.target.value)}
                        style={{ margin: 0, width: '100%', height: '42px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      >
                        <option value="All">All fields modified</option>
                        <option value="CGPA">CGPA</option>
                        <option value="Skills">Skills</option>
                        <option value="Branch">Branch</option>
                        <option value="Graduation Year">Graduation Year</option>
                        <option value="Resume File">Resume File</option>
                        <option value="Phone">Phone</option>
                        <option value="Email">Email</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="GitHub">GitHub</option>
                        <option value="Eligibility">Eligibility</option>
                      </select>
                    </div>
                  </div>

                  {/* Notifications Feed */}
                  {(() => {
                    const filtered = notifications.filter(notif => {
                      const name = notif.studentName?.toLowerCase() || '';
                      const roll = notif.rollNumber?.toLowerCase() || '';
                      const msg = notif.message?.toLowerCase() || '';
                      const query = notifSearchQuery.toLowerCase();
                      
                      // Text filter
                      if (query && !name.includes(query) && !roll.includes(query) && !msg.includes(query)) {
                        return false;
                      }

                      // Read status filter
                      if (notifReadFilter === 'Unread' && notif.isRead) return false;
                      if (notifReadFilter === 'Read' && !notif.isRead) return false;

                      // Field filter
                      if (notifFieldFilter !== 'All') {
                        const hasField = notif.changedFields?.some(f => f.includes(notifFieldFilter));
                        if (!hasField) return false;
                      }

                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                          <Bell size={48} style={{ strokeWidth: 1, color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>No audit notifications match the selected criteria.</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {filtered.map((notif) => {
                          const isExpanded = !!expandedNotifs[notif._id];
                          return (
                            <div
                              key={notif._id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                transition: 'all 0.2s',
                                backgroundColor: notif.isRead ? 'var(--bg-card)' : 'rgba(30, 58, 138, 0.02)',
                                borderLeft: notif.isRead ? '4px solid var(--border)' : '4px solid var(--accent)'
                              }}
                            >
                              {/* Header info */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                padding: '16px',
                                flexWrap: 'wrap',
                                gap: '12px'
                              }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                  <div style={{
                                    fontSize: '18px',
                                    backgroundColor: 'var(--bg-surface)',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%'
                                  }}>
                                    👤
                                  </div>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{notif.studentName}</strong>
                                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Roll: {notif.rollNumber || 'N/A'}</span>
                                      <span style={{
                                        fontSize: '10px',
                                        backgroundColor: 'var(--bg-surface)',
                                        color: 'var(--text-secondary)',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontWeight: '600'
                                      }}>
                                        {notif.changedFields?.length || 0} fields
                                      </span>
                                    </div>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                      {notif.message}
                                    </p>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                                      ⏰ {new Date(notif.createdAt).toLocaleString()} ({formatTimeAgo(notif.createdAt)})
                                    </span>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => setExpandedNotifs(prev => ({ ...prev, [notif._id]: !isExpanded }))}
                                    className="tpo-app-card-btn"
                                    style={{ margin: 0, padding: '4px 10px', fontSize: '12px' }}
                                  >
                                    {isExpanded ? 'Hide Diffs' : 'View Diffs'}
                                  </button>
                                  <button
                                    onClick={() => handleMarkAsRead(notif._id)}
                                    style={{
                                      border: '1px solid var(--border)',
                                      background: 'transparent',
                                      color: notif.isRead ? 'var(--text-secondary)' : 'var(--accent)',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title={notif.isRead ? "Mark Unread" : "Mark Read"}
                                  >
                                    <Check size={14} /> {notif.isRead ? 'Read' : 'Unread'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteNotification(notif._id)}
                                    style={{
                                      border: '1px solid var(--danger)',
                                      color: 'var(--danger)',
                                      background: 'transparent',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    title="Delete Log"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              {/* Expanded diff details */}
                              {isExpanded && notif.details && notif.details.length > 0 && (
                                <div style={{
                                  padding: '16px',
                                  backgroundColor: 'var(--bg-surface)',
                                  borderTop: '1px solid var(--border)'
                                }}>
                                  <div style={{ overflowX: 'auto' }}>
                                    <table className="tpo-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', margin: 0 }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                          <th style={{ padding: '8px 12px' }}>Field Parameter</th>
                                          <th style={{ padding: '8px 12px' }}>Old Configuration value</th>
                                          <th style={{ padding: '8px 12px' }}>New Modified value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {notif.details.map((det, index) => (
                                          <tr key={index} style={{ borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 'bold' }}>{det.field}</td>
                                            <td style={{ padding: '10px 12px', color: 'var(--danger)' }}>
                                              {det.oldValue !== undefined && det.oldValue !== null ? String(det.oldValue) : 'N/A'}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: '500' }}>
                                              {det.newValue !== undefined && det.newValue !== null ? String(det.newValue) : 'N/A'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Eligibility History Feed widget at bottom */}
                <div className="panel-card">
                  <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px' }}>
                    Student Eligibility Transition Log
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {eligibilityHistory.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No eligibility shifts logged.
                      </div>
                    ) : (
                      eligibilityHistory.map((item) => (
                        <div
                          key={item._id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-card)'
                          }}
                        >
                          <div style={{
                            fontSize: '18px',
                            backgroundColor: 'var(--bg-surface)',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%'
                          }}>
                            ⚙️
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div>
                                <strong style={{ color: 'var(--text-primary)' }}>{item.student?.name || 'Unknown Student'}</strong>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>({item.student?.branch || 'N/A'} - CGPA: {item.student?.studentId || 'N/A'})</span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(item.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              Applied job status for <strong style={{ color: 'var(--navy-deep)' }}>{item.jobDescription?.companyName} ({item.jobDescription?.title})</strong> shifted:
                              <span style={{
                                textDecoration: 'line-through',
                                color: 'var(--danger)',
                                margin: '0 8px'
                              }}>
                                {item.oldStatus}
                              </span>
                              &rarr;
                              <span style={{
                                color: '#10b981',
                                fontWeight: 'bold',
                                marginLeft: '8px'
                              }}>
                                {item.newStatus}
                              </span>
                            </p>
                            {item.reason && (
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Reason: {item.reason}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </main>
    </div>

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
                {/* Profile Completion & Placement Status Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ fontWeight: '600' }}>Profile Completion</span>
                      <span style={{ fontWeight: '700', color: 'var(--navy-mid)' }}>{calculateCompletion(studentProfileData?.student)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${calculateCompletion(studentProfileData?.student)}%`, height: '100%', backgroundColor: 'var(--navy-mid)', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Applied</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{studentProfileData?.applications?.length || 0}</div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                      <div style={{ fontSize: '11px', color: '#10b981' }}>Selected</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
                        {studentProfileData?.applications?.filter(a => a.status === 'Selected').length || 0}
                      </div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <div style={{ fontSize: '11px', color: '#ef4444' }}>Rejected</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                        {studentProfileData?.applications?.filter(a => a.status === 'Rejected' || a.status === 'Not Eligible').length || 0}
                      </div>
                    </div>
                    <div style={{ padding: '8px', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                      <div style={{ fontSize: '11px', color: '#f59e0b' }}>Pending</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                        {studentProfileData?.applications?.filter(a => a.status !== 'Selected' && a.status !== 'Rejected' && a.status !== 'Not Eligible').length || 0}
                      </div>
                    </div>
                  </div>
                </div>

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

                {/* Student Timeline Progression */}
                <div>
                  <h4 style={{ margin: '0 0 16px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', borderBottom: '1px solid var(--slate-light)', paddingBottom: '6px' }}>
                    Student Activity Timeline
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '8px', borderLeft: '2px solid var(--border)', marginLeft: '12px' }}>
                    {/* Event 1: Registered */}
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{
                        position: 'absolute',
                        left: '-15px',
                        top: '4px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--navy-mid)',
                        border: '3px solid var(--bg-card)'
                      }} />
                      <strong style={{ fontSize: '13px', color: 'var(--navy-deep)' }}>Account Registered</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Joined HireLoop system on {new Date(studentProfileData?.student?.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Event 2: Resume */}
                    {(studentProfileData?.student?.resumeBase64 || studentProfileData?.student?.resumeFileName) && (
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-15px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          border: '3px solid var(--bg-card)'
                        }} />
                        <strong style={{ fontSize: '13px', color: '#10b981' }}>Resume Uploaded</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          File: {studentProfileData.student.resumeFileName || 'resume.pdf'}
                        </span>
                      </div>
                    )}

                    {/* Event 3: Applications */}
                    {studentProfileData?.applications && studentProfileData.applications.length > 0 && (
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-15px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#f59e0b',
                          border: '3px solid var(--bg-card)'
                        }} />
                        <strong style={{ fontSize: '13px', color: '#f59e0b' }}>Job Applications Initiated</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          First application submitted on {new Date(studentProfileData.applications[studentProfileData.applications.length - 1].appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Event 4: Placed */}
                    {studentProfileData?.applications?.some(a => a.status === 'Selected') && (
                      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{
                          position: 'absolute',
                          left: '-15px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          border: '3px solid var(--bg-card)',
                          boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)'
                        }} />
                        <strong style={{ fontSize: '13px', color: '#10b981' }}>🎉 Placed successfully</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Offered accepted for job posting: {studentProfileData.applications.find(a => a.status === 'Selected').jobDescription?.title}
                        </span>
                      </div>
                    )}

                    {/* Eligibility history items */}
                    {eligibilityHistory
                      .filter(item => item.student?._id === studentProfileData?.student?._id)
                      .map((item) => (
                        <div key={item._id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{
                            position: 'absolute',
                            left: '-15px',
                            top: '4px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: item.newStatus === 'Not Eligible' ? '#ef4444' : '#10b981',
                            border: '3px solid var(--bg-card)'
                          }} />
                          <strong style={{ fontSize: '13px', color: item.newStatus === 'Not Eligible' ? '#ef4444' : '#10b981' }}>
                            Eligibility Change: {item.jobDescription?.companyName || 'N/A'}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Status shifted from "{item.oldStatus}" to "{item.newStatus}" due to profile update.
                          </span>
                          {item.reason && (
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Reason: {item.reason}
                            </span>
                          )}
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
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
      {/* Edit Student Modal Overlay */}
      {editStudentData && (
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
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'left'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px' }}>Edit Student Details</h3>
              <button onClick={() => setEditStudentData(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>
            <form onSubmit={handleEditStudentSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Full Name</label>
                <input type="text" className="form-input" value={editStudentData.name || ''} onChange={(e) => setEditStudentData({ ...editStudentData, name: e.target.value })} required />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Email Address</label>
                <input type="email" className="form-input" value={editStudentData.email || ''} onChange={(e) => setEditStudentData({ ...editStudentData, email: e.target.value })} required />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Roll Number / Student ID</label>
                <input type="text" className="form-input" value={editStudentData.studentId || ''} onChange={(e) => setEditStudentData({ ...editStudentData, studentId: e.target.value })} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Phone Number</label>
                <input type="text" className="form-input" value={editStudentData.phone || ''} onChange={(e) => setEditStudentData({ ...editStudentData, phone: e.target.value })} placeholder="e.g. +91 9876543210" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Branch</label>
                  <input type="text" className="form-input" value={editStudentData.branch || ''} onChange={(e) => setEditStudentData({ ...editStudentData, branch: e.target.value })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Graduation Year</label>
                  <input type="number" className="form-input" value={editStudentData.passedOutYear || ''} onChange={(e) => setEditStudentData({ ...editStudentData, passedOutYear: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Degree CGPA</label>
                  <input type="number" step="0.01" className="form-input" value={editStudentData.cgpa || ''} onChange={(e) => setEditStudentData({ ...editStudentData, cgpa: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: '600' }}>Active Backlogs</label>
                  <input type="number" className="form-input" value={editStudentData.backlogs || 0} onChange={(e) => setEditStudentData({ ...editStudentData, backlogs: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditStudentData(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TPODashboard;
