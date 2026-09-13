import express from 'express';
import { ragIngest, ragQuery, ragClear } from '../controllers/ragController.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All RAG endpoints require auth + AI rate limiter
router.use(aiLimiter);
router.use(requireAuth);

router.post('/ingest',  ragIngest);   // POST  /api/rag/ingest  — add document to knowledge base
router.post('/query',   ragQuery);    // POST  /api/rag/query   — retrieve matching chunks (debug)
router.delete('/clear', ragClear);    // DELETE /api/rag/clear  — wipe teacher/course knowledge base

export default router;
