import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import './ExaminationEditor.css';

const DEFAULT_PATTERN = [
  { id: '1', title: 'Solve any two questions out of three: (05 marks each)', marks: 10, subs: [{ id: 'a', marks: 5, bt: '' }, { id: 'b', marks: 5, bt: '' }, { id: 'c', marks: 5, bt: '' }] },
  { id: '2', title: 'Solve any two questions out of three: (05 marks each)', marks: 10, subs: [{ id: 'a', marks: 5, bt: '' }, { id: 'b', marks: 5, bt: '' }, { id: 'c', marks: 5, bt: '' }] },
  { id: '3', title: 'Solve any two questions out of three: (10 marks each)', marks: 20, subs: [{ id: 'a', marks: 10, bt: '' }, { id: 'b', marks: 10, bt: '' }, { id: 'c', marks: 10, bt: '' }] },
  { id: '4', title: 'Solve any two questions out of three: (10 marks each)', marks: 20, subs: [{ id: 'a', marks: 10, bt: '' }, { id: 'b', marks: 10, bt: '' }, { id: 'c', marks: 10, bt: '' }] }
];

const DEFAULT_HEADER = {
  date: "", // Must be filled compulsorily
  duration: "02.5 Hours",
  maxMarks: "60",
  scheme: "III",
  regularExam: "" // Must be filled compulsorily
};

const BT_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

