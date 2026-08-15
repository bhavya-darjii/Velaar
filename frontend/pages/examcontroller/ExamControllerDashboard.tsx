/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import GenericDashboardSkeleton from "../../components/skeletons/GenericDashboardSkeleton";
import "./ExamControllerDashboard.css";

const ExamControllerDashboard = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [loading, setLoading] = useState(true);

  // Mocked/Derived stats
  const [totalCourses, setTotalCourses] = useState(0);
  const [activeExams, setActiveExams] = useState(0);
  const [papersGenerated, setPapersGenerated] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/'); return; }
      setLoading(true);
      try {
        const { data: userData } = await supabase.from('users').select('full_name, college_name').eq('id', session.user.id).single();
        if (userData) {
          setFullName(userData.full_name || 'Exam Controller');
          setCollegeName(userData.college_name || 'Institution');
        }

        const { count } = await supabase.from('courses').select('id', { count: 'exact', head: true });
        setTotalCourses(count || 0);
        setActiveExams(Math.floor((count || 0) * 1.5));
        setPapersGenerated((count || 0) * 3);
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
    <div className="ec-container">
      {/* â”€â”€ Header â”€â”€ */}
      <div className="ec-header-section">
        <div className="ec-header-left">
          <h1>Welcome, {fullName}</h1>
          <p className="ec-subtext">{collegeName} · Controller of Examinations</p>
        </div>
        <button className="ec-exit-btn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      {/* â”€â”€ KPI Strip â”€â”€ */}
      <div className="ec-stat-strip">
        <div className="ec-stat">
          <span className="ec-stat__value">{activeExams}</span>
          <span className="ec-stat__label">Active Exams</span>
        </div>
        <div className="ec-stat">
          <span className="ec-stat__value">{papersGenerated}</span>
          <span className="ec-stat__label">Papers Generated</span>
        </div>
        <div className="ec-stat">
          <span className="ec-stat__value">{totalCourses}</span>
          <span className="ec-stat__label">Courses Enrolled</span>
        </div>
      </div>

      {/* â”€â”€ Cards Grid â”€â”€ */}
      <div className="ec-dashboard-grid">
        <div className="ec-card">
          <div className="ec-card-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <h2 className="ec-card-title">Question Papers</h2>
          <p>Generate, approve, and securely distribute AI-generated question papers for upcoming mid-terms and finals.</p>
          <button className="ec-btn">Manage Papers</button>
        </div>

        <div className="ec-card">
          <div className="ec-card-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h2 className="ec-card-title">Exam Schedules</h2>
          <p>Organize invigilation duties, allocate rooms, and finalize timetables for {activeExams} active exams.</p>
          <button className="ec-btn">View Timetable</button>
        </div>

        <div className="ec-card">
          <div className="ec-card-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <h2 className="ec-card-title">Results & Grading</h2>
          <p>Review AI-graded results, moderate marks, and publish final scorecards for student portals.</p>
          <button className="ec-btn">Publish Results</button>
        </div>
      </div>
      
      {/* â”€â”€ Table Section â”€â”€ */}
      <div className="ec-section-title" style={{ marginTop: '40px' }}>Upcoming Examinations</div>
      <div className="ec-table-wrapper">
        <table className="ec-table">
          <thead>
            <tr>
              <th>Exam Name</th>
              <th>Department</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Advanced Thermodynamics Midterm</td>
              <td>Mechanical</td>
              <td>Oct 12, 2026</td>
              <td><span className="ec-badge ec-badge--pending">Pending Paper</span></td>
              <td><button className="ec-action-btn">Review</button></td>
            </tr>
            <tr>
              <td>Data Structures Final</td>
              <td>Computer Science</td>
              <td>Oct 15, 2026</td>
              <td><span className="ec-badge ec-badge--approved">Approved</span></td>
              <td><button className="ec-action-btn">Schedule</button></td>
            </tr>
            <tr>
              <td>Engineering Mathematics I</td>
              <td>First Year</td>
              <td>Oct 18, 2026</td>
              <td><span className="ec-badge ec-badge--approved">Approved</span></td>
              <td><button className="ec-action-btn">Schedule</button></td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default ExamControllerDashboard;

