import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import './AppShell.css';

const AppShell = ({
  title,
  subtitle,
  navItems = [],
  headerActions,
  children,
  showSignOut = true,
  className = '',
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
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  return (
    <div className={`app-shell ${className}`}>
      <div
        className={`app-shell__overlay ${sidebarOpen ? 'app-shell__overlay--open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <nav className={`app-shell__sidebar ${sidebarOpen ? 'app-shell__sidebar--open' : ''}`}>
        <div className="app-shell__sidebar-top">
          <span className="app-shell__brand">Velaar</span>
          <button
            type="button"
            className="app-shell__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <ul className="app-shell__nav">
          {navItems.map((item) => (
            <li
              key={item.path}
              className={`app-shell__nav-item ${isActive(item.path) ? 'app-shell__nav-item--active' : ''} ${item.highlight ? 'app-shell__nav-item--highlight' : ''}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              {item.icon && <span className="app-shell__nav-icon">{item.icon}</span>}
              {item.label}
            </li>
          ))}
        </ul>
      </nav>

      <div className="app-shell__main velaar-page-shell">
        <header className={`app-shell__header ${!title && !subtitle ? 'app-shell__header--minimal' : ''}`}>
          <div className="app-shell__header-left">
            <button
              type="button"
              className="app-shell__hamburger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <span /><span /><span />
            </button>
            <div>
              {title && <h1 className="app-shell__title">{title}</h1>}
              {subtitle && <p className="app-shell__subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="app-shell__header-actions">
            {headerActions}
            {showSignOut && (
              <button type="button" className="glass-btn glass-btn--ghost" onClick={handleSignOut}>
                Sign Out
              </button>
            )}
          </div>
        </header>

        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
