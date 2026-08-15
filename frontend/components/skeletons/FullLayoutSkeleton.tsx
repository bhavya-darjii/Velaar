/* eslint-disable */
// @ts-nocheck
import HomePageSkeleton from './HomePageSkeleton';
import QuestionBankSkeleton from './QuestionBankSkeleton';
import ExaminationSkeleton from './ExaminationSkeleton';
import LessonPlanSkeleton from './LessonPlanSkeleton';
import CourseGeneratorSkeleton from './CourseGeneratorSkeleton';
import '../../layouts/UnifiedLayout.css';
import './SkeletonLoader.css';

/**
 * FullLayoutSkeleton
 * Renders the exact same DOM structure as TeacherLayout (same CSS classes/padding)
 * so the transition to the real layout is completely imperceptible.
 * Picks the right page skeleton based on the current URL path.
 */
const getPageSkeleton = () => {
  const path = window.location.pathname;
  if (path.includes('/questionbank'))  return <QuestionBankSkeleton />;
  if (path.includes('/examination'))   return <ExaminationSkeleton />;
  if (path.includes('/lesson-plan'))   return <LessonPlanSkeleton />;
  if (path.includes('/create-course')) return <CourseGeneratorSkeleton />;
  return <HomePageSkeleton />;
};

const FullLayoutSkeleton = () => (
  <div className="teacher-layout">
    <div className="main-content">

      {/* Exact same header structure as TeacherLayout's real header */}
      <header className="dash-header">
        {/* LEFT: hamburger + title + subtitle */}
        <div className="header-left">
          <div
            className="skeleton-base"
            style={{ width: '44px', height: '44px', borderRadius: '12px', marginRight: '35px', flexShrink: 0 }}
          />
          <div>
            <div className="skeleton-base" style={{ height: '32px', width: '280px', borderRadius: '8px', marginBottom: '8px' }} />
            <div className="skeleton-base" style={{ height: '19px', width: '200px', borderRadius: '6px' }} />
          </div>
        </div>

        {/* RIGHT: progress badge placeholder — prevents justify-content:space-between shift */}
        <div className="header-actions">
          <div className="skeleton-base" style={{ height: '34px', width: '140px', borderRadius: '20px' }} />
        </div>
      </header>

      {/* Page-specific content skeleton in the outlet slot */}
      <div className="outlet-container">
        {getPageSkeleton()}
      </div>
    </div>
  </div>
);

export default FullLayoutSkeleton;

