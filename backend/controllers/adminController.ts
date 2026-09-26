import { Request, Response } from 'express';
import { adminSupabase } from '../supabaseAdmin.js';

interface AiLog {
  id: string;
  action: string;
  action_label: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  course_id: string | null;
  subject_name: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  cost_inr: number;
  month: string;
  created_at: string;
}

// ─── GET /api/admin/summary ────────────────────────────────────────────────────
export const getAdminSummary = async (_req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) {
    res.status(500).json({ error: 'Admin database is unavailable. Check server configuration.' });
    return;
  }

  try {
    const { data: logs = [] } = await adminSupabase
      .from('ai_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    const typedLogs = (logs ?? []) as AiLog[];

    // Global totals
    const globalRow = {
      totalCalls:     typedLogs.length,
      totalCostINR:   typedLogs.reduce((s, r) => s + (r.cost_inr    ?? 0), 0),
      totalTokensIn:  typedLogs.reduce((s, r) => s + (r.input_tokens  ?? 0), 0),
      totalTokensOut: typedLogs.reduce((s, r) => s + (r.output_tokens ?? 0), 0),
    };

    // Per-month breakdown
    const monthMap: Record<string, { month: string; calls: number; costINR: number; inputTokens: number; outputTokens: number }> = {};
    typedLogs.forEach(l => {
      const m = l.month ?? '';
      if (!monthMap[m]) monthMap[m] = { month: m, calls: 0, costINR: 0, inputTokens: 0, outputTokens: 0 };
      monthMap[m]!.calls++;
      monthMap[m]!.costINR      += l.cost_inr    ?? 0;
      monthMap[m]!.inputTokens  += l.input_tokens  ?? 0;
      monthMap[m]!.outputTokens += l.output_tokens ?? 0;
    });
    const monthlyData = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // Per-teacher breakdown
    const teacherMap: Record<string, { teacherId: string; teacherName: string; teacherEmail: string; calls: number; costINR: number; inputTokens: number; outputTokens: number }> = {};
    typedLogs.forEach(l => {
      const tid = l.teacher_id ?? 'unknown';
      if (!teacherMap[tid]) teacherMap[tid] = { teacherId: tid, teacherName: l.teacher_name, teacherEmail: l.teacher_email, calls: 0, costINR: 0, inputTokens: 0, outputTokens: 0 };
      teacherMap[tid]!.calls++;
      teacherMap[tid]!.costINR      += l.cost_inr    ?? 0;
      teacherMap[tid]!.inputTokens  += l.input_tokens  ?? 0;
      teacherMap[tid]!.outputTokens += l.output_tokens ?? 0;
    });
    const teacherData = Object.values(teacherMap).sort((a, b) => b.costINR - a.costINR);

    // Per-action breakdown
    const actionMap: Record<string, { action: string; actionLabel: string; calls: number; costINR: number; inputTokens: number; outputTokens: number }> = {};
    typedLogs.forEach(l => {
      const a = l.action ?? 'unknown';
      if (!actionMap[a]) actionMap[a] = { action: a, actionLabel: l.action_label ?? a, calls: 0, costINR: 0, inputTokens: 0, outputTokens: 0 };
      actionMap[a]!.calls++;
      actionMap[a]!.costINR      += l.cost_inr    ?? 0;
      actionMap[a]!.inputTokens  += l.input_tokens  ?? 0;
      actionMap[a]!.outputTokens += l.output_tokens ?? 0;
    });
    const actionData = Object.values(actionMap).sort((a, b) => b.calls - a.calls);

    const now          = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth    = monthMap[currentMonth] ?? { calls: 0, costINR: 0 };

    res.status(200).json({
      totals: globalRow,
      thisMonth,
      monthlyData,
      teacherData,
      actionData,
      mostActiveTeacher: teacherData[0] ?? null,
      topAction:         actionData[0]  ?? null,
    });
  } catch (err) {
    console.error('[adminController] getAdminSummary error:', err);
    res.status(500).json({ error: 'Failed to fetch admin summary' });
  }
};

