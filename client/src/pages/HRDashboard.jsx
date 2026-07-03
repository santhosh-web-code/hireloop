import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { UploadCloud } from 'lucide-react';
import './HRDashboard.css';

const HRDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [myJDs, setMyJDs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('myJDs');

  // Create Job Description Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [minCGPA, setMinCGPA] = useState('0');
  const [allowedBranches, setAllowedBranches] = useState([]);
  const [maxBacklogs, setMaxBacklogs] = useState('0');
  const [jobPackage, setJobPackage] = useState('');
  const [location, setLocation] = useState('');
  const [customQuestions, setCustomQuestions] = useState([]);

  const addQuestion = () => {
    if (customQuestions.length < 5) {
      setCustomQuestions(prev => [...prev, { questionText: '', placeholder: '', isRequired: true }]);
    }
  };

  const removeQuestion = (index) => {
    setCustomQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const [editingJdId, setEditingJdId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Document upload states
  const [documentFile, setDocumentFile] = useState(null);
  const [documentBase64, setDocumentBase64] = useState('');
  const [documentFileName, setDocumentFileName] = useState('');
  const [documentFileType, setDocumentFileType] = useState('');
  const [existingDocumentName, setExistingDocumentName] = useState('');
  const [showDocUploadArea, setShowDocUploadArea] = useState(true);

  // Screening Assessment states
  const [enableAssessment, setEnableAssessment] = useState(false);
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [assessmentReviewing, setAssessmentReviewing] = useState(false);
  const [assessmentPassingScore, setAssessmentPassingScore] = useState(60);
  const [assessmentTimeLimit, setAssessmentTimeLimit] = useState(30);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const convertToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

  const handleCancelEdit = () => {
    setEditingJdId(null);
    setIsEditMode(false);
    
    // Clear form states
    setTitle('');
    setDescription('');
    setRequiredSkills('');
    setMinCGPA('0');
    setAllowedBranches([]);
    setMaxBacklogs('0');
    setJobPackage('');
    setLocation('');
    setCustomQuestions([]);

    // Clear document states
    setDocumentFile(null);
    setDocumentBase64('');
    setDocumentFileName('');
    setDocumentFileType('');
    setExistingDocumentName('');
    setShowDocUploadArea(true);

    // Clear assessment states
    setEnableAssessment(false);
    setGeneratedQuestions([]);
    setAssessmentPassingScore(60);
    setAssessmentTimeLimit(30);
    setGeneratingAssessment(false);
    setAssessmentReviewing(false);
    
    setActiveTab('myJDs');
  };

  const handleDocFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type (.pdf, .doc, .docx, .ppt, .pptx, .png, .jpg)
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      setCreateError('Invalid document file type. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, PNG, JPG.');
      setDocumentFile(null);
      return;
    }

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setCreateError('Document file size exceeds the 10MB limit.');
      setDocumentFile(null);
      return;
    }

    setCreateError('');
    setDocumentFile(file);
    setDocumentFileName(file.name);
    setDocumentFileType(file.type);
    try {
      const base64Str = await convertToBase64(file);
      setDocumentBase64(base64Str);
    } catch (err) {
      console.error(err);
      setCreateError('Failed to convert document file.');
    }
  };

  const handleJDDocumentDownload = async () => {
    try {
      const res = await api.get(`/jd/document/${editingJdId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: documentFileType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', existingDocumentName || 'document.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setCreateError('Failed to download document file.');
    }
  };

  const handleGenerateQuestions = async () => {
    if (!editingJdId) {
      setCreateError('Please save the JD first, then generate assessment.');
      return;
    }

    setGeneratingAssessment(true);
    setCreateError('');
    try {
      const resGen = await api.get(`/assessment/generate/${editingJdId}`);
      if (resGen.data && resGen.data.questions) {
        setGeneratedQuestions(resGen.data.questions);
        setAssessmentReviewing(true);
      } else {
        setCreateError('Failed to generate questions. Try manual entry.');
      }
    } catch (err) {
      console.error(err);
      setCreateError(err.response?.data?.message || 'Failed to generate assessment questions.');
    } finally {
      setGeneratingAssessment(false);
    }
  };

  // Applicants view states
  const [selectedJDId, setSelectedJDId] = useState(null);
  const [selectedJDTitle, setSelectedJDTitle] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const fetchJDs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/jd/my-jds');
      setMyJDs(response.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch job descriptions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJDs();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBranchChange = (branch) => {
    if (allowedBranches.includes(branch)) {
      setAllowedBranches(allowedBranches.filter((b) => b !== branch));
    } else {
      setAllowedBranches([...allowedBranches, branch]);
    }
  };

  const handleCreateJD = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');

    if (allowedBranches.length === 0) {
      setCreateError('Please select at least one eligible branch.');
      setCreating(false);
      return;
    }

    const payload = {
      title,
      description,
      requiredSkills: requiredSkills.split(',').map((s) => s.trim()).filter((s) => s !== ''),
      minCGPA: parseFloat(minCGPA),
      allowedBranches,
      maxBacklogs: parseInt(maxBacklogs),
      package: jobPackage,
      location,
      customQuestions: customQuestions.filter((q) => q.questionText.trim() !== ''),
      enableAssessment: enableAssessment,
      assessmentPassingScore: parseInt(assessmentPassingScore) || 60,
      assessmentTimeLimit: parseInt(assessmentTimeLimit) || 30,
      assessmentQuestions: assessmentReviewing ? generatedQuestions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : ['A','B','C','D'].indexOf(q.correctAnswer),
        marks: 1,
        explanation: q.explanation || ''
      })) : []
    };

    if (documentBase64) {
      payload.documentBase64 = documentBase64;
      payload.documentName = documentFileName;
      payload.documentFileType = documentFileType;
    } else if (showDocUploadArea && !documentFile) {
      payload.documentBase64 = null;
      payload.documentName = null;
      payload.documentFileType = null;
    }

    try {
      if (isEditMode) {
        const wasApproved = myJDs.find(j => j._id === editingJdId)?.approvalStatus === 'approved';
        await api.put(`/jd/${editingJdId}`, payload);
        if (wasApproved) {
          setCreateSuccess('JD updated and sent for TPO re-approval');
        } else {
          setCreateSuccess('JD updated successfully!');
        }
      } else {
        await api.post('/jd/create', payload);
        setCreateSuccess('Job description posted successfully and is pending TPO approval!');
      }
      
      // Clear form states
      setTitle('');
      setDescription('');
      setRequiredSkills('');
      setMinCGPA('0');
      setAllowedBranches([]);
      setMaxBacklogs('0');
      setJobPackage('');
      setLocation('');
      setCustomQuestions([]);
      setDocumentFile(null);
      setDocumentBase64('');
      setDocumentFileName('');
      setDocumentFileType('');
      setExistingDocumentName('');
      setShowDocUploadArea(true);

      // Clear assessment states
      setEnableAssessment(false);
      setGeneratedQuestions([]);
      setAssessmentPassingScore(60);
      setAssessmentTimeLimit(30);
      setGeneratingAssessment(false);
      setAssessmentReviewing(false);

      setEditingJdId(null);
      setIsEditMode(false);

      // Refresh list and switch tab after delay
      setTimeout(() => {
        setActiveTab('myJDs');
        fetchJDs();
        setCreateSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setCreateError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} job description.`);
    } finally {
      setCreating(false);
    }
  };

  const handleViewApplicants = async (jdId, jdTitle) => {
    setSelectedJDId(jdId);
    setSelectedJDTitle(jdTitle);
    setApplicantsLoading(true);
    setApplicants([]);
    try {
      const response = await api.get(`/jd/applicants/${jdId}`);
      setApplicants(response.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch applicants.');
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handleStatusChange = async (applicationId, newStatus) => {
    setUpdatingStatusId(applicationId);
    try {
      await api.put(`/jd/application-status/${applicationId}`, { status: newStatus });
      
      // Refresh applicants list
      const response = await api.get(`/jd/applicants/${selectedJDId}`);
      setApplicants(response.data || []);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getApprovalStatusStyle = (status) => {
    switch (status) {
      case 'approved':
        return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'rejected':
        return { backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' };
      default: // pending
        return { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
    }
  };

  const getApplicantStatusStyle = (status) => {
    switch (status) {
      case 'Selected':
        return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 'bold' };
      case 'Rejected':
        return { backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', fontWeight: 'bold' };
      case 'Shortlisted':
        return { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 'bold' };
      case 'Interview Scheduled':
        return { backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: 'bold' };
      default:
        return { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', fontWeight: 'bold' };
    }
  };

  const getApprovalStatusClass = (status) => {
    switch (status) {
      case 'approved':
        return 'approved';
      case 'rejected':
        return 'rejected';
      default:
        return 'pending';
    }
  };

  const getScoreClass = (score) => {
    if (score >= 70) return 'score-good';
    if (score >= 40) return 'score-average';
    return 'score-poor';
  };

  const branchesOptions = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'];

  return (
    <div className="app-container">
      <Navbar title="HR Dashboard" subtitle="Post jobs, manage job postings, and review applicants" />

      <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>

        {/* Tab Selection */}
        <div className="hr-tabs-container">
          <button
            onClick={() => setActiveTab('myJDs')}
            className={`hr-tab-btn ${activeTab === 'myJDs' ? 'active' : ''}`}
          >
            My Job Postings
          </button>
          <button
            onClick={() => setActiveTab('createJD')}
            className={`hr-tab-btn ${activeTab === 'createJD' ? 'active' : ''}`}
          >
            {isEditMode ? 'Edit Job Posting' : 'Post New Job'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loader-container">
            <span className="spinner"></span>
            <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* TAB: MY JOB POSTINGS */}
            {activeTab === 'myJDs' && (
              <div>
                <div className="panel-card" style={{ marginBottom: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem' }}>My Job Postings ({myJDs.length})</h3>
                  {myJDs.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No jobs posted yet. Go to "Post New Job" to create one.</p>
                  ) : (
                    <div className="dashboard-grid">
                      {myJDs.map((jd) => {
                        const isApproved = jd.approvalStatus === 'approved';
                        return (
                          <div key={jd._id} className={isApproved ? "hr-jd-card-approved" : "hr-jd-card-pending-rejected"}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                              <h4 className="hr-jd-title">{jd.title}</h4>
                              <span className={`hr-approval-badge ${getApprovalStatusClass(jd.approvalStatus)}`}>
                                {jd.approvalStatus}
                              </span>
                            </div>
                            
                            <div className="hr-skills-container" style={{ marginBottom: '12px' }}>
                              <span className="hr-pill">💼 {jd.package || 'Not specified'}</span>
                              <span className="hr-pill">📍 {jd.location || 'Remote'}</span>
                            </div>

                            <p style={{ fontSize: '0.9rem', color: 'var(--slate)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {jd.description}
                            </p>

                            <div className="hr-skills-container">
                              {jd.requiredSkills.map((skill, idx) => (
                                <span key={idx} className="hr-skill-tag">{skill}</span>
                              ))}
                            </div>

                            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--slate-light)', paddingTop: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '1rem' }}>
                                <span>Min CGPA: <strong>{jd.minCGPA}</strong></span>
                                <span>Max Backlogs: <strong>{jd.maxBacklogs}</strong></span>
                              </div>

                              {jd.approvalStatus === 'rejected' && jd.rejectionReason && (
                                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(244, 63, 94, 0.05)', borderLeft: '3px solid var(--danger)', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '1rem', textAlign: 'left' }}>
                                  <strong>Rejection Reason:</strong> {jd.rejectionReason}
                                </div>
                              )}

                              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                {isApproved ? (
                                  <button
                                    onClick={() => handleViewApplicants(jd._id, jd.title)}
                                    className="hr-btn-primary"
                                    style={{ flex: 1 }}
                                  >
                                    View Applicants
                                  </button>
                                ) : (
                                  <button 
                                    className="hr-btn-secondary" 
                                    disabled
                                    style={{ flex: 1 }}
                                  >
                                    View Applicants
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingJdId(jd._id);
                                    setIsEditMode(true);
                                    setTitle(jd.title || '');
                                    setLocation(jd.location || '');
                                    setJobPackage(jd.package || '');
                                    setRequiredSkills(jd.requiredSkills ? jd.requiredSkills.join(', ') : '');
                                    setMinCGPA(jd.minCGPA !== undefined ? jd.minCGPA.toString() : '0');
                                    setMaxBacklogs(jd.maxBacklogs !== undefined ? jd.maxBacklogs.toString() : '0');
                                    setAllowedBranches(jd.allowedBranches || []);
                                    setDescription(jd.description || '');
                                    setCustomQuestions(jd.customQuestions || []);
                                    
                                    if (jd.documentName) {
                                      setExistingDocumentName(jd.documentName);
                                      setDocumentFileType(jd.documentFileType || '');
                                      setShowDocUploadArea(false);
                                    } else {
                                      setExistingDocumentName('');
                                      setDocumentFileType('');
                                      setShowDocUploadArea(true);
                                    }
                                    setDocumentFile(null);
                                    setDocumentBase64('');
                                    setDocumentFileName('');

                                    if (jd.assessmentEnabled) {
                                      setEnableAssessment(true);
                                      api.get(`/assessment/jd/${jd._id}`)
                                        .then((res) => {
                                          if (res.data) {
                                            setGeneratedQuestions(res.data.questions || []);
                                            setAssessmentPassingScore(res.data.passingScore || 60);
                                            setAssessmentTimeLimit(res.data.timeLimit || 30);
                                            setAssessmentReviewing(true);
                                          }
                                        })
                                        .catch((err) => {
                                          console.error(err);
                                          setGeneratedQuestions([]);
                                          setAssessmentPassingScore(60);
                                          setAssessmentTimeLimit(30);
                                          setAssessmentReviewing(false);
                                        });
                                    } else {
                                      setEnableAssessment(false);
                                      setGeneratedQuestions([]);
                                      setAssessmentPassingScore(60);
                                      setAssessmentTimeLimit(30);
                                      setAssessmentReviewing(false);
                                    }

                                    setActiveTab('createJD');
                                  }}
                                  style={{
                                    flex: 1,
                                    border: '1px solid var(--navy-mid)',
                                    color: 'var(--navy-mid)',
                                    backgroundColor: 'var(--card-bg)',
                                    borderRadius: 'var(--radius-sharp)',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Applicants List Section */}
                {selectedJDId && (
                  <div className="panel-card" style={{ marginTop: '2.5rem' }}>
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-light)', paddingBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '22px' }}>
                        Applicants for: <span style={{ color: 'var(--navy-mid)' }}>{selectedJDTitle}</span>
                      </h3>
                      <button onClick={() => setSelectedJDId(null)} className="hr-btn-outline">
                        Close Section
                      </button>
                    </div>

                    {applicantsLoading ? (
                      <div className="loader-container" style={{ minHeight: '150px' }}>
                        <span className="spinner"></span>
                        <p style={{ marginTop: '1rem', color: 'var(--slate)' }}>Loading applicants...</p>
                      </div>
                    ) : applicants.length === 0 ? (
                      <p style={{ color: 'var(--slate)', textAlign: 'center', padding: '2rem' }}>No student has applied for this position yet.</p>
                    ) : (
                      <div className="hr-applicants-list">
                        {applicants.map((app) => (
                          <div key={app._id} className="hr-applicant-row">
                            <div className="hr-applicant-info">
                              <div className="hr-applicant-header">
                                <h4 className="hr-applicant-name">{app.student?.name || 'N/A'}</h4>
                                <span className="hr-applicant-branch">{app.student?.branch || 'N/A'}</span>
                                <span className="hr-applicant-cgpa">CGPA: {app.student?.cgpa || '0'}</span>
                              </div>
                              <p className="hr-applicant-email">{app.student?.email || 'N/A'}</p>
                              <div className="hr-skills-container" style={{ marginTop: '4px', marginBottom: 0 }}>
                                {app.student?.skills?.map((s, idx) => (
                                  <span key={idx} className="hr-skill-tag">{s}</span>
                                ))}
                              </div>
                            </div>
                            
                            <div className="hr-applicant-actions">
                              <div className="hr-applicant-score-wrapper">
                                <span className="hr-score-label">Mock Score:</span>
                                {app.mockInterviewScore !== null ? (
                                  <span className={`hr-score-badge ${getScoreClass(app.mockInterviewScore)}`}>
                                    {app.mockInterviewScore}/100
                                  </span>
                                ) : (
                                  <span className="hr-score-na">N/A</span>
                                )}
                              </div>

                              <div className="hr-status-select-wrapper">
                                <select
                                  value={app.status}
                                  onChange={(e) => handleStatusChange(app._id, e.target.value)}
                                  disabled={updatingStatusId === app._id}
                                  className="hr-status-select"
                                >
                                  <option value="Applied">Applied</option>
                                  <option value="Shortlisted">Shortlisted</option>
                                  <option value="Interview Scheduled">Interview Scheduled</option>
                                  <option value="Selected">Selected</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                                {updatingStatusId === app._id && <span className="spinner hr-status-spinner"></span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: POST NEW JOB */}
            {activeTab === 'createJD' && (
              <div className="panel-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h3 style={{ marginBottom: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '24px' }}>
                  {isEditMode ? 'Edit Job Description' : 'Post a New Job Description'}
                </h3>
                
                {isEditMode && myJDs.find(j => j._id === editingJdId)?.approvalStatus === 'approved' && (
                  <div style={{
                    backgroundColor: '#FFF8E7',
                    borderLeft: '3px solid var(--accent-gold, #f59e0b)',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#856404',
                    textAlign: 'left'
                  }}>
                    ⚠️ Editing this approved JD will reset it to pending status and require TPO re-approval. Students will not see new changes until re-approved.
                  </div>
                )}
                
                {createError && <div className="alert alert-error">{createError}</div>}
                {createSuccess && <div className="alert alert-success">{createSuccess}</div>}

                <form onSubmit={handleCreateJD}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="hr-form-label" htmlFor="title">Job Title</label>
                      <input
                        type="text"
                        id="title"
                        className="hr-form-input"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Software Engineer Frontend"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="hr-form-label" htmlFor="location">Job Location</label>
                      <input
                        type="text"
                        id="location"
                        className="hr-form-input"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Hyderabad, Remote"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="hr-form-label" htmlFor="package">Package / CTC</label>
                      <input
                        type="text"
                        id="package"
                        className="hr-form-input"
                        value={jobPackage}
                        onChange={(e) => setJobPackage(e.target.value)}
                        placeholder="e.g. 12 LPA"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="hr-form-label" htmlFor="requiredSkills">Required Skills (comma-separated)</label>
                      <input
                        type="text"
                        id="requiredSkills"
                        className="hr-form-input"
                        value={requiredSkills}
                        onChange={(e) => setRequiredSkills(e.target.value)}
                        placeholder="React, Javascript, Node.js"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="hr-form-label" htmlFor="minCGPA">Minimum CGPA Required</label>
                      <input
                        type="number"
                        id="minCGPA"
                        className="hr-form-input"
                        value={minCGPA}
                        onChange={(e) => setMinCGPA(e.target.value)}
                        placeholder="0"
                        step="0.1"
                        min="0"
                        max="10"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="hr-form-label" htmlFor="maxBacklogs">Maximum Allowed Backlogs</label>
                      <input
                        type="number"
                        id="maxBacklogs"
                        className="hr-form-input"
                        value={maxBacklogs}
                        onChange={(e) => setMaxBacklogs(e.target.value)}
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Branches Options */}
                  <div className="form-group">
                    <label className="hr-form-label">Eligible Branches</label>
                    <div className="hr-branches-container">
                      {branchesOptions.map((branch) => {
                        const isChecked = allowedBranches.includes(branch);
                        return (
                          <label key={branch} className={`hr-branch-chip ${isChecked ? 'checked' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBranchChange(branch)}
                            />
                            {branch}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="hr-form-label" htmlFor="description">Job Description</label>
                    <textarea
                      id="description"
                      className="hr-form-input"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter job roles, responsibilities, eligibility details, and requirements..."
                      style={{ minHeight: '120px' }}
                      required
                    />
                  </div>

                  {/* Screening Questions (Optional) */}
                  <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--slate-light)', paddingTop: '1.5rem', gridColumn: '1 / -1' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>
                      Screening Questions (Optional)
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--slate)' }}>
                      Students will be required to answer these when applying
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                      {customQuestions.map((q, index) => (
                        <div key={index} className="hr-question-block" style={{
                          backgroundColor: 'var(--slate-bg)',
                          border: '1px solid var(--slate-light)',
                          padding: '16px',
                          borderRadius: 'var(--radius-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          textAlign: 'left'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="hr-question-badge" style={{
                              backgroundColor: 'var(--navy-deep)',
                              color: 'var(--white)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              Question {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600'
                              }}
                            >
                              Remove
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label className="hr-form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Question Text</label>
                            <input
                              type="text"
                              className="hr-form-input"
                              value={q.questionText}
                              onChange={(e) => {
                                const newQs = [...customQuestions];
                                newQs[index].questionText = e.target.value;
                                setCustomQuestions(newQs);
                              }}
                              placeholder="e.g. Describe your experience with React"
                              required
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <label className="hr-form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Answer Format / Hint</label>
                              <input
                                type="text"
                                className="hr-form-input"
                                value={q.placeholder}
                                onChange={(e) => {
                                  const newQs = [...customQuestions];
                                  newQs[index].placeholder = e.target.value;
                                  setCustomQuestions(newQs);
                                }}
                                placeholder="e.g. Explain in 2-3 sentences with examples"
                              />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none', color: 'var(--navy-deep)', fontWeight: '500', marginTop: '16px' }}>
                              <input
                                type="checkbox"
                                checked={q.isRequired}
                                onChange={(e) => {
                                  const newQs = [...customQuestions];
                                  newQs[index].isRequired = e.target.checked;
                                  setCustomQuestions(newQs);
                                }}
                              />
                              Required
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    {customQuestions.length < 5 ? (
                      <button
                        type="button"
                        className="hr-btn-outline"
                        onClick={addQuestion}
                        style={{ display: 'inline-block', width: 'auto' }}
                      >
                        + Add Question
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: 'var(--slate)', fontStyle: 'italic' }}>
                        Maximum 5 questions reached
                      </span>
                    )}
                  </div>

                  {/* Screening Assessment (Optional) */}
                  <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--slate-light)', paddingTop: '1.5rem', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '15px', color: 'var(--navy-deep)', fontWeight: '600', margin: 0 }}>
                          Enable Screening Assessment
                        </label>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--slate)' }}>
                          Students will take an AI-generated MCQ test after applying
                        </p>
                      </div>
                      <label style={{
                        display: 'inline-block',
                        position: 'relative',
                        width: '44px',
                        height: '24px',
                        backgroundColor: enableAssessment ? 'var(--navy-deep)' : 'var(--slate-light)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}>
                        <input
                          type="checkbox"
                          checked={enableAssessment}
                          onChange={(e) => {
                            setEnableAssessment(e.target.checked);
                            if (!e.target.checked) {
                              setAssessmentReviewing(false);
                              setGeneratedQuestions([]);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <span style={{
                          position: 'absolute',
                          top: '3px',
                          left: '2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--card-bg)',
                          transition: 'transform 0.2s',
                          transform: enableAssessment ? 'translateX(22px)' : 'translateX(2px)'
                        }} />
                      </label>
                    </div>

                    {enableAssessment && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                            <label className="hr-form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Passing Score (%)</label>
                            <input
                              type="number"
                              className="hr-form-input"
                              value={assessmentPassingScore}
                              onChange={(e) => setAssessmentPassingScore(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                              min="0"
                              max="100"
                              required
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                            <label className="hr-form-label" style={{ fontSize: '12px', marginBottom: '2px' }}>Time Limit (mins)</label>
                            <input
                              type="number"
                              className="hr-form-input"
                              value={assessmentTimeLimit}
                              onChange={(e) => setAssessmentTimeLimit(Math.min(120, Math.max(10, parseInt(e.target.value) || 10)))}
                              min="10"
                              max="120"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleGenerateQuestions}
                          disabled={generatingAssessment}
                          style={{
                            border: '1px solid var(--navy-mid)',
                            color: 'var(--navy-mid)',
                            backgroundColor: 'var(--card-bg)',
                            padding: '10px 20px',
                            borderRadius: '0px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            width: 'auto',
                            alignSelf: 'flex-start'
                          }}
                        >
                          {generatingAssessment ? (
                            <>
                              <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <span>✨ Generate Questions with AI</span>
                            </>
                          )}
                        </button>

                        {assessmentReviewing && (
                          <div style={{
                            border: '1px solid var(--slate-light)',
                            borderRadius: 'var(--radius-card)',
                            padding: '20px',
                            backgroundColor: 'var(--slate-bg)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px'
                          }}>
                            <div style={{ borderBottom: '1px solid var(--slate-light)', paddingBottom: '12px', textAlign: 'left' }}>
                              <h5 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--navy-deep)', fontFamily: 'var(--font-display)' }}>
                                ✓ {generatedQuestions.length} Questions Generated — Review & Edit
                              </h5>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                              {generatedQuestions.map((q, idx) => (
                                <div key={idx} style={{ borderBottom: idx < generatedQuestions.length - 1 ? '1px dashed var(--slate-light)' : 'none', paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: 'var(--navy-deep)',
                                        color: 'var(--white)',
                                        borderRadius: '50%',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                      }}>
                                        {idx + 1}
                                      </span>
                                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--navy-mid)' }}>Question {idx + 1}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
                                      }}
                                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label className="hr-form-label" style={{ fontSize: '11px' }}>Question Text</label>
                                    <input
                                      type="text"
                                      className="hr-form-input"
                                      value={q.questionText}
                                      onChange={(e) => {
                                        const updated = [...generatedQuestions];
                                        updated[idx].questionText = e.target.value;
                                        setGeneratedQuestions(updated);
                                      }}
                                      required
                                    />
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {q.options.map((opt, optIdx) => (
                                      <div key={optIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label className="hr-form-label" style={{ fontSize: '11px' }}>Option {String.fromCharCode(65 + optIdx)}</label>
                                        <input
                                          type="text"
                                          className="hr-form-input"
                                          value={opt}
                                          onChange={(e) => {
                                            const updated = [...generatedQuestions];
                                            updated[idx].options[optIdx] = e.target.value;
                                            setGeneratedQuestions(updated);
                                          }}
                                          required
                                        />
                                      </div>
                                    ))}
                                  </div>

                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label className="hr-form-label" style={{ fontSize: '11px' }}>Correct Answer</label>
                                      <select
                                        className="hr-form-input"
                                        value={q.correctAnswer}
                                        onChange={(e) => {
                                          const updated = [...generatedQuestions];
                                          updated[idx].correctAnswer = parseInt(e.target.value);
                                          setGeneratedQuestions(updated);
                                        }}
                                        style={{ height: '38px', padding: '8px' }}
                                      >
                                        <option value={0}>Option A</option>
                                        <option value={1}>Option B</option>
                                        <option value={2}>Option C</option>
                                        <option value={3}>Option D</option>
                                      </select>
                                    </div>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <label className="hr-form-label" style={{ fontSize: '11px' }}>Explanation (Optional)</label>
                                      <input
                                        type="text"
                                        className="hr-form-input"
                                        value={q.explanation || ''}
                                        onChange={(e) => {
                                          const updated = [...generatedQuestions];
                                          updated[idx].explanation = e.target.value;
                                          setGeneratedQuestions(updated);
                                        }}
                                        placeholder="Explain the correct option..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--slate-light)', paddingTop: '16px' }}>
                              <button
                                type="button"
                                className="hr-btn-outline"
                                onClick={() => {
                                  setGeneratedQuestions(prev => [...prev, {
                                    questionText: '',
                                    options: ['', '', '', ''],
                                    correctAnswer: 0,
                                    marks: 1,
                                    explanation: ''
                                  }]);
                                }}
                                style={{ padding: '8px 16px', fontSize: '13px' }}
                              >
                                ＋ Add Question
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Company / Role Documents (Optional) */}
                  <div className="form-group" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--slate-light)', paddingTop: '1.5rem', gridColumn: '1 / -1' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontFamily: 'var(--font-display)', color: 'var(--navy-deep)', fontSize: '18px' }}>
                      Company / Role Documents (Optional)
                    </h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--slate)' }}>
                      Upload any relevant documents (company brochure, role details, recruitment process, offer letter template, etc.)
                    </p>

                    {existingDocumentName && !showDocUploadArea ? (
                      <div className="resume-current-info" style={{ padding: '16px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '24px' }}>📄</span>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: '600', color: 'var(--navy-deep)', wordBreak: 'break-all', fontSize: '14px' }}>
                              {existingDocumentName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--slate)', textTransform: 'uppercase' }}>
                              {documentFileType.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={handleJDDocumentDownload}
                            className="hr-btn-outline"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowDocUploadArea(true);
                              setExistingDocumentName('');
                            }}
                            className="hr-btn-outline"
                            style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {isEditMode && myJDs.find(j => j._id === editingJdId)?.documentName && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowDocUploadArea(false);
                              setExistingDocumentName(myJDs.find(j => j._id === editingJdId)?.documentName || '');
                              setDocumentFile(null);
                              setDocumentBase64('');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--navy-mid)', cursor: 'pointer', padding: 0, marginBottom: '12px', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'underline', display: 'block' }}
                          >
                            ← Use saved document
                          </button>
                        )}
                        <div
                          className="resume-upload-zone"
                          onClick={() => document.getElementById('jdDocFileInput').click()}
                          style={{ padding: '24px 16px' }}
                        >
                          <UploadCloud size={32} style={{ color: 'var(--slate)' }} />
                          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--navy-deep)' }}>
                            Click to select document file
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--slate)' }}>
                            Supports PDF, DOC, DOCX, PPT, PPTX, PNG, JPG up to 10MB
                          </span>
                          <input
                            type="file"
                            id="jdDocFileInput"
                            style={{ display: 'none' }}
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                            onChange={handleDocFileChange}
                          />
                        </div>

                        {documentFile && (
                          <div className="resume-file-info" style={{ marginTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                              <span>📄</span>
                              <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy-deep)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {documentFile.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--slate)' }}>
                                  {(documentFile.size / (1024 * 1024)).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDocumentFile(null);
                                setDocumentBase64('');
                                setDocumentFileName('');
                                setDocumentFileType('');
                              }}
                              style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '1.5rem', gridColumn: '1 / -1' }}>
                    <button
                      type="submit"
                      className="hr-btn-primary"
                      disabled={creating}
                      style={{ flex: 1 }}
                    >
                      {creating ? (isEditMode ? 'Updating Job...' : 'Posting Job...') : (isEditMode ? 'Update Job' : 'Post Job (Pending TPO Approval)')}
                    </button>
                    {isEditMode && (
                      <button
                        type="button"
                        className="hr-btn-outline"
                        onClick={handleCancelEdit}
                        style={{ flex: 1 }}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HRDashboard;
