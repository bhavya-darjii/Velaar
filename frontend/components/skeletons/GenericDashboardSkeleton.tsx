/* eslint-disable */
// @ts-nocheck
import './SkeletonLoader.css';

const GenericDashboardSkeleton = () => {
  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '30px auto', padding: '0 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '25px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="skeleton-line" style={{ width: '250px', height: '36px', marginBottom: '8px' }}></div>
          <div className="skeleton-line" style={{ width: '150px', height: '16px' }}></div>
        </div>
        <div className="skeleton-line" style={{ width: '80px', height: '36px', borderRadius: '12px' }}></div>
      </div>

      <div className="skeleton-glass-card skeleton-pulse" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '30px' }}>
        <div className="skeleton-line" style={{ width: '200px', height: '24px', marginBottom: '10px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }}></div>
      </div>
    </div>
  );
};

export default GenericDashboardSkeleton;

