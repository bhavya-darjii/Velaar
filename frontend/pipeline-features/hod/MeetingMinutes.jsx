import { useState } from 'react';
import { supabase } from '../../services/supabase';

const MeetingMinutes = () => {
  const [notes, setNotes] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
      const URL = BASE_URL.endsWith('/api') ? `${BASE_URL}/notice/meeting-minutes` : `${BASE_URL}/api/notice/meeting-minutes`;
      
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          "Authorization": session ? `Bearer ${session.access_token}` : ""
        },
        body: JSON.stringify({ notes, department }),
      });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: 'Failed to generate minutes' });
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>Meeting Minutes Generator</h2>
          <p>Upload notes from department meetings — AI generates structured MoM with action items and deadlines.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <div className="feature-field">
            <label>Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Your department" />
          </div>
          <div className="feature-field">
            <label>Meeting Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste or type meeting notes..." rows={10} />
          </div>
          <button type="button" className="glass-btn glass-btn--primary" onClick={handleGenerate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate MoM'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
          <h3>Minutes of Meeting</h3>
          {!result && <div className="feature-empty">Enter notes to generate structured minutes.</div>}
          {result?.error && <p style={{ color: '#dc2626' }}>{result.error}</p>}
          {result?.title && (
            <>
              <p><strong>{result.title}</strong> — {result.date}</p>
              {result.actionItems?.map((a, i) => (
                <div key={i} className="feature-result" style={{ marginBottom: 8 }}>
                  <strong>{a.action}</strong> — {a.owner} · Due: {a.deadline}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeetingMinutes;
