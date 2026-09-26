import express, { Request, Response } from 'express';
import { adminSupabase } from '../supabaseAdmin.js';

const router = express.Router();

/**
 * GET /api/attendance/session/:sessionId/attendees
 * Fetches all attendance logs for a live session with student full_name and email.
 * Uses adminSupabase (service role) to bypass client-side RLS and replication latency.
 */
router.get('/session/:sessionId/attendees', async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId parameter is required' });
    return;
  }

  try {
    if (!adminSupabase) {
      res.status(500).json({ error: 'Supabase admin client is not configured' });
      return;
    }

    // 1. Fetch all attendance logs for this session
    const { data: logs, error: logsErr } = await adminSupabase
      .from('attendance_logs')
      .select('id, marked_at, student_id')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: true });

    if (logsErr) {
      console.error('[attendanceRoutes] Error fetching attendance_logs:', logsErr);
      res.status(500).json({ error: logsErr.message });
      return;
    }

    if (!logs || logs.length === 0) {
      res.status(200).json({ attendees: [] });
      return;
    }

    // 2. Fetch student user profiles for all attendees in one query
    const studentIds = Array.from(new Set(logs.map(l => l.student_id).filter(Boolean)));
    const { data: users, error: usersErr } = await adminSupabase
      .from('users')
      .select('id, full_name, email')
      .in('id', studentIds);

    if (usersErr) {
      console.warn('[attendanceRoutes] Warning fetching student user profiles:', usersErr);
    }

    const userMap = new Map((users || []).map(u => [u.id, u]));

    const attendees = logs.map(log => ({
      id: log.id,
      marked_at: log.marked_at,
      student_id: log.student_id,
      users: userMap.get(log.student_id) || { full_name: 'Unknown', email: '' },
    }));

    res.status(200).json({ attendees });
  } catch (err) {
    console.error('[attendanceRoutes] Unexpected error in getAttendees:', err);
    res.status(500).json({ error: 'Internal server error fetching attendees' });
  }
});

export default router;
