/* eslint-disable */
// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../services/supabase';
import './AttendanceScanner.css';

const AttendanceScanner = () => {
  const [phase, setPhase] = useState('idle'); // idle | scanning | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const scannerRef = useRef(null);
  const html5QrRef = useRef(null);

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        const state = html5QrRef.current.getState();
        // state 2 = SCANNING, state 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrRef.current.stop();
        }
      } catch (e) {
        // ignore
      }
      html5QrRef.current = null;
    }
  };

  const startScanner = async () => {
    setPhase('scanning');

    // Wait for the DOM element to exist
    await new Promise(r => setTimeout(r, 100));

    try {
      const html5Qr = new Html5Qrcode('qr-reader-element');
      html5QrRef.current = html5Qr;

      await html5Qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopScanner();
          setPhase('loading');
          await handleCheckIn(decodedText);
        },
        () => {} // ignore per-frame errors
      );
    } catch (err) {
      setErrorMsg('Could not access camera. Please allow camera permissions and try again.');
      setPhase('error');
    }
  };

  const handleCheckIn = async (qrCodeString) => {
    setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');

      const { data: sessionDocs, error: sessionErr } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('qr_token', qrCodeString);

      if (sessionErr || !sessionDocs || sessionDocs.length === 0) {
        throw new Error("QR Code expired or invalid. Wait for the teacher's screen to refresh and try again.");
      }

      const sessionData = sessionDocs[0];

      if (new Date() > new Date(sessionData.expires_at)) {
        throw new Error('This QR Code has expired. Please scan the new one on screen.');
      }

      const { data: logSnap, error: logErr } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('session_id', sessionData.id)
        .eq('student_id', user.id);

      if (logSnap && logSnap.length > 0) {
        throw new Error('You are already checked in for this session!');
      }

      const { error: insertErr } = await supabase.from('attendance_logs').insert({
        session_id: sessionData.id,
        course_id: sessionData.course_id,
        student_id: user.id
      });

      if (insertErr) {
        if (insertErr.code === '23505') {
          throw new Error('You are already checked in for this session!');
        }
        throw new Error(insertErr.message);
      }

      setSuccessMsg('Attendance marked successfully!');
      setPhase('success');
    } catch (err) {
      setErrorMsg(err.message);
      setPhase('error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="as-page">
      <div className="as-card">

        {/* IDLE — tap to start */}
        {phase === 'idle' && (
          <div className="as-idle">
            <div className="as-qr-icon">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3v3M21 14v2"/>
              </svg>
            </div>
            <h2 className="as-title">Scan to Check-In</h2>
            <p className="as-subtitle">Point your camera at the QR code displayed by your teacher.</p>
            <button className="as-scan-btn" onClick={startScanner}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              OPEN CAMERA
            </button>
          </div>
        )}

        {/* SCANNING — live camera view */}
        {phase === 'scanning' && (
          <div className="as-scanning">
            <div className="as-camera-frame">
              <div id="qr-reader-element" style={{ width: '100%' }} />
              <div className="as-corner as-tl"/><div className="as-corner as-tr"/>
              <div className="as-corner as-bl"/><div className="as-corner as-br"/>
            </div>
            <p className="as-scanning-hint">Align the QR code within the frame</p>
            <button className="as-cancel-btn" onClick={async () => { await stopScanner(); setPhase('idle'); }}>
              Cancel
            </button>
          </div>
        )}

        {/* LOADING */}
        {phase === 'loading' && (
          <div className="as-status">
            <div className="as-spinner" />
            <p className="as-status-text">Verifying attendance…</p>
          </div>
        )}

        {/* SUCCESS */}
        {phase === 'success' && (
          <div className="as-status">
            <div className="as-check-circle">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="as-status-text as-success-text">{successMsg}</p>
            <p className="as-status-sub">Your presence has been recorded.</p>
            <button className="as-scan-btn" style={{marginTop: '20px'}} onClick={() => setPhase('idle')}>
              Scan Again
            </button>
          </div>
        )}
 
        {/* ERROR */}
        {phase === 'error' && (
          <div className="as-status">
            <div className="as-error-circle">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <p className="as-status-text as-error-text">{errorMsg}</p>
            <button className="as-scan-btn" style={{marginTop: '20px'}} onClick={() => setPhase('idle')}>
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default AttendanceScanner;

