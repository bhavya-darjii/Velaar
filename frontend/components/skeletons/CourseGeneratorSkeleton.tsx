/* eslint-disable */
// @ts-nocheck
/**
 * CourseGeneratorSkeleton — mirrors CourseGenerator .glass-card form layout.
 * One centered card (max 900px) with form sections stacked vertically.
 */
const CourseGeneratorSkeleton = () => (
  <div style={{ padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', boxSizing: 'border-box', width: '100%' }}>
    <div
      style={{
        width: '100%',
        maxWidth: '900px',
        background: 'rgba(10, 10, 15, 0.35)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: 'none',
        borderRadius: '24px',
        padding: '20px 40px 40px 40px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Shimmer */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 58%, transparent 75%)',
        backgroundSize: '300% 100%',
        animation: 'skeleton-shimmer 1.8s ease-in-out infinite',
      }} />

      {/* Title */}
      <div className="skel-line xl" style={{ width: '50%', margin: '20px auto 30px' }} />

      {/* Form section 1 — Course Info */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '25px', marginBottom: '24px' }}>
        <div className="skel-line sm" style={{ width: '140px', marginBottom: '10px' }} />
        <div className="skel-line" style={{ height: '44px', borderRadius: '10px', marginBottom: '20px' }} />
        {/* Two-column row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div className="skel-line sm" style={{ width: '100px', marginBottom: '10px' }} />
            <div className="skel-line" style={{ height: '44px', borderRadius: '10px', marginBottom: 0 }} />
          </div>
          <div>
            <div className="skel-line sm" style={{ width: '120px', marginBottom: '10px' }} />
            <div className="skel-line" style={{ height: '44px', borderRadius: '10px', marginBottom: 0 }} />
          </div>
        </div>
      </div>

      {/* Form section 2 — Divisions */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '25px', marginBottom: '24px' }}>
        <div className="skel-line sm" style={{ width: '180px', marginBottom: '14px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skel-pill" style={{ flex: 1 }} />
          ))}
        </div>
      </div>

      {/* Form section 3 — Schedule */}
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '25px', marginBottom: '24px' }}>
        <div className="skel-line sm" style={{ width: '140px', marginBottom: '14px' }} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="skel-pill" style={{ width: '52px' }} />
          ))}
        </div>
        <div className="skel-line" style={{ height: '44px', borderRadius: '10px' }} />
      </div>

      {/* Generate Roadmap button */}
      <div className="skel-btn" />
    </div>
  </div>
);

export default CourseGeneratorSkeleton;

