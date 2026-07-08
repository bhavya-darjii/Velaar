import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { calculateCoAttainment } from '../../services/aiService';
import SegmentedToggle from '../../components/shared/SegmentedToggle';
import AttainmentChart from '../../components/shared/AttainmentChart';
import ExportButton from '../../components/shared/ExportButton';

import './COAttainment.css';

const COAttainment = () => {
  const { course } = useOutletContext() || {};
  const [range, setRange] = useState('Semester');
  const [threshold, setThreshold] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const courseOutcomes = course?.courseOutcomes || ['CO1', 'CO2', 'CO3', 'CO4', 'CO5'];

  const handleCalculate = async () => {
    setLoading(true);
    const data = await calculateCoAttainment({
      courseOutcomes,
      marksData: [{ note: 'Sample marks data — connect to Marks Dashboard for live data' }],
      threshold: Number(threshold),
    });
    setResult(data);
    setLoading(false);
  };

  const chartData = result?.coResults?.map((co) => ({
    co: co.co,
    attainment: co.attainment,
  })) || [];

  return (
    <div className="feature-page co-attainment">
      <div className="dashboard-header">
        <div>
          <h2>CO Attainment Calculator</h2>
          <p>NBA/NAAC-ready attainment reports with gap analysis and improvement suggestions for {course?.subjectName || 'your course'}.</p>
        </div>
        <SegmentedToggle
          options={['Semester', 'Annual', 'All Time']}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h3>Configuration</h3>
          <div className="feature-field">
            <label>Attainment Threshold (%)</label>
            <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <div className="feature-field">
            <label>Course Outcomes</label>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
              {courseOutcomes.join(', ')}
            </p>
          </div>
          <button type="button" className="glass-btn glass-btn--primary" onClick={handleCalculate} disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate Attainment'}
          </button>
        </div>

        {chartData.length > 0 && (
          <AttainmentChart data={chartData} title="Direct CO Attainment" />
        )}
      </div>

      {result && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>Attainment Report</h3>
              <p style={{ margin: '4px 0 0', color: '#ffffff', fontSize: '0.9rem' }}>
                Overall: <strong>{result.overallAttainment}%</strong>
                {result.nbaReady && ' · NBA Ready ✓'}
              </p>
            </div>
            <ExportButton label="Export NBA Report" onClick={() => alert('PDF export coming soon')} />
          </div>
          {result.summary && <p className="feature-result">{result.summary}</p>}
          <div className="co-results-grid">
            {result.coResults?.map((co, i) => (
              <div key={i} className={`co-result-card co-result-card--${co.status}`}>
                <div className="co-result-card__header">
                  <span>{co.co}</span>
                  <span className="co-result-card__pct">{co.attainment}%</span>
                </div>
                <p>{co.studentsAboveThreshold}/{co.totalStudents} students above threshold</p>
                {co.gapAnalysis && <p className="co-result-card__gap">{co.gapAnalysis}</p>}
                {co.suggestions?.map((s, j) => <li key={j}>{s}</li>)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default COAttainment;
