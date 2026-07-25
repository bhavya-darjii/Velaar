import { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { STUDENT_NAV } from '../config/navigation';
import UnifiedLayout from './UnifiedLayout';

const StudentLayout = () => {
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Student");

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
      subtitle="All the Best for your Test!" 
      navItems={STUDENT_NAV}
    />
  );
};

export default StudentLayout;
