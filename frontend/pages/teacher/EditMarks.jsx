import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import './EditMarks.css';

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

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        let q = supabase.from('users').select('*').eq('user_type', 'student');
        if (course?.institution_id) {
          q = q.eq('institution_id', course.institution_id);
        }
        if (course?.semester) {
          q = q.eq('semester', course.semester);
        }

        const { data: snap, error } = await q;
        if (error) throw error;

        const loadedStudents = [];
        (snap || []).forEach(data => {
          loadedStudents.push({
            uid: data.id,
            name: data.full_name || data.name || data.email || "Unknown Student",
            rollNo: data.rollNo || data.id.substring(0, 4).toUpperCase()
          });
        });
        loadedStudents.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(loadedStudents);
      } catch (err) {
        console.error("Failed to fetch students", err);
      }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!loading && !course) {
      navigate('/teacher/create-course');
    } else if (course && examId) {
      // Dynamically build questions from Examination Editor pattern
      const patternData = course.exam_patterns?.[examId] || course.examPatterns?.[examId];
      if (patternData && patternData.pattern) {
        const generatedQuestions = [];
        patternData.pattern.forEach(q => {
          q.subs.forEach(sub => {
            generatedQuestions.push({
              id: `q${q.id}${sub.id}`,
              label: `Q.${q.id} ${sub.id})`,
              co: sub.co && sub.co !== '-' ? sub.co : '1',
              max: sub.marks || 0,
              parentQId: q.id,
              subId: sub.id
            });
          });
        });
        setQuestions(generatedQuestions);
        setMaxMarks(patternData.headerConfig?.maxMarks || 0);
      } else {
        // Fallback or empty state if no pattern exists
        setQuestions([]);
      }

      // Load existing marks or init empty
      const dbMarksField = `${examId}_marks`;
      const fallbackField = `${examId}Marks`;
      if (course[dbMarksField]) {
        setMarksData(course[dbMarksField]);
      } else if (course[fallbackField]) {
        setMarksData(course[fallbackField]);
      } else {
        setMarksData({});
      }
    }
  }, [course, loading, navigate, examId]);

  const handleMarkChange = (uid, qId, value) => {
    setMarksData(prev => ({
      ...prev,
      [uid]: {
        ...(prev[uid] || {}),
        [qId]: value
      }
    }));
  };

  const saveMarks = async () => {
    if (!course?.id) return;
    setIsSaving(true);
    try {
      const dbMarksField = `${examId}_marks`;
      const { error } = await supabase
        .from('courses')
        .update({ [dbMarksField]: marksData })
        .eq('id', course.id);
        
      if (error) throw error;
      setCourse({ ...course, [dbMarksField]: marksData });
      alert("Marks saved successfully!");
    } catch (error) {
      console.error("Error saving marks:", error);
      alert("Failed to save marks.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoChange = async (parentQId, subId, newCo) => {
     if (!course?.id) return;
     setQuestions(prev => prev.map(q => q.id === `q${parentQId}${subId}` ? { ...q, co: newCo } : q));
     
     const currentPatterns = course.exam_patterns || course.examPatterns || {};
     const patternData = JSON.parse(JSON.stringify(currentPatterns[examId] || {}));
     if (!patternData.pattern) return;
     
     const mainQ = patternData.pattern.find(q => q.id === parentQId);
     if (mainQ) {
        const sub = mainQ.subs.find(s => s.id === subId);
        if (sub) {
           sub.co = newCo;
           const updatedPatterns = { 
             ...currentPatterns, 
             [examId]: patternData 
           };
           try {
             await supabase.from('courses').update({ exam_patterns: updatedPatterns }).eq('id', course.id);
             setCourse({ ...course, exam_patterns: updatedPatterns });
           } catch (err) {
             console.error("Failed to update CO", err);
           }
        }
     }
  };

  const examTitle = examId === 'tt1' ? 'Term Test - 1' : examId === 'tt2' ? 'Term Test - 2' : 'End Semester Examination';

  if (loading || !course) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="edit-marks-container">
      <div className="back-arrow" style={{marginBottom: '20px', display: 'inline-flex'}} onClick={() => navigate('/teacher/marks')}>
        <span>←</span> Back to Dashboard
      </div>
      <div className="edit-marks-header glass-card">
        <h2>Edit Marks: {examTitle}</h2>
        <button className="save-btn" onClick={saveMarks} disabled={isSaving || questions.length === 0}>
          {isSaving ? "Saving..." : "Save Marks"}
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="glass-card" style={{padding: '40px', textAlign: 'center', borderRadius: '16px', color: '#ffffff'}}>
          <h3 style={{color: 'white', marginBottom: '10px'}}>No Paper Pattern Found</h3>
          <p>Please go to the <strong>Question Papers</strong> tab and configure the paper pattern for {examTitle} before editing marks.</p>
          <button className="velaar-btn" style={{marginTop: '20px'}} onClick={() => navigate(`/teacher/examination/${examId}`)}>Configure Pattern</button>
        </div>
      ) : (
        <div className="marks-table-wrapper glass-card">
          <table className="marks-table">
            <thead>
              <tr>
                <th colSpan={questions.length + 2} className="test-title">{examTitle}</th>
              </tr>
              <tr className="max-marks-row">
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }}>Maximum Marks</th>
                <th colSpan={questions.length}>{maxMarks}</th>
              </tr>
              <tr>
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }}>Course Outcome</th>
                {questions.map(q => (
                  <th key={`co-${q.id}`} onClick={() => setEditingCo(q.id)} style={{cursor: 'pointer'}} title="Click to edit CO">
                     {editingCo === q.id ? (
                        <select 
                           value={q.co} 
                           autoFocus
                           onBlur={() => setEditingCo(null)}
                           onChange={e => {
                              handleCoChange(q.parentQId, q.subId, e.target.value);
                              setEditingCo(null);
                           }}
                           style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '2px 8px', outline: 'none', cursor: 'pointer', textAlign: 'center' }}
                        >
                           {Array.from({ length: course?.lessonPlan?.courseOutcomes?.length || course?.courseOutcomes?.length || 6 }, (_, i) => (
                             <option key={i+1} value={String(i+1)} style={{background: '#1a1a1a', color: '#fff'}}>{i+1}</option>
                           ))}
                        </select>
                     ) : (
                        `CO ${q.co}`
                     )}
                  </th>
                ))}
              </tr>
              <tr>
                <th colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }}>Question Maximum Marks</th>
                {questions.map(q => (
                  <th key={`max-${q.id}`}>{q.max}</th>
                ))}
              </tr>
              <tr>
                <th style={{ width: '100px' }}>ID / Roll No</th>
                <th style={{ width: '250px', textAlign: 'left' }}>Student Name</th>
                {questions.map(q => (
                  <th key={`label-${q.id}`}>{q.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={questions.length + 2} style={{textAlign: 'center', padding: '30px', color: '#ffffff'}}>
                    No students found in the database.
                  </td>
                </tr>
              ) : (
                students.map(student => (
                  <tr key={student.uid}>
                    <td style={{ textAlign: 'center' }}>{student.rollNo}</td>
                    <td style={{ textAlign: 'left' }}>{student.name}</td>
                    {questions.map(q => (
                      <td key={q.id}>
                        <input
                          type="text"
                          className="mark-input"
                          value={marksData[student.uid]?.[q.id] || ""}
                          onChange={(e) => handleMarkChange(student.uid, q.id, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EditMarks;
