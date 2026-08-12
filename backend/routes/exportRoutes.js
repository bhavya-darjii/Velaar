import express from 'express';
import { exportLessonPlanToWord } from '../controllers/lessonPlanExportController.js';
import { exportTemplatedExam } from '../controllers/examExportController.js';

const router = express.Router();

router.post('/docx', exportLessonPlanToWord);
router.post('/exam', exportTemplatedExam);

export default router;
