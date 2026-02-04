import { useState } from 'react';
import './ExamPage.css'; // Import the specific styles for this page
import { gradeStudentAnswer } from '../aiService'; // Go up one level to find logic

const ExamPage = () => {
  // --- TEACHER DATA ---
  const [syllabus, setSyllabus] = useState("Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.");
  
  const questionBank = [
    "Explain the main purpose of photosynthesis.",
    "What are the three main inputs required for photosynthesis?",
    "Why is photosynthesis important for animals and humans?",
    "Describe the role of sunlight in the process of photosynthesis.",
    "What is the 'waste product' of photosynthesis that is useful to us?"
  ];

  // --- STATE ---
  const [assignedQuestion, setAssignedQuestion] = useState(""); 
  const [studentAnswer, setStudentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // --- LOGIC ---
  const assignRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * questionBank.length);
    setAssignedQuestion(questionBank[randomIndex]);
    setStudentAnswer("");
    setResult(null); 
  };

  const handleGrading = async () => {
    if (!studentAnswer) return alert("Please type an answer first!");
    if (!assignedQuestion) return alert("Please get a question first!");

    setLoading(true);
    setResult(null);

    const data = await gradeStudentAnswer(syllabus, assignedQuestion, studentAnswer);
    
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="exam-container">
      <h1 className="header">Velaar</h1>

      {/* TEACHER SECTION */}
      <div className="card">
        <div className="section-title">Teacher's Control</div>
        <label>Syllabus Context:</label>
        <textarea 
          value={syllabus}
          onChange={(e) => setSyllabus(e.target.value)}
          placeholder="Paste the chapter text here..."
        />
      </div>

      {/* STUDENT SECTION */}
      <div className="card">
        <div className="section-title">Student's Exam Area</div>
        
        {!assignedQuestion ? (
          <div className="start-area">
            <p>Ready to take the test?</p>
            <button className="btn" onClick={assignRandomQuestion}>
              🎲 Assign Me a Random Question
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
              <button className="btn" onClick={handleGrading} disabled={loading}>
                {loading ? "Velaar is Grading..." : "Submit Answer"}
              </button>
              
              <button className="btn secondary" onClick={assignRandomQuestion}>
                🔄 New Question
              </button>
            </div>
          </>
        )}
      </div>

      {/* RESULT SECTION */}
      {result && (
        <div className="card result-box">
          <div className="section-title">Evaluation Result</div>
          <h2 className="score-display">Grade: {result.score} / 10</h2>
          
          {/* We ensure feedback text is visible */}
          <p className="feedback-text">
            <strong>Feedback:</strong> {result.feedback}
          </p>

          {result.is_suspicious && (
            <div className="warning-box">
              ⚠️ <strong>AI Detection Alert:</strong> This answer looks suspicious.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamPage;