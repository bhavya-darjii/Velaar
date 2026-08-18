/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './EditMarks.css';

// ─── DB column mapping ────────────────────────────────────────────────────────
const DB_COLUMN = {
  tt1:    'tt1_marks',
  tt2:    'tt2_marks',
  endSem: 'ese_marks',
};
// Pre-computed effective totals — { studentId: number } — fetched directly by risk page
const EFFECTIVE_COLUMN = {
  tt1:    'tt1_effective',
  tt2:    'tt2_effective',
  endSem: 'ese_effective',
};

// Draft key for localStorage — persists unsaved marks across tab switches
const draftKey = (courseId, examId) => `velaar_marks_draft_${courseId}_${examId}`;

// ─── Best-of-N logic ──────────────────────────────────────────────────────────
/**
 * For a parent question, derive how many sub-answers to count:
 *   attemptsAllowed = floor(q.marks / maxSubMarks)
 * e.g. q.marks=8, subs each worth 4  →  8/4 = 2  (best 2 of N)
 *
 * Then, given the student's scores for all subs in that parent question,
 * pick the best `attemptsAllowed` scores and sum them.
 */
const bestOfScores = (scores, parentQMarks, maxSubMarks) => {
  if (!scores.length) return 0;
  if (!parentQMarks || !maxSubMarks) return scores.reduce((s, v) => s + v, 0);
  const n = Math.max(1, Math.floor(parentQMarks / maxSubMarks));
  return scores
    .slice()
    .sort((a, b) => b - a)   // descending
    .slice(0, n)
    .reduce((s, v) => s + v, 0);
};

/**
 * Given the full pattern and a student's raw marksMap,
 * compute the effective total using best-of logic per parent question.
 */
const computeEffectiveTotal = (pattern, studentMarks) => {
  if (!pattern || !studentMarks) return null;
  let total = 0;
  let hasAny = false;

  pattern.forEach(q => {
    const maxSubMarks = q.subs.length > 0 ? Math.max(...q.subs.map(s => s.marks || 0)) : 0;
    const scores = q.subs.map(sub => {
      const key = `q${q.id}${sub.id}`;
      const raw = parseFloat(studentMarks[key] ?? '');
      return isNaN(raw) ? 0 : raw;
    }).filter((_, i) => {
      // Only include if the teacher actually entered something (non-empty)
      const key = `q${q.id}${q.subs[i].id}`;
      return studentMarks[key] !== undefined && studentMarks[key] !== '';
    });

    if (scores.length > 0) {
      hasAny = true;
      total += bestOfScores(scores, q.marks, maxSubMarks);
    }
  });

  return hasAny ? total : null;
};

