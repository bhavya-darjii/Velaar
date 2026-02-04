import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { gradeStudentAnswer } from '../aiService';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [syllabus, setSyllabus] = useState("");
  const [loadingSyllabus, setLoadingSyllabus] = useState(true);

  // Exam States
  const [assignedQuestion, setAssignedQuestion] = useState(""); 
  const [studentAnswer, setStudentAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState(null);

  // 1. Fetch Syllabus from Firebase
  useEffect(() => {
    const fetchSyllabus = async () => {
      try {
        const docRef = doc(db, "content", "syllabus");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSyllabus(docSnap.data().text);
        } else {
          setSyllabus("No syllabus set by the teacher yet.");
        }
      } catch (error) {
        console.error("Error:", error);
      }
      setLoadingSyllabus(false);
    };
    fetchSyllabus();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  // Simple Question Bank (You can move this to Firebase later too!)
  const questionBank = [
    "Explain the core concept of the topic in your own words.",
    "What are the most critical points mentioned in the text?",
    "Summarize the conclusion of the syllabus provided.",
    "How would you explain this topic to a beginner?",
    "Identify the key problem discussed in the text."
  ];

  const assignRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * questionBank.length);
    setAssignedQuestion(questionBank[randomIndex]);
    setStudentAnswer("");
    setResult(null); 
  };

  const handleGrading = async () => {
    if (!studentAnswer) return alert("Please type an answer!");
    setIsGrading(true);
    setResult(null);
    
    // AI Call
    const data = await gradeStudentAnswer(syllabus, assignedQuestion, studentAnswer);
    
    setResult(data);
    setIsGrading(false);
  };

  return (
    <div className="exam-container student-mode">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 className="header" style={{ fontSize: '2rem', marginBottom: 0, textAlign: 'left' }}>Student Exam</h1>
           <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
             User: {auth.currentUser?.email?.split('@')[0]}
           </p>
        </div>
        <button className="btn secondary" style={{ flex: '0 0 auto', padding: '10px 20px' }} onClick={handleLogout}>
          Exit
        </button>
      </div>

      {/* Main Exam Card */}
      <div className="card">
        {loadingSyllabus ? (
           <p style={{textAlign: 'center'}}>Loading Class Content...</p>
        ) : !assignedQuestion ? (
          <div className="start-area">
            <h2 className="section-title" style={{ fontSize: '1.2rem', color: 'white' }}>Ready?</h2>
            <p style={{ marginBottom: '20px', color: 'rgba(255,255,255,0.8)' }}>
              The AI has reviewed the teacher's syllabus. Click below to get your first question.
            </p>
            <button className="btn" onClick={assignRandomQuestion}>
              🎲 Start Exam
            </button>
          </div>
        ) : (
          <>
            <div className="question-box">
              <strong>Question:</strong> {assignedQuestion}
            </div>
            
            <textarea 
              value={studentAnswer}
              onChange={(e) => {
                setStudentAnswer(e.target.value);
                if (result) setResult(null); 
              }}
              placeholder="Type your answer here..."
            />

            <div className="button-group">
              <button className="btn" onClick={handleGrading} disabled={isGrading}>
                {isGrading ? "AI is Grading..." : "Submit Answer"}
              </button>
              <button className="btn secondary" onClick={assignRandomQuestion}>
                Skip Question
              </button>
            </div>
          </>
        )}
      </div>

      {/* Result Section */}
      {result && (
        <div className="card result-box">
          <div className="section-title">AI Feedback</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
             <h2 className="score-display" style={{ margin: 0 }}>{result.score}/10</h2>
             <span style={{ color: 'rgba(255,255,255,0.7)' }}>
               {result.score >= 7 ? "Great Job! 🎉" : "Needs Improvement 📚"}
             </span>
          </div>
          <p className="feedback-text">{result.feedback}</p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;