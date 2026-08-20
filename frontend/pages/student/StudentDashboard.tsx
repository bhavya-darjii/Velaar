/* eslint-disable */
// @ts-nocheck
/**
 * StudentDashboard.tsx
 *
 * PURE UI — no business logic, no thresholds, no Supabase calls.
 * All data fetched from /api/hier-analytics/student via fetchStudentAnalytics().
 * Thresholds live exclusively in backend/controllers/hierarchicalAnalyticsController.ts
 */
import { useState, useEffect, useCallback } from "react";
import {
  fetchStudentAnalytics,
} from "../../services/hierarchicalAnalyticsService";

import StudentDashboardSkeleton from "../../components/skeletons/StudentDashboardSkeleton";
import "./StudentDashboard.css";

// ─── Colour helpers (for attendance) ─────────────────────────────────────────
const ringColor = (pct: number, threshold: number) =>
  pct >= threshold ? "#22c55e" : pct >= threshold * 0.75 ? "#f59e0b" : "#ef4444";

// ─── Sub-components ───────────────────────────────────────────────────────────
const RiskBar = ({ score, outOf, color }: { score: number; outOf: number; color: string }) => {
  const fillPct = outOf > 0 ? Math.min((score / outOf) * 100, 100) : 0;
  return (
    <div style={{ background: "rgba(255,255,255,0.10)", borderRadius: 4, height: 5, overflow: "hidden", marginTop: 6 }}>
      <div style={{
        height: "100%",
        width: `${fillPct}%`,
        background: color,
        borderRadius: 4,
        transition: "width 0.8s ease",
      }} />
    </div>
  );
};

const MetricBlock = ({
  label, score, outOf, color, sub,
}: {
  label: string; score: number; outOf: number; color: string; sub?: string;
}) => (
  <div className="sd-metric">
    <p className="sd-metric-label">{label}</p>
    <p className="sd-metric-value" style={{ color: "#fff" }}>
      {score}<span className="sd-metric-denom">/{outOf}</span>
      <span className="sd-metric-pct" style={{ marginLeft: 6 }}>({Math.round((score/outOf)*100)}%)</span>
    </p>
    <p className="sd-metric-sub">{sub ?? ""}</p>
    <RiskBar score={score} outOf={outOf} color={color} />
  </div>
);

