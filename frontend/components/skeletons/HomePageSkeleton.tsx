/* eslint-disable */
// @ts-nocheck
import './SkeletonLoader.css';

/**
 * HomePageSkeleton — mirrors the 2-column .teacher-home-grid layout exactly.
 *
 * Heights are calibrated against the real rendered components:
 *
 * LEFT (.active-card — padding 30px, border-radius 24px):
 *   - tag-live row:        ~28px + 10px margin-bottom  â†’ card-header margin-bottom: 20px
 *   - h2 (1.8rem×2 lines): ~75px                      â†’ checklist-area margin-top: 20px
 *   - h3 "INSTRUCTOR…":    ~22px + 5px mb
 *   - p.instruction:       ~14px + 20px mb
 *   - 3 .check-item rows:  52px each + 12px mb
 *   - .finish-btn:         52px + 15px mt
 *
 * RIGHT (.roadmap-mini — padding 20px, border-radius 16px):
 *   - h3 "Upcoming Roadmap": ~20px + default mb
 *   - 5 lecture rows with border separators
 */
const HomePageSkeleton = () => (
  <div className="skeleton-home-grid">

    {/* ---- LEFT: matches .active-card ---- */}
    <div className="skeleton-card">

      {/* .card-header â†’ tag-live row (marginBottom 10px) + h2 (margin 0) + card-header marginBottom 20px */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
        <div className="skel-pill" style={{ width: '155px' }} />
        <div className="skel-pill" style={{ width: '210px' }} />
      </div>

      {/* h2 lecture title — font-size 1.8rem, line-height 1.3, 2 lines */}
      <div className="skel-line xxl" style={{ width: '88%', marginBottom: '8px' }} />
      <div className="skel-line xxl" style={{ width: '60%', marginBottom: '20px' }} />
      {/* â†‘ this 20px covers .card-header margin-bottom */}

      {/* .checklist-area margin-top: 20px */}
      <div style={{ marginTop: '20px' }}>
        {/* h3 "INSTRUCTOR CHECKLIST" — 1.1rem uppercase */}
        <div className="skel-line lg" style={{ width: '175px', marginBottom: '5px' }} />
        {/* p.instruction — 0.9rem */}
        <div className="skel-line" style={{ width: '240px', marginBottom: '20px' }} />

        {/* .checklist-items — 3 .check-item rows (padding:16px, gap:15px, mb:12px) */}
        {[0, 1, 2].map(i => (
          <div key={i} className="skel-row">
            {/* .checkbox-circle: 24px circle */}
            <div className="skel-circle" style={{ width: '24px', height: '24px' }} />
            <div className="skel-line" style={{ flex: 1, marginBottom: 0 }} />
          </div>
        ))}
      </div>

      {/* .finish-btn: 52px tall, margin-top 15px */}
      <div className="skel-btn" style={{ marginTop: '15px' }} />
    </div>

    {/* ---- RIGHT: matches .roadmap-mini (padding 20px, border-radius 16px) ---- */}
    <div className="skeleton-card" style={{ borderRadius: '16px', padding: '20px' }}>

      {/* h3 "Upcoming Roadmap" — ~1rem, color #ffffff */}
      <div className="skel-line" style={{ width: '60%', marginBottom: '20px' }} />

      {/* 5 lecture rows — matches .roadmap-mini li (padding 12px 0, border-bottom) */}
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          paddingTop: '12px', paddingBottom: '12px',
          borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none',
        }}>
          {/* .mini-num badge */}
          <div className="skel-pill" style={{ width: '58px', height: '22px', flexShrink: 0, borderRadius: '4px' }} />
          <div style={{ flex: 1 }}>
            <div className="skel-line sm" style={{ width: '85%', marginBottom: '4px' }} />
            <div className="skel-line sm" style={{ width: '60%', marginBottom: 0 }} />
          </div>
        </div>
      ))}
    </div>

  </div>
);

export default HomePageSkeleton;

