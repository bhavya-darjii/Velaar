/* eslint-disable */
// @ts-nocheck
/**
 * dataService.js — Centralized Data Layer for Velaar
 *
 * One source of truth. Every role (Teacher, HOD, Principal, Parent, Student)
 * reads attendance, marks, and risk from these functions.
 * No component should ever duplicate this logic.
 *
 * Schema understood:
 *  users              — id, full_name, email, user_type, institution_id, semester, department
 *  courses            — id, teacher_id, institution_id, semester, department, name, subject_name,
 *                       roadmap (JSONB), total_lectures, exam_patterns (JSONB),
 *                       tt1_marks (JSONB), tt2_marks (JSONB), ese_marks (JSONB)
 *  attendance_sessions — id, course_id, teacher_id, qr_token, expires_at
 *  attendance_logs    — id, session_id, course_id, student_id, marked_at
 *  parent_student_relationship — id, parent_id, student_id, relationship
 */

import { supabase } from './supabase';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const getLectures = (roadmap) =>
  Array.isArray(roadmap) ? roadmap : Object.values(roadmap || {}).flat();

/**
 * Compute a risk score (0–100, higher = more at risk) from raw data.
 * Pure function — no network calls.
 */
export const computeRiskScore = ({ attendancePct, tt1Pct, tt2Pct, consecutiveAbsences = 0 }) => {
  const attScore  = Math.max(0, 100 - attendancePct);           // low attendance = high risk
  const markScore = Math.max(0, 100 - ((tt1Pct + tt2Pct) / 2)); // low marks = high risk
  const absScore  = Math.min(100, consecutiveAbsences * 12);    // 8+ consecutive = critical
  return Math.round(attScore * 0.45 + markScore * 0.40 + absScore * 0.15);
};

export const getRiskLevel = (score) => {
  if (score >= 65) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
};

// â”€â”€â”€ Attendance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Get attendance % for a single student across a list of course IDs.
 */
export const getStudentAttendance = async (studentId, courseIds) => {
  if (!courseIds || courseIds.length === 0) return { pct: 100, attended: 0, total: 0 };

  const [{ count: total }, { count: attended }] = await Promise.all([
    supabase.from('attendance_sessions').select('*', { count: 'exact', head: true }).in('course_id', courseIds),
    supabase.from('attendance_logs').select('*', { count: 'exact', head: true })
      .eq('student_id', studentId).in('course_id', courseIds),
  ]);

  const pct = total > 0 ? Math.round(((attended || 0) / total) * 100) : 100;
  return { pct, attended: attended || 0, total: total || 0 };
};

/**
 * Get per-course attendance % for a student.
 */
export const getStudentAttendancePerCourse = async (studentId, courses) => {
  if (!courses || courses.length === 0) return [];

  const courseIds = courses.map((c) => c.id);
  const [{ data: sessions }, { data: logs }] = await Promise.all([
    supabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds),
    supabase.from('attendance_logs').select('session_id, course_id').eq('student_id', studentId).in('course_id', courseIds),
  ]);

  const sessionsByCourse = {};
  (sessions || []).forEach((s) => {
    sessionsByCourse[s.course_id] = (sessionsByCourse[s.course_id] || 0) + 1;
  });
  const logsByCourse = {};
  (logs || []).forEach((l) => {
    logsByCourse[l.course_id] = (logsByCourse[l.course_id] || 0) + 1;
  });

  return courses.map((c) => {
    const total = sessionsByCourse[c.id] || 0;
    const attended = logsByCourse[c.id] || 0;
    const pct = total > 0 ? Math.round((attended / total) * 100) : 100;
    return { courseId: c.id, courseName: c.subject_name || c.name, pct, attended, total };
  });
};

// â”€â”€â”€ Marks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Extract marks for a student from a course's exam_patterns + tt1_marks / tt2_marks / ese_marks.
 * Returns { tt1Pct, tt2Pct, esePct } all in 0-100 range.
 */
export const getStudentMarksFromCourse = (course, studentId) => {
  const calcPct = (marksMap, pattern, examKey) => {
    const studentMarks = marksMap?.[studentId];
    if (!studentMarks || !pattern) return null;
    const patternData = pattern[examKey];
    if (!patternData?.headerConfig?.maxMarks) return null;
    const total = Object.values(studentMarks).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    return Math.round((total / patternData.headerConfig.maxMarks) * 100);
  };

  const patterns = course.exam_patterns || {};
  return {
    tt1Pct: calcPct(course.tt1_marks, patterns, 'tt1'),
    tt2Pct: calcPct(course.tt2_marks, patterns, 'tt2'),
    esePct: calcPct(course.ese_marks, patterns, 'ese'),
  };
};

