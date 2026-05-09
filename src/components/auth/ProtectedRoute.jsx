import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import FullLayoutSkeleton from '../skeletons/FullLayoutSkeleton';


const ProtectedRoute = ({ children, allowedRoles, fallback }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (allowedRoles && allowedRoles.length > 0) {
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
              const role = userDoc.data().userType;
              if (allowedRoles.includes(role)) {
                setUser(currentUser);
              } else {
                setUser(false);
              }
            } else {
               setUser(currentUser);
            }
          } catch(e) {
            setUser(currentUser);
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
  if (loading) return fallback ?? <FullLayoutSkeleton />;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
