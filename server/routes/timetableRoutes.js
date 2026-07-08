import express from 'express';
import { generateTimetable } from '../controllers/timetableController.js';

const router = express.Router();

router.post('/generate', generateTimetable);

export default router;
