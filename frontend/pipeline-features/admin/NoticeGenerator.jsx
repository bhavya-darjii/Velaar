import { useState } from 'react';
import { generateNotice } from '../../services/aiService';
import SegmentedToggle from '../../components/shared/SegmentedToggle';
import ExportButton from '../../components/shared/ExportButton';


const TEMPLATES = ['general', 'Academic Calendar', 'Exam Schedule', 'Fee Reminder', 'Event Announcement'];

const NoticeGenerator = () => {
  const [idea, setIdea] = useState('');
  const [template, setTemplate] = useState('general');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    const data = await generateNotice({ idea, template, language });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>AI Notice & Circular Drafter</h2>
          <p>Type a rough idea — AI drafts a formal college notice with proper formatting and reference numbers.</p>
        </div>
        <SegmentedToggle options={['English', 'Hindi', 'Both']} value={language === 'English' ? 'English' : language === 'Hindi' ? 'Hindi' : 'Both'} onChange={(v) => setLanguage(v === 'Both' ? 'Both' : v)} />
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div className="feature-field">
            <label>Template</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="feature-field">
            <label>Your Idea</label>
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. Mid-sem exam starts March 15, all students must carry ID cards..." rows={6} />
          </div>
          <button type="button" className="glass-btn glass-btn--primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Drafting...' : 'Draft Notice'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <h3>Drafted Notice</h3>
          {loading && <div className="feature-loading">Writing notice...</div>}
          {!loading && !result && <div className="feature-empty">Enter an idea to draft a notice.</div>}
          {result && (
            <>
              <p><strong>{result.title}</strong></p>
              <p style={{ fontSize: '0.8rem', color: '#ffffff' }}>Ref: {result.referenceNo}</p>
              <div className="feature-result">{result.body}</div>
              {result.hindiTranslation && language !== 'English' && (
                <div className="feature-result" style={{ marginTop: 12 }}><strong>Hindi:</strong> {result.hindiTranslation}</div>
              )}
              <div className="feature-actions">
                <ExportButton label="Publish to Feed" onClick={() => alert('Publish coming soon')} />
                <ExportButton label="Export PDF" variant="ghost" onClick={() => alert('PDF export coming soon')} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticeGenerator;