// ─── Course card ──────────────────────────────────────────────────────────────
const CourseCard = ({ course, thresholds }: { course: any; thresholds: any }) => {
  const isHighRisk = course.atRisk;
  const { ATTENDANCE } = thresholds;

  const courseAvg = course.courseAvg;

  return (
    <div className={`sd-subject-card${isHighRisk ? " sd-subject-card--risk" : ""}`}>
      <div className="sd-subject-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="sd-subject-info">
          <div className="sd-subject-name">{course.courseName}</div>
          <span className="sd-risk-badge" style={{
            color:      isHighRisk ? "#ef4444" : "#22c55e",
            background: isHighRisk ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.10)",
          }}>
            {isHighRisk ? "High Risk" : "On Track"}
          </span>
        </div>
        {courseAvg !== null && (
          <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>
              {courseAvg}<span style={{ fontSize: "0.85rem", opacity: 0.8 }}>%</span>
            </div>
            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginTop: "4px" }}>
              Avg Score
            </div>
          </div>
        )}
      </div>

      <div className="sd-metrics-grid">
        {/* Attendance */}
        <div className="sd-metric">
          <p className="sd-metric-label">Attendance</p>
          <p className="sd-metric-value" style={{ color: ringColor(course.attendance.pct, ATTENDANCE) }}>
            {course.attendance.pct}%
          </p>
          <p className="sd-metric-sub">
            {course.attendance.attended}/{course.attendance.total} sessions
            {course.attendance.atRisk ? (
              <span style={{ fontWeight: 800, color: "#fff" }}> · need &gt;= {ATTENDANCE}%</span>
            ) : ""}
          </p>
          <RiskBar score={course.attendance.pct} outOf={100} color={ringColor(course.attendance.pct, ATTENDANCE)} />
        </div>

        {/* TT1 */}
        {course.tt1 && (
          <MetricBlock
            label="TT1"
            score={course.tt1.score}
            outOf={course.tt1.outOf}
            color={course.tt1.color}
            sub="Effective Marks"
          />
        )}

        {/* TT2 */}
        {course.tt2 && (
          <MetricBlock
            label="TT2"
            score={course.tt2.score}
            outOf={course.tt2.outOf}
            color={course.tt2.color}
            sub="Effective Marks"
          />
        )}

        {/* TT Combined */}
        {course.ttCombined && (
          <MetricBlock
            label="TT Combined"
            score={course.ttCombined.score}
            outOf={course.ttCombined.outOf}
            color={course.ttCombined.color}
            sub={!course.ttCombined.pass ? "Needs improvement" : "Combined Marks"}
          />
        )}

        {/* ESE */}
        {course.ese && (
          <MetricBlock
            label="ESE"
            score={course.ese.score}
            outOf={course.ese.outOf}
            color={course.ese.color}
            sub={!course.ese.pass ? "Needs improvement" : "End Semester"}
          />
        )}

        {/* No marks yet */}
        {!course.tt1 && !course.tt2 && !course.ese && (
          <div className="sd-metric sd-metric--muted">
            <p className="sd-metric-label">Marks</p>
            <p className="sd-metric-sub" style={{ marginTop: 6 }}>Not entered yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [data,     setData]     = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchStudentAnalytics();
    if (result) {
      setData(result);
    } else {
      setError("Could not load analytics. Make sure the server is running.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <StudentDashboardSkeleton />;

  if (error || !data) return (
    <div className="sd-root">
      <div className="sd-empty-card">
        <div style={{ fontSize: "2rem", marginBottom: 12 }}>📡</div>
        <p style={{ color: "#ef4444", margin: 0, fontWeight: 700 }}>
          {error ?? "No data returned from server."}
        </p>
        <button className="risk-refresh-btn" onClick={load} style={{ marginTop: 16 }}>Retry</button>
      </div>
    </div>
  );

  const { overallAttendance, courses, atRiskCourses, thresholds } = data;
  const { ATTENDANCE } = thresholds;

  // Calculate overall average based on dynamic totals
  let totalAchieved = 0;
  let totalPossible = 0;
  courses.forEach((c: any) => {
    if (c.ese) {
      totalAchieved += c.ese.score;
      totalPossible += c.ese.outOf;
    }
    if (c.ttCombined) {
      totalAchieved += c.ttCombined.score;
      totalPossible += c.ttCombined.outOf;
    } else {
      if (c.tt1) { totalAchieved += c.tt1.score; totalPossible += c.tt1.outOf; }
      if (c.tt2) { totalAchieved += c.tt2.score; totalPossible += c.tt2.outOf; }
    }
  });

  const avgScore = totalPossible > 0 ? Math.round((totalAchieved / totalPossible) * 100) : null;
  const attColor = ringColor(overallAttendance.pct, ATTENDANCE);

  // Gather specific subjects at risk
  const attRiskNames = courses.filter((c: any) => c.attendance.atRisk).map((c: any) => c.courseName);
  const marksRiskNames = courses.filter((c: any) => 
    (c.ttCombined && !c.ttCombined.pass) || 
    (c.ese && !c.ese.pass) || 
    (c.tt1 && c.tt1.pass === false) || 
    (c.tt2 && c.tt2.pass === false)
  ).map((c: any) => c.courseName);

  let riskSuggestion: React.ReactNode = <span style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Keep up the great work!</span>;
  
  if (attRiskNames.length > 0 || marksRiskNames.length > 0) {
    riskSuggestion = (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left", width: "100%", marginTop: "4px" }}>
        {attRiskNames.length > 0 && (
          <div style={{ color: "rgba(255, 255, 255, 0.75)", fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.3 }}>
            <span style={{ fontWeight: 800, color: "#fff" }}>Attendance:</span> {attRiskNames.join(", ")}
          </div>
        )}
        {marksRiskNames.length > 0 && (
          <div style={{ color: "rgba(255, 255, 255, 0.75)", fontWeight: 600, fontSize: "0.85rem", lineHeight: 1.3 }}>
            <span style={{ fontWeight: 800, color: "#fff" }}>Marks:</span> {marksRiskNames.join(", ")}
          </div>
        )}
      </div>
    );
  }

  const globalRisk = overallAttendance.atRisk || (avgScore !== null && avgScore < 60)
    ? { label: "High Risk", color: "#ef4444" }
    : atRiskCourses > 0
      ? { label: "Moderate", color: "#f59e0b" }
      : { label: "Low Risk", color: "#22c55e" };

  const riskScore = overallAttendance.atRisk
    ? 80
    : atRiskCourses > 0
      ? 50
      : avgScore !== null ? Math.max(0, 100 - avgScore) : 20;

  return (
    <div className="sd-root">
      {/* Header */}
      <div className="sd-header-row">
        <div>
          <h2 className="sd-page-title">My Analytics</h2>
          <p className="sd-page-sub">
            {courses.length} course{courses.length !== 1 ? "s" : ""}
            {" · "}
            {atRiskCourses > 0 ? `${atRiskCourses} at risk` : "all on track"}
          </p>
        </div>
        <button className="risk-refresh-btn" onClick={load}>Refresh</button>
      </div>

      {/* Overview strip */}
      <div className="sd-overview-row">
        {/* Attendance ring */}
        <div className="sd-stat-card">
          <div className="sd-stat-label">Attendance</div>
          <div className="sd-ring-wrap">
            <svg viewBox="0 0 64 64" className="sd-ring-svg">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              <circle
                cx="32" cy="32" r="26" fill="none"
                stroke={attColor} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - overallAttendance.pct / 100)}`}
                transform="rotate(-90 32 32)"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <span className="sd-ring-val" style={{ color: attColor }}>{overallAttendance.pct}%</span>
          </div>
          <div className="sd-stat-sub" style={{ 
            color: overallAttendance.atRisk ? "#fff" : "rgba(255,255,255,0.7)",
            fontWeight: overallAttendance.atRisk ? 800 : 'normal'
          }}>
            {overallAttendance.atRisk ? `Need >= ${ATTENDANCE}%` : "Meeting requirement"}
          </div>
        </div>

        {/* Risk Status */}
        <div className="sd-stat-card" style={{ borderColor: globalRisk.color + "44" }}>
          <div className="sd-stat-label">Risk Status</div>
          <div className="sd-risk-pill" style={{ background: globalRisk.color }}>{globalRisk.label}</div>
          <div className="sd-risk-bar-bg">
            <div className="sd-risk-bar-fill" style={{ width: `${riskScore}%`, background: globalRisk.color }} />
          </div>
          <div className="sd-stat-sub">{riskSuggestion}</div>
        </div>

        {/* Avg Score */}
        <div className="sd-stat-card">
          <div className="sd-stat-label">Avg. Score</div>
          {avgScore !== null ? (
            <>
              <div className="sd-big-num" style={{ color: avgScore >= 60 ? "#22c55e" : avgScore >= 45 ? "#f59e0b" : "#ef4444" }}>
                {avgScore}<span className="sd-big-unit">%</span>
              </div>
              <div className="sd-stat-sub" style={{ color: "rgba(255, 255, 255, 0.75)", fontWeight: 600 }}>
                Across {courses.length} course{courses.length !== 1 ? "s" : ""}
              </div>
            </>
          ) : (
            <div className="sd-stat-sub" style={{ marginTop: 12 }}>No marks entered yet</div>
          )}
        </div>
      </div>

      {/* Subject-wise analytics */}
      <div className="sd-section-title">Subject-wise Analytics</div>

      {courses.length === 0 ? (
        <div className="sd-empty-card">
          <p style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>No courses found for your semester.</p>
        </div>
      ) : (
        <div className="sd-subjects-list">
          {courses
            .slice()
            .sort((a, b) => (b.atRisk ? 1 : 0) - (a.atRisk ? 1 : 0))
            .map((course: any) => (
              <CourseCard key={course.courseId} course={course} thresholds={thresholds} />
            ))}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
