import JobDescription from '../models/JobDescription.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import Assessment from '../models/Assessment.js';
import notifyStatusChange from '../utils/notifyStatusChange.js';
import sendEmail from '../utils/sendEmail.js';

/**
 * HR creates a Job Description.
 * @route POST /api/jd
 */
export const createJD = async (req, res) => {
  try {
    const hrUser = await User.findById(req.user.id);
    if (!hrUser) {
      return res.status(404).json({ message: 'HR User not found' });
    }

    const {
      title,
      description,
      requiredSkills,
      minCGPA,
      allowedBranches,
      maxBacklogs,
      package: jobPackage,
      location,
      customQuestions,
      documentBase64,
      documentName,
      documentFileType,
      enableAssessment,
      assessmentQuestions,
      assessmentPassingScore,
      assessmentTimeLimit,
    } = req.body;

    if (!title || !description || !requiredSkills || minCGPA === undefined || !allowedBranches) {
      return res.status(400).json({ message: 'Title, description, requiredSkills, minCGPA, and allowedBranches are required' });
    }

    const newJD = new JobDescription({
      title,
      companyName: hrUser.companyName,
      postedBy: req.user.id,
      description,
      requiredSkills,
      minCGPA,
      allowedBranches,
      maxBacklogs: maxBacklogs || 0,
      package: jobPackage,
      location,
      approvalStatus: 'pending',
      customQuestions: customQuestions || [],
      documentBase64: documentBase64 || null,
      documentName: documentName || null,
      documentFileType: documentFileType || null,
    });

    await newJD.save();

    let assessmentCreated = false;
    if (enableAssessment === true || enableAssessment === 'true') {
      newJD.assessmentEnabled = true;
      if (assessmentPassingScore !== undefined) {
        newJD.assessmentCutoffScore = Number(assessmentPassingScore);
      }
      if (assessmentQuestions && Array.isArray(assessmentQuestions) && assessmentQuestions.length > 0) {
        const totalMarks = assessmentQuestions.length;
        const newAssessment = new Assessment({
          jobDescription: newJD._id,
          createdBy: req.user.id,
          title: `${newJD.title} Screening Test`,
          description: `Technical assessment for ${newJD.title} role`,
          questions: assessmentQuestions,
          totalMarks,
          passingScore: Number(assessmentPassingScore) || 60,
          timeLimit: Number(assessmentTimeLimit) || 30,
        });
        await newAssessment.save();
        assessmentCreated = true;
      }
      await newJD.save();
    }

    const responseJD = newJD.toObject();
    responseJD.assessmentCreated = assessmentCreated;

    return res.status(201).json(responseJD);
  } catch (error) {
    console.error('Error in createJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR fetches all JDs they posted, sorted by createdAt descending.
 * @route GET /api/jd/my-jds
 */
export const getMyJDs = async (req, res) => {
  try {
    const jds = await JobDescription.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(jds);
  } catch (error) {
    console.error('Error in getMyJDs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR updates their own Job Description (only allowed if pending or rejected status).
 * @route PUT /api/jd/:jdId
 */
export const updateJD = async (req, res) => {
  try {
    console.log('updateJD called: params =', req.params, ', body =', req.body);
    const { jdId } = req.params;
    const jd = await JobDescription.findOne({ _id: jdId, postedBy: req.user.id });

    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found or unauthorized' });
    }

    const {
      title,
      description,
      requiredSkills,
      minCGPA,
      allowedBranches,
      maxBacklogs,
      package: jobPackage,
      location,
      customQuestions,
      documentBase64,
      documentName,
      documentFileType,
      enableAssessment,
      assessmentQuestions,
      assessmentPassingScore,
      assessmentTimeLimit,
    } = req.body;

    if (title !== undefined) jd.title = title;
    if (description !== undefined) jd.description = description;
    if (requiredSkills !== undefined) jd.requiredSkills = requiredSkills;
    if (minCGPA !== undefined) jd.minCGPA = minCGPA;
    if (allowedBranches !== undefined) jd.allowedBranches = allowedBranches;
    if (maxBacklogs !== undefined) jd.maxBacklogs = maxBacklogs;
    if (jobPackage !== undefined) jd.package = jobPackage;
    if (location !== undefined) jd.location = location;
    if (customQuestions !== undefined) jd.customQuestions = customQuestions;
    if (documentBase64 !== undefined) jd.documentBase64 = documentBase64;
    if (documentName !== undefined) jd.documentName = documentName;
    if (documentFileType !== undefined) jd.documentFileType = documentFileType;

    if (enableAssessment !== undefined) {
      jd.assessmentEnabled = (enableAssessment === true || enableAssessment === 'true');
      if (jd.assessmentEnabled) {
        if (assessmentPassingScore !== undefined) {
          jd.assessmentCutoffScore = Number(assessmentPassingScore);
        }
      } else {
        jd.assessmentCutoffScore = null;
      }
    }

    const wasApproved = jd.approvalStatus === 'approved';
    jd.approvalStatus = 'pending';
    jd.rejectionReason = null;

    await jd.save();

    let assessmentCreated = false;
    if (enableAssessment === true || enableAssessment === 'true') {
      if (assessmentQuestions && Array.isArray(assessmentQuestions) && assessmentQuestions.length > 0) {
        let assessmentDoc = await Assessment.findOne({ jobDescription: jd._id });
        if (assessmentDoc) {
          assessmentDoc.questions = assessmentQuestions;
          assessmentDoc.totalMarks = assessmentQuestions.length;
          assessmentDoc.passingScore = Number(assessmentPassingScore) || 60;
          assessmentDoc.timeLimit = Number(assessmentTimeLimit) || 30;
          await assessmentDoc.save();
        } else {
          assessmentDoc = new Assessment({
            jobDescription: jd._id,
            createdBy: req.user.id,
            title: `${jd.title} Screening Test`,
            description: `Technical assessment for ${jd.title} role`,
            questions: assessmentQuestions,
            totalMarks: assessmentQuestions.length,
            passingScore: Number(assessmentPassingScore) || 60,
            timeLimit: Number(assessmentTimeLimit) || 30,
          });
          await assessmentDoc.save();
        }
        assessmentCreated = true;
      }
    }

    await jd.save();
    
    const message = wasApproved
      ? 'JD updated successfully. It has been sent back for TPO approval.'
      : 'JD updated successfully.';

    const responseJD = jd.toObject();
    responseJD.assessmentCreated = assessmentCreated;

    return res.status(200).json({ message, jd: responseJD });
  } catch (error) {
    console.error('Error in updateJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Download a JD document.
 * @route GET /api/jd/document/:jdId
 */
export const downloadJDDocument = async (req, res) => {
  try {
    const { jdId } = req.params;
    const jd = await JobDescription.findById(jdId);
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    if (!jd.documentBase64) {
      return res.status(404).json({ message: 'No document uploaded' });
    }

    const fileBuffer = Buffer.from(jd.documentBase64, 'base64');
    
    res.setHeader('Content-Type', jd.documentFileType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${jd.documentName || 'document.pdf'}"`);
    return res.send(fileBuffer);
  } catch (error) {
    console.error('Error in downloadJDDocument:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR deletes their own Job Description and all related applications.
 * @route DELETE /api/jd/:jdId
 */
export const deleteJD = async (req, res) => {
  try {
    const { jdId } = req.params;
    const jd = await JobDescription.findOne({ _id: jdId, postedBy: req.user.id });

    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found or unauthorized' });
    }

    await JobDescription.deleteOne({ _id: jdId });
    await Application.deleteMany({ jobDescription: jdId });

    return res.status(200).json({ message: 'Job Description and associated applications deleted successfully' });
  } catch (error) {
    console.error('Error in deleteJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR views all student applications for a specific Job Description.
 * @route GET /api/jd/:jdId/applicants
 */
export const getApplicantsForJD = async (req, res) => {
  try {
    const { jdId } = req.params;

    const jd = await JobDescription.findOne({ _id: jdId, postedBy: req.user.id });
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found or unauthorized' });
    }

    const applications = await Application.find({ jobDescription: jdId })
      .populate({
        path: 'student',
        select: '-password',
      });

    return res.status(200).json(applications);
  } catch (error) {
    console.error('Error in getApplicantsForJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * HR updates a student's application status and triggers email notification.
 * @route PUT /api/jd/applications/:applicationId/status
 */
export const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify ownership: JD must be posted by the logged-in HR
    const jd = await JobDescription.findById(application.jobDescription);
    if (!jd || jd.postedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: You can only update applications for JDs posted by you.' });
    }

    application.status = status;
    application.updatedAt = new Date();
    await application.save();

    // Populate student (name, email) and jobDescription (companyName)
    await application.populate([
      { path: 'student', select: '-password' },
      { path: 'jobDescription' },
    ]);

    if (application.student && application.jobDescription) {
      await notifyStatusChange(
        application.student.email,
        application.student.name,
        application.jobDescription.companyName,
        application.status
      );
    }

    return res.status(200).json(application);
  } catch (error) {
    console.error('Error in updateApplicationStatus:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * TPO fetches all JDs where approvalStatus is "pending".
 * @route GET /api/jd/pending
 */
export const getPendingJDs = async (req, res) => {
  try {
    const jds = await JobDescription.find({ approvalStatus: 'pending' })
      .populate('postedBy', 'name companyName')
      .sort({ createdAt: 1 });
    return res.status(200).json(jds);
  } catch (error) {
    console.error('Error in getPendingJDs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * TPO approves a Job Description and notifies both HR and matching students.
 * @route PUT /api/jd/:jdId/approve
 */
export const approveJD = async (req, res) => {
  try {
    const { jdId } = req.params;
    const jd = await JobDescription.findById(jdId);

    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    jd.approvalStatus = 'approved';
    await jd.save();

    await jd.populate('postedBy', 'name email');

    // Notify HR
    if (jd.postedBy && jd.postedBy.email) {
      const hrSubject = 'Your JD has been approved';
      const hrHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 6px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">JD Approved</p>
          </div>
          <div style="color: #334155; line-height: 1.6; font-size: 15px;">
            <p style="margin-top: 0;">Hi <strong>${jd.postedBy.name}</strong>,</p>
            <p>Your job description for <strong>${jd.title}</strong> at <strong>${jd.companyName}</strong> has been approved by the TPO and is now live for students to apply.</p>
            <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
              Regards,<br/>HireLoop Team
            </p>
          </div>
        </div>
      `;
      await sendEmail(jd.postedBy.email, hrSubject, hrHtml);
    }

    // Find eligible students: role student, cgpa >= minCGPA, branch in allowedBranches, backlogs <= maxBacklogs
    const eligibleStudents = await User.find({
      role: 'student',
      cgpa: { $gte: jd.minCGPA },
      branch: { $in: jd.allowedBranches },
      backlogs: { $lte: jd.maxBacklogs },
    });

    let notifiedCount = 0;
    const shortDescription = jd.description.length > 200 ? jd.description.substring(0, 200) + '...' : jd.description;

    for (const student of eligibleStudents) {
      try {
        const studentSubject = `New Job Opportunity: ${jd.title} at ${jd.companyName}`;
        const studentHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 20px; border-radius: 6px; color: #ffffff;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
              <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">New Job Opportunity</p>
            </div>
            <div style="color: #334155; line-height: 1.6; font-size: 15px;">
              <p style="margin-top: 0;">Hi <strong>${student.name}</strong>,</p>
              <p>A new job opportunity has been posted by <strong>${jd.companyName}</strong> that matches your profile:</p>
              
              <div style="margin: 15px 0; padding: 12px; background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="margin: 0 0 8px 0;"><strong>Position:</strong> ${jd.title}</p>
                <p style="margin: 0 0 8px 0;"><strong>Company:</strong> ${jd.companyName}</p>
                <p style="margin: 0;"><strong>Description:</strong> ${shortDescription}</p>
              </div>
              
              <p>Log in to HireLoop to view the full details and apply.</p>
              <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
                Regards,<br/>HireLoop Team
              </p>
            </div>
          </div>
        `;
        await sendEmail(student.email, studentSubject, studentHtml);
        notifiedCount++;
      } catch (studentEmailError) {
        console.error(`Failed to send JD notification email to ${student.email}:`, studentEmailError);
      }
    }

    return res.status(200).json({
      message: 'Job Description approved and matching students notified successfully',
      notifiedStudentsCount: notifiedCount,
      jd,
    });
  } catch (error) {
    console.error('Error in approveJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * TPO rejects a Job Description.
 * @route PUT /api/jd/:jdId/reject
 */
export const rejectJD = async (req, res) => {
  try {
    const { jdId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const jd = await JobDescription.findById(jdId);
    if (!jd) {
      return res.status(404).json({ message: 'Job Description not found' });
    }

    jd.approvalStatus = 'rejected';
    jd.rejectionReason = rejectionReason;
    await jd.save();

    await jd.populate('postedBy', 'name email');

    // Notify HR
    if (jd.postedBy && jd.postedBy.email) {
      const subject = 'Your JD has been rejected';
      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; border-radius: 6px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">JD Rejected</p>
          </div>
          <div style="color: #334155; line-height: 1.6; font-size: 15px;">
            <p style="margin-top: 0;">Hi <strong>${jd.postedBy.name}</strong>,</p>
            <p>We regret to inform you that your job description for <strong>${jd.title}</strong> at <strong>${jd.companyName}</strong> has been rejected by the TPO.</p>
            <p><strong>Reason for rejection:</strong> ${rejectionReason}</p>
            <p>Please revise your job description and submit it again for approval.</p>
            <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
              Regards,<br/>HireLoop Team
            </p>
          </div>
        </div>
      `;
      await sendEmail(jd.postedBy.email, subject, html);
    }

    return res.status(200).json({ message: 'Job Description rejected successfully', jd });
  } catch (error) {
    console.error('Error in rejectJD:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Fetch all approved and active Job Descriptions, sorted by createdAt descending.
 * @route GET /api/jd/approved
 */
export const getAllApprovedJDs = async (req, res) => {
  try {
    const jds = await JobDescription.find({ approvalStatus: 'approved', isActive: true }).sort({ createdAt: -1 });
    return res.status(200).json(jds);
  } catch (error) {
    console.error('Error in getAllApprovedJDs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
