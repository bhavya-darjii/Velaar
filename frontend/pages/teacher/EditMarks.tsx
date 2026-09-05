/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import GlassSelect from '../../components/shared/GlassSelect';
import './EditMarks.css';
import '../teacher/MarksDashboard.css';

// ─── DB column mapping ────────────────────────────────────────────────────────
const DB_COLUMN = {
  tt1: 'tt1_marks',
  tt2: 'tt2_marks',
  endSem: 'ese_marks',
};
const EFFECTIVE_COLUMN = {
  tt1: 'tt1_effective',
  tt2: 'tt2_effective',
  endSem: 'ese_effective',
};

// Draft key for localStorage — persists unsaved marks across tab switches
const draftKey = (courseId, examId) => `velaar_marks_draft_${courseId}_${examId}`;

// ─── Best-of-N logic ──────────────────────────────────────────────────────────
const bestOfScores = (scores, parentQMarks, maxSubMarks) => {
  if (!scores.length) return 0;
  if (!parentQMarks || !maxSubMarks) return scores.reduce((s, v) => s + v, 0);
  const n = Math.max(1, Math.floor(parentQMarks / maxSubMarks));
  return scores
    .slice()
    .sort((a, b) => b - a)
    .slice(0, n)
    .reduce((s, v) => s + v, 0);
};

const computeEffectiveTotal = (pattern, studentMarks) => {
  if (!pattern || !studentMarks) return null;
  let total = 0;

  for (const q of pattern) {
    const maxSubMarks = q.subs.length > 0 ? Math.max(...q.subs.map(s => s.marks || 0)) : 0;
    const attemptsNeeded = maxSubMarks > 0 ? Math.max(1, Math.floor(q.marks / maxSubMarks)) : 1;

    // Collect filled (non-empty) scores for this question group
    const filledScores = q.subs
      .map(sub => {
        const key = `q${q.id}${sub.id}`;
        const raw = parseFloat(studentMarks[key] ?? '');
        return { key, value: studentMarks[key], raw };
      })
      .filter(({ value }) => value !== undefined && value !== '');

    // Not enough answers filled yet — effective is incomplete
    if (filledScores.length < attemptsNeeded) return null;

    const scores = filledScores.map(({ raw }) => (isNaN(raw) ? 0 : raw));
    total += bestOfScores(scores, q.marks, maxSubMarks);
  }

  return total;
};

