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
} from '../controllers/tpoController.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// TPO Management Routes
router.get('/pending-hrs', protect, allowRoles('tpo'), getPendingHRs);
router.put('/approve-hr/:hrId', protect, allowRoles('tpo'), approveHR);
router.delete('/reject-hr/:hrId', protect, allowRoles('tpo'), rejectHR);
router.get('/students', protect, allowRoles('tpo'), getAllStudents);
router.get('/hrs', protect, allowRoles('tpo'), getAllHRs);
router.get('/dashboard-stats', protect, allowRoles('tpo'), getDashboardStats);
router.get('/all-applications', protect, allowRoles('tpo'), getAllApplications);
router.get('/student-profile/:studentId', protect, allowRoles('tpo'), getStudentProfile);
router.delete('/remove-student/:studentId', protect, allowRoles('tpo'), removeStudent);
router.delete('/remove-hr/:hrId', protect, allowRoles('tpo'), removeHR);
export default router;
