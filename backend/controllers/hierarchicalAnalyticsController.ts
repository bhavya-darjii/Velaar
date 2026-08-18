import { Request, Response } from 'express';
import { adminSupabase } from '../supabaseAdmin.js';

// ─── Thresholds (KJ Somaiya defaults — configurable per-institution later) ───
const THRESHOLDS = {
  END_SEM_PASS:  60,   // out of 100
  TT_COMBINED_PASS: 16, // out of 40 (combined TT1 + TT2)
  ATTENDANCE:    75,   // % below which student is flagged at-risk
  TPI_PASS_WT:   0.60, // weight of pass rate in Teacher Performance Index
  TPI_ATT_WT:    0.40, // weight of attendance in Teacher Performance Index
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  name: string;
  subject_name: string | null;
  code: string | null;
  teacher_id: string;
  institution_id: string;
  semester: string | null;
  department: string | null;
  tt1_marks: Record<string, Record<string, string>> | null;
  tt2_marks: Record<string, Record<string, string>> | null;
  ese_marks:  Record<string, Record<string, string>> | null;
  exam_patterns: {
    tt1?: { headerConfig?: { maxMarks?: number }; pattern?: any[] };
    tt2?: { headerConfig?: { maxMarks?: number }; pattern?: any[] };
    ese?: { headerConfig?: { maxMarks?: number }; pattern?: any[] };
  } | null;
}

interface AttendanceSession { id: string; course_id: string; }
interface AttendanceLog { student_id: string; course_id: string; }
interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  user_type?: string;
  department?: string | null;
  institution_id: string | null;
  semester?: string | null;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Extract a student's effective total from a marks JSONB column,
 * applying best-of-N logic derived from the course's exam_patterns.
 *
 * For each parent question Q:
 *   attemptsAllowed = floor(q.marks / maxSubMarks)
 * Take the top `attemptsAllowed` sub-question scores and sum them.
 * Falls back to a plain sum if no pattern is available.
 */
const extractRawScore = (
  marksMap: Record<string, Record<string, string>> | null,
  studentId: string,
  pattern?: Course['exam_patterns'],
  examKey?: 'tt1' | 'tt2' | 'ese',
): number | null => {
  if (!marksMap) return null;
  const sm = marksMap[studentId];
  if (!sm || typeof sm !== 'object') return null;

  // Try best-of logic if pattern is available for this exam key
  const qs = examKey ? pattern?.[examKey]?.pattern : null;
  if (qs && Array.isArray(qs)) {
    let total = 0;
    let hasAny = false;
    for (const q of qs) {
      const maxSubMarks = Math.max(...q.subs.map((s: any) => Number(s.marks) || 0), 1);
      const n = Math.max(1, Math.floor(Number(q.marks) / maxSubMarks));
      const scores = q.subs
        .map((s: any) => {
          const key = `q${q.id}${s.id}`;
          const val = sm[key];
          if (val === undefined || val === '') return null;
          const p = parseFloat(String(val));
          return isNaN(p) ? null : p;
        })
        .filter((v: number | null) => v !== null) as number[];
      if (scores.length > 0) {
        hasAny = true;
        const best = scores.slice().sort((a, b) => b - a).slice(0, n);
        total += best.reduce((s, v) => s + v, 0);
      }
    }
    return hasAny ? total : null;
  }

  // Fallback: plain sum of all values
  const total = Object.values(sm).reduce((s, v) => s + (parseFloat(String(v)) || 0), 0);
  return total;
};

const maxMarks = (course: Course, key: 'tt1' | 'tt2' | 'ese'): number => {
  return course.exam_patterns?.[key]?.headerConfig?.maxMarks
    ?? (key === 'ese' ? 100 : 20);
};

const normalise = (raw: number, actualMax: number, targetScale: number): number =>
  Math.round((raw / actualMax) * targetScale);

interface ExamResult {
  score: number;
  outOf: number;
  pass:  boolean | null;
  hasData: true;
}
type MaybeExam = ExamResult | { hasData: false };

const examResult = (
  raw: number | null, actualMax: number, targetScale: number, passThreshold: number | null,
): MaybeExam => {
  if (raw === null) return { hasData: false };
  const score = normalise(raw, actualMax, targetScale);
  return { score, outOf: targetScale, pass: passThreshold !== null ? score >= passThreshold : null, hasData: true };
};

// ─── LEVEL 1 — Student (own data or parent/teacher drill-down) ───────────────

export const getStudentAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) { res.status(500).json({ error: 'DB unavailable' }); return; }

  const studentId = (req.params.studentId ?? req.user?.id) as string | undefined;
  if (!studentId) { res.status(400).json({ error: 'studentId required' }); return; }

  try {
    const { data: student, error: sErr } = await adminSupabase
      .from('users')
      .select('id, full_name, email, institution_id, semester, department')
      .eq('id', studentId)
      .single();
    if (sErr || !student) { res.status(404).json({ error: 'Student not found' }); return; }

    const { data: courses } = await adminSupabase
      .from('courses')
      .select('id, name, subject_name, code, teacher_id, institution_id, semester, department, tt1_marks, tt2_marks, ese_marks, exam_patterns')
      .eq('institution_id', student.institution_id);

    const allCourses = (courses ?? []).filter((c: any) => !c.semester || String(c.semester) === String(student.semester)) as Course[];
    const courseIds  = allCourses.map(c => c.id);

    const [{ data: sessions }, { data: logs }] = await Promise.all([
      courseIds.length
        ? adminSupabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds)
        : { data: [] },
      courseIds.length
        ? adminSupabase.from('attendance_logs').select('student_id, course_id')
            .eq('student_id', studentId).in('course_id', courseIds)
        : { data: [] },
    ]);

    const sessByCourse: Record<string, number> = {};
    (sessions as AttendanceSession[] ?? []).forEach(s => {
      sessByCourse[s.course_id] = (sessByCourse[s.course_id] || 0) + 1;
    });
    const logsByCourse: Record<string, number> = {};
    (logs as AttendanceLog[] ?? []).forEach(l => {
      logsByCourse[l.course_id] = (logsByCourse[l.course_id] || 0) + 1;
    });

    const courseMetrics = allCourses.map(course => {
      const totalSess = sessByCourse[course.id] || 0;
      const attended  = logsByCourse[course.id] || 0;
      const attPct    = totalSess > 0 ? Math.round((attended / totalSess) * 100) : 100;

      const tt1 = examResult(extractRawScore(course.tt1_marks, studentId, course.exam_patterns, 'tt1'), maxMarks(course, 'tt1'), 20,  null);
      const tt2 = examResult(extractRawScore(course.tt2_marks, studentId, course.exam_patterns, 'tt2'), maxMarks(course, 'tt2'), 20,  null);
      const ese = examResult(extractRawScore(course.ese_marks,  studentId, course.exam_patterns, 'ese'), maxMarks(course, 'ese'), 100, THRESHOLDS.END_SEM_PASS);

      let ttCombinedPass = true;
      if (tt1.hasData && tt2.hasData) {
        ttCombinedPass = (tt1.score + tt2.score) >= THRESHOLDS.TT_COMBINED_PASS;
      }

      const attAtRisk = attPct < THRESHOLDS.ATTENDANCE;
      const atRisk    = attAtRisk
        || !ttCombinedPass
        || (ese.hasData && !(ese as ExamResult).pass);

      return {
        courseId:   course.id,
        courseName: course.subject_name ?? course.name,
        code:       course.code,
        semester:   course.semester,
        attendance: { attended, total: totalSess, pct: attPct, atRisk: attAtRisk },
        tt1: tt1.hasData ? tt1 : null,
        tt2: tt2.hasData ? tt2 : null,
        ese: ese.hasData ? ese : null,
        atRisk,
      };
    });

    const totalSess     = Object.values(sessByCourse).reduce((s, v) => s + v, 0);
    const totalAttended = Object.values(logsByCourse).reduce((s, v) => s + v, 0);
    const overallAttPct = totalSess > 0 ? Math.round((totalAttended / totalSess) * 100) : 100;

    res.status(200).json({
      student:         { id: student.id, name: student.full_name, email: student.email },
      overallAttendance: { attended: totalAttended, total: totalSess, pct: overallAttPct, atRisk: overallAttPct < THRESHOLDS.ATTENDANCE },
      courses:         courseMetrics,
      atRiskCourses:   courseMetrics.filter(m => m.atRisk).length,
      thresholds: {
        tt_combined: THRESHOLDS.TT_COMBINED_PASS,
        ese:         THRESHOLDS.END_SEM_PASS,
        attendance:  THRESHOLDS.ATTENDANCE,
      },
    });
  } catch (err) {
    console.error('[hierarchicalAnalytics] getStudentAnalytics:', err);
    res.status(500).json({ error: 'Failed to compute student analytics' });
  }
};