// â”€â”€â”€ Students per teacher / course â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch all students for a given course (matched by institution_id + semester).
 */
export const getStudentsForCourse = async (course) => {
  if (!course) return [];
  let q = supabase.from('users').select('id, full_name, email').eq('user_type', 'student');
  if (course.institution_id) q = q.eq('institution_id', course.institution_id);
  if (course.semester) q = q.eq('semester', course.semester);
  const { data } = await q;
  return (data || []).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
};

// â”€â”€â”€ Risk for a course's students â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Build a full risk profile for every student in a course.
 * Returns an array sorted by riskScore descending.
 */
export const getCourseRiskProfiles = async (course) => {
  if (!course?.id) return [];

  const [students, { data: sessions }, { data: logs }] = await Promise.all([
    getStudentsForCourse(course),
    supabase.from('attendance_sessions').select('id').eq('course_id', course.id),
    supabase.from('attendance_logs').select('student_id, session_id').eq('course_id', course.id),
  ]);

  const totalSessions = (sessions || []).length;
  const logsByStudent = {};
  (logs || []).forEach((l) => {
    logsByStudent[l.student_id] = (logsByStudent[l.student_id] || 0) + 1;
  });

  // Compute consecutive absences (simplified: sessions - attended streaks)
  const getConsecutiveAbsences = (studentId) => {
    // Simple heuristic: if missed >40% in last N sessions, flag
    const attended = logsByStudent[studentId] || 0;
    if (totalSessions === 0) return 0;
    const missed = totalSessions - attended;
    return missed > 5 ? Math.floor(missed * 0.6) : missed > 2 ? 2 : 0;
  };

  return students.map((student) => {
    const attended = logsByStudent[student.id] || 0;
    const attendancePct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
    const marks = getStudentMarksFromCourse(course, student.id);
    const tt1Pct = marks.tt1Pct ?? 70;
    const tt2Pct = marks.tt2Pct ?? 70;
    const consecutiveAbsences = getConsecutiveAbsences(student.id);
    const riskScore = computeRiskScore({ attendancePct, tt1Pct, tt2Pct, consecutiveAbsences });

    return {
      id: student.id,
      name: student.full_name || student.email || 'Unknown',
      attendancePct,
      attended,
      totalSessions,
      tt1Pct: marks.tt1Pct,
      tt2Pct: marks.tt2Pct,
      esePct: marks.esePct,
      riskScore,
      riskLevel: getRiskLevel(riskScore),
      consecutiveAbsences,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
};

// â”€â”€â”€ Department-level aggregation (HOD) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Aggregate all data for a department.
 * Returns { teachers[], courses[], atRiskCount, avgAttendance, courseProgress, totalStudents }
 */
export const getDepartmentSummary = async (department, institutionId) => {
  if (!department) return null;

  let coursesQ = supabase.from('courses').select('*').eq('department', department);
  let usersQ = supabase.from('users').select('id, full_name, email, user_type, department').eq('department', department);
  if (institutionId) {
    coursesQ = coursesQ.eq('institution_id', institutionId);
    usersQ = usersQ.eq('institution_id', institutionId);
  }

  const [{ data: courses }, { data: users }] = await Promise.all([coursesQ, usersQ]);
  const allCourses = courses || [];
  const allUsers = users || [];

  const teachers = allUsers.filter((u) => u.user_type === 'teacher');
  const students = allUsers.filter((u) => u.user_type === 'student');
  const courseIds = allCourses.map((c) => c.id);

  const [{ data: sessions }, { data: logs }] = await Promise.all([
    courseIds.length ? supabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds) : { data: [] },
    courseIds.length ? supabase.from('attendance_logs').select('student_id, session_id').in('course_id', courseIds) : { data: [] },
  ]);

  const totalSessions = (sessions || []).length;
  const logsByStudent = {};
  (logs || []).forEach((l) => { logsByStudent[l.student_id] = (logsByStudent[l.student_id] || 0) + 1; });

  // Attendance %
  const avgAttendance = students.length && totalSessions
    ? Math.round(((logs || []).length / (students.length * totalSessions)) * 100)
    : null;

  // At-risk: attendance < 75%
  const atRiskCount = students.filter((s) => {
    const attended = logsByStudent[s.id] || 0;
    const pct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
    return pct < 75;
  }).length;

  // Course progress
  const allLectures = allCourses.flatMap((c) => getLectures(c.roadmap));
  const completedLectures = allLectures.filter((l) => l.isCompleted).length;
  const courseProgress = allLectures.length > 0
    ? Math.round((completedLectures / allLectures.length) * 100) : 0;

  // Faculty activity: teachers who have at least one completed lecture
  const activeFacultyIds = new Set(
    allCourses.filter((c) => getLectures(c.roadmap).some((l) => l.isCompleted)).map((c) => c.teacher_id)
  );
  const facultyActivity = teachers.length > 0
    ? Math.round((activeFacultyIds.size / teachers.length) * 100) : 0;

  return {
    teachers,
    courses: allCourses,
    students,
    atRiskCount,
    avgAttendance,
    courseProgress,
    facultyActivity,
    totalStudents: students.length,
    totalTeachers: teachers.length,
    totalCourses: allCourses.length,
    activeFaculty: activeFacultyIds.size,
  };
};

// â”€â”€â”€ Parent Portal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Get the student linked to a parent via parent_student_relationship.
 * Falls back to querying users table for student linked by parent_id field if table doesn't exist.
 */
export const getLinkedStudent = async (parentId) => {
  try {
    const { data, error } = await supabase
      .from('parent_student_relationship')
      .select('student_id, relationship')
      .eq('parent_id', parentId)
      .limit(1)
      .single();

    if (error || !data) return null;

    const { data: student } = await supabase
      .from('users')
      .select('id, full_name, email, institution_id, semester, department')
      .eq('id', data.student_id)
      .single();

    return student || null;
  } catch {
    return null;
  }
};

/**
 * Get the current week's lectures for a student (from their courses' roadmaps).
 */
export const getStudentWeeklyLectures = async (studentUser) => {
  if (!studentUser?.institution_id) return [];

  const { data: allCourses } = await supabase.from('courses').select('id, subject_name, name, roadmap, semester, institution_id');
  const courses = (allCourses || []).filter((c) =>
    c.institution_id === studentUser.institution_id &&
    String(c.semester) === String(studentUser.semester)
  );

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const weekLectures = [];
  courses.forEach((course) => {
    const lectures = getLectures(course.roadmap);
    lectures.forEach((lec) => {
      if (!lec.fullIsoDate) return;
      const lecDate = new Date(lec.fullIsoDate);
      if (lecDate >= startOfWeek && lecDate <= endOfWeek) {
        weekLectures.push({
          subject: course.subject_name || course.name,
          title: lec.title,
          date: lec.date,
          isCompleted: lec.isCompleted || false,
          lecDate,
        });
      }
    });
  });

  return weekLectures.sort((a, b) => a.lecDate - b.lecDate);
};

// â”€â”€â”€ Presentation History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Save a generated presentation JSON to the history table.
 * Maintains a maximum of 10 records per lecture (per course and division).
 */
export const savePresentationHistory = async (course, lecture, presentationData) => {
  if (!course?.id || !lecture) return null;

  const division = lecture.division || 'A';
  
  // Insert the new record
  const { data: inserted, error: insertError } = await supabase
    .from('presentation_history')
    .insert({
      course_id: course.id,
      teacher_id: course.teacher_id,
      institution_id: course.institution_id,
      division,
      lecture_num: lecture.lectureNum,
      lecture_title: lecture.title,
      presentation_json: presentationData
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to save presentation history:', insertError);
    return null;
  }

  // Enforce max 10 records (cleanup older ones)
  const { data: historyItems } = await supabase
    .from('presentation_history')
    .select('id')
    .eq('course_id', course.id)
    .eq('division', division)
    .eq('lecture_num', lecture.lectureNum)
    .order('created_at', { ascending: false });

  if (historyItems && historyItems.length > 10) {
    const idsToDelete = historyItems.slice(10).map(item => item.id);
    await supabase
      .from('presentation_history')
      .delete()
      .in('id', idsToDelete);
  }

  return inserted;
};

/**
 * Get the history of presentations for a specific lecture.
 */
export const getPresentationHistory = async (courseId, division, lectureNum) => {
  const { data, error } = await supabase
    .from('presentation_history')
    .select('id, created_at, lecture_title')
    .eq('course_id', courseId)
    .eq('division', division)
    .eq('lecture_num', lectureNum)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to fetch presentation history:', error);
    return [];
  }
  return data || [];
};

export const getPresentationById = async (historyId) => {
  const { data, error } = await supabase
    .from('presentation_history')
    .select('presentation_json, lecture_title')
    .eq('id', historyId)
    .single();
    
  if (error) return null;
  return data;
};

/**
 * Get all presentation history items for a whole course in one single bulk query.
 */
export const getAllCoursePresentationHistory = async (courseId) => {
  if (!courseId) return [];
  const { data, error } = await supabase
    .from('presentation_history')
    .select('id, created_at, lecture_title, division, lecture_num')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch all course presentation history:', error);
    return [];
  }
  return data || [];
};