// ─── Component ────────────────────────────────────────────────────────────────
const EditMarks = () => {
  const { examId } = useParams();
  const { course, setCourse, loading } = useOutletContext();
  const navigate = useNavigate();

  const [marksData, setMarksData] = useState({});
  const [students, setStudents]   = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving]   = useState(false);
  const [maxMarks, setMaxMarks]   = useState(0);
  const [editingCo, setEditingCo] = useState(null);
  const [pattern, setPattern]     = useState([]);  // raw pattern for best-of calc

  // ─── Fetch students ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        let q = supabase.from('users').select('*').eq('user_type', 'student');
        if (course?.institution_id) q = q.eq('institution_id', course.institution_id);
        if (course?.semester)       q = q.eq('semester', course.semester);
        const { data: snap, error } = await q;
        if (error) throw error;
        const loaded = (snap || []).map(d => ({
          uid:    d.id,
          name:   d.full_name || d.name || d.email || 'Unknown Student',
          rollNo: d.roll_no || d.rollNo || d.id.substring(0, 6).toUpperCase(),
        })).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(loaded);
      } catch (err) {
        console.error('Failed to fetch students', err);
      }
    };
    fetchStudents();
  }, [course?.institution_id, course?.semester]);

  // ─── Build questions from pattern ────────────────────────────────────────
  useEffect(() => {
    if (!loading && !course) { navigate('/teacher/create-course'); return; }
    if (!course || !examId) return;

    const patternData = course.exam_patterns?.[examId] || course.examPatterns?.[examId];
    if (patternData?.pattern) {
      const rawPattern = patternData.pattern;
      setPattern(rawPattern);

      const generated = [];
      rawPattern.forEach(q => {
        q.subs.forEach(sub => {
          generated.push({
            id:        `q${q.id}${sub.id}`,
            label:     `Q.${q.id} ${sub.id})`,
            co:        sub.co && sub.co !== '-' ? sub.co : '1',
            max:       sub.marks || 0,
            parentQId: q.id,
            subId:     sub.id,
            // Annotate how many best-of for parent Q
            parentQMarks:  q.marks,
            parentQSubs:   q.subs.length,
            maxSubMarks:   Math.max(...q.subs.map(s => s.marks || 0)),
          });
        });
      });
      setQuestions(generated);
      setMaxMarks(patternData.headerConfig?.maxMarks || 0);
    } else {
      setPattern([]);
      setQuestions([]);
    }

    // Load marks: prefer unsaved localStorage draft, fallback to DB
    const dbCol = DB_COLUMN[examId] || `${examId}_marks`;
    const draft = localStorage.getItem(draftKey(course.id, examId));
    if (draft) {
      try { setMarksData(JSON.parse(draft)); } catch { setMarksData(course[dbCol] || {}); }
    } else {
      setMarksData(course[dbCol] || {});
    }
  }, [course?.id, course?.exam_patterns, loading, navigate, examId]);

  // ─── Mark change handler — also writes draft to localStorage ────────────
  const handleMarkChange = (uid, qId, value) => {
    setMarksData(prev => {
      const next = { ...prev, [uid]: { ...(prev[uid] || {}), [qId]: value } };
      if (course?.id) localStorage.setItem(draftKey(course.id, examId), JSON.stringify(next));
      return next;
    });
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const saveMarks = async () => {
    if (!course?.id) return;
    const dbCol  = DB_COLUMN[examId]       || `${examId}_marks`;
    const effCol = EFFECTIVE_COLUMN[examId] || null;
    setIsSaving(true);
    try {
      // Compute effective totals for every student using best-of-N
      const effectiveTotals = {};
      students.forEach(student => {
        const eff = computeEffectiveTotal(pattern, marksData[student.uid]);
        if (eff !== null) effectiveTotals[student.uid] = eff;
      });

      const updatePayload = { [dbCol]: marksData };
      if (effCol) updatePayload[effCol] = effectiveTotals;

      const { error } = await supabase
        .from('courses')
        .update(updatePayload)
        .eq('id', course.id);
      if (error) throw error;

      setCourse({
        ...course,
        [dbCol]: marksData,
        ...(effCol ? { [effCol]: effectiveTotals } : {}),
      });
      // Clear draft — marks are now persisted in DB
      localStorage.removeItem(draftKey(course.id, examId));
      alert('Marks saved!');
    } catch (err) {
      console.error('Error saving marks:', err);
      alert(`Failed to save marks: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── CO change handler ────────────────────────────────────────────────────
  const handleCoChange = async (parentQId, subId, newCo) => {
    if (!course?.id) return;
    setQuestions(prev => prev.map(q =>
      q.id === `q${parentQId}${subId}` ? { ...q, co: newCo } : q
    ));
    const currentPatterns = course.exam_patterns || course.examPatterns || {};
    const patternData = JSON.parse(JSON.stringify(currentPatterns[examId] || {}));
    if (!patternData.pattern) return;
    const mainQ = patternData.pattern.find(q => q.id === parentQId);
    if (mainQ) {
      const sub = mainQ.subs.find(s => s.id === subId);
      if (sub) {
        sub.co = newCo;
        const updatedPatterns = { ...currentPatterns, [examId]: patternData };
        try {
          await supabase.from('courses').update({ exam_patterns: updatedPatterns }).eq('id', course.id);
          setCourse({ ...course, exam_patterns: updatedPatterns });
        } catch (err) { console.error('Failed to update CO', err); }
      }
    }
  };

  // ─── Derived: which parent-Q groups need "best-of" annotation ────────────
  // For header tooltip: show "Best 2 of 3" etc per parent Q
  const parentQMeta = useMemo(() => {
    const meta = {};
    pattern.forEach(q => {
      const maxSub = Math.max(...q.subs.map(s => s.marks || 0), 1);
      meta[q.id] = {
        marks:          q.marks,
        subsCount:      q.subs.length,
        attemptsNeeded: Math.floor(q.marks / maxSub),
        maxSubMarks:    maxSub,
      };
    });
    return meta;
  }, [pattern]);

  const examTitle =
    examId === 'tt1'    ? 'Term Test - 1' :
    examId === 'tt2'    ? 'Term Test - 2' :
                         'End Semester Examination';

  if (loading || !course) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="edit-marks-container">
      <div className="back-arrow" style={{ marginBottom: 20, display: 'inline-flex', cursor: 'pointer' }} onClick={() => navigate('/teacher/marks')}>
        <span>{'←'} Back to Dashboard</span>
      </div>

      <div className="edit-marks-header glass-card">
        <div>
          <h2 style={{ margin: 0 }}>Edit Marks: {examTitle}</h2>
          {maxMarks > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
              Max marks: {maxMarks} · Best-of logic applied per question group
            </p>
          )}
        </div>
        <button className="save-btn" onClick={saveMarks} disabled={isSaving || questions.length === 0}>
          {isSaving ? 'Saving…' : 'Save Marks'}
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 16, color: '#fff' }}>
          <h3 style={{ color: 'white', marginBottom: 10 }}>No Paper Pattern Found</h3>
          <p>Please go to the <strong>Question Papers</strong> tab and configure the paper pattern for {examTitle} before editing marks.</p>
          <button className="velaar-btn" style={{ marginTop: 20 }} onClick={() => navigate(`/teacher/examination/${examId}`)}>Configure Pattern</button>
        </div>
      ) : (
        <div className="marks-table-wrapper glass-card">
          <table className="marks-table">
            <thead>
              <tr>
                <th colSpan={questions.length + 2} className="test-title">{examTitle}</th>
              </tr>
              <tr className="max-marks-row">
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: 20 }}>Maximum Marks</th>
                <th colSpan={questions.length}>{maxMarks}</th>
              </tr>
              {/* Best-of annotation row */}
              <tr>
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: 20 }}>Best-of Rule</th>
                {questions.map(q => {
                  const m = parentQMeta[q.parentQId];
                  return (
                    <th key={`bestof-${q.id}`} style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                      {m && m.attemptsNeeded < m.subsCount
                        ? `Best ${m.attemptsNeeded}/${m.subsCount}`
                        : '—'}
                    </th>
                  );
                })}
              </tr>
              <tr>
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: 20 }}>Course Outcome</th>
                {questions.map(q => (
                  <th key={`co-${q.id}`} onClick={() => setEditingCo(q.id)} style={{ cursor: 'pointer' }} title="Click to edit CO">
                    {editingCo === q.id ? (
                      <select value={q.co} autoFocus onBlur={() => setEditingCo(null)}
                        onChange={e => { handleCoChange(q.parentQId, q.subId, e.target.value); setEditingCo(null); }}
                        style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 8px', outline: 'none', cursor: 'pointer' }}>
                        {Array.from({ length: course?.lessonPlan?.courseOutcomes?.length || course?.courseOutcomes?.length || 6 }, (_, i) => (
                          <option key={i + 1} value={String(i + 1)} style={{ background: '#1a1a1a', color: '#fff' }}>{i + 1}</option>
                        ))}
                      </select>
                    ) : `CO ${q.co}`}
                  </th>
                ))}
              </tr>
              <tr>
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: 20 }}>Question Max Marks</th>
                {questions.map(q => <th key={`max-${q.id}`}>{q.max}</th>)}
              </tr>
              <tr>
                <th style={{ width: 100 }}>ID / Roll No</th>
                <th style={{ width: 250, textAlign: 'left' }}>Student Name</th>
                {questions.map(q => <th key={`label-${q.id}`}>{q.label}</th>)}
                <th style={{ minWidth: 80 }}>Effective</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={questions.length + 3} style={{ textAlign: 'center', padding: 30, color: '#fff' }}>
                    No students found.
                  </td>
                </tr>
              ) : (
                students.map(student => {
                  const effective = computeEffectiveTotal(pattern, marksData[student.uid]);
                  return (
                    <tr key={student.uid}>
                      <td style={{ textAlign: 'center' }}>{student.rollNo}</td>
                      <td style={{ textAlign: 'left' }}>{student.name}</td>
                      {questions.map(q => (
                        <td key={q.id}>
                          <input
                            type="text"
                            className="mark-input"
                            value={marksData[student.uid]?.[q.id] ?? ''}
                            onChange={e => handleMarkChange(student.uid, q.id, e.target.value)}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#ffffff' }}>
                        {effective !== null ? effective : <span style={{ color: 'rgba(255,255,255,0.35)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EditMarks;