// ─── LEVEL 2 — Teacher (per course they teach + per-student drill-down) ──────

export const getTeacherAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) { res.status(500).json({ error: 'DB unavailable' }); return; }

  const teacherId = (req.params.teacherId ?? req.user?.id) as string | undefined;
  if (!teacherId) { res.status(400).json({ error: 'teacherId required' }); return; }

  try {
    const { data: courses } = await adminSupabase
      .from('courses')
      .select('id, name, subject_name, code, teacher_id, institution_id, semester, department, tt1_marks, tt2_marks, ese_marks, exam_patterns')
      .eq('teacher_id', teacherId);

    const allCourses = (courses ?? []) as Course[];
    if (allCourses.length === 0) {
      res.status(200).json({ teacherId, summary: null, courses: [], thresholds: THRESHOLDS });
      return;
    }

    const combos = [...new Set(allCourses.map(c => `|`))];
    const studentRows = (await Promise.all(combos.map(combo => {
      const [inst, sem] = combo.split('|');
      let q = adminSupabase!.from('users')
        .select('id, full_name, email, institution_id, semester')
        .eq('user_type', 'student').eq('institution_id', inst);
      if (sem) {
        q = q.eq('semester', sem);
      }
      return q;
    }))).flatMap(r => (r.data ?? []) as UserRow[]);
    const studentMap = new Map(studentRows.map(s => [s.id, s]));
    const allStudents = [...studentMap.values()];

    const courseIds = allCourses.map(c => c.id);
    const [{ data: sessions }, { data: logs }] = await Promise.all([
      adminSupabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds),
      adminSupabase.from('attendance_logs').select('student_id, course_id').in('course_id', courseIds),
    ]);

    const sessByCourse: Record<string, number> = {};
    (sessions as AttendanceSession[] ?? []).forEach(s => {
      sessByCourse[s.course_id] = (sessByCourse[s.course_id] || 0) + 1;
    });
    const logsBySC: Record<string, Record<string, number>> = {};
    (logs as AttendanceLog[] ?? []).forEach(l => {
      if (!logsBySC[l.course_id]) logsBySC[l.course_id] = {};
      logsBySC[l.course_id][l.student_id] = (logsBySC[l.course_id][l.student_id] || 0) + 1;
    });

    const courseAnalytics = allCourses.map(course => {
      const totalSess = sessByCourse[course.id] || 0;
      const courseLogs = logsBySC[course.id] || {};
      const tt1Max = maxMarks(course, 'tt1');
      const tt2Max = maxMarks(course, 'tt2');
      const eseMax = maxMarks(course, 'ese');

      const relevant = allStudents.filter(
        s => s.institution_id === course.institution_id && (!course.semester || String(s.semester) === String(course.semester))
      );

      let ttCombinedPass = 0, ttCombinedTot = 0, ttCombinedScore = 0;
      let tt1ScoreSum = 0, tt1Tot = 0;
      let tt2ScoreSum = 0, tt2Tot = 0;
      let esePass = 0, eseTot = 0, eseScoreSum = 0;
      let attAtRisk = 0, atRisk = 0;

      const studentBreakdown = relevant.map(s => {
        const attended = courseLogs[s.id] || 0;
        const attPct   = totalSess > 0 ? Math.round((attended / totalSess) * 100) : 100;
        const tt1      = examResult(extractRawScore(course.tt1_marks, s.id, course.exam_patterns, 'tt1'), tt1Max, 20,  null);
        const tt2      = examResult(extractRawScore(course.tt2_marks, s.id, course.exam_patterns, 'tt2'), tt2Max, 20,  null);
        const ese      = examResult(extractRawScore(course.ese_marks,  s.id, course.exam_patterns, 'ese'), eseMax, 100, THRESHOLDS.END_SEM_PASS);

        if (tt1.hasData) { tt1Tot++; tt1ScoreSum += tt1.score; }
        if (tt2.hasData) { tt2Tot++; tt2ScoreSum += tt2.score; }
        
        let sTtCombinedPass = true;
        if (tt1.hasData && tt2.hasData) {
          ttCombinedTot++;
          const combined = tt1.score + tt2.score;
          ttCombinedScore += combined;
          sTtCombinedPass = combined >= THRESHOLDS.TT_COMBINED_PASS;
          if (sTtCombinedPass) ttCombinedPass++;
        }

        if (ese.hasData) { eseTot++; eseScoreSum += ese.score; if ((ese as ExamResult).pass) esePass++; }

        const isAttAtRisk = attPct < THRESHOLDS.ATTENDANCE;
        const isAtRisk    = isAttAtRisk
          || !sTtCombinedPass
          || (ese.hasData && !(ese as ExamResult).pass);

        if (isAttAtRisk) attAtRisk++;
        if (isAtRisk)    atRisk++;

        return {
          id:   s.id,
          name: s.full_name ?? s.email ?? 'Unknown',
          attendance: { attended, total: totalSess, pct: attPct, atRisk: isAttAtRisk },
          tt1: tt1.hasData ? tt1 : null,
          tt2: tt2.hasData ? tt2 : null,
          ese: ese.hasData ? ese : null,
          atRisk: isAtRisk,
        };
      });

      const tt1Avg = tt1Tot > 0 ? Math.round(tt1ScoreSum / tt1Tot) : null;
      const tt2Avg = tt2Tot > 0 ? Math.round(tt2ScoreSum / tt2Tot) : null;
      const eseAvg = eseTot > 0 ? Math.round(eseScoreSum / eseTot) : null;
      const ttCombinedAvg = ttCombinedTot > 0 ? Math.round(ttCombinedScore / ttCombinedTot) : null;

      const ttCombinedRate = ttCombinedTot > 0 ? Math.round((ttCombinedPass / ttCombinedTot) * 100) : null;
      const eseRate = eseTot > 0 ? Math.round((esePass / eseTot) * 100) : null;

      const totalLogs  = Object.values(courseLogs).reduce((s, v) => s + v, 0);
      const avgAtt     = relevant.length > 0 && totalSess > 0
        ? Math.round((totalLogs / (relevant.length * totalSess)) * 100)
        : null;

      const passRates  = [ttCombinedRate, eseRate].filter(v => v !== null) as number[];
      const avgPassRate = passRates.length > 0 ? Math.round(passRates.reduce((s, v) => s + v, 0) / passRates.length) : null;
      const tpi = avgPassRate !== null && avgAtt !== null
        ? Math.round(avgPassRate * THRESHOLDS.TPI_PASS_WT + avgAtt * THRESHOLDS.TPI_ATT_WT)
        : null;

      return {
        courseId:      course.id,
        courseName:    course.subject_name ?? course.name,
        code:          course.code,
        semester:      course.semester,
        totalStudents: relevant.length,
        totalSessions: totalSess,
        avgAttendance: avgAtt,
        attAtRiskCount: attAtRisk,
        tt1: { passRate: null, avgScore: tt1Avg, passCount: 0, total: tt1Tot },
        tt2: { passRate: null, avgScore: tt2Avg, passCount: 0, total: tt2Tot },
        ttCombined: { passRate: ttCombinedRate, avgScore: ttCombinedAvg, passCount: ttCombinedPass, total: ttCombinedTot },
        ese: { passRate: eseRate, avgScore: eseAvg, passCount: esePass, total: eseTot },
        atRiskCount:   atRisk,
        tpi,
        students: studentBreakdown,
      };
    });

    const allTpis      = courseAnalytics.map(c => c.tpi).filter(v => v !== null) as number[];
    const allPassRates = courseAnalytics.map(c => {
      const r = [c.ttCombined?.passRate, c.ese.passRate].filter(v => v !== null && v !== undefined) as number[];
      return r.length > 0 ? r.reduce((s, v) => s + v, 0) / r.length : null;
    }).filter(v => v !== null) as number[];
    const allAttRates  = courseAnalytics.map(c => c.avgAttendance).filter(v => v !== null) as number[];

    const summary = {
      totalCourses:        allCourses.length,
      totalStudents:       allStudents.length,
      avgPassRate:         allPassRates.length > 0 ? Math.round(allPassRates.reduce((s, v) => s + v, 0) / allPassRates.length) : null,
      avgAttendance:       allAttRates.length  > 0 ? Math.round(allAttRates.reduce((s, v) => s + v, 0) / allAttRates.length)  : null,
      totalAtRiskStudents: courseAnalytics.reduce((s, c) => s + c.atRiskCount, 0),
      avgTpi:              allTpis.length > 0 ? Math.round(allTpis.reduce((s, v) => s + v, 0) / allTpis.length) : null,
    };

    res.status(200).json({ teacherId, summary, courses: courseAnalytics, thresholds: THRESHOLDS });
  } catch (err) {
    console.error('[hierarchicalAnalytics] getTeacherAnalytics:', err);
    res.status(500).json({ error: 'Failed to compute teacher analytics' });
  }
};

