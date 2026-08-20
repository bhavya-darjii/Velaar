import { Request, Response } from 'express';
import { adminSupabase } from '../supabaseAdmin.js';

export interface Course {
  id: string;
  name: string;
  subject_name: string | null;
  code: string | null;
  teacher_id: string;
  institution_id: string;
  semester: string | null;
  department: string | null;
  tt1_marks: any;
  tt2_marks: any;
  ese_marks: any;
  tt1_effective?: Record<string, number>;
  tt2_effective?: Record<string, number>;
  ese_effective?: Record<string, number>;
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

// ─── Threshold Configuration ──────────────────────────────────────────────────
const getThresholds = async (institutionId: string | null) => {
  const defaultThresholds = {
    TT_COMBINED_PASS_PCT: 40,
    END_SEM_PASS_PCT: 40,
    ATTENDANCE: 75,
    TPI_PASS_WT: 0.6,
    TPI_ATT_WT: 0.4,
  };

  if (!institutionId || !adminSupabase) return defaultThresholds;

  try {
    const { data, error } = await adminSupabase
      .from('institutions')
      .select('config')
      .eq('id', institutionId)
      .single();

    if (!error && data?.config?.thresholds) {
      return { ...defaultThresholds, ...data.config.thresholds };
    }
  } catch (err) {}

  return defaultThresholds;
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const extractEffective = (effMap: any, studentId: string): number | null => {
  if (!effMap) return null;
  const val = effMap[studentId];
  return (val !== undefined && val !== null) ? Number(val) : null;
};

const maxMarks = (course: Course, key: 'tt1' | 'tt2' | 'ese'): number => {
  const m = course.exam_patterns?.[key]?.headerConfig?.maxMarks;
  return m !== undefined && m !== null ? Number(m) : (key === 'ese' ? 60 : 20);
};

interface ExamResult {
  score: number;
  outOf: number;
  pass:  boolean | null;
  color: string;
  hasData: true;
}
type MaybeExam = ExamResult | { hasData: false };

const examResult = (
  raw: number | null, actualMax: number, passPct: number | null,
): MaybeExam => {
  if (raw === null || isNaN(raw)) return { hasData: false };
  const passThreshold = passPct !== null ? (actualMax * passPct) / 100 : null;
  const pass = passThreshold !== null ? raw >= passThreshold : null;
  return { 
    score: raw, 
    outOf: actualMax, 
    pass, 
    color: pass === false ? '#ef4444' : '#22c55e',
    hasData: true 
  };
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

    const thresholds = await getThresholds(student.institution_id);

    const { data: courses } = await adminSupabase
      .from('courses')
      .select('id, name, subject_name, code, teacher_id, institution_id, semester, department, tt1_effective, tt2_effective, ese_effective, exam_patterns')
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

      const tt1 = examResult(extractEffective(course.tt1_effective, studentId), maxMarks(course, 'tt1'), null);
      const tt2 = examResult(extractEffective(course.tt2_effective, studentId), maxMarks(course, 'tt2'), null);
      const ese = examResult(extractEffective(course.ese_effective, studentId), maxMarks(course, 'ese'), thresholds.END_SEM_PASS_PCT);

      let ttCombinedPass = true;
      let ttCombined: MaybeExam = { hasData: false };
      
      if (tt1.hasData && tt2.hasData) {
        const cScore = tt1.score + tt2.score;
        const cMax = tt1.outOf + tt2.outOf;
        ttCombined = examResult(cScore, cMax, thresholds.TT_COMBINED_PASS_PCT);
        ttCombinedPass = (ttCombined as ExamResult).pass ?? true;
      }

      const attAtRisk = attPct < thresholds.ATTENDANCE;
      const atRisk    = attAtRisk
        || !ttCombinedPass
        || (ese.hasData && !(ese as ExamResult).pass);

      let totalAchieved = 0, totalPossible = 0;
      if (ese.hasData) { totalAchieved += ese.score; totalPossible += ese.outOf; }
      if (ttCombined.hasData) { totalAchieved += ttCombined.score; totalPossible += ttCombined.outOf; }
      else {
        if (tt1.hasData) { totalAchieved += tt1.score; totalPossible += tt1.outOf; }
        if (tt2.hasData) { totalAchieved += tt2.score; totalPossible += tt2.outOf; }
      }
      const courseAvg = totalPossible > 0 ? Math.round((totalAchieved / totalPossible) * 100) : null;

      return {
        courseId:   course.id,
        courseName: course.subject_name ?? course.name,
        code:       course.code,
        semester:   course.semester,
        courseAvg,
        attendance: { attended, total: totalSess, pct: attPct, atRisk: attAtRisk },
        tt1: tt1.hasData ? tt1 : null,
        tt2: tt2.hasData ? tt2 : null,
        ttCombined: ttCombined.hasData ? ttCombined : null,
        ese: ese.hasData ? ese : null,
        atRisk,
      };
    });

