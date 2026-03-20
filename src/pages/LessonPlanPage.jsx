import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { generateLessonPlan, generateSpecificField } from '../services/aiService';
import './LessonPlanPage.css';

const LessonPlanPage = () => {
  const { course, setCourse } = useOutletContext();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);

  useEffect(() => {
    if (!course) {
      navigate('/teacher/create-course');
    } else if (course.lessonPlan) {
      setLessonPlan(course.lessonPlan);
    }
  }, [course, navigate]);
  
  if (!course) return null;

  const handleGenerate = async () => {
    setLoading(true);
    const data = await generateLessonPlan(course.subjectName, course.modules || []);
    if (data) {
      const defaultPlan = {
        ...data,
        unitOutcomes: data.unitOutcomes.map(u => ({
          ...u,
          teachingPractice: "Black Board & PPT",
          formative: "Objective Test, Course Exit Survey",
          summative: "Test-1, IA, ESE"
        }))
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
    updated[index] = { ...updated[index], [field]: value };
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
               -DIV-{course.divisions?.length ? course.divisions.join('&') : "A"} course code:-
               <input className="inline-input" placeholder="AIA&E404" value={lessonPlan.courseCode || ""} onChange={(e) => setLessonPlan({...lessonPlan, courseCode: e.target.value})} />
             </p>
           </div>
           
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

           <div className="lp-table-wrapper">
             <h4>Unit wise Outcomes:</h4>
             <table className="lp-table">
               <thead>
                 <tr>
                   <th style={{width: '45px'}}>Unit No</th>
                   <th style={{width: '140px'}}>Unit</th>
                   <th style={{width: '300px'}}>Outcomes</th>
                   <th style={{width: '100px'}}>Teaching Practice</th>
                   <th colSpan="2">
                     Evaluation Methods
                     <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize:'0.85rem', color: '#cbd5e1'}}>
                       <span style={{flex: 1, paddingRight: '10px', borderRight: '1px solid rgba(255,255,255,0.1)'}}>Formative</span>
                       <span style={{flex: 1, paddingLeft: '10px'}}>Summative</span>
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
                       <td>
                         <input type="text" value={unit.btLevel} onChange={(e) => handleOutcomeChange(idx, 'btLevel', e.target.value)} />
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           </div>

           <div className="lp-methodologies">
              <strong>Teaching Methodologies:</strong>
              <ul>
                <li>Direct Instruction (PPT/Black board based) DI</li>
                <li>Flipped Classrooms FC</li>
                <li>Cooperative method (please specify technique used)</li>
                <li>Game-based Learning</li>
                <li>Role Play</li>
                <li>Problem based</li>
                <li>Brain storming</li>
                <li>any other</li>
              </ul>
           </div>

           <div className="lp-actions">
             <button className="save-btn" onClick={handleSave}>Save Changes</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanPage;
