import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { generateLabManual } from '../../services/aiService';
import ExportButton from '../../components/shared/ExportButton';


const LabManualGenerator = () => {
  const { course } = useOutletContext() || {};
  const [experiments, setExperiments] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    const expList = experiments.split('\n').filter(Boolean).map((title) => ({ title }));
    if (!expList.length) return;
    setLoading(true);
    const data = await generateLabManual({
      subjectName: course?.subjectName || 'Lab Course',
      experiments: expList,
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>AI Lab Manual Generator</h2>
          <p>Input experiment titles — AI generates complete lab manual content with theory, procedure, viva questions, and rubrics.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h3>Experiments</h3>
          <div className="feature-field">
            <label>One experiment per line</label>
            <textarea
              value={experiments}
              onChange={(e) => setExperiments(e.target.value)}
              placeholder={"Study of Op-Amp characteristics\nVerification of KVL and KCL\nPCB design using Eagle CAD"}
              rows={8}
            />
          </div>
          <button type="button" className="glass-btn glass-btn--primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Lab Manual'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <h3>Generated Content</h3>
          {loading && <div className="feature-loading">Building lab manual...</div>}
          {!loading && !result && <div className="feature-empty">Enter experiment titles to generate.</div>}
          {result?.experiments?.map((exp, i) => (
            <div key={i} className="feature-result" style={{ marginBottom: 16 }}>
              <strong>{exp.title}</strong>
              <p><strong>Aim:</strong> {exp.aim}</p>
              <p><strong>Theory:</strong> {exp.theory?.substring(0, 300)}...</p>
              {exp.vivaQuestions?.length > 0 && (
                <p><strong>Viva:</strong> {exp.vivaQuestions.slice(0, 3).join(' · ')}</p>
              )}
            </div>
          ))}
          {result?.experiments && <ExportButton label="Export Manual" onClick={() => alert('Word export coming soon')} />}
        </div>
      </div>
    </div>
  );
};

export default LabManualGenerator;
