import { useState, useEffect } from "react";
import { supabase } from "../../services/supabase";
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
  const [attendancePercent, setAttendancePercent] = useState(0);

  useEffect(() => {
    // Fallback: always exit loading after 4 seconds max
    const timer = setTimeout(() => setLoading(false), 4000);
    const fetchProfileAndAttendance = async (user) => {
      try {
        const { data: userData, error } = await supabase
          .from("users")
          .select("full_name, institution_id, semester")
          .eq("id", user.id)
          .single();

        if (userData && !error) {
          setFullName((userData.full_name || "Student").split(" ")[0]);
          
          if (userData.institution_id && userData.semester) {
            // Fetch all courses and filter in JS to avoid column-not-found errors
            const { data: allCourses } = await supabase
              .from("courses")
              .select("*");
              
            const courses = (allCourses || []).filter(c => {
              const matchInst = c.institution_id === userData.institution_id;
              const matchSem = String(c.semester) === String(userData.semester);
              return matchInst && matchSem;
            });
            
            if (courses && courses.length > 0) {
              const courseIds = courses.map((c) => c.id);
              
              const { count: totalSessions } = await supabase
                .from("attendance_sessions")
                .select("*", { count: "exact", head: true })
                .in("course_id", courseIds);
                
              const { count: attendedSessions } = await supabase
                .from("attendance_logs")
                .select("*", { count: "exact", head: true })
                .eq("student_id", user.id)
                .in("course_id", courseIds);
                
              if (totalSessions && totalSessions > 0) {
                setAttendancePercent(Math.round(((attendedSessions || 0) / totalSessions) * 100));
              } else {
                setAttendancePercent(100);
              }
            } else {
              setAttendancePercent(100); // Default if no courses found
            }
          }
        } else {
          const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Student";
          setFullName(name.split(" ")[0]);
        }
      } catch (e) {
        const name = user.user_metadata?.full_name || user.email?.split('@')[0] || "Student";
        setFullName(name.split(" ")[0]);
      }
      clearTimeout(timer);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfileAndAttendance(session.user);
      } else {
        clearTimeout(timer);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfileAndAttendance(session.user);
      }
    });

    return () => { subscription?.unsubscribe(); clearTimeout(timer); };
  }, []);

  if (loading) return <StudentDashboardSkeleton />;

  const avgMarks = Math.round(
    STATIC_SUBJECTS.reduce((s, sub) => {
      const totalMarks = sub.exams.reduce((sum, ex) => sum + ex.marks, 0);
      const maxMarks = sub.exams.reduce((sum, ex) => sum + ex.total, 0);
      return s + (totalMarks / maxMarks) * 100;
    }, 0) / STATIC_SUBJECTS.length
  );

  const calculatedRiskScore = Math.max(0, Math.min(100, Math.round(100 - ((attendancePercent * 0.4) + (avgMarks * 0.6)))));
  const risk = getRiskLabel(calculatedRiskScore);

  let riskSuggestion = "Keep up the great work!";
  if (attendancePercent < 75 && avgMarks < 60) {
    riskSuggestion = "Need to improve attendance and scores.";
  } else if (attendancePercent < 75) {
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
                stroke={getAttendanceColor(attendancePercent)}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - attendancePercent / 100)}`}
                transform="rotate(-90 32 32)"
              />
            </svg>
            <span className="sd-ring-val" style={{ color: getAttendanceColor(attendancePercent) }}>
              {attendancePercent}%
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
