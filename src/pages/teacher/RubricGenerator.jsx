import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { generateRubric } from '../../services/aiService';
import ExportButton from '../../components/shared/ExportButton';


const RubricGenerator = () => {
  const { course } = useOutletContext() || {};
  const [examTitle, setExamTitle] = useState('');
  const [questionPaper, setQuestionPaper] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (!questionPaper.trim()) return;
    setLoading(true);
    const data = await generateRubric({
      examTitle: examTitle || course?.subjectName || 'Examination',
      questionPaper,
      totalMarks: Number(totalMarks),
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>AI Rubric Generator</h2>
          <p>Generate detailed marking rubrics from your question paper — step-by-step marks, common mistakes, and partial marking guidelines.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h3>Question Paper Input</h3>
          <div className="feature-field">
            <label>Exam Title</label>
            <input value={examTitle} onChange={(e) => setExamTitle(e.target.value)} placeholder={course?.subjectName || 'Term Test 1'} />
          </div>
          <div className="feature-field">
            <label>Total Marks</label>
            <input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
          </div>
          <div className="feature-field">
            <label>Question Paper Text</label>
            <textarea value={questionPaper} onChange={(e) => setQuestionPaper(e.target.value)} placeholder="Paste your full question paper here..." rows={8} />
          </div>
          <button type="button" className="glass-btn glass-btn--primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Rubric'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <h3>Generated Rubric</h3>
          {loading && <div className="feature-loading">Building rubric...</div>}
          {!loading && !result && <div className="feature-empty">Paste a question paper and generate a rubric.</div>}
          {result?.error && <p style={{ color: '#dc2626' }}>{result.error}</p>}
          {result?.rubrics?.map((r, i) => (
            <div key={i} className="feature-result" style={{ marginBottom: 12 }}>
              <strong>Q{r.questionNum}</strong> — Max {r.maxMarks} marks
              <ul style={{ margin: '8px 0', paddingLeft: 18 }}>
                {r.steps?.map((s, j) => <li key={j}>{s.criterion}: {s.marks} marks</li>)}
              </ul>
              {r.commonMistakes?.length > 0 && (
                <p><strong>Common mistakes:</strong> {r.commonMistakes.join('; ')}</p>
              )}
              {r.partialMarking && <p><strong>Partial marking:</strong> {r.partialMarking}</p>}
            </div>
          ))}
          {result?.moderatorNotes && (
            <div className="feature-result"><strong>Moderator notes:</strong> {result.moderatorNotes}</div>
          )}
          {result?.rubrics && (
            <ExportButton label="Export to Word" onClick={() => alert('Word export coming soon')} />
          )}
        </div>
      </div>
    </div>
  );
};

export default RubricGenerator;
