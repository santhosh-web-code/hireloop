import express from 'express';
import {
  createJD,
  getMyJDs,
  updateJD,
  deleteJD,
  getApplicantsForJD,
  updateApplicationStatus,
  getPendingJDs,
  approveJD,
  rejectJD,
  getAllApprovedJDs,
  downloadJDDocument,
} from '../controllers/jdController.js';
import { protect, allowRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', protect, allowRoles('hr'), createJD);
router.get('/my-jds', protect, allowRoles('hr'), getMyJDs);
router.put('/:jdId', protect, allowRoles('hr'), updateJD);
router.delete('/:jdId', protect, allowRoles('hr'), deleteJD);
router.get('/applicants/:jdId', protect, allowRoles('hr'), getApplicantsForJD);
router.put('/application-status/:applicationId', protect, allowRoles('hr'), updateApplicationStatus);
router.get('/pending', protect, allowRoles('tpo'), getPendingJDs);
router.put('/approve/:jdId', protect, allowRoles('tpo'), approveJD);
router.put('/reject/:jdId', protect, allowRoles('tpo'), rejectJD);
router.get('/all-approved', protect, allowRoles('hr', 'tpo', 'student'), getAllApprovedJDs);
router.get('/document/:jdId', protect, allowRoles('hr', 'student', 'tpo'), downloadJDDocument);

export default router;
