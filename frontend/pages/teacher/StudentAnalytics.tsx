/* eslint-disable */
// @ts-nocheck
/**
 * StudentAnalytics.tsx  (was: StudentRiskAnalytics.tsx)
 *
 * PURE UI — no business logic, no thresholds, no Supabase calls.
 * All data fetched from /api/hier-analytics/teacher via fetchTeacherAnalytics().
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  fetchTeacherAnalytics,
  type TeacherAnalytics,
  type TeacherCourseMetric,
  type StudentRow,
} from "../../services/hierarchicalAnalyticsService";
import "../student/StudentDashboard.css";

const RiskBar = ({ pct, color }: { pct: number; color: string }) => (
  <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 4, height: 6, overflow: "hidden", marginTop: 6 }}>
    <div style={{
      height: "100%",
      width: `${Math.min(Math.max(pct, 0), 100)}%`,
      background: color,
      borderRadius: 4,
      transition: "width 0.8s ease",
    }} />
  </div>
);

const FILTERS = ["All", "High Risk", "Low Risk"] as const;
const ITEMS_PER_PAGE = 10;

// ─── Component ────────────────────────────────────────────────────────────────
const StudentAnalytics = () => {
  const { course } = useOutletContext<any>() || {};

  const [analytics, setAnalytics] = useState<TeacherAnalytics | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<typeof FILTERS[number]>("All");
  const [search,    setSearch]    = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchTeacherAnalytics();
    if (result) {
      setAnalytics(result);
    } else {
      setError("Could not load analytics. Make sure the server is running.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setCurrentPage(1); }, [filter, search, course?.id]);

  const courseMetric: TeacherCourseMetric | null = analytics?.courses.find(
    c => c.courseId === course?.id,
  ) ?? null;

  const thresholds = analytics?.thresholds;
  const ATT = thresholds?.ATTENDANCE ?? 75;

  const students: StudentRow[] = courseMetric?.students ?? [];
  const highCount = students.filter(s => s.atRisk).length;
  const lowCount  = students.length - highCount;

  const searchLower = search.toLowerCase();
  const filtered = students.filter(s => {
    const matchFilter = filter === "All" ? true : filter === "High Risk" ? s.atRisk : !s.atRisk;
    const matchSearch = !searchLower || (s.name ?? "").toLowerCase().includes(searchLower) || s.id.toLowerCase().includes(searchLower);
    return matchFilter && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) return (
    <div className="sd-root">
      {/* Header Skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 24 }}>
        <div>
          <div className="skel-line xl" style={{ width: '200px', marginBottom: '8px' }}></div>
          <div className="skel-line sm" style={{ width: '120px' }}></div>
        </div>
        <div className="skel-pill" style={{ width: '80px', height: '36px', borderRadius: '8px' }}></div>
      </div>

      {/* Search + filter Skeleton */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ flex: "1 1 280px" }}>
          <div className="skeleton-card" style={{ height: "56px", padding: 0, borderRadius: "12px" }}></div>
        </div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
           <div className="skeleton-card" style={{ height: "56px", width: "125px", padding: 0, borderRadius: "12px" }}></div>
           <div className="skeleton-card" style={{ height: "56px", width: "125px", padding: 0, borderRadius: "12px" }}></div>
        </div>
      </div>

      {/* Student list Skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={`skel-student-${i}`} className="skeleton-card" style={{ padding: "20px" }}>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
               <div>
                 <div className="skel-line lg" style={{ width: "140px", marginBottom: "8px" }}></div>
                 <div className="skel-line sm" style={{ width: "90px" }}></div>
               </div>
               <div className="skel-circle" style={{ width: "42px", height: "42px" }}></div>
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                   <div className="skel-line sm" style={{ width: "60px", marginBottom: "6px" }}></div>
                   <div className="skel-line lg" style={{ width: "40px", marginBottom: "6px" }}></div>
                   <div className="skel-line" style={{ width: "100%", height: "4px" }}></div>
                </div>
                <div>
                   <div className="skel-line sm" style={{ width: "60px", marginBottom: "6px" }}></div>
                   <div className="skel-line lg" style={{ width: "40px", marginBottom: "6px" }}></div>
                   <div className="skel-line" style={{ width: "100%", height: "4px" }}></div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: "#ef4444" }}>{error}</div>
  );

  if (!course?.id) return (
    <div className="glass-card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>Select a course from the sidebar to view analytics.</p>
    </div>
  );

  if (!courseMetric) return (
    <div className="glass-card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>No analytics data for this course yet.</p>
      <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.55)" }}>
        Students matched by institution and semester.
      </p>
    </div>
  );

  return (
    <div className="sd-root">

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>
            Student Analytics
          </h2>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.75)", fontSize: "0.9rem" }}>
            {students.length} students · {courseMetric.courseName}
          </p>
        </div>
        <button className="risk-refresh-btn" onClick={load}>Refresh</button>
      </div>

      {/* Search + filter */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px" }}>
          <label className="glass-card" style={{ display: "flex", alignItems: "center", height: "56px", padding: "0 16px", boxSizing: "border-box", cursor: "text" }}>
            <svg style={{ width: 16, height: 16, color: "rgba(255,255,255,0.6)", flexShrink: 0, marginRight: 12 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="risk-search-input"
              placeholder="Search by name or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", height: "100%", cursor: "text" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          {[{ label: "High Risk", count: highCount, color: "#ef4444" }, { label: "Low Risk", count: lowCount, color: "#22c55e" }].map(s => {
            const isActive = filter === s.label;
            return (
              <div key={s.label} className="glass-card"
                onClick={() => setFilter(isActive ? "All" : s.label as any)}
                style={{ padding: "8px 20px", cursor: "pointer", border: isActive ? `1px solid ${s.color}` : undefined, minWidth: 125, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</span>
                <p style={{ margin: "3px 0 0", fontSize: "0.7rem", color: "rgba(255,255,255,0.8)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student list */}
      {students.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>No students found for this course.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "36px 24px" }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>No students match your search or filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {paginated.map(student => {
            const isHighRisk = student.atRisk;
            
            return (
              <div key={student.id} className="glass-card" style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isHighRisk ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.9rem", flexShrink: 0 }}>
                    {(student.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>{student.name}</p>
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: isHighRisk ? "#ef4444" : "#22c55e", background: isHighRisk ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.1)", padding: "2px 8px", borderRadius: 6 }}>
                      {isHighRisk ? "High Risk" : "Low Risk"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    {student.courseAvg !== null && (
                      <>
                        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                          {student.courseAvg}<span style={{ fontSize: "0.85rem", opacity: 0.8 }}>%</span>
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginTop: "4px" }}>
                          Avg Score
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 18 }}>
                  {/* Attendance */}
                  <div>
                    <p style={{ margin: "0 0 4px", fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>Attendance</p>
                    <p style={{ margin: 0, fontWeight: 800, color: student.attendance.atRisk ? "#ef4444" : "#fff", fontSize: "1.05rem" }}>{student.attendance.pct}%</p>
                    <p style={{ margin: "3px 0 6px", fontSize: "0.75rem", color: "rgba(255,255,255,0.75)" }}>
                      {student.attendance.attended}/{student.attendance.total} sessions{student.attendance.atRisk ? ` · need >= ${ATT}%` : ""}
                    </p>
                    <RiskBar pct={student.attendance.pct} color={student.attendance.atRisk ? "#ef4444" : "#22c55e"} />
                  </div>

                  {/* TT1 */}
                  {student.tt1 && (
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>TT1</p>
                      <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                        {student.tt1.score}<span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>/{student.tt1.outOf}</span>
                      </p>
                      <p style={{ margin: "3px 0 6px", fontSize: "0.75rem", color: "rgba(255,255,255,0.75)" }}>Effective Marks</p>
                      <RiskBar pct={Math.round((student.tt1.score / student.tt1.outOf) * 100)} color={student.tt1.color} />
                    </div>
                  )}

                  {/* TT2 */}
                  {student.tt2 && (
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>TT2</p>
                      <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                        {student.tt2.score}<span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>/{student.tt2.outOf}</span>
                      </p>
                      <p style={{ margin: "3px 0 6px", fontSize: "0.75rem", color: "rgba(255,255,255,0.75)" }}>Effective Marks</p>
                      <RiskBar pct={Math.round((student.tt2.score / student.tt2.outOf) * 100)} color={student.tt2.color} />
                    </div>
                  )}

                  {/* TT Combined */}
                  {student.ttCombined && (
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>TT Combined</p>
                      <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                        {student.ttCombined.score}<span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>/{student.ttCombined.outOf}</span>
                      </p>
                      <p style={{ margin: "3px 0 6px", fontSize: "0.75rem", color: "rgba(255,255,255,0.75)" }}>
                        {!student.ttCombined.pass ? `Needs Improvement` : "Combined Marks"}
                      </p>
                      <RiskBar pct={Math.round((student.ttCombined.score / student.ttCombined.outOf) * 100)} color={student.ttCombined.color} />
                    </div>
                  )}

                  {/* ESE */}
                  {student.ese && (
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: "0.72rem", color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>ESE</p>
                      <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: "1.05rem" }}>
                        {student.ese.score}<span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>/{student.ese.outOf}</span>
                      </p>
                      <p style={{ margin: "3px 0 6px", fontSize: "0.75rem", color: "rgba(255,255,255,0.75)" }}>
                        {!student.ese.pass ? `Needs Improvement` : "End Semester Marks"}
                      </p>
                      <RiskBar pct={Math.round((student.ese.score / student.ese.outOf) * 100)} color={student.ese.color} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="glass-btn glass-btn--ghost" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>Previous</button>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", fontWeight: 600 }}>Page {currentPage} of {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="glass-btn glass-btn--ghost" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentAnalytics;
