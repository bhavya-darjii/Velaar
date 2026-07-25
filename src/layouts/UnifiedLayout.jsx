import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import './UnifiedLayout.css';

const UnifiedLayout = ({
  title,
  subtitle,
  navItems = [],
  headerActions,
  children,
  showSignOut = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const isActive = (path) => {
    if (path === location.pathname) return true;
    
    // For root paths like /teacher or /student, only match exactly.
    // For sub-paths like /teacher/examination, allow prefix matching.
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length > 1 && location.pathname.startsWith(path + '/')) {
      return true;
    }
    return false;
  };

  return (
    <div className="unified-layout">
      {/* Sidebar Overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      
      {/* Sidebar Navigation */}
      <nav className={`unified-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        
        <ul className="sidebar-links">
          {navItems.map((item) => (
            <li
              key={item.path}
              className={`${isActive(item.path) ? 'active' : ''}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              {item.label}
            </li>
          ))}
          {showSignOut && (
            <li
              className="sign-out-item"
              onClick={handleSignOut}
              style={{ marginTop: 'auto', color: '#ef4444' }}
            >
              Sign Out
            </li>
          )}
        </ul>
      </nav>

      {/* Main Content Area */}
      <div className="main-content velaar-page-shell">
        <header className="dash-header">
          <div className="header-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>☰</button>
            <div className="header-text-block">
              {title && <h1>{title}</h1>}
              {subtitle && <p className="subtitle">{subtitle}</p>}
            </div>
          </div>
          {headerActions && (
            <div className="header-actions">
              {headerActions}
            </div>
          )}
        </header>

        {/* Dynamic Nested Route Content */}
        <div className="outlet-container">
          {children || <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default UnifiedLayout;
