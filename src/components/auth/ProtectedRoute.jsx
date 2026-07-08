import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AuthLoadingScreen from '../shared/AuthLoadingScreen';


const ProtectedRoute = ({ children, allowedRoles, fallback }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (allowedRoles && allowedRoles.length > 0) {
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
              const role = userDoc.data().userType;
              setUserRole(role);
              if (allowedRoles.includes(role)) {
                setUser(currentUser);
              } else {
                setUser(false);
              }
            } else {
               setUserRole('pending');
               if (allowedRoles.includes('pending')) {
                 setUser(currentUser);
               } else {
                 setUser(false);
               }
            }
          } catch(e) {
            setUserRole('pending');
            if (allowedRoles.includes('pending')) {
              setUser(currentUser);
            } else {
              setUser(false);
            }
          }
        } else {
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
