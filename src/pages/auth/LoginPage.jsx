import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useState, useEffect } from 'react';

import './LoginPage.css';

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
  pending:        '/pending',
};

const redirectByRole = (role, navigate) => {
  navigate(ROLE_REDIRECTS[role] || '/');
};

const LoginPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Prevent logged-in users from seeing the login page
  useEffect(() => {
    let mounted = true;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && mounted) {
        setLoading(true);
        supabase.from('users').select('user_type').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data && mounted) {
              redirectByRole(data.user_type, navigate);
            }
          })
          .catch((err) => console.error("Error fetching user data:", err))
          .finally(() => {
            if (mounted) setLoading(false);
          });
      }
    });

    return () => { mounted = false; };
  }, [navigate]);

  // ── SSO Handler (Google or Microsoft) ────────────────────
  const handleSSO = async (providerName) => {
    setLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: providerName.toLowerCase() === 'microsoft' ? 'azure' : 'google'
      });
      if (error) throw error;
      // Note: Supabase OAuth automatically redirects to the provider and back to the site.
      // Profile creation and role handling are done by PostgreSQL triggers and App.jsx.
    } catch (error) {
      console.error('SSO Error details:', error);
      setAuthError(`${providerName} sign-in failed: ${error.message}`);
      setLoading(false);
    }
  };

  // ── Email/Password Handler ──────────────────────────────
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      let authError;
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        authError = error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        authError = error;
      }
      
      if (authError) throw authError;

      // On success, App.jsx's onAuthStateChange will handle the redirect.
    } catch (error) {
      console.error('Email Auth Error:', error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card liquid-glass">
        <h1 className="login-title">Velaar</h1>
        <p className="login-subtitle">
          Sign in to your institutional portal
        </p>

        {authError && <div className="liquid-error">{authError}</div>}

        <form onSubmit={handleEmailAuth} className="email-login-form">
          <input 
            type="email" 
            placeholder="Institutional Email" 
            className="liquid-input" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="liquid-input" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="liquid-btn primary-btn" disabled={loading}>
            {loading ? 'Authenticating...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="sso-buttons-container">
          <button
            className="sso-btn sso-btn--google liquid-btn"
            type="button"
            disabled={loading}
            onClick={() => handleSSO('Google')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            className="sso-btn sso-btn--microsoft liquid-btn"
            type="button"
            disabled={loading}
            onClick={() => handleSSO('Microsoft')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
              <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
              <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
              <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
            </svg>
            <span>Continue with Microsoft</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
