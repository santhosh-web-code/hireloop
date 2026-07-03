import { GoogleGenAI } from '@google/genai';

/**
 * Generate exactly 5 interview questions for a given job title, description, and required skills.
 * Uses the new GoogleGenAI SDK with gemini-2.5-flash.
 * 
 * @param {string} jobTitle - The title of the job
 * @param {string} jobDescription - Detailed description of the job
 * @param {Array<string>} requiredSkills - Array of required skills
 * @returns {Promise<Array<string>>} - A list of 5 generated questions
 */
export const generateInterviewQuestions = async (jobTitle, jobDescription, requiredSkills) => {
  const fallbackQuestions = [
    `Can you describe your experience and projects related to the ${jobTitle} role?`,
    `What do you consider to be the most challenging aspect of a ${jobTitle} position, and how do you handle it?`,
    `How do you keep your technical skills up-to-date and learn new tools relevant to ${jobTitle}?`,
    `Describe a situation where you had to work in a team to solve a difficult problem under tight deadlines.`,
    `Why are you interested in this ${jobTitle} role, and how do you think your background fits this position?`
  ];

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Gemini key loaded:", process.env.GEMINI_API_KEY ? "YES, length=" + process.env.GEMINI_API_KEY.length : "NO, undefined");

    const skillsString = Array.isArray(requiredSkills) ? requiredSkills.join(', ') : requiredSkills;
    const prompt = `You are a professional interviewer. Generate exactly 5 interview questions for the job title "${jobTitle}".
Job Description:
${jobDescription}

Required Skills:
${skillsString}

The questions must be a mix of:
- 2 technical questions based on the required skills: ${skillsString}
- 2 scenario/behavioral questions
- 1 question specifically derived from the job description content.

Respond ONLY with a valid JSON array of 5 strings. Do not include markdown formatting, backticks, or any introductory or concluding text. Just return the raw JSON array in this format:
["question1", "question2", "question3", "question4", "question5"]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text;
    if (!text) {
      throw new Error('Empty response text received from Gemini');
    }

    text = text.trim();
    // Strip markdown formatting if Gemini included it
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

    const questions = JSON.parse(text);
    if (Array.isArray(questions) && questions.length === 5) {
      return questions;
    }
    throw new Error('Response is not a JSON array of length 5');
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return fallbackQuestions;
  }
};

/**
 * Evaluates a candidate's answers to interview questions.
 * Uses the new GoogleGenAI SDK with gemini-2.5-flash.
 * 
 * @param {string} jobTitle - The title of the job
 * @param {Array<{ question: string, answer: string }>} questionsAndAnswers - Q&A pairs
 * @returns {Promise<{ overallScore: number, feedback: string, strengths: Array<string>, improvements: Array<string> }>}
 */
export const evaluateAnswers = async (jobTitle, questionsAndAnswers) => {
  const fallbackResult = {
    overallScore: 0,
    feedback: 'Could not evaluate answers due to a technical issue. Please try again.',
    strengths: [],
    improvements: [],
  };

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const qasString = questionsAndAnswers
      .map((qa, index) => `Q${index + 1}: ${qa.question}\nA${index + 1}: ${qa.answer}`)
      .join('\n\n');

    const prompt = `You are a strict but fair technical interviewer. Evaluate the following candidate's answers to the interview questions for the role of "${jobTitle}".

Interview Questions and Candidate Answers:
${qasString}

Respond ONLY with a valid JSON object in this exact schema, with no markdown formatting, no backticks, and no extra text:
{
  "overallScore": <a number from 0 to 100 based on the quality of answers>,
  "feedback": "<2-3 sentences of overall construct/behavioral feedback>",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text;
    if (!text) {
      throw new Error('Empty response text received from Gemini');
    }

    text = text.trim();
    // Strip markdown formatting if Gemini included it
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();

    const evaluation = JSON.parse(text);

    if (
      typeof evaluation.overallScore === 'number' &&
      typeof evaluation.feedback === 'string' &&
      Array.isArray(evaluation.strengths) &&
      Array.isArray(evaluation.improvements)
    ) {
      return evaluation;
    }
    throw new Error('Response does not match expected JSON structure');
  } catch (error) {
    console.error('Gemini API error:', error.message);
    return fallbackResult;
  }
};
