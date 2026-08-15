/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { setAiContextCourse } from '../../services/aiService';
import { ActiveLecture, RoadmapSidebar } from '../../components/teacher/CourseChecklist';
import ExamSection from '../../components/teacher/QuestionBankSection';
import HomePageSkeleton from '../../components/skeletons/HomePageSkeleton';
import './TeacherDashboard.css';

const TEACHER_GREETINGS = [
  "Ready to inspire the next generation,",
  "Welcome back to your digital classroom,",
  "Let's make today a great day for learning,",
  "Your students are lucky to have you,",
  "Time to share some wisdom,",
  "Great to see you again,",
  "Let's unlock some potential today,",
  "Class is in session. Welcome,",
  "Ready to shape some minds,"
];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  
  // Central State
  const [course, setCourse] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentLecture, setCurrentLecture] = useState(null);
  
  // State for the dynamic greeting
  const [greeting, setGreeting] = useState("Welcome back.");

  // Load Course Data & Set Greeting
  useEffect(() => {
    const initDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return navigate('/');
      const user = session.user;
      let teacherName = 'Teacher';

      // STEP 1: GET TEACHER NAME
      try {
        if (user.user_metadata?.full_name) {
          teacherName = user.user_metadata.full_name.split(' ')[0];
        } else {
          const { data: userData } = await supabase.from('users').select('full_name').eq('id', user.id).single();
          if (userData?.full_name) teacherName = userData.full_name.split(' ')[0];
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
      }

      const randomMsg = TEACHER_GREETINGS[Math.floor(Math.random() * TEACHER_GREETINGS.length)];
      setGreeting(`${randomMsg} ${teacherName}.`);

      // STEP 2: GET COURSE DATA
      try {
        const { data: courses } = await supabase.from('courses').select('*').eq('teacher_id', user.id).limit(1);
        if (courses && courses.length > 0) {
          const raw = courses[0];
          // Map snake_case to camelCase for component compatibility
          const courseData = {
            ...raw,
            id: raw.id,
            subjectName: raw.subject_name || raw.name,
            teacherId: raw.teacher_id,
            lessonPlan: raw.lesson_plan,
            examPatterns: raw.exam_patterns,
            questionBank: raw.question_bank,
            roadmap: raw.roadmap,
            totalLectures: raw.total_lectures,
            divisions: raw.divisions,
          };
          setCourse(courseData);
          setAiContextCourse(raw.id, courseData.subjectName || '');

          let allLectures = [];
          if (courseData.roadmap && !Array.isArray(courseData.roadmap)) {
            Object.entries(courseData.roadmap).forEach(([div, lecs]) => {
              lecs.forEach(l => allLectures.push({ ...l, division: div }));
            });
          } else if (Array.isArray(courseData.roadmap)) {
            allLectures = courseData.roadmap.map(l => ({ ...l, division: 'A' }));
          }
          allLectures.sort((a, b) => new Date(a.fullIsoDate || 0) - new Date(b.fullIsoDate || 0));
          const nextUp = allLectures.find(l => !l.isCompleted) || allLectures[allLectures.length - 1];
          setCurrentLecture(nextUp);
        } else {
          navigate('/create-course');
        }
      } catch (err) {
        console.error('Error loading course:', err);
      }
      setLoading(false);
    };
    initDashboard();
  }, [navigate]);

  if (loading) return <HomePageSkeleton />;

  const handleMigrateLegacyData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      // Update all teacher's courses
      await supabase.from('courses').update({ department: 'Artificial Intelligence and Data Science' }).eq('teacher_id', uid);
      // Update teacher's own profile
      await supabase.from('users').update({ department: 'Artificial Intelligence and Data Science' }).eq('id', uid);
      alert('Legacy courses migrated to AI & DS department.');
      window.location.reload();
    } catch (error) {
      console.error('Migration error:', error);
      alert('Failed to migrate data');
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header Stats */}
      <header className="dash-header">
        <div>
          <h1>{course?.subjectName}</h1>
          <p className="subtitle">{greeting}</p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => navigate('/create-course')}
            className="new-course-btn"
          >
            + New Course
          </button>
          
          <button 
            onClick={handleMigrateLegacyData}
            className="new-course-btn"
            style={{ background: 'transparent', border: '1px solid #ffcc00', color: '#ffcc00', marginLeft: '10px' }}
          >
            TEMP: Migrate Data
          </button>

          <div className="progress-badge">
            {(Array.isArray(course?.roadmap) ? course?.roadmap : Object.values(course?.roadmap || {}).flat()).filter(l => l.isCompleted).length} / {(course?.totalLectures || 0) * (course?.divisions?.length || 1)} Lectures Done
          </div>
        </div>
      </header>

      <div className="main-grid">
        {/* Left Col: Active Lecture & Checklist */}
        <ActiveLecture 
          course={course}
          setCourse={setCourse}
          currentLecture={currentLecture}
          setCurrentLecture={setCurrentLecture}
        />

        {/* Right Col: Exam & History */}
        <aside className="sidebar">
          <ExamSection course={course} />
          
          <RoadmapSidebar 
            course={course} 
            currentLecture={currentLecture} 
          />
        </aside>
      </div>
    </div>
  );
};

export default TeacherDashboard;

