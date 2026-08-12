import express from 'express';
import multer from 'multer';
import { extractPDFText } from '../controllers/pdfController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

router.post('/extract', upload.single('pdf'), extractPDFText);

export default router;
