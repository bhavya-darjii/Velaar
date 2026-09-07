import { useState, useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import AuthLoadingScreen from '../shared/AuthLoadingScreen';
import NotFoundPage from '../../pages/shared/NotFoundPage';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  fallback?: ReactNode;
}

const ROLE_PATHS: Record<string, string> = {
  admin:          '/admin',
  student:        '/student',
  hod:            '/hod',
  registrar:      '/registrar',
  setup:          '/setup',
  velaarAdmin:    '/velaar-admin',
  examController: '/exam-controller',
  parent:         '/parent',
  teacher:        '/teacher',
  pending:        '/pending',
};

const ProtectedRoute = ({ children, allowedRoles, fallback }: ProtectedRouteProps) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  // null = not authenticated, false = wrong role, User object = authenticated & authorized
  const [user, setUser] = useState<object | null | false>(undefined as unknown as null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async (session: { user?: { id: string } } | null) => {
      if (session?.user) {
        if (allowedRoles && allowedRoles.length > 0) {
          try {
            const { data: userDoc } = await supabase
              .from('users')
              .select('user_type')
              .eq('id', session.user.id)
              .single();

            if (userDoc) {
              const role = (userDoc as { user_type: string }).user_type;
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
          } catch {
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
      if (mounted) {
        setLoading(false);
        setInitialized(true);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAuth(session as Parameters<typeof checkAuth>[0]);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAuth(session as Parameters<typeof checkAuth>[0]);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [allowedRoles]);

  // Show skeleton while role is being verified — no blank screen
  if (loading || !initialized) return fallback ?? <AuthLoadingScreen />;

  // Not authenticated — redirect to login via React Router (no full-page reload)
  if (user === null) {
    return <Navigate to="/" replace />;
  }

  // Wrong role — show access restricted / page not found fallback
  if (user === false) {
    if (userRole && userRole !== 'pending' && ROLE_PATHS[userRole] && (location.pathname === '/pending' || location.pathname.startsWith('/pending/'))) {
      return <Navigate to={ROLE_PATHS[userRole]} replace />;
    }
    return <NotFoundPage userRole={userRole} isAccessDenied={true} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
