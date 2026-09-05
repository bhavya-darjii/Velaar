import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import GlassSelect from '../../components/shared/GlassSelect';
import './MarksDashboard.css';

const MarksDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [detailedClass, setDetailedClass] = useState('SY - A');
  const [detailedTest, setDetailedTest] = useState('Term Test 1');
  const [viewClass, setViewClass] = useState('SY - A');
  const [deleteTest, setDeleteTest] = useState('Term Test 1');

  // Show exam selection view when on /teacher/marks/edit
  const isEditSelection = location.pathname === '/teacher/marks/edit';

  return (
    <div className="marks-dashboard">
      {!isEditSelection ? (
        <div className="marks-grid">
          {/* Edit Marks */}
          <div className="marks-card glass">
            <h3>Edit Marks</h3>
            <div className="card-controls">
              <p className="marks-card-desc">
                Modify marks mapped securely against your Course Outcomes according to the paper pattern structure generated in the Examination module.
              </p>
              <button className="marks-action-btn" onClick={() => navigate('/teacher/marks/edit')}>Edit Marks</button>
            </div>
          </div>

          {/* Detailed View */}
          <div className="marks-card glass">
            <h3>Detailed View</h3>
            <div className="card-controls">
              <label>Select Class</label>
              <GlassSelect
                value={detailedClass}
                onChange={setDetailedClass}
                options={['SY - A', 'SY - B', 'TY - A', 'TY - B']}
              />
              <label>Select Test</label>
              <GlassSelect
                value={detailedTest}
                onChange={setDetailedTest}
                options={['Term Test 1', 'Term Test 2', 'End Semester']}
              />
              <button className="marks-action-btn" onClick={() => alert('Coming soon!')}>View Marks</button>
            </div>
          </div>

          {/* View Marks */}
          <div className="marks-card glass">
            <h3>View Marks</h3>
            <div className="card-controls">
              <label>Select Class</label>
              <GlassSelect
                value={viewClass}
                onChange={setViewClass}
                options={['SY - A', 'SY - B', 'TY - A', 'TY - B']}
              />
              <label>Average Conversion</label>
              <input type="text" className="marks-input" placeholder="Conversion Logic" />
              <button className="marks-action-btn" onClick={() => alert('Coming soon!')}>View Marks</button>
            </div>
          </div>

          {/* Delete Marks */}
          <div className="marks-card glass">
            <h3>Delete Marks</h3>
            <div className="card-controls">
              <label>Select Test</label>
              <GlassSelect
                value={deleteTest}
                onChange={setDeleteTest}
                options={['Term Test 1', 'Term Test 2', 'End Semester']}
              />
              <button className="marks-action-btn marks-delete-btn" onClick={() => alert('Coming soon!')}>Delete Marks</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="edit-selection-view">
          <h2 className="selection-title">Select Examination</h2>
          <p className="selection-subtitle">Choose the examination to dynamically edit student marks based on your paper pattern.</p>
          
          <div className="exam-selection-grid">
            <div className="marks-exam-card glass" onClick={() => navigate('/teacher/marks/edit/tt1')}>
              <h3>Term Test 1</h3>
              <p>Edit mapped marks for TT1.</p>
            </div>
            <div className="marks-exam-card glass" onClick={() => navigate('/teacher/marks/edit/tt2')}>
              <h3>Term Test 2</h3>
              <p>Edit mapped marks for TT2.</p>
            </div>
            <div className="marks-exam-card glass" onClick={() => navigate('/teacher/marks/edit/endSem')}>
              <h3>End Semester Exam</h3>
              <p>Edit mapped marks for End Sem.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksDashboard;
