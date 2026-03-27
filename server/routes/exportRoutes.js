import express from 'express';
import { exportLessonPlanToWord, exportTemplatedExam } from '../controllers/exportController.js';

const router = express.Router();

router.post('/docx', exportLessonPlanToWord);
router.post('/exam', exportTemplatedExam);

export default router;
