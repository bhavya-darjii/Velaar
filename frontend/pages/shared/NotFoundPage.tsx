/* eslint-disable */
// @ts-nocheck
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const ROLE_PATHS: Record<string, string> = {
  admin: '/admin',
  student: '/student',
  hod: '/hod',
  registrar: '/registrar',
  setup: '/setup',
  velaarAdmin: '/velaar-admin',
  examController: '/exam-controller',
  parent: '/parent',
  teacher: '/teacher',
  principal: '/principal',
  pending: '/pending',
};

interface NotFoundPageProps {
  userRole?: string | null;
  isAccessDenied?: boolean;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ userRole, isAccessDenied = false }) => {
  const navigate = useNavigate();
  const [cachedRole, setCachedRole] = React.useState<string | null>(userRole || null);

  useEffect(() => {
    if (!cachedRole) {
      const stored = localStorage.getItem('cachedUserRole');
      if (stored) {
        setCachedRole(stored);
      } else {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase.from('users').select('user_type').eq('id', user.id).single().then(({ data }) => {
              if (data?.user_type) setCachedRole(data.user_type);
            });
          }
        });
      }
    }
  }, [cachedRole]);

  const homePath = (cachedRole && ROLE_PATHS[cachedRole]) || '/';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      zIndex: 50
    }}>
      <div className="glass-card" style={{
        maxWidth: '500px',
        width: '100%',
        height: 'auto',
        maxHeight: 'fit-content',
        alignSelf: 'center',
        padding: '54px 42px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        borderRadius: '26px',
        boxSizing: 'border-box'
      }}>
        {/* Icon */}
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Badge */}
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          color: 'rgba(255, 255, 255, 0.6)',
          background: 'rgba(255, 255, 255, 0.07)',
          padding: '4px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {isAccessDenied ? '403 · Access Restricted' : '404 · Page Not Found'}
        </span>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.75rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.5px'
          }}>
            {isAccessDenied ? 'Access Restricted' : 'Page Not Found'}
          </h1>
          <p style={{
            margin: 0,
            fontSize: '0.92rem',
            lineHeight: 1.5,
            color: 'rgba(255, 255, 255, 0.65)'
          }}>
            {isAccessDenied
              ? "You don't have the required permissions to access this page."
              : "The page you're looking for doesn't exist, has been moved, or is not accessible."}
          </p>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%'
        }}>
          <button
            className="glass-btn"
            onClick={() => navigate(-1)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#ffffff',
              padding: '10px 22px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>

          <button
            className="glass-btn"
            onClick={() => navigate(homePath, { replace: true })}
            style={{
              background: '#ffffff',
              color: '#000000',
              border: '1px solid #ffffff',
              padding: '10px 24px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
