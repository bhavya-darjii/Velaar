/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { claimRoleInvite } from '../../services/adminService';
import './PendingPage.css';
import '../auth/LoginPage.css'; // inherit liquid-glass styles

const ROLE_REDIRECTS = {
  teacher:        '/teacher',
  admin:          '/admin',
  hod:            '/hod',
  registrar:      '/registrar',
  setup:          '/setup',
  velaarAdmin:    '/velaar-admin',
  examController: '/exam-controller',
  parent:         '/parent',
  student:        '/student',
};

const PendingPage = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const checkStatus = async (showFeedback = false) => {
    setChecking(true);
    if (showFeedback) setStatusMessage('Checking approval status and invitations...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/');
        return;
      }
      if (session.user.email) {
        setUserEmail(session.user.email);
      }

      // 1. Claim any pending role invitation matching email
      const claimResult = await claimRoleInvite();
      if (claimResult.success && claimResult.role && claimResult.role !== 'pending') {
        const dest = ROLE_REDIRECTS[claimResult.role] || '/';
        localStorage.setItem('cachedUserRole', claimResult.role);
        navigate(dest);
        return;
      }

      // 2. Check users table directly in case role was updated directly by admin
      const { data: userDoc } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', session.user.id)
        .single();

      if (userDoc?.user_type && userDoc.user_type !== 'pending') {
        const dest = ROLE_REDIRECTS[userDoc.user_type] || '/';
        localStorage.setItem('cachedUserRole', userDoc.user_type);
        navigate(dest);
        return;
      }

      if (showFeedback) {
        setStatusMessage('Your account is still pending approval. Please check back after an administrator has assigned your role.');
      }
    } catch (err) {
      console.error('Error checking pending status:', err);
      if (showFeedback) {
        setStatusMessage('Unable to verify status at this moment. Please try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus(false);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('cachedUserRole');
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
          Welcome to Velaar{userEmail ? `, ${userEmail}` : ''}. Your account has been created successfully, but we are currently waiting for your institution to assign you a role and add you to their workspace.
        </p>
        <p className="pending-contact">
          Please contact your Institution Administrator or check back later.
        </p>

        {statusMessage && (
          <div className="pending-status-pill">
            {statusMessage}
          </div>
        )}

        <div className="pending-action-group">
          <button 
            className="liquid-btn pending-check-btn" 
            onClick={() => checkStatus(true)}
            disabled={checking}
          >
            {checking ? 'Checking...' : 'Check Approval Status'}
          </button>
          <button className="liquid-btn pending-logout-btn" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingPage;
