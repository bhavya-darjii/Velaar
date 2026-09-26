import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import GlassSelect from '../../components/shared/GlassSelect';
import { getDistinctClasses, classToSemesters, getDistinctDivisions } from '../../services/dataService';
import './MarksDashboard.css';

const EXAM_OPTIONS = [
  { slug: 'tt1', title: 'Term Test 1', desc: 'Edit mapped marks for Term Test 1.' },
  { slug: 'tt2', title: 'Term Test 2', desc: 'Edit mapped marks for Term Test 2.' },
  { slug: 'endSem', title: 'End Semester Exam', desc: 'Edit mapped marks for End Semester Examination.' },
];

const MarksDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { course } = useOutletContext<any>() || {};

  const [classOptions, setClassOptions] = useState<string[]>([]);
  const [divisionOptions, setDivisionOptions] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Initialize from location.state if navigated back
  const [editClass, setEditClass] = useState<string>(() => (location.state as any)?.selectedClass || '');
  const [editSemester, setEditSemester] = useState<string>(() => (location.state as any)?.selectedSemester || '');
  const [editDivision, setEditDivision] = useState<string>(() => (location.state as any)?.selectedDivision || '');

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getDistinctClasses(course?.institution_id),
      getDistinctDivisions(course?.institution_id),
    ]).then(([fetchedClasses, fetchedDivisions]) => {
      if (!mounted) return;

      if (fetchedClasses && fetchedClasses.length > 0) {
        setClassOptions(fetchedClasses);
        const initialClass = editClass && fetchedClasses.includes(editClass) ? editClass : fetchedClasses[0];
        setEditClass(initialClass);
        const validSems = classToSemesters(initialClass);
        if (!editSemester || !validSems.includes(editSemester)) {
          setEditSemester(validSems[0] || '1');
        }
      } else {
        setClassOptions([]);
      }

      if (fetchedDivisions && fetchedDivisions.length > 0) {
        setDivisionOptions(fetchedDivisions);
        if (!editDivision || !fetchedDivisions.includes(editDivision)) {
          setEditDivision(fetchedDivisions[0]);
        }
      } else {
        setDivisionOptions([]);
      }

      setLoadingClasses(false);
    });

    return () => { mounted = false; };
  }, [course?.institution_id]);

  const handleEditClassChange = (newCls: string) => {
    setEditClass(newCls);
    const sems = classToSemesters(newCls);
    if (sems.length > 0) {
      setEditSemester(sems[0]);
    }
  };

  // Show exam selection view when on /teacher/marks/edit
  const isEditSelection = location.pathname === '/teacher/marks/edit';

  const currentClass = (location.state as any)?.selectedClass || editClass;
  const currentSemester = (location.state as any)?.selectedSemester || editSemester;
  const currentDivision = (location.state as any)?.selectedDivision || editDivision;

  const handleOpenMarksSheet = () => {
    navigate('/teacher/marks/edit', {
      state: {
        selectedClass: editClass,
        selectedSemester: editSemester,
        selectedDivision: editDivision,
      },
    });
  };

  const handleSelectExam = (examSlug: string, examTitle: string) => {
    navigate(`/teacher/marks/edit/${examSlug}`, {
      state: {
        selectedClass: currentClass,
        selectedSemester: currentSemester,
        selectedDivision: currentDivision,
        selectedTest: examTitle,
      },
    });
  };

  return (
    <div className="marks-dashboard">
      {!isEditSelection ? (
        <div className="marks-hero-container">
          {/* Focused & Enlarged Edit Marks Card */}
          <div className="marks-card glass-card marks-card--featured">
            <div className="marks-card-header">
              <span className="marks-card-badge">Examination Control</span>
              <h2>Edit Marks</h2>
              <p className="marks-card-desc">
                Select your class, semester, and division, then click Open Marks Sheet to choose your test.
              </p>
            </div>

            <div className="card-controls">
              <div className="marks-form-row">
                <div className="marks-form-group">
                  <label>Select Class</label>
                  <GlassSelect
                    value={editClass}
                    onChange={handleEditClassChange}
                    options={classOptions}
                    placeholder={loadingClasses ? 'Loading...' : 'Select Class'}
                  />
                </div>
                <div className="marks-form-group">
                  <label>Select Semester</label>
                  <GlassSelect
                    value={editSemester}
                    onChange={setEditSemester}
                    options={classToSemesters(editClass).map(s => ({ value: s, label: `Semester ${s}` }))}
                    placeholder="Select Semester"
                  />
                </div>
              </div>

              <div className="marks-form-group">
                <label>Select Division</label>
                <GlassSelect
                  value={editDivision}
                  onChange={setEditDivision}
                  options={divisionOptions.map(d => ({ value: d, label: `Division ${d}` }))}
                  placeholder={loadingClasses ? 'Loading...' : 'Select Division'}
                />
              </div>

              <button
                className="marks-action-btn marks-action-btn--large"
                onClick={handleOpenMarksSheet}
                disabled={!editClass || !editSemester}
              >
                Open Marks Sheet →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="edit-selection-view">
          <h2 className="selection-title">Select Examination</h2>
          {(currentClass || currentSemester || currentDivision) && (
            <p className="selection-subtitle">
              {currentClass && <>Year - <strong>{currentClass}</strong></>}
              {currentSemester && <> &nbsp;·&nbsp; Semester - <strong>{currentSemester}</strong></>}
              {currentDivision && <> &nbsp;·&nbsp; Division - <strong>{currentDivision}</strong></>}
            </p>
          )}
          
          <div className="exam-selection-grid">
            {EXAM_OPTIONS.map((exam) => (
              <div
                key={exam.slug}
                className="marks-exam-card glass-card"
                onClick={() => handleSelectExam(exam.slug, exam.title)}
              >
                <h3>{exam.title}</h3>
                <p>{exam.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksDashboard;
