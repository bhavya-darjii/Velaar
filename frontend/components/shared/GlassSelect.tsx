/* eslint-disable */
// @ts-nocheck
import React, { useState, useRef, useEffect, useId } from 'react';

export interface GlassSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

export interface GlassSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options?: Array<GlassSelectOption | string>;
  placeholder?: string;
  disabled?: boolean;
  direction?: 'up' | 'down' | 'auto';
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  itemClassName?: string;
  style?: React.CSSProperties;
  id?: string;
  name?: string;
  title?: string;
  children?: React.ReactNode;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  direction = 'up',
  className = '',
  triggerClassName = '',
  menuClassName = '',
  itemClassName = '',
  style,
  id,
  name,
  title,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const selectId = id || autoId;

  // Normalize options from props or children (<option />)
  const parsedOptions: GlassSelectOption[] = React.useMemo(() => {
    if (options && options.length > 0) {
      return options.map((opt) => {
        if (typeof opt === 'string') {
          return { value: opt, label: opt, title: opt };
        }
        return {
          value: String(opt.value),
          label: String(opt.label ?? opt.value),
          disabled: Boolean(opt.disabled),
          title: opt.title || String(opt.label ?? opt.value),
        };
      });
    }

    if (children) {
      const childOptions: GlassSelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === 'option') {
          const val = child.props.value !== undefined ? String(child.props.value) : String(child.props.children || '');
          const label = String(child.props.children || val);
          childOptions.push({
            value: val,
            label: label,
            disabled: Boolean(child.props.disabled),
            title: child.props.title || label,
          });
        }
      });
      return childOptions;
    }

    return [];
  }, [options, children]);

  // Click outside listener to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find selected label
  const selectedOption = parsedOptions.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : (value || placeholder);
  const tooltipText = title || selectedOption?.title || displayLabel;

  const isUpward = direction === 'up';

  const handleSelect = (val: string, isDisabled?: boolean) => {
    if (isDisabled || disabled) return;
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`glass-dropdown ${isUpward ? 'glass-dropdown--up ' : ''}${isOpen ? 'is-open ' : ''}${className}`}
      style={style}
    >
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        className={`glass-dropdown__trigger ${triggerClassName}`}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={tooltipText}
      >
        <span className="glass-dropdown__trigger-label" title={tooltipText}>
          {displayLabel}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Hidden input for form support */}
      {name && <input type="hidden" name={name} value={value} />}

      <div className={`glass-dropdown__menu ${menuClassName}`} role="listbox" tabIndex={-1}>
        {parsedOptions.length > 0 ? (
          parsedOptions.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={`${opt.value}-${idx}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                className={`glass-dropdown__item ${isSelected ? 'glass-dropdown__item--selected ' : ''}${
                  opt.disabled ? 'is-disabled ' : ''
                }${itemClassName}`}
                onClick={() => handleSelect(opt.value, opt.disabled)}
                title={opt.title || opt.label}
              >
                {opt.label}
              </button>
            );
          })
        ) : (
          <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            No options available
          </div>
        )}
      </div>
    </div>
  );
};

export default GlassSelect;
