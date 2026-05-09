import { useOutletContext } from 'react-router-dom';
import { ActiveLecture, RoadmapSidebar } from '../../components/teacher/CourseChecklist';
import HomePageSkeleton from '../../components/skeletons/HomePageSkeleton';
import './TeacherHome.css';

const TeacherHome = () => {
  const { course, setCourse, currentLecture, setCurrentLecture, loading } = useOutletContext();

  if (loading || !course) {
    return <HomePageSkeleton />;
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

      {/* Right Col: Roadmap History */}
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
