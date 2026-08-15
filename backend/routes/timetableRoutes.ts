import express from 'express';
import { generateTimetable } from '../controllers/timetableController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Timetable routes require authentication
router.use(requireAuth);

router.post('/generate', generateTimetable);

export default router;