const ExaminationEditor = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [pattern, setPattern] = useState([]);
  const [headerConfig, setHeaderConfig] = useState(DEFAULT_HEADER);
  const [isEditMode, setIsEditMode] = useState(false);
  const [numSets, setNumSets] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [validationError, setValidationError] = useState(null);

  // 1. Fetch Course Data
  useEffect(() => {
    const fetchCourse = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "courses"), where("teacherId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const courseData = querySnapshot.docs[0].data();
          const docId = querySnapshot.docs[0].id;
          setCourse({ id: docId, ...courseData });

          // Load Saved Pattern or Default
          const savedPatterns = courseData.examPatterns || {};
          if (savedPatterns[examId]) {
            setPattern(savedPatterns[examId].pattern || DEFAULT_PATTERN);
            setHeaderConfig(savedPatterns[examId].headerConfig || DEFAULT_HEADER);
          } else {
            setPattern(DEFAULT_PATTERN);
            setHeaderConfig(DEFAULT_HEADER);
          }
        }
      } catch (err) {
        console.error("Failed to load course details", err);
      }
      setLoading(false);
    };
    fetchCourse();
  }, [examId]);

  // 2. Debounced Auto-Save
  const savePatternToDb = useCallback(async (currentPattern, currentHeader) => {
    if (!course) return;
    setAutoSaveStatus('Saving...');
    try {
      const updatedPatterns = { ...(course.examPatterns || {}), [examId]: { pattern: currentPattern, headerConfig: currentHeader } };
      await updateDoc(doc(db, "courses", course.id), { examPatterns: updatedPatterns });
      setAutoSaveStatus('All changes saved.');
      setTimeout(() => setAutoSaveStatus(''), 3000);
    } catch (err) {
      console.error(err);
      setAutoSaveStatus('Save Failed!');
    }
  }, [course, examId]);

  useEffect(() => {
    if (loading || !course) return;
    const timeoutId = setTimeout(() => { savePatternToDb(pattern, headerConfig); }, 1500);
    return () => clearTimeout(timeoutId);
  }, [pattern, headerConfig, savePatternToDb, loading, course]);

  // 3. UI Handlers for Modifying Pattern Configs
  const handleBtChange = (qIndex, subIndex, level) => {
    if (isEditMode) return; // Prevent selection while structurally editing
    const updated = [...pattern];
    updated[qIndex].subs[subIndex].bt = level;
    setPattern(updated);
  };

  const handleStructuralChange = (qIndex, field, value) => {
    const updated = [...pattern];
    updated[qIndex][field] = value;
    setPattern(updated);
  };

  const handleSubStructuralChange = (qIndex, subIndex, field, value) => {
    const updated = [...pattern];
    updated[qIndex].subs[subIndex][field] = value;
    setPattern(updated);
  };

  const addSubQuestion = (qIndex) => {
    const updated = [...pattern];
    const newId = String.fromCharCode(97 + updated[qIndex].subs.length); // a, b, c, d...
    updated[qIndex].subs.push({ id: newId, marks: 5, bt: '' });
    setPattern(updated);
  };

  const removeSubQuestion = (qIndex, subIndex) => {
    const updated = [...pattern];
    updated[qIndex].subs.splice(subIndex, 1);
    setPattern(updated);
  };

  const addMainQuestion = () => {
    const newId = String(pattern.length + 1);
    setPattern([...pattern, { id: newId, title: 'New Question Block', marks: 10, subs: [] }]);
  };

  const removeMainQuestion = (qIndex) => {
    const updated = [...pattern];
    updated.splice(qIndex, 1);
    // Re-index
    updated.forEach((q, i) => q.id = String(i + 1));
    setPattern(updated);
  };

  // 4. Generation Validation
  const handleGenerate = async () => {
    // Validation pre-flight checks
    if (!headerConfig.date) {
      return setValidationError("You must specify the Date of Exam in the Configuration panel before generating.");
    }
    if (!headerConfig.regularExam) {
      return setValidationError("You must specify the Regular Examination details (e.g. SY Semester: IV).");
    }
    
    if (pattern.length === 0) {
      return setValidationError("Your paper pattern structure is completely empty.");
    }

    let missingBt = false;
    for (const q of pattern) {
      for (const s of q.subs) {
        if (!s.bt) missingBt = true;
      }
    }
    if (missingBt) {
      return setValidationError("You must select a Bloom's Taxonomy (BT) cognitive level for EVERY subquestion. Scroll up to verify none are missing.");
    }

    if (numSets < 1 || numSets > 5) {
      return setValidationError("Batch generations are limited to a maximum of 5 sets at once.");
    }
    
    setGenerating(true);
    try {
      const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${backendUrl}/export/exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: course,
          examType: examId,
          pattern: pattern,
          headerConfig: headerConfig,
          numSets: numSets
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // If batch, we return .zip from backend, else .docx
      a.download = `${course.subjectName || 'Exam'}_${examId}_Generated.${numSets > 1 ? 'zip' : 'docx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
    } catch (err) {
      console.error(err);
      setValidationError(`Generation failed: ${err.message}`);
    }
    setGenerating(false);
  };

  if (loading) return <div style={{textAlign:'center', marginTop:'50px', color:'white'}}>Loading Editor...</div>;

  return (
    <div className="editor-container fade-in">
      <div className="editor-header-nav">
        <div className="header-title-group" style={{width: '100%'}}>
          <div className="back-arrow" onClick={() => navigate('/teacher/examination')}>
            <span>←</span> Back
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px' }}>
            <h2 style={{ margin: 0 }}>
              {examId === 'endSem' ? 'End Semester Exam' : `Term Test ${examId.replace('tt', '')}`} Pattern
            </h2>
            <button 
              className="btn-secondary-outline" 
              onClick={() => setIsEditMode(!isEditMode)}
            >
              {isEditMode ? 'Done Editing' : 'Edit Paper Pattern'}
            </button>
          </div>
          
          <p style={{marginTop: '5px'}}>
            {isEditMode 
              ? "Structurally modify the paper layout. Changes autosave instantly." 
              : "Select precise Bloom's Taxonomy brackets to map questions accurately."}
            <span style={{marginLeft: '15px', color: '#a78bfa'}}>{autoSaveStatus}</span>
          </p>
        </div>
      </div>

      {isEditMode && (
        <div className="question-block" style={{border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.02)'}}>
          <h3 style={{color: '#fff', marginTop: 0}}>Institutional Meta-Data</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr)', gap: '20px', marginTop: '20px'}}>
            <div>
              <label style={{color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase'}}>Max. Marks</label>
              <input type="text" className="edit-input-title" style={{marginTop: '8px'}} value={headerConfig.maxMarks} onChange={e => setHeaderConfig({...headerConfig, maxMarks: e.target.value})} />
              <p style={{color: '#94a3b8', fontSize: '0.85rem', marginTop: '8px'}}>The rest of the dynamic metadata fields (Date, Exam Text) are configured at the generation step below.</p>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Header Configuration Summary */}
      {!isEditMode && (
        <div className="question-block" style={{padding: '15px 24px', display: 'flex', flexWrap: 'wrap', gap: '20px', background: 'rgba(255,255,255,0.02)', border: 'none'}}>
           <div style={{color: '#fff', fontSize: '0.95rem'}}><strong style={{color:'#94a3b8'}}>Date:</strong> {headerConfig.date}</div>
           <div style={{color: '#fff', fontSize: '0.95rem'}}><strong style={{color:'#94a3b8'}}>Marks:</strong> {headerConfig.maxMarks}</div>
           <div style={{color: '#fff', fontSize: '0.95rem'}}><strong style={{color:'#94a3b8'}}>Duration:</strong> {headerConfig.duration}</div>
           <div style={{color: '#fff', fontSize: '0.95rem'}}><strong style={{color:'#94a3b8'}}>Scheme:</strong> {headerConfig.scheme}</div>
           <div style={{color: '#fff', fontSize: '0.95rem'}}><strong style={{color:'#94a3b8'}}>Academic Year:</strong> {headerConfig.regularExam}</div>
        </div>
      )}

      <div className="pattern-builder">
        {pattern.map((q, qIndex) => (
          <div key={`q_${qIndex}`} className="question-block">
            
            <div className="question-header">
              {isEditMode ? (
                <div style={{display:'flex', gap:'10px', width: '100%', alignItems: 'center'}}>
                  <span style={{color: 'white', fontWeight: 'bold'}}>Q.{q.id}</span>
                  <input type="text" className="edit-input-title" value={q.title} onChange={e => handleStructuralChange(qIndex, 'title', e.target.value)} />
                  <span style={{color: 'gray'}}>Max:</span>
                  <input type="number" className="edit-input-small" value={q.marks} onChange={e => handleStructuralChange(qIndex, 'marks', parseInt(e.target.value)||0)} />
                  <button className="btn-danger" onClick={() => removeMainQuestion(qIndex)}>Remove Block</button>
                </div>
              ) : (
                <>
                  <h3>Q.{q.id} <span style={{fontSize:'1.1rem', color:'#94a3b8', fontWeight:'normal'}}>{q.title}</span></h3>
                  <div style={{fontSize:'1.1rem', fontWeight:'bold', color: '#fff'}}>{q.marks} Marks</div>
                </>
              )}
            </div>

            <div className="subquestions-container">
              {q.subs.map((sub, subIndex) => (
                <div key={`sub_${qIndex}_${subIndex}`} className="subquestion-row">
                  <div className="subquestion-header">
                    <span>{sub.id}) Syllabus mapped Sub-Question</span>
                    
                    {isEditMode ? (
                      <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                         <label style={{color: 'gray'}}>Marks:</label>
                         <input type="number" className="edit-input-small" value={sub.marks} onChange={e => handleSubStructuralChange(qIndex, subIndex, 'marks', parseInt(e.target.value)||0)} />
                        <button className="btn-danger" style={{padding: '4px 8px'}} onClick={() => removeSubQuestion(qIndex, subIndex)}>Remove</button>
                      </div>
                    ) : (
                      <span style={{color: 'rgba(255, 255, 255, 0.7)'}}>[ {sub.marks} Marks | Auto CO ]</span>
                    )}
                  </div>
                  
                  {!isEditMode && (
                    <div className="bt-pill-group">
                      {BT_LEVELS.map(lvl => (
                        <div 
                          key={lvl} 
                          className={`bt-pill ${sub.bt === lvl ? 'active' : ''}`}
                          onClick={() => handleBtChange(qIndex, subIndex, lvl)}
                        >
                          {lvl}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isEditMode && (
                <button className="btn-add-sub" onClick={() => addSubQuestion(qIndex)}>
                  + Add Sub-Question
                </button>
              )}
            </div>
            
          </div>
        ))}

        {isEditMode && (
          <button className="btn-secondary-outline" style={{width: '100%', padding: '15px', marginTop: '10px'}} onClick={addMainQuestion}>
            + Block New Main Question
          </button>
        )}
      </div>

      {!isEditMode && (
        <div className="generation-configurator" style={{ marginTop: '50px' }}>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px'}}>
             <h3 style={{color: 'white', margin: '0 0 5px 0'}}>Generative Pre-Flight Parameters</h3>
             
             <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
               <div>
                 <label style={{display: 'block', color: '#fff', fontWeight: 600, marginBottom: '8px'}}>Date of Exam <span style={{color: '#ef4444'}}>*</span></label>
                 <input type="date" className="edit-input-title" style={{margin: 0}} value={headerConfig.date} onChange={e => setHeaderConfig({...headerConfig, date: e.target.value})} />
               </div>
               <div>
                 <label style={{display: 'block', color: '#fff', fontWeight: 600, marginBottom: '8px'}}>Regular Examination <span style={{color: '#ef4444'}}>*</span></label>
                 <input type="text" placeholder="e.g. SY Semester: IV" className="edit-input-title" style={{margin: 0}} value={headerConfig.regularExam} onChange={e => setHeaderConfig({...headerConfig, regularExam: e.target.value})} />
               </div>
             </div>
          </div>
          
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <h3 style={{color: 'white', margin: '0 0 5px 0'}}>Final Export Calibration</h3>
              <p style={{color: '#94a3b8', margin: 0}}>Select how many entirely distinct question papers you need to generate.</p>
            </div>
            
            <div className="batch-input-group">
              <label>Number of Sets:</label>
              <input 
                type="number" 
                min="1" 
                max="5" 
                className="batch-input"
                value={numSets}
                onChange={(e) => setNumSets(parseInt(e.target.value)||1)} 
              />
            </div>
          </div>
          
          <button 
            className="btn-super-generate"
            disabled={generating}
            onClick={handleGenerate}
          >
            {generating ? 'Velaar AI is Drafting Batch...' : 'Generate Validated Question Papers'}
          </button>
        </div>
      )}

      {/* Validation Modal Overlay */}
      {validationError && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10, 15, 30, 0.7)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1e1432', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '20px', minWidth: '320px', maxWidth: '420px', padding: '40px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', color: 'white' }}>
            <div style={{ color: '#ffcc00', marginBottom: '15px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'white', marginTop: 0 }}>Hold up!</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.6' }}>
              {validationError}
            </p>
            <button 
              onClick={() => setValidationError(null)}
              style={{ width: '100%', padding: '14px', fontSize: '1rem', background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
            >
              I'll fix it
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExaminationEditor;
