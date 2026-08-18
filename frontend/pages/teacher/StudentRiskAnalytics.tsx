/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../services/supabase';

// ─── Thresholds ───────────────────────────────────────────────────────────────
const TT_COMBINED_PASS = 16;  // out of 40
const ESE_PASS_PCT = 60;  // % of ESE max marks
const ATT_THRESHOLD = 75;  // %

// Periodic refresh interval (ms) — does NOT re-fetch on tab switch
const REFRESH_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours

const FILTERS = ['All', 'High Risk', 'Low Risk'];

// ─── RiskBar: green = good, yellow = warning, red = danger ───────────────────
// pct = actual performance percentage (higher = better)
// passAt = the threshold below which it's dangerous (e.g. 75 for attendance)
const barColor = (pct, passAt) => {
  if (pct >= passAt) return '#22c55e';           // above pass threshold → green
  if (pct >= passAt * 0.75) return '#f59e0b';   // within 25% below threshold → yellow
  return '#ef4444';                               // well below → red
};

const RiskBar = ({ pct, passAt }) => (
  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 6 }}>
    <div style={{
      height: '100%',
      width: `${Math.min(Math.max(pct, 0), 100)}%`,
      background: barColor(pct, passAt),
      borderRadius: 4,
      transition: 'width 0.8s ease',
    }} />
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
const StudentRiskAnalytics = () => {
  const { course } = useOutletContext() || {};

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Stable refs — prevent re-fetch on every course object reference change
  const courseIdRef = useRef(null);
  const instIdRef = useRef(null);
  const semRef = useRef(null);
  const tt1EffRef = useRef(null);
  const tt2EffRef = useRef(null);
  const eseEffRef = useRef(null);
  const esePatternRef = useRef(null);
  const timerRef = useRef(null);

  // ─── Core fetch (stable, no reactive deps) ────────────────────────────────
  const fetchProfiles = useCallback(async () => {
    const courseId = courseIdRef.current;
    const instId = instIdRef.current;
    const sem = semRef.current;
    const tt1Eff = tt1EffRef.current || {};
    const tt2Eff = tt2EffRef.current || {};
    const eseEff = eseEffRef.current || {};
    const eseMax = Number(esePatternRef.current ?? 60);

    if (!courseId) { setLoading(false); return; }
    try {
      setError(null);

      let q = supabase.from('users').select('id, full_name, email').eq('user_type', 'student');
      if (instId) q = q.eq('institution_id', instId);
      if (sem) q = q.eq('semester', sem);
      const { data: students } = await q;

      const { data: sessions } = await supabase.from('attendance_sessions').select('id').eq('course_id', courseId);
      const sessionIds = (sessions || []).map(s => s.id);
      const { data: logs } = sessionIds.length
        ? await supabase.from('attendance_logs').select('student_id').in('session_id', sessionIds)
        : { data: [] };

      const logsByStudent = {};
      (logs || []).forEach(l => { logsByStudent[l.student_id] = (logsByStudent[l.student_id] || 0) + 1; });
      const totalSessions = sessionIds.length;

      const mapped = (students || []).map(s => {
        const attended = logsByStudent[s.id] || 0;
        const attPct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
        const attAtRisk = attPct < ATT_THRESHOLD;

        const tt1Score = tt1Eff[s.id] !== undefined ? Number(tt1Eff[s.id]) : null;
        const tt2Score = tt2Eff[s.id] !== undefined ? Number(tt2Eff[s.id]) : null;
        const eseRaw = eseEff[s.id] !== undefined ? Number(eseEff[s.id]) : null;
        const esePct = eseRaw !== null ? Math.round((eseRaw / eseMax) * 100) : null;
        const ttCombined = (tt1Score !== null && tt2Score !== null) ? tt1Score + tt2Score : null;
        const ttAtRisk = ttCombined !== null && ttCombined < TT_COMBINED_PASS;
        const eseAtRisk = esePct !== null && esePct < ESE_PASS_PCT;
        const atRisk = attAtRisk || ttAtRisk || eseAtRisk;

        return {
          id: s.id, name: s.full_name || s.email || 'Unknown',
          riskLevel: atRisk ? 'high' : 'low',
          attendancePct: attPct, attended, totalSessions, attAtRisk,
          tt1Score, tt2Score, ttCombined, ttAtRisk,
          eseRaw, eseMax, esePct, eseAtRisk, atRisk,
        };
      }).sort((a, b) => (b.atRisk ? 1 : 0) - (a.atRisk ? 1 : 0));

      setProfiles(mapped);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Risk profiles error:', err);
      setError('Could not load student data.');
    } finally {
      setLoading(false);
    }
  }, []); // stable — no reactive deps

  // ─── Sync refs when course changes, but only trigger fetch if course.id changes ──
  useEffect(() => {
    if (!course?.id) return;

    // Always sync the effective score refs (used on next fetch)
    tt1EffRef.current = course.tt1_effective || {};
    tt2EffRef.current = course.tt2_effective || {};
    eseEffRef.current = course.ese_effective || {};
    esePatternRef.current = course.exam_patterns?.ese?.headerConfig?.maxMarks ?? 60;
    instIdRef.current = course.institution_id;
    semRef.current = course.semester;

    const isFirstLoad = courseIdRef.current !== course.id;
    courseIdRef.current = course.id;

    if (isFirstLoad) {
      // First time this course is loaded → fetch immediately
      setLoading(true);
      fetchProfiles();

      // Set up periodic refresh every 5 minutes
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(fetchProfiles, REFRESH_INTERVAL);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [course?.id]); // ONLY re-trigger when course ID changes, not every re-render

  useEffect(() => { setCurrentPage(1); }, [filter, search]);

  const searchLower = search.toLowerCase();
  const filtered = profiles.filter(p => {
    const f = filter === 'All' ? true : filter === 'High Risk' ? p.riskLevel === 'high' : p.riskLevel === 'low';
    const s = !searchLower || p.name.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower);
    return f && s;
  });

  const highCount = profiles.filter(p => p.riskLevel === 'high').length;
  const lowCount = profiles.filter(p => p.riskLevel === 'low').length;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const currentStudents = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const fmtTime = (d) => d ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Student Analytics</h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem' }}>
            {profiles.length} students · last updated {fmtTime(lastUpdated)} · Automatically refreshes every 3 hrs
          </p>
        </div>
        <button 
          className="risk-refresh-btn"
          onClick={() => { setLoading(true); fetchProfiles(); }}
        >
          Refresh
        </button>
      </div>

      {/* Search (Left) + Summary Cards (Right) */}
      {!loading && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {/* Search bar on left */}
          <div style={{ flex: '1 1 280px' }}>
            <label className="glass-card" style={{ display: 'flex', alignItems: 'center', height: '56px', padding: '0 16px', boxSizing: 'border-box', cursor: 'text' }}>
              <svg style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.6)', flexShrink: 0, marginRight: 12, pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input 
                type="text" 
                className="risk-search-input"
                placeholder="Search by name or ID…" 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', height: '100%', cursor: 'text' }}
              />
            </label>
          </div>

          {/* Summary cards on right (strictly side-by-side) */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'nowrap' }}>
            {[{ label: 'High Risk', count: highCount, color: '#ef4444' }, { label: 'Low Risk', count: lowCount, color: '#22c55e' }].map(s => {
              const isActive = filter === s.label;
              return (
                <div key={s.label} className="glass-card" onClick={() => setFilter(isActive ? 'All' : s.label)} 
                     style={{ padding: '8px 20px', cursor: 'pointer', position: 'relative', border: isActive ? `1px solid ${s.color}` : undefined, minWidth: 125, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</span>
                  <p style={{ margin: '3px 0 0', fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
                  {/* Slanting Arrow (Top Right diagonal) */}
                  <svg style={{ position: 'absolute', bottom: 10, right: 12, width: 15, height: 15, color: isActive ? s.color : 'rgba(255,255,255,0.3)', transition: 'all 0.2s ease' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                  </svg>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.7)' }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>{error}</div>
      ) : profiles.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>No students found for this course.</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Students matched by institution and semester.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>No students match your search or filter.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {currentStudents.map(student => {
            const isHighRisk = student.riskLevel === 'high';
            return (
              <div key={student.id} className="glass-card" style={{ padding: '20px 24px' }}>
                {/* Name + badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isHighRisk ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.9rem', flexShrink: 0 }}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{student.name}</p>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: isHighRisk ? '#ef4444' : '#22c55e', background: isHighRisk ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                      {isHighRisk ? 'High Risk' : 'Low Risk'}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 18 }}>
                  {/* Attendance */}
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Attendance</p>
                    <p style={{ margin: 0, fontWeight: 800, color: student.attAtRisk ? '#ef4444' : '#fff', fontSize: '1.05rem' }}>{student.attendancePct}%</p>
                    <p style={{ margin: '3px 0 6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                      {student.attended}/{student.totalSessions} sessions{student.attAtRisk ? ` · need ≥${ATT_THRESHOLD}%` : ''}
                    </p>
                    <RiskBar pct={student.attendancePct} passAt={ATT_THRESHOLD} />
                  </div>

                  {/* TT1 */}
                  {student.tt1Score !== null && (
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>TT1</p>
                      <p style={{ margin: 0, fontWeight: 800, color: student.tt1Score < 8 ? '#ef4444' : '#fff', fontSize: '1.05rem' }}>
                        {student.tt1Score}<span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>/20</span>
                      </p>
                      <p style={{ margin: '3px 0 6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                        {student.tt1Score < 8 ? `Need ≥${Math.max(0, TT_COMBINED_PASS - student.tt1Score)} in TT2 to pass` : 'Effective Marks'}
                      </p>
                      {/* TT1 bar: green if ≥8/20 (40% — fair contribution to combined pass) */}
                      <RiskBar pct={Math.round((student.tt1Score / 20) * 100)} passAt={40} />
                    </div>
                  )}

                  {/* TT2 */}
                  {student.tt2Score !== null && (
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>TT2</p>
                      <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '1.05rem' }}>
                        {student.tt2Score}<span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>/20</span>
                      </p>
                      <p style={{ margin: '3px 0 6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>Effective Marks</p>
                      <RiskBar pct={Math.round((student.tt2Score / 20) * 100)} passAt={40} />
                    </div>
                  )}

                  {/* TT Combined */}
                  {student.ttCombined !== null && (
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>TT Combined</p>
                      <p style={{ margin: 0, fontWeight: 800, color: student.ttAtRisk ? '#ef4444' : '#fff', fontSize: '1.05rem' }}>
                        {student.ttCombined}<span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>/40</span>
                      </p>
                      <p style={{ margin: '3px 0 6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                        {student.ttAtRisk ? `Need ≥${TT_COMBINED_PASS} to pass` : 'Combined Marks'}
                      </p>
                      {/* Combined bar: pass threshold = 16/40 = 40% */}
                      <RiskBar pct={Math.round((student.ttCombined / 40) * 100)} passAt={Math.round((TT_COMBINED_PASS / 40) * 100)} />
                    </div>
                  )}

                  {/* ESE */}
                  {student.esePct !== null && (
                    <div>
                      <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>ESE</p>
                      <p style={{ margin: 0, fontWeight: 800, color: student.eseAtRisk ? '#ef4444' : '#fff', fontSize: '1.05rem' }}>
                        {student.eseRaw}<span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>/{student.eseMax}</span>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', marginLeft: 6 }}>({student.esePct}%)</span>
                      </p>
                      <p style={{ margin: '3px 0 6px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)' }}>
                        {student.eseAtRisk ? `Need ≥${ESE_PASS_PCT}% to pass` : 'End semester Marks'}
                      </p>
                      <RiskBar pct={student.esePct} passAt={ESE_PASS_PCT} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="glass-btn glass-btn--ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Previous</button>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: 600 }}>Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="glass-btn glass-btn--ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentRiskAnalytics;