    const totalSess     = Object.values(sessByCourse).reduce((s, v) => s + v, 0);
    const totalAttended = Object.values(logsByCourse).reduce((s, v) => s + v, 0);
    const overallAttPct = totalSess > 0 ? Math.round((totalAttended / totalSess) * 100) : 100;

    res.status(200).json({
      student:         { id: student.id, name: student.full_name, email: student.email },
      overallAttendance: { attended: totalAttended, total: totalSess, pct: overallAttPct, atRisk: overallAttPct < thresholds.ATTENDANCE },
      courses:         courseMetrics,
      atRiskCourses:   courseMetrics.filter(m => m.atRisk).length,
      thresholds,
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
      .select('id, name, subject_name, code, teacher_id, institution_id, semester, department, tt1_effective, tt2_effective, ese_effective, exam_patterns')
      .eq('teacher_id', teacherId);

    const allCourses = (courses ?? []) as Course[];
    
    // We assume the teacher belongs to one institution for the overall thresholds for now
    const instId = allCourses[0]?.institution_id || null;
    const thresholds = await getThresholds(instId);

    if (allCourses.length === 0) {
      res.status(200).json({ teacherId, summary: null, courses: [], thresholds });
      return;
    }

    const combos = [...new Set(allCourses.map(c => `${c.institution_id}|${c.semester || ''}`))];
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
        const tt1      = examResult(extractEffective(course.tt1_effective, s.id), tt1Max, null);
        const tt2      = examResult(extractEffective(course.tt2_effective, s.id), tt2Max, null);
        const ese      = examResult(extractEffective(course.ese_effective, s.id), eseMax, thresholds.END_SEM_PASS_PCT);

        if (tt1.hasData) { tt1Tot++; tt1ScoreSum += tt1.score; }
        if (tt2.hasData) { tt2Tot++; tt2ScoreSum += tt2.score; }
        
        let sTtCombinedPass = true;
        let ttCombined: MaybeExam = { hasData: false };
        if (tt1.hasData && tt2.hasData) {
          ttCombinedTot++;
          const cScore = tt1.score + tt2.score;
          const cMax = tt1.outOf + tt2.outOf;
          ttCombinedScore += cScore;
          ttCombined = examResult(cScore, cMax, thresholds.TT_COMBINED_PASS_PCT);
          sTtCombinedPass = (ttCombined as ExamResult).pass ?? true;
          if (sTtCombinedPass) ttCombinedPass++;
        }

        if (ese.hasData) { eseTot++; eseScoreSum += ese.score; if ((ese as ExamResult).pass) esePass++; }

        const isAttAtRisk = attPct < thresholds.ATTENDANCE;
        const isAtRisk    = isAttAtRisk
          || !sTtCombinedPass
          || (ese.hasData && !(ese as ExamResult).pass);

        if (isAttAtRisk) attAtRisk++;
        if (isAtRisk)    atRisk++;

        let totalAchieved = 0, totalPossible = 0;
        if (ese.hasData) { totalAchieved += ese.score; totalPossible += ese.outOf; }
        if (ttCombined.hasData) { totalAchieved += ttCombined.score; totalPossible += ttCombined.outOf; }
        else {
          if (tt1.hasData) { totalAchieved += tt1.score; totalPossible += tt1.outOf; }
          if (tt2.hasData) { totalAchieved += tt2.score; totalPossible += tt2.outOf; }
        }
        const courseAvg = totalPossible > 0 ? Math.round((totalAchieved / totalPossible) * 100) : null;

        return {
          id:   s.id,
          name: s.full_name ?? s.email ?? 'Unknown',
          courseAvg,
          attendance: { attended, total: totalSess, pct: attPct, atRisk: isAttAtRisk },
          tt1: tt1.hasData ? tt1 : null,
          tt2: tt2.hasData ? tt2 : null,
          ttCombined: ttCombined.hasData ? ttCombined : null,
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
        ? Math.round(avgPassRate * thresholds.TPI_PASS_WT + avgAtt * thresholds.TPI_ATT_WT)
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

    res.status(200).json({ teacherId, summary, courses: courseAnalytics, thresholds });
  } catch (err) {
    console.error('[hierarchicalAnalytics] getTeacherAnalytics:', err);
    res.status(500).json({ error: 'Failed to compute teacher analytics' });
  }
};

// ... hod and principal left untouched, but they use aggregateCourses which relies on old logic
// Wait, I need to update aggregateCourses too!

const aggregateCourses = (
  teacherCourses: Course[],
  students: UserRow[],
  sessByCourse: Record<string, number>,
  logsBySC: Record<string, Record<string, number>>,
  thresholds: Awaited<ReturnType<typeof getThresholds>>
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
      const tt1      = examResult(extractEffective(course.tt1_effective, s.id), tt1Max, null);
      const tt2      = examResult(extractEffective(course.tt2_effective, s.id), tt2Max, null);
      const ese      = examResult(extractEffective(course.ese_effective, s.id), eseMax, thresholds.END_SEM_PASS_PCT);

      let sTtCombinedPass = true;
      if (tt1.hasData && tt2.hasData) {
        ttCombinedTot++;
        const cScore = tt1.score + tt2.score;
        const cMax = tt1.outOf + tt2.outOf;
        const combined = examResult(cScore, cMax, thresholds.TT_COMBINED_PASS_PCT);
        sTtCombinedPass = (combined as ExamResult).pass ?? true;
        if (sTtCombinedPass) ttCombinedPass++;
      }

      if (ese.hasData) { eseTot++; if ((ese as ExamResult).pass) esePass++; }

      const isAttAtRisk = attPct < thresholds.ATTENDANCE;
      const isAtRisk    = isAttAtRisk
        || !sTtCombinedPass
        || (ese.hasData && !(ese as ExamResult).pass);

      if (isAtRisk) atRisk++;
    });