// ─── Shared: aggregate course-level stats into a teacher-level row ─────────────

const aggregateCourses = (
  teacherCourses: Course[],
  students: UserRow[],
  sessByCourse: Record<string, number>,
  logsBySC: Record<string, Record<string, number>>,
) => {
  const passRatesBuf: number[] = [];
  const attRatesBuf:  number[] = [];
  const tpisBuf:      number[] = [];
  let   totalAtRisk = 0;

  teacherCourses.forEach(course => {
    const totalSess  = sessByCourse[course.id] || 0;
    const courseLogs = logsBySC[course.id] || {};
    const tt1Max = maxMarks(course, 'tt1');
    const tt2Max = maxMarks(course, 'tt2');
    const eseMax = maxMarks(course, 'ese');

    const relevant = students.filter(
      s => s.institution_id === course.institution_id && (!course.semester || String(s.semester) === String(course.semester))
    );

    let ttCombinedPass = 0, ttCombinedTot = 0, esePass = 0, eseTot = 0, atRisk = 0;
    relevant.forEach(s => {
      const attended = courseLogs[s.id] || 0;
      const attPct   = totalSess > 0 ? Math.round((attended / totalSess) * 100) : 100;
      const tt1      = examResult(extractRawScore(course.tt1_marks, s.id, course.exam_patterns, 'tt1'), tt1Max, 20,  null);
      const tt2      = examResult(extractRawScore(course.tt2_marks, s.id, course.exam_patterns, 'tt2'), tt2Max, 20,  null);
      const ese      = examResult(extractRawScore(course.ese_marks,  s.id, course.exam_patterns, 'ese'), eseMax, 100, THRESHOLDS.END_SEM_PASS);

      let sTtCombinedPass = true;
      if (tt1.hasData && tt2.hasData) {
        ttCombinedTot++;
        sTtCombinedPass = (tt1.score + tt2.score) >= THRESHOLDS.TT_COMBINED_PASS;
        if (sTtCombinedPass) ttCombinedPass++;
      }
      if (ese.hasData) { eseTot++; if ((ese as ExamResult).pass) esePass++; }

      if (attPct < THRESHOLDS.ATTENDANCE
        || !sTtCombinedPass
        || (ese.hasData && !(ese as ExamResult).pass)) { atRisk++; }
    });

    const totalLogs   = Object.values(courseLogs).reduce((s, v) => s + v, 0);
    const avgAtt      = relevant.length > 0 && totalSess > 0
      ? Math.round((totalLogs / (relevant.length * totalSess)) * 100) : null;

    const rates       = [
      ttCombinedTot > 0 ? (ttCombinedPass / ttCombinedTot) * 100 : null,
      eseTot > 0 ? (esePass / eseTot) * 100 : null,
    ].filter(v => v !== null) as number[];
    const avgPassRate  = rates.length > 0 ? rates.reduce((s, v) => s + v, 0) / rates.length : null;

    if (avgPassRate !== null) passRatesBuf.push(avgPassRate);
    if (avgAtt !== null)      attRatesBuf.push(avgAtt);
    if (avgPassRate !== null && avgAtt !== null) {
      tpisBuf.push(avgPassRate * THRESHOLDS.TPI_PASS_WT + avgAtt * THRESHOLDS.TPI_ATT_WT);
    }
    totalAtRisk += atRisk;
  });

  const avgPassRate  = passRatesBuf.length > 0 ? Math.round(passRatesBuf.reduce((s, v) => s + v, 0) / passRatesBuf.length) : null;
  const avgAtt       = attRatesBuf.length  > 0 ? Math.round(attRatesBuf.reduce((s, v) => s + v, 0) / attRatesBuf.length)  : null;
  const tpi          = tpisBuf.length > 0
    ? Math.round(tpisBuf.reduce((s, v) => s + v, 0) / tpisBuf.length) : null;

  return { avgPassRate, avgAttendance: avgAtt, atRiskStudents: totalAtRisk, tpi };
};

