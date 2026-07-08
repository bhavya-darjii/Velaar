

const AssignmentHub = () => (
  <div className="dashboard-container">
    <div className="dashboard-header">
      <div>
        <h2>Assignment Hub</h2>
        <p>Generate unique CO-mapped assignments per student, check plagiarism across submissions, and grade with AI assistance.</p>
      </div>
    </div>
    <div className="glass-card" style={{ padding: '30px', marginTop: '20px' }}>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
        <h3>Create Assignment</h3>
        <p>Generate unique assignment variations to prevent copying. CO-mapped grading rubrics included.</p>
        <button type="button" className="glass-btn glass-btn--primary" onClick={() => alert('Assignment creation coming soon')}>
          New Assignment
        </button>
      </div>
      <div style={{ marginBottom: '30px' }}>
        <h3>Plagiarism Checker</h3>
        <p>Upload student submissions to check similarity scores across the class and against online sources.</p>
        <button type="button" className="glass-btn glass-btn--ghost" onClick={() => alert('Plagiarism check coming soon')}>
          Check Submissions
        </button>
      </div>
    </div>
  </div>
);

export default AssignmentHub;
