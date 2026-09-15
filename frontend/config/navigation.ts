/* eslint-disable */
// @ts-nocheck
export const TEACHER_NAV = [
  { path: '/teacher', label: 'Home', category: 'Overview' },
  { path: '/teacher/profile', label: 'Profile', category: 'Overview' },
  { path: '/teacher/lesson-plan', label: 'Lesson Plan', category: 'Classroom' },
  { path: '/teacher/lecture-overview', label: 'Lecture Overview', category: 'Classroom' },
  { path: '/teacher/attendance', label: 'Attendance', category: 'Classroom' },
  { path: '/teacher/question-bank', label: 'Question Bank', category: 'Classroom' },
  { path: '/teacher/examination', label: 'Question Papers', category: 'Classroom' },
  { path: '/teacher/marks', label: 'Marks', category: 'Performance' },
  { path: '/teacher/course-analytics', label: 'Course Analytics', category: 'Performance' },
  { path: '/teacher/student-analytics', label: 'Student Analytics', category: 'Performance' },
  { path: '/teacher/create-course', label: '+ New Course', highlight: true },
];

export const ADMIN_NAV = [
  { path: '/admin', label: 'Dashboard' },
];

export const HOD_NAV = [
  { path: '/hod', label: 'Dashboard' },
];

export const STUDENT_NAV = [
  { path: '/student', label: 'Dashboard' },
  { path: '/student/attendance', label: 'Attendance' },
  { path: '/student/lecture-vault', label: 'Lecture Vault' },
];

export const PARENT_NAV = [
  { path: '/parent', label: 'Portal' },
  { path: '/parent/progress', label: 'Progress Timeline' },
];

export const REGISTRAR_NAV = [
  { path: '/registrar', label: 'Dashboard' },
];

export const EXAM_CONTROLLER_NAV = [
  { path: '/exam-controller', label: 'Dashboard' },
];

export const VELAAR_ADMIN_NAV = [
  { path: '/velaar-admin', label: 'Institutions' },
];

export const PRINCIPAL_NAV = [
  { path: '/principal', label: 'Dashboard' },
];

export const getNavForRole = (role) => {
  const map = {
    teacher: TEACHER_NAV,
    admin: ADMIN_NAV,
    hod: HOD_NAV,
    student: STUDENT_NAV,
    parent: PARENT_NAV,
    registrar: REGISTRAR_NAV,
    examController: EXAM_CONTROLLER_NAV,
    velaarAdmin: VELAAR_ADMIN_NAV,
    principal: PRINCIPAL_NAV,
  };
  return map[role] || [];
};
