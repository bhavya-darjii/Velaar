import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ExaminationSkeleton from '../components/ExaminationSkeleton';
import './ExaminationPage.css';

const EXAM_TYPES = [
  { id: 'tt1', title: 'Term Test 1', desc: 'Auto-mapped to Course Outcomes 1-3' },
  { id: 'tt2', title: 'Term Test 2', desc: 'Auto-mapped to Course Outcomes 4-6' },
  { id: 'endSem', title: 'End Semester Exam', desc: 'Comprehensive Course Coverage' }
];

const ExaminationPage = () => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // also get layout-level loading so skeleton shows immediately
  const outletCtx = useOutletContext ? useOutletContext() : {};
  const layoutLoading = outletCtx?.loading ?? false;

  useEffect(() => {
    const fetchCourse = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, "courses"), where("teacherId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setCourse({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() });
        }
      } catch (err) {
        console.error("Failed to load course details", err);
      }
      setLoading(false);
    };
    fetchCourse();
  }, []);

  const handleNavigateToEditor = (examId) => {
    navigate(`/teacher/examination/${examId}`);
  };

  if (loading || layoutLoading) return <ExaminationSkeleton />;
  if (!course) return <ExaminationSkeleton />;

  return (
    <div className="glass-container" style={{ minHeight: 'auto', padding: '40px 0' }}>
      <div className="glass-card" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div className="exams-header" style={{marginBottom: "30px", textAlign: "center"}}>
          <h2 style={{color: '#ffffff', margin: 0, fontSize: '2rem', fontWeight: 800}}>Institutional Examinations</h2>
          <p style={{color: '#94a3b8', margin: '10px 0 0 0', fontSize: '1rem'}}>
            Dynamically compile correctly formatted College-issued Word Documents based on your syllabus.
          </p>
        </div>

        <div className="examination-grid">
          {EXAM_TYPES.map(exam => (
            <div className="exam-card fade-in" key={exam.id}>
              <div>
                <h3>{exam.title}</h3>
                <p>{exam.desc}</p>
              </div>
              
              <div className="exam-actions" style={{ marginTop: '0' }}>
                <button 
                  className="btn-generate" 
                  style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                  onClick={() => handleNavigateToEditor(exam.id)}
                >
                  Generate Question Paper
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExaminationPage;
