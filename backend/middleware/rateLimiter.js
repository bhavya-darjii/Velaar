/**
 * Rate limiting middleware.
 * Protects the server from DDoS and prevents runaway Gemini API costs.
 * Kevin's template pattern: separate limiters for general vs expensive AI routes.
 */

import rateLimit from 'express-rate-limit';

/** General limiter: 100 requests/min per IP — applied globally */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down and try again shortly.' },
});

/** AI limiter: 15 requests/min per IP — applied only to /api/ai/* routes */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded. Please wait a minute before generating again.' },
});
