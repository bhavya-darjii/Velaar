import './SkeletonLoader.css';

const StudentDashboardSkeleton = () => {
  return (
    <div className="student-container">
      <div className="student-header-section" style={{ alignItems: 'center' }}>
        <div>
          <div className="skeleton-line" style={{ width: '250px', height: '36px', marginBottom: '8px' }}></div>
          <div className="skeleton-line" style={{ width: '150px', height: '16px' }}></div>
        </div>
        <div className="skeleton-line" style={{ width: '80px', height: '36px', borderRadius: '12px' }}></div>
      </div>

      <div className="student-card skeleton-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton-line" style={{ width: '200px', height: '24px', marginBottom: '10px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }}></div>
      </div>
    </div>
  );
};

export default StudentDashboardSkeleton;
