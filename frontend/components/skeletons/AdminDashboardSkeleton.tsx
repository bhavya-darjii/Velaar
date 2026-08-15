/* eslint-disable */
// @ts-nocheck
import './SkeletonLoader.css';
import '../../pages/admin/AdminDashboard.css';

/**
 * AdminDashboardSkeleton
 * Mirrors the exact layout of AdminDashboard.jsx:
 *   1. Header bar          (admin-header shape)
 *   2. Filter strip        (glass-card)
 *   3. 6 KPI cards         (kpi-grid)
 *   4. 2 chart panels      (charts-row)
 *   5. Teacher leaderboard (full-width glass-card)
 *   6. Action breakdown    (charts-row: pie + bar list)
 *   7. Detailed log table  (full-width glass-card)
 */
const AdminDashboardSkeleton = () => (
  <div className="admin-root">
    <div className="admin-inner">

      {/* â”€â”€ 1. Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="admin-header" style={{ gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* badge square */}
          <div className="skel-base skeleton-base" style={{ width: 44, height: 44, borderRadius: 12 }} />
          <div>
            <div className="skel-line xl" style={{ width: 180, marginBottom: 8 }} />
            <div className="skel-line sm" style={{ width: 260, marginBottom: 0 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="skel-pill" style={{ width: 90, height: 36 }} />
          <div className="skel-pill" style={{ width: 80, height: 36 }} />
        </div>
      </div>

      {/* â”€â”€ 2. Filter Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="glass-card filter-strip">
        <div className="filter-group">
          <div className="skel-line sm" style={{ width: 42, marginBottom: 0 }} />
          <div className="skel-pill" style={{ width: 120, height: 34 }} />
        </div>
        <div className="filter-group">
          <div className="skel-line sm" style={{ width: 52, marginBottom: 0 }} />
          <div className="skel-pill" style={{ width: 140, height: 34 }} />
        </div>
      </div>

      {/* â”€â”€ 3. KPI Grid — 6 cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="kpi-grid">
        {[
          '#ea580c', '#6366f1', '#10b981',
          '#f59e0b', '#06b6d4', '#8b5cf6',
        ].map((accent, i) => (
          <div
            key={i}
            className="kpi-card skeleton-card"
            style={{ '--kpi-accent': accent, gap: 13 }}
          >
            {/* icon wrap */}
            <div className="skeleton-base" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="skel-line sm"  style={{ width: '55%', marginBottom: 10 }} />
              <div className="skel-line xl"  style={{ width: '75%', marginBottom: 8 }} />
              <div className="skel-line sm"  style={{ width: '85%', marginBottom: 0 }} />
            </div>
          </div>
        ))}
      </div>

      {/* â”€â”€ 4. Charts Row — 2 bar charts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="charts-row">
        {[0, 1].map(i => (
          <div key={i} className="glass-card chart-container skeleton-card">
            {/* section header */}
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div className="skel-line" style={{ width: 170, marginBottom: 0 }} />
              <div className="skel-line sm" style={{ width: 40, marginBottom: 0 }} />
            </div>
            {/* fake chart bars */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              height: 190,
              paddingBottom: 4,
            }}>
              {[65, 40, 80, 55, 90, 30, 70, 50, 85, 45].map((h, j) => (
                <div
                  key={j}
                  className="skeleton-base"
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    borderRadius: '5px 5px 0 0',
                    animationDelay: `${j * 0.06}s`,
                  }}
                />
              ))}
            </div>
            {/* x-axis labels */}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              {[0, 1, 2, 3, 4].map(j => (
                <div key={j} className="skeleton-base" style={{ flex: 1, height: 9, borderRadius: 4 }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* â”€â”€ 5. Teacher Leaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="glass-card skeleton-card"
        style={{ width: '100%', minWidth: '100%', padding: '30px', boxSizing: 'border-box' }}
      >
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div className="skel-line" style={{ width: 220, marginBottom: 0 }} />
          <div className="skel-line sm" style={{ width: 70, marginBottom: 0 }} />
        </div>
        {/* thead skeleton */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 2fr 1.5fr 80px 80px 80px 90px',
          gap: 12,
          paddingBottom: 12,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 4,
        }}>
          {[24, 90, 120, 60, 60, 60, 70].map((w, j) => (
            <div key={j} className="skel-line sm" style={{ width: w, marginBottom: 0 }} />
          ))}
        </div>
        {/* 5 table rows */}
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 2fr 1.5fr 80px 80px 80px 90px',
              gap: 12,
              alignItems: 'center',
              padding: '13px 0',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            {/* rank badge */}
            <div className="skeleton-base" style={{ width: 28, height: 28, borderRadius: 7 }} />
            {/* teacher cell */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="skel-circle" style={{ width: 34, height: 34 }} />
              <div style={{ flex: 1 }}>
                <div className="skel-line" style={{ width: '70%', marginBottom: 5 }} />
                <div className="skel-line sm" style={{ width: '55%', marginBottom: 0 }} />
              </div>
            </div>
            {/* subject */}
            <div className="skel-line sm" style={{ width: '70%', marginBottom: 0 }} />
            {/* calls, tokens in, tokens out, cost */}
            {[0, 1, 2, 3].map(j => (
              <div key={j} className="skel-pill" style={{ width: '80%', height: 24 }} />
            ))}
          </div>
        ))}
      </div>

      {/* â”€â”€ 6. Action Breakdown — pie + bar list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="charts-row">
        {/* Donut / pie */}
        <div className="glass-card skeleton-card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="skel-line" style={{ width: 130, marginBottom: 0 }} />
            <div className="skel-line sm" style={{ width: 44, marginBottom: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            {/* donut placeholder */}
            <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
              <div className="skeleton-base" style={{ width: 180, height: 180, borderRadius: '50%' }} />
              {/* inner hole */}
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 104, height: 104,
                borderRadius: '50%',
                background: 'var(--liquid-glass-bg, rgba(10, 10, 15, 0.35))',
              }} />
            </div>
            {/* legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[80, 65, 55, 45, 35].map((w, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="skeleton-base" style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0 }} />
                  <div className="skel-line sm" style={{ flex: 1, maxWidth: w, marginBottom: 0 }} />
                  <div className="skel-line sm" style={{ width: 28, marginBottom: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action bar list */}
        <div className="glass-card skeleton-card">
          <div className="section-header" style={{ marginBottom: 16 }}>
            <div className="skel-line" style={{ width: 190, marginBottom: 0 }} />
            <div className="skel-line sm" style={{ width: 50, marginBottom: 0 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[100, 78, 60, 45, 35, 22].map((pct, j) => (
              <div
                key={j}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,180px) 1fr 68px 58px',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div className="skel-line sm" style={{ width: '80%', marginBottom: 0 }} />
                {/* bar track */}
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div className="skeleton-base" style={{ width: `${pct}%`, height: '100%', borderRadius: 3 }} />
                </div>
                <div className="skel-line sm" style={{ width: '70%', marginBottom: 0 }} />
                <div className="skel-line sm" style={{ width: '80%', marginBottom: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* â”€â”€ 7. Detailed Log Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="glass-card skeleton-card"
        style={{ width: '100%', minWidth: '100%', padding: '30px', boxSizing: 'border-box' }}
      >
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div className="skel-line" style={{ width: 200, marginBottom: 0 }} />
          <div className="skel-line sm" style={{ width: 70, marginBottom: 0 }} />
        </div>
        {/* log controls */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="skel-pill" style={{ flex: 1, minWidth: 180, height: 36 }} />
          <div className="skel-pill" style={{ width: 130, height: 36 }} />
          <div className="skel-pill" style={{ width: 130, height: 36 }} />
        </div>
        {/* thead */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 2fr 1fr 1.2fr 70px 70px 80px',
          gap: 12,
          paddingBottom: 10,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: 4,
        }}>
          {[80, 80, 70, 80, 55, 60, 55].map((w, j) => (
            <div key={j} className="skel-line sm" style={{ width: w, marginBottom: 0 }} />
          ))}
        </div>
        {/* 8 log rows */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 2fr 1fr 1.2fr 70px 70px 80px',
              gap: 12,
              alignItems: 'center',
              padding: '13px 0',
              borderBottom: i < 7 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            {/* timestamp */}
            <div className="skel-line sm" style={{ width: '90%', marginBottom: 0 }} />
            {/* teacher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="skel-circle" style={{ width: 28, height: 28 }} />
              <div style={{ flex: 1 }}>
                <div className="skel-line sm" style={{ width: '65%', marginBottom: 4 }} />
                <div className="skel-line sm" style={{ width: '80%', marginBottom: 0 }} />
              </div>
            </div>
            {/* subject */}
            <div className="skel-line sm" style={{ width: '75%', marginBottom: 0 }} />
            {/* action tag */}
            <div className="skel-pill" style={{ width: '80%', height: 24 }} />
            {/* tokens in, out */}
            <div className="skel-pill" style={{ width: '80%', height: 22 }} />
            <div className="skel-pill" style={{ width: '80%', height: 22 }} />
            {/* cost */}
            <div className="skel-pill" style={{ width: '85%', height: 24 }} />
          </div>
        ))}
      </div>

    </div>
  </div>
);

export default AdminDashboardSkeleton;

