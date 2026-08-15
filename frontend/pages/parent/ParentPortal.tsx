/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import GenericDashboardSkeleton from "../../components/skeletons/GenericDashboardSkeleton";
import "./ParentPortal.css";

const ParentPortal = () => {
  const navigate = useNavigate();
  const [parentName, setParentName] = useState("");
  const [studentName, setStudentName] = useState("Your Ward");
  const [collegeName, setCollegeName] = useState("");
  const [loading, setLoading] = useState(true);

  // Mocked Student Performance Data
  const attendance = 86; // percentage
  const cgpa = 8.4;
  const rank = 12;

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/'); return; }
      setLoading(true);
      try {
        const { data } = await supabase.from('users').select('full_name, college_name').eq('id', session.user.id).single();
        if (data) {
          setParentName(data.full_name || 'Parent');
          setCollegeName(data.college_name || 'Institution');
          setStudentName('Alex Johnson');
        }
      } catch (error) {
        console.error('Fetch Error:', error);
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) return <GenericDashboardSkeleton />;

  return (
    <div className="parent-container">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="parent-header-section">
        <div className="parent-header-left">
          <h1>Welcome, {parentName}</h1>
          <p className="parent-subtext">{collegeName} · Parent Portal</p>
        </div>
        <button className="parent-exit-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      <div className="parent-layout">
        {/* LEFT COLUMN */}
        <div className="parent-main">
          {/* â”€â”€ Student Overview Card â”€â”€ */}
          <div className="parent-card overview-card">
            <div className="overview-header">
              <div className="overview-avatar">{studentName.charAt(0)}</div>
              <div>
                <h2>{studentName}</h2>
                <p>B.Tech Computer Science · Year 3, Semester 5</p>
              </div>
            </div>

            <div className="overview-stats">
              <div className="ost-box">
                <span className="ost-val">{attendance}%</span>
                <span className="ost-label">Attendance</span>
                <div className="progress-bg"><div className="progress-fill" style={{ width: `${attendance}%`, background: '#22d3ee' }}></div></div>
              </div>
              <div className="ost-box">
                <span className="ost-val">{cgpa}</span>
                <span className="ost-label">Current CGPA</span>
                <div className="progress-bg"><div className="progress-fill" style={{ width: `${(cgpa/10)*100}%`, background: '#a855f7' }}></div></div>
              </div>
              <div className="ost-box">
                <span className="ost-val">#{rank}</span>
                <span className="ost-label">Class Rank</span>
              </div>
            </div>
          </div>

          {/* â”€â”€ Recent Exam Results â”€â”€ */}
          <h3 className="parent-section-title" style={{ marginTop: '30px' }}>Recent Performance</h3>
          <div className="parent-table-wrapper">
            <table className="parent-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Exam Type</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Advanced Thermodynamics</td>
                  <td>Mid-Term</td>
                  <td><strong>8/10</strong></td>
                  <td><span className="parent-badge parent-badge--pass">Pass</span></td>
                </tr>
                <tr>
                  <td>Data Structures</td>
                  <td>Quiz 2</td>
                  <td><strong>9.5/10</strong></td>
                  <td><span className="parent-badge parent-badge--excellent">Excellent</span></td>
                </tr>
                <tr>
                  <td>Operating Systems</td>
                  <td>Mid-Term</td>
                  <td><strong>4/10</strong></td>
                  <td><span className="parent-badge parent-badge--borderline">Borderline</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="parent-sidebar">
          {/* Notifications Card */}
          <div className="parent-card no-hover">
            <h3 className="parent-section-title">Notifications</h3>
            <ul className="parent-feed">
              <li className="feed-item">
                <div className="feed-icon" style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </div>
                <div className="feed-content">
                  <p><strong>Upcoming Fee Deadline</strong></p>
                  <span>Semester 6 tuition fee is due on Nov 15.</span>
                </div>
              </li>
              <li className="feed-item">
                <div className="feed-icon" style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </div>
                <div className="feed-content">
                  <p><strong>Parent-Teacher Meet</strong></p>
                  <span>Scheduled for Dec 2, 2026. Please book your slot.</span>
                </div>
              </li>
              <li className="feed-item">
                <div className="feed-icon" style={{ background: 'rgba(244,63,94,0.15)', color: '#fb7185' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div className="feed-content">
                  <p><strong>Low Attendance Alert</strong></p>
                  <span>Attendance dropped in Operating Systems (65%).</span>
                </div>
              </li>
            </ul>
          </div>
          
          <button className="parent-btn" style={{ marginTop: '20px' }}>Contact Mentor</button>
          <button className="parent-btn outline" style={{ marginTop: '10px' }}>Pay Fees</button>
        </div>
      </div>
    </div>
  );
};

export default ParentPortal;

