/* eslint-disable */
// @ts-nocheck
import './SegmentedToggle.css';

const SegmentedToggle = ({ options = [], value, onChange, className = '' }) => (
  <div className={`segment-toggle ${className}`} role="tablist">
    {options.map((opt) => {
      const key = typeof opt === 'string' ? opt : opt.value;
      const label = typeof opt === 'string' ? opt : opt.label;
      const isActive = value === key;
      return (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={`segment-toggle__item ${isActive ? 'segment-toggle__item--active' : ''}`}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      );
    })}
  </div>
);

export default SegmentedToggle;

