import User from '../models/User.js';
import Application from '../models/Application.js';
import sendEmail from '../utils/sendEmail.js';
import Assessment from '../models/Assessment.js';
import JobDescription from '../models/JobDescription.js';
import AssessmentResult from '../models/AssessmentResult.js';
import Notification from '../models/Notification.js';
import EligibilityHistory from '../models/EligibilityHistory.js';
import PlacementHistory from '../models/PlacementHistory.js';
import { updateStudentPlacementStatus } from '../utils/placementWorkflow.js';

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

    notification.isRead = !notification.isRead;
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

export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndDelete(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    return res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getEligibilityHistory = async (req, res) => {
  try {
    const history = await EligibilityHistory.find()
      .populate('student', 'name studentId email branch')
      .populate('jobDescription', 'title companyName')
      .sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error in getEligibilityHistory:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const parsePackage = (pkgStr) => {
  if (!pkgStr) return 0;
  const match = pkgStr.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  let val = parseFloat(match[1]);
  if (val >= 10000) {
    val = val / 100000;
  }
  return val;
};

export const getTPOAnalytics = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const students = await User.find({ role: 'student' }).select('-password');
    const activeJDs = await JobDescription.find({ approvalStatus: 'approved', isActive: true });

    // Determine Placed Students
    const placedStudentsList = await Application.distinct('student', { status: 'Selected' });
    const totalPlaced = placedStudentsList.length;
    const totalUnplaced = totalStudents - totalPlaced;
    const placementRate = totalStudents > 0 ? Number(((totalPlaced / totalStudents) * 100).toFixed(1)) : 0;

    // Determine Dynamic Eligibility based on JDs
    let totalEligible = 0;
    let totalIneligible = 0;

    students.forEach(student => {
      if (activeJDs.length === 0) {
        if ((student.cgpa || student.degreeCGPA || 0) >= 6.0 && (student.backlogs || 0) === 0) {
          totalEligible++;
        } else {
          totalIneligible++;
        }
      } else {
        const meetsAny = activeJDs.some(jd => {
          const meetsCGPA = student.cgpa === null || student.cgpa === undefined || jd.minCGPA <= student.cgpa;
          const meetsBranch = student.branch && jd.allowedBranches.includes(student.branch);
          const meetsBacklogs = student.backlogs === null || student.backlogs === undefined || jd.maxBacklogs >= student.backlogs;
          return meetsCGPA && meetsBranch && meetsBacklogs;
        });
        if (meetsAny) {
          totalEligible++;
        } else {
          totalIneligible++;
        }
      }
    });

    // General Applications counters
    const totalApplications = await Application.countDocuments();
    const totalInterviews = await Application.countDocuments({ status: { $in: ['Interview Scheduled', 'Shortlisted', 'Interview'] } });
    const totalOffers = await Application.countDocuments({ status: 'Selected' });

    // Package metrics
    const selections = await Application.find({ status: 'Selected' }).populate('jobDescription');
    let highestPackageVal = 0;
    let totalPackageVal = 0;
    let packageCount = 0;

    selections.forEach(sel => {
      const jd = sel.jobDescription;
      if (jd && jd.package) {
        const pkgNum = parsePackage(jd.package);
        if (pkgNum > highestPackageVal) {
          highestPackageVal = pkgNum;
        }
        if (pkgNum > 0) {
          totalPackageVal += pkgNum;
          packageCount++;
        }
      }
    });

    const avgPackageVal = packageCount > 0 ? Number((totalPackageVal / packageCount).toFixed(2)) : 0;

    // Recruiters and Applications per Company
    const allApps = await Application.find().populate('jobDescription').populate('student', 'name branch');
    const companyStats = {};
    allApps.forEach(app => {
      const company = app.jobDescription?.companyName || 'N/A';
      if (!companyStats[company]) {
        companyStats[company] = { totalApps: 0, offers: 0 };
      }
      companyStats[company].totalApps++;
      if (app.status === 'Selected') {
        companyStats[company].offers++;
      }
    });

    const topRecruiters = Object.entries(companyStats)
      .map(([name, stat]) => ({ companyName: name, offers: stat.offers }))
      .sort((a, b) => b.offers - a.offers)
      .slice(0, 5);

    const appsPerCompany = Object.entries(companyStats)
      .map(([name, stat]) => ({ companyName: name, count: stat.totalApps }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Branch Wise Analytics
    const branchStats = {};
    students.forEach(student => {
      const branch = student.branch || 'Unknown';
      if (!branchStats[branch]) {
        branchStats[branch] = { total: 0, placed: 0 };
      }
      branchStats[branch].total++;
    });

    placedStudentsList.forEach(studentId => {
      const student = students.find(s => s._id.toString() === studentId.toString());
      if (student) {
        const branch = student.branch || 'Unknown';
        if (branchStats[branch]) {
          branchStats[branch].placed++;
        }
      }
    });

    const branchAnalytics = Object.entries(branchStats).map(([name, stat]) => ({
      branch: name,
      total: stat.total,
      placed: stat.placed,
      rate: stat.total > 0 ? Math.round((stat.placed / stat.total) * 100) : 0
    }));

    // Monthly Placements and Application Trends (past 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyStats = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[key] = {
        monthName: `${monthNames[d.getMonth()]}`,
        placements: 0,
        applications: 0
      };
    }

    allApps.forEach(app => {
      const appDate = new Date(app.appliedAt);
      const appKey = `${appDate.getFullYear()}-${String(appDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyStats[appKey]) {
        monthlyStats[appKey].applications++;
      }

      if (app.status === 'Selected') {
        const selDate = new Date(app.updatedAt);
        const selKey = `${selDate.getFullYear()}-${String(selDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyStats[selKey]) {
          monthlyStats[selKey].placements++;
        }
      }
    });

    const monthlyData = Object.values(monthlyStats);

    // Latest Registered and Upcoming Interviews
    const latestRegistrations = await User.find({ role: 'student' })
      .select('name studentId branch createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const upcomingInterviews = await Application.find({ status: { $in: ['Interview Scheduled', 'Shortlisted'] } })
      .populate('student', 'name studentId branch')
      .populate('jobDescription', 'title companyName')
      .sort({ updatedAt: -1 })
      .limit(5);

    return res.status(200).json({
      totalStudents,
      totalPlaced,
      totalUnplaced,
      placementRate,
      totalEligible,
      totalIneligible,
      totalApplications,
      totalInterviews,
      totalOffers,
      highestPackage: highestPackageVal > 0 ? `${highestPackageVal} LPA` : '0 LPA',
      averagePackage: avgPackageVal > 0 ? `${avgPackageVal} LPA` : '0 LPA',
      topRecruiters,
      appsPerCompany,
      branchAnalytics,
      monthlyData,
      latestRegistrations,
      upcomingInterviews
    });
  } catch (error) {
    console.error('Error in getTPOAnalytics:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const handleBulkAction = async (req, res) => {
  try {
    const { studentIds, action, subject, body, isDisabled, isBlacklisted } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'No student IDs provided' });
    }

    if (action === 'delete') {
      await User.deleteMany({ _id: { $in: studentIds }, role: 'student' });
      await Application.deleteMany({ student: { $in: studentIds } });
      return res.status(200).json({ message: 'Selected student profiles deleted successfully' });
    }

    if (action === 'email') {
      if (!subject || !body) {
        return res.status(400).json({ message: 'Subject and body are required for emails' });
      }
      const students = await User.find({ _id: { $in: studentIds }, role: 'student' }).select('email');
      const emails = students.map(s => s.email).filter(Boolean);
      
      for (const email of emails) {
        try {
          await sendEmail(email, subject, `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b;">${body}</div>`);
        } catch (emailErr) {
          console.error(`Failed to send bulk email to ${email}:`, emailErr);
        }
      }
      return res.status(200).json({ message: `Bulk email sent successfully to ${emails.length} students` });
    }

    if (action === 'status_update') {
      const updateData = {};
      if (isDisabled !== undefined) updateData.isDisabled = isDisabled;
      if (isBlacklisted !== undefined) updateData.isBlacklisted = isBlacklisted;

      await User.updateMany({ _id: { $in: studentIds }, role: 'student' }, { $set: updateData });
      return res.status(200).json({ message: 'Selected student accounts status updated successfully' });
    }

    if (action === 'recalculate_eligibility') {
      const activeJDs = await JobDescription.find({ approvalStatus: 'approved', isActive: true });
      for (const studentId of studentIds) {
        const student = await User.findById(studentId);
        if (!student) continue;

        const activeApplications = await Application.find({
          student: studentId,
          status: { $nin: ['Selected', 'Rejected'] }
        }).populate('jobDescription');

        for (const app of activeApplications) {
          const jd = app.jobDescription;
          if (!jd) continue;

          const isCGPAEligible = student.cgpa === null || student.cgpa === undefined || jd.minCGPA <= student.cgpa;
          const isBranchEligible = student.branch && jd.allowedBranches.includes(student.branch);
          const isBacklogEligible = student.backlogs === null || student.backlogs === undefined || jd.maxBacklogs >= student.backlogs;

          const isCurrentlyEligible = isCGPAEligible && isBranchEligible && isBacklogEligible;

          let newStatus = app.status;
          let reason = '';
          if (!isCurrentlyEligible) {
            newStatus = 'Not Eligible';
            const reasons = [];
            if (!isCGPAEligible) reasons.push(`CGPA is below minimum required ${jd.minCGPA}`);
            if (!isBranchEligible) reasons.push(`Branch ${student.branch} is not allowed`);
            if (!isBacklogEligible) reasons.push(`Backlogs count is above maximum allowed ${jd.maxBacklogs}`);
            reason = reasons.join(', ');
          } else if (app.status === 'Not Eligible') {
            newStatus = 'Applied';
            reason = 'Manual/bulk profile eligibility refresh passed criteria';
          }

          if (newStatus !== app.status) {
            const oldStatus = app.status;
            app.status = newStatus;
            app.updatedAt = Date.now();
            await app.save();

            const history = new EligibilityHistory({
              student: studentId,
              jobDescription: jd._id,
              oldStatus,
              newStatus,
              reason
            });
            await history.save();
          }
        }
      }
      return res.status(200).json({ message: 'Eligibility status re-evaluated successfully for selected students' });
    }

    return res.status(400).json({ message: 'Invalid bulk action' });
  } catch (error) {
    console.error('Error in handleBulkAction:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateStudentAuditFlags = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFavorite, isBlacklisted, tpoRemarks, studentNotes } = req.body;

    const student = await User.findOne({ _id: id, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (isFavorite !== undefined) student.isFavorite = isFavorite;
    if (isBlacklisted !== undefined) student.isBlacklisted = isBlacklisted;
    if (tpoRemarks !== undefined) student.tpoRemarks = tpoRemarks;
    if (studentNotes !== undefined) student.studentNotes = studentNotes;

    student.updatedAt = Date.now();
    await student.save();

    const applications = await Application.find({ student: id }).populate({
      path: 'jobDescription',
      select: 'title companyName package'
    });

    const returnedStudent = student.toObject();
    delete returnedStudent.password;

    return res.status(200).json({
      student: returnedStudent,
      applications
    });
  } catch (error) {
    console.error('Error in updateStudentAuditFlags:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const manuallyUpdatePlacementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { placementStatus, remarks } = req.body;

    if (!placementStatus) {
      return res.status(400).json({ message: 'placementStatus is required' });
    }

    const updated = await updateStudentPlacementStatus(id, placementStatus, 'tpo', remarks);
    if (!updated) {
      return res.status(404).json({ message: 'Student not found or failed to transition' });
    }

    return res.status(200).json({
      message: 'Placement status updated successfully',
      student: updated
    });
  } catch (error) {
    console.error('Error in manuallyUpdatePlacementStatus:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStudentPlacementTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await PlacementHistory.find({ student: id }).sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error in getStudentPlacementTimeline:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const generatePlacementReport = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).sort({ name: 1 });
    const applications = await Application.find();

    let csvContent = 'Name,Roll Number,Email,Branch,Graduation Year,CGPA,Placement Status,Total Applications,Passed Assessments\n';

    students.forEach(student => {
      const studentApps = applications.filter(app => app.student.toString() === student._id.toString());
      const totalApps = studentApps.length;
      const passedAssessments = studentApps.filter(app => app.assessmentAttempted && app.assessmentScore !== null).length;

      const name = student.name ? student.name.replace(/,/g, ' ') : '';
      const roll = student.studentId ? student.studentId.replace(/,/g, ' ') : '';
      const email = student.email || '';
      const branch = student.branch || '';
      const year = student.passedOutYear || '';
      const cgpa = student.cgpa || student.degreeCGPA || '0';
      const status = student.placementStatus || 'Registered';

      csvContent += `"${name}","${roll}","${email}","${branch}","${year}","${cgpa}","${status}",${totalApps},${passedAssessments}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Placement_Report.csv');
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error in generatePlacementReport:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

