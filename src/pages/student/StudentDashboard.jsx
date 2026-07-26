import { useState, useEffect } from "react";
import { auth, db } from "../../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import StudentDashboardSkeleton from "../../components/skeletons/StudentDashboardSkeleton";
import "./StudentDashboard.css";

/* ── Static placeholder data ─────────────────────────────────── */
const STATIC_SUBJECTS = [
  { 
    name: "Artificial Intelligence & Ethics", 
    exams: [
      { name: "End Semester", marks: 28, total: 60 },
      { name: "Term Test 1", marks: 8, total: 20 },
      { name: "Term Test 2", marks: 10, total: 20 }
    ],
    grade: "C" 
  },
  { 
    name: "Data Structures", 
    exams: [
      { name: "End Semester", marks: 32, total: 60 },
      { name: "Term Test 1", marks: 10, total: 20 },
      { name: "Term Test 2", marks: 11, total: 20 }
    ],
    grade: "C+" 
  },
  { 
    name: "Computer Networks", 
    exams: [
      { name: "End Semester", marks: 25, total: 60 },
      { name: "Term Test 1", marks: 9, total: 20 },
      { name: "Term Test 2", marks: 8, total: 20 }
    ],
    grade: "D" 
  },
  { 
    name: "Operating Systems", 
    exams: [
      { name: "End Semester", marks: 38, total: 60 },
      { name: "Term Test 1", marks: 11, total: 20 },
      { name: "Term Test 2", marks: 12, total: 20 }
    ],
    grade: "B" 
  },
];

const ATTENDANCE_PERCENT = 68;

const getRiskLabel = (score) => {
  if (score <= 30) return { label: "Low Risk", color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  if (score <= 60) return { label: "Moderate", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  return { label: "High Risk", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
};

const getAttendanceColor = (pct) => {
  if (pct >= 75) return "#22c55e";
  if (pct >= 60) return "#f59e0b";
  return "#ef4444";
};

const StudentDashboard = () => {
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setFullName((data.fullName || data.name || "Student").split(" ")[0]);
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <StudentDashboardSkeleton />;

  const avgMarks = Math.round(
    STATIC_SUBJECTS.reduce((s, sub) => {
      const totalMarks = sub.exams.reduce((sum, ex) => sum + ex.marks, 0);
      const maxMarks = sub.exams.reduce((sum, ex) => sum + ex.total, 0);
      return s + (totalMarks / maxMarks) * 100;
    }, 0) / STATIC_SUBJECTS.length
  );

  const calculatedRiskScore = Math.max(0, Math.min(100, Math.round(100 - ((ATTENDANCE_PERCENT * 0.4) + (avgMarks * 0.6)))));
  const risk = getRiskLabel(calculatedRiskScore);

  let riskSuggestion = "Keep up the great work!";
  if (ATTENDANCE_PERCENT < 75 && avgMarks < 60) {
    riskSuggestion = "Need to improve attendance and scores.";
  } else if (ATTENDANCE_PERCENT < 75) {
    riskSuggestion = "Try to attend more classes.";
  } else if (avgMarks < 60) {
    riskSuggestion = "Focus on improving your grades.";
  } else if (calculatedRiskScore > 30) {
    riskSuggestion = "Room for improvement across the board.";
  }

  return (
    <div className="sd-root">

      {/* ── Overview strip ──────────────────────────────────── */}
      <div className="sd-overview-row">

        {/* Attendance */}
        <div className="sd-stat-card">
          <div className="sd-stat-label">Attendance</div>
          <div className="sd-ring-wrap">
            <svg viewBox="0 0 64 64" className="sd-ring-svg">
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
              <circle
                cx="32" cy="32" r="26"
                fill="none"
                stroke={getAttendanceColor(ATTENDANCE_PERCENT)}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - ATTENDANCE_PERCENT / 100)}`}
                transform="rotate(-90 32 32)"
              />
            </svg>
            <span className="sd-ring-val" style={{ color: getAttendanceColor(ATTENDANCE_PERCENT) }}>
              {ATTENDANCE_PERCENT}%
            </span>
          </div>
        </div>

        {/* Average Marks */}
        <div className="sd-stat-card">
          <div className="sd-stat-label">Avg. Score</div>
          <div className="sd-big-num">{avgMarks}<span className="sd-big-unit">%</span></div>
          <div className="sd-stat-sub">Across {STATIC_SUBJECTS.length} subjects</div>
        </div>

        {/* Risk status */}
        <div className="sd-stat-card" style={{ borderColor: risk.color + "44" }}>
          <div className="sd-stat-label">Risk Status</div>
          <div className="sd-risk-pill" style={{ background: risk.color, color: "#ffffff" }}>
            {risk.label}
          </div>
          <div className="sd-risk-bar-bg">
            <div
              className="sd-risk-bar-fill"
              style={{ width: `${calculatedRiskScore}%`, background: risk.color }}
            />
          </div>
          <div className="sd-stat-sub">{riskSuggestion}</div>
        </div>

      </div>

      {/* ── Subject-wise marks ──────────────────────────────── */}
      <div className="sd-section-title">Subject Overview</div>
      <div className="sd-subjects-list">
        {STATIC_SUBJECTS.map((sub) => {
          const totalMarks = sub.exams.reduce((sum, ex) => sum + ex.marks, 0);
          const maxMarks = sub.exams.reduce((sum, ex) => sum + ex.total, 0);

          return (
            <div key={sub.name} className="sd-subject-card">
              <div className="sd-subject-header">
                <div className="sd-subject-info">
                  <div className="sd-subject-name">{sub.name}</div>
                  <div className="sd-subject-grade">Overall Grade: {sub.grade}</div>
                </div>
                <div className="sd-subject-right">
                  <div className="sd-subject-score">{totalMarks}<span className="sd-subject-total">/{maxMarks}</span></div>
                </div>
              </div>
              <div className="sd-exam-list">
                {sub.exams.map(exam => {
                  const pct = Math.round((exam.marks / exam.total) * 100);
                  return (
                    <div key={exam.name} className="sd-exam-row">
                      <div className="sd-exam-name">{exam.name}</div>
                      <div className="sd-subject-right">
                        <div className="sd-subject-score">{exam.marks}<span className="sd-subject-total">/{exam.total}</span></div>
                        <div className="sd-subject-bar-bg">
                          <div
                            className="sd-subject-bar-fill"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 75 ? "#22c55e" : pct >= 55 ? "#f59e0b" : "#ef4444"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default StudentDashboard;
