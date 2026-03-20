import { useNavigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';

import './LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  
  // Prevent logged-in users from seeing the login page
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const role = userSnap.data().userType;
          if (role === 'teacher') navigate('/teacher');
          else if (role === 'admin') navigate('/admin');
          else navigate('/student');
        } else {
          navigate('/teacher'); // default
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");

    try {
      let user;
      if (isSignUp) {
        // Sign Up Logic
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
        
        // Save Name, Email, and Role to Firestore
        await setDoc(doc(db, "users", user.uid), {
          fullName: name, // Saving the name here
          email: user.email,
          userType: 'teacher', // Changed default from student to teacher
          createdAt: new Date()
        });
        navigate('/teacher');
      } else {
        // Login Logic
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const role = userSnap.data().userType;
          if (role === 'teacher') navigate('/teacher');
          else if (role === 'admin') navigate('/admin');
          else navigate('/student');
        } else {
          navigate('/student');
        }
      }
    } catch (error) {
      console.error("Auth Error:", error);
      let errorMsg = "Authentication failed. Please try again.";
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMsg = "Incorrect email or password. Please try again.";
          break;
        case 'auth/email-already-in-use':
          errorMsg = "An account already exists with this email address.";
          break;
        case 'auth/weak-password':
          errorMsg = "Your password must be at least 6 characters long.";
          break;
        case 'auth/invalid-email':
          errorMsg = "Please enter a valid email address.";
          break;
        case 'auth/too-many-requests':
          errorMsg = "Too many failed attempts. Please try again later.";
          break;
      }
      setAuthError(errorMsg);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <h1 className="login-title">Velaar</h1>
        <p className="login-subtitle">
          {isSignUp ? "Create your account to get started" : "Welcome back, please login"}
        </p>

        {authError && (
          <div className="liquid-error">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} className="login-form">
          {/* NEW: Conditional Name Field */}
          {isSignUp && (
            <input 
              className="login-input"
              type="text" 
              placeholder="Full Name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input 
            className="login-input"
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <input 
            className="login-input"
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Login")}
          </button>
        </form>

        <div className="login-footer">
          {isSignUp ? "Already have an account?" : "New to Velaar?"}
          <span 
            className="login-link"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setName(""); // Clear name if they switch back to login
              setAuthError(""); // Clear errors on tab switch
            }}
          >
            {isSignUp ? "Login here" : "Create Account"}
          </span>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;