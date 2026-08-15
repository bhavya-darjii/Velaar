/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { generateLessonPlan, generateSpecificField, generateSupplementaryLessonPlan, generateDayWiseEnrichment, generateCoPoMapping, setAiContextCourse } from '../../services/aiService';
import { exportLessonPlanToWord } from '../../utils/wordExport';
import LessonPlanSkeleton from '../../components/skeletons/LessonPlanSkeleton';
import './LessonPlanPage.css';

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const toRoman = (str) => {
  const romanMap = [
    [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
    [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
    [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']
  ];
  const num = parseInt(str, 10);
  if (isNaN(num) || num < 1 || num > 3999) return str;
  let result = '';
  let n = num;
  for (const [val, sym] of romanMap) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
};

// Recursively remove undefined values so Firestore never rejects the payload
const sanitizeForFirestore = (obj) => {
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    );
  }
  return obj;
};

const defaultProgramOutcomes = [
  { code: "PO1", title: "Engineering Knowledge" },
  { code: "PO2", title: "Problem Analysis" },
  { code: "PO3", title: "Design/Development of Solutions" },
  { code: "PO4", title: "Conduct Investigations of Complex Problems" },
  { code: "PO5", title: "Engineering Tool Usage" },
  { code: "PO6", title: "The Engineer and The World" },
  { code: "PO7", title: "Ethics" },
  { code: "PO8", title: "Individual and Collaborative Team Work" },
  { code: "PO9", title: "Communication" },
  { code: "PO10", title: "Project Management and Finance" },
  { code: "PO11", title: "Life-Long Learning" }
];

const formatToDDMMYYYY = (dateString, fallbackYear = new Date().getFullYear()) => {
  if (!dateString) return "";
  if (dateString.includes('/')) return dateString;

  if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [y, m, d] = dateString.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }

  let d = new Date(`${dateString}, ${fallbackYear}`);
  if (isNaN(d.getTime())) d = new Date(dateString);

  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }
  return dateString;
};

const defaultActivities = [
  { sr: "1.", name: "Expert Talk on subject", date: "March 2026", venue: "Class room", co: "1 to 6" }
];

const defaultTermTests = [
  { q: "1 a", bt1: "Understanding/Applying", co1: "CO1", bt2: "Understanding/Applying", co2: "CO4" },
  { q: "1 b", bt1: "Understanding/Applying", co1: "CO1", bt2: "Understanding/Applying", co2: "CO4" },
  { q: "1 c", bt1: "Understanding/Applying", co1: "CO1", bt2: "Understanding/Applying", co2: "CO4" },
  { q: "2 a", bt1: "Understanding/Applying", co1: "CO2", bt2: "Understanding/Applying", co2: "CO5" },
  { q: "2 b", bt1: "Understanding/Applying", co1: "CO2", bt2: "Understanding/Applying", co2: "CO5" },
  { q: "3 a", bt1: "Understanding/Applying", co1: "CO3", bt2: "Understanding/Applying", co2: "CO6" },
  { q: "3 b", bt1: "Understanding/Applying", co1: "CO3", bt2: "Understanding/Applying", co2: "CO6" }
];

const defaultEndSem = [
  {
    c1: { q: "1A", bt: "Understanding/Applying", co: "CO1" },
    c2: { q: "2B", bt: "Understanding/Applying", co: "CO5" },
    c3: { q: "3C", bt: "Understanding/Applying", co: "CO3" }
  },
  {
    c1: { q: "1B", bt: "Understanding/Applying", co: "CO2" },
    c2: { q: "2C", bt: "Understanding/Applying", co: "CO6" },
    c3: { q: "4A", bt: "Understanding/Applying", co: "CO4" }
  },
  {
    c1: { q: "1C", bt: "Understanding/Applying", co: "CO3" },
    c2: { q: "3A", bt: "Understanding/Applying", co: "CO1" },
    c3: { q: "4B", bt: "Understanding/Applying", co: "CO5" }
  },
  {
    c1: { q: "2A", bt: "Understanding/Applying", co: "CO4" },
    c2: { q: "3B", bt: "Understanding/Applying", co: "CO2" },
    c3: { q: "4C", bt: "Understanding/Applying", co: "CO3" }
  }
];

const getDefaultAssessment = (modules) => (modules || []).map((m, i) => ({
  co: `CO${i + 1}`,
  f1: 'Q&A',
  f2: 'Assignment-1,2',
  f3: i >= 3 ? 'Cooperative Learning (Case study)' : '--',
  s1: '--', s2: '--', s3: '--',
  termTest: i >= 3 ? 'Test-2' : 'Test-1',
  endSem: 'ESE'
}));

