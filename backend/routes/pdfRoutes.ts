import express from 'express';
import multer from 'multer';
import { extractPDFText } from '../controllers/pdfController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 20MB max for PDF uploads — intentionally higher than the global 2MB body limit
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// PDF extraction requires authentication
router.use(requireAuth);

router.post('/extract', upload.single('pdf'), extractPDFText);

export default router;
