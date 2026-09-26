/**
 * Supabase JWT auth middleware.
 * Verifies the Bearer token from the Authorization header using Supabase's
 * server-side auth.getUser() — cryptographically secure, cannot be spoofed
 * by a client sending a fake teacherId in the body.
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
import { adminSupabase } from '../supabaseAdmin.js';

// Extend Express Request to include the verified Supabase user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware: require a valid Supabase JWT in the Authorization header.
 * Attaches the verified user to req.user on success.
 * Returns 401 on missing/invalid token.
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing auth token' });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  if (!adminSupabase) {
    res.status(500).json({ error: 'Server configuration error: auth unavailable' });
    return;
  }

  try {
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error('[auth] requireAuth token verification error:', err?.message || err);
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }
};

/**
 * Middleware: optional Supabase JWT auth.
 * If a valid token is provided, attaches user to req.user.
 * If no token or invalid/expired token, proceeds anyway without failing with 401.
 * Useful for public/guest-accessible endpoints like Copilot.
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  if (!adminSupabase) {
    return next();
  }

  try {
    const { data: { user } } = await adminSupabase.auth.getUser(token);
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid/expired token in optionalAuth
  }
  next();
};
