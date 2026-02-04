import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [syllabus, setSyllabus] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Load existing syllabus from Firebase on startup
  useEffect(() => {
    const fetchSyllabus = async () => {
      try {
        const docRef = doc(db, "content", "syllabus"); // "content" is collection, "syllabus" is doc ID
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSyllabus(docSnap.data().text);
        }
      } catch (error) {
        console.error("Error loading syllabus:", error);
      }
    };
    fetchSyllabus();
  }, []);

  // 2. Save function
  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "content", "syllabus"), {
        text: syllabus,
        updatedAt: new Date(),
        updatedBy: auth.currentUser.email
      });
      alert("✅ Syllabus updated successfully!");
    } catch (error) {
      alert("Error saving: " + error.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    // We add 'teacher-mode' class to change the color scheme slightly
    <div className="exam-container teacher-mode">
      
      {/* Header with Logout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="header" style={{ fontSize: '2rem', marginBottom: 0, textAlign: 'left' }}>Teacher Panel</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Configure the exam content</p>
        </div>
        <button className="btn secondary" style={{ flex: '0 0 auto', padding: '10px 20px' }} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Main Edit Card */}
      <div className="card">
        <div className="section-title">Current Syllabus</div>
        <p style={{ color: '#eee', marginBottom: '15px', fontSize: '0.9rem' }}>
          Paste the chapter text, article, or notes below. The AI will use this to grade all student answers.
        </p>
        
        <textarea 
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          placeholder="e.g. Photosynthesis is the process used by plants..."
          style={{ minHeight: '300px' }}
        />
        
        <button className="btn" onClick={handleSave} disabled={loading}>
          {loading ? "Saving to Cloud..." : "💾 Save Syllabus Live"}
        </button>
      </div>

    </div>
  );
};

export default TeacherDashboard;