import express from 'express';
import {
  getPendingHRs,
  approveHR,
  rejectHR,
  getAllStudents,
  getAllHRs,
  getDashboardStats,
  getAllApplications,
  getStudentProfile,
  removeStudent,
  removeHR,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getStudentsListForSMS,
  getStudentDetailsByTPO,
  editStudentByTPO,
  deleteNotification,
  getEligibilityHistory,
  getTPOAnalytics,
} from '../controllers/tpoController.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// TPO Management Routes
router.get('/pending-hrs', protect, allowRoles('tpo'), getPendingHRs);
router.put('/approve-hr/:hrId', protect, allowRoles('tpo'), approveHR);
router.delete('/reject-hr/:hrId', protect, allowRoles('tpo'), rejectHR);
router.get('/students-old', protect, allowRoles('tpo'), getAllStudents);
router.get('/all-students', protect, allowRoles('tpo'), getAllStudents);
router.get('/hrs', protect, allowRoles('tpo'), getAllHRs);
router.get('/dashboard-stats', protect, allowRoles('tpo'), getDashboardStats);
router.get('/analytics', protect, allowRoles('tpo'), getTPOAnalytics);
router.get('/all-applications', protect, allowRoles('tpo'), getAllApplications);
router.get('/student-profile/:studentId', protect, allowRoles('tpo'), getStudentProfile);
router.delete('/remove-student/:studentId', protect, allowRoles('tpo'), removeStudent);
router.delete('/remove-hr/:hrId', protect, allowRoles('tpo'), removeHR);

// Notification Routes
router.get('/notifications', protect, allowRoles('tpo'), getNotifications);
router.put('/notifications/:notificationId/read', protect, allowRoles('tpo'), markNotificationRead);
router.delete('/notifications/:notificationId', protect, allowRoles('tpo'), deleteNotification);
router.put('/notifications/read-all', protect, allowRoles('tpo'), markAllNotificationsRead);
router.get('/eligibility-history', protect, allowRoles('tpo'), getEligibilityHistory);

// SMS Upgrade Student Management Routes
router.get('/students', protect, allowRoles('tpo'), getStudentsListForSMS);
router.get('/student/:id', protect, allowRoles('tpo'), getStudentDetailsByTPO);
router.put('/student/:id', protect, allowRoles('tpo'), editStudentByTPO);
router.delete('/student/:id', protect, allowRoles('tpo'), removeStudent);

export default router;
