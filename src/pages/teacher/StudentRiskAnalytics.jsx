import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { getCourseRiskProfiles, getRiskLevel } from '../../services/dataService';
import { predictStudentRisk } from '../../services/aiService';

const RISK_COLORS = {
  high:   { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', badge: '#ef4444', label: 'High Risk' },
  medium: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', badge: '#f59e0b', label: 'Moderate' },
  low:    { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', badge: '#22c55e', label: 'Low Risk' },
};

const FILTERS = ['All', 'High Risk', 'Moderate', 'Low Risk'];

const RiskBar = ({ value }) => (
  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 4 }}>
    <div style={{
      height: '100%',
      width: `${value}%`,
      background: value >= 65 ? '#ef4444' : value >= 35 ? '#f59e0b' : '#22c55e',
      borderRadius: 4,
      transition: 'width 0.8s ease',
    }} />
  </div>
);

const StudentRiskAnalytics = () => {
  const { course } = useOutletContext() || {};
  const [profiles, setProfiles] = useState([]);
  const [aiResults, setAiResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState(null);

  const loadProfiles = useCallback(async () => {
    if (!course?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const data = await getCourseRiskProfiles(course);
      setProfiles(data);
    } catch (err) {
      console.error('Risk profiles error:', err);
      setError('Could not load student data. Check your Supabase connection.');
    } finally {
      setLoading(false);
    }
  }, [course?.id]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const handleAiEnrich = async () => {
    if (!profiles.length) return;
    setAiLoading(true);
    try {
      const payload = profiles.slice(0, 20).map((s) => ({
        studentId: s.id,
        studentName: s.name,
        attendance: s.attendancePct,
        tt1: s.tt1Pct ?? 70,
        tt2: s.tt2Pct ?? 70,
        consecutiveAbsences: s.consecutiveAbsences,
      }));
      const result = await predictStudentRisk({ students: payload });
      if (result?.students) {
        // Merge AI interventions into profiles
        const aiMap = Object.fromEntries(result.students.map((s) => [s.studentId, s]));
        setAiResults(aiMap);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const filtered = profiles.filter((p) => {
    if (filter === 'All') return true;
    if (filter === 'High Risk') return p.riskLevel === 'high';
    if (filter === 'Moderate') return p.riskLevel === 'medium';
    if (filter === 'Low Risk') return p.riskLevel === 'low';
    return true;
  });

  const highCount = profiles.filter((p) => p.riskLevel === 'high').length;
  const medCount  = profiles.filter((p) => p.riskLevel === 'medium').length;
  const lowCount  = profiles.filter((p) => p.riskLevel === 'low').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>At-Risk Students</h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
            Live data from attendance sessions and marks · {profiles.length} students
          </p>
        </div>
        <button
          onClick={handleAiEnrich}
          disabled={aiLoading || profiles.length === 0}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: aiLoading || profiles.length === 0 ? 'not-allowed' : 'pointer',
            opacity: aiLoading || profiles.length === 0 ? 0.6 : 1,
            transition: 'all 0.2s ease',
          }}
        >
          {aiLoading ? 'Analyzing with AI…' : '✨ AI Intervention Suggestions'}
        </button>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {[
            { label: 'High Risk', count: highCount, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
            { label: 'Moderate',  count: medCount,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Low Risk',  count: lowCount,  color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          ].map((s) => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 16, padding: '18px 20px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.count}</span>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      {!loading && profiles.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px',
                borderRadius: 10,
                border: '1px solid',
                borderColor: filter === f ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
                background: filter === f ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                color: filter === f ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)' }}>
          Loading student data…
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>{error}</div>
      ) : profiles.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0',
          background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.4)',
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 12 }}>👥</p>
          <p style={{ margin: 0 }}>No students found. Students need to be registered under this course's institution and semester.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((student) => {
            const risk = RISK_COLORS[student.riskLevel];
            const ai = aiResults?.[student.id];
            return (
              <div
                key={student.id}
                style={{
                  background: risk.bg,
                  border: `1px solid ${risk.border}`,
                  borderRadius: 18,
                  padding: '20px 24px',
                  transition: 'transform 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  {/* Student info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: `${risk.badge}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, color: risk.badge, fontSize: '0.9rem',
                        flexShrink: 0,
                      }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{student.name}</p>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.8px', color: risk.badge,
                          background: `${risk.badge}18`, padding: '2px 8px', borderRadius: 6,
                        }}>
                          {risk.label}
                        </span>
                      </div>
                    </div>

                    {/* Metrics row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Attendance</p>
                        <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{student.attendancePct}%</p>
                        <RiskBar value={student.attendancePct} />
                      </div>
                      {student.tt1Pct !== null && student.tt1Pct !== undefined && (
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>TT1</p>
                          <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{student.tt1Pct}%</p>
                          <RiskBar value={student.tt1Pct} />
                        </div>
                      )}
                      {student.tt2Pct !== null && student.tt2Pct !== undefined && (
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>TT2</p>
                          <p style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{student.tt2Pct}%</p>
                          <RiskBar value={student.tt2Pct} />
                        </div>
                      )}
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Risk Score</p>
                        <p style={{ margin: 0, fontWeight: 800, color: risk.badge, fontSize: '1rem' }}>{student.riskScore}</p>
                        <RiskBar value={student.riskScore} />
                      </div>
                    </div>

                    {/* AI Intervention */}
                    {ai?.intervention && (
                      <div style={{
                        marginTop: 12, padding: '10px 14px',
                        background: 'rgba(99,102,241,0.1)', borderRadius: 10,
                        border: '1px solid rgba(99,102,241,0.2)',
                      }}>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(167,139,250,0.9)', fontWeight: 600 }}>
                          💡 {ai.intervention}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentRiskAnalytics;
