import express from 'express';
import { exportLessonPlanToWord } from '../controllers/exportController.js';

const router = express.Router();

router.post('/docx', exportLessonPlanToWord);

export default router;