    totalAtRisk += atRisk;

    const ttCombinedRate = ttCombinedTot > 0 ? Math.round((ttCombinedPass / ttCombinedTot) * 100) : null;
    const eseRate = eseTot > 0 ? Math.round((esePass / eseTot) * 100) : null;
    const passRates = [ttCombinedRate, eseRate].filter(v => v !== null) as number[];
    if (passRates.length > 0) passRatesBuf.push(passRates.reduce((s, v) => s + v, 0) / passRates.length);

    const totalLogs = Object.values(courseLogs).reduce((s, v) => s + v, 0);
    const avgAtt = relevant.length > 0 && totalSess > 0 ? Math.round((totalLogs / (relevant.length * totalSess)) * 100) : null;
    if (avgAtt !== null) attRatesBuf.push(avgAtt);

    if (passRatesBuf.length > 0 && avgAtt !== null) {
      tpisBuf.push(Math.round(passRatesBuf[passRatesBuf.length - 1] * thresholds.TPI_PASS_WT + avgAtt * thresholds.TPI_ATT_WT));
    }
  });

  const avgPassRate   = passRatesBuf.length > 0 ? Math.round(passRatesBuf.reduce((s, v) => s + v, 0) / passRatesBuf.length) : null;
  const avgAttendance = attRatesBuf.length > 0 ? Math.round(attRatesBuf.reduce((s, v) => s + v, 0) / attRatesBuf.length) : null;
  const tpi           = tpisBuf.length > 0 ? Math.round(tpisBuf.reduce((s, v) => s + v, 0) / tpisBuf.length) : null;

  return { avgPassRate, avgAttendance, atRiskStudents: totalAtRisk, tpi };
};

