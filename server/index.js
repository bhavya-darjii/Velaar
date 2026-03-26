import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/aiRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/pdf', pdfRoutes);

// Start server (Only runs properly via traditional Node, allowing standard deployment on Render/Railway/DigitalOcean)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 [Backend] Velaar Express Server is running on http://localhost:${PORT}`);
});

export default app;
