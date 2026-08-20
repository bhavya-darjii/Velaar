/* eslint-disable */
// @ts-nocheck
import './SkeletonLoader.css';

const StudentDashboardSkeleton = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="skel-line xl" style={{ width: '220px', marginBottom: '8px' }}></div>
        <div className="skel-line" style={{ width: '300px' }}></div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[1, 2, 3].map(i => (
          <div key={`stat-${i}`} className="skeleton-card" style={{ padding: '24px', height: '140px' }}>
            <div className="skel-line" style={{ width: '120px' }}></div>
            <div className="skel-line xxl" style={{ width: '80px', marginTop: '20px' }}></div>
            <div className="skel-line sm" style={{ width: '150px', marginTop: '12px' }}></div>
          </div>
        ))}
      </div>

      {/* Section Title */}
      <div className="skel-line lg" style={{ width: '200px', marginBottom: '24px' }}></div>

      {/* Subject Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {[1, 2].map(i => (
          <div key={`course-${i}`} className="skeleton-card" style={{ padding: '24px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <div className="skel-line xl" style={{ width: '280px', marginBottom: '12px' }}></div>
                <div className="skel-pill" style={{ width: '100px', height: '24px' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div className="skel-line xxl" style={{ width: '60px' }}></div>
                <div className="skel-line sm" style={{ width: '80px', marginTop: '8px' }}></div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              {[1, 2, 3, 4].map(j => (
                <div key={`metric-${i}-${j}`}>
                  <div className="skel-line sm" style={{ width: '90px' }}></div>
                  <div className="skel-line lg" style={{ width: '120px', margin: '8px 0' }}></div>
                  <div className="skel-line sm" style={{ width: '140px', marginBottom: '12px' }}></div>
                  <div className="skel-line" style={{ width: '100%', height: '5px' }}></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentDashboardSkeleton;
