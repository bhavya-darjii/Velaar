import { useState } from 'react';
import { predictStudentRisk } from '../../services/aiService';
import SegmentedToggle from '../../components/shared/SegmentedToggle';
import RiskScoreCard from '../../components/teacher/RiskScoreCard';


const SAMPLE_STUDENTS = [
  { studentId: '1', studentName: 'Rahul Sharma', attendance: 72, tt1: 45, tt2: 38, consecutiveAbsences: 5 },
  { studentId: '2', studentName: 'Priya Patel', attendance: 91, tt1: 78, tt2: 82, consecutiveAbsences: 0 },
  { studentId: '3', studentName: 'Amit Kumar', attendance: 65, tt1: 52, tt2: 48, consecutiveAbsences: 3 },
  { studentId: '4', studentName: 'Sneha Reddy', attendance: 88, tt1: 71, tt2: 74, consecutiveAbsences: 1 },
];

const StudentRiskAnalytics = () => {
  const [range, setRange] = useState('Week');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    setLoading(true);
    const data = await predictStudentRisk({ students: SAMPLE_STUDENTS });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Student Risk Analytics</h2>
          <p>AI predicts at-risk students from attendance patterns and marks trends — with intervention suggestions before it's too late.</p>
        </div>
        <SegmentedToggle options={['Day', 'Week', 'Month']} value={range} onChange={setRange} />
      </div>

      <div style={{ marginBottom: '30px' }}>
        <button type="button" className="glass-btn glass-btn--primary" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run Risk Analysis'}
        </button>
      </div>

      {result && (
        <>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
            <h3>Department Summary</h3>
            <p>{result.departmentSummary}</p>
            <p><strong>{result.highRiskCount}</strong> high-risk students identified</p>
          </div>
          <div className="risk-grid">
            {result.students?.map((s) => (
              <RiskScoreCard
                key={s.studentId}
                studentName={s.studentName}
                score={s.riskScore}
                suggestion={s.intervention}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentRiskAnalytics;
