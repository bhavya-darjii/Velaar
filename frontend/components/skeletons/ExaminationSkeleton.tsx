/* eslint-disable */
// @ts-nocheck
/**
 * ExaminationSkeleton — mirrors ExaminationPage layout.
 * One .glass-card (max 1200px) with 3 inner .exam-card items in a grid.
 */
const ExaminationSkeleton = () => (
  <div className="lesson-plan-container" style={{ padding: '20px' }}>
    <div className="skeleton-glass-card" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '40px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div className="skel-line xxl" style={{ width: '50%', margin: '0 auto 12px' }} />
        <div className="skel-line sm" style={{ width: '70%', margin: '0 auto' }} />
      </div>

      {/* 3 exam cards grid */}
      <div className="skeleton-exam-grid">
        {['Term Test 1', 'Term Test 2', 'End Semester Exam'].map((_, i) => (
          <div
            key={i}
            className="skeleton-card"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '200px'
            }}
          >
            {/* Card title */}
            <div className="skel-line lg" style={{ width: '65%' }} />
            {/* Card subtitle */}
            <div className="skel-line sm" style={{ width: '80%' }} />
            <div className="skel-line sm" style={{ width: '55%', marginBottom: '8px' }} />
            
            <div style={{ marginTop: 'auto' }}>
              <div className="skel-btn" style={{ height: '48px', width: '100%', borderRadius: '12px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ExaminationSkeleton;

