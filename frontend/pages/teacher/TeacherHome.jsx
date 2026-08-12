import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { ActiveLecture, RoadmapSidebar } from '../../components/teacher/CourseChecklist';
import HomePageSkeleton from '../../components/skeletons/HomePageSkeleton';
import { generateLecturePresentation } from '../../services/aiService';
import { downloadLecturePresentation } from '../../utils/presentationExport';
import { savePresentationHistory } from '../../services/dataService';
import './TeacherHome.css';

const collectLectures = (roadmap) => {
  if (!roadmap) return [];
  if (Array.isArray(roadmap)) return roadmap;
  return Object.entries(roadmap).flatMap(([division, lectures]) =>
    (lectures || []).map((l) => ({ ...l, division }))
  );
};

const PptCard = ({ course, currentLecture }) => {
  const lectures = collectLectures(course?.roadmap);
  const [selectedId, setSelectedId] = useState(() => {
    const l = currentLecture || lectures[0];
    return l ? `${l.division || 'A'}-${l.lectureNum || 0}` : '';
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Standard way to trigger browser warning
    };

    if (loading) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
      window.addEventListener('beforeunload', handleBeforeUnload);
    } else {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading]);

  const selectedLecture = lectures.find(
    (l) => `${l.division || 'A'}-${l.lectureNum || 0}` === selectedId
  ) || currentLecture || lectures[0];

  const handleGenerate = async () => {
    if (!selectedLecture || loading || done) return;
    setLoading(true);
    setTimer(0);
    setDone(false);
    setError('');
    try {
      const response = await generateLecturePresentation({
        subjectName: course?.subjectName,
        lecture: selectedLecture,
        overview: selectedLecture?.lecturePreparation || null,
        teachingStyle: 'Conceptual',
        course: {
          modules: course?.modules || [],
          lessonPlan: course?.lessonPlan || null,
        },
      });
      if (response?.error) {
        setError('API OVERLOADED — RETRY');
      } else {
        await downloadLecturePresentation(response, {
          subjectName: course?.subjectName,
          lectureTitle: selectedLecture.title,
        });
        
        await savePresentationHistory(course, selectedLecture, response);
        
        setDone(true);
        setTimeout(() => setDone(false), 3500);
      }
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('fetch')) {
        setError('NETWORK ERROR — CHECK CONNECTION');
      } else {
        setError('SERVER ERROR — RETRY');
      }
    }
    setLoading(false);
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const btnLabel = loading ? `GENERATING... (${formatTime(timer)})` : done ? 'DOWNLOADED' : error ? error : 'GENERATE PRESENTATION';

  return (
    <div className="ppt-card glass-card">
      <div className="ppt-card__header">
        <h3>Generate Lecture Presentation</h3>
        <p>Select a lecture and generate a complete, content-rich PowerPoint with real-world examples, definitions, and speaker notes — ready to deliver.</p>
      </div>

      <div className="ppt-card__body">
        {lectures.length > 0 ? (
          <>
            <select
              className="ppt-card__select"
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setMessage(''); }}
            >
              {lectures.map((l) => (
                <option key={`${l.division || 'A'}-${l.lectureNum}`} value={`${l.division || 'A'}-${l.lectureNum || 0}`}>
                  {`Div ${l.division || 'A'} — Lecture ${l.lectureNum}: ${l.title}`}
                </option>
              ))}
            </select>

            <button
              className={`glass-btn ppt-card__btn${loading ? ' glass-btn--loading' : ''}${done ? ' glass-btn--done' : ''}`}
              onClick={handleGenerate}
              disabled={loading || done}
            >
              {loading && <span className="ppt-spinner" />}
              {btnLabel}
            </button>

          </>
        ) : (
          <p className="ppt-card__empty">Add lectures to your roadmap to generate a presentation.</p>
        )}
      </div>
    </div>
  );
};

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
        <ActiveLecture
          course={course}
          setCourse={setCourse}
          currentLecture={currentLecture}
          setCurrentLecture={setCurrentLecture}
        />

        <aside className="sidebar">
          {/* PPT card first, then roadmap below */}
          <PptCard course={course} currentLecture={currentLecture} />
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
