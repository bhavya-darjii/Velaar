import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { doc, getDocs, collection, getDoc } from "firebase/firestore";
import { gradeFullExam } from "../../services/aiService";
import StudentDashboardSkeleton from "../../components/skeletons/StudentDashboardSkeleton";
import "./StudentDashboard.css";

const ExamPage = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [availableExams, setAvailableExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [loading, setLoading] = useState(true);

  const [syllabus, setSyllabus] = useState("");
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answersArray, setAnswersArray] = useState([]);

  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isExamFinished, setIsExamFinished] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [finalResult, setFinalResult] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setLoading(true);
        try {
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) setFullName(userSnap.data().fullName);

          const querySnapshot = await getDocs(collection(db, "syllabus"));
          const examsList = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAvailableExams(examsList);
        } catch (error) {
          console.error("Fetch Error:", error);
        }
        setLoading(false);
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleStartExam = async () => {
    if (!selectedExamId) return alert("Please select an exam first.");
    const selectedData = availableExams.find((ex) => ex.id === selectedExamId);
    if (!selectedData || !selectedData.questionPool) return alert("Exam data is incomplete.");
    setSyllabus(selectedData.content);
    const pool = selectedData.questionPool;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const examLength = selectedData.examLength || 5;
    setExamQuestions(shuffled.slice(0, examLength));
    setIsExamStarted(true);
  };

  const handleNextQuestion = async () => {
    if (!currentAnswer.trim()) return alert("Please answer before proceeding.");
    const newAnswerEntry = { question: examQuestions[currentIndex], answer: currentAnswer };
    const updatedAnswers = [...answersArray, newAnswerEntry];
    setAnswersArray(updatedAnswers);
    setCurrentAnswer("");
    if (currentIndex < examQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setIsExamFinished(true);
      processFinalGrading(updatedAnswers, syllabus);
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

  if (loading) return <StudentDashboardSkeleton />;

  return (
    <div className="student-container">
      <div className="student-card">
        {!isExamStarted && (
          <div className="start-area">
            <h2 className="student-label">Select An Exam</h2>
            <select
              className="student-select"
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
            <button className="student-btn" onClick={handleStartExam} disabled={!selectedExamId}>
              Start Exam
            </button>
          </div>
        )}

        {isExamStarted && !isExamFinished && (
          <>
            <div className="exam-progress">
              <span>Question {currentIndex + 1} of {examQuestions.length}</span>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${((currentIndex + 1) / examQuestions.length) * 100}%` }}
                />
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
                {currentIndex === examQuestions.length - 1 ? "Finish Exam" : "Next Question"}
              </button>
            </div>
          </>
        )}

        {isExamFinished && (
          <div className="result-area">
            {isGrading ? (
              <div className="grading-loader">
                <h2 className="student-label">Grading in progress...</h2>
                <p>Analyzing your answers against the syllabus.</p>
              </div>
            ) : finalResult ? (
              <div className="result-card">
                <div className="student-label">Final Score</div>
                <div className="score-container">
                  <h2 className="score-val">{finalResult.score}/10</h2>
                  <div className={`score-tag ${finalResult.score >= 4 ? "pass" : "fail"}`}>
                    {finalResult.score >= 4 ? "PASS" : "RETRY"}
                  </div>
                </div>
                <p className="feedback-text">{finalResult.feedback}</p>
                <button className="student-btn" onClick={() => window.location.reload()}>
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

export default ExamPage;
