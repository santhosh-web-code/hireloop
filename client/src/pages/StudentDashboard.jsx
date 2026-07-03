import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { UploadCloud } from 'lucide-react';
import './StudentDashboard.css';

const MAX_ATTEMPTS = 3;

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [eligibleJDs, setEligibleJDs] = useState([]);
  const [ineligibleJDs, setIneligibleJDs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('available');
  const [applyingId, setApplyingId] = useState(null);
  const [applySuccessId, setApplySuccessId] = useState(null);
  const [selectedFeedbackApp, setSelectedFeedbackApp] = useState(null);

  // New Apply Flow States
  const [profileResumeText, setProfileResumeText] = useState('');
  const [profileResumeBase64, setProfileResumeBase64] = useState('');
  const [profileResumeName, setProfileResumeName] = useState('');
  const [profileResumeType, setProfileResumeType] = useState('');
  const [useProfileResume, setUseProfileResume] = useState(true);
  const [uploadedResumeFile, setUploadedResumeFile] = useState(null);
  const [uploadedResumeBase64, setUploadedResumeBase64] = useState('');
  const [uploadedResumeName, setUploadedResumeName] = useState('');
  const [uploadedResumeType, setUploadedResumeType] = useState('');

  const [selectedApplyJD, setSelectedApplyJD] = useState(null);
  const [applyResumeText, setApplyResumeText] = useState('');
  const [customAnswers, setCustomAnswers] = useState([]);
  const [modalError, setModalError] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);
  const [showAssessmentNotice, setShowAssessmentNotice] = useState(false);
  const [assessmentNoticeId, setAssessmentNoticeId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [jdRes, appRes, profileRes] = await Promise.all([
        api.get('/student/eligible-jds'),
        api.get('/student/my-applications'),
        api.get('/student/profile').catch(() => null)
      ]);
      setEligibleJDs(jdRes.data.eligibleJDs || []);
      setIneligibleJDs(jdRes.data.ineligibleJDs || []);
      setMyApplications(appRes.data || []);
      if (profileRes && profileRes.data) {
        setProfileResumeText(profileRes.data.resumeText || '');
        setProfileResumeBase64(profileRes.data.resumeBase64 || '');
        setProfileResumeName(profileRes.data.resumeFileName || '');
        setProfileResumeType(profileRes.data.resumeFileType || '');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadDocument = async (jdId, documentName, documentFileType) => {
    try {
      const response = await api.get(`/jd/document/${jdId}`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: documentFileType || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download company document.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleApply = async (jdId) => {
    setApplyingId(jdId);
    setError('');
    try {
      await api.post(`/student/apply/${jdId}`);
      
      // Show success text temporarily for 2 seconds
      setApplySuccessId(jdId);
      setTimeout(() => {
        setApplySuccessId(null);
      }, 2000);

      // Refresh applications list
      const appRes = await api.get('/student/my-applications');
      setMyApplications(appRes.data || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to apply. Please try again.');
    } finally {
      setApplyingId(null);
    }
  };

  const openApplyModal = (jd) => {
    console.log("Selected JD customQuestions:", jd.customQuestions);
    setSelectedApplyJD(jd);
    setApplyResumeText(profileResumeText);
    
    // Set default flags for resume in modal
    setUseProfileResume(!!profileResumeBase64);
    setUploadedResumeFile(null);
    setUploadedResumeBase64('');
    setUploadedResumeName('');
    setUploadedResumeType('');

    const questions = jd.customQuestions || [];
    setCustomAnswers(questions.map(q => ({
      questionText: q.questionText,
      answer: ''
    })));
    setModalError('');
    setSubmittingApply(false);
  };

  const convertToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // strip data:...prefix
    reader.onerror = reject;
  });

  const handleModalFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type (.pdf, .doc, .docx)
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
      setModalError('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
      setUploadedResumeFile(null);
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setModalError('File size exceeds the 5MB limit.');
      setUploadedResumeFile(null);
      return;
    }

    setModalError('');
    setUploadedResumeFile(file);
    try {
      const base64Str = await convertToBase64(file);
      setUploadedResumeBase64(base64Str);
      setUploadedResumeName(file.name);
      setUploadedResumeType(file.type);
    } catch (err) {
      console.error(err);
      setModalError('Failed to convert resume file.');
    }
  };

  const handleModalApplySubmit = async (e) => {
    e.preventDefault();
    setSubmittingApply(true);
    setModalError('');

    // Validate Resume
    if (useProfileResume) {
      if (!profileResumeBase64) {
        setModalError('Please upload a resume before applying.');
        setSubmittingApply(false);
        return;
      }
    } else {
      if (!uploadedResumeBase64) {
        setModalError('Please upload a resume file before applying.');
        setSubmittingApply(false);
        return;
      }
    }

    // Validate isRequired questions
    const questions = selectedApplyJD.customQuestions || [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const ans = customAnswers[i]?.answer || '';
      if (q.isRequired && ans.trim() === '') {
        setModalError('Please answer all required questions.');
        setSubmittingApply(false);
        return;
      }
    }

    try {
      const payload = {
        resumeText: applyResumeText,
        customAnswers,
        useProfileResume
      };

      if (!useProfileResume) {
        payload.resumeBase64 = uploadedResumeBase64;
        payload.resumeFileName = uploadedResumeName;
        payload.resumeFileType = uploadedResumeType;
      }

      const res = await api.post(`/student/apply/${selectedApplyJD._id}`, payload);
      const data = res.data;
      
      // Close modal
      setSelectedApplyJD(null);

      // Show success text temporarily for 2 seconds
      setApplySuccessId(selectedApplyJD._id);
      setTimeout(() => {
        setApplySuccessId(null);
      }, 2000);

      // Refresh applications list
      const appRes = await api.get('/student/my-applications');
      setMyApplications(appRes.data || []);

      // Check if screening assessment is required
      if (data.assessmentRequired && data.assessmentId) {
        setAssessmentNoticeId(selectedApplyJD._id);
        setShowAssessmentNotice(true);
      }
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmittingApply(false);
    }
  };

  const isAlreadyApplied = (jdId) => {
    return myApplications.some(app => app.jobDescription?._id === jdId);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Selected':
        return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Rejected':
        return { backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' };
      case 'Shortlisted':
        return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
      case 'Interview Scheduled':
        return { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
      default:
        return { backgroundColor: 'var(--slate-bg)', color: 'var(--text-secondary)' };
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Selected':
        return 'selected';
      case 'Rejected':
        return 'rejected';
      case 'Shortlisted':
        return 'shortlisted';
      case 'Interview Scheduled':
        return 'interview-scheduled';
      default:
        return 'applied';
    }
  };

  return (
    <div className="app-container">
      <Navbar title="Student Dashboard" subtitle="Explore opportunities, apply for jobs, and take mock interviews" />

      <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>

        {/* Tab Buttons */}
        <div className="sd-tabs-container">
          <button
            onClick={() => setActiveTab('available')}
            className={`sd-tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          >
            Available Jobs
          </button>
          <button
            onClick={() => setActiveTab('myApplications')}
            className={`sd-tab-btn ${activeTab === 'myApplications' ? 'active' : ''}`}
          >
            My Applications
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loader-container">
            <span className="spinner"></span>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: AVAILABLE JOBS */}
            {activeTab === 'available' && (
              <div>
                {/* Eligible Jobs */}
                <div className="panel-card" style={{ marginBottom: '2.5rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Eligible Jobs ({eligibleJDs.length})
                  </h3>
                  {eligibleJDs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No eligible jobs available at the moment.</p>
                  ) : (
                    <div className="dashboard-grid">
                      {eligibleJDs.map((jd) => (
                        <div key={jd._id} className="sd-jd-card-eligible">
                          <h4 className="sd-jd-title">{jd.title}</h4>
                          <h5 className="sd-jd-company">{jd.companyName}</h5>
                          
                          <div className="sd-skills-container" style={{ marginBottom: '12px' }}>
                            <span className="sd-pill">💼 {jd.package || 'Not specified'}</span>
                            <span className="sd-pill">📍 {jd.location || 'Remote'}</span>
                          </div>

                          <p style={{ fontSize: '0.9rem', color: 'var(--slate)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {jd.description}
                          </p>

                          <div className="sd-skills-container">
                            {jd.requiredSkills.map((skill, idx) => (
                              <span key={idx} className="sd-skill-tag">{skill}</span>
                            ))}
                          </div>

                          {jd.documentName && (
                            <button
                              type="button"
                              onClick={() => handleDownloadDocument(jd._id, jd.documentName, jd.documentFileType)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--navy-mid)',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: 0,
                                marginTop: '10px',
                                textDecoration: 'underline'
                              }}
                            >
                              📄 View Company Document
                            </button>
                          )}

                          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--slate-light)', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1rem' }}>
                              <span>Min CGPA: <strong>{jd.minCGPA}</strong></span>
                              <span>Max Backlogs: <strong>{jd.maxBacklogs}</strong></span>
                            </div>
                            
                            {isAlreadyApplied(jd._id) ? (
                              <button className="sd-btn-applied-disabled" disabled>
                                Already Applied
                              </button>
                            ) : (
                              <button
                                onClick={() => openApplyModal(jd)}
                                className="sd-btn-apply"
                              >
                                {applySuccessId === jd._id ? 'Applied!' : 'Apply Now'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ineligible Jobs */}
                <div className="panel-card">
                  <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e' }}></span>
                    Ineligible Jobs ({ineligibleJDs.length})
                  </h3>
                  {ineligibleJDs.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No ineligible jobs found.</p>
                  ) : (
                    <div className="dashboard-grid">
                      {ineligibleJDs.map((jd) => (
                        <div key={jd._id} className="sd-jd-card-ineligible">
                          <h4 className="sd-jd-title">{jd.title}</h4>
                          <h5 className="sd-jd-company">{jd.companyName}</h5>
                          
                          <div className="sd-skills-container" style={{ marginBottom: '12px' }}>
                            <span className="sd-pill">💼 {jd.package || 'Not specified'}</span>
                            <span className="sd-pill">📍 {jd.location || 'Remote'}</span>
                          </div>

                          <div className="sd-skills-container">
                            {jd.requiredSkills.map((skill, idx) => (
                              <span key={idx} className="sd-skill-tag">{skill}</span>
                            ))}
                          </div>

                          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--slate-light)', paddingTop: '1rem' }}>
                            <p className="sd-ineligible-reason-title">
                              Reasons for Ineligibility:
                            </p>
                            <ul className="sd-ineligible-reasons-list">
                              {jd.reasons.map((reason, idx) => (
                                <li key={idx}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MY APPLICATIONS */}
            {activeTab === 'myApplications' && (
              <div className="panel-card">
                <h3 style={{ marginBottom: '1.5rem' }}>My Applications ({myApplications.length})</h3>
                {myApplications.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>You haven't applied for any jobs yet.</p>
                ) : (
                  <div className="sd-table-wrapper">
                    <table className="sd-table">
                      <thead>
                        <tr>
                          <th>Job Position</th>
                          <th>Company</th>
                          <th>Package</th>
                          <th>Applied Date</th>
                          <th>Status</th>
                          <th>Mock Interview</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myApplications.map((app) => (
                          <tr key={app._id}>
                            <td data-label="Job Position" style={{ fontWeight: '600' }}>{app.jobDescription?.title || 'N/A'}</td>
                            <td data-label="Company">{app.jobDescription?.companyName || 'N/A'}</td>
                            <td data-label="Package">{app.jobDescription?.package || 'N/A'}</td>
                            <td data-label="Applied Date">
                              {new Date(app.appliedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td data-label="Status">
                              <span className={`sd-status-badge ${getStatusClass(app.status)}`}>
                                {app.status}
                              </span>
                            </td>
                            <td data-label="Mock Interview" style={{ fontWeight: '600' }}>
                              {app.mockInterviewScore !== null ? (
                                <span style={{ color: 'var(--navy-mid)' }}>{app.mockInterviewScore}/100</span>
                              ) : (
                                <span style={{ color: 'var(--slate)', fontStyle: 'italic' }}>Not taken</span>
                              )}
                            </td>
                            <td data-label="Action">
                              {(() => {
                                const attemptsUsed = app.mockInterviewAttempts || 0;
                                const canRetake = attemptsUsed < MAX_ATTEMPTS;
                                const hasScore = app.mockInterviewScore !== null;

                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'stretch' }}>
                                    {app.jobDescription?.assessmentEnabled && !app.assessmentAttempted ? (
                                      <button
                                        onClick={() => navigate(`/assessment/${app.jobDescription?._id}`)}
                                        className="sd-btn-table-action"
                                        style={{ backgroundColor: 'var(--accent-gold, #f59e0b)', color: 'white' }}
                                      >
                                        Take Assessment
                                      </button>
                                    ) : (
                                      <>
                                        {hasScore && (
                                          <button
                                            onClick={() => setSelectedFeedbackApp(app)}
                                            className="sd-btn-table-action"
                                            style={{
                                              border: '1px solid var(--navy-mid)',
                                              color: 'var(--navy-mid)',
                                              backgroundColor: 'var(--card-bg)',
                                              padding: '8px 12px',
                                              fontSize: '13px',
                                              fontWeight: '600',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            View Feedback
                                          </button>
                                        )}

                                        {canRetake ? (
                                          <button
                                            onClick={() => navigate(`/mock-interview/${app.jobDescription?._id}`)}
                                            className="sd-btn-table-action"
                                          >
                                            {attemptsUsed === 0 ? "Take Mock Interview" : `Retake (Attempt ${attemptsUsed + 1}/3)`}
                                          </button>
                                        ) : (
                                          <span style={{ fontSize: '12px', color: 'var(--slate)', fontStyle: 'italic', textAlign: 'center' }}>
                                            Max attempts reached (3/3)
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* View Feedback Modal */}
      {selectedFeedbackApp && (
        <div className="sd-modal-overlay" onClick={() => setSelectedFeedbackApp(null)}>
          <div className="sd-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="sd-modal-title">
              Mock Interview Feedback
            </h3>
            
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--slate)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Overall Score
              </h4>
              <div 
                className="sd-score-badge" 
                style={{ 
                  '--percentage': `${selectedFeedbackApp.mockInterviewScore}%`
                }}
              >
                <div className="sd-score-badge-inner">
                  <span className="sd-modal-score-num">
                    {selectedFeedbackApp.mockInterviewScore}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h4 className="sd-modal-section-title">Evaluation Feedback</h4>
              <p className="sd-modal-feedback-text">
                {selectedFeedbackApp.mockInterviewFeedback || 'No feedback details available.'}
              </p>
            </div>

            {selectedFeedbackApp.strengths && selectedFeedbackApp.strengths.length > 0 && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <h4 className="sd-modal-heading-strengths">✓ Key Strengths</h4>
                <ul className="sd-modal-list sd-modal-list-success">
                  {selectedFeedbackApp.strengths.map((str, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{str}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedFeedbackApp.improvements && selectedFeedbackApp.improvements.length > 0 && (
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <h4 className="sd-modal-heading-improvements">⚠ Areas to Improve</h4>
                <ul className="sd-modal-list sd-modal-list-warning">
                  {selectedFeedbackApp.improvements.map((imp, idx) => (
                    <li key={idx} style={{ marginBottom: '0.25rem' }}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setSelectedFeedbackApp(null)}
              className="sd-modal-close-btn"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {selectedApplyJD && (
        <div className="sd-modal-overlay" onClick={() => setSelectedApplyJD(null)}>
          <div className="sd-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h3 className="sd-modal-title">Apply for {selectedApplyJD.title}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate)', marginBottom: '1.5rem' }}>
              at {selectedApplyJD.companyName}
            </p>

            {modalError && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{modalError}</div>}

            <form onSubmit={handleModalApplySubmit}>
              {/* Resume Section */}
              <div className="profile-form-group full-width" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <label className="profile-label" style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Resume Document
                </label>

                {profileResumeBase64 && useProfileResume ? (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '6px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: '600', fontSize: '0.9rem' }}>
                      <span>✓</span>
                      <span>Your saved resume will be submitted</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '4px', wordBreak: 'break-all' }}>
                      {profileResumeName || 'resume.pdf'}
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseProfileResume(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--navy-mid)', cursor: 'pointer', padding: 0, marginTop: '8px', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'underline' }}
                    >
                      Use different resume for this application
                    </button>
                  </div>
                ) : (
                  <div>
                    {profileResumeBase64 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUseProfileResume(true);
                          setUploadedResumeFile(null);
                          setUploadedResumeBase64('');
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--navy-mid)', cursor: 'pointer', padding: 0, marginBottom: '12px', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'underline', display: 'block' }}
                      >
                        ← Use saved resume
                      </button>
                    )}
                    
                    <div
                      className="resume-upload-zone"
                      onClick={() => document.getElementById('modalResumeInput').click()}
                      style={{ padding: '20px 16px', borderStyle: 'dashed' }}
                    >
                      <UploadCloud size={24} style={{ color: 'var(--slate)' }} />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy-deep)' }}>
                        Click to select resume file
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--slate)' }}>
                        Supports PDF, DOC, DOCX up to 5MB
                      </span>
                      <input
                        type="file"
                        id="modalResumeInput"
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx"
                        onChange={handleModalFileChange}
                      />
                    </div>

                    {uploadedResumeFile && (
                      <div className="resume-file-info" style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span>📄</span>
                          <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--navy-deep)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {uploadedResumeFile.name}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--slate)' }}>
                              {(uploadedResumeFile.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedResumeFile(null);
                            setUploadedResumeBase64('');
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cover Note Section */}
              <div className="profile-form-group full-width" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <label className="profile-label" style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Cover Note / Summary (Optional)
                </label>
                <textarea
                  className="profile-input"
                  style={{ minHeight: '100px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  value={applyResumeText}
                  onChange={(e) => setApplyResumeText(e.target.value)}
                  placeholder="Add any additional notes, summary, or details for the recruiter..."
                />
              </div>

              {/* Screening Questions Section */}
              {selectedApplyJD.customQuestions && selectedApplyJD.customQuestions.length > 0 && (
                <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--slate-light)', paddingTop: '1.5rem', textAlign: 'left' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '16px' }}>
                    Screening Questions
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {selectedApplyJD.customQuestions.map((q, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--navy-deep)' }}>
                            {q.questionText}
                          </span>
                          {q.isRequired && (
                            <span style={{
                              fontSize: '11px',
                              backgroundColor: 'rgba(244, 63, 94, 0.1)',
                              color: '#f43f5e',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              Required
                            </span>
                          )}
                        </div>
                        <textarea
                          className="profile-input"
                          style={{ minHeight: '80px', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                          value={customAnswers[idx]?.answer || ''}
                          onChange={(e) => {
                            const newAnswers = [...customAnswers];
                            newAnswers[idx].answer = e.target.value;
                            setCustomAnswers(newAnswers);
                          }}
                          placeholder={q.placeholder || "Enter your answer here..."}
                          required={q.isRequired}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedApplyJD(null)}
                  className="sd-modal-close-btn"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sd-btn-table-action"
                  style={{ flex: 1, padding: '12px' }}
                  disabled={submittingApply}
                >
                  {submittingApply ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assessment Notice Modal */}
      {showAssessmentNotice && (
        <div className="sd-modal-overlay" onClick={() => { setShowAssessmentNotice(false); setAssessmentNoticeId(null); }}>
          <div className="sd-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', color: 'var(--accent-gold)', marginBottom: '1rem' }}>📝</div>
            <h3 className="sd-modal-title" style={{ borderBottom: 'none', marginBottom: '8px' }}>Screening Assessment Required</h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--slate)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              This job has a screening assessment. Complete it to improve your chances!
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setShowAssessmentNotice(false); setAssessmentNoticeId(null); }}
                className="sd-modal-close-btn"
                style={{ flex: 1 }}
              >
                Later
              </button>
              <button
                onClick={() => {
                  const id = assessmentNoticeId;
                  setShowAssessmentNotice(false);
                  setAssessmentNoticeId(null);
                  navigate(`/assessment/${id}`);
                }}
                className="sd-btn-table-action"
                style={{ flex: 1 }}
              >
                Take Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
