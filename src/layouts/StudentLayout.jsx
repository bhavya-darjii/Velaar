import { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { STUDENT_NAV } from '../config/navigation';
import UnifiedLayout from './UnifiedLayout';

const GREETINGS = [
  "Let's crush some goals!",
  "Ready to level up?",
  "Boost that attendance today!",
  "Keep your grades climbing!",
  "Time for a study sprint!",
  "Let's make today count!",
  "Focus up, you got this!",
  "Don't skip those classes!",
  "Push for that A grade!",
  "Every lecture counts!",
  "Learning looks good on you!",
  "Stay curious, stay sharp!",
  "Let's unlock new achievements!",
  "Small steps, big results!"
];

const StudentLayout = () => {
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Student");
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        let name = "Student";
        if (user.displayName) {
          name = user.displayName.split(' ')[0];
        } else {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const fullName = userDoc.data().fullName || userDoc.data().name || "Student";
            name = fullName.split(' ')[0];
          }
        }
        setStudentName(name);
      } catch (error) {
        console.error("Error fetching name:", error);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="velaar-page-shell"><div className="skeleton-base" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px' }} /></div>;
  }

  return (
    <UnifiedLayout 
      title={`Welcome, ${studentName}`} 
      subtitle={greeting} 
      navItems={STUDENT_NAV}
      showSignOut={false}
      isStudent={true}
    />
  );
};

export default StudentLayout;
