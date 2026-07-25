import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDocs, getDoc, doc, collection, query, where } from 'firebase/firestore';
import { TEACHER_NAV } from '../config/navigation';
import { useCopilotContext } from '../context/CopilotContext';
import UnifiedLayout from './UnifiedLayout';

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
  const [course, setCourse] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentLecture, setCurrentLecture] = useState(null);
  const [greetingBase] = useState(() => TEACHER_GREETINGS[Math.floor(Math.random() * TEACHER_GREETINGS.length)]);
  const [greeting, setGreeting] = useState(greetingBase + " Teacher.");
  const { setPageContext } = useCopilotContext();
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

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
          const courseData = { id: docId, teacherName, ...docData };
          setCourse(courseData);
          setPageContext({ course: courseData });
          
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
          // Do not force redirect; let them stay on the home dashboard to see the empty state.
          console.log("No courses found for this teacher.");
        }
      } catch (err) {
        console.error("Error loading course:", err);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, greetingBase, setPageContext]);

  if (loading) {
    return <div className="velaar-page-shell"><div className="skeleton-base" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px' }} /></div>;
  }

  const title = course ? course.subjectName : `Welcome to Velaar${teacherName ? `, ${teacherName}!` : '!'}`;
  const subtitle = course ? greeting : "";

  const headerActions = course && location.pathname === '/teacher' ? (
    <div className="progress-badge">
      {(Array.isArray(course?.roadmap) ? course?.roadmap : Object.values(course?.roadmap || {}).flat()).filter(l => l.isCompleted).length} / {(course?.totalLectures || 0) * (course?.divisions?.length || 1)} Lectures Done
    </div>
  ) : null;

  return (
    <UnifiedLayout 
      title={title} 
      subtitle={subtitle} 
      navItems={TEACHER_NAV}
      headerActions={headerActions}
    >
      <Outlet context={{ course, setCourse, currentLecture, setCurrentLecture, loading }} />
    </UnifiedLayout>
  );
};

export default TeacherLayout;
