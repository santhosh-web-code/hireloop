import express from 'express';
import {
  startMockInterview,
  submitMockInterview,
} from '../controllers/mockInterviewController.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/start/:jdId', protect, allowRoles('student'), startMockInterview);
router.post('/submit/:jdId', protect, allowRoles('student'), submitMockInterview);

export default router;
