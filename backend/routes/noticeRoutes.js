import express from 'express';
import { generateNotice, generateMeetingMinutes } from '../controllers/noticeController.js';

const router = express.Router();

router.post('/generate', generateNotice);
router.post('/meeting-minutes', generateMeetingMinutes);

export default router;
