import { useState } from 'react';


const FeedbackAnalytics = () => {
  const [loading, setLoading] = useState(false);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Feedback Analytics</h2>
          <p>AI sentiment analysis, theme extraction, and teacher rankings from student feedback.</p>
        </div>
      </div>
      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <h3>Overall Sentiment</h3>
          <p style={{ fontSize: '2rem', fontWeight: 800, margin: '8px 0' }}>72%</p>
          <p style={{ color: '#ffffff' }}>Positive sentiment across department</p>
        </div>
        <div style={{ marginBottom: '30px' }}>
          <h3>Top Themes</h3>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
            <li>Lab equipment needs upgrade (12 mentions)</li>
            <li>Pace of lectures (8 mentions)</li>
            <li>Good practical demonstrations (15 mentions)</li>
          </ul>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <h3>Teacher Rankings</h3>
          <button type="button" className="glass-btn glass-btn--primary" onClick={() => setLoading(!loading)} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Full Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackAnalytics;
