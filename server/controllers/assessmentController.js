import Assessment from '../models/Assessment.js';
import AssessmentResult from '../models/AssessmentResult.js';
import JobDescription from '../models/JobDescription.js';
import Application from '../models/Application.js';
import { GoogleGenAI } from '@google/genai';

/**
 * Generate assessment questions using Gemini AI based on the Job Description.
 * @route GET /api/assessments/jd/:jdId/generate
 */
export const generateAssessmentQuestions = async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied: Only HR can generate questions' });
    }

    const { jdId } = req.params;
    const jd = await JobDescription.findById(jdId);
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    if (jd.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only generate assessments for your own JDs' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const skillsString = Array.isArray(jd.requiredSkills) ? jd.requiredSkills.join(', ') : jd.requiredSkills;

    const prompt = `You are a professional assessment creator. Generate exactly 10 multiple-choice questions (MCQs) for the job role "${jd.title}".
Job Description:
${jd.description}

Required Skills:
${skillsString}

The 10 questions must be distributed as follows:
- 4 technical questions based on the required skills and role
- 3 scenario-based questions
- 2 aptitude/logic questions
- 1 behavioral question

Each question must have exactly 4 options.
Respond ONLY with a valid JSON array of objects. Do not include markdown formatting, backticks, or any introductory or concluding text. Each object in the array must match this structure exactly:
{
  "questionText": "The question prompt text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0, // 0-based index of the correct option (0, 1, 2, or 3)
  "marks": 1,
  "explanation": "Brief explanation of why this answer is correct"
}`;

    let questions = [];
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let text = response.text;
      if (!text) {
        throw new Error('Empty response text received from Gemini');
      }

      text = text.trim();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      questions = JSON.parse(text);

      if (!Array.isArray(questions) || questions.length !== 10) {
        throw new Error('Response is not a JSON array of length 10');
      }
    } catch (apiError) {
      console.error('Gemini question generation failed:', apiError);
      // Fallback array of 3 generic questions with 4 options each
      const fallbackQuestions = [
        {
          questionText: `Which of the following is a primary responsibility for a ${jd.title || 'Software Developer'}?`,
          options: [
            "Writing clean, maintainable code",
            "Designing physical building blueprints",
            "Managing company financial spreadsheets",
            "Conducting culinary quality audits"
          ],
          correctAnswer: 0,
          marks: 1,
          explanation: "Software developers are primarily responsible for writing software code."
        },
        {
          questionText: "How do you handle a conflict in a team project?",
          options: [
            "Ignore it and hope it goes away",
            "Discuss and align on a compromise professionally",
            "Report the other person immediately without talking",
            "Quit the project and blame others"
          ],
          correctAnswer: 1,
          marks: 1,
          explanation: "Aligning and discussing professionally is the best way to handle team conflicts."
        },
        {
          questionText: "What is the best way to troubleshoot a bug in production?",
          options: [
            "Delete all logs and databases",
            "Check server logs and trace the error path methodically",
            "Wait for the client to fix it themselves",
            "Restart the server repeatedly without investigation"
          ],
          correctAnswer: 1,
          marks: 1,
          explanation: "Checking logs is a methodical way of identifying a production issue."
        }
      ];

      return res.status(200).json({
        message: 'Failed to generate assessment questions via Gemini. Returning fallback questions.',
        questions: fallbackQuestions,
        jdTitle: jd.title
      });
    }

    return res.json({ questions, jdTitle: jd.title });
  } catch (error) {
    console.error('Error in generateAssessmentQuestions:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR creates an Assessment for a Job Description.
 * @route POST /api/assessments
 */
export const createAssessment = async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied: Only HR can create assessments' });
    }

    const { jdId, title, description, questions, passingScore, timeLimit } = req.body;

    if (!jdId || !title || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'jdId, title, and questions array are required' });
    }

    const jd = await JobDescription.findById(jdId);
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    if (jd.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only create assessments for JDs posted by you' });
    }

    const existingAssessment = await Assessment.findOne({ jobDescription: jdId });
    if (existingAssessment) {
      return res.status(400).json({ message: 'Assessment already exists for this JD. Use update instead.' });
    }

    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    const newAssessment = new Assessment({
      jobDescription: jdId,
      createdBy: req.user.id,
      title,
      description: description || '',
      questions,
      totalMarks,
      passingScore: passingScore !== undefined ? passingScore : null,
      timeLimit: timeLimit !== undefined ? timeLimit : 30,
    });

    await newAssessment.save();

    jd.assessmentEnabled = true;
    await jd.save();

    const assessmentObj = newAssessment.toObject();
    if (assessmentObj.questions) {
      assessmentObj.questions = assessmentObj.questions.map(q => {
        const { correctAnswer, explanation, ...rest } = q;
        return rest;
      });
    }

    return res.status(201).json(assessmentObj);
  } catch (error) {
    console.error('Error in createAssessment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get assessment for a specific Job Description.
 * @route GET /api/assessments/jd/:jdId
 */
export const getAssessmentForJD = async (req, res) => {
  try {
    const { jdId } = req.params;

    const assessment = await Assessment.findOne({ jobDescription: jdId });
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    if (req.user.role === 'hr') {
      return res.status(200).json(assessment);
    }

    if (req.user.role === 'student') {
      const existingResult = await AssessmentResult.findOne({
        assessment: assessment._id,
        student: req.user.id,
      });

      if (existingResult) {
        return res.json({
          alreadyAttempted: true,
          result: {
            score: existingResult.score,
            percentage: existingResult.percentage,
            passed: existingResult.passed,
            submittedAt: existingResult.submittedAt,
          },
        });
      }

      const assessmentObj = assessment.toObject();
      if (assessmentObj.questions) {
        assessmentObj.questions = assessmentObj.questions.map(q => {
          const { correctAnswer, explanation, ...rest } = q;
          return rest;
        });
      }
      return res.status(200).json(assessmentObj);
    }

    // Default fallback (e.g. TPO)
    const assessmentObj = assessment.toObject();
    if (assessmentObj.questions) {
      assessmentObj.questions = assessmentObj.questions.map(q => {
        const { correctAnswer, explanation, ...rest } = q;
        return rest;
      });
    }
    return res.status(200).json(assessmentObj);
  } catch (error) {
    console.error('Error in getAssessmentForJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR updates an Assessment.
 * @route PUT /api/assessments/:assessmentId
 */
export const updateAssessment = async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied: Only HR can update assessments' });
    }

    const { assessmentId } = req.params;
    const { title, description, questions, passingScore, timeLimit } = req.body;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const jd = await JobDescription.findById(assessment.jobDescription);
    if (!jd || jd.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only update assessments for JDs posted by you' });
    }

    if (title !== undefined) assessment.title = title;
    if (description !== undefined) assessment.description = description;
    if (questions !== undefined && Array.isArray(questions)) {
      assessment.questions = questions;
      assessment.totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    }
    if (passingScore !== undefined) assessment.passingScore = passingScore;
    if (timeLimit !== undefined) assessment.timeLimit = timeLimit;

    await assessment.save();

    const assessmentObj = assessment.toObject();
    if (assessmentObj.questions) {
      assessmentObj.questions = assessmentObj.questions.map(q => {
        const { correctAnswer, explanation, ...rest } = q;
        return rest;
      });
    }

    return res.status(200).json(assessmentObj);
  } catch (error) {
    console.error('Error in updateAssessment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR deletes an Assessment.
 * @route DELETE /api/assessments/:assessmentId
 */
export const deleteAssessment = async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({ message: 'Access denied: Only HR can delete assessments' });
    }

    const { assessmentId } = req.params;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    const jd = await JobDescription.findById(assessment.jobDescription);
    if (!jd || jd.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only delete assessments for JDs posted by you' });
    }

    jd.assessmentEnabled = false;
    await jd.save();

    await AssessmentResult.deleteMany({ assessment: assessmentId });
    await Assessment.deleteOne({ _id: assessmentId });

    return res.status(200).json({ message: 'Assessment and all associated results deleted successfully' });
  } catch (error) {
    console.error('Error in deleteAssessment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Student submits an Assessment.
 * @route POST /api/assessments/:assessmentId/submit
 */
export const submitAssessment = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied: Only students can submit assessments' });
    }

    const { assessmentId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers array is required' });
    }

    const existingResult = await AssessmentResult.findOne({
      student: req.user.id,
      assessment: assessmentId,
    });
    if (existingResult) {
      return res.status(403).json({ message: 'You have already attempted this assessment. Only one attempt is allowed.' });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found' });
    }

    let score = 0;
    const questions = assessment.questions || [];
    questions.forEach((q, i) => {
      if (answers[i] !== undefined && answers[i] === q.correctAnswer) {
        score += q.marks || 1;
      }
    });

    const totalMarks = assessment.totalMarks || 1;
    const percentage = Math.round((score / totalMarks) * 100);
    const passed = assessment.passingScore !== null && assessment.passingScore !== undefined
      ? percentage >= assessment.passingScore
      : true;

    const newResult = new AssessmentResult({
      assessment: assessmentId,
      student: req.user.id,
      jobDescription: assessment.jobDescription,
      answers,
      score,
      totalMarks,
      percentage,
      passed,
      submittedAt: new Date(),
    });

    await newResult.save();

    const application = await Application.findOne({
      student: req.user.id,
      jobDescription: assessment.jobDescription,
    });

    if (application) {
      application.assessmentScore = percentage;
      application.assessmentAttempted = true;
      application.assessmentCompletedAt = new Date();
      if (!passed && assessment.passingScore !== null && assessment.passingScore !== undefined) {
        application.status = 'Rejected';
      }
      await application.save();
    }

    return res.status(200).json({
      score,
      totalMarks,
      percentage,
      passed,
      message: passed
        ? "Congratulations! You passed the assessment."
        : "You did not meet the minimum score requirement.",
    });
  } catch (error) {
    console.error('Error in submitAssessment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get assessment result of the logged-in student.
 * @route GET /api/assessments/:assessmentId/result
 */
export const getMyAssessmentResult = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const result = await AssessmentResult.findOne({
      student: req.user.id,
      assessment: assessmentId,
    });

    if (result) {
      return res.status(200).json({
        alreadyAttempted: true,
        score: result.score,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt,
      });
    }

    return res.status(200).json({
      alreadyAttempted: false,
    });
  } catch (error) {
    console.error('Error in getMyAssessmentResult:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
