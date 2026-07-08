import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MarksDashboard.css';

const MarksDashboard = () => {
  const navigate = useNavigate();
  const [showEditSelection, setShowEditSelection] = React.useState(false);

  return (
    <div className="marks-dashboard">
      {!showEditSelection ? (
        <div className="marks-grid">          {/* Edit Marks */}
          <div className="marks-card glass">
            <h3>Edit Marks</h3>
            <div className="card-controls">
              <p className="marks-card-desc">
                Modify marks mapped securely against your Course Outcomes according to the paper pattern structure generated in the Examination module.
              </p>
              <button className="marks-action-btn" onClick={() => setShowEditSelection(true)}>Edit Marks</button>
            </div>
          </div>

          {/* Detailed View */}
          <div className="marks-card glass">
            <h3>Detailed View</h3>
            <div className="card-controls">
              <label>Select Class</label>
              <select className="marks-select" defaultValue=""><option value="" disabled>Select Class</option><option>SY - A</option></select>
              <label>Select Test</label>
              <select className="marks-select" defaultValue=""><option value="" disabled>Select Test</option><option>Term Test 1</option></select>
              <button className="marks-action-btn" onClick={() => alert('Coming soon!')}>View Marks</button>
            </div>
          </div>

          {/* View Marks */}
          <div className="marks-card glass">
            <h3>View Marks</h3>
            <div className="card-controls">
              <label>Select Class</label>
              <select className="marks-select" defaultValue=""><option value="" disabled>Select Class</option><option>SY - A</option></select>
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
              <select className="marks-select" defaultValue=""><option value="" disabled>Select test</option><option>Term Test 1</option></select>
              <button className="marks-action-btn marks-delete-btn" onClick={() => alert('Coming soon!')}>Delete Marks</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="edit-selection-view">
          <div className="back-arrow" onClick={() => setShowEditSelection(false)}>
            <span>←</span> Back to Dashboard
          </div>
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
