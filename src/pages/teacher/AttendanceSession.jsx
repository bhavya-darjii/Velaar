import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { db, auth } from '../../services/firebase';
import { collection, addDoc, onSnapshot, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import './AttendanceSession.css';

const AttendanceSession = () => {
  const { course } = useOutletContext() || {};
  const courseId = course?.id || 'demo-course';
  const [sessionActive, setSessionActive] = useState(false);
  const [qrString, setQrString] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [attendees, setAttendees] = useState([]);
  
  // Create a new session in Firestore
  const startSession = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const newQrString = `${courseId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const docRef = await addDoc(collection(db, 'attendance_sessions'), {
        courseId,
        teacherId: user.uid,
        qrCodeString: newQrString,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
        active: true
      });
      
      setSessionId(docRef.id);
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
        await updateDoc(doc(db, 'attendance_sessions', sessionId), {
          active: false
        });
      } catch (err) {
        console.error("Error stopping session:", err);
      }
    }
    setSessionActive(false);
    setSessionId(null);
    setQrString('');
  };

  // Refresh QR code every 25 seconds (before 30s expiry)
  useEffect(() => {
    let interval;
    if (sessionActive && sessionId) {
      interval = setInterval(async () => {
        const newQrString = `${courseId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        try {
          await updateDoc(doc(db, 'attendance_sessions', sessionId), {
            qrCodeString: newQrString,
            expiresAt: new Date(Date.now() + 10 * 1000)
          });
          setQrString(newQrString);
        } catch (err) {
          console.error("Error updating QR code:", err);
        }
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [sessionActive, sessionId, courseId]);

  // Listen for attendees
  useEffect(() => {
    if (!sessionId) return;
    const q = query(collection(db, 'attendance_logs'), where('sessionId', '==', sessionId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttendees(logs);
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionActive) stopSession();
    };
  }, [sessionActive]);

  return (
    <div className="attendance-session-container">
      <div className="glass-panel">
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
                      <span className="attendee-name">{a.studentName || a.studentEmail}</span>
                      <span className="attendee-time">
                        {a.timestamp?.toDate ? a.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceSession;
