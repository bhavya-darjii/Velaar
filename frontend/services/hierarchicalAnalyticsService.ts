/**
 * hierarchicalAnalyticsService.ts
 *
 * Typed fetch helpers for the /api/hier-analytics/* endpoints.
 * One function per hierarchy level — import the one you need in your dashboard.
 *
 * All functions return null on error (never throw) so dashboards can handle
 * gracefully without try/catch boilerplate.
 */

import { supabase } from './supabase';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface Thresholds {
  TT_COMBINED_PASS_PCT: number; // e.g. 40 for 40%
  END_SEM_PASS_PCT:     number; // e.g. 40 for 40%
  ATTENDANCE:           number; // % threshold
  TPI_PASS_WT:          number;
  TPI_ATT_WT:           number;
}

export interface AttendanceStat {
  attended: number;
  total:    number;
  pct:      number;
  atRisk:   boolean;
}

export interface ExamStat {
  score:  number;
  outOf:  number;
  pass:   boolean | null;
  color:  string;
  hasData: true;
}

// ─── Level 1 — Student ────────────────────────────────────────────────────────

export interface StudentCourseMetric {
  courseId:   string;
  courseName: string;
  code:       string | null;
  semester:   string | null;
  courseAvg:  number | null;
  attendance: AttendanceStat;
  tt1:        ExamStat | null;   // null = not entered yet
  tt2:        ExamStat | null;
  ttCombined: ExamStat | null;
  ese:        ExamStat | null;
  atRisk:     boolean;
}

export interface StudentAnalytics {
  student:           { id: string; name: string | null; email: string | null };
  overallAttendance: AttendanceStat;
  courses:           StudentCourseMetric[];
  atRiskCourses:     number;
  thresholds:        Pick<Thresholds, 'TT_COMBINED_PASS_PCT' | 'END_SEM_PASS_PCT' | 'ATTENDANCE'>;
}

// ─── Level 2 — Teacher ────────────────────────────────────────────────────────

export interface StudentRow {
  id:         string;
  name:       string;
  courseAvg:  number | null;
  attendance: AttendanceStat;
  tt1:        ExamStat | null;
  tt2:        ExamStat | null;
  ttCombined: ExamStat | null;
  ese:        ExamStat | null;
  atRisk:     boolean;
}

export interface CourseStat {
  passRate:  number | null;
  avgScore:  number | null;
  passCount: number;
  total:     number;
}

export interface TeacherCourseMetric {
  courseId:       string;
  courseName:     string;
  code:           string | null;
  semester:       string | null;
  totalStudents:  number;
  totalSessions:  number;
  avgAttendance:  number | null;
  attAtRiskCount: number;
  tt1:            CourseStat;
  tt2:            CourseStat;
  ttCombined:     CourseStat | null;
  ese:            CourseStat;
  atRiskCount:    number;
  tpi:            number | null;   // Teacher Performance Index 0–100
  students:       StudentRow[];    // full drill-down
}

export interface TeacherSummary {
  totalCourses:        number;
  totalStudents:       number;
  avgPassRate:         number | null;
  avgAttendance:       number | null;
  totalAtRiskStudents: number;
  avgTpi:              number | null;
}

export interface TeacherAnalytics {
  teacherId:  string;
  summary:    TeacherSummary | null;
  courses:    TeacherCourseMetric[];
  thresholds: Thresholds;
}

// ─── Level 3 — HOD ────────────────────────────────────────────────────────────

export interface TeacherRow {
  teacherId:    string;
  teacherName:  string;
  teacherEmail: string;
  totalCourses: number;
  avgPassRate:  number | null;
  avgAttendance: number | null;
  atRiskStudents: number;
  tpi:          number | null;
}

export interface HodSummary {
  department:    string;
  totalTeachers: number;
  totalCourses:  number;
  totalAtRisk:   number;
  avgPassRate:   number | null;
  avgAttendance: number | null;
  avgTpi:        number | null;
}

export interface HodAnalytics {
  hod:        { id: string; name: string | null; department: string };
  summary:    HodSummary;
  teachers:   TeacherRow[];   // sorted by TPI desc
  thresholds: Thresholds;
}

// ─── Level 4 — Principal ─────────────────────────────────────────────────────

export interface DepartmentRow {
  department:     string;
  totalTeachers:  number;
  totalCourses:   number;
  avgPassRate:    number | null;
  avgAttendance:  number | null;
  atRiskStudents: number;
  tpi:            number | null;
}

export interface PrincipalSummary {
  totalDepartments: number;
  totalCourses:     number;
  totalStudents:    number;
  totalAtRisk:      number;
  avgPassRate:      number | null;
  avgAttendance:    number | null;
  avgTpi:           number | null;
}

export interface PrincipalAnalytics {
  principal:   { id: string; name: string | null };
  summary:     PrincipalSummary;
  departments: DepartmentRow[];   // sorted by avg TPI desc
  thresholds:  Thresholds;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

const getAuthHeaders = async (): Promise<Record<string, string> | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}` };
};

const fetchJSON = async <T>(path: string): Promise<T | null> => {
  const headers = await getAuthHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(`${BASE}${path}`, { headers });
    if (!res.ok) {
      console.error(`[hierAnalytics] ${path} → ${res.status}`);
      return null;
    }
    return res.json() as Promise<T>;
  } catch (err) {
    console.error(`[hierAnalytics] fetch error ${path}:`, err);
    return null;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Level 1 — fetch student's own analytics.
 * Call with no argument for self; pass studentId for drill-down.
 */
export const fetchStudentAnalytics = (studentId?: string): Promise<StudentAnalytics | null> =>
  fetchJSON<StudentAnalytics>(
    studentId ? `/api/hier-analytics/student/${studentId}` : '/api/hier-analytics/student',
  );

/**
 * Level 2 — fetch teacher's analytics.
 * Call with no argument for self; pass teacherId for HOD/principal drill-down.
 */
export const fetchTeacherAnalytics = (teacherId?: string): Promise<TeacherAnalytics | null> =>
  fetchJSON<TeacherAnalytics>(
    teacherId ? `/api/hier-analytics/teacher/${teacherId}` : '/api/hier-analytics/teacher',
  );

/**
 * Level 3 — HOD gets their department's analytics.
 * Department is read from the HOD's own profile server-side — nothing to pass.
 */
export const fetchHodAnalytics = (): Promise<HodAnalytics | null> =>
  fetchJSON<HodAnalytics>('/api/hier-analytics/hod');

/**
 * Level 4 — Principal gets institution-wide analytics.
 * institution_id is read from the principal's profile server-side.
 */
export const fetchPrincipalAnalytics = (): Promise<PrincipalAnalytics | null> =>
  fetchJSON<PrincipalAnalytics>('/api/hier-analytics/principal');
