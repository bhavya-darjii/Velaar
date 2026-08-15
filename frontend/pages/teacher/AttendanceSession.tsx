/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../services/supabase';
import SegmentedToggle from '../../components/shared/SegmentedToggle';
import './AttendanceSession.css';

const AttendanceSession = () => {
  const { course } = useOutletContext() || {};
  const courseId = course?.id || 'demo-course';
  
  // Tabs
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'analytics'

  // Live Session State
  const [sessionActive, setSessionActive] = useState(false);
  const [qrString, setQrString] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [attendees, setAttendees] = useState([]);

  // Analytics State
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0);
  
  // Create a new session in Postgres
  const startSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      
      const newQrString = `${courseId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const { data: newSession, error } = await supabase
        .from('attendance_sessions')
        .insert({
          course_id: courseId,
          teacher_id: user.id,
          qr_token: newQrString,
          expires_at: new Date(Date.now() + 10 * 1000).toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setSessionId(newSession.id);
      setQrString(newQrString);
      setSessionActive(true);
    } catch (err) {
      console.error("Error starting session:", err);
    }
  };

  // Stop session
  const stopSession = async () => {
    if (sessionId) {
      try {
        await supabase
          .from('attendance_sessions')
          .update({ expires_at: new Date().toISOString() }) // instantly expire
          .eq('id', sessionId);
      } catch (err) {
        console.error("Error stopping session:", err);
      }
    }
    setSessionActive(false);
    setSessionId(null);
    setQrString('');
  };

  // Refresh QR code every 8 seconds (before 10s expiry)
  useEffect(() => {
    let interval;
    if (sessionActive && sessionId) {
      interval = setInterval(async () => {
        const newQrString = `${courseId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        try {
          await supabase
            .from('attendance_sessions')
            .update({
              qr_token: newQrString,
              expires_at: new Date(Date.now() + 10 * 1000).toISOString()
            })
            .eq('id', sessionId);
          setQrString(newQrString);
        } catch (err) {
          console.error("Error updating QR code:", err);
        }
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [sessionActive, sessionId, courseId]);

  // Listen for attendees in live session via Supabase Realtime
  useEffect(() => {
    if (!sessionId) return;
    
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('attendance_logs')
        .select('id, marked_at, student_id, users(full_name, email)')
        .eq('session_id', sessionId);
      if (data) setAttendees(data);
    };
    fetchInitial();

    const channel = supabase.channel(`public:attendance_logs:session_id=eq.${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance_logs', filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const { data: student } = await supabase.from('users').select('full_name, email').eq('id', payload.new.student_id).single();
          const newAttendee = {
            ...payload.new,
            users: student
          };
          setAttendees((prev) => [...prev, newAttendee]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionActive) stopSession();
    };
  }, [sessionActive]);

  // Fetch Analytics Data
  useEffect(() => {
    if (activeTab === 'analytics' && courseId) {
      const fetchAnalytics = async () => {
        setAnalyticsLoading(true);
        try {
          // 1. Get all sessions for this course
          const { count: sessionsCount } = await supabase
            .from('attendance_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', courseId);
            
          setTotalSessions(sessionsCount || 0);

          if (!sessionsCount) {
            setAnalyticsData([]);
            setAnalyticsLoading(false);
            return;
          }

          // 2. Get all logs for this course
          const { data: logsData } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('course_id', courseId);

          // 3. Get all students in this course's institution/semester
          let studentsQ = supabase.from('users').select('*').eq('user_type', 'student');
          if (course?.institution_id) studentsQ = studentsQ.eq('institution_id', course.institution_id);
          if (course?.semester) studentsQ = studentsQ.eq('semester', course.semester);
          
          const { data: studentsData } = await studentsQ;

          const analytics = [];
          (studentsData || []).forEach(student => {
            const studentId = student.id;
            
            // Filter logs for this student
            const studentLogs = (logsData || []).filter(log => log.student_id === studentId);
            const attended = studentLogs.length;
            const percentage = Math.round((attended / sessionsCount) * 100);

            analytics.push({
              id: studentId,
              name: student.full_name || student.name || student.email || "Unknown Student",
              rollNo: student.rollNo || studentId.substring(0, 4).toUpperCase(),
              attended,
              percentage
            });
          });

          // Inject a mock safe student for UI testing
          if (sessionsCount > 0) {
            analytics.push({
              id: 'mock-safe-student',
              name: 'Aarav Sharma (Test Safe)',
              rollNo: 'ARVS',
              attended: sessionsCount,
              percentage: 100
            });
          }

          // Sort by name
          analytics.sort((a, b) => a.name.localeCompare(b.name));
          setAnalyticsData(analytics);
        } catch (error) {
          console.error("Error fetching analytics:", error);
        } finally {
          setAnalyticsLoading(false);
        }
      };
      
      fetchAnalytics();
    }
  }, [activeTab, courseId, course]);

  const handlePrint = () => {
    const rows = analyticsData.map(student => {
      const isDefaulter = student.percentage < 75;
      return `<tr style="background: ${isDefaulter ? '#ffe0e0' : 'transparent'}">
        <td>${student.rollNo}</td>
        <td>${student.name}</td>
        <td style="text-align:center">${student.attended} / ${totalSessions}</td>
        <td style="text-align:center; font-weight:bold">${student.percentage}%</td>
        <td style="text-align:center; font-weight:bold">${isDefaulter ? 'Defaulter' : 'Safe'}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    @page { size: auto; margin: 0mm; }
    body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 1.5cm; }
    h2 { margin-bottom: 4px; font-size: 1.3rem; }
    p { margin: 0 0 16px; color: #444; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 10px 12px; text-align: left; font-size: 0.9rem; color: #000; }
    th { background: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>
  <h2>Defaulters List</h2>
  <p>Total Sessions Conducted: ${totalSessions}</p>
  <table>
    <thead><tr><th>Roll No</th><th>Student Name</th><th>Sessions Attended</th><th>Attendance (%)</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    // Use a hidden iframe so no new browser tab opens
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  return (
    <div className="attendance-session-container">
      <div className="attendance-glass-panel" style={{ maxWidth: activeTab === 'analytics' ? '900px' : '600px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
        
        {/* Tab Navigation */}
        <div style={{ marginBottom: '30px' }}>
          <SegmentedToggle
            options={['Live Session', 'Analytics & Defaulters']}
            value={activeTab === 'analytics' ? 'Analytics & Defaulters' : 'Live Session'}
            onChange={(v) => setActiveTab(v === 'Analytics & Defaulters' ? 'analytics' : 'live')}
          />
        </div>

        {/* --- LIVE SESSION TAB --- */}
        {activeTab === 'live' && (
          <div className="tab-content">
            <h2>Live Attendance Tracker</h2>
            <p className="subtitle">Project this QR code on the screen.</p>
            
            {!sessionActive ? (
              <button className="liquid-btn primary-btn start-btn" onClick={startSession}>
                Start Attendance Session
              </button>
            ) : (
              <div className="active-session-view">
                <div className="qr-container">
                  <QRCodeSVG 
                    value={qrString} 
                    size={280} 
                    level={"H"} 
                    includeMargin={true}
                    fgColor="#0f172a"
                    bgColor="transparent"
                    className="qr-code"
                  />
                </div>
                
                <button className="liquid-btn danger-btn" onClick={stopSession}>
                  End Session
                </button>
                
                <div className="attendees-list">
                  <h3>Checked In ({attendees.length})</h3>
                  {attendees.length === 0 ? (
                    <p className="no-attendees">Waiting for students to scan...</p>
                  ) : (
                    <ul>
                      {attendees.map(a => (
                        <li key={a.id}>
                          <span className="attendee-name">{a.users?.full_name || a.users?.email}</span>
                          <span className="attendee-time">
                            {new Date(a.marked_at).toLocaleTimeString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- ANALYTICS & DEFAULTERS TAB --- */}
        {activeTab === 'analytics' && (
          <div className="tab-content analytics-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Defaulters List</h2>
                <p className="subtitle" style={{ margin: 0, marginTop: '5px' }}>Total Sessions Conducted: <strong>{totalSessions}</strong></p>
              </div>
              <button className="velaar-btn" onClick={handlePrint} disabled={analyticsLoading || totalSessions === 0}>
                Export PDF
              </button>
            </div>

            {analyticsLoading ? (
              <div className="feature-loading">Calculating attendance...</div>
            ) : totalSessions === 0 ? (
              <div className="feature-empty">No attendance sessions recorded yet.</div>
            ) : (
              <div className="marks-table-wrapper" style={{ marginTop: '20px' }}>
                <table className="marks-table printable-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px', textAlign: 'center' }}>Roll No</th>
                      <th style={{ textAlign: 'left' }}>Student Name</th>
                      <th style={{ textAlign: 'center' }}>Sessions Attended</th>
                      <th style={{ textAlign: 'center' }}>Attendance (%)</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.map(student => {
                      const isDefaulter = student.percentage < 75;
                      return (
                        <tr key={student.id} style={{ background: isDefaulter ? 'rgba(239, 68, 68, 0.4)' : 'transparent' }}>
                          <td style={{ textAlign: 'center' }}>{student.rollNo}</td>
                          <td style={{ textAlign: 'left', fontWeight: isDefaulter ? '600' : 'normal', color: '#ffffff' }}>{student.name}</td>
                          <td style={{ textAlign: 'center', color: '#ffffff' }}>{student.attended} / {totalSessions}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                            {isDefaulter ? (
                              <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>{student.percentage}%</span>
                            ) : (
                              <span style={{ color: '#ffffff', fontSize: '0.9rem' }}>{student.percentage}%</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isDefaulter ? (
                              <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>Defaulter</span>
                            ) : (
                              <span style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>Safe</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AttendanceSession;

