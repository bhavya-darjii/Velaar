import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import './ExaminationEditor.css';

const TT_PATTERN = [
  { id: '1', title: 'Answer any two questions out of three: (04 marks each)', marks: 8, subs: [{ id: 'a', marks: 4, bt: '', isNumerical: false }, { id: 'b', marks: 4, bt: '', isNumerical: false }, { id: 'c', marks: 4, bt: '', isNumerical: false }] },
  { id: '2', title: 'Answer any two questions out of three: (04 marks each)', marks: 8, subs: [{ id: 'a', marks: 4, bt: '', isNumerical: false }, { id: 'b', marks: 4, bt: '', isNumerical: false }, { id: 'c', marks: 4, bt: '', isNumerical: false }] },
  { id: '3', title: 'Answer any one question out of two: (04 marks each)', marks: 4, subs: [{ id: 'a', marks: 4, bt: '', isNumerical: false }, { id: 'b', marks: 4, bt: '', isNumerical: false }] }
];

const ENDSEM_PATTERN = [
  { id: '1', title: 'Solve any two questions out of three: (05 marks each)', marks: 10, subs: [{ id: 'a', marks: 5, bt: '', isNumerical: false }, { id: 'b', marks: 5, bt: '', isNumerical: false }, { id: 'c', marks: 5, bt: '', isNumerical: false }] },
  { id: '2', title: 'Solve any two questions out of three: (05 marks each)', marks: 10, subs: [{ id: 'a', marks: 5, bt: '', isNumerical: false }, { id: 'b', marks: 5, bt: '', isNumerical: false }, { id: 'c', marks: 5, bt: '', isNumerical: false }] },
  { id: '3', title: 'Solve any two questions out of three: (10 marks each)', marks: 20, subs: [{ id: 'a', marks: 10, bt: '', isNumerical: false }, { id: 'b', marks: 10, bt: '', isNumerical: false }, { id: 'c', marks: 10, bt: '', isNumerical: false }] },
  { id: '4', title: 'Solve any two questions out of three: (10 marks each)', marks: 20, subs: [{ id: 'a', marks: 10, bt: '', isNumerical: false }, { id: 'b', marks: 10, bt: '', isNumerical: false }, { id: 'c', marks: 10, bt: '', isNumerical: false }] }
];

const todayIso = new Date().toISOString().split('T')[0];

const TT_HEADER = {
  date: todayIso,
  duration: "1 Hour",
  maxMarks: "20",
  scheme: "",
  academicYear: "",
  semester: ""
};

const ENDSEM_HEADER = {
  date: todayIso,
  duration: "2.5 Hours",
  maxMarks: "60",
  scheme: "",
  academicYear: "",
  semester: ""
};

const toRoman = (numStr) => {
  if (!numStr) return '';
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return numStr.toUpperCase();
  const romanMap = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X' };
  return romanMap[num] || numStr.toUpperCase();
};

