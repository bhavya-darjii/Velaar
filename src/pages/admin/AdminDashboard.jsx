import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import './AdminDashboard.css';
import AdminDashboardSkeleton from '../../components/skeletons/AdminDashboardSkeleton';

const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
const ADMIN_URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/admin` : `${BASE_URL}/api/admin`;

const PIE_COLORS = ['#ea580c','#f97316','#fb923c','#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];

const getTagClass = (action = '') => {
  if (action.includes('roadmap'))      return 'roadmap';
  if (action.includes('questions'))    return 'questions';
  if (action.includes('lesson-plan') || action.includes('specific') || action.includes('supplementary') || action.includes('enrichment')) return 'lesson-plan';
  if (action.includes('grade'))        return 'grade';
  if (action.includes('copo'))         return 'copo';
  return '';
};

const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtTokens = (n) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : (n || 0).toString();

const monthLabel = (m) => {
  if (!m || m === 'unknown') return m;
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
};

const initials = (name = '') => name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

const formatTimestamp = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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

// SVG Icons
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconCost = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const IconToken = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [summary, setSummary]   = useState(null);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState('');

  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchQuery, setSearchQuery]     = useState('');
  const [actionFilter, setActionFilter]   = useState('all');

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

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const availableMonths = [...new Set(logs.map(l => l.month).filter(Boolean))].sort().reverse();

  // Latest first — sort descending by timestamp
  const filteredLogs = logs
    .filter(l => {
      const matchMonth  = selectedMonth === 'all' || l.month === selectedMonth;
      const matchAction = actionFilter  === 'all' || l.action === actionFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q
        || (l.teacherName  || '').toLowerCase().includes(q)
        || (l.teacherEmail || '').toLowerCase().includes(q)
        || (l.subjectName  || '').toLowerCase().includes(q)
        || (l.actionLabel  || '').toLowerCase().includes(q);
      return matchMonth && matchAction && matchSearch;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const uniqueActions = [...new Map(logs.map(l => [l.action, l.actionLabel])).entries()];

  if (loading) return <AdminDashboardSkeleton />;

  if (error) return (
    <div className="admin-root">
      <div className="admin-error">
        <div className="admin-error-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <span>{error}</span>
      </div>
    </div>
  );

  const { totals = {}, thisMonth = {}, monthlyData = [], teacherData = [], actionData = [] } = summary || {};

  const pieData = actionData.map((a, i) => ({
    name: a.actionLabel,
    value: a.costINR,
    calls: a.calls,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const totalPieCost = pieData.reduce((s, p) => s + p.value, 0);

  const kpiCards = [
    {
      icon: <IconCost />, accent: '#ea580c',
      label: "This Month's Cost",
      value: fmt(thisMonth.costINR || 0),
      valueClass: 'orange',
      sub: `${thisMonth.calls || 0} Velaar calls this month`,
    },
    {
      icon: <IconChart />, accent: '#6366f1',
      label: 'Total Cost (All Time)',
      value: fmt(totals.totalCostINR || 0),
      sub: `${totals.totalCalls || 0} total Velaar calls`,
    },
    {
      icon: <IconToken />, accent: '#10b981',
      label: 'Total Tokens Used',
      value: fmtTokens((totals.totalTokensIn || 0) + (totals.totalTokensOut || 0)),
      sub: `${fmtTokens(totals.totalTokensIn || 0)} in · ${fmtTokens(totals.totalTokensOut || 0)} out`,
    },
    {
      icon: <IconStar />, accent: '#f59e0b',
      label: 'Top Teacher (Cost)',
      value: summary?.mostActiveTeacher?.teacherName || '—',
      valueStyle: { fontSize: '1.1rem', paddingTop: 4 },
      sub: summary?.mostActiveTeacher
        ? `${fmt(summary.mostActiveTeacher.costINR)} · ${summary.mostActiveTeacher.calls} calls`
        : 'No data yet',
    },
    {
      icon: <IconZap />, accent: '#06b6d4',
      label: 'Most Used Feature',
      value: summary?.topAction?.actionLabel || '—',
      valueStyle: { fontSize: '0.9rem', paddingTop: 4, lineHeight: 1.3 },
      sub: summary?.topAction ? `${summary.topAction.calls} uses` : 'No data yet',
    },
    {
      icon: <IconUsers />, accent: '#8b5cf6',
      label: 'Active Teachers',
      value: teacherData.length,
      sub: `${actionData.length} distinct Velaar actions`,
    },
  ];

  return (
    <div className="admin-root">
      <div className="admin-inner">

        {/* HEADER */}
        <header className="admin-header">
          <div className="admin-header-left">
            <div className="admin-badge">
              <IconShield />
            </div>
            <div>
              <h1>Admin Analytics</h1>
              <p className="admin-header-sub">Real-time Velaar usage &amp; cost monitoring</p>
            </div>
          </div>
          <div className="admin-header-right">
            <button
              id="admin-refresh-btn"
              className={`admin-action-btn${refreshing ? ' spinning' : ''}`}
              onClick={() => fetchData(true)}
            >
              <IconRefresh />
              Refresh
            </button>
            <button id="admin-logout-btn" className="admin-action-btn admin-logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>

        {/* FILTER STRIP */}
        <div className="glass-card filter-strip">
          <div className="filter-group">
            <label className="filter-label">Month</label>
            <select
              id="admin-month-filter"
              className="admin-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="all">All Time</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Action</label>
            <select
              id="admin-action-filter"
              className="admin-select"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(([a, label]) => (
                <option key={a} value={a}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI GRID */}
        <div className="kpi-grid">
          {kpiCards.map((card, i) => (
            <div className="kpi-card" key={i} style={{ '--kpi-accent': card.accent }}>
              <div className="kpi-icon-wrap" style={{ color: card.accent }}>
                {card.icon}
              </div>
              <div className="kpi-body">
                <div className="kpi-label">{card.label}</div>
                <div className={`kpi-value${card.valueClass ? ` ${card.valueClass}` : ''}`} style={card.valueStyle || {}}>
                  {card.value}
                </div>
                <div className="kpi-sub">{card.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CHARTS ROW */}
        <div className="charts-row">
          <div className="glass-card chart-container">
            <div className="section-header">
              <span className="section-title">Monthly Velaar Cost</span>
              <span className="section-unit">₹ INR</span>
            </div>
            {monthlyData.length === 0 ? (
              <div className="no-data-msg">No monthly data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `₹${v}`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="costINR" name="costINR" radius={[5, 5, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === monthlyData.length - 1 ? '#ea580c' : 'rgba(234,88,12,0.35)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card chart-container">
            <div className="section-header">
              <span className="section-title">Monthly Velaar Calls</span>
              <span className="section-unit">count</span>
            </div>
            {monthlyData.length === 0 ? (
              <div className="no-data-msg">No monthly data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="calls" name="calls" radius={[5, 5, 0, 0]}>
                    {monthlyData.map((_, i) => (
                      <Cell key={i} fill={i === monthlyData.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.35)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* TEACHER LEADERBOARD */}
        <div className="glass-card" style={{ width: '100%', minWidth: '100%', padding: '30px', boxSizing: 'border-box' }}>
          <div className="section-header">
            <span className="section-title">Teacher Cost Leaderboard</span>
            <span className="section-unit">{teacherData.length} teachers</span>
          </div>
          {teacherData.length === 0 ? (
            <div className="no-data-msg">No teacher data yet. Trigger some Velaar actions to see costs.</div>
          ) : (
            <div className="scrollable-table-wrap">
              <table className="data-table" id="teacher-leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Teacher</th>
                    <th>Subject / Course</th>
                    <th>Velaar Calls</th>
                    <th>Tokens In</th>
                    <th>Tokens Out</th>
                    <th>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.map((t, i) => {
                    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
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
                              <span className="teacher-name">{t.teacherName || 'Unknown'}</span>
                              <span className="teacher-email">{t.teacherEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td className="subject-cell">{teacherSubjects}</td>
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

        {/* ACTION BREAKDOWN */}
        <div className="charts-row">
          <div className="glass-card">
            <div className="section-header">
              <span className="section-title">Cost by Feature</span>
              <span className="section-unit">donut</span>
            </div>
            {pieData.length === 0 ? (
              <div className="no-data-msg">No data yet</div>
            ) : (
              <div className="pie-wrap">
                <div className="pie-chart-area">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={84} dataKey="value" paddingAngle={3}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="pie-legend">
                  {pieData.map((p, i) => (
                    <div key={i} className="pie-legend-item">
                      <span className="pie-legend-dot" style={{ background: p.fill }} />
                      <span className="pie-legend-name">{p.name}</span>
                      <span className="pie-legend-pct">
                        {totalPieCost > 0 ? `${Math.round((p.value / totalPieCost) * 100)}%` : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card">
            <div className="section-header">
              <span className="section-title">Action Usage Breakdown</span>
              <span className="section-unit">by calls</span>
            </div>
            {actionData.length === 0 ? (
              <div className="no-data-msg">No action data yet</div>
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

        {/* DETVelaarLED LOG TABLE */}
        <div className="glass-card" style={{ width: '100%', minWidth: '100%', padding: '30px', boxSizing: 'border-box' }}>
          <div className="section-header">
            <span className="section-title">Detailed Velaar Call Log</span>
            <span className="section-unit">{filteredLogs.length} records</span>
          </div>
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
              className="admin-select"
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
              className="admin-select"
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(([a, label]) => (
                <option key={a} value={a}>{label}</option>
              ))}
            </select>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="no-data-msg">
              {logs.length === 0
                ? 'No Velaar calls logged yet. Every time a teacher uses an Velaar feature, it will appear here.'
                : 'No records match your search or filter.'}
            </div>
          ) : (
          <div className="scrollable-table-wrap">
              <table className="data-table" id="admin-log-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Teacher</th>
                    <th>Subject</th>
                    <th>Velaar Action</th>
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
                          <div className="teacher-avatar sm">{initials(log.teacherName)}</div>
                          <div>
                            <span className="teacher-name sm">{log.teacherName || 'Unknown'}</span>
                            <span className="teacher-email">{log.teacherEmail}</span>
                          </div>
                        </div>
                      </td>
                      <td className="subject-cell">{log.subjectName || '—'}</td>
                      <td>
                        <span className={`action-tag ${getTagClass(log.action)}`} title={log.actionLabel}>
                          {log.actionLabel || log.action}
                        </span>
                      </td>
                      <td className="timestamp-cell">{fmtTokens(log.inputTokens)}</td>
                      <td className="timestamp-cell">{fmtTokens(log.outputTokens)}</td>
                      <td><span className="cost-chip">₹{Math.round(log.costINR).toLocaleString('en-IN')}</span></td>
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
