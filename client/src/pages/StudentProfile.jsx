import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { ArrowLeft, CheckCircle, GraduationCap, Star, Tags, AlertCircle, Calendar, User, Percent, UploadCloud, Download, RefreshCw } from 'lucide-react';
import './StudentProfile.css';

const StudentProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Personal / Academic Form State
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [degreeCGPA, setDegreeCGPA] = useState('');
  const [passedOutYear, setPassedOutYear] = useState('');
  const [tenthPercent, setTenthPercent] = useState('');
  const [twelfthPercent, setTwelfthPercent] = useState('');
  const [backlogs, setBacklogs] = useState('0');
  const [collegeName, setCollegeName] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');

  // Resume File & Note State
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [existingResume, setExistingResume] = useState(null); // { fileName, fileType }
  const [resumeUploading, setResumeUploading] = useState(false);
  const [showUploadArea, setShowUploadArea] = useState(true);
  const [userId, setUserId] = useState('');

  // Read-only Account Info
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [createdAt, setCreatedAt] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Status State
  const [loading, setLoading] = useState(true);
  const [errorSection1, setErrorSection1] = useState('');
  const [successSection1, setSuccessSection1] = useState('');
  const [errorSection2, setErrorSection2] = useState('');
  const [successSection2, setSuccessSection2] = useState('');
  const [savingSection1, setSavingSection1] = useState(false);
  const [savingSection2, setSavingSection2] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/profile');
      const data = res.data;
      setName(data.name || '');
      setStudentId(data.studentId || '');
      setBranch(data.branch || 'CSE');
      setDegreeCGPA(data.degreeCGPA !== null && data.degreeCGPA !== undefined ? data.degreeCGPA.toString() : '');
      setPassedOutYear(data.passedOutYear !== null && data.passedOutYear !== undefined ? data.passedOutYear.toString() : '');
      setTenthPercent(data.tenthPercent !== null && data.tenthPercent !== undefined ? data.tenthPercent.toString() : '');
      setTwelfthPercent(data.twelfthPercent !== null && data.twelfthPercent !== undefined ? data.twelfthPercent.toString() : '');
      setBacklogs(data.backlogs !== undefined && data.backlogs !== null ? data.backlogs.toString() : '0');
      setCollegeName(data.collegeName || '');
      setSkills(data.skills ? data.skills.join(', ') : '');
      setBio(data.bio || '');
      setResumeText(data.resumeText || '');
      
      setUserId(data._id || '');
      setEmail(data.email || '');
      setRole(data.role || 'student');
      setCreatedAt(data.createdAt || '');
      setIsEmailVerified(data.isEmailVerified || false);

      // Check if base64 resume exists
      if (data.resumeBase64) {
        setExistingResume({
          fileName: data.resumeFileName || 'resume.pdf',
          fileType: data.resumeFileType || 'application/pdf',
        });
        setShowUploadArea(false);
      } else {
        setExistingResume(null);
        setShowUploadArea(true);
      }
    } catch (err) {
      console.error(err);
      setErrorSection1('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveSection1 = async (e) => {
    e.preventDefault();
    setSavingSection1(true);
    setErrorSection1('');
    setSuccessSection1('');

    const payload = {
      name,
      studentId: studentId || null,
      branch,
      degreeCGPA: degreeCGPA ? parseFloat(degreeCGPA) : null,
      passedOutYear: passedOutYear ? parseInt(passedOutYear) : null,
      tenthPercent: tenthPercent ? parseFloat(tenthPercent) : null,
      twelfthPercent: twelfthPercent ? parseFloat(twelfthPercent) : null,
      backlogs: backlogs ? parseInt(backlogs) : 0,
      collegeName,
      skills: skills ? skills.split(',').map(s => s.trim()).filter(s => s !== '') : [],
      bio: bio || null,
    };

    try {
      const res = await api.put('/student/profile', payload);
      setSuccessSection1('Profile updated successfully');
      
      // Update local storage user details if name/other fields stored there
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        userObj.name = name;
        localStorage.setItem('user', JSON.stringify(userObj));
      }

      setTimeout(() => {
        setSuccessSection1('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setErrorSection1(err.response?.data?.message || 'Failed to update academic profile.');
    } finally {
      setSavingSection1(false);
    }
  };

  const convertToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // strip data:...prefix
    reader.onerror = reject;
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type (.pdf, .doc, .docx)
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(extension)) {
      setErrorSection2('Invalid file type. Only PDF, DOC, and DOCX files are allowed.');
      setResumeFile(null);
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorSection2('File size exceeds the 5MB limit.');
      setResumeFile(null);
      return;
    }

    setErrorSection2('');
    setResumeFile(file);
  };

  const handleResumeUpload = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      setErrorSection2('Please select a file to upload.');
      return;
    }

    setResumeUploading(true);
    setErrorSection2('');
    setSuccessSection2('');

    try {
      const base64Str = await convertToBase64(resumeFile);
      
      const payload = {
        resumeBase64: base64Str,
        resumeFileName: resumeFile.name,
        resumeFileType: resumeFile.type,
      };

      await api.put('/student/profile', payload);
      setSuccessSection2('Resume uploaded successfully');
      setExistingResume({
        fileName: resumeFile.name,
        fileType: resumeFile.type,
      });
      setShowUploadArea(false);
      setResumeFile(null);
      setTimeout(() => {
        setSuccessSection2('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setErrorSection2(err.response?.data?.message || 'Failed to upload resume file.');
    } finally {
      setResumeUploading(false);
    }
  };

  const handleResumeDownload = async () => {
    try {
      const res = await api.get(`/student/resume/${userId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: existingResume.fileType }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', existingResume.fileName || 'resume.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setErrorSection2('Failed to download resume file.');
    }
  };

  const handleSaveSection2 = async (e) => {
    e.preventDefault();
    setSavingSection2(true);
    setErrorSection2('');
    setSuccessSection2('');

    const payload = {
      resumeText: resumeText || null,
    };

    try {
      await api.put('/student/profile', payload);
      setSuccessSection2('Cover Note updated successfully');
      setTimeout(() => {
        setSuccessSection2('');
      }, 3000);
    } catch (err) {
      console.error(err);
      setErrorSection2(err.response?.data?.message || 'Failed to update Cover Note.');
    } finally {
      setSavingSection2(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="app-container profile-page">
      <Navbar title="My Profile" subtitle="Manage your academic information and resume details" />

      <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
        <div className="profile-header">
          <div className="profile-title-area">
            <h2 className="profile-title">My Profile</h2>
            <p className="profile-subtitle">Keep your placement profile updated to qualify for job descriptions</p>
          </div>
          <Link to="/student-dashboard" className="btn-back">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="loader-container">
            <span className="spinner"></span>
            <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading profile...</p>
          </div>
        ) : (
          <>
            {/* Account Info Bar */}
            <div className="account-info-card">
              <div className="account-info-grid">
                <div className="account-info-item">
                  <div className="account-info-label">Email Address</div>
                  <div className="account-info-value">{email}</div>
                </div>
                <div className="account-info-item">
                  <div className="account-info-label">Role</div>
                  <div className="account-info-value" style={{ textTransform: 'capitalize' }}>{role}</div>
                </div>
                <div className="account-info-item">
                  <div className="account-info-label">Member Since</div>
                  <div className="account-info-value">{formatDate(createdAt)}</div>
                </div>
                <div className="account-info-item">
                  <div className="account-info-label">Verification Status</div>
                  <div className="account-info-value">
                    {isEmailVerified ? (
                      <span className="badge-verified">
                        <CheckCircle size={16} /> Verified
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: '600' }}>
                        Unverified
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-sections-grid">
              {/* Section 1: Academic & Personal Info */}
              <div className="profile-card">
                <h3 className="profile-card-title">Personal & Academic Information</h3>
                
                {errorSection1 && <div className="profile-alert profile-alert-error">{errorSection1}</div>}
                {successSection1 && <div className="profile-alert profile-alert-success">{successSection1}</div>}

                <form onSubmit={handleSaveSection1} className="profile-form-grid">
                  {/* Full Name */}
                  <div className="profile-form-group full-width">
                    <label className="profile-label" htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      className="profile-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Student ID */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="studentId">Student ID</label>
                    <input
                      type="text"
                      id="studentId"
                      className="profile-input"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="College Student ID"
                      required
                    />
                  </div>

                  {/* Branch */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="branch">Branch</label>
                    <select
                      id="branch"
                      className="profile-input"
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

                  {/* Degree CGPA */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="degreeCGPA">Degree CGPA</label>
                    <input
                      type="number"
                      id="degreeCGPA"
                      className="profile-input"
                      value={degreeCGPA}
                      onChange={(e) => setDegreeCGPA(e.target.value)}
                      placeholder="e.g. 8.5"
                      step="0.01"
                      min="0"
                      max="10"
                      required
                    />
                  </div>

                  {/* Passed Out Year */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="passedOutYear">Passed Out Year</label>
                    <input
                      type="number"
                      id="passedOutYear"
                      className="profile-input"
                      value={passedOutYear}
                      onChange={(e) => setPassedOutYear(e.target.value)}
                      placeholder="e.g. 2025"
                      min="2020"
                      max="2030"
                      required
                    />
                  </div>

                  {/* 10th % */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="tenthPercent">10th %</label>
                    <input
                      type="number"
                      id="tenthPercent"
                      className="profile-input"
                      value={tenthPercent}
                      onChange={(e) => setTenthPercent(e.target.value)}
                      placeholder="e.g. 85.5"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                    />
                  </div>

                  {/* 12th / Diploma % */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="twelfthPercent">12th / Diploma %</label>
                    <input
                      type="number"
                      id="twelfthPercent"
                      className="profile-input"
                      value={twelfthPercent}
                      onChange={(e) => setTwelfthPercent(e.target.value)}
                      placeholder="e.g. 78.0"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                    />
                  </div>

                  {/* Backlogs */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="backlogs">Active Backlogs</label>
                    <input
                      type="number"
                      id="backlogs"
                      className="profile-input"
                      value={backlogs}
                      onChange={(e) => setBacklogs(e.target.value)}
                      placeholder="0"
                      min="0"
                      required
                    />
                  </div>

                  {/* College Name */}
                  <div className="profile-form-group">
                    <label className="profile-label" htmlFor="collegeName">College Name</label>
                    <input
                      type="text"
                      id="collegeName"
                      className="profile-input"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Skills (comma-separated with tags list) */}
                  <div className="profile-form-group full-width">
                    <label className="profile-label" htmlFor="skills">Skills (comma-separated)</label>
                    <input
                      type="text"
                      id="skills"
                      className="profile-input"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="e.g. Java, React, Node.js, Python"
                    />
                    <div className="profile-skills-tags">
                      {skills.split(',').map((s, idx) => {
                        const trimmed = s.trim();
                        if (!trimmed) return null;
                        return <span key={idx} className="profile-skill-tag">{trimmed}</span>;
                      })}
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="profile-form-group full-width">
                    <label className="profile-label" htmlFor="bio">Short Bio</label>
                    <textarea
                      id="bio"
                      className="profile-input profile-textarea"
                      value={bio}
                      onChange={(e) => setBio(e.target.value.substring(0, 300))}
                      placeholder="Tell us about yourself..."
                      maxLength={300}
                    />
                    <div className="char-count">{bio.length}/300 characters</div>
                  </div>

                  <button
                    type="submit"
                    className="btn-save full-width"
                    disabled={savingSection1}
                  >
                    {savingSection1 ? 'Saving Info...' : 'Save Changes'}
                  </button>
                </form>
              </div>

              {/* Section 2: Resume */}
              <div className="profile-card">
                <h3 className="profile-card-title">Resume Content</h3>

                {errorSection2 && <div className="profile-alert profile-alert-error">{errorSection2}</div>}
                {successSection2 && <div className="profile-alert profile-alert-success">{successSection2}</div>}

                {/* 1. Current Resume Section */}
                {existingResume && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 className="profile-label" style={{ fontWeight: '600', marginBottom: '8px' }}>Current Resume</h4>
                    <div className="resume-current-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>📄</span>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: '600', color: 'var(--navy-deep)', wordBreak: 'break-all' }}>
                            {existingResume.fileName}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--slate)', textTransform: 'uppercase' }}>
                            {existingResume.fileType.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleResumeDownload}
                          className="btn-secondary-outline"
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          <Download size={16} /> Download
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUploadArea(!showUploadArea)}
                          className="btn-secondary-outline"
                          style={{ flex: 1, justifyContent: 'center', borderColor: 'var(--slate-light)' }}
                        >
                          <RefreshCw size={16} /> {showUploadArea ? 'Cancel' : 'Replace'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Upload Area */}
                {showUploadArea && (
                  <form onSubmit={handleResumeUpload} style={{ marginBottom: '1.5rem' }}>
                    <h4 className="profile-label" style={{ fontWeight: '600', marginBottom: '8px' }}>Upload Resume File</h4>
                    <div
                      className="resume-upload-zone"
                      onClick={() => document.getElementById('resumeFileInput').click()}
                    >
                      <UploadCloud className="resume-upload-icon" size={32} />
                      <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--navy-deep)' }}>
                        Click to browse or drag and drop
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--slate)' }}>
                        Supports PDF, DOC, DOCX up to 5MB
                      </span>
                      <input
                        type="file"
                        id="resumeFileInput"
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                    </div>

                    {resumeFile && (
                      <div className="resume-file-info" style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span>📄</span>
                          <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--navy-deep)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {resumeFile.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--slate)' }}>
                              {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResumeFile(null)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn-save"
                      disabled={resumeUploading || !resumeFile}
                      style={{ marginTop: '16px' }}
                    >
                      {resumeUploading ? 'Uploading...' : 'Upload Resume'}
                    </button>
                  </form>
                )}

                {/* 3. Cover Note Section */}
                <form onSubmit={handleSaveSection2} style={{ borderTop: '1px solid var(--slate-light)', paddingTop: '1.5rem' }}>
                  <div className="profile-form-group full-width">
                    <label className="profile-label" htmlFor="resumeText">Cover Note (Optional)</label>
                    <textarea
                      id="resumeText"
                      className="profile-input profile-textarea"
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      placeholder="Paste your resume content here, or write a brief summary of your experience, projects, and skills..."
                    />
                    <div className="char-count">{resumeText.length} characters</div>
                  </div>

                  <button
                    type="submit"
                    className="btn-save"
                    disabled={savingSection2}
                    style={{ marginTop: '16px' }}
                  >
                    {savingSection2 ? 'Saving Cover Note...' : 'Save Cover Note'}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default StudentProfile;
