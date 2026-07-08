import { useState } from 'react';


const AccreditationHub = () => {
  const [reportType, setReportType] = useState('SAR');

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Accreditation Report Generator</h2>
          <p>Aggregate platform data to auto-generate NBA SAR, NAAC AQAR, CO-PO-PSO matrices, and improvement action plans.</p>
        </div>
      </div>
      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        {['SAR', 'AQAR', 'CO-PO Matrix'].map((type) => (
          <div key={type} className={`feature-panel ${reportType === type ? 'feature-panel--solid' : 'feature-panel--glass'}`} style={{ cursor: 'pointer' }} onClick={() => setReportType(type)}>
            <h3>{type}</h3>
            <p style={{ fontSize: '0.88rem', opacity: 0.8 }}>
              {type === 'SAR' && 'Self-Assessment Report for NBA accreditation'}
              {type === 'AQAR' && 'Annual Quality Assurance Report for NAAC'}
              {type === 'CO-PO Matrix' && 'Program-level outcome attainment matrices'}
            </p>
            <button type="button" className="glass-btn glass-btn--primary" style={{ marginTop: 12 }} onClick={(e) => { e.stopPropagation(); alert(`${type} generation requires P0-P2 data aggregation`); }}>
              Generate {type}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccreditationHub;