// ─── Component ────────────────────────────────────────────────────────────────
const EditMarks = () => {
  const { examId } = useParams();
  const { course, setCourse, loading } = useOutletContext();
  const navigate = useNavigate();

  const [marksData, setMarksData] = useState({});
  const [students, setStudents] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [maxMarks, setMaxMarks] = useState(0);
  const [editingCo, setEditingCo] = useState(null);
  const [pattern, setPattern] = useState([]);
  const [loadingMarks, setLoadingMarks] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Fetch students ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        let q = supabase.from('users').select('*').eq('user_type', 'student');
        if (course?.institution_id) q = q.eq('institution_id', course.institution_id);
        if (course?.semester) q = q.eq('semester', course.semester);
        const { data: snap, error } = await q;
        if (error) throw error;
        const loaded = (snap || []).map(d => ({
          uid: d.id,
          name: d.full_name || d.name || d.email || 'Unknown Student',
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
            id: `q${q.id}${sub.id}`,
            label: `Q.${q.id} ${sub.id})`,
            co: sub.co && sub.co !== '-' ? sub.co : '1',
            max: sub.marks || 0,
            parentQId: q.id,
            subId: sub.id,
            parentQMarks: q.marks,
            parentQSubs: q.subs.length,
            maxSubMarks: Math.max(...q.subs.map(s => s.marks || 0)),
          });
        });
      });
      setQuestions(generated);
      setMaxMarks(patternData.headerConfig?.maxMarks || 0);
    } else {
      setPattern([]);
      setQuestions([]);
    }
  }, [course?.id, course?.exam_patterns, loading, navigate, examId]);

  // ─── Always fetch fresh marks from Supabase, then layer localStorage draft ─
  useEffect(() => {
    if (!course?.id || !examId) return;

    const fetchFreshMarks = async () => {
      setLoadingMarks(true);
      const dbCol = DB_COLUMN[examId] || `${examId}_marks`;
      try {
        const { data, error } = await supabase
          .from('courses')
          .select(dbCol)
          .eq('id', course.id)
          .single();

        if (error) throw error;

        // Start with the freshly-fetched DB values as the base
        const dbMarks = data?.[dbCol] || {};

        // Layer any unsaved localStorage draft ON TOP (draft takes precedence
        // only for keys the teacher has edited since last save)
        const draftRaw = localStorage.getItem(draftKey(course.id, examId));
        if (draftRaw) {
          try {
            const draft = JSON.parse(draftRaw);
            // Merge: for each student in the draft, merge question keys
            const merged = { ...dbMarks };
            Object.keys(draft).forEach(uid => {
              merged[uid] = { ...(dbMarks[uid] || {}), ...draft[uid] };
            });
            setMarksData(merged);
          } catch {
            setMarksData(dbMarks);
          }
        } else {
          setMarksData(dbMarks);
        }
      } catch (err) {
        console.error('Failed to fetch fresh marks from DB', err);
        // Fallback to what was cached in course object
        const dbCol = DB_COLUMN[examId] || `${examId}_marks`;
        setMarksData(course[dbCol] || {});
      } finally {
        setLoadingMarks(false);
      }
    };

    fetchFreshMarks();
  }, [course?.id, examId]);

  // ─── Mark change handler — stores raw value (no clamping), writes draft to localStorage ───
  const handleMarkChange = (uid, qId, value, maxAllowed) => {
    // Allow empty string (clearing a field)
    if (value === '') {
      setMarksData(prev => {
        const next = { ...prev, [uid]: { ...(prev[uid] || {}), [qId]: '' } };
        if (course?.id) localStorage.setItem(draftKey(course.id, examId), JSON.stringify(next));
        return next;
      });
      return;
    }

    // Only allow digits and one decimal point
    if (!/^\d*\.?\d*$/.test(value)) return;

    // Store raw value — over-max entries are shown with a red pill, not auto-clamped
    setMarksData(prev => {
      const next = { ...prev, [uid]: { ...(prev[uid] || {}), [qId]: value } };
      if (course?.id) localStorage.setItem(draftKey(course.id, examId), JSON.stringify(next));
      return next;
    });
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const saveMarks = async () => {
    if (!course?.id) return;

    // Block save if any mark exceeds its question's max
    const overMaxErrors: string[] = [];
    students.forEach(student => {
      questions.forEach(q => {
        const num = parseFloat(marksData[student.uid]?.[q.id] ?? '');
        if (!isNaN(num) && num > q.max) {
          overMaxErrors.push(`${student.name} — ${q.label} (entered ${num}, max ${q.max})`);
        }
      });
    });
    if (overMaxErrors.length > 0) {
      showToast(
        `Fix ${overMaxErrors.length} over-limit mark${overMaxErrors.length > 1 ? 's' : ''} before saving.`,
        'error'
      );
      return;
    }

    const dbCol = DB_COLUMN[examId] || `${examId}_marks`;
    const effCol = EFFECTIVE_COLUMN[examId] || null;
    setIsSaving(true);
    try {
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
      showToast('Marks saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving marks:', err);
      showToast(`Failed to save marks: ${err.message || JSON.stringify(err)}`, 'error');
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

  // ─── Derived: best-of annotation per parent Q ────────────────────────────
  const parentQMeta = useMemo(() => {
    const meta = {};
    pattern.forEach(q => {
      const maxSub = Math.max(...q.subs.map(s => s.marks || 0), 1);
      meta[q.id] = {
        marks: q.marks,
        subsCount: q.subs.length,
        attemptsNeeded: Math.floor(q.marks / maxSub),
        maxSubMarks: maxSub,
      };
    });
    return meta;
  }, [pattern]);

  const examTitle =
    examId === 'tt1' ? 'Term Test - 1' :
      examId === 'tt2' ? 'Term Test - 2' :
        'End Semester Examination';

  if (loading || !course) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="edit-marks-container">
      {/* ─── Toast Notification ─── */}
      {toast && (
        <div className={`em-toast em-toast--${toast.type}`}>
          <span className="em-toast__dot" />
          <span className="em-toast__msg">{toast.message}</span>
          <span className="em-toast__close" onClick={() => setToast(null)}>×</span>
        </div>
      )}

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
      ) : loadingMarks ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderRadius: 16, color: '#fff' }}>
          Loading marks from database…
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
                      <GlassSelect
                        value={String(q.co)}
                        style={{ width: '70px', display: 'inline-block' }}
                        onChange={val => { handleCoChange(q.parentQId, q.subId, val); setEditingCo(null); }}
                        options={Array.from({ length: course?.lessonPlan?.courseOutcomes?.length || course?.courseOutcomes?.length || 6 }, (_, i) => ({
                          value: String(i + 1),
                          label: String(i + 1),
                          title: `Course Outcome ${i + 1}`,
                        }))}
                      />
                    ) : `CO ${q.co}`}
                  </th>
                ))}
              </tr>
              <tr>
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: 20 }}>Question Max Marks</th>
                {questions.map(q => <th key={`max-${q.id}`}>{q.max}</th>)}
              </tr>
              <tr>
                <th style={{ width: 80 }}>ID / Roll No</th>
                <th style={{ width: 180, textAlign: 'left' }}>Student Name</th>
                {questions.map(q => <th key={`label-${q.id}`}>{q.label}</th>)}
                <th style={{ minWidth: 70 }}>Effective</th>
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
                  // True if any entered mark exceeds its question's max
                  const hasOverMax = questions.some(q => {
                    const num = parseFloat(marksData[student.uid]?.[q.id] ?? '');
                    return !isNaN(num) && num > q.max;
                  });
                  return (
                    <tr key={student.uid}>
                      <td style={{ textAlign: 'center' }}>{student.rollNo}</td>
                      <td style={{ textAlign: 'left' }}>{student.name}</td>
                      {questions.map(q => {
                        const val = marksData[student.uid]?.[q.id] ?? '';
                        const num = parseFloat(val);
                        const isOver = !isNaN(num) && num > q.max;
                        return (
                          <td
                            key={q.id}
                            style={isOver ? {
                              background: 'rgba(185,28,28,0.55)',
                              outline: '2px solid #ef4444',
                              outlineOffset: '-2px',
                            } : {}}
                          >
                            <input
                              type="text"
                              inputMode="decimal"
                              className="mark-input"
                              style={isOver ? {
                                background: 'transparent',
                                color: '#fff',
                                fontWeight: 900,
                                textShadow: '0 0 6px rgba(239,68,68,0.9)',
                              } : {}}
                              value={val}
                              onChange={e => handleMarkChange(student.uid, q.id, e.target.value, q.max)}
                              onKeyDown={e => {
                                // Block arrow keys from changing values
                                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                  e.preventDefault();
                                }
                              }}
                              onWheel={e => (e.target as HTMLInputElement).blur()}
                            />
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {effective !== null && !hasOverMax ? (
                          <span style={{ color: '#ffffff' }}>{effective}</span>
                        ) : effective !== null && hasOverMax ? (
                          <span style={{
                            color: '#ef4444',
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid #ef4444',
                            borderRadius: 8,
                            padding: '1px 8px',
                            display: 'inline-block',
                          }}>—</span>
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.35)' }}>—</span>
                        )}
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
