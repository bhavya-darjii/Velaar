import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { signOut } from "firebase/auth";
import { doc, getDocs, collection, getDoc } from "firebase/firestore";
import { gradeFullExam } from "../services/aiService";
import "./StudentDashboard.css";

const StudentDashboard = () => {
  const navigate = useNavigate();

  // --- Data States ---
  const [fullName, setFullName] = useState("");
  const [availableExams, setAvailableExams] = useState([]); // List of teachers/syllabi
  const [selectedExamId, setSelectedExamId] = useState(""); // Selected Teacher's Name
  const [loading, setLoading] = useState(true);

  // --- Exam States ---
  const [syllabus, setSyllabus] = useState(""); // The content for grading
  const [examQuestions, setExamQuestions] = useState([]); // The subset of questions for this student
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answersArray, setAnswersArray] = useState([]);

  // --- Status States ---
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isExamFinished, setIsExamFinished] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  useEffect(() => {
    // Use onAuthStateChanged to wait for the user to be fully loaded
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setLoading(true);
        try {
          // 1. Fetch User Profile
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            setFullName(userSnap.data().fullName);
          }

          // 2. Fetch Syllabi
          const querySnapshot = await getDocs(collection(db, "syllabus"));
          const examsList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAvailableExams(examsList);
        } catch (error) {
          console.error("Fetch Error:", error);
        }
        setLoading(false);
      } else {
        // If no user is found, redirect to login
        console.log("No user detected, redirecting...");
        navigate("/");
      }
    });

    // Cleanup the listener on unmount
    return () => unsubscribe();
  }, [navigate]);

  const handleStartExam = async () => {
    if (!selectedExamId) return alert("Please select an exam first.");

    // Find the selected exam data
    const selectedData = availableExams.find((ex) => ex.id === selectedExamId);

    if (!selectedData || !selectedData.questionPool) {
      return alert("Exam data is incomplete.");
    }

    setSyllabus(selectedData.content);

    // LOGIC: Randomize and Slice for student variety
    // 1. Get the pool
    const pool = selectedData.questionPool;
    // 2. Shuffle
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    // 3. Slice to the specific exam length defined by teacher
    const examLength = selectedData.examLength || 5;
    const studentQuestions = shuffled.slice(0, examLength);

    setExamQuestions(studentQuestions);
    setIsExamStarted(true);
  };

  const handleNextQuestion = async () => {
    if (!currentAnswer.trim()) return alert("Please answer before proceeding.");

    const newAnswerEntry = {
      question: examQuestions[currentIndex],
      answer: currentAnswer,
    };
    const updatedAnswers = [...answersArray, newAnswerEntry];
    setAnswersArray(updatedAnswers);

    setCurrentAnswer("");

    if (currentIndex < examQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsExamFinished(true);
      processFinalGrading(updatedAnswers, syllabus); // Pass syllabus explicitly
    }
  };

  const processFinalGrading = async (finalAnswers, syllabusText) => {
    setIsGrading(true);
    try {
      const result = await gradeFullExam(syllabusText, finalAnswers);
      setFinalResult(result);
    } catch (err) {
      console.error("Grading error:", err);
      alert("AI Grading failed.");
    }
    setIsGrading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (loading) return <div className="loading-screen">Loading Portal...</div>;

  return (
    <div className="student-container">
      <div className="student-header-section">
        <div>
          <h1 className="student-header">Welcome, {fullName || "Student"}</h1>
          <p className="student-subtext">All the Best for your Test!</p>
        </div>
        <button className="student-exit-btn" onClick={handleLogout}>
          Exit
        </button>
      </div>

      <div className="student-card">
        {/* PHASE 1: SELECTION */}
        {!isExamStarted && (
          <div className="start-area">
            <h2 className="student-label">Select An Exam</h2>

            <select
              className="student-select" // Add styling for this
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
            >
              <option value="">-- Choose a Teacher/Subject --</option>
              {availableExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.id} ({exam.examLength} Questions)
                </option>
              ))}
            </select>

            <button
              className="student-btn"
              onClick={handleStartExam}
              disabled={!selectedExamId}
            >
              Start Exam
            </button>
          </div>
        )}

        {/* PHASE 2: EXAM */}
        {isExamStarted && !isExamFinished && (
          <>
            <div className="exam-progress">
              <span>
                Question {currentIndex + 1} of {examQuestions.length}
              </span>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${((currentIndex + 1) / examQuestions.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="question-box">
              <span className="q-label">QUESTION {currentIndex + 1}</span>
              <p className="q-text">{examQuestions[currentIndex]}</p>
            </div>

            <textarea
              className="student-textarea"
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
            />

            <div className="student-btn-group">
              <button className="student-btn" onClick={handleNextQuestion}>
                {currentIndex === examQuestions.length - 1
                  ? "Finish Exam"
                  : "Next Question"}
              </button>
            </div>
          </>
        )}

        {/* PHASE 3: RESULTS (0-10 Scale) */}
        {isExamFinished && (
          <div className="result-area">
            {isGrading ? (
              <div className="grading-loader">
                <h2 className="student-label">Grading in progress...</h2>
                <p>Analyzing your answers against the syllabus.</p>
              </div>
            ) : finalResult ? (
              /* Inside StudentDashboard.jsx - Phase 3 Area */

              <div className="result-card">
                <div className="student-label">Final Score</div>

                <div className="score-container">
                  {/* Display Score out of 10 */}
                  <h2 className="score-val">{finalResult.score}/10</h2>

                  {/* Logic: Pass if score is 4 or higher */}
                  <div
                    className={`score-tag ${finalResult.score >= 4 ? "pass" : "fail"}`}
                  >
                    {finalResult.score >= 4 ? "PASS" : "RETRY"}
                  </div>
                </div>

                <p className="feedback-text">{finalResult.feedback}</p>

                <button
                  className="student-btn"
                  onClick={() => window.location.reload()}
                >
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <p>Error displaying results.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
