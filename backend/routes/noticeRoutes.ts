import express from 'express';
import { generateNotice, generateMeetingMinutes } from '../controllers/noticeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All notice routes require authentication
router.use(requireAuth);

router.post('/generate',        generateNotice);
router.post('/meeting-minutes', generateMeetingMinutes);

export default router;
