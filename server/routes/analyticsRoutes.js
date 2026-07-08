import express from 'express';
import {
  calculateCoAttainment,
  predictStudentRisk,
  analyzeFeedback,
  generateAccreditationReport,
} from '../controllers/analyticsController.js';

const router = express.Router();

router.post('/co-attainment', calculateCoAttainment);
router.post('/student-risk', predictStudentRisk);
router.post('/feedback', analyzeFeedback);
router.post('/accreditation', generateAccreditationReport);

export default router;
