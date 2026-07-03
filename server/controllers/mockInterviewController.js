import JobDescription from '../models/JobDescription.js';
import Application from '../models/Application.js';
import { generateInterviewQuestions, evaluateAnswers } from '../utils/geminiAI.js';

/**
 * Student starts a mock interview for a specific Job Description.
 * @route GET /api/mock-interview/start/:jdId
 */
export const startMockInterview = async (req, res) => {
  try {
    const { jdId } = req.params;
    const studentId = req.user.id;

    const jd = await JobDescription.findById(jdId);
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    const application = await Application.findOne({ student: studentId, jobDescription: jdId });
    if (!application) {
      return res.status(400).json({ message: 'You must apply to this job before taking the mock interview' });
    }

    const MAX_ATTEMPTS = 3;
    const attempts = application.mockInterviewAttempts || 0;
    if (attempts >= MAX_ATTEMPTS) {
      return res.status(403).json({ message: "You have reached the maximum number of mock interview attempts (3) for this job." });
    }

    const questions = await generateInterviewQuestions(jd.title, jd.description, jd.requiredSkills);

    return res.status(200).json({
      jdId,
      jdTitle: jd.title,
      questions,
      attemptsUsed: attempts,
      attemptsRemaining: MAX_ATTEMPTS - attempts,
    });
  } catch (error) {
    console.error('Error in startMockInterview:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Student submits their mock interview answers for evaluation.
 * @route POST /api/mock-interview/submit/:jdId
 */
export const submitMockInterview = async (req, res) => {
  try {
    const { jdId } = req.params;
    const studentId = req.user.id;
    const { questions, answers } = req.body;

    if (!questions || !answers || !Array.isArray(questions) || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Questions and answers arrays are required' });
    }

    if (questions.length !== answers.length) {
      return res.status(400).json({ message: 'Questions and answers arrays must have the same length' });
    }

    const jd = await JobDescription.findById(jdId);
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    const application = await Application.findOne({ student: studentId, jobDescription: jdId });
    if (!application) {
      return res.status(400).json({ message: 'No application found for this job description' });
    }

    // Zip questions and answers together
    const questionsAndAnswers = questions.map((question, index) => ({
      question,
      answer: answers[index] || '',
    }));

    // Evaluate answers using Gemini AI
    const evaluation = await evaluateAnswers(jd.title, questionsAndAnswers);

    // Save score and feedback to the Application record
    application.mockInterviewScore = evaluation.overallScore;
    application.mockInterviewFeedback = evaluation.feedback;
    application.strengths = evaluation.strengths || [];
    application.improvements = evaluation.improvements || [];
    
    // Increment mockInterviewAttempts by 1 and save
    application.mockInterviewAttempts = (application.mockInterviewAttempts || 0) + 1;
    await application.save();

    const MAX_ATTEMPTS = 3;

    return res.status(200).json({
      ...evaluation,
      attemptsUsed: application.mockInterviewAttempts,
      attemptsRemaining: MAX_ATTEMPTS - application.mockInterviewAttempts,
    });
  } catch (error) {
    console.error('Error in submitMockInterview:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
