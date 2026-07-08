import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import GenericDashboardSkeleton from "../../components/skeletons/GenericDashboardSkeleton";
import "./RegistrarDashboard.css";

const RegistrarDashboard = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setLoading(true);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            setFullName(userSnap.data().fullName);
          }
        } catch (error) {
          console.error("Fetch Error:", error);
        }
        setLoading(false);
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) return <GenericDashboardSkeleton />;

  return (
    <div className="registrar-container">
      <div className="registrar-header-section">
        <div>
          <h1 className="registrar-header">Welcome, {fullName || "Registrar"}</h1>
          <p className="registrar-subtext">University Administration Hub</p>
        </div>
        <button className="registrar-exit-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      <div className="registrar-dashboard-grid">
        <div className="registrar-card">
          <div className="registrar-icon" style={{ color: '#ffffff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <h2 className="registrar-card-title">Academic Calendar</h2>
          <p>Manage semesters, exam dates, and college holidays.</p>
          <button className="registrar-btn">Configure Calendar</button>
        </div>
        <div className="registrar-card">
          <div className="registrar-icon" style={{ color: '#ffffff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
          </div>
          <h2 className="registrar-card-title">Transcripts & Records</h2>
          <p>Generate secure, official transcripts and grade cards for students.</p>
          <button className="registrar-btn">Generate Reports</button>
        </div>
        <div className="registrar-card">
          <div className="registrar-icon" style={{ color: '#ffffff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <h2 className="registrar-card-title">User Management</h2>
          <p>Directory of all HODs, teachers, and students across all departments.</p>
          <button className="registrar-btn">Open Directory</button>
        </div>
      </div>
    </div>
  );
};

export default RegistrarDashboard;
