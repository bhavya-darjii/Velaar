/* eslint-disable */
// @ts-nocheck
import './AuthLoadingScreen.css';

const AuthLoadingScreen = () => {
  return (
    <div className="auth-loading-container">
      <div className="auth-loading-card liquid-glass">
        <div className="auth-spinner-wrapper">
          <div className="auth-spinner"></div>
        </div>
        <h2 className="auth-loading-title">Getting Things Ready...</h2>
        <p className="auth-loading-subtitle">Please wait while we prepare your dashboard.</p>
      </div>
    </div>
  );
};

export default AuthLoadingScreen;

