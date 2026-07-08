import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import PendingPageSkeleton from '../../components/skeletons/PendingPageSkeleton';
import '../auth/LoginPage.css';

const SetupInstitutionPage = () => {
  const navigate = useNavigate();
  const [collegeName, setCollegeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists() && snap.data().userType !== 'setup') {
            navigate('/');
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        navigate('/');
      }
    });
    return () => unsub();
  }, [navigate]);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!collegeName.trim()) {
      setError('Please enter an institution name.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        collegeName: collegeName.trim(),
        userType: 'admin'
      });
      // Once updated, redirecting to admin
      // Since userType changed, the app root will handle redirect if we go to '/'
      // but going to '/admin' directly is fine, but wait! We should trigger a full reload
      // or redirect to '/' so the global state picks up 'admin' role correctly.
      window.location.href = '/admin';
    } catch (err) {
      console.error(err);
      setError('Failed to setup institution. ' + err.message);
      setLoading(false);
    }
  };

  if (!user) return <PendingPageSkeleton />;

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title" style={{ fontSize: '2.5rem' }}>Institution Setup</h1>
        <p className="login-subtitle">
          Welcome! Please register your institution's name to set up your administrative workspace.
        </p>

        {error && <div className="liquid-error">{error}</div>}

        <form onSubmit={handleSetup} className="login-form">
          <input
            className="login-input"
            type="text"
            placeholder="e.g. K.J. Somaiya Institute of Technology"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            required
          />
          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? 'Processing...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupInstitutionPage;
