/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import PendingPageSkeleton from '../../components/skeletons/PendingPageSkeleton';
import '../auth/LoginPage.css';

const SetupInstitutionPage = () => {
  const navigate = useNavigate();
  const [collegeName, setCollegeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/'); return; }
      setUser(session.user);
      try {
        const { data } = await supabase.from('users').select('user_type').eq('id', session.user.id).single();
        if (data && data.user_type !== 'setup') navigate('/');
      } catch (err) {
        console.error(err);
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/');
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
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
      await supabase.from('users').update({ college_name: collegeName.trim(), user_type: 'admin' }).eq('id', user.id);
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

