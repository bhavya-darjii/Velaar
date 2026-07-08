import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { getDocs, getDoc, doc, collection, query, where, updateDoc } from 'firebase/firestore';
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
      if (!auth.currentUser) return navigate('/');
      
      const user = auth.currentUser;
      let teacherName = "Teacher";

      // --- STEP 1: GET TEACHER NAME ---
      try {
        // First, check if name exists in Auth Profile
        if (user.displayName) {
          teacherName = user.displayName.split(' ')[0];
        } else {
          // If not, fetch it from the 'users' collection in Firestore
          // (This works because your rules allow reading own profile)
          const userDocRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userDocRef);
          
          if (userSnap.exists()) {
            const userData = userSnap.data();
            // Assuming the field in your DB is 'name' or 'fullName'
            const fullName = userData.name || userData.fullName || "Teacher";
            teacherName = fullName.split(' ')[0];
          }
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }

      // Set the greeting
      const randomMsg = TEACHER_GREETINGS[Math.floor(Math.random() * TEACHER_GREETINGS.length)];
      setGreeting(`${randomMsg} ${teacherName}.`);

      // --- STEP 2: GET COURSE DATA ---
      try {
        const q = query(collection(db, "courses"), where("teacherId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0].data();
          const docId = querySnapshot.docs[0].id;
          
          const courseData = { id: docId, ...docData };
          setCourse(courseData);

          // ── Inject subject into AI context so every AI call from
          //    this session is tagged with the correct subject name ──
          setAiContextCourse(docId, docData.subjectName || '');
          // Flatten multi-division roadmap to find next active lecture
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
          navigate('/create-course');
        }
      } catch (err) {
        console.error("Error loading course:", err);
      }
      setLoading(false);
    };

    initDashboard();
  }, [navigate]);

  if (loading) return <HomePageSkeleton />;

  const handleMigrateLegacyData = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "courses"), where("teacherId", "==", auth.currentUser.uid));
      const coursesSnapshot = await getDocs(q);
      const updatePromises = [];
      coursesSnapshot.forEach((courseDoc) => {
        updatePromises.push(
          updateDoc(doc(db, "courses", courseDoc.id), {
            department: "Artificial Intelligence and Data Science"
          })
        );
      });
      
      // Update teacher's profile
      updatePromises.push(
        updateDoc(doc(db, "users", auth.currentUser.uid), {
           department: "Artificial Intelligence and Data Science"
        })
      );
      
      await Promise.all(updatePromises);
      alert("Legacy courses migrated to AI & DS department.");
      window.location.reload();
    } catch (error) {
      console.error("Migration error:", error);
      alert("Failed to migrate data");
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
