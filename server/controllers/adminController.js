// Admin Analytics Controller
// Reads aiLogs.jsonl (file-based storage) and returns aggregated analytics.
// No Firestore, no auth dependencies — works on any Node.js environment.

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_FILE  = join(__dirname, '..', 'data', 'aiLogs.jsonl');

// ── Read all log entries from disk ────────────────────────────────────────────
const readAllLogs = () => {
  if (!existsSync(LOG_FILE)) return [];
  const content = readFileSync(LOG_FILE, 'utf8');
  return content
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean)
    .reverse(); // Most recent first
};

// ─── GET /api/admin/summary ───────────────────────────────────────────────────
export const getAdminSummary = async (req, res) => {
  try {
    const logs = readAllLogs();

    // ── Totals ────────────────────────────────────────────────────────────────
    const totalCalls     = logs.length;
    const totalCostINR   = logs.reduce((s, l) => s + (l.costINR      || 0), 0);
    const totalTokensIn  = logs.reduce((s, l) => s + (l.inputTokens  || 0), 0);
    const totalTokensOut = logs.reduce((s, l) => s + (l.outputTokens || 0), 0);

    // ── Per-month breakdown ───────────────────────────────────────────────────
    const byMonth = {};
    logs.forEach(l => {
      const m = l.month || 'unknown';
      if (!byMonth[m]) byMonth[m] = { month: m, calls: 0, costINR: 0, inputTokens: 0, outputTokens: 0 };
      byMonth[m].calls++;
      byMonth[m].costINR      += (l.costINR      || 0);
      byMonth[m].inputTokens  += (l.inputTokens  || 0);
      byMonth[m].outputTokens += (l.outputTokens || 0);
    });
    // Chronological, last 6 months
    const monthlyData = Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // ── Per-teacher breakdown ─────────────────────────────────────────────────
    const byTeacher = {};
    logs.forEach(l => {
      const tid = l.teacherId || 'unknown';
      if (!byTeacher[tid]) byTeacher[tid] = {
        teacherId:    tid,
        teacherName:  l.teacherName  || 'Unknown',
        teacherEmail: l.teacherEmail || '',
        calls: 0, costINR: 0, inputTokens: 0, outputTokens: 0,
      };
      byTeacher[tid].calls++;
      byTeacher[tid].costINR      += (l.costINR      || 0);
      byTeacher[tid].inputTokens  += (l.inputTokens  || 0);
      byTeacher[tid].outputTokens += (l.outputTokens || 0);
    });
    const teacherData = Object.values(byTeacher).sort((a, b) => b.costINR - a.costINR);

    // ── Per-action breakdown ──────────────────────────────────────────────────
    const byAction = {};
    logs.forEach(l => {
      const a = l.action || 'unknown';
      if (!byAction[a]) byAction[a] = {
        action:      a,
        actionLabel: l.actionLabel || a,
        calls: 0, costINR: 0, inputTokens: 0, outputTokens: 0,
      };
      byAction[a].calls++;
      byAction[a].costINR      += (l.costINR      || 0);
      byAction[a].inputTokens  += (l.inputTokens  || 0);
      byAction[a].outputTokens += (l.outputTokens || 0);
    });
    const actionData = Object.values(byAction).sort((a, b) => b.calls - a.calls);

    // ── Current month stats ───────────────────────────────────────────────────
    const now          = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth    = byMonth[currentMonth] || { calls: 0, costINR: 0 };

    return res.status(200).json({
      totals: { totalCalls, totalCostINR, totalTokensIn, totalTokensOut },
      thisMonth,
      monthlyData,
      teacherData,
      actionData,
      mostActiveTeacher: teacherData[0] || null,
      topAction:         actionData[0]  || null,
    });
  } catch (err) {
    console.error('[adminController] getAdminSummary error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/admin/logs ──────────────────────────────────────────────────────
export const getAdminLogs = async (req, res) => {
  try {
    const { month, teacherId, pageSize = 500 } = req.query;

    let logs = readAllLogs(); // already sorted most-recent-first

    if (month)     logs = logs.filter(l => l.month     === month);
    if (teacherId) logs = logs.filter(l => l.teacherId === teacherId);

    // Cap to pageSize
    logs = logs.slice(0, Number(pageSize));

    return res.status(200).json({ logs, total: logs.length });
  } catch (err) {
    console.error('[adminController] getAdminLogs error:', err);
    return res.status(500).json({ error: err.message });
  }
};
