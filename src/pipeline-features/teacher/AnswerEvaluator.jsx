import { useOutletContext } from 'react-router-dom';

const AnswerEvaluator = () => {
  const { course } = useOutletContext() || {};

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>AI Answer Script Evaluator</h2>
        <p>Upload scanned answer sheets — Velaar AI reads handwriting via OCR + vision, grades against your rubric, and pre-fills marks.</p>
      </div>

      <div className="glass-card" style={{ padding: '40px', marginTop: '20px', textAlign: 'center' }}>
        <div style={{ padding: '60px 20px' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '20px' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Coming Soon</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
            The AI Answer Script Evaluator is currently in development. Soon you'll be able to upload bulk PDFs or photos of answer booklets and have Gemini Vision grade them automatically against your rubrics.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnswerEvaluator;