const LessonPlanPage = () => {
  const { course, setCourse, loading: layoutLoading } = useOutletContext();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);
  const [lockedCols, setLockedCols] = useState({ teachingPractice: false, formative: false, summative: false });

  const toggleLock = (field) => {
    setLockedCols(prev => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (layoutLoading) return;
    if (!course) {
      navigate('/teacher/create-course');
    } else if (course.lessonPlan) {
      const plan = course.lessonPlan;
      if (!plan.assessmentPlanning && course.modules) {
        setLessonPlan({ ...plan, assessmentPlanning: getDefaultAssessment(course.modules), programOutcomes: defaultProgramOutcomes });
      } else {
        setLessonPlan({ ...plan, programOutcomes: defaultProgramOutcomes });
      }
    }
  }, [course?.id, navigate, layoutLoading]); // Re-run if course ID or loading state changes

  // DEBOUNCED AUTO-SAVE LOGIC
  useEffect(() => {
    if (!lessonPlan || !course?.id) return;

    // Check if lessonPlan is actually different from context to avoid loops
    if (JSON.stringify(lessonPlan) === JSON.stringify(course.lessonPlan)) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const clean = sanitizeForFirestore(lessonPlan);
        await supabase.from("courses").update({ lesson_plan: clean }).eq("id", course.id);
        setCourse(prev => ({ ...prev, lessonPlan: clean }));
      } catch (error) {
        console.error("Auto-save failed:", error);
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [lessonPlan, course?.id, setCourse]);


  if (layoutLoading) return <LessonPlanSkeleton />;
  if (!course) return null;

  const handleGenerate = async () => {
    setLoading(true);
    let roadmapLine = [];
    if (course.roadmap) {
      roadmapLine = Array.isArray(course.roadmap) ? course.roadmap : Object.values(course.roadmap)[0] || [];
    }
    const topics = roadmapLine.map(l => l.title);

    try {
      setAiContextCourse(course.id, course.subjectName);
      const [lpData, suppData] = await Promise.all([
        generateLessonPlan(course.subjectName, course.modules || []),
        generateSupplementaryLessonPlan(course.subjectName, course.modules || [])
      ]);

      if (!lpData || !suppData) {
        alert("Failed to generate AI Lesson Plan components. Please try again.");
        setLoading(false);
        return;
      }

      let enriched = [];
      if (topics.length > 0) {
        const enrichmentData = await generateDayWiseEnrichment(
          course.subjectName,
          topics,
          suppData.textBooks,
          suppData.referenceBooks
        );
        if (enrichmentData) {
          enriched = enrichmentData.map(e => ({ ...e, method: "Black Board & PPT/DI" }));
        }
      }

      const defaultActualDates = {};
      (course.divisions && course.divisions.length > 0 ? course.divisions : ["A"]).forEach(div => {
        defaultActualDates[div] = {};
        let divRoadmap = Array.isArray(course.roadmap) ? course.roadmap : (course.roadmap?.[div] || []);
        divRoadmap.forEach((lec, idx) => {
          defaultActualDates[div][idx] = { proposed: lec.date || "", actual: lec.date || "" };
        });
      });

      const defaultPlan = {
        ...lpData,
        unitOutcomes: lpData.unitOutcomes.map(u => ({
          ...u,
          teachingPractice: "Black Board & PPT",
          formative: "Objective Test, Course Exit Survey",
          summative: "Test-1, IA, ESE"
        })),
        programOutcomes: defaultProgramOutcomes,
        courseOutcomes: suppData.courseOutcomes.map((co, idx) => ({ ...co, coNo: `CO.${idx + 1}` })),
        assessmentPlanning: getDefaultAssessment(course.modules),
        textBooks: suppData.textBooks,
        referenceBooks: suppData.referenceBooks,
        dayWiseEnrichment: enriched,
        dayWiseDates: defaultActualDates
      };

      await supabase.from("courses").update({ lesson_plan: defaultPlan }).eq("id", course.id);
      setCourse({ ...course, lessonPlan: defaultPlan });
      setLessonPlan(defaultPlan);

    } catch (e) {
      console.error("Save error", e);
      alert("Error generating full lesson plan.");
    }
    setLoading(false);
  };

  const handleExportWord = async () => {
    setLoading(true);
    try {
      const clean = sanitizeForFirestore(lessonPlan);
      await supabase.from("courses").update({ lesson_plan: clean }).eq("id", course.id);
      setCourse({ ...course, lessonPlan: clean });

      // Inherently synthesize docx binary buffer directly
      await exportLessonPlanToWord(course, clean);
    } catch (e) {
      console.error(e);
      alert("Error generating Document. Ensure layout is completed.");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const clean = sanitizeForFirestore(lessonPlan);
      await supabase.from("courses").update({ lesson_plan: clean }).eq("id", course.id);
      setCourse({ ...course, lessonPlan: clean });
    } catch (e) { console.error("Save error", e); }
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
    <div className="lesson-plan-container">
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
          {isSaving && (
            <div className="saving-status-pill fade-in" style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
              <span className="dot"></span> Syncing to Cloud...
            </div>
          )}
          <div className="lp-header">
            <div className="lp-title-row">
              <span>{course.subjectName}&nbsp;(</span>
              <input
                className="inline-input year-input"
                value={lessonPlan.academicYear || `${new Date().getFullYear()}-${String(new Date().getFullYear()+1).slice(-2)}`}
                onChange={(e) => setLessonPlan({ ...lessonPlan, academicYear: e.target.value })}
              />
              <span>)&nbsp;- Faculty – Prof. {course.teacherName || "Teacher"}</span>
            </div>
            <h3>Course Outcomes, Mapping of COs with POs, Course Assessment and Lesson Plan</h3>
            <div className="lp-header-meta">
              <span>Semester-</span>
              <input
                className="inline-input semester-input"
                placeholder="IV"
                value={lessonPlan.semester || ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  // If purely numeric input, convert to Roman numeral
                  const converted = /^\d+$/.test(raw.trim()) ? toRoman(raw.trim()) : raw;
                  setLessonPlan({ ...lessonPlan, semester: converted });
                }}
              />
              <span style={{margin: '0 12px'}}>DIV -</span>
              <input className="inline-input divisions-input" placeholder="A &amp; B" value={lessonPlan.divisions || (course.divisions?.length ? course.divisions.join(' & ') : "A")} onChange={(e) => setLessonPlan({ ...lessonPlan, divisions: e.target.value })} />
              <span style={{margin: '0 12px'}}>Course Code:-</span>
              <input className="inline-input coursecode-input" placeholder="AIA404" value={lessonPlan.courseCode || ""} onChange={(e) => setLessonPlan({ ...lessonPlan, courseCode: e.target.value })} />
            </div>
          </div>

          {/* 1. COURSE DESCRIPTION */}
          <div className="lp-description">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong>Course Description: </strong>
              <button className="icon-btn flex-center" title="Regenerate Description" onClick={async () => {
                setLoading(true);
                const desc = await generateSpecificField("description", course.subjectName, []);
                if (desc) setLessonPlan({ ...lessonPlan, courseDescription: desc });
                setLoading(false);
              }}><RefreshIcon /></button>
            </div>
            <textarea
              value={lessonPlan.courseDescription}
              onChange={handleDescriptionChange}
            />
          </div>

          {/* 2. UNIT WISE OUTCOMES */}
          <div className="lp-table-wrapper" style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '10px' }}>Unit wise Outcomes:</h4>
            <table className="lp-table">
              <thead>
                <tr>
                  <th style={{ width: '45px' }}>Unit No</th>
                  <th style={{ width: '140px' }}>Unit</th>
                  <th style={{ width: '300px' }}>Outcomes</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>
                    Teaching Practice
                    <div style={{ marginTop: '5px' }}>
                      <button className={`link-btn ${lockedCols.teachingPractice ? 'linked' : ''}`} onClick={() => toggleLock('teachingPractice')} title="Link rows to edit all together">
                        ðŸ”—
                      </button>
                    </div>
                  </th>
                  <th colSpan="2" style={{ textAlign: 'center' }}>
                    Evaluation Methods
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.85rem', color: '#ffffff', fontWeight: 'bold' }}>
                      <div style={{ flex: 1, paddingRight: '10px', borderRight: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                        Formative
                        <div style={{ marginTop: '5px' }}>
                          <button className={`link-btn ${lockedCols.formative ? 'linked' : ''}`} onClick={() => toggleLock('formative')} title="Link rows to edit all together">
                            ðŸ”—
                          </button>
                        </div>
                      </div>
                      <div style={{ flex: 1, paddingLeft: '10px', textAlign: 'center' }}>
                        Summative
                        <div style={{ marginTop: '5px' }}>
                          <button className={`link-btn ${lockedCols.summative ? 'linked' : ''}`} onClick={() => toggleLock('summative')} title="Link rows to edit all together">
                            ðŸ”—
                          </button>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th style={{ width: '90px' }}>BT level</th>
                </tr>
              </thead>
              <tbody>
                {lessonPlan.unitOutcomes.map((unit, idx) => {
                  const moduleRef = (course.modules || [])[idx] || {};
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>{moduleRef.id || unit.unitNo}</td>
                      <td>{moduleRef.name || "Unknown"}</td>
                      <td style={{ position: 'relative', padding: 0 }}>
                        <div className="td-clip">
                          <button className="icon-btn sm-regen flex-center" title="Regenerate Outcome" onClick={async () => {
                            setLoading(true);
                            const unitData = await generateSpecificField("unit", course.subjectName, [moduleRef]);
                            if (unitData) {
                              const updated = [...lessonPlan.unitOutcomes];
                              updated[idx].outcomes = unitData.outcomes;
                              updated[idx].btLevel = unitData.btLevel;
                              setLessonPlan({ ...lessonPlan, unitOutcomes: updated });
                            }
                            setLoading(false);
                          }}><RefreshIcon /></button>
                          <textarea value={unit.outcomes} onChange={(e) => handleOutcomeChange(idx, 'outcomes', e.target.value)} />
                        </div>
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
          <div className="lp-methodologies" style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '10px' }}>Teaching Methodologies:</h4>
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
                  <textarea
                    className="methodology-input"
                    style={{ width: '100%', resize: 'vertical', minHeight: '40px' }}
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
                      setLessonPlan({ ...lessonPlan, teachingMethodologies: updated });
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>

          {(lessonPlan.programOutcomes && lessonPlan.courseOutcomes) && (
            <div className="outcomes-section fade-in">
              {/* 4. PROGRAM OUTCOMES */}
              <div className="lp-table-wrapper" style={{ marginBottom: '40px' }}>
                <h4 style={{ marginBottom: '10px' }}>Program Outcomes:</h4>
                <table className="lp-table po-table" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>PO Code</th>
                      <th>PO Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonPlan.programOutcomes.map((po, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{po.code}</td>
                        <td>
                          <input type="text" className="methodology-input" style={{ width: '100%' }} value={po.title}
                            onChange={(e) => {
                              const updated = [...lessonPlan.programOutcomes];
                              updated[idx].title = e.target.value;
                              setLessonPlan({ ...lessonPlan, programOutcomes: updated });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 5. COURSE OUTCOMES */}
              <div className="lp-table-wrapper" style={{ marginBottom: '40px' }}>
                <h4 style={{ marginBottom: '10px' }}>Course Outcomes:</h4>
                <p style={{ color: '#ffffff', marginBottom: '15px', fontSize: '0.9rem', fontWeight: 'bold' }}>After taking this Course a student will be able to:</p>
                <table className="lp-table co-table" style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '140px' }}>CO No:</th>
                      <th>Course outcomes</th>
                      <th style={{ width: '180px' }}>PO Mapped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonPlan.courseOutcomes.map((co, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }}
                            value={`CO.${idx + 1}`}
                            readOnly
                          />
                        </td>
                        <td>
                          <textarea className="co-textarea" value={co.description}
                            onChange={(e) => {
                              const updated = [...lessonPlan.courseOutcomes];
                              updated[idx].description = e.target.value;
                              setLessonPlan({ ...lessonPlan, courseOutcomes: updated });
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={co.mappedPOs}
                            onChange={(e) => {
                              const updated = [...lessonPlan.courseOutcomes];
                              updated[idx].mappedPOs = e.target.value;
                              setLessonPlan({ ...lessonPlan, courseOutcomes: updated });
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
                <div className="lp-table-wrapper" style={{ marginBottom: '40px' }}>
                  <h4 style={{ marginBottom: '10px' }}>Course Assessment Planning</h4>
                  <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="lp-table cap-table" style={{ textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '1000px' }}>
                      <thead>
                        <tr>
                          <th rowSpan="4" style={{ width: '90px', verticalAlign: 'middle' }}>Course outcomes</th>
                          <th colSpan="8">Assessment Method</th>
                        </tr>
                        <tr>
                          <th colSpan="3">Formative</th>
                          <th colSpan="5">Summative</th>
                        </tr>
                        <tr>
                          <th rowSpan="2" style={{ width: '90px' }}></th>
                          <th rowSpan="2" style={{ width: '140px' }}></th>
                          <th rowSpan="2" style={{ width: '180px' }}></th>
                          <th colSpan="3">Continuous assessment of 10 marks</th>
                          <th rowSpan="2" style={{ width: '100px' }}>Term Tests</th>
                          <th rowSpan="2" style={{ width: '110px' }}>End semester exam</th>
                        </tr>
                        <tr>
                          <th style={{ width: '40px' }}>-</th>
                          <th style={{ width: '40px' }}>-</th>
                          <th style={{ width: '40px' }}>-</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lessonPlan.assessmentPlanning.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 'bold' }}>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.co} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].co = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.f1} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].f1 = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.f2} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].f2 = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.f3} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].f3 = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.s1} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].s1 = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.s2} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].s2 = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.s3} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].s3 = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.termTest} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].termTest = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
                              }} />
                            </td>
                            <td>
                              <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.endSem} onChange={(e) => {
                                const updated = [...lessonPlan.assessmentPlanning];
                                updated[idx].endSem = e.target.value;
                                setLessonPlan({ ...lessonPlan, assessmentPlanning: updated });
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
            <div className="books-section fade-in" style={{ marginBottom: '40px' }}>
              <div className="lp-methodologies" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <h4 style={{ margin: '0' }}>Text Books:</h4>
                  <button className="icon-btn flex-center" title="Regenerate Text Books" onClick={async () => {
                    setLoading(true);
                    const tb = await generateSpecificField("textBooks", course.subjectName, []);
                    if (tb) setLessonPlan({ ...lessonPlan, textBooks: tb });
                    setLoading(false);
                  }}><RefreshIcon /></button>
                </div>
                <ul>
                  {lessonPlan.textBooks.map((book, idx) => (
                    <li key={idx}>
                      <textarea className="methodology-input" style={{ width: '100%', resize: 'vertical', minHeight: '40px' }} value={book}
                        onChange={(e) => {
                          const updated = [...lessonPlan.textBooks];
                          updated[idx] = e.target.value;
                          setLessonPlan({ ...lessonPlan, textBooks: updated });
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lp-methodologies">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <h4 style={{ margin: '0' }}>Reference Books:</h4>
                  <button className="icon-btn flex-center" title="Regenerate Reference Books" onClick={async () => {
                    setLoading(true);
                    const rb = await generateSpecificField("referenceBooks", course.subjectName, []);
                    if (rb) setLessonPlan({ ...lessonPlan, referenceBooks: rb });
                    setLoading(false);
                  }}><RefreshIcon /></button>
                </div>
                <ul>
                  {lessonPlan.referenceBooks.map((book, idx) => (
                    <li key={idx}>
                      <textarea className="methodology-input" style={{ width: '100%', resize: 'vertical', minHeight: '40px' }} value={book}
                        onChange={(e) => {
                          const updated = [...lessonPlan.referenceBooks];
                          updated[idx] = e.target.value;
                          setLessonPlan({ ...lessonPlan, referenceBooks: updated });
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
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
              <p style={{ marginBottom: '15px' }}>Day-Wise Lecture Plan Mapping is available!</p>
              <button className="generate-btn" style={{ marginTop: 0, padding: '10px 25px', fontSize: '1rem' }} onClick={handleGenerateDayWiseEnrichment}>
                Generate Division Day-Wise Plans
              </button>
            </div>
          )}

          {lessonPlan.dayWiseEnrichment && (
            <div className="day-wise-section fade-in" style={{ marginBottom: '40px' }}>
              {(course.divisions && course.divisions.length > 0 ? course.divisions : ["A"]).map(div => {
                let rawRoadmap = Array.isArray(course.roadmap) ? course.roadmap : (course.roadmap?.[div] || []);

                const processedRoadmap = rawRoadmap.map((lec, idx) => {
                  const modIdentifier = lec.moduleName || String(lec.module) || `Mod-${Math.floor(idx / 6)}`;
                  return { ...lec, modIdentifier };
                });

                return (
                  <div className="lp-table-wrapper" key={div} style={{ marginBottom: '40px' }}>
                    <h4 style={{ marginBottom: '10px' }}>Day Wise Plan (Div-{div})</h4>
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <table className="lp-table cap-table" style={{ width: '100%', minWidth: '900px', textAlign: 'center', margin: '0 auto' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '50px' }}>Sr.No</th>
                            <th style={{ width: '250px' }}>Topic</th>
                            <th style={{ width: '70px' }}>Lecture No</th>
                            <th style={{ width: '100px' }}>Books referred</th>
                            <th style={{ width: '130px' }}>Proposed Date</th>
                            <th style={{ width: '130px' }}>Actual Date</th>
                            <th style={{ width: '140px' }}>Teaching method</th>
                            <th style={{ width: '100px' }}>BT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedRoadmap.map((lecture, idx) => {
                            const enrichment = lessonPlan.dayWiseEnrichment[idx] || { books: "-", bt: "-", method: "Black Board & PPT/DI" };
                            const mapDates = lessonPlan.dayWiseDates?.[div]?.[idx] || { proposed: lecture.date, actual: lecture.date };

                            const formattedProposed = formatToDDMMYYYY(mapDates.proposed || lecture.date);
                            const formattedActual = formatToDDMMYYYY(mapDates.actual || lecture.date);

                            const localLecNo = processedRoadmap.slice(0, idx + 1).filter(l => l.modIdentifier === lecture.modIdentifier).length;
                            const firstModuleIdx = processedRoadmap.findIndex(l => l.modIdentifier === lecture.modIdentifier);
                            const moduleBT = lessonPlan.dayWiseEnrichment[firstModuleIdx]?.bt || enrichment.bt || "-";

                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: 'bold' }}>{idx + 1}</td>
                                <td style={{ textAlign: 'left', fontSize: '0.9rem' }}>{lecture.title}</td>
                                <td style={{ fontWeight: 'bold' }}>{localLecNo}</td>
                                <td>
                                  <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={enrichment.books}
                                    onChange={(e) => {
                                      const updated = [...lessonPlan.dayWiseEnrichment];
                                      updated[idx].books = e.target.value;
                                      setLessonPlan({ ...lessonPlan, dayWiseEnrichment: updated });
                                    }}
                                  />
                                </td>
                                <td>
                                  <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%', fontSize: '0.85rem', padding: '5px 2px' }}
                                    value={formattedProposed}
                                    onChange={(e) => {
                                      const updatedDates = JSON.parse(JSON.stringify(lessonPlan.dayWiseDates));
                                      if (!updatedDates[div]) updatedDates[div] = {};
                                      if (!updatedDates[div][idx]) updatedDates[div][idx] = { proposed: "", actual: "" };
                                      updatedDates[div][idx].proposed = e.target.value;
                                      setLessonPlan({ ...lessonPlan, dayWiseDates: updatedDates });
                                    }}
                                  />
                                </td>
                                <td>
                                  <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%', fontSize: '0.85rem', padding: '5px 2px' }}
                                    value={formattedActual}
                                    onChange={(e) => {
                                      const updatedDates = JSON.parse(JSON.stringify(lessonPlan.dayWiseDates));
                                      if (!updatedDates[div]) updatedDates[div] = {};
                                      if (!updatedDates[div][idx]) updatedDates[div][idx] = { proposed: "", actual: "" };
                                      updatedDates[div][idx].actual = e.target.value;
                                      setLessonPlan({ ...lessonPlan, dayWiseDates: updatedDates });
                                    }}
                                  />
                                </td>
                                <td>
                                  <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={enrichment.method}
                                    onChange={(e) => {
                                      const updated = [...lessonPlan.dayWiseEnrichment];
                                      updated[idx].method = e.target.value;
                                      setLessonPlan({ ...lessonPlan, dayWiseEnrichment: updated });
                                    }}
                                  />
                                </td>
                                <td>
                                  <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={moduleBT}
                                    onChange={(e) => {
                                      // Update the BT for the first index of this module to propagate to all
                                      const updated = [...lessonPlan.dayWiseEnrichment];
                                      if (!updated[firstModuleIdx]) updated[firstModuleIdx] = { bt: e.target.value };
                                      else updated[firstModuleIdx].bt = e.target.value;
                                      setLessonPlan({ ...lessonPlan, dayWiseEnrichment: updated });
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

          {/* 9. ACTIVITIES PLANNED */}
          {lessonPlan.programOutcomes && (
            <div className="lp-table-wrapper" style={{ marginBottom: '40px' }}>
              <h4 style={{ marginBottom: '10px' }}>Activities Planned if any (optional)</h4>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="lp-table cap-table" style={{ textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ width: '60px' }}>Sr.<br />No</th>
                      <th colSpan="4">Activity Details</th>
                    </tr>
                    <tr>
                      <th>Name of the Event<br />(Expert Talk/Workshop/seminar/Industrial Visit /GD etc)</th>
                      <th style={{ width: '120px' }}>Date</th>
                      <th style={{ width: '120px' }}>Venue</th>
                      <th style={{ width: '100px' }}>CO.NO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lessonPlan.activitiesPlanned || defaultActivities).map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.sr} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.activitiesPlanned || defaultActivities));
                            updated[idx].sr = e.target.value;
                            setLessonPlan({ ...lessonPlan, activitiesPlanned: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.name} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.activitiesPlanned || defaultActivities));
                            updated[idx].name = e.target.value;
                            setLessonPlan({ ...lessonPlan, activitiesPlanned: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.date} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.activitiesPlanned || defaultActivities));
                            updated[idx].date = e.target.value;
                            setLessonPlan({ ...lessonPlan, activitiesPlanned: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.venue} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.activitiesPlanned || defaultActivities));
                            updated[idx].venue = e.target.value;
                            setLessonPlan({ ...lessonPlan, activitiesPlanned: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.co} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.activitiesPlanned || defaultActivities));
                            updated[idx].co = e.target.value;
                            setLessonPlan({ ...lessonPlan, activitiesPlanned: updated });
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. QUESTION PAPER AND CO ANALYSIS */}
          {lessonPlan.programOutcomes && (
            <div className="lp-table-wrapper" style={{ marginBottom: '40px' }}>
              <h4 style={{ marginBottom: '10px' }}>Question Paper and CO analysis</h4>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="lp-table cap-table" style={{ textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ width: '60px' }}>Q.<br />No</th>
                      <th colSpan="2">Term Test 1</th>
                      <th colSpan="2">Term Test 2</th>
                    </tr>
                    <tr>
                      <th>BT Level</th>
                      <th style={{ width: '100px' }}>CO</th>
                      <th>BT Level</th>
                      <th style={{ width: '100px' }}>CO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lessonPlan.termTestsAnalysis || defaultTermTests).map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 'bold' }}>{row.q}</td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.bt1} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.termTestsAnalysis || defaultTermTests));
                            updated[idx].bt1 = e.target.value;
                            setLessonPlan({ ...lessonPlan, termTestsAnalysis: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.co1} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.termTestsAnalysis || defaultTermTests));
                            updated[idx].co1 = e.target.value;
                            setLessonPlan({ ...lessonPlan, termTestsAnalysis: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.bt2} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.termTestsAnalysis || defaultTermTests));
                            updated[idx].bt2 = e.target.value;
                            setLessonPlan({ ...lessonPlan, termTestsAnalysis: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.co2} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.termTestsAnalysis || defaultTermTests));
                            updated[idx].co2 = e.target.value;
                            setLessonPlan({ ...lessonPlan, termTestsAnalysis: updated });
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', marginTop: '30px' }}>
                <table className="lp-table cap-table" style={{ textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '1100px' }}>
                  <thead>
                    <tr>
                      <th colSpan="3">End Semester</th>
                      <th colSpan="3">End Semester</th>
                      <th colSpan="3">End Semester</th>
                    </tr>
                    <tr>
                      <th style={{ width: '80px' }}>Question<br />No.</th>
                      <th>BT Level</th>
                      <th style={{ width: '60px' }}>CO</th>
                      <th style={{ width: '80px' }}>Question<br />No.</th>
                      <th>BT Level</th>
                      <th style={{ width: '60px' }}>CO</th>
                      <th style={{ width: '80px' }}>Question<br />No.</th>
                      <th>BT Level</th>
                      <th style={{ width: '60px' }}>CO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lessonPlan.endSemAnalysis || defaultEndSem).map((row, idx) => (
                      <tr key={idx}>
                        {/* Block 1 */}
                        <td style={{ fontWeight: 'bold' }}>{row.c1.q}</td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.c1.bt} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.endSemAnalysis || defaultEndSem));
                            updated[idx].c1.bt = e.target.value;
                            setLessonPlan({ ...lessonPlan, endSemAnalysis: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.c1.co} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.endSemAnalysis || defaultEndSem));
                            updated[idx].c1.co = e.target.value;
                            setLessonPlan({ ...lessonPlan, endSemAnalysis: updated });
                          }} />
                        </td>

                        {/* Block 2 */}
                        <td style={{ fontWeight: 'bold' }}>{row.c2.q}</td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.c2.bt} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.endSemAnalysis || defaultEndSem));
                            updated[idx].c2.bt = e.target.value;
                            setLessonPlan({ ...lessonPlan, endSemAnalysis: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.c2.co} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.endSemAnalysis || defaultEndSem));
                            updated[idx].c2.co = e.target.value;
                            setLessonPlan({ ...lessonPlan, endSemAnalysis: updated });
                          }} />
                        </td>

                        {/* Block 3 */}
                        <td style={{ fontWeight: 'bold' }}>{row.c3.q}</td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.c3.bt} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.endSemAnalysis || defaultEndSem));
                            updated[idx].c3.bt = e.target.value;
                            setLessonPlan({ ...lessonPlan, endSemAnalysis: updated });
                          }} />
                        </td>
                        <td>
                          <input type="text" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={row.c3.co} onChange={(e) => {
                            const updated = JSON.parse(JSON.stringify(lessonPlan.endSemAnalysis || defaultEndSem));
                            updated[idx].c3.co = e.target.value;
                            setLessonPlan({ ...lessonPlan, endSemAnalysis: updated });
                          }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 11. CO-PO MAPPING */}
          {lessonPlan.programOutcomes && (
            <div className="lp-table-wrapper" style={{ marginBottom: '40px' }}>
              <h4 style={{ marginBottom: '10px' }}>Co Mapping with PO</h4>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="lp-table cap-table" style={{ textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '1000px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}></th>
                      {lessonPlan.programOutcomes.map((po, idx) => {
                        const poLabel = typeof po === "string" ? po.split(":")[0] : (po.code || `PO${idx + 1}`);
                        return <th key={idx}>{poLabel}</th>;
                      })}
                      <th>PSO1</th>
                      <th>PSO2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lessonPlan.courseOutcomes || []).map((co, cIdx) => (
                      <tr key={cIdx}>
                        <td style={{ fontWeight: 'bold' }}>CO{cIdx + 1}</td>
                        {lessonPlan.programOutcomes.map((po, pIdx) => {
                          const poLabel = typeof po === "string" ? po.split(":")[0] : (po.code || `PO${pIdx + 1}`);
                          const mappingKey = `CO${cIdx + 1}_${poLabel}`;
                          const isMapped = (co.mappedPOs || "").toUpperCase().includes(poLabel.toUpperCase());
                          const defaultVal = isMapped ? "3" : "";
                          const val = (lessonPlan.coPoMapping || {})[mappingKey] !== undefined ? (lessonPlan.coPoMapping || {})[mappingKey] : defaultVal;
                          return (
                            <td key={pIdx}>
                              <input type="number" min="1" max="3" className="methodology-input" style={{ textAlign: 'center', width: '100%' }} value={val} onChange={(e) => {
                                const updated = { ...(lessonPlan.coPoMapping || {}) };
                                updated[mappingKey] = e.target.value;
                                setLessonPlan({ ...lessonPlan, coPoMapping: updated });
                              }} />
                            </td>
                          );
                        })}
                        <td>
                          <input type="number" min="1" max="3" className="methodology-input" style={{ textAlign: 'center', width: '100%' }}
                            value={(lessonPlan.coPoMapping || {})[`CO${cIdx + 1}_PSO1`] !== undefined ? (lessonPlan.coPoMapping || {})[`CO${cIdx + 1}_PSO1`] : ((co.mappedPOs || "").toUpperCase().includes("PSO1") ? "3" : "")}
                            onChange={(e) => {
                              const updated = { ...(lessonPlan.coPoMapping || {}) };
                              updated[`CO${cIdx + 1}_PSO1`] = e.target.value;
                              setLessonPlan({ ...lessonPlan, coPoMapping: updated });
                            }} />
                        </td>
                        <td>
                          <input type="number" min="1" max="3" className="methodology-input" style={{ textAlign: 'center', width: '100%' }}
                            value={(lessonPlan.coPoMapping || {})[`CO${cIdx + 1}_PSO2`] !== undefined ? (lessonPlan.coPoMapping || {})[`CO${cIdx + 1}_PSO2`] : ((co.mappedPOs || "").toUpperCase().includes("PSO2") ? "3" : "")}
                            onChange={(e) => {
                              const updated = { ...(lessonPlan.coPoMapping || {}) };
                              updated[`CO${cIdx + 1}_PSO2`] = e.target.value;
                              setLessonPlan({ ...lessonPlan, coPoMapping: updated });
                            }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="lp-actions" style={{ justifyContent: 'center', marginTop: '40px', borderTop: 'none' }}>
            <button style={{
              width: '100%',
              padding: '14px',
              fontSize: '1.05rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              cursor: 'pointer'
            }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleExportWord}>
              <span>Export Lesson Plan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonPlanPage;