// ─── GET /api/admin/logs ───────────────────────────────────────────────────────
export const getAdminLogs = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) {
    res.status(500).json({ error: 'Admin database is unavailable. Check server configuration.' });
    return;
  }

  try {
    const { month, teacherId, pageSize = '500' } = req.query as {
      month?: string; teacherId?: string; pageSize?: string;
    };

    let query = adminSupabase
      .from('ai_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(pageSize));

    if (month)     query = query.eq('month', month);
    if (teacherId) query = query.eq('teacher_id', teacherId);

    const { data: logs = [], error } = await query;
    if (error) throw error;

    const typedLogs = (logs ?? []) as AiLog[];

    const mapped = typedLogs.map(l => ({
      id:           l.id,
      action:       l.action,
      actionLabel:  l.action_label,
      teacherId:    l.teacher_id,
      teacherName:  l.teacher_name,
      teacherEmail: l.teacher_email,
      courseId:     l.course_id,
      subjectName:  l.subject_name,
      inputTokens:  l.input_tokens,
      outputTokens: l.output_tokens,
      costUSD:      l.cost_usd,
      costINR:      l.cost_inr,
      month:        l.month,
      timestamp:    l.created_at,
    }));

    res.status(200).json({ logs: mapped, total: mapped.length });
  } catch (err) {
    console.error('[adminController] getAdminLogs error:', err);
    res.status(500).json({ error: 'Failed to fetch admin logs' });
  }
};

// ─── Helper: Check Admin Privileges ──────────────────────────────────────────
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  if (!adminSupabase) return false;
  try {
    const { data } = await adminSupabase.from('users').select('user_type').eq('id', userId).maybeSingle();
    return Boolean(data && ['admin', 'velaarAdmin', 'principal', 'registrar'].includes(data.user_type));
  } catch {
    return false;
  }
};

// ─── POST /api/admin/invite-user ──────────────────────────────────────────────
export const inviteUser = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) {
    res.status(500).json({ error: 'Admin database is unavailable.' });
    return;
  }

  const callerId = req.user?.id;
  if (!callerId || !(await checkIsAdmin(callerId))) {
    res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
    return;
  }

  try {
    const { email, emails, user_type, institution_id, college_name, semester, division } = req.body;
    const rawList: string[] = Array.isArray(emails) ? emails : (email ? [email] : []);
    const emailList = rawList
      .map(e => String(e).trim().toLowerCase())
      .filter(e => e.includes('@'));

    if (emailList.length === 0) {
      res.status(400).json({ error: 'No valid email addresses provided.' });
      return;
    }

    if (!user_type) {
      res.status(400).json({ error: 'user_type is required.' });
      return;
    }

    let count = 0;
    const updatedUsers: string[] = [];

    for (const em of emailList) {
      const inviteData: Record<string, any> = {
        email: em,
        user_type,
        institution_id: institution_id || null,
        college_name: college_name || null,
      };
      if (semester) inviteData.semester = semester;
      if (division) inviteData.division = String(division).trim().toUpperCase();

      // 1. Upsert into role_invitations (bypassing RLS with adminSupabase)
      const { error: inviteErr } = await adminSupabase
        .from('role_invitations')
        .upsert(inviteData, { onConflict: 'email' });

      if (inviteErr && inviteErr.message?.includes('division')) {
        delete inviteData.division;
        await adminSupabase.from('role_invitations').upsert(inviteData, { onConflict: 'email' });
      }

      // 2. Also update existing user in users table if they have already registered
      const userUpdate: Record<string, any> = {
        user_type,
      };
      if (institution_id) userUpdate.institution_id = institution_id;
      if (college_name) userUpdate.college_name = college_name;
      if (semester) userUpdate.semester = semester;
      if (division) userUpdate.division = String(division).trim().toUpperCase();

      const { data: updated } = await adminSupabase
        .from('users')
        .update(userUpdate)
        .ilike('email', em)
        .select('id, email, user_type');

      if (updated && updated.length > 0) {
        updatedUsers.push(em);
      }

      count++;
    }

    res.status(200).json({
      success: true,
      count,
      updatedExistingUsers: updatedUsers,
      message: `Successfully processed ${count} invitation(s).`,
    });
  } catch (err: any) {
    console.error('[adminController] inviteUser error:', err);
    res.status(500).json({ error: err.message || 'Failed to process invitations.' });
  }
};

