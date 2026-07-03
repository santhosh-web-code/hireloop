import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MockInterview = () => {
  const { jdId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Attempts states
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/mock-interview/start/${jdId}`);
        const loadedQuestions = response.data.questions || [];
        setQuestions(loadedQuestions);
        setAnswers(new Array(loadedQuestions.length).fill(''));
        setAttemptsUsed(response.data.attemptsUsed || 0);
        setAttemptsRemaining(response.data.attemptsRemaining !== undefined ? response.data.attemptsRemaining : 3);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to start mock interview. Ensure you have applied to this job.');
        if (err.response?.status === 403) {
          setAttemptsRemaining(0);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [jdId]);

  const handleAnswerChange = (val) => {
    const updated = [...answers];
    updated[currentStep] = val;
    setAnswers(updated);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async () => {
    // Check if any answers are empty
    if (answers.some(ans => !ans.trim())) {
      setError('Please provide an answer to all questions before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await api.post(`/mock-interview/submit/${jdId}`, {
        questions,
        answers,
      });
      setResult(response.data);
      if (response.data.attemptsUsed !== undefined) {
        setAttemptsUsed(response.data.attemptsUsed);
      }
      if (response.data.attemptsRemaining !== undefined) {
        setAttemptsRemaining(response.data.attemptsRemaining);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit interview. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981'; // Green
    if (score >= 40) return '#f59e0b'; // Orange
    return '#f43f5e'; // Red
  };

  if (loading) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loader-container">
          <span className="spinner"></span>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Preparing your interview questions...</p>
        </div>
      </div>
    );
  }

  if (attemptsRemaining === 0 || (error && error.includes('attempts'))) {
    return (
      <div className="auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
        <div className="auth-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="auth-title" style={{ color: '#f43f5e', marginBottom: '1.5rem', fontSize: '1.75rem' }}>Limit Reached</h2>
          <div className="alert alert-error" style={{ marginBottom: '2rem' }}>
            You have used all 3 mock interview attempts for this position
          </div>
          <button onClick={() => navigate('/student-dashboard')} className="btn btn-secondary" style={{ width: '100%' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <h2 className="auth-title" style={{ color: 'var(--error)' }}>Error</h2>
          <div className="alert alert-error">{error}</div>
          <button onClick={() => navigate('/student-dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!started && questions.length > 0) {
    return (
      <div className="auth-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
        <div className="auth-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '2.5rem', backgroundColor: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="auth-title" style={{ color: 'var(--navy-deep)', marginBottom: '1rem', fontSize: '1.75rem' }}>Ready to Start Mock Interview?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            This interview consists of {questions.length} questions. You will get AI feedback and grading upon submission.
          </p>
          <div style={{ backgroundColor: 'var(--slate-bg)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', marginBottom: '2rem', fontWeight: '700', color: 'var(--navy-deep)' }}>
            Attempt {attemptsUsed + 1} of 3
          </div>
          <button onClick={() => setStarted(true)} className="btn btn-primary" style={{ width: '100%' }}>
            Start Mock Interview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ backgroundColor: 'var(--bg-page)', minHeight: '100vh', padding: '3rem 1rem' }}>
      {result === null ? (
        // Phase 1: Interview in progress
        <div className="interview-screen" style={{ margin: '0 auto', maxWidth: '750px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
              Mock Interview Session (Attempt {attemptsUsed + 1} of 3)
            </span>
            <span className="user-badge">{user?.name}</span>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginBottom: '2rem', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${((currentStep + 1) / questions.length) * 100}%`, 
                backgroundColor: 'var(--primary)', 
                transition: 'width 0.3s ease' 
              }} 
            />
          </div>

          <span className="question-indicator">
            Question {currentStep + 1} of {questions.length}
          </span>
          <h3 className="question-text">{questions[currentStep]}</h3>

          <div className="form-group">
            <label className="form-label" htmlFor="answer-input">Your Answer</label>
            <textarea
              id="answer-input"
              className="answer-textarea"
              value={answers[currentStep]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your detailed answer here... Try to structure your response and include examples where applicable."
              disabled={submitting}
            />
          </div>

          <div className="interview-nav" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
            <button
              onClick={handlePrev}
              className="btn btn-secondary"
              style={{ width: 'auto', minWidth: '100px' }}
              disabled={currentStep === 0 || submitting}
            >
              Previous
            </button>

            {currentStep < questions.length - 1 ? (
              <button
                onClick={handleNext}
                className="btn btn-primary"
                style={{ width: 'auto', minWidth: '100px' }}
                disabled={submitting}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                style={{ width: 'auto', minWidth: '160px', background: 'linear-gradient(135deg, #10b981, var(--success))', border: 'none' }}
                disabled={submitting}
              >
                {submitting ? 'Evaluating...' : 'Submit Interview'}
              </button>
            )}
          </div>
        </div>
      ) : (
        // Phase 2: Evaluation results
        <div className="interview-screen" style={{ margin: '0 auto', maxWidth: '650px', textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ color: 'var(--success)', marginBottom: '0.25rem' }}>Interview Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Here is the AI evaluation of your responses</p>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '2.5rem' }}>
            Attempts Used: {attemptsUsed} / 3 (Attempts Remaining: {attemptsRemaining})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overall Score
            </h4>
            <div 
              className="score-badge" 
              style={{ 
                '--percentage': `${result.overallScore}%`,
                background: `conic-gradient(${getScoreColor(result.overallScore)} ${result.overallScore}%, var(--border-color) 0)`
              }}
            >
              <div className="score-badge-inner" style={{ background: 'var(--card-bg)', borderRadius: '50%', height: '84px', width: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '2.25rem', fontWeight: '800', color: getScoreColor(result.overallScore) }}>
                  {result.overallScore}
                </span>
              </div>
            </div>
          </div>

          <div className="panel-card" style={{ textAlign: 'left', marginBottom: '2rem', borderLeft: `4px solid ${getScoreColor(result.overallScore)}` }}>
            <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Overall Feedback</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>{result.feedback}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem', textAlign: 'left' }}>
            <div className="panel-card" style={{ margin: 0, padding: '1.25rem' }}>
              <h4 style={{ color: '#10b981', fontSize: '1rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--slate-light)', paddingBottom: '0.25rem' }}>
                ✓ Key Strengths
              </h4>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {result.strengths.map((str, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>{str}</li>
                ))}
              </ul>
            </div>

            <div className="panel-card" style={{ margin: 0, padding: '1.25rem' }}>
              <h4 style={{ color: '#f59e0b', fontSize: '1rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--slate-light)', paddingBottom: '0.25rem' }}>
                ⚠ Areas to Improve
              </h4>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {result.improvements.map((imp, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>{imp}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={() => navigate('/student-dashboard')}
            className="btn btn-primary"
            style={{ width: 'auto', minWidth: '220px' }}
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default MockInterview;
