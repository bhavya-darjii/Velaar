import { useOutletContext } from 'react-router-dom';
import { ActiveLecture, RoadmapSidebar } from '../../components/teacher/CourseChecklist';
import HomePageSkeleton from '../../components/skeletons/HomePageSkeleton';
import './TeacherHome.css';

const TeacherHome = () => {
  const { course, setCourse, currentLecture, setCurrentLecture, loading } = useOutletContext();
  const navigate = useNavigate();

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (!course) {
    return (
      <div className="teacher-home-empty">
        <div className="empty-content">
          <div className="empty-icon">📚</div>
          <h2>Welcome to your Digital Classroom!</h2>
          <p>It looks like you don't have any active courses yet. Let's get started by creating your very first course.</p>
          <button 
            className="velaar-btn" 
            onClick={() => navigate('/teacher/create-course')}
          >
            Create a Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="teacher-home-grid">
        {/* Left Col: Active Lecture & Checklist */}
        <ActiveLecture
          course={course}
          setCourse={setCourse}
          currentLecture={currentLecture}
          setCurrentLecture={setCurrentLecture}
        />

        {/* Right Col: Roadmap + Velaar AI below it */}
        <aside className="sidebar">
          <RoadmapSidebar
            course={course}
            currentLecture={currentLecture}
          />
        </aside>
      </div>
    </>
  );
};

export default TeacherHome;