// ─── PATCH /api/admin/user/:id ────────────────────────────────────────────────
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) {
    res.status(500).json({ error: 'Admin database is unavailable.' });
    return;
  }

  const callerId = req.user?.id;
  if (!callerId || !(await checkIsAdmin(callerId))) {
    res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
    return;
  }

  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'User ID is required.' });
      return;
    }

    const { user_type, institution_id, college_name, semester, division, department } = req.body;
    const payload: Record<string, any> = {};

    if (user_type !== undefined) payload.user_type = user_type;
    if (institution_id !== undefined) payload.institution_id = institution_id;
    if (college_name !== undefined) payload.college_name = college_name;
    if (semester !== undefined) payload.semester = semester;
    if (division !== undefined) payload.division = division ? String(division).trim().toUpperCase() : null;
    if (department !== undefined) payload.department = department;

    const { data, error } = await adminSupabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, user: data });
  } catch (err: any) {
    console.error('[adminController] updateUser error:', err);
    res.status(500).json({ error: err.message || 'Failed to update user.' });
  }
};

// ─── POST /api/admin/claim-invite ─────────────────────────────────────────────
export const claimInvite = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) {
    res.status(500).json({ error: 'Admin database is unavailable.' });
    return;
  }

  try {
    const user = req.user;
    if (!user || !user.email) {
      res.status(401).json({ error: 'Authenticated user with email required.' });
      return;
    }

    const userEmail = user.email.toLowerCase().trim();

    // 1. Check for pending invitation
    const { data: invite } = await adminSupabase
      .from('role_invitations')
      .select('*')
      .ilike('email', userEmail)
      .maybeSingle();

    if (invite) {
      const updatePayload: Record<string, any> = {
        user_type: invite.user_type,
        institution_id: invite.institution_id || null,
        college_name: invite.college_name || null,
      };
      if (invite.semester) updatePayload.semester = invite.semester;
      if (invite.division) updatePayload.division = String(invite.division).trim().toUpperCase();

      // Update user in users table
      const { data: updatedUser } = await adminSupabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)
        .select()
        .single();

      // Delete claimed invitation
      await adminSupabase
        .from('role_invitations')
        .delete()
        .ilike('email', userEmail);

      res.status(200).json({
        claimed: true,
        role: invite.user_type,
        user: updatedUser || updatePayload,
      });
      return;
    }

    // 2. No invite found — return current status from users table
    const { data: userDoc } = await adminSupabase
      .from('users')
      .select('user_type, institution_id, college_name, semester, division')
      .eq('id', user.id)
      .maybeSingle();

    const currentRole = userDoc?.user_type || 'pending';

    res.status(200).json({
      claimed: false,
      role: currentRole,
      user: userDoc,
    });
  } catch (err: any) {
    console.error('[adminController] claimInvite error:', err);
    res.status(500).json({ error: err.message || 'Failed to claim invitation.' });
  }
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
export const getAdminUsers = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) {
    res.status(500).json({ error: 'Admin database is unavailable.' });
    return;
  }

  const callerId = req.user?.id;
  if (!callerId || !(await checkIsAdmin(callerId))) {
    res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
    return;
  }

  try {
    const { data: users, error } = await adminSupabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, users: users || [] });
  } catch (err: any) {
    console.error('[adminController] getAdminUsers error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch users.' });
  }
};
