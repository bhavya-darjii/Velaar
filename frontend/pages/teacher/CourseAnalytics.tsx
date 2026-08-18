/* eslint-disable */
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './CourseAnalytics.css';

const flattenRoadmap = (roadmap) => Array.isArray(roadmap)
  ? roadmap
  : Object.values(roadmap || {}).flat();

const CourseAnalytics = () => {
  const { course, currentLecture } = useOutletContext() || {};
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState({ sessions: 0, enrolled: 0, rate: null });

  const lectures = useMemo(() => flattenRoadmap(course?.roadmap), [course?.roadmap]);
  const completed = lectures.filter((lecture) => lecture.isCompleted).length;
  const progress = lectures.length ? Math.round((completed / lectures.length) * 100) : 0;
  const nextLecture = lectures.find((lecture) => !lecture.isCompleted) || currentLecture;

  useEffect(() => {
    const loadAttendance = async () => {
      if (!course?.id) return;
      let studentQuery = supabase.from('users').select('id', { count: 'exact', head: true }).eq('user_type', 'student');
      if (course.institution_id) studentQuery = studentQuery.eq('institution_id', course.institution_id);
      if (course.semester) studentQuery = studentQuery.eq('semester', course.semester);
      const [{ data: sessions }, { count: enrolled }] = await Promise.all([
        supabase.from('attendance_sessions').select('id').eq('course_id', course.id),
        studentQuery,
      ]);
      const sessionIds = (sessions || []).map((session) => session.id);
      const { count: logs } = sessionIds.length
        ? await supabase.from('attendance_logs').select('id', { count: 'exact', head: true }).in('session_id', sessionIds)
        : { count: 0 };
      const rate = enrolled && sessionIds.length ? Math.round(((logs || 0) / (enrolled * sessionIds.length)) * 100) : null;
      setAttendance({ sessions: sessionIds.length, enrolled: enrolled || 0, rate });
    };
    loadAttendance();
  }, [course]);

  if (!course) return <div className="feature-empty">Create a course to view its teaching and attendance analytics.</div>;

  return (
    <div className="course-analytics">
      <header className="course-analytics__header">
        <div><span>INSIGHTS · {course.subjectName}</span><h2>Course health</h2><p>One view of lecture progress, attendance, and the next teaching action.</p></div>
        <button className="glass-btn glass-btn--primary" onClick={() => navigate('/teacher/lecture-assistant')}>Prepare next lecture</button>
      </header>
      <section className="course-analytics__metrics">
        <article><strong>{progress}%</strong><span>Course progress</span><small>{completed} of {lectures.length} lectures completed</small></article>
        <article><strong>{attendance.rate === null ? '—' : `${attendance.rate}%`}</strong><span>Average attendance</span><small>{attendance.sessions} live session{attendance.sessions === 1 ? '' : 's'} recorded</small></article>
        <article><strong>{attendance.enrolled || '—'}</strong><span>Students in scope</span><small>Based on institution and semester</small></article>
      </section>
      <section className="course-analytics__next glass-card">
        <div><span>NEXT TEACHING ACTION</span><h3>{nextLecture ? `Lecture ${nextLecture.lectureNum}: ${nextLecture.title}` : 'Course roadmap complete'}</h3><p>{nextLecture?.description || 'All lectures on this roadmap are marked complete.'}</p></div>
        {nextLecture && <button className="glass-btn glass-btn--ghost" onClick={() => navigate('/teacher/lecture-assistant')}>Open assistant</button>}
      </section>
      <section className="course-analytics__actions">
        <button className="glass-card" onClick={() => navigate('/teacher/attendance')}><strong>Track attendance</strong><span>Start a live QR session or review defaulters.</span></button>
        <button className="glass-card" onClick={() => navigate('/teacher/student-analytics')}><strong>Student Analytics</strong><span>Review individual student performance, marks, and attendance.</span></button>
      </section>
    </div>
  );
};

export default CourseAnalytics;

