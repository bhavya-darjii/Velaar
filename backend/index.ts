import './env.js'; // Must be the very first import to load env vars before other imports
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import aiRoutes from './routes/aiRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import hierarchicalAnalyticsRoutes from './routes/hierarchicalAnalyticsRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import { generalLimiter } from './middleware/rateLimiter.js';

const app = express();

// ─── Security: Helmet (sets secure HTTP headers on every response) ────────────
app.use(helmet({
  contentSecurityPolicy: false, // Managed by vercel.json for the frontend
  crossOriginEmbedderPolicy: false,
}));

// ─── Security: Remove X-Powered-By to reduce information disclosure ───────────
app.disable('x-powered-by');

// ─── Request Logging (audit trail for security incidents) ─────────────────────
if (process.env.NODE_ENV === 'production') {
  // Combined format: IP, method, path, status, response time — no body logged
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// ─── Security: Global rate limiter (100 req/min per IP) ──────────────────────
app.use(generalLimiter);

// ─── Security: Restrict CORS to known origins only ───────────────────────────
const ALLOWED_ORIGINS: string[] = [
  'https://velaar.vercel.app',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:5174',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy violation: origin ${origin} is not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Security: Reject XML bodies (prevents XXE attacks) ──────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'] ?? '';
  if (
    contentType.includes('text/xml') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/xhtml+xml')
  ) {
    res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'XML content is not accepted. Use JSON instead.',
    });
    return;
  }
  next();
});

// ─── Body Parsers (tightened to 2MB — PDF routes use their own 20MB multer limit) ──
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ─── Health Check (no environment info exposed) ───────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/ai',        aiRoutes);
app.use('/api/export',    exportRoutes);
app.use('/api/pdf',       pdfRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/hier-analytics', hierarchicalAnalyticsRoutes);
app.use('/api/notice',         noticeRoutes);
app.use('/api/timetable', timetableRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.message && err.message.startsWith('CORS policy violation')) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  // Never expose err.message or stack to client — leaks file paths and internals
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT ?? 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 [Backend] Velaar Express Server is running on http://localhost:${PORT}`);
});

export default app;
