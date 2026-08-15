/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ExaminationSkeleton from '../../components/skeletons/ExaminationSkeleton';
import './ExaminationPage.css';

const EXAM_TYPES = [
  { id: 'tt1', title: 'Term Test 1', desc: 'Auto-mapped to Course Outcomes 1-3' },
  { id: 'tt2', title: 'Term Test 2', desc: 'Auto-mapped to Course Outcomes 4-6' },
  { id: 'endSem', title: 'End Semester Exam', desc: 'Comprehensive Course Coverage' }
];

const ExaminationPage = () => {
  const { course, loading: layoutLoading } = useOutletContext() || {};
  const navigate = useNavigate();

  const handleNavigateToEditor = (examId) => {
    navigate(`/teacher/examination/${examId}`);
  };

  if (layoutLoading) return <ExaminationSkeleton />;
  if (!course) return <ExaminationSkeleton />;

  return (
    <div className="lesson-plan-container" style={{ padding: '16px' }}>
      <div className="lesson-plan-grid glass" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '24px' }}>
        <div className="exams-header" style={{marginBottom: "20px", textAlign: "center"}}>
          <h2 style={{color: '#ffffff', margin: 0, fontSize: '2rem', fontWeight: 900}}>Institutional Examinations</h2>
          <p style={{color: '#ffffff', margin: '8px 0 0 0', fontSize: '1rem', opacity: 0.9}}>
            Dynamically compile correctly formatted College-issued Word Documents based on your syllabus.
          </p>
        </div>

      <div className="examination-grid">
        {EXAM_TYPES.map(exam => (
          <div className="exam-card" key={exam.id}>
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

