import express from 'express';
import {
  calculateCoAttainment,
  predictStudentRisk,
  analyzeFeedback,
  generateAccreditationReport,
} from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All analytics routes require authentication
router.use(requireAuth);

router.post('/co-attainment',   calculateCoAttainment);
router.post('/student-risk',    predictStudentRisk);
router.post('/feedback',        analyzeFeedback);
router.post('/accreditation',   generateAccreditationReport);

export default router;
