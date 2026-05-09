import express from 'express';
import { getAdminSummary, getAdminLogs } from '../controllers/adminController.js';

const router = express.Router();

router.get('/summary', getAdminSummary);
router.get('/logs',    getAdminLogs);

export default router;
