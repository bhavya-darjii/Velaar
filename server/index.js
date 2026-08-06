import './env.js'; // Must be the very first import to load env vars before other imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import aiRoutes from './routes/aiRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import noticeRoutes from './routes/noticeRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';

const app = express();

// ─── Security: Helmet (sets secure HTTP headers on every response) ────────────
app.use(helmet({
  contentSecurityPolicy: false, // Managed by vercel.json for the frontend
  crossOriginEmbedderPolicy: false,
}));

// ─── Security: Remove X-Powered-By to reduce information disclosure ───────────
app.disable('x-powered-by');

// ─── Security: Restrict CORS to known origins only ───────────────────────────
const ALLOWED_ORIGINS = [
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
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (
    contentType.includes('text/xml') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/xhtml+xml')
  ) {
    return res.status(415).json({
      error: 'Unsupported Media Type',
      message: 'XML content is not accepted. Use JSON instead.',
    });
  }
  next();
});

// ─── Body Parsers (size limited to prevent DoS) ───────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notice', noticeRoutes);
app.use('/api/timetable', timetableRoutes);

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message && err.message.startsWith('CORS policy violation')) {
    return res.status(403).json({ error: 'Forbidden', message: err.message });
  }
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server (Only runs properly via traditional Node, allowing standard deployment on Render/Railway/DigitalOcean)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 [Backend] Velaar Express Server is running on http://localhost:${PORT}`);
});

export default app;
