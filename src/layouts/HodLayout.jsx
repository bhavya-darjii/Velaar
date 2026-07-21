import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { HOD_NAV } from '../config/navigation';
import './TeacherLayout.css'; // Reusing TeacherLayout CSS

const HodLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
          {HOD_NAV.map((item) => (
            <li
              key={item.path}
              className={`${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </nav>

      {/* Main Content Area */}
      <div className="main-content velaar-page-shell">
        <header className="dash-header">
          {loading ? (
             <div className="header-left">
               <div className="skeleton-base" style={{ width: '44px', height: '44px', borderRadius: '12px', marginRight: '35px', flexShrink: 0 }} />
               <div>
                 <div className="skeleton-base" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px' }} />
                 <div className="skeleton-base" style={{ height: '19px', width: '200px', borderRadius: '6px' }} />
               </div>
             </div>
          ) : (
            <>
              <div className="header-left">
                <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
                <div>
                  <h1>Welcome back, {fullName || 'HOD'}</h1>
                  <p className="subtitle">{departmentName} · Department Overview</p>
                </div>
              </div>
            </>
          )}
        </header>

        {/* Dynamic Nested Route Content */}
        <div className="outlet-container">
          <Outlet context={{ loading, fullName, departmentName }} />
        </div>
      </div>
    </div>
  );
};

export default HodLayout;
