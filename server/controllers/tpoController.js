import User from '../models/User.js';
import Application from '../models/Application.js';
import sendEmail from '../utils/sendEmail.js';
import Assessment from '../models/Assessment.js';
import JobDescription from '../models/JobDescription.js';
import AssessmentResult from '../models/AssessmentResult.js';
import Notification from '../models/Notification.js';

/**
 * Get all users where role is "hr" and isApproved is false (excluding password field)
 * @route GET /api/tpo/pending-hrs
 */
export const getPendingHRs = async (req, res) => {
  try {
    const pendingHRs = await User.find({ role: 'hr', isApproved: false }).select('-password');
    return res.status(200).json(pendingHRs);
  } catch (error) {
    console.error('Error in getPendingHRs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Approve an HR user, updating isApproved to true and sending approval email
 * @route PUT /api/tpo/approve-hr/:hrId
 */
export const approveHR = async (req, res) => {
  try {
    const { hrId } = req.params;
    const user = await User.findById(hrId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'hr') {
      return res.status(400).json({ message: 'Specified user is not an HR' });
    }

    user.isApproved = true;
    await user.save();

    // Send approval email
    const subject = 'HireLoop - Account Approved';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 6px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Account Approved</p>
        </div>
        <div style="color: #334155; line-height: 1.6; font-size: 15px;">
          <p style="margin-top: 0;">Hi <strong>${user.name}</strong>,</p>
          <p>Your HR account has been approved by the TPO. You can now login and access all features of HireLoop.</p>
          <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
            Regards,<br/>HireLoop Team
          </p>
        </div>
      </div>
    `;

    await sendEmail(user.email, subject, html);

    return res.status(200).json({ message: 'HR account approved successfully', user });
  } catch (error) {
    console.error('Error in approveHR:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Reject an HR user, sending rejection email and deleting from database
 * @route DELETE /api/tpo/reject-hr/:hrId
 */
export const rejectHR = async (req, res) => {
  try {
    const { hrId } = req.params;
    const user = await User.findById(hrId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'hr') {
      return res.status(400).json({ message: 'Specified user is not an HR' });
    }

    // Send rejection email
    const subject = 'HireLoop - Account Rejected';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px; background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; border-radius: 6px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">HireLoop</h2>
          <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Account Rejected</p>
        </div>
        <div style="color: #334155; line-height: 1.6; font-size: 15px;">
          <p style="margin-top: 0;">Hi <strong>${user.name}</strong>,</p>
          <p>We regret to inform you that your HR account has been rejected by the TPO. If you believe this is a mistake, please reach out to the TPO office.</p>
          <p style="margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 13px; color: #64748b;">
            Regards,<br/>HireLoop Team
          </p>
        </div>
      </div>
    `;

    await sendEmail(user.email, subject, html);

    // Delete user from database
    await User.findByIdAndDelete(hrId);

    return res.status(200).json({ message: 'HR account rejected and deleted successfully' });
  } catch (error) {
    console.error('Error in rejectHR:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all users where role is "student" with complete profiles and applications summary
 * @route GET /api/tpo/all-students
 */
export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });

    const studentData = await Promise.all(
      students.map(async (student) => {
        const apps = await Application.find({ student: student._id })
          .populate({
            path: 'jobDescription',
            select: 'title companyName'
          });

        return {
          student: {
            _id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId,
            branch: student.branch,
            degreeCGPA: student.degreeCGPA,
            passedOutYear: student.passedOutYear,
            tenthPercent: student.tenthPercent,
            twelfthPercent: student.twelfthPercent,
            backlogs: student.backlogs,
            skills: student.skills,
            collegeName: student.collegeName,
            bio: student.bio,
            resumeBase64: student.resumeBase64,
            resumeFileName: student.resumeFileName,
            isEmailVerified: student.isEmailVerified,
            createdAt: student.createdAt,
          },
          applications: apps.map((app) => ({
            _id: app._id,
            jobDescription: {
              title: app.jobDescription?.title || 'N/A',
              companyName: app.jobDescription?.companyName || 'N/A',
            },
            status: app.status,
            appliedAt: app.appliedAt,
            mockInterviewScore: app.mockInterviewScore,
            assessmentScore: app.assessmentScore,
          })),
          totalApplications: apps.length,
        };
      })
    );

    return res.status(200).json(studentData);
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all users where role is "hr" and isApproved is true (excluding password field)
 * @route GET /api/tpo/hrs
 */
export const getAllHRs = async (req, res) => {
  try {
    const hrs = await User.find({ role: 'hr', isApproved: true }).select('-password');
    return res.status(200).json(hrs);
  } catch (error) {
    console.error('Error in getAllHRs:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get TPO dashboard statistics
 * @route GET /api/tpo/dashboard-stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalHRs = await User.countDocuments({ role: 'hr', isApproved: true });
    const pendingHRApprovals = await User.countDocuments({ role: 'hr', isApproved: false });
    const totalApplications = await Application.countDocuments();
    const totalJDs = await JobDescription.countDocuments();
    const approvedJDs = await JobDescription.countDocuments({ approvalStatus: 'approved' });
    const totalAssessments = await Assessment.countDocuments();

    return res.status(200).json({
      totalStudents,
      totalHRs,
      pendingHRApprovals,
      totalApplications,
      totalJDs,
      approvedJDs,
      totalAssessments,
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all applications in the system
 * @route GET /api/tpo/all-applications
 */
export const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate({
        path: 'student',
        select: 'name email studentId branch passedOutYear degreeCGPA backlogs collegeName'
      })
      .populate({
        path: 'jobDescription',
        select: 'title companyName package location approvalStatus'
      })
      .sort({ appliedAt: -1 });

    return res.status(200).json(applications);
  } catch (error) {
    console.error('Error in getAllApplications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get a specific student's profile and applications
 * @route GET /api/tpo/student-profile/:studentId
 */
export const getStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({ _id: studentId, role: 'student' }).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const applications = await Application.find({ student: studentId })
      .populate({
        path: 'jobDescription',
        select: 'title companyName package'
      });

    return res.status(200).json({
      student,
      applications
    });
  } catch (error) {
    console.error('Error in getStudentProfile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Remove a student and delete all their associated applications & assessment results
 * @route DELETE /api/tpo/remove-student/:studentId
 */
export const removeStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await Application.deleteMany({ student: studentId });
    await AssessmentResult.deleteMany({ student: studentId });
    await User.findByIdAndDelete(studentId);

    return res.status(200).json({ message: 'Student account removed successfully' });
  } catch (error) {
    console.error('Error in removeStudent:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Remove an HR rep and delete all posted JDs and their applications & assessment results
 * @route DELETE /api/tpo/remove-hr/:hrId
 */
export const removeHR = async (req, res) => {
  try {
    const { hrId } = req.params;

    const hr = await User.findOne({ _id: hrId, role: 'hr' });
    if (!hr) {
      return res.status(404).json({ message: 'HR not found' });
    }

    const jds = await JobDescription.find({ postedBy: hrId });

    for (const jd of jds) {
      await Application.deleteMany({ jobDescription: jd._id });
      await Assessment.deleteMany({ jobDescription: jd._id });
      await AssessmentResult.deleteMany({ jobDescription: jd._id });
    }

    await JobDescription.deleteMany({ postedBy: hrId });
    await User.findByIdAndDelete(hrId);

    return res.status(200).json({ message: 'HR account and all associated data removed successfully' });
  } catch (error) {
    console.error('Error in removeHR:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get all notifications for TPO
 * @route GET /api/tpo/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: 'tpo' }).sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark a specific notification as read
 * @route PUT /api/tpo/notifications/:notificationId/read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json(notification);
  } catch (error) {
    console.error('Error in markNotificationRead:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Mark all TPO notifications as read
 * @route PUT /api/tpo/notifications/read-all
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: 'tpo', isRead: false },
      { $set: { isRead: true } }
    );
    return res.status(200).json({ message: 'All notifications marked as read successfully' });
  } catch (error) {
    console.error('Error in markAllNotificationsRead:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/tpo/students
 * Returns detailed overview of all registered student profiles and application lists
 */
export const getStudentsListForSMS = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    
    const results = [];
    for (const student of students) {
      const applications = await Application.find({ student: student._id }).populate({
        path: 'jobDescription',
        select: 'title companyName package'
      });
      
      results.push({
        student,
        applications,
        totalApplications: applications.length
      });
    }
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error in getStudentsListForSMS:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * GET /api/tpo/student/:id
 * Returns single student profile and applications
 */
export const getStudentDetailsByTPO = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findOne({ _id: id, role: 'student' }).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const applications = await Application.find({ student: id }).populate({
      path: 'jobDescription',
      select: 'title companyName package'
    });

    return res.status(200).json({
      student,
      applications
    });
  } catch (error) {
    console.error('Error in getStudentDetailsByTPO:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * PUT /api/tpo/student/:id
 * Updates student profile details and isDisabled status by TPO admin
 */
export const editStudentByTPO = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      studentId,
      branch,
      cgpa,
      backlogs,
      passedOutYear,
      phone,
      isDisabled
    } = req.body;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (name !== undefined) student.name = name;
    if (email !== undefined) student.email = email;
    if (studentId !== undefined) student.studentId = studentId;
    if (branch !== undefined) student.branch = branch;
    if (cgpa !== undefined) student.cgpa = cgpa;
    if (backlogs !== undefined) student.backlogs = backlogs;
    if (passedOutYear !== undefined) student.passedOutYear = passedOutYear;
    if (phone !== undefined) student.phone = phone;
    if (isDisabled !== undefined) student.isDisabled = isDisabled;
    
    student.updatedAt = Date.now();

    await student.save();

    const applications = await Application.find({ student: id }).populate({
      path: 'jobDescription',
      select: 'title companyName package'
    });

    // Strip password from returned user object
    const returnedStudent = student.toObject();
    delete returnedStudent.password;

    return res.status(200).json({
      student: returnedStudent,
      applications
    });
  } catch (error) {
    console.error('Error in editStudentByTPO:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

