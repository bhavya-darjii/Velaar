import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { HOD_NAV } from '../config/navigation';
import UnifiedLayout from './UnifiedLayout';

const HodLayout = () => {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [departmentName, setDepartmentName] = useState("Your Department");

  useEffect(() => {
    const initLayout = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFullName(data.fullName || data.name || "HOD");
          setDepartmentName(data.department || "Artificial Intelligence and Data Science");
        }
      } catch (error) {
        console.error("Error fetching HOD details:", error);
      }
      setLoading(false);
    };
    initLayout();
  }, []);

  if (loading) {
    return <div className="velaar-page-shell"><div className="skeleton-base" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px' }} /></div>;
  }

  return (
    <UnifiedLayout 
      title={`Welcome back, ${fullName || 'HOD'}`}
      subtitle={`${departmentName} · Department Overview`}
      navItems={HOD_NAV}
    >
      <Outlet context={{ loading, fullName, departmentName }} />
    </UnifiedLayout>
  );
};

export default HodLayout;