export const getHodAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) { res.status(500).json({ error: 'DB unavailable' }); return; }
  const hodId = req.user?.id;
  if (!hodId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const { data: hod } = await adminSupabase.from('users').select('id, full_name, department, institution_id').eq('id', hodId).single();
    if (!hod || !hod.department) { res.status(404).json({ error: 'HOD or department not found' }); return; }
    
    const thresholds = await getThresholds(hod.institution_id);

    const { data: deptTeachers } = await adminSupabase.from('users').select('id, full_name, email').eq('department', hod.department).eq('institution_id', hod.institution_id).eq('user_type', 'teacher');
    const teacherIds = (deptTeachers ?? []).map(t => t.id);

    const { data: courses } = await adminSupabase.from('courses').select('id, name, subject_name, code, teacher_id, institution_id, semester, department, tt1_effective, tt2_effective, ese_effective, exam_patterns').in('teacher_id', teacherIds);
    const allCourses = (courses ?? []) as Course[];

    const combos = [...new Set(allCourses.map(c => `${c.institution_id}|${c.semester || ''}`))];
    const studentRows = (await Promise.all(combos.map(combo => {
      const [inst, sem] = combo.split('|');
      let q = adminSupabase!.from('users').select('id, institution_id, semester').eq('user_type', 'student').eq('institution_id', inst);
      if (sem) q = q.eq('semester', sem);
      return q;
    }))).flatMap(r => (r.data ?? []) as UserRow[]);
    const allStudents = [...new Map(studentRows.map(s => [s.id, s])).values()];

    const courseIds = allCourses.map(c => c.id);
    const [{ data: sessions }, { data: logs }] = await Promise.all([
      adminSupabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds),
      adminSupabase.from('attendance_logs').select('student_id, course_id').in('course_id', courseIds),
    ]);

    const sessByCourse: Record<string, number> = {};
    (sessions as AttendanceSession[] ?? []).forEach(s => { sessByCourse[s.course_id] = (sessByCourse[s.course_id] || 0) + 1; });
    const logsBySC: Record<string, Record<string, number>> = {};
    (logs as AttendanceLog[] ?? []).forEach(l => {
      if (!logsBySC[l.course_id]) logsBySC[l.course_id] = {};
      logsBySC[l.course_id][l.student_id] = (logsBySC[l.course_id][l.student_id] || 0) + 1;
    });

    const teacherAnalytics = (deptTeachers ?? []).map(t => {
      const tCourses = allCourses.filter(c => c.teacher_id === t.id);
      const agg = aggregateCourses(tCourses, allStudents, sessByCourse, logsBySC, thresholds);
      return { teacherId: t.id, teacherName: t.full_name ?? 'Unknown', teacherEmail: t.email ?? '', totalCourses: tCourses.length, ...agg };
    }).sort((a, b) => (b.tpi ?? 0) - (a.tpi ?? 0));

    const activeTpis = teacherAnalytics.map(t => t.tpi).filter(v => v !== null) as number[];
    const activePass = teacherAnalytics.map(t => t.avgPassRate).filter(v => v !== null) as number[];
    const activeAtt  = teacherAnalytics.map(t => t.avgAttendance).filter(v => v !== null) as number[];

    res.status(200).json({
      hod: { id: hod.id, name: hod.full_name, department: hod.department },
      summary: {
        department: hod.department,
        totalTeachers: deptTeachers?.length ?? 0,
        totalCourses: allCourses.length,
        totalAtRisk: teacherAnalytics.reduce((s, t) => s + t.atRiskStudents, 0),
        avgPassRate: activePass.length > 0 ? Math.round(activePass.reduce((s, v) => s + v, 0) / activePass.length) : null,
        avgAttendance: activeAtt.length > 0 ? Math.round(activeAtt.reduce((s, v) => s + v, 0) / activeAtt.length) : null,
        avgTpi: activeTpis.length > 0 ? Math.round(activeTpis.reduce((s, v) => s + v, 0) / activeTpis.length) : null,
      },
      teachers: teacherAnalytics,
      thresholds,
    });
  } catch (err) {
    console.error('[hierarchicalAnalytics] getHodAnalytics:', err);
    res.status(500).json({ error: 'Failed to compute HOD analytics' });
  }
};

