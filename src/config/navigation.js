export const TEACHER_NAV = [
  { path: '/teacher', label: 'Home' },
  { path: '/teacher/questionbank', label: 'Question Bank' },
  { path: '/teacher/examination', label: 'Question Papers' },
  { path: '/teacher/lesson-plan', label: 'Lesson Plan' },
  { path: '/teacher/marks', label: 'Marks' },
  { path: '/teacher/answer-evaluator', label: 'Answer Evaluator' },
  { path: '/teacher/rubric-generator', label: 'Rubric Generator' },
  { path: '/teacher/co-attainment', label: 'CO Attainment' },
  { path: '/teacher/student-risk', label: 'Student Risk Analytics' },
  { path: '/teacher/lab-manual', label: 'Lab Manual Generator' },
  { path: '/teacher/assignment-hub', label: 'Assignment Hub' },
  { path: '/teacher/attendance', label: 'Attendance' },
  { path: '/teacher/syllabus', label: 'Syllabus' },
  { path: '/teacher/learning-resources', label: 'Learning Resources' },
  { path: '/teacher/timetable', label: 'Timetable' },
  { path: '/teacher/notice', label: 'Notice' },
  { path: '/teacher/event', label: 'Event' },
  { path: '/teacher/profile', label: 'Profile' },
  { path: '/teacher/about', label: 'About Us' },
  { path: '/teacher/create-course', label: '+ New Course', highlight: true },
];

export const ADMIN_NAV = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/timetable-generator', label: 'Timetable Generator' },
  { path: '/admin/notice-generator', label: 'Notice Generator' },
  { path: '/admin/accreditation', label: 'Accreditation Hub' },
];

export const HOD_NAV = [
  { path: '/hod', label: 'Dashboard' },
  { path: '/hod/mapping', label: 'Course Mapping' },
  { path: '/hod/feedback-analytics', label: 'Feedback Analytics' },
  { path: '/hod/meeting-minutes', label: 'Meeting Minutes' },
];

export const STUDENT_NAV = [
  { path: '/student', label: 'Dashboard' },
  { path: '/student/study-material', label: 'Study Material' },
  { path: '/student/flashcards', label: 'Flashcards' },
  { path: '/student/assignments', label: 'Assignments' },
  { path: '/student/feedback', label: 'Feedback Form' },
  { path: '/student/attendance', label: 'Attendance Scanner' },
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
  };
  return map[role] || [];
};
