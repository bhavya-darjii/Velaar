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
