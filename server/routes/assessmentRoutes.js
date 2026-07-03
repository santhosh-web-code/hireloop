import express from 'express';
import {
  generateAssessmentQuestions,
  createAssessment,
  getAssessmentForJD,
  updateAssessment,
  deleteAssessment,
  submitAssessment,
  getMyAssessmentResult,
} from '../controllers/assessmentController.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/generate/:jdId', protect, allowRoles('hr'), generateAssessmentQuestions);
router.post('/create', protect, allowRoles('hr'), createAssessment);
router.get('/jd/:jdId', protect, allowRoles('hr', 'student', 'tpo'), getAssessmentForJD);
router.put('/:assessmentId', protect, allowRoles('hr'), updateAssessment);
router.delete('/:assessmentId', protect, allowRoles('hr'), deleteAssessment);
router.post('/submit/:assessmentId', protect, allowRoles('student'), submitAssessment);
router.get('/result/:assessmentId', protect, allowRoles('student'), getMyAssessmentResult);

export default router;
