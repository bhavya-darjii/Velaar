import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import './AdminDashboard.css';

// ── Constants ──────────────────────────────────────────────────────────────────
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const ADMIN_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/admin` : `${BASE_URL}/api/admin`;

const PIE_COLORS = ['#ea580c','#f97316','#fb923c','#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];

// Action → CSS tag class mapping
const getTagClass = (action = '') => {
  if (action.includes('roadmap'))      return 'roadmap';
  if (action.includes('questions'))    return 'questions';
  if (action.includes('lesson-plan') || action.includes('specific') || action.includes('supplementary') || action.includes('enrichment')) return 'lesson-plan';
  if (action.includes('grade'))        return 'grade';
  if (action.includes('copo'))         return 'copo';
  if (action.includes('enrichment'))   return 'enrichment';
  return '';
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtTokens = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : (n || 0).toString();

const monthLabel = (m) => {
  if (!m || m === 'unknown') return m;
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
};

const initials = (name = '') => name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const formatTimestamp = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// ── Custom Tooltip for BarChart ────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{monthLabel(label)}</div>
      {payload.map((p, i) => (
        <div key={i} className="tt-item">
          <span className="tt-dot" style={{ background: p.color }} />
          <span>{p.name === 'costINR' ? fmt(p.value) : p.value} {p.name === 'calls' ? 'calls' : ''}</span>
        </div>
      ))}
    </div>
  );
};

// ── Pie Tooltip ────────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{p.name}</div>
      <div className="tt-item">
        <span className="tt-dot" style={{ background: p.payload.fill }} />
        <span>{p.payload.calls} calls · {fmt(p.value)}</span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary]   = useState(null);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [actionFilter, setActionFilter]   = useState('all');

  // ── Fetch data ───────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [sumRes, logRes] = await Promise.all([
        fetch(`${ADMIN_URL}/summary`),
        fetch(`${ADMIN_URL}/logs?pageSize=500`),
      ]);
      if (!sumRes.ok || !logRes.ok) throw new Error('Server returned an error');
      const sumData = await sumRes.json();
      const logData = await logRes.json();
      setSummary(sumData);
      setLogs(logData.logs || []);
    } catch (e) {
      setError(`Failed to load analytics: ${e.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Log-out ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  // ── Available months for filter (from logs) ──────────────────────────────────
  const availableMonths = [...new Set(logs.map(l => l.month).filter(Boolean))].sort().reverse();

  // ── Filtered logs ────────────────────────────────────────────────────────────
  const filteredLogs = logs.filter(l => {
    const matchMonth  = selectedMonth === 'all' || l.month === selectedMonth;
    const matchAction = actionFilter  === 'all' || l.action === actionFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (l.teacherName  || '').toLowerCase().includes(q)
      || (l.teacherEmail || '').toLowerCase().includes(q)
      || (l.subjectName  || '').toLowerCase().includes(q)
      || (l.actionLabel  || '').toLowerCase().includes(q);
    return matchMonth && matchAction && matchSearch;
  });

  // ── Unique actions for filter dropdown ───────────────────────────────────────
  const uniqueActions = [...new Map(logs.map(l => [l.action, l.actionLabel])).entries()];

  // ── Loading / Error ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="admin-root">
      <div className="admin-loading">
        <div className="admin-spinner" />
        <span>Loading analytics data…</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="admin-root">
      <div className="admin-error">⚠️ {error}</div>
    </div>
  );

  const { totals = {}, thisMonth = {}, monthlyData = [], teacherData = [], actionData = [] } = summary || {};

  // Pie chart data
  const pieData = actionData.map((a, i) => ({
    name: a.actionLabel,
    value: a.costINR,
    calls: a.calls,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const totalPieCost = pieData.reduce((s, p) => s + p.value, 0);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="admin-root">
      <div className="admin-inner">

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <header className="admin-header">
          <div className="admin-header-left">
            <div className="admin-badge">🛡️</div>
            <div>
              <h1>Admin Analytics</h1>
              <p className="admin-header-sub">Real-time AI usage &amp; cost monitoring · Velaar</p>
            </div>
          </div>
          <div className="admin-header-right">
            <button
              id="admin-refresh-btn"
              className={`refresh-btn${refreshing ? ' spinning' : ''}`}
              onClick={() => fetchData(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh
            </button>
            <button id="admin-logout-btn" className="admin-logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>

        {/* ── FILTER STRIP ───────────────────────────────────────────────────── */}
        <div className="glass-card filter-strip">
          <label>View month:</label>
          <select
            id="admin-month-filter"
            className="month-select"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="all">All Time</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <label style={{ marginLeft: 8 }}>Filter action:</label>
          <select
            id="admin-action-filter"
            className="month-select"
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map(([a, label]) => (
              <option key={a} value={a}>{label}</option>
            ))}
          </select>
        </div>

        {/* ── KPI CARDS ──────────────────────────────────────────────────────── */}
        <div className="kpi-grid">
          <div className="kpi-card" style={{ '--kpi-accent': '#ea580c' }}>
            <div className="kpi-icon">💰</div>
            <div className="kpi-body">
              <div className="kpi-label">This Month's Cost</div>
              <div className="kpi-value orange">{fmt(thisMonth.costINR || 0)}</div>
              <div className="kpi-sub">{thisMonth.calls || 0} AI calls this month</div>
            </div>
          </div>

          <div className="kpi-card" style={{ '--kpi-accent': '#6366f1' }}>
            <div className="kpi-icon">📊</div>
            <div className="kpi-body">
              <div className="kpi-label">Total Cost (All Time)</div>
              <div className="kpi-value">{fmt(totals.totalCostINR || 0)}</div>
              <div className="kpi-sub">{totals.totalCalls || 0} total AI calls</div>
            </div>
          </div>

          <div className="kpi-card" style={{ '--kpi-accent': '#10b981' }}>
            <div className="kpi-icon">🪙</div>
            <div className="kpi-body">
              <div className="kpi-label">Total Tokens Used</div>
              <div className="kpi-value">{fmtTokens((totals.totalTokensIn || 0) + (totals.totalTokensOut || 0))}</div>
              <div className="kpi-sub">{fmtTokens(totals.totalTokensIn || 0)} in · {fmtTokens(totals.totalTokensOut || 0)} out</div>
            </div>
          </div>

          <div className="kpi-card" style={{ '--kpi-accent': '#f59e0b' }}>
            <div className="kpi-icon">👩‍🏫</div>
            <div className="kpi-body">
              <div className="kpi-label">Top Teacher (Cost)</div>
              <div className="kpi-value" style={{ fontSize: '1.2rem', paddingTop: 4 }}>
                {summary?.mostActiveTeacher?.teacherName || '—'}
              </div>
              <div className="kpi-sub">
                {summary?.mostActiveTeacher ? `${fmt(summary.mostActiveTeacher.costINR)} · ${summary.mostActiveTeacher.calls} calls` : 'No data yet'}
              </div>
            </div>
          </div>

          <div className="kpi-card" style={{ '--kpi-accent': '#06b6d4' }}>
            <div className="kpi-icon">⚡</div>
            <div className="kpi-body">
              <div className="kpi-label">Most Used Feature</div>
              <div className="kpi-value" style={{ fontSize: '0.95rem', paddingTop: 4, lineHeight: 1.3 }}>
                {summary?.topAction?.actionLabel || '—'}
              </div>
              <div className="kpi-sub">
                {summary?.topAction ? `${summary.topAction.calls} uses` : 'No data yet'}
              </div>
            </div>
          </div>

          <div className="kpi-card" style={{ '--kpi-accent': '#8b5cf6' }}>
            <div className="kpi-icon">📚</div>
            <div className="kpi-body">
              <div className="kpi-label">Teachers Active</div>
              <div className="kpi-value">{teacherData.length}</div>
              <div className="kpi-sub">{actionData.length} distinct AI actions</div>
            </div>
          </div>
        </div>

        {/* ── CHARTS ROW ─────────────────────────────────────────────────────── */}
        <div className="charts-row">

          {/* Monthly Cost Bar Chart */}
          <div className="glass-card chart-container">
            <div className="section-title">📅 Monthly AI Cost (₹)</div>
            {monthlyData.length === 0 ? (
              <div className="no-logs-msg">No monthly data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={v => `₹${v}`}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="costINR" name="costINR" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === monthlyData.length - 1 ? '#ea580c' : '#4b3a8c'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Monthly Call Count Bar Chart */}
          <div className="glass-card chart-container">
            <div className="section-title">📈 Monthly AI Calls</div>
            {monthlyData.length === 0 ? (
              <div className="no-logs-msg">No monthly data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="calls" name="calls" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === monthlyData.length - 1 ? '#6366f1' : '#2a3a6e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── TEACHER LEADERBOARD ─────────────────────────────────────────────── */}
        <div className="glass-card">
          <div className="section-title">🏆 Teacher Cost Leaderboard</div>
          {teacherData.length === 0 ? (
            <div className="no-logs-msg">No teacher data yet. Trigger some AI actions to see costs.</div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table" id="teacher-leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Teacher</th>
                    <th>Subject / Course</th>
                    <th>AI Calls</th>
                    <th>Tokens In</th>
                    <th>Tokens Out</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.map((t, i) => {
                    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
                    // Collect unique subjects this teacher used
                    const teacherSubjects = [...new Set(
                      logs.filter(l => l.teacherId === t.teacherId && l.subjectName).map(l => l.subjectName)
                    )].slice(0, 2).join(', ') || '—';
                    return (
                      <tr key={t.teacherId} id={`teacher-row-${i + 1}`}>
                        <td><span className={`rank-badge ${rankClass}`}>{i + 1}</span></td>
                        <td>
                          <div className="teacher-name-cell">
                            <div className="teacher-avatar">{initials(t.teacherName)}</div>
                            <div>
                              <span>{t.teacherName || 'Unknown'}</span>
                              <span className="teacher-email">{t.teacherEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', maxWidth: 160 }}>
                          {teacherSubjects}
                        </td>
                        <td><span className="token-pill">{t.calls}</span></td>
                        <td><span className="token-pill">{fmtTokens(t.inputTokens)}</span></td>
                        <td><span className="token-pill">{fmtTokens(t.outputTokens)}</span></td>
                        <td><span className="cost-chip">₹ {Math.round(t.costINR).toLocaleString('en-IN')}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── ACTION BREAKDOWN ────────────────────────────────────────────────── */}
        <div className="charts-row">

          {/* Donut + Legend */}
          <div className="glass-card">
            <div className="section-title">🎯 Cost by Feature (Donut)</div>
            {pieData.length === 0 ? (
              <div className="no-logs-msg">No data yet</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={90}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pie-legend">
                  {pieData.map((p, i) => (
                    <div key={i} className="pie-legend-item">
                      <span className="pie-legend-dot" style={{ background: p.fill }} />
                      <span>{p.name}</span>
                      <span className="pie-legend-pct">
                        {totalPieCost > 0 ? `${Math.round((p.value / totalPieCost) * 100)}%` : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Horizontal bar list */}
          <div className="glass-card">
            <div className="section-title">📋 Action Usage Breakdown</div>
            {actionData.length === 0 ? (
              <div className="no-logs-msg">No action data yet</div>
            ) : (
              <div className="action-list">
                {actionData.map((a, i) => {
                  const maxCalls = actionData[0]?.calls || 1;
                  const pct = (a.calls / maxCalls) * 100;
                  return (
                    <div key={i} className="action-row">
                      <div className="action-label-txt" title={a.actionLabel}>{a.actionLabel}</div>
                      <div className="action-bar-wrap">
                        <div className="action-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="action-calls">{a.calls} calls</div>
                      <div className="action-cost">{fmt(a.costINR)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── DETAILED LOG TABLE ──────────────────────────────────────────────── */}
        <div className="glass-card">
          <div className="section-title">🔍 Detailed AI Call Log</div>
          <div className="log-controls">
            <input
              id="admin-log-search"
              type="text"
              className="log-search"
              placeholder="Search by teacher, subject, or action…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select
              id="admin-log-month-filter"
              className="log-filter-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <select
              id="admin-log-action-filter"
              className="log-filter-select"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(([a, label]) => (
                <option key={a} value={a}>{label}</option>
              ))}
            </select>
            <div className="log-count">{filteredLogs.length} records</div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="no-logs-msg">
              {logs.length === 0
                ? 'No AI calls logged yet. Every time a teacher uses an AI feature, it will appear here.'
                : 'No records match your search/filter.'}
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table" id="admin-log-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>AI Action</th>
                    <th>Tokens In</th>
                    <th>Tokens Out</th>
                    <th>Cost (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, i) => (
                    <tr key={log.id || i}>
                      <td className="timestamp-cell">{formatTimestamp(log.timestamp)}</td>
                      <td>
                        <div className="teacher-name-cell">
                          <div className="teacher-avatar" style={{ width: 26, height: 26, fontSize: '0.65rem' }}>
                            {initials(log.teacherName)}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.82rem' }}>{log.teacherName || 'Unknown'}</span>
                            <span className="teacher-email">{log.teacherEmail}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', maxWidth: 140 }}>
                        {log.subjectName || '—'}
                      </td>
                      <td>
                        <span className={`action-tag ${getTagClass(log.action)}`} title={log.actionLabel}>
                          {log.actionLabel || log.action}
                        </span>
                      </td>
                      <td className="timestamp-cell">{fmtTokens(log.inputTokens)}</td>
                      <td className="timestamp-cell">{fmtTokens(log.outputTokens)}</td>
                      <td>
                        <span className="cost-chip">₹{Math.round(log.costINR).toLocaleString('en-IN')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
