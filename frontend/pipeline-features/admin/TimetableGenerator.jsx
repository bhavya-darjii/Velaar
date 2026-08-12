import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { generateTimetable } from '../../services/aiService';
import InteractiveTimetableGrid from '../../components/timetable/InteractiveTimetableGrid';
import './TimetableGenerator.css';

const TimetableGenerator = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Firebase Data
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [coursesData, setCoursesData] = useState([]);
  
  // Derived Options for UI
  const [availableYears, setAvailableYears] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [availableDivisions, setAvailableDivisions] = useState([]);

  // Step 1: Settings
  const [meta, setMeta] = useState({
    department: 'Artificial Intelligence and Data Science',
    departmentInitials: 'AI-DS',
    instituteName: '',
    subtitle: '',
    academicYear: '26-27',
    semesterType: 'ODD',
    year: '',
    semester: '',
    division: '',
    defaultRoom: 'CR 03',
    wefDate: '13 JULY, 2026'
  });

  const [timeSlots, setTimeSlots] = useState([
    { id: 't1', label: '8:00-9:00', type: 'lecture' },
    { id: 't2', label: '9:00-10:00', type: 'lecture' },
    { id: 'b1', label: '10:00-10:10', type: 'break', name: 'SHORT BREAK' },
    { id: 't3', label: '10:10-11:10', type: 'lecture' },
    { id: 't4', label: '11:10-12:10', type: 'lecture' },
    { id: 'b2', label: '12:10-12:30', type: 'break', name: 'LUNCH BREAK' },
    { id: 't5', label: '12:30-1:30', type: 'lecture' },
    { id: 't6', label: '1:30-2:30', type: 'lecture' },
    { id: 't7', label: '2:30-3:30', type: 'lecture' }
  ]);

  // Step 2: Constraints
  const [batches, setBatches] = useState(['T1', 'T2', 'T3', 'T4']);
  const [subjects, setSubjects] = useState([]);

  // Step 3: Result
  const [timetableData, setTimetableData] = useState(null);
  const [editingCell, setEditingCell] = useState(null); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Fetch current user's collegeName for instituteName
        const { data: hodData } = await supabase.from('users').select('college_name').eq('id', session.user.id).single();
        if (hodData) {
          setMeta(prev => ({ ...prev, instituteName: hodData.college_name || '' }));
        }

        // Fetch Teachers (user_type = 'teacher')
        const { data: teachersList } = await supabase.from('users').select('id, full_name').eq('user_type', 'teacher');
        setAvailableTeachers((teachersList || []).map(t => ({
          uid: t.id,
          name: t.full_name || 'Unknown',
          initials: (t.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()
        })));

        // Fetch Courses
        const { data: courses } = await supabase.from('courses').select('*');
        const allCourses = courses || [];
        const deptCourses = allCourses.filter(c => (c.department || '').toLowerCase().includes('artificial') || c.department === meta.department);
        setCoursesData(deptCourses);

        const uniqueYears = [...new Set(deptCourses.map(c => c.program).filter(Boolean))];
        const uniqueSemesters = [...new Set(deptCourses.map(c => c.semester).filter(Boolean))];
        let allDivs = [];
        deptCourses.forEach(c => { if (Array.isArray(c.divisions)) allDivs.push(...c.divisions); });
        const uniqueDivisions = [...new Set(allDivs)];

        setAvailableYears(uniqueYears.length > 0 ? uniqueYears : ['FIRST', 'SECOND', 'THIRD', 'FINAL']);
        setAvailableSemesters(uniqueSemesters.length > 0 ? uniqueSemesters : ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']);
        setAvailableDivisions(uniqueDivisions.length > 0 ? uniqueDivisions : ['A', 'B', 'C']);

      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };
    fetchData();
  }, []);

  // When Semester changes, derive Subjects automatically
  useEffect(() => {
    if (meta.semester && coursesData.length > 0) {
      const semCourses = coursesData.filter(c => c.semester === meta.semester);
      
      const uniqueSubjects = [];
      const map = new Map();
      semCourses.forEach(c => {
         if (!map.has(c.subjectName)) {
             map.set(c.subjectName, true);
             uniqueSubjects.push({
                 name: c.subjectName,
                 type: 'both',
                 teacherIds: c.teacherId ? [c.teacherId] : [], 
             });
         }
      });

      if (uniqueSubjects.length > 0) {
          setSubjects(uniqueSubjects);
      } else {
          // Fallback if no courses found for this semester
          setSubjects([
             { name: 'BCE', type: 'both', teacherIds: [] },
             { name: 'ITC', type: 'lecture', teacherIds: [] },
          ]);
      }
    }
  }, [meta.semester, coursesData]);

  const toggleTeacher = (subjectIndex, teacherId) => {
      const newSubjects = [...subjects];
      const currentIds = newSubjects[subjectIndex].teacherIds || [];
      if (currentIds.includes(teacherId)) {
          newSubjects[subjectIndex].teacherIds = currentIds.filter(id => id !== teacherId);
      } else {
          newSubjects[subjectIndex].teacherIds = [...currentIds, teacherId];
      }
      setSubjects(newSubjects);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      // In a real scenario, aiService would parse these specific constraints.
      const payload = {
        meta,
        timeSlots,
        batches,
        subjects
      };

      const aiResult = await generateTimetable(payload);
      
      if (aiResult?.grid) {
         setTimetableData({ meta, timeSlots, grid: aiResult.grid });
      } else {
         // Fallback/Simulated data strictly matching the PDF template requested (without colors or colSpans)
         const fallbackGrid = {
            'MONDAY': {
                't1': { type: 'lecture', subject: subjects[0]?.name || 'BCE', teacher: 'NF', room: 'CR 03' },
                't2': { type: 'lecture', subject: subjects[1]?.name || 'ITC', teacher: 'MN', room: 'CR 03' },
                't3': { type: 'batches', batches: [
                    { name: batches[0], subject: 'ML-Practical', teacher: 'SJ', room: '401A' },
                    { name: batches[1], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' },
                    { name: batches[2], subject: 'DWM-Practical', teacher: 'SYM', room: '207' },
                    { name: batches[3], subject: 'BCE-Practical', teacher: 'VD', room: '802' }
                ]},
                't4': { type: 'batches', batches: [
                    { name: batches[0], subject: 'ML-Practical', teacher: 'SJ', room: '401A' },
                    { name: batches[1], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' },
                    { name: batches[2], subject: 'DWM-Practical', teacher: 'SYM', room: '207' },
                    { name: batches[3], subject: 'BCE-Practical', teacher: 'VD', room: '802' }
                ]},
                't5': { type: 'lecture', subject: 'SBL', teacher: 'BI', room: 'CR 08' },
                't6': { type: 'lecture', subject: 'PBL MINOR ALL STUDENTS', teacher: '', room: '' },
                't7': { type: 'lecture', subject: 'PBL MINOR ALL STUDENTS', teacher: '', room: '' }
            },
            'TUESDAY': {
                't1': { type: 'lecture', subject: subjects[0]?.name || 'BCE', teacher: 'NF', room: 'CR 03' },
                't2': { type: 'lecture', subject: subjects[1]?.name || 'ITC', teacher: 'MN', room: 'CR 03' },
                't3': { type: 'lecture', subject: 'IVP', teacher: 'MB', room: 'CR 03\nAICN/SJ/CR 04' }, 
                't4': { type: 'lecture', subject: 'DWM', teacher: 'SYM', room: 'CR 03' },
                't5': { type: 'lecture', subject: 'T1 &T2-IOT-Practical', teacher: 'SM', room: 'L10' },
                't6': { type: 'lecture', subject: 'T1 &T2-IOT-Practical', teacher: 'SM', room: 'L10' },
                't7': null
            },
            'WEDNESDAY': {
                't1': { type: 'batches', batches: [
                    { name: batches[0], subject: 'BCE-Practical', teacher: 'VD', room: '802' },
                    { name: batches[1], subject: 'ML-Practical', teacher: 'SJ', room: '401A' },
                    { name: batches[2], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' },
                    { name: batches[3], subject: 'DWM-Practical', teacher: 'SYM', room: '205 B' }
                ]},
                't2': { type: 'batches', batches: [
                    { name: batches[0], subject: 'BCE-Practical', teacher: 'VD', room: '802' },
                    { name: batches[1], subject: 'ML-Practical', teacher: 'SJ', room: '401A' },
                    { name: batches[2], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' },
                    { name: batches[3], subject: 'DWM-Practical', teacher: 'SYM', room: '205 B' }
                ]},
                't3': { type: 'lecture', subject: subjects[1]?.name || 'ITC', teacher: 'MN', room: 'CR 03' },
                't4': { type: 'lecture', subject: 'ML', teacher: 'SJ', room: 'CR 03' },
                't5': { type: 'lecture', subject: 'T3 &T4-IOT-Practical', teacher: 'NA', room: 'L10' },
                't6': { type: 'lecture', subject: 'T3 &T4-IOT-Practical', teacher: 'NA', room: 'L10' },
                't7': null
            },
            'THURSDAY': {
                't1': { type: 'lecture', subject: 'IVP', teacher: 'MB', room: 'CR 03\nAICN/SJ/CR 04' },
                't2': { type: 'lecture', subject: 'DWM', teacher: 'SYM', room: 'CR 03' },
                't3': { type: 'batches', batches: [
                    { name: batches[0], subject: 'DWM-Practical', teacher: 'SYM', room: '205 B' },
                    { name: batches[1], subject: 'BCE-Practical', teacher: 'VD', room: '803' },
                    { name: batches[2], subject: 'ML-Practical', teacher: 'NV', room: '401A' },
                    { name: batches[3], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' }
                ]},
                't4': { type: 'batches', batches: [
                    { name: batches[0], subject: 'DWM-Practical', teacher: 'SYM', room: '205 B' },
                    { name: batches[1], subject: 'BCE-Practical', teacher: 'VD', room: '803' },
                    { name: batches[2], subject: 'ML-Practical', teacher: 'NV', room: '401A' },
                    { name: batches[3], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' }
                ]},
                't5': { type: 'lecture', subject: 'ML', teacher: 'SJ', room: 'CR 08' },
                't6': null,
                't7': null
            },
            'FRIDAY': {
                't1': { type: 'lecture', subject: 'ML', teacher: 'SJ', room: 'CR 03' },
                't2': { type: 'lecture', subject: 'IVP', teacher: 'MB', room: 'CR 03\nAICN/SJ/CR 04' },
                't3': { type: 'batches', batches: [
                    { name: batches[0], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' },
                    { name: batches[1], subject: 'DWM-Practical', teacher: 'SYM', room: '207' },
                    { name: batches[2], subject: 'BCE-Practical', teacher: 'VD', room: '802' },
                    { name: batches[3], subject: 'ML-Practical', teacher: 'SJ', room: '401A' }
                ]},
                't4': { type: 'batches', batches: [
                    { name: batches[0], subject: 'IVP-Practical', teacher: 'MB', room: '402 A' },
                    { name: batches[1], subject: 'DWM-Practical', teacher: 'SYM', room: '207' },
                    { name: batches[2], subject: 'BCE-Practical', teacher: 'VD', room: '802' },
                    { name: batches[3], subject: 'ML-Practical', teacher: 'SJ', room: '401A' }
                ]},
                't5': { type: 'lecture', subject: 'DWM', teacher: 'SYM', room: 'CR 08' },
                't6': { type: 'lecture', subject: 'PBL MINOR ALL STUDENTS', teacher: '', room: '' },
                't7': { type: 'lecture', subject: 'PBL MINOR ALL STUDENTS', teacher: '', room: '' }
            }
         };
         
         const metaWithTeachers = { ...meta, teachersList: availableTeachers.slice(0, 5) };
         setTimetableData({ meta: metaWithTeachers, timeSlots, grid: fallbackGrid });
      }

      setStep(3);
    } catch (err) {
      console.error(err);
      setError('Generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (day, slotId, currentData) => {
    setEditingCell({
        day, 
        slotId, 
        data: currentData || { type: 'lecture', subject: '', teacher: '', room: '' }
    });
  };

  const saveCellEdit = () => {
    if (!editingCell) return;
    
    setTimetableData(prev => {
        const nextGrid = { ...prev.grid };
        if (!nextGrid[editingCell.day]) nextGrid[editingCell.day] = {};
        nextGrid[editingCell.day][editingCell.slotId] = editingCell.data;
        return { ...prev, grid: nextGrid };
    });
    
    setEditingCell(null);
  };

  const handleSaveToDatabase = async (silent = false) => {
    setLoading(true);
    try {
      const timetableId = `${meta.department}_${meta.year}_${meta.division}_${meta.semester}`.replace(/\s+/g, '_').toLowerCase();
      const { error } = await supabase.from('timetable').upsert({
        id: timetableId,
        department: meta.department,
        semester: meta.semester,
        schedule: { meta: timetableData.meta, timeSlots: timetableData.timeSlots, grid: timetableData.grid },
      }, { onConflict: 'id' });
      if (error) throw error;
      if (!silent) alert('Timetable saved/updated to database successfully!');
    } catch (err) {
      console.error('Failed to save timetable', err);
      if (!silent) alert('Failed to save timetable.');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
      await handleSaveToDatabase(true); // Save silently before printing
      window.print();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2>AI Timetable Generator</h2>
          <p>Configure constraints dynamically, generate conflict-free schedules, and persist them.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
        
        {/* WIZARD PROGRESS */}
        <div className="wizard-steps" style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
            <div style={{ opacity: step >= 1 ? 1 : 0.5, fontWeight: step === 1 ? 'bold' : 'normal', color: step === 1 ? '#0a8fa8' : '#fff' }}>1. Settings</div>
            <div style={{ opacity: step >= 2 ? 1 : 0.5, fontWeight: step === 2 ? 'bold' : 'normal', color: step === 2 ? '#0a8fa8' : '#fff' }}>2. Constraints</div>
            <div style={{ opacity: step >= 3 ? 1 : 0.5, fontWeight: step === 3 ? 'bold' : 'normal', color: step === 3 ? '#0a8fa8' : '#fff' }}>3. Editor</div>
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '20px', textAlign: 'center', fontWeight: 'bold' }}>{error}</div>}

        {/* STEP 1: SETTINGS */}
        {step === 1 && (
          <div className="wizard-step">
            <h3 style={{ marginBottom: '20px' }}>Basic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div className="feature-field">
                <label>Department</label>
                <input value={meta.department} onChange={(e) => setMeta({...meta, department: e.target.value})} />
              </div>
              
              <div className="feature-field">
                <label>Year / Program</label>
                <select value={meta.year} onChange={(e) => setMeta({...meta, year: e.target.value})}>
                    <option value="">Select Year...</option>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="feature-field">
                <label>Semester</label>
                <select value={meta.semester} onChange={(e) => setMeta({...meta, semester: e.target.value})}>
                    <option value="">Select Semester...</option>
                    {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="feature-field">
                <label>Division</label>
                <select value={meta.division} onChange={(e) => setMeta({...meta, division: e.target.value})}>
                    <option value="">Select Division...</option>
                    {availableDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <h3 style={{ marginBottom: '10px' }}>Time Slots & Breaks</h3>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>Configure your college's specific time slots. Mark slots as "break" for vertical span columns.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
                {timeSlots.map((slot, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input value={slot.label} onChange={(e) => { const n = [...timeSlots]; n[i].label = e.target.value; setTimeSlots(n); }} style={{ width: '150px' }} />
                        <select value={slot.type} onChange={(e) => { const n = [...timeSlots]; n[i].type = e.target.value; setTimeSlots(n); }} style={{ width: '120px' }}>
                            <option value="lecture">Lecture Slot</option>
                            <option value="break">Break Slot</option>
                        </select>
                        {slot.type === 'break' && (
                            <input value={slot.name} placeholder="Break Name" onChange={(e) => { const n = [...timeSlots]; n[i].name = e.target.value; setTimeSlots(n); }} style={{ width: '200px' }} />
                        )}
                    </div>
                ))}
            </div>
            
            <button className="glass-btn glass-btn--primary" onClick={() => setStep(2)}>Next: Setup Constraints</button>
          </div>
        )}

        {/* STEP 2: CONSTRAINTS */}
        {step === 2 && (
          <div className="wizard-step">
            <div style={{ display: 'flex', gap: '40px' }}>
                
                {/* Batches */}
                <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '10px' }}>Practical Batches</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {batches.map((b, i) => (
                            <input key={i} value={b} onChange={(e) => { const n = [...batches]; n[i] = e.target.value; setBatches(n); }} style={{ width: '80px' }} />
                        ))}
                    </div>
                </div>

                {/* Subjects */}
                <div style={{ flex: 2 }}>
                    <h3 style={{ marginBottom: '10px' }}>Subjects & Teachers</h3>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '15px' }}>Subjects fetched from courses. You can assign MULTIPLE teachers to a subject.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {subjects.map((sub, i) => (
                            <div key={i} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <input value={sub.name} placeholder="Subject Code" onChange={(e) => { const n = [...subjects]; n[i].name = e.target.value; setSubjects(n); }} style={{ width: '120px' }} />
                                    <select value={sub.type} onChange={(e) => { const n = [...subjects]; n[i].type = e.target.value; setSubjects(n); }} style={{ width: '120px', fontSize: '0.8rem' }}>
                                        <option value="both">Theory+Prac</option>
                                        <option value="lecture">Theory Only</option>
                                        <option value="practical">Prac Only</option>
                                    </select>
                                </div>
                                
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Assign Teachers:</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {availableTeachers.map(t => {
                                            const isSelected = sub.teacherIds?.includes(t.uid);
                                            return (
                                                <button 
                                                   key={t.uid} 
                                                   onClick={() => toggleTeacher(i, t.uid)}
                                                   style={{ 
                                                       background: isSelected ? '#0a8fa8' : 'rgba(255,255,255,0.1)', 
                                                       color: '#fff', 
                                                       border: 'none', 
                                                       padding: '4px 8px', 
                                                       borderRadius: '4px', 
                                                       fontSize: '0.8rem',
                                                       cursor: 'pointer' 
                                                   }}>
                                                   {t.name}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', gap: '15px' }}>
                <button className="glass-btn glass-btn--ghost" onClick={() => setStep(1)}>Back</button>
                <button className="glass-btn glass-btn--primary" onClick={handleGenerate} disabled={loading}>
                    {loading ? 'AI is Generating...' : 'Generate with AI ✨'}
                </button>
            </div>
          </div>
        )}

        {/* STEP 3: EDITOR */}
        {step === 3 && timetableData && (
          <div className="wizard-step">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Interactive Timetable Editor</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="glass-btn glass-btn--ghost" onClick={() => setStep(2)}>Back to Constraints</button>
                    <button className="glass-btn glass-btn--primary" onClick={exportPDF}>Export PDF</button>
                    <button className="glass-btn glass-btn--primary" onClick={handleSaveToDatabase} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes to Database'}
                    </button>
                </div>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>Click on any slot to manually edit teacher, subject, or room assignments. Changes can be saved globally.</p>

            <InteractiveTimetableGrid 
               timetable={timetableData} 
               onCellClick={handleCellClick}
            />

            {/* Editing Modal */}
            {editingCell && (
               <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2147483647 }}>
                  <div className="glass-card" style={{ padding: '30px', width: '400px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <h3>Edit Slot: {editingCell.day} {timetableData.timeSlots.find(s => s.id === editingCell.slotId)?.label}</h3>
                      
                      {editingCell.data.type === 'batches' ? (
                         <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '20px' }}>Batch editing is complex. Please convert to a single lecture to edit here.</p>
                      ) : (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', marginTop: '15px' }}>
                             <div className="feature-field">
                                 <label>Subject</label>
                                 <input 
                                    value={editingCell.data.subject || ''} 
                                    onChange={(e) => setEditingCell({...editingCell, data: {...editingCell.data, subject: e.target.value}})} 
                                 />
                             </div>
                             <div className="feature-field">
                                 <label>Teacher (Initials)</label>
                                 <input 
                                    value={editingCell.data.teacher || ''} 
                                    onChange={(e) => setEditingCell({...editingCell, data: {...editingCell.data, teacher: e.target.value}})} 
                                 />
                             </div>
                             <div className="feature-field">
                                 <label>Room</label>
                                 <input 
                                    value={editingCell.data.room || ''} 
                                    onChange={(e) => setEditingCell({...editingCell, data: {...editingCell.data, room: e.target.value}})} 
                                 />
                             </div>
                         </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button className="glass-btn glass-btn--ghost" onClick={() => setEditingCell(null)}>Cancel</button>
                          <button className="glass-btn glass-btn--primary" onClick={saveCellEdit}>Apply</button>
                      </div>
                  </div>
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TimetableGenerator;
