import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AuthLoadingScreen from '../shared/AuthLoadingScreen';


const ProtectedRoute = ({ children, allowedRoles, fallback }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async (session) => {
      if (session?.user) {
        if (allowedRoles && allowedRoles.length > 0) {
          try {
            const { data: userDoc } = await supabase
              .from('users')
              .select('user_type')
              .eq('id', session.user.id)
              .single();
              
            if (userDoc) {
              const role = userDoc.user_type;
              if (mounted) {
                setUserRole(role);
                setUser(allowedRoles.includes(role) ? session.user : false);
              }
            } else {
              if (mounted) {
                 setUserRole('pending');
                 setUser(allowedRoles.includes('pending') ? session.user : false);
              }
            }
          } catch(e) {
            if (mounted) {
              setUserRole('pending');
              setUser(allowedRoles.includes('pending') ? session.user : false);
            }
          }
        } else {
          if (mounted) setUser(session.user);
        }
      } else {
        if (mounted) setUser(null);
      }
      if (mounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuth(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuth(session);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [allowedRoles]);

  // Show the appropriate skeleton while role is being verified — no blank screen.
  if (loading) return fallback ?? <AuthLoadingScreen />;

  if (user === null) {
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
    return null;
  }

  if (user === false) {
    let dashboardPath = '/';
    if (userRole === 'admin')           dashboardPath = '/admin';
    else if (userRole === 'student')    dashboardPath = '/student';
    else if (userRole === 'hod')        dashboardPath = '/hod';
    else if (userRole === 'registrar')  dashboardPath = '/registrar';
    else if (userRole === 'setup')      dashboardPath = '/setup';
    else if (userRole === 'velaarAdmin')    dashboardPath = '/velaar-admin';
    else if (userRole === 'examController') dashboardPath = '/exam-controller';
    else if (userRole === 'parent')         dashboardPath = '/parent';
    else if (userRole === 'teacher')    dashboardPath = '/teacher';
    else if (userRole === 'pending')    dashboardPath = '/pending';
    
    // Force a full reload to reset App.jsx auth state and prevent infinite redirect loops
    if (window.location.pathname !== dashboardPath) {
      window.location.href = dashboardPath;
    }
    return null;
  }

  return children;
};

export default ProtectedRoute;