const DEFAULT_PATTERN = ENDSEM_PATTERN;
const DEFAULT_HEADER = ENDSEM_HEADER;

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
  const [numericalPrompt, setNumericalPrompt] = useState('');
  const [generationMode, setGenerationMode] = useState('ai');
  const [generating, setGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [headerErrors, setHeaderErrors] = useState({});

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

          // Choose relevant default template if not already saved
          const isTT = examId === 'tt1' || examId === 'tt2';
          const localDefaultPattern = isTT ? TT_PATTERN : ENDSEM_PATTERN;
          const localDefaultHeader = isTT ? TT_HEADER : ENDSEM_HEADER;

          // Load Saved Pattern or Default
          const savedPatterns = courseData.examPatterns || {};
          if (savedPatterns[examId]) {
            // Migration: Ensure 'isNumerical' exists in loaded patterns
            let loadedPattern = savedPatterns[examId].pattern || localDefaultPattern;
            
            // Fix for TT1 caching the EndSem pattern from previous versions
            if (isTT && loadedPattern.length === 4) {
                loadedPattern = localDefaultPattern;
            }
            
            const maxCOs = courseData?.lessonPlan?.courseOutcomes?.length || courseData?.courseOutcomes?.length || 6;
            loadedPattern = loadedPattern.map((q, qIndex) => ({
               ...q,
               subs: q.subs.map(s => {
                  let defaultCo = "";
                  if (examId === 'tt1') defaultCo = qIndex === 0 ? "1" : qIndex === 1 ? "2" : qIndex === 2 ? "3" : "1";
                  else if (examId === 'tt2') defaultCo = qIndex === 0 ? "4" : qIndex === 1 ? "5" : qIndex === 2 ? "6" : "4";
                  else if (examId === 'endSem') defaultCo = String(Math.floor(Math.random() * maxCOs) + 1);
                  return { isNumerical: false, ...s, co: examId === 'endSem' ? defaultCo : (s.co ? s.co : defaultCo) };
               })
            }));
            
            // Migration for existing saved configurations
            let loadedHeader = savedPatterns[examId].headerConfig || localDefaultHeader;
            
            // Fix for TT caching EndSem header from previous versions
            if (isTT && loadedHeader.maxMarks === "60") {
              loadedHeader.maxMarks = "20";
              loadedHeader.duration = "1 Hour";
            }
            
            if (loadedHeader.regularExam && !loadedHeader.academicYear) {
              const parts = loadedHeader.regularExam.split(' Semester: ');
              loadedHeader.academicYear = parts[0] || 'SY';
              loadedHeader.semester = parts[1] || 'IV';
              delete loadedHeader.regularExam;
            }
            
            setPattern(loadedPattern);
            setHeaderConfig(loadedHeader);
            setNumericalPrompt(savedPatterns[examId].numericalPrompt || "");
          } else {
            const maxCOs = courseData?.lessonPlan?.courseOutcomes?.length || courseData?.courseOutcomes?.length || 6;
            const mappedDefaultPattern = localDefaultPattern.map((q, qIndex) => ({
               ...q,
               subs: q.subs.map(s => {
                  let defaultCo = "";
                  if (examId === 'tt1') defaultCo = qIndex === 0 ? "1" : qIndex === 1 ? "2" : qIndex === 2 ? "3" : "1";
                  else if (examId === 'tt2') defaultCo = qIndex === 0 ? "4" : qIndex === 1 ? "5" : qIndex === 2 ? "6" : "4";
                  else if (examId === 'endSem') defaultCo = String(Math.floor(Math.random() * maxCOs) + 1);
                  return { ...s, co: defaultCo };
               })
            }));
            setPattern(mappedDefaultPattern);
            setHeaderConfig(localDefaultHeader);
            setNumericalPrompt("");
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
  const savePatternToDb = useCallback(async (currentPattern, currentHeader, currentPrompt) => {
    if (!course) return;
    setIsSaving(true);
    try {
      const updatedPatterns = { 
        ...(course.examPatterns || {}), 
        [examId]: { 
          pattern: currentPattern, 
          headerConfig: currentHeader,
          numericalPrompt: currentPrompt
        } 
      };
      await updateDoc(doc(db, "courses", course.id), { examPatterns: updatedPatterns });
      setTimeout(() => setIsSaving(false), 800);
    } catch (err) {
      console.error(err);
      setTimeout(() => setIsSaving(false), 800);
    }
  }, [course, examId]);

  useEffect(() => {
    if (loading || !course) return;
    const timeoutId = setTimeout(() => { savePatternToDb(pattern, headerConfig, numericalPrompt); }, 1500);
    return () => clearTimeout(timeoutId);
  }, [pattern, headerConfig, numericalPrompt, savePatternToDb, loading, course]);

  // 3. UI Handlers for Modifying Pattern Configs
  const handleBtChange = (qIndex, subIndex, level) => {
    if (isEditMode) return; // Prevent selection while structurally editing
    const updated = [...pattern];
    // If the same level is clicked again, unselect it (set to null or empty string)
    updated[qIndex].subs[subIndex].bt = updated[qIndex].subs[subIndex].bt === level ? "" : level;
    setPattern(updated);
  };

  const handleStructuralChange = (qIndex, field, value) => {
    const updated = [...pattern];
    updated[qIndex][field] = value;
    setPattern(updated);
  };

  const toggleNumerical = (qIndex, subIndex) => {
    const updated = [...pattern];
    updated[qIndex].subs[subIndex].isNumerical = !updated[qIndex].subs[subIndex].isNumerical;
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
    let defaultCo = "";
    const maxCOs = course?.lessonPlan?.courseOutcomes?.length || course?.courseOutcomes?.length || 6;
    if (examId === 'tt1') defaultCo = qIndex === 0 ? "1" : qIndex === 1 ? "2" : qIndex === 2 ? "3" : "1";
    else if (examId === 'tt2') defaultCo = qIndex === 0 ? "4" : qIndex === 1 ? "5" : qIndex === 2 ? "6" : "4";
    else if (examId === 'endSem') defaultCo = String(Math.floor(Math.random() * maxCOs) + 1);
    updated[qIndex].subs.push({ id: newId, marks: 5, bt: '', isNumerical: false, co: defaultCo });
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
    const errors = {};
    if (!headerConfig.date) errors.date = true;
    if (!headerConfig.scheme) errors.scheme = true;
    if (!headerConfig.academicYear) errors.academicYear = true;
    if (!headerConfig.semester) errors.semester = true;

    if (Object.keys(errors).length > 0) {
      setHeaderErrors(errors);
      const headerEl = document.getElementById("exam-header-config");
      if (headerEl) {
        headerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setHeaderErrors({});
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
          numSets: numSets,
          generationMode: generationMode,
          numericalPrompt: numericalPrompt,
          pastNumericals: course?.pastNumericals || []
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
    <div className="lesson-plan-container" style={{ padding: '20px' }}>
      <div className="lesson-plan-grid glass" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '40px' }}>
        <div className="editor-container">
      <div className="editor-header-nav">
        <div className="header-title-group" style={{width: '100%', position: 'relative'}}>
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
          
          <p style={{marginTop: '5px', display: 'flex', alignItems: 'center', minHeight: '32px'}}>
            <span>
              {isEditMode 
                ? "Structurally modify the paper layout. Changes autosave instantly." 
                : "Generate from your Question Bank or draft fresh conceptual exams with AI."}
            </span>
            <div className="saving-status-pill" style={{ 
               marginLeft: '15px', 
               display: 'inline-flex',
               opacity: isSaving ? 1 : 0,
               visibility: isSaving ? 'visible' : 'hidden',
               transition: 'opacity 0.3s ease, visibility 0.3s ease'
            }}>
              <span className="dot"></span> Syncing to Cloud...
            </div>
          </p>
        </div>
      </div>

      {/* Editable Header Configuration Summary */}
      <div id="exam-header-config" style={{ marginBottom: Object.keys(headerErrors).some(k => headerErrors[k]) ? '15px' : '0' }}>
        <div className="question-block" style={{padding: '12px 15px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '10px', background: 'rgba(255, 255, 255, 0.03)', border: Object.keys(headerErrors).some(k => headerErrors[k]) ? '1px solid rgba(234, 88, 12, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><strong style={{color:'#ffffff', fontSize: '0.85rem'}}>Date:</strong> <input type="date" className="edit-input-title" style={{margin: 0, padding: '4px 6px', width: '130px', fontSize: '0.85rem', height: '30px', border: headerErrors.date ? '2px solid #ea580c' : undefined, backgroundColor: headerErrors.date ? 'rgba(234, 88, 12, 0.1)' : undefined}} value={headerConfig.date || ''} onChange={e => {setHeaderConfig({...headerConfig, date: e.target.value}); setHeaderErrors(prev => ({...prev, date: false}));}} /></div>
           <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><strong style={{color:'#ffffff', fontSize: '0.85rem'}}>Marks:</strong> <input type="text" className="edit-input-title" style={{margin: 0, padding: '4px 6px', width: '60px', fontSize: '0.85rem', height: '30px'}} value={headerConfig.maxMarks || ''} onChange={e => setHeaderConfig({...headerConfig, maxMarks: e.target.value})} /></div>
           <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><strong style={{color:'#ffffff', fontSize: '0.85rem'}}>Duration:</strong> <input type="text" className="edit-input-title" style={{margin: 0, padding: '4px 6px', width: '90px', fontSize: '0.85rem', height: '30px'}} value={headerConfig.duration || ''} onChange={e => setHeaderConfig({...headerConfig, duration: e.target.value})} /></div>
           <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><strong style={{color:'#ffffff', fontSize: '0.85rem'}}>Scheme:</strong> <input type="text" className="edit-input-title" placeholder="III" style={{margin: 0, padding: '4px 6px', width: '60px', fontSize: '0.85rem', height: '30px', border: headerErrors.scheme ? '2px solid #ea580c' : undefined, backgroundColor: headerErrors.scheme ? 'rgba(234, 88, 12, 0.1)' : undefined}} value={headerConfig.scheme || ''} onChange={e => {setHeaderConfig({...headerConfig, scheme: toRoman(e.target.value)}); setHeaderErrors(prev => ({...prev, scheme: false}));}} /></div>
           <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><strong style={{color:'#ffffff', fontSize: '0.85rem'}}>Academic Year:</strong> <input type="text" className="edit-input-title" placeholder="SY" style={{margin: 0, padding: '4px 6px', width: '60px', fontSize: '0.85rem', height: '30px', border: headerErrors.academicYear ? '2px solid #ea580c' : undefined, backgroundColor: headerErrors.academicYear ? 'rgba(234, 88, 12, 0.1)' : undefined}} value={headerConfig.academicYear || ''} onChange={e => {setHeaderConfig({...headerConfig, academicYear: e.target.value.toUpperCase()}); setHeaderErrors(prev => ({...prev, academicYear: false}));}} /></div>
           <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><strong style={{color:'#ffffff', fontSize: '0.85rem'}}>Semester:</strong> <input type="text" className="edit-input-title" placeholder="IV" style={{margin: 0, padding: '4px 6px', width: '60px', fontSize: '0.85rem', height: '30px', border: headerErrors.semester ? '2px solid #ea580c' : undefined, backgroundColor: headerErrors.semester ? 'rgba(234, 88, 12, 0.1)' : undefined}} value={headerConfig.semester || ''} onChange={e => {setHeaderConfig({...headerConfig, semester: toRoman(e.target.value)}); setHeaderErrors(prev => ({...prev, semester: false}));}} /></div>
        </div>
        {Object.keys(headerErrors).some(k => headerErrors[k]) && (
           <div style={{ color: '#ea580c', fontSize: '0.85rem', marginTop: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              Please fill out the missing header fields highlighted above before generating the question paper.
           </div>
        )}
      </div>

      {/* Generation Mode Toggle Box */}
      <div className="question-block" style={{ marginTop: '30px', padding: '25px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
         <div style={{ paddingRight: '20px' }}>
            <h3 style={{color: '#ffffff', margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '600'}}>Use Existing Question Bank</h3>
            <p style={{color: '#ffffff', fontSize: '0.9rem', margin: 0, lineHeight: '1.5'}}>
               {generationMode === 'ai' 
                  ? "Currently drafting fresh conceptual exams from scratch using Velaar AI." 
                  : "Currently generating randomized exams exclusively from your previously generated Question Bank."}
            </p>
         </div>
         
         <div 
            onClick={() => {
               const newMode = generationMode === 'ai' ? 'bank' : 'ai';
               setGenerationMode(newMode);
               if (newMode === 'bank') setIsEditMode(false);
            }}
            style={{
               width: '64px',
               height: '34px',
               borderRadius: '34px',
               background: generationMode === 'bank' ? '#ea580c' : 'rgba(255, 255, 255, 0.08)',
               position: 'relative',
               cursor: 'pointer',
               transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
               boxShadow: generationMode === 'bank' ? '0 0 15px rgba(234, 88, 12, 0.4), inset 0 2px 4px rgba(0,0,0,0.2)' : 'inset 0 2px 4px rgba(0,0,0,0.3)',
               border: '1px solid rgba(255, 255, 255, 0.1)',
               flexShrink: 0
            }}
         >
            <div style={{
               width: '28px',
               height: '28px',
               borderRadius: '50%',
               background: '#ffffff',
               position: 'absolute',
               top: '2px',
               left: generationMode === 'bank' ? '32px' : '2px',
               transition: 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.3s ease',
               boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.05)',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
            }}>
               <div style={{
                   width: '4px',
                   height: '12px',
                   borderRadius: '4px',
                   background: generationMode === 'bank' ? '#ea580c' : '#cbd5e1',
                   transition: 'background 0.4s ease'
               }} />
            </div>
         </div>
      </div>

      {true && (
      <div className="pattern-builder">
        {pattern.map((q, qIndex) => (
          <div key={`q_${qIndex}`} className="question-block">
            
            <div className="question-header">
              {isEditMode ? (
                <div style={{display:'flex', gap:'10px', width: '100%', alignItems: 'center'}}>
                  <span style={{color: '#ffffff', fontWeight: 'bold'}}>Q.{q.id}</span>
                  <input type="text" className="edit-input-title" value={q.title} onChange={e => handleStructuralChange(qIndex, 'title', e.target.value)} />
                  <span style={{color: '#ffffff'}}>Max:</span>
                  <input type="number" className="edit-input-small" style={{width: '60px', textAlign: 'center'}} value={q.marks} onChange={e => handleStructuralChange(qIndex, 'marks', parseInt(e.target.value)||0)} />
                  <button className="btn-danger" onClick={() => removeMainQuestion(qIndex)}>Remove Block</button>
                </div>
              ) : (
                <>
                  <h3>Q.{q.id} <span style={{fontSize:'1.1rem', color:'#ffffff', fontWeight:'normal'}}>{q.title}</span></h3>
                  <div style={{fontSize:'1.1rem', fontWeight:'bold', color: '#ffffff'}}>{q.marks} Marks</div>
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
                         <input type="number" className="edit-input-small" style={{width: '60px', textAlign: 'center'}} value={sub.marks} onChange={e => handleSubStructuralChange(qIndex, subIndex, 'marks', parseInt(e.target.value)||0)} />
                        <button className="btn-danger" style={{padding: '4px 8px'}} onClick={() => removeSubQuestion(qIndex, subIndex)}>Remove</button>
                      </div>
                    ) : (
                      <span style={{color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px'}}>
                        [ {sub.marks} Marks | 
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                          CO
                          <select 
                             value={sub.co || "1"} 
                             onChange={e => handleSubStructuralChange(qIndex, subIndex, 'co', e.target.value)}
                             style={{
                               background: 'rgba(255, 255, 255, 0.05)', 
                               border: '1px solid rgba(255,255,255,0.1)', 
                               color: '#ffffff', 
                               borderRadius: '20px', 
                               padding: '2px 8px',
                               outline: 'none',
                               cursor: 'pointer',
                               fontSize: '0.9rem',
                               marginLeft: '4px',
                               textAlign: 'center'
                             }}
                          >
                             {Array.from({ length: course?.lessonPlan?.courseOutcomes?.length || course?.courseOutcomes?.length || 6 }, (_, i) => (
                               <option key={i+1} value={String(i+1)} style={{background: '#1a1a1a', color: '#fff'}}>{i+1}</option>
                             ))}
                          </select>
                        </span>
                        ]
                      </span>
                    )}
                  </div>
                  
                  {!isEditMode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                      <div 
                        className={`bt-pill ${sub.isNumerical ? 'active' : ''}`}
                        onClick={() => toggleNumerical(qIndex, subIndex)}
                      >
                        Numerical Question
                      </div>
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
      )}

      {!isEditMode && (
        <div className="q-card generation-configurator" style={{ marginTop: '30px' }}>
          
          {generationMode === 'ai' && (
          <div style={{display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '25px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '10px'}}>
             <div style={{marginTop: '10px'}}>
               <label style={{display: 'block', color: '#ffffff', fontWeight: 600, marginBottom: '8px'}}>Custom Instructions for Numericals</label>
               <textarea 
                 placeholder={"Option A — \"Make me a numerical on breadth first search\"\nOption B — Paste an actual breadth first search sum: \"Q: adj = [[1,2], [0,2]] find BFS.\""} 
                 className="edit-input-title" 
                 style={{margin: 0, minHeight: '80px', width: '100%', fontSize: '0.9rem', resize: 'vertical', padding: '10px'}} 
                 value={numericalPrompt} 
                 onChange={e => setNumericalPrompt(e.target.value)} 
               />
               <p style={{color: '#ffffff', fontSize: '0.8rem', marginTop: '6px', lineHeight: '1.5'}}>
                 <em>*Works for any subject. Paste a topic for fresh problems, or paste a full example and the AI will rewrite it with different values.</em>
               </p>
             </div>
          </div>
          )}
          
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <div>
              <h3 style={{color: '#ffffff', margin: '0 0 5px 0'}}>Batch Generation</h3>
              <p style={{color: '#ffffff', margin: 0}}>Select how many entirely distinct question papers you need to generate.</p>
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
              style={{ width: '100%', padding: '14px', fontSize: '1rem', background: 'var(--theme-color)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
            >
              I'll fix it
            </button>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
};

export default ExaminationEditor;
