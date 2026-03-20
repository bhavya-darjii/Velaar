import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { generateLessonPlan, generateSpecificField, generateSupplementaryLessonPlan, generateDayWiseEnrichment } from '../services/aiService';
import './LessonPlanPage.css';

const defaultProgramOutcomes = [
  { code: 'PO1', title: 'Engineering Knowledge' },
  { code: 'PO2', title: 'Problem Analysis' },
  { code: 'PO3', title: 'Design/Development of Solutions' },
  { code: 'PO4', title: 'Conduct Investigations of Complex Problems' },
  { code: 'PO5', title: 'Engineering Tool Usage' },
  { code: 'PO6', title: 'The Engineer and The World' },
  { code: 'PO7', title: 'Ethics' },
  { code: 'PO8', title: 'Individual and Collaborative Team Work' },
  { code: 'PO9', title: 'Communication' },
  { code: 'PO10', title: 'Project Management and Finance' },
  { code: 'PO11', title: 'Life-Long Learning' },
];

const getDefaultAssessment = (modules) => (modules || []).map((m, i) => ({
   co: `CO${i+1}`, 
   f1: 'Q&A', 
   f2: 'Assignment-1,2', 
   f3: i >= 3 ? 'Cooperative Learning (Case study)' : '--',
   s1: '--', s2: '--', s3: '--', 
   termTest: i >= 3 ? 'Test-2' : 'Test-1', 
   endSem: 'ESE'
}));

