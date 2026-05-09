import { adminDb } from '../firebaseAdmin.js';

// ─── GET /api/admin/summary ───────────────────────────────────────────────────
export const getAdminSummary = async (req, res) => {
  try {
    const statsSnapshot = await adminDb.collection('aiStats').get();
    const stats = statsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // ── Totals ────────────────────────────────────────────────────────────────
    const globalStat = stats.find(s => s.id === 'global') || { totalCalls: 0, totalCostINR: 0, totalTokensIn: 0, totalTokensOut: 0 };
    const { totalCalls, totalCostINR, totalTokensIn, totalTokensOut } = globalStat;

    // ── Per-month breakdown ───────────────────────────────────────────────────
    const monthlyData = stats
      .filter(s => s.id.startsWith('month_'))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // ── Per-teacher breakdown ─────────────────────────────────────────────────
    const teacherData = stats
      .filter(s => s.id.startsWith('teacher_'))
      .sort((a, b) => b.costINR - a.costINR);

    // ── Per-action breakdown ──────────────────────────────────────────────────
    const actionData = stats
      .filter(s => s.id.startsWith('action_'))
      .sort((a, b) => b.calls - a.calls);

    // ── Current month stats ───────────────────────────────────────────────────
    const now          = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonth    = stats.find(s => s.id === `month_${currentMonth}`) || { calls: 0, costINR: 0 };

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

    const snapshot = await adminDb.collection('aiLogs')
      .orderBy('timestamp', 'desc')
      .limit(Number(pageSize))
      .get();

    let logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Memory filter to avoid complex Firestore composite indexes
    if (month)     logs = logs.filter(l => l.month === month);
    if (teacherId) logs = logs.filter(l => l.teacherId === teacherId);

    return res.status(200).json({ logs, total: logs.length });
  } catch (err) {
    console.error('[adminController] getAdminLogs error:', err);
    return res.status(500).json({ error: err.message });
  }
};
