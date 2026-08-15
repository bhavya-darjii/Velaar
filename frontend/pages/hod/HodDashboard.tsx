/* eslint-disable */
// @ts-nocheck
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import GenericDashboardSkeleton from "../../components/skeletons/GenericDashboardSkeleton";
import RiskScoreCard from "../../components/teacher/RiskScoreCard";
import "./HodDashboard.css";

const HodDashboard = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [departmentName, setDepartmentName] = useState("Your Department");
  const [loading, setLoading] = useState(true);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate('/'); return; }
      setLoading(true);
      try {
        // Get HOD profile
        const { data: userData } = await supabase.from('users').select('full_name, department').eq('id', session.user.id).single();
        let dept = 'Artificial Intelligence and Data Science';
        if (userData) {
          setFullName(userData.full_name || 'HOD');
          if (userData.department) {
            dept = userData.department;
            setDepartmentName(dept);
          }
        }

        // Fetch all courses in this department
        const { data: courses } = await supabase.from('courses').select('id, teacher_id').eq('department', dept);
        setTotalCourses((courses || []).length);

        // Collect unique teacher IDs from courses
        const teacherIds = [...new Set((courses || []).map(c => c.teacher_id).filter(Boolean))];
        setTotalTeachers(teacherIds.length);

        // Fetch teacher profiles
        if (teacherIds.length > 0) {
          const { data: profiles } = await supabase.from('users').select('id, full_name, email').in('id', teacherIds);
          setTeachers((profiles || []).map(p => ({ id: p.id, full_name: p.full_name, email: p.email })));
        }
      } catch (error) {
        console.error('Fetch Error:', error);
      }
      setLoading(false);
    };
    fetchData();
  }, [navigate]);

  if (loading) return <GenericDashboardSkeleton />;

  return (
    <div className="hod-container">
      {/* â”€â”€ Stat Strip â”€â”€ */}
      <div className="hod-stat-strip">
        <div className="hod-stat">
          <span className="hod-stat__value">{totalTeachers}</span>
          <span className="hod-stat__label">Active Teachers</span>
        </div>
        <div className="hod-stat">
          <span className="hod-stat__value">{totalCourses}</span>
          <span className="hod-stat__label">Registered Courses</span>
        </div>
        <div className="hod-stat">
          <span className="hod-stat__value">{teachers.length > 0 ? Math.round(totalCourses / teachers.length * 10) / 10 : "—"}</span>
          <span className="hod-stat__label">Courses / Teacher</span>
        </div>
      </div>

      {/* â”€â”€ Risk Heatmap â”€â”€ */}
      <div style={{ marginBottom: 40 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>At-Risk Students</h3>
        <div className="risk-grid">
          <RiskScoreCard studentName="Rahul Sharma" score={78} suggestion="Missed 5 consecutive lectures — recommend tutorial sessions" />
          <RiskScoreCard studentName="Amit Kumar" score={52} suggestion="TT1 to TT2 decline — schedule remedial class" />
          <RiskScoreCard studentName="Priya Patel" score={18} suggestion="On track — no intervention needed" />
        </div>
      </div>

      {/* â”€â”€ Cards Grid â”€â”€ */}
      <div className="hod-dashboard-grid">

        {/* Faculty card */}
        <div className="hod-card">
          <div className="hod-card-icon" style={{ color: '#ffffff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
          </div>
          <h2 className="hod-card-title">Faculty</h2>
          {teachers.length === 0 ? (
            <p>No teachers found for <strong>{departmentName}</strong>. Ensure faculty accounts have the correct department assigned.</p>
          ) : (
            <p>
              <strong>{totalTeachers} teacher{totalTeachers !== 1 ? 's' : ''}</strong> active in {departmentName}.
            </p>
          )}

          {/* Teacher list */}
          {teachers.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {teachers.map((t) => (
                <li key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 10, padding: '10px 14px',
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {(t.full_name || t.name || '?')[0].toUpperCase()}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>
                      {t.full_name || t.name || 'Unknown'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#ffffff' }}>{t.email || ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button className="hod-btn">Manage Faculty</button>
        </div>

        {/* Courses card */}
        <div className="hod-card">
          <div className="hod-card-icon" style={{ color: '#ffffff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          </div>
          <h2 className="hod-card-title">Course Overview</h2>
          <p>
            <strong>{totalCourses} course{totalCourses !== 1 ? 's' : ''}</strong> registered under {departmentName}.
          </p>
          <button className="hod-btn">View Courses</button>
        </div>

        {/* OBE card */}
        <div className="hod-card">
          <div className="hod-card-icon" style={{ color: '#ffffff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <h2 className="hod-card-title">Outcome Based Education</h2>
          <p>Review CO-PO attainment levels and bloom's taxonomy coverage for recent examinations.</p>
          <button className="hod-btn">View Attainment</button>
        </div>

        {/* Timetable card */}
        <div className="hod-card">
          <div className="hod-card-icon" style={{ color: '#ffffff' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <h2 className="hod-card-title">Timetable Generator</h2>
          <p>Generate, manage, and export departmental timetables automatically using constraints.</p>
          <button className="hod-btn" onClick={() => navigate('/hod/timetable-generator')}>Generate Timetable</button>
        </div>

      </div>
    </div>
  );
};

export default HodDashboard;

