/* eslint-disable */
// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import GenericDashboardSkeleton from '../../components/skeletons/GenericDashboardSkeleton';
import './PrincipalDashboard.css';

const getLectures = (roadmap) => Array.isArray(roadmap) ? roadmap : Object.values(roadmap || {}).flat();
const percentage = (value, total) => total ? Math.round((value / total) * 100) : null;
const statusFrom = (health) => health >= 80 ? 'Healthy' : health >= 65 ? 'Watch' : 'Needs attention';

const PrincipalDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [institutionName, setInstitutionName] = useState('Your Institution');
  const [departments, setDepartments] = useState([]);
  const [summary, setSummary] = useState({ attendance: null, courseProgress: 0, riskRate: 0, facultyActivity: 0 });

  useEffect(() => {
    const loadInstitutionHealth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data: profile } = await supabase.from('users').select('institution_id, college_name').eq('id', session.user.id).single();
        setInstitutionName(profile?.college_name || 'Your Institution');

        let coursesQuery = supabase.from('courses').select('id, department, teacher_id, roadmap');
        let usersQuery = supabase.from('users').select('id, user_type, department');
        if (profile?.institution_id) {
          coursesQuery = coursesQuery.eq('institution_id', profile.institution_id);
          usersQuery = usersQuery.eq('institution_id', profile.institution_id);
        }
        const [{ data: coursesData }, { data: usersData }] = await Promise.all([coursesQuery, usersQuery]);
        const courses = coursesData || [];
        const users = usersData || [];
        const courseIds = courses.map((course) => course.id);
        const { data: sessionsData } = courseIds.length
          ? await supabase.from('attendance_sessions').select('id, course_id').in('course_id', courseIds)
          : { data: [] };
        const sessions = sessionsData || [];
        const sessionIds = sessions.map((sessionItem) => sessionItem.id);
        const { data: logsData } = sessionIds.length
          ? await supabase.from('attendance_logs').select('student_id, session_id').in('session_id', sessionIds)
          : { data: [] };
        const logs = logsData || [];
        const departmentNames = [...new Set([...courses.map((course) => course.department), ...users.map((user) => user.department)].filter(Boolean))].sort();
        const rows = departmentNames.map((department) => {
          const departmentCourses = courses.filter((course) => course.department === department);
          const departmentStudents = users.filter((user) => user.user_type === 'student' && user.department === department);
          const departmentTeachers = users.filter((user) => user.user_type === 'teacher' && user.department === department);
          const departmentCourseIds = new Set(departmentCourses.map((course) => course.id));
          const departmentSessions = sessions.filter((sessionItem) => departmentCourseIds.has(sessionItem.course_id));
          const departmentSessionIds = new Set(departmentSessions.map((sessionItem) => sessionItem.id));
          const studentIds = new Set(departmentStudents.map((student) => student.id));
          const departmentLogs = logs.filter((log) => departmentSessionIds.has(log.session_id) && studentIds.has(log.student_id));
          const lectures = departmentCourses.flatMap((course) => getLectures(course.roadmap));
          const courseProgress = percentage(lectures.filter((lecture) => lecture.isCompleted).length, lectures.length) || 0;
          const attendance = departmentStudents.length && departmentSessions.length ? percentage(departmentLogs.length, departmentStudents.length * departmentSessions.length) : null;
          const loggedByStudent = new Map();
          departmentLogs.forEach((log) => loggedByStudent.set(log.student_id, (loggedByStudent.get(log.student_id) || 0) + 1));
          const atRisk = departmentStudents.filter((student) => (percentage(loggedByStudent.get(student.id) || 0, departmentSessions.length) ?? 100) < 75).length;
          const facultyActivity = percentage(new Set(departmentCourses.filter((course) => getLectures(course.roadmap).some((lecture) => lecture.isCompleted)).map((course) => course.teacher_id)).size, departmentTeachers.length) || 0;
          const health = Math.round(((attendance ?? 75) + courseProgress + facultyActivity + (departmentStudents.length ? 100 - percentage(atRisk, departmentStudents.length) : 100)) / 4);
          return { name: department, attendance, courseProgress, atRisk, studentCount: departmentStudents.length, facultyActivity, health, courseCount: departmentCourses.length };
        });
        setDepartments(rows);

        const totalStudents = users.filter((user) => user.user_type === 'student').length;
        const totalLectures = courses.flatMap((course) => getLectures(course.roadmap));
        const totalCompleted = totalLectures.filter((lecture) => lecture.isCompleted).length;
        const activeFaculty = new Set(courses.filter((course) => getLectures(course.roadmap).some((lecture) => lecture.isCompleted)).map((course) => course.teacher_id)).size;
        const facultyCount = users.filter((user) => user.user_type === 'teacher').length;
        const attendance = totalStudents && sessions.length ? percentage(logs.length, totalStudents * sessions.length) : null;
        const atRisk = rows.reduce((sum, row) => sum + row.atRisk, 0);
        setSummary({ attendance, courseProgress: percentage(totalCompleted, totalLectures.length) || 0, riskRate: percentage(atRisk, totalStudents) || 0, facultyActivity: percentage(activeFaculty, facultyCount) || 0 });
      } catch (error) {
        console.error('Unable to load institution health:', error);
      } finally {
        setLoading(false);
      }
    };
    loadInstitutionHealth();
  }, []);

  const institutionHealth = useMemo(() => Math.round(((summary.attendance ?? 75) + summary.courseProgress + (100 - summary.riskRate) + summary.facultyActivity) / 4), [summary]);

  if (loading) return <GenericDashboardSkeleton />;

  return (
    <div className="principal-dashboard">
      <header className="principal-dashboard__hero glass-card"><div><span>VELAAR · INSTITUTION HEALTH</span><h2>{institutionName}</h2><p>One academic system, progressively aggregated from student signals to department decisions.</p></div><div className="principal-dashboard__health"><strong>{institutionHealth}%</strong><span>Academic health</span></div></header>
      <section className="principal-dashboard__metrics"><article><strong>{summary.attendance === null ? '—' : `${summary.attendance}%`}</strong><span>Attendance</span></article><article><strong>{summary.courseProgress}%</strong><span>Course progress</span></article><article><strong>{summary.riskRate}%</strong><span>At-risk signal</span></article><article><strong>{summary.facultyActivity}%</strong><span>Faculty activity</span></article></section>
      <section className="principal-dashboard__table glass-card"><div className="principal-dashboard__table-header"><div><span>DEPARTMENT PERFORMANCE</span><h3>Where leadership attention is needed</h3></div><p>Student-level detail stays with the faculty and HOD; this view shows institutional patterns.</p></div>{departments.length ? <div className="principal-table-wrap"><table><thead><tr><th>Department</th><th>Attendance</th><th>Risk</th><th>Course progress</th><th>Faculty activity</th><th>Status</th></tr></thead><tbody>{departments.map((department) => <tr key={department.name}><td><strong>{department.name}</strong><small>{department.courseCount} courses · {department.studentCount} students</small></td><td>{department.attendance === null ? '—' : `${department.attendance}%`}</td><td>{department.studentCount ? `${department.atRisk} students` : '—'}</td><td>{department.courseProgress}%</td><td>{department.facultyActivity}%</td><td><span className={`principal-status principal-status--${statusFrom(department.health).toLowerCase().replace(' ', '-')}`}>{statusFrom(department.health)}</span></td></tr>)}</tbody></table></div> : <div className="feature-empty">No departmental courses or user records are available yet.</div>}</section>
    </div>
  );
};

export default PrincipalDashboard;

