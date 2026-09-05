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
    // For root paths like /teacher, only exact match.
    // For sub-paths like /teacher/examination, allow prefix matching.
    const pathSegments = path.split('/').filter(Boolean);
    if (pathSegments.length > 1 && location.pathname.startsWith(path + '/')) {
      return true;
    }
    return false;
  };

  /**
   * Handle nav link click.
   * Let Ctrl/Cmd/Shift/middle-button clicks pass through natively to the <a>,
   * so the browser can open a new tab. Only intercept plain left-clicks to
   * keep React Router SPA navigation (no full page reload).
   */
  const handleNavClick = (e, path) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    navigate(path);
    setSidebarOpen(false);
  };

  const hasCategories = navItems.some(item => item.category);
  const normalItems = navItems.filter(item => !item.highlight);
  const highlightItems = navItems.filter(item => item.highlight);

  const grouped = hasCategories
    ? normalItems.reduce((acc, item) => {
        const cat = item.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {})
    : {};

  // Determine if the current route has a hierarchical back destination
  const getBackDestination = () => {
    const path = location.pathname;

    // Student Lecture Vault: viewing specific subject -> back to /student/lecture-vault
    if (path.startsWith('/student/lecture-vault/') && path !== '/student/lecture-vault') {
      return '/student/lecture-vault';
    }

    // Teacher Edit Marks: editing an exam -> back to /teacher/marks/edit
    if (path.startsWith('/teacher/marks/edit/') && path !== '/teacher/marks/edit') {
      return '/teacher/marks/edit';
    }

    // Teacher Marks Dashboard: exam selection view -> back to /teacher/marks
    if (path === '/teacher/marks/edit') {
      return '/teacher/marks';
    }

    // Teacher Question Papers / Examination Editor -> back to /teacher/examination
    if (path.startsWith('/teacher/examination/') && path !== '/teacher/examination') {
      return '/teacher/examination';
    }

    return null;
  };

  const backDestination = getBackDestination();
  const isBackMode = Boolean(backDestination);

  const handleMenuClick = () => {
    if (backDestination) {
      navigate(backDestination);
    } else {
      setSidebarOpen(true);
    }
  };

  return (
    <div className={`unified-layout ${isStudent ? 'student-layout' : ''}`}>
      {/* Sidebar Overlay for mobile */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar Navigation */}
      <nav className={`unified-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        <ul className="sidebar-links">
          {!hasCategories
            ? navItems.map((item) => (
                <li
                  key={item.path}
                  className={`${isActive(item.path) ? 'active' : ''} ${item.highlight ? 'highlight-item' : ''}`}
                >
                  <a
                    href={item.path}
                    className="sidebar-link-anchor"
                    onClick={(e) => handleNavClick(e, item.path)}
                  >
                    {item.label}
                  </a>
                </li>
              ))
            : (
              <>
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="nav-group">
                    <span className="nav-group-label">{category}</span>
                    {items.map((item) => (
                      <li
                        key={item.path}
                        className={`${isActive(item.path) ? 'active' : ''}`}
                      >
                        <a
                          href={item.path}
                          className="sidebar-link-anchor"
                          onClick={(e) => handleNavClick(e, item.path)}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </div>
                ))}

                {highlightItems.map((item) => (
                  <li
                    key={item.path}
                    className={`highlight-item ${isActive(item.path) ? 'active' : ''}`}
                  >
                    <a
                      href={item.path}
                      className="sidebar-link-anchor"
                      onClick={(e) => handleNavClick(e, item.path)}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </>
            )
          }

          {showSignOut && (
            <li
              className="sign-out-item"
              onClick={handleSignOut}
              style={{ marginTop: !hasCategories ? 'auto' : '0', color: '#ef4444' }}
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
            <button 
              className={`hamburger-btn ${isBackMode ? 'hamburger-btn--back' : ''}`} 
              onClick={handleMenuClick} 
              aria-label={isBackMode ? "Go back" : "Open menu"}
            >
              {isBackMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              ) : (
                <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="18" height="2" rx="1" fill="currentColor"/>
                  <rect x="0" y="6" width="18" height="2" rx="1" fill="currentColor"/>
                  <rect x="0" y="12" width="18" height="2" rx="1" fill="currentColor"/>
                </svg>
              )}
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
