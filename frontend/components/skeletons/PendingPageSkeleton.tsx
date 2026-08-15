/* eslint-disable */
// @ts-nocheck
import './SkeletonLoader.css';

const PendingPageSkeleton = () => {
  return (
    <div className="pending-container" style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
      <div className="skeleton-glass-card skeleton-pulse" style={{ 
        width: '450px', 
        height: '350px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px',
        borderRadius: '24px'
      }}>
        <div className="skeleton-line" style={{ width: '60px', height: '60px', borderRadius: '50%', marginBottom: '24px' }}></div>
        <div className="skeleton-line" style={{ width: '70%', height: '32px', marginBottom: '16px' }}></div>
        <div className="skeleton-line" style={{ width: '90%', height: '16px', marginBottom: '8px' }}></div>
        <div className="skeleton-line" style={{ width: '80%', height: '16px', marginBottom: '24px' }}></div>
        <div className="skeleton-line" style={{ width: '60%', height: '16px', marginBottom: '32px' }}></div>
        <div className="skeleton-line" style={{ width: '100%', height: '48px', borderRadius: '12px' }}></div>
      </div>
    </div>
  );
};

export default PendingPageSkeleton;

