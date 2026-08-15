/* eslint-disable */
// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './PendingPage.css';
import '../auth/LoginPage.css'; // inherit liquid-glass styles

const PendingPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="pending-container">
      <div className="pending-card liquid-glass">
        <div className="pending-icon-wrapper">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h1 className="pending-title">Account Pending</h1>
        <p className="pending-subtitle">
          Welcome to Velaar. Your account has been created successfully, but we are currently waiting for your institution to assign you a role and add you to their workspace.
        </p>
        <p className="pending-contact">
          Please contact your Institution Administrator or check back later.
        </p>
        <button className="liquid-btn pending-logout-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default PendingPage;

