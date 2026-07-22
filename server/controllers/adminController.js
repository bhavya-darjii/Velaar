import { adminDb } from '../firebaseAdmin.js';

// â”€â”€â”€ GET /api/admin/summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getAdminSummary = async (req, res) => {
  if (!adminDb) {
    return res.status(500).json({ error: "Server Configuration Error: GOOGLE_SERVICE_ACCOUNT_KEY is missing on Render. Admin Database unavailable." });
  }

  try {
    const statsSnapshot = await adminDb.collection('aiStats').get();
    const stats = statsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // â”€â”€ Totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const globalStat = stats.find(s => s.id === 'global') || { totalCalls: 0, totalCostINR: 0, totalTokensIn: 0, totalTokensOut: 0 };
    const { totalCalls, totalCostINR, totalTokensIn, totalTokensOut } = globalStat;

    // â”€â”€ Per-month breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const monthlyData = stats
      .filter(s => s.id.startsWith('month_'))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);

    // â”€â”€ Per-teacher breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const teacherData = stats
      .filter(s => s.id.startsWith('teacher_'))
      .sort((a, b) => b.costINR - a.costINR);

    // â”€â”€ Per-action breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const actionData = stats
      .filter(s => s.id.startsWith('action_'))
      .sort((a, b) => b.calls - a.calls);

    // â”€â”€ Current month stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ GET /api/admin/logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const getAdminLogs = async (req, res) => {
  if (!adminDb) {
    return res.status(500).json({ error: "Server Configuration Error: GOOGLE_SERVICE_ACCOUNT_KEY is missing on Render. Admin Database unavailable." });
  }
  
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
