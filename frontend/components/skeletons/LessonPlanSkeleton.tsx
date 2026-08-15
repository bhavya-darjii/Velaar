/* eslint-disable */
// @ts-nocheck
/**
 * LessonPlanSkeleton — mirrors LessonPlanPage layout.
 * One big .lesson-plan-grid card with:
 *   - lp-header (title + subtitle)
 *   - lp-description textarea block
 *   - lp-table-wrapper (table with rows)
 *   - export button at bottom
 */
const LessonPlanSkeleton = () => (
  <div style={{ width: '100%' }}>
    <div
      style={{
        background: 'rgba(10, 10, 15, 0.35)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: 'none',
        borderRadius: '24px',
        padding: '40px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 58%, transparent 75%)',
        backgroundSize: '300% 100%',
        animation: 'skeleton-shimmer 1.8s ease-in-out infinite',
      }} />

      {/* lp-header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="skel-line lg" style={{ width: '45%', margin: '0 auto 8px' }} />
        <div className="skel-line sm" style={{ width: '30%', margin: '0 auto 8px' }} />
        <div className="skel-line sm" style={{ width: '20%', margin: '0 auto' }} />
      </div>

      {/* Course description block */}
      <div style={{ marginBottom: '30px' }}>
        <div className="skel-line lg" style={{ width: '22%', marginBottom: '12px' }} />
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '15px', height: '80px' }} />
      </div>

      {/* Table header row */}
      <div style={{ marginBottom: '20px' }}>
        <div className="skel-line lg" style={{ width: '28%', marginBottom: '15px' }} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px' }}>
          {[8, 18, 30, 16, 14, 14].map((pct, i) => (
            <div key={i} className="skel-line sm" style={{ flex: pct, marginBottom: 0, height: '12px' }} />
          ))}
        </div>
        {/* Table rows */}
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ display: 'flex', gap: '8px', padding: '10px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {[8, 18, 30, 16, 14, 14].map((pct, j) => (
              <div key={j} className="skel-line sm" style={{ flex: pct, marginBottom: 0, height: '11px' }} />
            ))}
          </div>
        ))}
      </div>

      {/* Export button */}
      <div className="skel-btn" style={{ marginTop: '30px' }} />
    </div>
  </div>
);

export default LessonPlanSkeleton;

