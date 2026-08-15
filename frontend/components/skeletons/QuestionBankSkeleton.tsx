/* eslint-disable */
// @ts-nocheck
/**
 * QuestionBankSkeleton — mirrors ExamsPage / ExamSection layout.
 * One .glass-card centered, max-width 900px, with:
 *   - Header (title + subtitle)
 *   - .action-card inside: topic section, pills row, number input, generate button
 */
const QuestionBankSkeleton = () => (
  <div style={{ padding: '20px 0' }}>
    <div className="skeleton-glass-card" style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div className="skel-line xxl" style={{ width: '55%', margin: '0 auto 10px' }} />
        <div className="skel-line sm" style={{ width: '75%', margin: '0 auto' }} />
      </div>

      {/* .action-card */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Card header */}
        <div>
          <div className="skel-line lg" style={{ width: '40%', marginBottom: '8px' }} />
          <div className="skel-line sm" style={{ width: '65%' }} />
        </div>

        {/* BT Level pills row */}
        <div>
          <div className="skel-line sm" style={{ width: '100px', marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[80, 90, 75, 95, 70, 85].map((w, i) => (
              <div key={i} className="skel-pill" style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>

        {/* Number input */}
        <div>
          <div className="skel-line sm" style={{ width: '160px', marginBottom: '10px' }} />
          <div className="skel-line" style={{ width: '80px', height: '40px', borderRadius: '10px' }} />
        </div>

        {/* Generate button */}
        <div className="skel-btn" style={{ marginTop: '4px' }} />
      </div>
    </div>
  </div>
);

export default QuestionBankSkeleton;

