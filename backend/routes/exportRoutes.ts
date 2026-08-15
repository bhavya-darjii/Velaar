import express from 'express';
import { exportLessonPlanToWord } from '../controllers/lessonPlanExportController.js';
import { exportTemplatedExam } from '../controllers/examExportController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All export routes require authentication
router.use(requireAuth);

router.post('/docx', exportLessonPlanToWord);
router.post('/exam', exportTemplatedExam);

export default router;
