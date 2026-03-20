import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { getDocs, getDoc, doc, collection, query, where } from 'firebase/firestore';
import './TeacherLayout.css';

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

const TeacherLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [course, setCourse] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentLecture, setCurrentLecture] = useState(null);
  const [greetingBase] = useState(() => TEACHER_GREETINGS[Math.floor(Math.random() * TEACHER_GREETINGS.length)]);
  const [greeting, setGreeting] = useState(greetingBase + " Teacher.");
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    const initDashboard = async () => {
      // ProtectedRoute strictly guarantees auth.currentUser exists before this mounts!
      const user = auth.currentUser;
      let teacherName = "Teacher";

      try {
        if (user.displayName) {
          teacherName = user.displayName.split(' ')[0];
        } else {
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const fullName = userData.name || userData.fullName || "Teacher";
            teacherName = fullName.split(' ')[0];
          }
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }

      setTeacherName(teacherName);
      setGreeting(`${greetingBase} ${teacherName}.`);

      try {
        const q = query(collection(db, "courses"), where("teacherId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          const docId = querySnapshot.docs[0].id;
          const courseData = { id: docId, ...docData };
          setCourse(courseData);
          
          let allLectures = [];
          if (courseData.roadmap && !Array.isArray(courseData.roadmap)) {
            Object.entries(courseData.roadmap).forEach(([div, lecs]) => {
              lecs.forEach(l => allLectures.push({ ...l, division: div }));
            });
          } else if (Array.isArray(courseData.roadmap)) {
            allLectures = courseData.roadmap.map(l => ({ ...l, division: "A" }));
          }

          allLectures.sort((a, b) => new Date(a.fullIsoDate || 0) - new Date(b.fullIsoDate || 0));
          const nextUp = allLectures.find(l => !l.isCompleted) || allLectures[allLectures.length - 1];
          setCurrentLecture(nextUp);
        } else {
          navigate('/teacher/create-course');
        }
      } catch (err) {
        console.error("Error loading course:", err);
      }
      setLoading(false);
    };

    initDashboard();
  }, [navigate]);

  if (loading) return <div className="loading-screen" style={{color: 'white', display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', fontSize:'1.5rem'}}>Loading...</div>;

  return (
    <div className="teacher-layout">
      {/* Sidebar Overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      
      {/* Sidebar Navigation */}
      <nav className={`teacher-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        
        <ul className="sidebar-links">
          <li className={location.pathname === '/teacher' ? 'active' : ''} onClick={() => { navigate('/teacher'); setSidebarOpen(false); }}>
            Home
          </li>
          <li className={location.pathname === '/teacher/exams' ? 'active' : ''} onClick={() => { navigate('/teacher/exams'); setSidebarOpen(false); }}>
            Exam Center
          </li>
          {/* Developer Note: Append all NEW navigation tabs perfectly above this line */}
          <li className={`new-course-tab ${location.pathname === '/teacher/create-course' ? 'active' : ''}`} onClick={() => { navigate('/teacher/create-course'); setSidebarOpen(false); }}>
            + New Course
          </li>
        </ul>
      </nav>

      {/* Main Content Area */}
      <div className="main-content">
        <header className="dash-header" style={course === null ? { justifyContent: 'center' } : {}}>
          {course !== null ? (
            <>
              <div className="header-left">
                <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                <div>
                  <h1>{course?.subjectName}</h1>
                  <p className="subtitle">{greeting}</p>
                </div>
              </div>
              
              <div className="header-actions">
                {location.pathname === '/teacher' && (
                  <div className="progress-badge">
                    {(Array.isArray(course?.roadmap) ? course?.roadmap : Object.values(course?.roadmap || {}).flat()).filter(l => l.isCompleted).length} / {(course?.totalLectures || 0) * (course?.divisions?.length || 1)} Lectures Done
                  </div>
                )}
              </div>
            </>
          ) : (
            <h1 className="liquid-title">Welcome to Velaar{teacherName ? `, ${teacherName}!` : '!'}</h1>
          )}
        </header>

        {/* Dynamic Nested Route Content */}
        <div className="outlet-container">
          <Outlet context={{ course, setCourse, currentLecture, setCurrentLecture }} />
        </div>
      </div>
    </div>
  );
};

export default TeacherLayout;
