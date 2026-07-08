import { useState } from 'react';
import { generateTimetable } from '../../services/aiService';
import SegmentedToggle from '../../components/shared/SegmentedToggle';

import './TimetableGenerator.css';

const TimetableGenerator = () => {
  const [department, setDepartment] = useState('');
  const [view, setView] = useState('Week');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    const data = await generateTimetable({
      department: department || 'Computer Engineering',
      teachers: [{ name: 'Dr. Smith', subjects: ['DS', 'DBMS'] }, { name: 'Prof. Jones', subjects: ['CN', 'OS'] }],
      rooms: [{ name: 'Lab 1', capacity: 30 }, { name: 'Room 201', capacity: 60 }],
      constraints: { avoidBackToBack: true, labHours: 2 },
    });
    setResult(data);
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>AI Timetable Generator</h2>
          <p>Auto-generate conflict-free timetables considering teacher availability, room capacity, and lab requirements.</p>
        </div>
        <SegmentedToggle options={['Day', 'Week', 'Month']} value={view} onChange={setView} />
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div className="feature-field">
            <label>Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Artificial Intelligence and Data Science" />
          </div>
          <button type="button" className="glass-btn glass-btn--primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Timetable'}
          </button>
        </div>

        {result?.schedule && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
            <h3>{result.department} — Weekly Schedule</h3>
            <div className="timetable-grid">
              {result.schedule.map((day, i) => (
                <div key={i} className="timetable-day">
                  <h4>{day.day}</h4>
                  {day.slots?.map((slot, j) => (
                    <div key={j} className="timetable-slot">
                      <span className="timetable-slot__time">{slot.time}</span>
                      <span>{slot.subject} · {slot.teacher} · {slot.room}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {result.warnings?.length > 0 && (
              <p style={{ marginTop: 12, color: '#ea580c', fontSize: '0.85rem' }}>
                ⚠ {result.warnings.join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableGenerator;
