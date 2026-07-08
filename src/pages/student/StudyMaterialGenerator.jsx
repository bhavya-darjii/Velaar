import { useState } from 'react';
import { generateStudyMaterial } from '../../services/aiService';
import SegmentedToggle from '../../components/shared/SegmentedToggle';


const StudyMaterialGenerator = () => {
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const [mode, setMode] = useState('exam-ready');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    const topicList = topics.split('\n').filter(Boolean);
    if (!topicList.length) return;
    setLoading(true);
    const data = await generateStudyMaterial({
      subjectName: subject || 'Engineering Subject',
      syllabusTopics: topicList,
      weakCOs: ['CO2', 'CO4'],
      mode: mode === 'ELI5' ? 'eli5' : 'exam-ready',
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>AI Study Material</h2>
          <p>Personalized study notes based on syllabus, exam patterns, and your weak COs.</p>
        </div>
        <SegmentedToggle
          options={['Exam Ready', 'ELI5']}
          value={mode === 'eli5' ? 'ELI5' : 'Exam Ready'}
          onChange={(v) => setMode(v === 'ELI5' ? 'eli5' : 'exam-ready')}
        />
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div className="feature-field">
            <label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Data Structures" />
          </div>
          <div className="feature-field">
            <label>Topics (one per line)</label>
            <textarea value={topics} onChange={(e) => setTopics(e.target.value)} placeholder={"Arrays and Linked Lists\nTrees and Graphs\nSorting Algorithms"} rows={6} />
          </div>
          <button type="button" className="glass-btn glass-btn--primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Notes'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <h3>Study Notes</h3>
          {loading && <div className="feature-loading">Creating study material...</div>}
          {!loading && !result && <div className="feature-empty">Select topics to generate notes.</div>}
          {result?.sections?.map((sec, i) => (
            <div key={i} className="feature-result" style={{ marginBottom: 12 }}>
              <strong>{sec.title}</strong> {sec.coTags && <span style={{ color: '#5E5CE6', fontSize: '0.75rem' }}>{sec.coTags.join(', ')}</span>}
              <p>{sec.content?.substring(0, 400)}...</p>
              {sec.keyFormulas?.length > 0 && <p><strong>Formulas:</strong> {sec.keyFormulas.join(' · ')}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudyMaterialGenerator;
