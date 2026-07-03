import User from '../models/User.js';
import JobDescription from '../models/JobDescription.js';
import Application from '../models/Application.js';
import Assessment from '../models/Assessment.js';

/**
 * Student views Job Descriptions they qualify for, and those they don't with reasons.
 * @route GET /api/student/eligible-jds
 */
export const getEligibleJDs = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student user not found' });
    }

    const allJDs = await JobDescription.find({ approvalStatus: 'approved', isActive: true });

    const eligibleJDs = [];
    const ineligibleJDs = [];

    for (const jd of allJDs) {
      const reasons = [];

      // Verify CGPA
      if (student.cgpa === null || student.cgpa === undefined || jd.minCGPA > student.cgpa) {
        reasons.push('CGPA too low');
      }

      // Verify Branch
      if (!student.branch || !jd.allowedBranches.includes(student.branch)) {
        reasons.push('Branch not eligible');
      }

      // Verify Backlogs
      if (student.backlogs === null || student.backlogs === undefined || jd.maxBacklogs < student.backlogs) {
        reasons.push('Too many backlogs');
      }

      if (reasons.length === 0) {
        eligibleJDs.push(jd);
      } else {
        const jdObj = jd.toObject();
        jdObj.reasons = reasons;
        ineligibleJDs.push(jdObj);
      }
    }

    console.log("First JD customQuestions:", eligibleJDs[0]?.customQuestions);

    return res.status(200).json({ eligibleJDs, ineligibleJDs });
  } catch (error) {
    console.error('Error in getEligibleJDs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Student applies to a Job Description.
 * @route POST /api/student/apply/:jdId
 */
export const applyToJD = async (req, res) => {
  try {
    const { jdId } = req.params;
    const {
      resumeText,
      customAnswers,
      resumeBase64,
      resumeFileName,
      resumeFileType,
      useProfileResume
    } = req.body;
    const studentId = req.user.id;

    // Check if application already exists
    const existingApp = await Application.findOne({ student: studentId, jobDescription: jdId });
    if (existingApp) {
      return res.status(400).json({ message: 'Already applied to this job' });
    }

    const jd = await JobDescription.findById(jdId);
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    if (jd.approvalStatus !== 'approved' || !jd.isActive) {
      return res.status(400).json({ message: 'Job opportunity is not active or approved' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student user not found' });
    }

    // Re-check eligibility server-side
    const reasons = [];
    if (student.cgpa === null || student.cgpa === undefined || jd.minCGPA > student.cgpa) {
      reasons.push('CGPA too low');
    }
    if (!student.branch || !jd.allowedBranches.includes(student.branch)) {
      reasons.push('Branch not eligible');
    }
    if (student.backlogs === null || student.backlogs === undefined || jd.maxBacklogs < student.backlogs) {
      reasons.push('Too many backlogs');
    }

    if (reasons.length > 0) {
      return res.status(400).json({ message: 'You are not eligible for this job opportunity', reasons });
    }

    // Check customQuestions
    if (jd.customQuestions && jd.customQuestions.length > 0) {
      const answersList = customAnswers || [];
      for (const question of jd.customQuestions) {
        if (question.isRequired) {
          const matchedAnswer = answersList.find(
            ans => ans.questionText === question.questionText
          );
          if (!matchedAnswer || !matchedAnswer.answer || matchedAnswer.answer.trim() === '') {
            return res.status(400).json({ message: 'Please answer all required questions before applying.' });
          }
        }
      }
    }

    // Determine resume values
    let finalBase64 = resumeBase64 || null;
    let finalFileName = resumeFileName || null;
    let finalFileType = resumeFileType || null;

    if (useProfileResume && student) {
      finalBase64 = student.resumeBase64 || null;
      finalFileName = student.resumeFileName || null;
      finalFileType = student.resumeFileType || null;
    }

    const newApplication = new Application({
      student: studentId,
      jobDescription: jdId,
      status: 'Applied',
      resumeText: resumeText || null,
      resumeBase64: finalBase64,
      resumeFileName: finalFileName,
      resumeFileType: finalFileType,
      customAnswers: customAnswers || [],
    });

    await newApplication.save();

    let assessmentRequired = false;
    let assessmentId = null;

    if (jd.assessmentEnabled) {
      const assessment = await Assessment.findOne({ jobDescription: jdId });
      if (assessment) {
        assessmentRequired = true;
        assessmentId = assessment._id;
      }
    }

    return res.status(201).json({
      application: newApplication,
      assessmentRequired,
      assessmentId,
    });
  } catch (error) {
    console.error('Error in applyToJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Student views their own applications.
 * @route GET /api/student/my-applications
 */
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id })
      .populate('jobDescription', 'title companyName package location')
      .sort({ appliedAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error('Error in getMyApplications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      branch,
      cgpa,
      backlogs,
      skills,
      resumeText,
      studentId,
      passedOutYear,
      tenthPercent,
      twelfthPercent,
      degreeCGPA,
      bio,
      resumeBase64,
      resumeFileName,
      resumeFileType,
    } = req.body;
    const updateData = {};

    if (branch !== undefined) updateData.branch = branch;
    if (cgpa !== undefined) updateData.cgpa = cgpa;
    if (backlogs !== undefined) updateData.backlogs = backlogs;
    if (skills !== undefined) updateData.skills = skills;
    if (resumeText !== undefined) updateData.resumeText = resumeText;
    if (studentId !== undefined) updateData.studentId = studentId;
    if (passedOutYear !== undefined) updateData.passedOutYear = passedOutYear;
    if (tenthPercent !== undefined) updateData.tenthPercent = tenthPercent;
    if (twelfthPercent !== undefined) updateData.twelfthPercent = twelfthPercent;
    if (degreeCGPA !== undefined) updateData.degreeCGPA = degreeCGPA;
    if (bio !== undefined) updateData.bio = bio;
    if (resumeBase64 !== undefined) updateData.resumeBase64 = resumeBase64;
    if (resumeFileName !== undefined) updateData.resumeFileName = resumeFileName;
    if (resumeFileType !== undefined) updateData.resumeFileType = resumeFileType;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Student user not found' });
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error in updateProfile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Student gets their own profile (excluding password).
 * @route GET /api/student/profile
 */
export const getMyProfile = async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student user not found' });
    }
    return res.status(200).json(student);
  } catch (error) {
    console.error('Error in getMyProfile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Download a student's resume file.
 * @route GET /api/student/resume/:studentId
 */
export const downloadResume = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.resumeBase64) {
      return res.status(404).json({ message: 'No resume uploaded' });
    }

    const fileBuffer = Buffer.from(student.resumeBase64, 'base64');
    
    res.setHeader('Content-Type', student.resumeFileType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${student.resumeFileName || 'resume.pdf'}"`);
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error in downloadResume:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
