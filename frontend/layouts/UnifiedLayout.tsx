/* eslint-disable */
// @ts-nocheck
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import './UnifiedLayout.css';

const UnifiedLayout = ({ 
  children, 
  title, 
  subtitle, 
  navItems = [], 
  headerActions = null,
  showSignOut = true,
  isStudent = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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
    <div className={`unified-layout ${isStudent ? 'student-layout' : ''}`}>
      {/* Sidebar Overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      
      {/* Sidebar Navigation */}
      <nav className={`unified-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
        
        <ul className="sidebar-links">
          {(() => {
            const hasCategories = navItems.some(item => item.category);
            const normalItems = navItems.filter(item => !item.highlight);
            const highlightItems = navItems.filter(item => item.highlight);
            
            if (!hasCategories) {
              return navItems.map((item) => (
                <li
                  key={item.path}
                  className={`${isActive(item.path) ? 'active' : ''} ${item.highlight ? 'highlight-item' : ''}`}
                  onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                >
                  {item.label}
                </li>
              ));
            }

            const grouped = normalItems.reduce((acc, item) => {
              const cat = item.category || 'Other';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {});

            return (
              <>
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="nav-group">
                    <span className="nav-group-label">{category}</span>
                    {items.map((item) => (
                      <li
                        key={item.path}
                        className={`${isActive(item.path) ? 'active' : ''}`}
                        onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                      >
                        {item.label}
                      </li>
                    ))}
                  </div>
                ))}
                
                {highlightItems.map((item) => (
                  <li
                    key={item.path}
                    className={`highlight-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  >
                    {item.label}
                  </li>
                ))}
              </>
            );
          })()}
          {showSignOut && (
            <li
              className="sign-out-item"
              onClick={handleSignOut}
              style={{ marginTop: !navItems.some(item => item.category) ? 'auto' : '0', color: '#ef4444' }}
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
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="18" height="2" rx="1" fill="currentColor"/>
                <rect x="0" y="6" width="18" height="2" rx="1" fill="currentColor"/>
                <rect x="0" y="12" width="18" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
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

