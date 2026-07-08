

const AssignmentSubmission = () => (
  <div className="dashboard-container">
    <div className="dashboard-header">
      <div>
        <h2>Assignment Submission</h2>
        <p>Submit your assignments and view AI similarity scores and CO-mapped grades.</p>
      </div>
    </div>
    <div style={{ marginBottom: '30px' }}>
      <h3>No pending assignments</h3>
      <p style={{ opacity: 0.7 }}>When your teacher publishes assignments, they will appear here.</p>
    </div>
  </div>
);

export default AssignmentSubmission;