const LessonPlanPage = () => {
  const { course, setCourse } = useOutletContext();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);
  const [lockedCols, setLockedCols] = useState({ teachingPractice: false, formative: false, summative: false });

  const toggleLock = (field) => {
    setLockedCols(prev => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (!course) {
      navigate('/teacher/create-course');
    } else if (course.lessonPlan) {
      const plan = course.lessonPlan;
      if (!plan.assessmentPlanning && course.modules) {
        setLessonPlan({ ...plan, assessmentPlanning: getDefaultAssessment(course.modules) });
      } else {
        setLessonPlan(plan);
      }
    }
  }, [course, navigate]);
  
  if (!course) return null;

  const handleGenerate = async () => {
    setLoading(true);
    const lpData = await generateLessonPlan(course.subjectName, course.modules || []);
    const suppData = await generateSupplementaryLessonPlan(course.subjectName, course.modules || []);
    
    if (lpData && suppData) {
      const defaultPlan = {
        ...lpData,
        unitOutcomes: lpData.unitOutcomes.map(u => ({
          ...u,
          teachingPractice: "Black Board & PPT",
          formative: "Objective Test, Course Exit Survey",
          summative: "Test-1, IA, ESE"
        })),
        programOutcomes: defaultProgramOutcomes,
        courseOutcomes: suppData.courseOutcomes.map((co, idx) => ({ ...co, coNo: `CO.${idx+1}` })),
        assessmentPlanning: getDefaultAssessment(course.modules),
        textBooks: suppData.textBooks,
        referenceBooks: suppData.referenceBooks
      };
      
      try {
        await updateDoc(doc(db, "courses", course.id), { lessonPlan: defaultPlan });
        setCourse({ ...course, lessonPlan: defaultPlan });
        setLessonPlan(defaultPlan);
      } catch(e) { console.error("Save error", e); }
    } else {
      alert("Failed to generate AI Lesson Plan. Please try again.");
    }
    setLoading(false);
  };

  const handleGenerateSupplementary = async () => {
    setLoading(true);
    const suppData = await generateSupplementaryLessonPlan(course.subjectName, course.modules || []);
    if (suppData) {
      const updatedPlan = {
        ...lessonPlan,
        programOutcomes: defaultProgramOutcomes,
        courseOutcomes: suppData.courseOutcomes.map((co, idx) => ({ ...co, coNo: `CO.${idx+1}` })),
        assessmentPlanning: lessonPlan.assessmentPlanning || getDefaultAssessment(course.modules),
        textBooks: suppData.textBooks,
        referenceBooks: suppData.referenceBooks
      };
      try {
        await updateDoc(doc(db, "courses", course.id), { lessonPlan: updatedPlan });
        setCourse({ ...course, lessonPlan: updatedPlan });
        setLessonPlan(updatedPlan);
      } catch(e) { console.error("Save error", e); }
    } else {
      alert("Failed to generate Outcomes & Books.");
    }
    setLoading(false);
  };

  const handleGenerateDayWiseEnrichment = async () => {
    setLoading(true);
    let roadmapLine = [];
    if (course.roadmap) {
       roadmapLine = Array.isArray(course.roadmap) ? course.roadmap : Object.values(course.roadmap)[0] || [];
    }
    const topics = roadmapLine.map(l => l.title);
    
    if (topics.length === 0) {
      alert("No syllabus roadmap found! Please generate the core roadmap in the Course Dashboard first.");
      setLoading(false);
      return;
    }

    const enrichmentData = await generateDayWiseEnrichment(course.subjectName, topics, lessonPlan.textBooks, lessonPlan.referenceBooks);
    if (enrichmentData) {
      const enriched = enrichmentData.map(e => ({ ...e, method: "Black Board & PPT/DI" }));
      
      const defaultActualDates = {};
      (course.divisions && course.divisions.length > 0 ? course.divisions : ["A"]).forEach(div => {
         defaultActualDates[div] = {};
         let divRoadmap = Array.isArray(course.roadmap) ? course.roadmap : (course.roadmap?.[div] || []);
         divRoadmap.forEach((lec, idx) => {
            defaultActualDates[div][idx] = { proposed: lec.date || "", actual: lec.date || "" };
         });
      });

      const updatedPlan = {
        ...lessonPlan,
        dayWiseEnrichment: enriched,
        dayWiseDates: lessonPlan.dayWiseDates || defaultActualDates
      };
      
      try {
        await updateDoc(doc(db, "courses", course.id), { lessonPlan: updatedPlan });
        setCourse({ ...course, lessonPlan: updatedPlan });
        setLessonPlan(updatedPlan);
      } catch(e) { console.error("Save error", e); }
    } else {
      alert("Failed to generate Day-Wise Enrichment.");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "courses", course.id), { lessonPlan });
      setCourse({ ...course, lessonPlan });
    } catch(e) { console.error("Save error", e); }
    setLoading(false);
  };

  const handleOutcomeChange = (index, field, value) => {
    const updated = [...lessonPlan.unitOutcomes];
    if (['teachingPractice', 'formative', 'summative'].includes(field) && lockedCols[field]) {
      updated.forEach(unit => { unit[field] = value; });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLessonPlan({ ...lessonPlan, unitOutcomes: updated });
  };

  const handleDescriptionChange = (e) => {
    setLessonPlan({ ...lessonPlan, courseDescription: e.target.value });
  };

  return (
    <div className="lesson-plan-container fade-in">
      {!lessonPlan ? (
        <div className="empty-state-card">
          {loading ? (
             <div className="loading-spinner">Drafting AI Curriculum... Please wait.</div>
          ) : (
            <>
              <h2>No Lesson Plan Found</h2>
              <p>Map your Course Outcomes and Bloom's Taxonomy entirely with AI based on your modules.</p>
              <button className="generate-btn glass" onClick={handleGenerate}>
                Let's Create a Lesson Plan!
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="lesson-plan-grid glass">
           {loading && <div className="saving-overlay">Processing changes...</div>}
           <div className="lp-header">
             <h2>{course.subjectName} ({new Date().getFullYear()}-{new Date().getFullYear().toString().slice(-2)}) - Faculty – Prof. {course.teacherName || "Teacher"}</h2>
             <h3>Course Outcomes, Mapping of COs with POs, Course Assessment and Lesson Plan</h3>
             <p>
               Semester-<input className="inline-input" placeholder="IV" value={lessonPlan.semester || ""} onChange={(e) => setLessonPlan({...lessonPlan, semester: e.target.value})} />
                DIV - {course.divisions?.length ? course.divisions.join(' & ') : "A"} Course Code:-
               <input className="inline-input" placeholder="AIA&E404" value={lessonPlan.courseCode || ""} onChange={(e) => setLessonPlan({...lessonPlan, courseCode: e.target.value})} />
             </p>
           </div>
           
           {/* 1. COURSE DESCRIPTION */}
           <div className="lp-description">
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
               <strong>Course Description: </strong>
               <button className="icon-btn" title="Regenerate Description" onClick={async () => {
                 setLoading(true);
                 const desc = await generateSpecificField("description", course.subjectName, []);
                 if(desc) setLessonPlan({...lessonPlan, courseDescription: desc});
                 setLoading(false);
               }}>↻ Regenerate</button>
             </div>
             <textarea 
               value={lessonPlan.courseDescription} 
               onChange={handleDescriptionChange}
             />
           </div>

           {/* 2. UNIT WISE OUTCOMES */}
           <div className="lp-table-wrapper" style={{marginBottom: '30px'}}>
             <h4 style={{marginBottom: '10px'}}>Unit wise Outcomes:</h4>
             <table className="lp-table">
               <thead>
                 <tr>
                   <th style={{width: '45px'}}>Unit No</th>
                   <th style={{width: '140px'}}>Unit</th>
                   <th style={{width: '300px'}}>Outcomes</th>
                   <th style={{width: '100px', textAlign: 'center'}}>
                     Teaching Practice
                     <div style={{marginTop: '5px'}}>
                       <button className={`link-btn ${lockedCols.teachingPractice ? 'linked' : ''}`} onClick={() => toggleLock('teachingPractice')} title="Link rows to edit all together">
                         🔗
                       </button>
                     </div>
                   </th>
                   <th colSpan="2" style={{textAlign: 'center'}}>
                     Evaluation Methods
                     <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize:'0.85rem', color: '#cbd5e1'}}>
                       <div style={{flex: 1, paddingRight: '10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center'}}>
                         Formative
                         <div style={{marginTop: '5px'}}>
                           <button className={`link-btn ${lockedCols.formative ? 'linked' : ''}`} onClick={() => toggleLock('formative')} title="Link rows to edit all together">
                             🔗
                           </button>
                         </div>
                       </div>
                       <div style={{flex: 1, paddingLeft: '10px', textAlign: 'center'}}>
                         Summative
                         <div style={{marginTop: '5px'}}>
                           <button className={`link-btn ${lockedCols.summative ? 'linked' : ''}`} onClick={() => toggleLock('summative')} title="Link rows to edit all together">
                             🔗
                           </button>
                         </div>
                       </div>
                     </div>
                   </th>
                   <th style={{width: '90px'}}>BT level</th>
                 </tr>
               </thead>
               <tbody>
                 {lessonPlan.unitOutcomes.map((unit, idx) => {
                   const moduleRef = (course.modules || [])[idx] || {};
                   return (
                     <tr key={idx}>
                       <td style={{textAlign: 'center'}}>{moduleRef.id || unit.unitNo}</td>
                       <td>{moduleRef.name || "Unknown"}</td>
                       <td style={{position: 'relative'}}>
                         <button className="icon-btn sm-regen" title="Regenerate Outcome" onClick={async () => {
                           setLoading(true);
                           const unitData = await generateSpecificField("unit", course.subjectName, [moduleRef]);
                           if(unitData) {
                             const updated = [...lessonPlan.unitOutcomes];
                             updated[idx].outcomes = unitData.outcomes;
                             updated[idx].btLevel = unitData.btLevel;
                             setLessonPlan({...lessonPlan, unitOutcomes: updated});
                           }
                           setLoading(false);
                         }}>↻</button>
                         <textarea value={unit.outcomes} onChange={(e) => handleOutcomeChange(idx, 'outcomes', e.target.value)} />
                       </td>
                       <td>
                         <textarea value={unit.teachingPractice} onChange={(e) => handleOutcomeChange(idx, 'teachingPractice', e.target.value)} />
                       </td>
                       <td>
                         <textarea value={unit.formative} onChange={(e) => handleOutcomeChange(idx, 'formative', e.target.value)} />
                       </td>
                       <td>
                         <textarea value={unit.summative} onChange={(e) => handleOutcomeChange(idx, 'summative', e.target.value)} />
                       </td>
                       <td className="bt-cell">
                         <input type="text" value={unit.btLevel} onChange={(e) => handleOutcomeChange(idx, 'btLevel', e.target.value)} />
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>

           {/* 3. TEACHING METHODOLOGIES */}
           <div className="lp-methodologies" style={{marginBottom: '30px'}}>
              <h4 style={{marginBottom: '10px'}}>Teaching Methodologies:</h4>
              <ul>
                {(Array.isArray(lessonPlan.teachingMethodologies) ? lessonPlan.teachingMethodologies : [
                  "Direct Instruction (PPT/Black board based) DI",
                  "Flipped Classrooms FC",
                  "Cooperative method (please specify technique used)",
                  "Game-based Learning",
                  "Role Play",
                  "Problem based",
                  "Brain storming",
                  "Any Other"
                ]).map((method, idx) => (
                  <li key={idx}>
                    <input 
                      type="text" 
                      className="methodology-input"
                      size={Math.max((method || '').length + 2, 20)}
                      value={method}
                      onChange={(e) => {
                        const updated = [...(Array.isArray(lessonPlan.teachingMethodologies) ? lessonPlan.teachingMethodologies : [
                          "Direct Instruction (PPT/Black board based) DI",
                          "Flipped Classrooms FC",
                          "Cooperative method (please specify technique used)",
                          "Game-based Learning",
                          "Role Play",
                          "Problem based",
                          "Brain storming",
                          "Any Other"
                        ])];
                        updated[idx] = e.target.value;
                        setLessonPlan({...lessonPlan, teachingMethodologies: updated});
                      }}
                    />
                  </li>
                ))}
              </ul>
           </div>

           {/* OUTCOMES FALLBACK INITIALIZER */}
           {(!lessonPlan.programOutcomes || !lessonPlan.courseOutcomes) && (
             <div style={{background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center'}}>
               <p style={{marginBottom: '15px'}}>New Features Available! Initialize your Course/Program Outcomes and AI Book tracking.</p>
               <button className="generate-btn" style={{marginTop: 0, padding: '10px 25px', fontSize: '1rem'}} onClick={handleGenerateSupplementary}>Initialize Remaining Outcomes & Books</button>
             </div>
           )}

           {(lessonPlan.programOutcomes && lessonPlan.courseOutcomes) && (
             <div className="outcomes-section fade-in">
               {/* 4. PROGRAM OUTCOMES */}
               <div className="lp-table-wrapper" style={{marginBottom: '40px'}}>
                 <h4 style={{marginBottom: '10px'}}>Program Outcomes:</h4>
                 <table className="lp-table po-table" style={{width: '100%', maxWidth: '800px', margin: '0 auto'}}>
                   <thead>
                     <tr>
                       <th style={{width: '120px'}}>PO Code</th>
                       <th>PO Title</th>
                     </tr>
                   </thead>
                   <tbody>
                     {lessonPlan.programOutcomes.map((po, idx) => (
                       <tr key={idx}>
                         <td style={{textAlign: 'center', fontWeight: 'bold'}}>{po.code}</td>
                         <td>
                           <input type="text" className="methodology-input" style={{width: '100%'}} value={po.title} 
                             onChange={(e) => {
                               const updated = [...lessonPlan.programOutcomes];
                               updated[idx].title = e.target.value;
                               setLessonPlan({...lessonPlan, programOutcomes: updated});
                             }} 
                           />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* 5. COURSE OUTCOMES */}
               <div className="lp-table-wrapper" style={{marginBottom: '40px'}}>
                 <h4 style={{marginBottom: '10px'}}>Course Outcomes:</h4>
                 <p style={{color: '#cbd5e1', marginBottom: '15px', fontSize: '0.9rem'}}>After taking this Course a student will be able to:</p>
                 <table className="lp-table co-table" style={{width: '100%', maxWidth: '800px', margin: '0 auto'}}>
                   <thead>
                     <tr>
                       <th style={{width: '140px'}}>CO No:</th>
                       <th>Course outcomes</th>
                       <th style={{width: '180px'}}>PO Mapped</th>
                     </tr>
                   </thead>
                   <tbody>
                     {lessonPlan.courseOutcomes.map((co, idx) => (
                       <tr key={idx}>
                         <td style={{textAlign: 'center', fontWeight: 'bold'}}>
                           <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} 
                             value={`CO.${idx+1}`} 
                             readOnly
                           />
                         </td>
                         <td>
                           <textarea className="co-textarea" value={co.description} 
                             onChange={(e) => {
                               const updated = [...lessonPlan.courseOutcomes];
                               updated[idx].description = e.target.value;
                               setLessonPlan({...lessonPlan, courseOutcomes: updated});
                             }} 
                           />
                         </td>
                         <td style={{textAlign: 'center'}}>
                           <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={co.mappedPOs} 
                             onChange={(e) => {
                               const updated = [...lessonPlan.courseOutcomes];
                               updated[idx].mappedPOs = e.target.value;
                               setLessonPlan({...lessonPlan, courseOutcomes: updated});
                             }} 
                           />
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* 6. COURSE ASSESSMENT PLANNING */}
               {lessonPlan.assessmentPlanning && (
                 <div className="lp-table-wrapper" style={{marginBottom: '40px'}}>
                   <h4 style={{marginBottom: '10px'}}>Course Assessment Planning (tick applicable method: -)</h4>
                   <div style={{overflowX: 'auto', width: '100%'}}>
                     <table className="lp-table cap-table" style={{textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '1000px'}}>
                       <thead>
                         <tr>
                           <th rowSpan="4" style={{width: '90px', verticalAlign: 'middle'}}>Course outcomes</th>
                           <th colSpan="8">Assessment Method</th>
                         </tr>
                         <tr>
                           <th colSpan="3">Formative</th>
                           <th colSpan="5">Summative</th>
                         </tr>
                         <tr>
                           <th rowSpan="2" style={{width: '90px'}}></th>
                           <th rowSpan="2" style={{width: '140px'}}></th>
                           <th rowSpan="2" style={{width: '180px'}}></th>
                           <th colSpan="3">Continuous assessment of 10 marks</th>
                           <th rowSpan="2" style={{width: '100px'}}>Term Tests</th>
                           <th rowSpan="2" style={{width: '110px'}}>End semester exam</th>
                         </tr>
                         <tr>
                           <th style={{width: '40px'}}>-</th>
                           <th style={{width: '40px'}}>-</th>
                           <th style={{width: '40px'}}>-</th>
                         </tr>
                       </thead>
                       <tbody>
                         {lessonPlan.assessmentPlanning.map((row, idx) => (
                           <tr key={idx}>
                             <td style={{fontWeight: 'bold'}}>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.co} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].co = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.f1} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].f1 = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.f2} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].f2 = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.f3} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].f3 = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.s1} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].s1 = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.s2} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].s2 = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.s3} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].s3 = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.termTest} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].termTest = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                             <td>
                               <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={row.endSem} onChange={(e) => {
                                  const updated = [...lessonPlan.assessmentPlanning];
                                  updated[idx].endSem = e.target.value;
                                  setLessonPlan({...lessonPlan, assessmentPlanning: updated});
                               }} />
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
             </div>
           )}

           {/* 7. TEXT & REFERENCE BOOKS */}
           {(lessonPlan.textBooks && lessonPlan.referenceBooks) && (
             <div className="books-section fade-in" style={{marginBottom: '40px'}}>
               <div className="lp-methodologies" style={{marginBottom: '20px'}}>
                 <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                   <h4 style={{margin: '0'}}>Text Books:</h4>
                   <button className="icon-btn" title="Regenerate Text Books" onClick={async () => {
                     setLoading(true);
                     const tb = await generateSpecificField("textBooks", course.subjectName, []);
                     if(tb) setLessonPlan({...lessonPlan, textBooks: tb});
                     setLoading(false);
                   }}>↻</button>
                 </div>
                 <ul>
                    {lessonPlan.textBooks.map((book, idx) => (
                      <li key={idx}>
                        <input type="text" className="methodology-input" size={Math.max((book || '').length + 2, 20)} value={book}
                          onChange={(e) => {
                            const updated = [...lessonPlan.textBooks];
                            updated[idx] = e.target.value;
                            setLessonPlan({...lessonPlan, textBooks: updated});
                          }}
                        />
                      </li>
                    ))}
                 </ul>
               </div>
               
               <div className="lp-methodologies">
                 <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                   <h4 style={{margin: '0'}}>Reference Books:</h4>
                   <button className="icon-btn" title="Regenerate Reference Books" onClick={async () => {
                     setLoading(true);
                     const rb = await generateSpecificField("referenceBooks", course.subjectName, []);
                     if(rb) setLessonPlan({...lessonPlan, referenceBooks: rb});
                     setLoading(false);
                   }}>↻</button>
                 </div>
                 <ul>
                    {lessonPlan.referenceBooks.map((book, idx) => (
                      <li key={idx}>
                        <input type="text" className="methodology-input" size={Math.max((book || '').length + 2, 20)} value={book}
                          onChange={(e) => {
                            const updated = [...lessonPlan.referenceBooks];
                            updated[idx] = e.target.value;
                            setLessonPlan({...lessonPlan, referenceBooks: updated});
                          }}
                        />
                      </li>
                    ))}
                 </ul>
               </div>
             </div>
           )}

           {/* 8. DAY WISE PLANNING SECTION */}
           {(!lessonPlan.dayWiseEnrichment && lessonPlan.programOutcomes) && (
             <div style={{background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center'}}>
               <p style={{marginBottom: '15px'}}>Day-Wise Lecture Plan Mapping is available!</p>
               <button className="generate-btn" style={{marginTop: 0, padding: '10px 25px', fontSize: '1rem'}} onClick={handleGenerateDayWiseEnrichment}>
                 Generate Division Day-Wise Plans
               </button>
             </div>
           )}

           {lessonPlan.dayWiseEnrichment && (
             <div className="day-wise-section fade-in" style={{marginBottom: '40px'}}>
               {(course.divisions && course.divisions.length > 0 ? course.divisions : ["A"]).map(div => {
                 let rawRoadmap = Array.isArray(course.roadmap) ? course.roadmap : (course.roadmap?.[div] || []);
                 
                 const processedRoadmap = rawRoadmap.map((lec, idx) => {
                    const modIdentifier = lec.moduleName || String(lec.module) || `Mod-${Math.floor(idx/6)}`;
                    return { ...lec, modIdentifier };
                 });
                 
                 return (
                   <div className="lp-table-wrapper" key={div} style={{marginBottom: '40px'}}>
                     <h4 style={{marginBottom: '10px'}}>Day Wise Plan (Div-{div})</h4>
                     <div style={{overflowX: 'auto', width: '100%'}}>
                       <table className="lp-table cap-table" style={{width: '100%', minWidth: '900px', textAlign: 'center', margin: '0 auto'}}>
                         <thead>
                           <tr>
                             <th style={{width: '50px'}}>Sr.No</th>
                             <th style={{width: '250px'}}>Topic</th>
                             <th style={{width: '70px'}}>Lecture No</th>
                             <th style={{width: '100px'}}>Books referred</th>
                             <th style={{width: '130px'}}>Proposed Date</th>
                             <th style={{width: '130px'}}>Actual Date</th>
                             <th style={{width: '140px'}}>Teaching method</th>
                             <th style={{width: '100px'}}>BT</th>
                           </tr>
                         </thead>
                         <tbody>
                           {processedRoadmap.map((lecture, idx) => {
                             const enrichment = lessonPlan.dayWiseEnrichment[idx] || { books: "-", bt: "-", method: "Black Board & PPT/DI" };
                             const mapDates = lessonPlan.dayWiseDates?.[div]?.[idx] || { proposed: lecture.date, actual: lecture.date };
                             
                             const localLecNo = processedRoadmap.slice(0, idx + 1).filter(l => l.modIdentifier === lecture.modIdentifier).length;
                             const firstModuleIdx = processedRoadmap.findIndex(l => l.modIdentifier === lecture.modIdentifier);
                             const moduleBT = lessonPlan.dayWiseEnrichment[firstModuleIdx]?.bt || enrichment.bt || "-";

                             return (
                               <tr key={idx}>
                                 <td style={{fontWeight: 'bold'}}>{idx + 1}</td>
                                 <td style={{textAlign: 'left', fontSize: '0.9rem'}}>{lecture.title}</td>
                                 <td style={{fontWeight: 'bold'}}>{localLecNo}</td>
                                 <td>
                                   <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={enrichment.books} 
                                     onChange={(e) => {
                                        const updated = [...lessonPlan.dayWiseEnrichment];
                                        updated[idx].books = e.target.value;
                                        setLessonPlan({...lessonPlan, dayWiseEnrichment: updated});
                                     }} 
                                   />
                                 </td>
                                 <td>
                                   <input type="date" className="methodology-input" style={{textAlign: 'center', width: '100%', fontSize: '0.85rem', padding: '5px 2px'}} 
                                     value={(mapDates.proposed || "").split('T')[0]} 
                                     onChange={(e) => {
                                        const updatedDates = JSON.parse(JSON.stringify(lessonPlan.dayWiseDates));
                                        if(!updatedDates[div]) updatedDates[div] = {};
                                        if(!updatedDates[div][idx]) updatedDates[div][idx] = {proposed:"", actual:""};
                                        updatedDates[div][idx].proposed = e.target.value;
                                        setLessonPlan({...lessonPlan, dayWiseDates: updatedDates});
                                     }} 
                                   />
                                 </td>
                                 <td>
                                   <input type="date" className="methodology-input" style={{textAlign: 'center', width: '100%', fontSize: '0.85rem', padding: '5px 2px'}} 
                                     value={(mapDates.actual || "").split('T')[0]} 
                                     onChange={(e) => {
                                        const updatedDates = JSON.parse(JSON.stringify(lessonPlan.dayWiseDates));
                                        if(!updatedDates[div]) updatedDates[div] = {};
                                        if(!updatedDates[div][idx]) updatedDates[div][idx] = {proposed:"", actual:""};
                                        updatedDates[div][idx].actual = e.target.value;
                                        setLessonPlan({...lessonPlan, dayWiseDates: updatedDates});
                                     }} 
                                   />
                                 </td>
                                 <td>
                                   <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={enrichment.method} 
                                     onChange={(e) => {
                                        const updated = [...lessonPlan.dayWiseEnrichment];
                                        updated[idx].method = e.target.value;
                                        setLessonPlan({...lessonPlan, dayWiseEnrichment: updated});
                                     }} 
                                   />
                                 </td>
                                 <td>
                                   <input type="text" className="methodology-input" style={{textAlign: 'center', width: '100%'}} value={moduleBT} 
                                     onChange={(e) => {
                                        // Update the BT for the first index of this module to propagate to all
                                        const updated = [...lessonPlan.dayWiseEnrichment];
                                        if(!updated[firstModuleIdx]) updated[firstModuleIdx] = { bt: e.target.value };
                                        else updated[firstModuleIdx].bt = e.target.value;
                                        setLessonPlan({...lessonPlan, dayWiseEnrichment: updated});
                                     }} 
                                   />
                                 </td>
                               </tr>
                             )
                           })}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )
               })}
             </div>
           )}

           <div className="lp-actions">
             <button className="save-btn" onClick={handleSave}>Save Changes</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanPage;