// ─── LEVEL 3 — HOD ───────────────────────────────────────────────────────────

export const getHodAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) { res.status(500).json({ error: 'DB unavailable' }); return; }
  const hodId = req.user?.id;
  if (!hodId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const { data: hodUser } = await adminSupabase
      .from('users').select('id, full_name, department, institution_id').eq('id', hodId).single();
    if (!hodUser?.department) { res.status(400).json({ error: 'HOD department not set' }); return; }

    const { department, institution_id: institutionId } = hodUser as { department: string; institution_id: string; id: string; full_name: string | null };

    const { data: courses } = await adminSupabase
      .from('courses')
      .select('id, name, subject_name, code, teacher_id, institution_id, semester, department, tt1_marks, tt2_marks, ese_marks, exam_patterns')
      .eq('department', department).eq('institution_id', institutionId);

    const allCourses = (courses ?? []) as Course[];
    const teacherIds = [...new Set(allCourses.map(c => c.teacher_id).filter(Boolean))];
    const courseIds  = allCourses.map(c => c.id);

    const [{ data: teacherProfiles }, { data: allStudents }, { data: sessions }, { data: logs }] = await Promise.all([
      teacherIds.length
        ? adminSupabase.from('users').select('id, full_name, email').in('id', teacherIds)
        : { data: [] },
      adminSupabase.from('users').select('id, institution_id, semester')
        .eq('user_type', 'student').eq('institution_id', institutionId),
      courseIds.length
        ? adminSupabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds)
        : { data: [] },
      courseIds.length
        ? adminSupabase.from('attendance_logs').select('student_id, course_id').in('course_id', courseIds)
        : { data: [] },
    ]);

    const teacherMap = new Map((teacherProfiles ?? []).map((t: unknown) => { const u = t as UserRow; return [u.id, u]; }));
    const students   = (allStudents ?? []) as UserRow[];

    const sessByCourse: Record<string, number> = {};
    (sessions as AttendanceSession[] ?? []).forEach(s => {
      sessByCourse[s.course_id] = (sessByCourse[s.course_id] || 0) + 1;
    });
    const logsBySC: Record<string, Record<string, number>> = {};
    (logs as AttendanceLog[] ?? []).forEach(l => {
      if (!logsBySC[l.course_id]) logsBySC[l.course_id] = {};
      logsBySC[l.course_id][l.student_id] = (logsBySC[l.course_id][l.student_id] || 0) + 1;
    });

    const teacherRows = teacherIds.map(tid => {
      const teacherCourses = allCourses.filter(c => c.teacher_id === tid);
      const agg = aggregateCourses(teacherCourses, students, sessByCourse, logsBySC);
      const t   = teacherMap.get(tid) as UserRow | undefined;
      return {
        teacherId:    tid,
        teacherName:  t?.full_name ?? 'Unknown',
        teacherEmail: t?.email ?? '',
        totalCourses: teacherCourses.length,
        ...agg,
      };
    }).sort((a, b) => (b.tpi ?? 0) - (a.tpi ?? 0));

    const deptTpis      = teacherRows.map(t => t.tpi).filter(v => v !== null) as number[];
    const deptPassRates = teacherRows.map(t => t.avgPassRate).filter(v => v !== null) as number[];
    const deptAttRates  = teacherRows.map(t => t.avgAttendance).filter(v => v !== null) as number[];

    const summary = {
      department,
      totalTeachers:  teacherIds.length,
      totalCourses:   allCourses.length,
      totalAtRisk:    teacherRows.reduce((s, t) => s + t.atRiskStudents, 0),
      avgPassRate:    deptPassRates.length > 0 ? Math.round(deptPassRates.reduce((s, v) => s + v, 0) / deptPassRates.length) : null,
      avgAttendance:  deptAttRates.length  > 0 ? Math.round(deptAttRates.reduce((s, v) => s + v, 0) / deptAttRates.length)  : null,
      avgTpi:         deptTpis.length      > 0 ? Math.round(deptTpis.reduce((s, v) => s + v, 0) / deptTpis.length)          : null,
    };

    res.status(200).json({
      hod:        { id: hodId, name: hodUser.full_name, department },
      summary,
      teachers:   teacherRows,
      thresholds: THRESHOLDS,
    });
  } catch (err) {
    console.error('[hierarchicalAnalytics] getHodAnalytics:', err);
    res.status(500).json({ error: 'Failed to compute HOD analytics' });
  }
};

