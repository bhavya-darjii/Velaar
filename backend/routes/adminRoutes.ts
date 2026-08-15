import express from 'express';
import { getAdminSummary, getAdminLogs } from '../controllers/adminController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication
router.use(requireAuth);

router.get('/summary', getAdminSummary);
router.get('/logs',    getAdminLogs);

export default router;
