import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { Timer, ChevronLeft, ChevronRight, Send, AlertCircle, ArrowLeft } from 'lucide-react';
import './Assessment.css';

const Assessment = () => {
  const { jdId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State Management
  const [assessment, setAssessment] = useState(null);
  const [assessmentId, setAssessmentId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // selected option indices (null initially)
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [phase, setPhase] = useState('intro'); // 'intro' | 'taking' | 'submitting' | 'result'
  const [result, setResult] = useState(null); // { score, totalMarks, percentage, passed, message }

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  // Fetch assessment details
  const fetchAssessment = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/assessment/jd/${jdId}`);
      const data = res.data;

      if (data.alreadyAttempted) {
        setResult({
          score: data.result?.score,
          totalMarks: data.result?.totalMarks || (data.questions?.length || 10),
          percentage: data.result?.percentage,
          passed: data.result?.passed,
          message: 'You have already completed this screening assessment.'
        });
        setAssessment(data);
        setAssessmentId(data._id);
        setPhase('result');
      } else {
        setAssessment(data);
        setAssessmentId(data._id);
        setQuestions(data.questions || []);
        setAnswers(new Array(data.questions?.length || 0).fill(null));
        setTimeLeft((data.timeLimit || 30) * 60);
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        setError('No assessment available for this job position.');
      } else {
        setError(err.response?.data?.message || 'Failed to load assessment details.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [jdId]);

  // Countdown timer hook
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive]);

  const handleStart = () => {
    setPhase('taking');
    setTimerActive(true);
  };

  const handleOptionSelect = (optionIndex) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  // Submit answers to assessment
  const submitAssessmentAnswers = async (finalAnswersArray) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setPhase('submitting');
    setError('');

    try {
      const submissionAnswers = finalAnswersArray.map((ans) => (ans === null ? 0 : ans));
      const res = await api.post(`/assessment/submit/${assessmentId}`, {
        answers: submissionAnswers,
      });
      setResult(res.data);
      setPhase('result');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit assessment answers.');
      setPhase('taking');
      setTimerActive(true); // restart timer if submission failed
    }
  };

  const handleAutoSubmit = () => {
    // Auto submit takes the latest answers state
    setAnswers((latestAnswers) => {
      submitAssessmentAnswers(latestAnswers);
      return latestAnswers;
    });
  };

  const handleManualSubmit = () => {
    const answeredCount = answers.filter((a) => a !== null).length;
    const unansweredCount = questions.length - answeredCount;

    let confirmMsg = 'Are you sure you want to submit your assessment?';
    if (unansweredCount > 0) {
      confirmMsg = `You have ${unansweredCount} unanswered questions. Unanswered questions will be marked as incorrect. Are you sure you want to submit?`;
    }

    if (window.confirm(confirmMsg)) {
      submitAssessmentAnswers(answers);
    }
  };

  // Time format helper (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const optionPrefixes = ['A', 'B', 'C', 'D'];

  if (loading) {
    return (
      <div className="app-container assessment-page">
        <Navbar title="Screening Assessment" />
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="loader-container">
            <span className="spinner"></span>
            <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading assessment details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error && phase !== 'taking') {
    return (
      <div className="app-container assessment-page">
        <Navbar title="Screening Assessment" />
        <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', padding: '40px 20px' }}>
          <div className="assessment-card" style={{ textAlign: 'center' }}>
            <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '1rem' }} />
            <h3 className="assessment-intro-title">Assessment Error</h3>
            <p style={{ color: 'var(--slate)', marginBottom: '2rem' }}>{error}</p>
            <button onClick={() => navigate('/student-dashboard')} className="btn-back" style={{ width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Render Intro Screen
  if (phase === 'intro') {
    return (
      <div className="app-container assessment-page">
        <Navbar title="Screening Assessment" subtitle={assessment?.title || 'Screening Test'} />
        <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', padding: '40px 20px' }}>
          <div className="assessment-card">
            <span className="register-eyebrow">SCREENING TEST</span>
            <h2 className="assessment-intro-title">{assessment?.title || 'Job Assessment'}</h2>
            <p style={{ color: 'var(--slate)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
              {assessment?.description || 'Please complete this assessment to verify your skills. Once started, you must complete the test in a single attempt.'}
            </p>

            <div className="assessment-meta-grid">
              <div className="assessment-meta-item">
                <span className="assessment-meta-label">Total Questions</span>
                <span className="assessment-meta-value">{questions.length} MCQs</span>
              </div>
              <div className="assessment-meta-item">
                <span className="assessment-meta-label">Time Limit</span>
                <span className="assessment-meta-value">{assessment?.timeLimit || 30} mins</span>
              </div>
              <div className="assessment-meta-item">
                <span className="assessment-meta-label">Passing Score</span>
                <span className="assessment-meta-value">{assessment?.passingScore || 60}%</span>
              </div>
            </div>

            <div className="warning-box">
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Important Warning:</strong> This is a one-time attempt. Once started, you cannot refresh or retake this assessment. Closing the browser window will auto-submit your current answers.
              </div>
            </div>

            <button onClick={handleStart} className="btn-save" style={{ marginTop: '0px' }}>
              Start Assessment
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Render Taking Screen
  if (phase === 'taking') {
    const currentQ = questions[currentQuestion];
    const progressPercent = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;
    const isWarningTime = timeLeft < 60;

    return (
      <div className="app-container assessment-page">
        <Navbar title="Taking Assessment" subtitle={assessment?.title} />
        
        <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', padding: '32px 20px' }}>
          <div className="assessment-card" style={{ padding: '24px' }}>
            {/* Top Info Header */}
            <div className="taking-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '20px' }}>
                  {assessment?.title}
                </h3>
              </div>
              
              <div className={`timer-box ${isWarningTime ? 'warning' : ''}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: '700',
                backgroundColor: isWarningTime ? 'rgba(244, 63, 94, 0.1)' : 'var(--slate-bg)',
                color: isWarningTime ? 'var(--danger)' : 'var(--navy-deep)'
              }}>
                <Timer size={18} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Progress indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '8px' }}>
              <span>Question <strong>{currentQuestion + 1}</strong> of {questions.length}</span>
              <span>{Math.round(progressPercent)}% Complete</span>
            </div>
            <div className="progress-bar-container" style={{ height: '4px', background: 'var(--slate-light)', borderRadius: '2px', overflow: 'hidden', marginBottom: '24px' }}>
              <div className="progress-bar-fill" style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--navy-mid)' }}></div>
            </div>

            {/* Question Box */}
            <div style={{ borderLeft: '4px solid var(--accent-gold)', paddingLeft: '20px', marginBottom: '24px', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-card)', padding: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{
                  backgroundColor: 'var(--navy-deep)',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: '700'
                }}>
                  {currentQuestion + 1}
                </span>
                <span style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--slate)', letterSpacing: '0.05em', fontWeight: '600' }}>
                  {currentQ?.marks || 1} Mark{currentQ?.marks !== 1 ? 's' : ''}
                </span>
              </div>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--navy-deep)', lineHeight: '1.5' }}>
                {currentQ?.questionText}
              </h3>
            </div>

            {/* Options list */}
            <div className="options-grid" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {currentQ?.options?.map((option, idx) => {
                const isSelected = answers[currentQuestion] === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleOptionSelect(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-card)',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--navy-deep)' : '1px solid var(--slate-light)',
                      backgroundColor: isSelected ? 'var(--navy-deep)' : 'var(--white)',
                      color: isSelected ? 'var(--white)' : 'var(--navy-deep)',
                      textAlign: 'left',
                      width: '100%',
                      fontFamily: 'var(--font-body)',
                      fontSize: '15px',
                      fontWeight: isSelected ? '600' : '400',
                      transition: 'all 0.15s ease',
                      boxShadow: 'none'
                    }}
                    className="option-card"
                  >
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: isSelected ? 'var(--white)' : 'var(--navy-deep)',
                      color: isSelected ? 'var(--navy-deep)' : 'var(--white)',
                      flexShrink: 0
                    }}>
                      {optionPrefixes[idx]}
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Nav Actions */}
            <div className="assessment-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--slate-light)', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={handlePrevious}
                className="btn-back"
                disabled={currentQuestion === 0}
                style={{
                  width: 'auto',
                  marginTop: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid var(--slate-light)',
                  color: currentQuestion === 0 ? 'var(--slate)' : 'var(--navy-deep)',
                  backgroundColor: 'var(--card-bg)',
                  cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentQuestion === 0 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                {questions.map((_, qIdx) => {
                  const isAnswered = answers[qIdx] !== null;
                  const isCurrent = currentQuestion === qIdx;
                  return (
                    <span
                      key={qIdx}
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isCurrent ? 'var(--navy-mid)' : (isAnswered ? 'var(--navy-deep)' : 'var(--slate-light)'),
                        transition: 'background-color 0.2s ease'
                      }}
                    />
                  );
                })}
              </div>

              {currentQuestion < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-save"
                  style={{
                    width: 'auto',
                    marginTop: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--navy-deep)',
                    color: 'white'
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="btn-save"
                  style={{
                    width: 'auto',
                    marginTop: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--accent-gold)',
                    color: 'var(--navy-deep)',
                    fontWeight: '700'
                  }}
                >
                  <Send size={16} /> Submit Assessment
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render Submitting Screen
  if (phase === 'submitting') {
    return (
      <div className="app-container assessment-page">
        <Navbar title="Screening Assessment" />
        <main className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="loader-container" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span className="spinner" style={{ borderColor: 'var(--navy-deep)', borderTopColor: 'transparent', width: '40px', height: '40px' }}></span>
            <p style={{ margin: 0, fontSize: '20px', fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--navy-deep)' }}>
              Evaluating your responses...
            </p>
            <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: 0 }}>
              Please do not refresh the page or close the window.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Render Result Screen
  if (phase === 'result') {
    const passingScore = assessment?.passingScore || 60;
    const scoreVal = result?.score;
    const totalM = result?.totalMarks || questions.length || 10;
    const scorePercent = result?.percentage !== undefined ? result.percentage : (scoreVal !== undefined ? Math.round((scoreVal / totalM) * 100) : 0);
    const isPassed = scorePercent >= passingScore;

    return (
      <div className="app-container assessment-page">
        <Navbar title="Assessment Result" />
        
        <main className="main-content" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', padding: '40px 20px' }}>
          <div className="assessment-card result-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px' }}>
            <span className="register-eyebrow" style={{ letterSpacing: '0.1em', fontWeight: 'bold' }}>ASSESSMENT COMPLETION</span>
            
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)', marginTop: '8px', marginBottom: '24px' }}>
              Assessment Complete
            </h1>

            {/* Score card */}
            <div style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: 'var(--card-bg)',
              borderLeft: '4px solid var(--accent-gold)',
              padding: '24px',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              textAlign: 'center',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '48px', color: 'var(--text-primary)' }}>
                {scoreVal !== undefined ? `${scoreVal} / ${totalM}` : `${scorePercent}%`}
              </h2>

              <div style={{ width: '100%', height: '8px', background: 'var(--slate-light)', borderRadius: '4px', overflow: 'hidden', margin: '8px 0' }}>
                <div style={{ height: '100%', width: `${scorePercent}%`, background: isPassed ? 'var(--success)' : 'var(--danger)' }}></div>
              </div>

              <div style={{ fontSize: '20px', fontWeight: 'bold', color: isPassed ? 'var(--success)' : 'var(--danger)' }}>
                {isPassed ? '✓ Passed!' : '✗ Not Passed'}
              </div>

              <p style={{ fontSize: '0.95rem', color: 'var(--slate)', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                {result?.message || (isPassed 
                  ? 'You have cleared this screening stage.'
                  : 'You did not meet the cutoff score.')}
              </p>
              
              {isPassed ? (
                <p style={{ color: 'var(--success)', fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>
                  🎉 Congratulations! You have qualified for the next stage.
                </p>
              ) : (
                <p style={{ color: 'var(--danger)', fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>
                  You did not meet the minimum passing score of {passingScore}%.
                </p>
              )}
            </div>

            <button
              onClick={() => navigate('/student-dashboard')}
              className="btn-save"
              style={{ width: 'auto', display: 'inline-flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--navy-deep)', color: 'white' }}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
};

export default Assessment;