// ─── LEVEL 4 — Principal ─────────────────────────────────────────────────────

export const getPrincipalAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) { res.status(500).json({ error: 'DB unavailable' }); return; }
  const principalId = req.user?.id;
  if (!principalId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const { data: principal } = await adminSupabase
      .from('users').select('id, full_name, institution_id').eq('id', principalId).single();
    if (!(principal as UserRow | null)?.institution_id) {
      res.status(400).json({ error: 'Principal institution_id not set' }); return;
    }

    const institutionId = (principal as UserRow).institution_id!;

    const [{ data: courses }, { data: allStudents }] = await Promise.all([
      adminSupabase.from('courses')
        .select('id, name, subject_name, teacher_id, institution_id, semester, department, tt1_marks, tt2_marks, ese_marks, exam_patterns')
        .eq('institution_id', institutionId),
      adminSupabase.from('users').select('id, institution_id, semester, department')
        .eq('user_type', 'student').eq('institution_id', institutionId),
    ]);

    const allCourses  = (courses ?? []) as Course[];
    const students    = (allStudents ?? []) as UserRow[];
    const courseIds   = allCourses.map(c => c.id);
    const departments = [...new Set(allCourses.map(c => c.department).filter(Boolean))] as string[];

    const [{ data: sessions }, { data: logs }] = await Promise.all([
      courseIds.length
        ? adminSupabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds)
        : { data: [] },
      courseIds.length
        ? adminSupabase.from('attendance_logs').select('student_id, course_id').in('course_id', courseIds)
        : { data: [] },
    ]);

    const sessByCourse: Record<string, number> = {};
    (sessions as AttendanceSession[] ?? []).forEach(s => {
      sessByCourse[s.course_id] = (sessByCourse[s.course_id] || 0) + 1;
    });
    const logsBySC: Record<string, Record<string, number>> = {};
    (logs as AttendanceLog[] ?? []).forEach(l => {
      if (!logsBySC[l.course_id]) logsBySC[l.course_id] = {};
      logsBySC[l.course_id][l.student_id] = (logsBySC[l.course_id][l.student_id] || 0) + 1;
    });

    const departmentRows = departments.map(dept => {
      const deptCourses  = allCourses.filter(c => c.department === dept);
      const deptTeachers = [...new Set(deptCourses.map(c => c.teacher_id).filter(Boolean))];
      const agg = aggregateCourses(deptCourses, students, sessByCourse, logsBySC);

      return {
        department:    dept,
        totalTeachers: deptTeachers.length,
        totalCourses:  deptCourses.length,
        ...agg,
      };
    }).sort((a, b) => (b.tpi ?? 0) - (a.tpi ?? 0));

    const instPassRates = departmentRows.map(d => d.avgPassRate).filter(v => v !== null) as number[];
    const instAttRates  = departmentRows.map(d => d.avgAttendance).filter(v => v !== null) as number[];
    const instTpis      = departmentRows.map(d => d.tpi).filter(v => v !== null) as number[];

    const summary = {
      totalDepartments: departments.length,
      totalCourses:     allCourses.length,
      totalStudents:    students.length,
      totalAtRisk:      departmentRows.reduce((s, d) => s + d.atRiskStudents, 0),
      avgPassRate:      instPassRates.length > 0 ? Math.round(instPassRates.reduce((s, v) => s + v, 0) / instPassRates.length) : null,
      avgAttendance:    instAttRates.length  > 0 ? Math.round(instAttRates.reduce((s, v) => s + v, 0) / instAttRates.length)  : null,
      avgTpi:           instTpis.length      > 0 ? Math.round(instTpis.reduce((s, v) => s + v, 0) / instTpis.length)          : null,
    };

    res.status(200).json({
      principal:   { id: principalId, name: (principal as UserRow).full_name },
      summary,
      departments: departmentRows,
      thresholds:  THRESHOLDS,
    });
  } catch (err) {
    console.error('[hierarchicalAnalytics] getPrincipalAnalytics:', err);
    res.status(500).json({ error: 'Failed to compute principal analytics' });
  }
};
