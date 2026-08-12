/**
 * Supabase JWT auth middleware.
 * Verifies the Bearer token from the Authorization header using Supabase's
 * server-side auth.getUser() — cryptographically secure, cannot be spoofed
 * by a client sending a fake teacherId in the body.
 */

import { adminSupabase } from '../supabaseAdmin.js';

/**
 * Middleware: require a valid Supabase JWT in the Authorization header.
 * Attaches the verified user to req.user on success.
 * Returns 401 on missing/invalid token.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing auth token' });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  const { data: { user }, error } = await adminSupabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
  }

  req.user = user;
  next();
};
