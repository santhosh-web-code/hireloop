import express from 'express';
import {
  getEligibleJDs,
  applyToJD,
  getMyApplications,
  updateProfile,
  getMyProfile,
  downloadResume,
} from '../controllers/studentController.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/eligible-jds', protect, allowRoles('student'), getEligibleJDs);
router.post('/apply/:jdId', protect, allowRoles('student'), applyToJD);
router.get('/my-applications', protect, allowRoles('student'), getMyApplications);
router.put('/profile', protect, allowRoles('student'), updateProfile);
router.get('/profile', protect, allowRoles('student'), getMyProfile);
router.get('/resume/:studentId', protect, allowRoles('student', 'hr', 'tpo'), downloadResume);

export default router;
