/**
 * ExaminationSkeleton — mirrors ExaminationPage layout.
 * One .glass-card (max 1200px) with 3 inner .exam-card items in a grid.
 */
const ExaminationSkeleton = () => (
  <div style={{ minHeight: 'auto', padding: '40px 0' }}>
    <div className="skeleton-glass-card">
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
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Card title */}
            <div className="skel-line lg" style={{ width: '65%' }} />
            {/* Card subtitle */}
            <div className="skel-line sm" style={{ width: '80%' }} />
            <div className="skel-line sm" style={{ width: '55%', marginBottom: '8px' }} />
            {/* Generate button */}
            <div className="skel-btn" style={{ marginTop: '4px', height: '48px' }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ExaminationSkeleton;
