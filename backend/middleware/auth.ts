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

  const { data: { user }, error } = await adminSupabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    return;
  }

  req.user = user;
  next();
};
