import { useState } from 'react';


const FeedbackForm = () => {
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Course Feedback</h2>
          <p>Anonymous end-of-semester feedback — helps your department improve teaching quality.</p>
        </div>
      </div>

      <form className="feature-panel feature-panel--solid" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        {submitted ? (
          <p style={{ textAlign: 'center', padding: 20 }}>Thank you! Your feedback has been recorded anonymously.</p>
        ) : (
          <>
            <div className="feature-field">
              <label>Overall Rating (1-5)</label>
              <input type="range" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
              <span>{rating}/5</span>
            </div>
            <div className="feature-field">
              <label>Your Feedback</label>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well? What could improve?" rows={6} required />
            </div>
            <button type="submit" className="glass-btn glass-btn--primary">Submit Anonymously</button>
          </>
        )}
      </form>
    </div>
  );
};

export default FeedbackForm;