export const getPrincipalAnalytics = async (req: Request, res: Response): Promise<void> => {
  if (!adminSupabase) { res.status(500).json({ error: 'DB unavailable' }); return; }
  const principalId = req.user?.id;
  if (!principalId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const { data: principal } = await adminSupabase.from('users').select('id, full_name, institution_id').eq('id', principalId).single();
    if (!principal || !principal.institution_id) { res.status(404).json({ error: 'Principal or institution not found' }); return; }

    const thresholds = await getThresholds(principal.institution_id);

    const { data: allUsers } = await adminSupabase.from('users').select('id, user_type, department, semester, institution_id').eq('institution_id', principal.institution_id);
    const teachers = (allUsers ?? []).filter(u => u.user_type === 'teacher');
    const students = (allUsers ?? []).filter(u => u.user_type === 'student') as UserRow[];

    const { data: courses } = await adminSupabase.from('courses').select('id, name, subject_name, code, teacher_id, institution_id, semester, department, tt1_effective, tt2_effective, ese_effective, exam_patterns').eq('institution_id', principal.institution_id);
    const allCourses = (courses ?? []) as Course[];
    const courseIds = allCourses.map(c => c.id);

    const [{ data: sessions }, { data: logs }] = await Promise.all([
      adminSupabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds),
      adminSupabase.from('attendance_logs').select('student_id, course_id').in('course_id', courseIds),
    ]);

    const sessByCourse: Record<string, number> = {};
    (sessions as AttendanceSession[] ?? []).forEach(s => { sessByCourse[s.course_id] = (sessByCourse[s.course_id] || 0) + 1; });
    const logsBySC: Record<string, Record<string, number>> = {};
    (logs as AttendanceLog[] ?? []).forEach(l => {
      if (!logsBySC[l.course_id]) logsBySC[l.course_id] = {};
      logsBySC[l.course_id][l.student_id] = (logsBySC[l.course_id][l.student_id] || 0) + 1;
    });

    const departments = [...new Set(teachers.map(t => t.department).filter(Boolean))] as string[];

    const deptAnalytics = departments.map(dept => {
      const deptTeachers = teachers.filter(t => t.department === dept);
      const dCourses = allCourses.filter(c => deptTeachers.some(t => t.id === c.teacher_id));
      const agg = aggregateCourses(dCourses, students, sessByCourse, logsBySC, thresholds);
      return { department: dept, totalTeachers: deptTeachers.length, totalCourses: dCourses.length, ...agg };
    }).sort((a, b) => (b.tpi ?? 0) - (a.tpi ?? 0));

    const activeTpis = deptAnalytics.map(d => d.tpi).filter(v => v !== null) as number[];
    const activePass = deptAnalytics.map(d => d.avgPassRate).filter(v => v !== null) as number[];
    const activeAtt  = deptAnalytics.map(d => d.avgAttendance).filter(v => v !== null) as number[];

    res.status(200).json({
      principal: { id: principal.id, name: principal.full_name },
      summary: {
        totalDepartments: departments.length,
        totalCourses: allCourses.length,
        totalStudents: students.length,
        totalAtRisk: deptAnalytics.reduce((s, d) => s + d.atRiskStudents, 0),
        avgPassRate: activePass.length > 0 ? Math.round(activePass.reduce((s, v) => s + v, 0) / activePass.length) : null,
        avgAttendance: activeAtt.length > 0 ? Math.round(activeAtt.reduce((s, v) => s + v, 0) / activeAtt.length) : null,
        avgTpi: activeTpis.length > 0 ? Math.round(activeTpis.reduce((s, v) => s + v, 0) / activeTpis.length) : null,
      },
      departments: deptAnalytics,
      thresholds,
    });
  } catch (err) {
    console.error('[hierarchicalAnalytics] getPrincipalAnalytics:', err);
    res.status(500).json({ error: 'Failed to compute principal analytics' });
  }
};
