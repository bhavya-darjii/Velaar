import React, { useState, useRef, useEffect, createContext, useContext } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   APPLE SF-STYLE BUILT-IN VECTOR ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

export const CheckIcon: React.FC<{ size?: number; className?: string }> = ({ size = 13, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="3.5 8.5 6.5 12 12.5 4.5" />
  </svg>
);

export const SquareIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2.5" y="2.5" width="13" height="13" rx="2.5" />
  </svg>
);

export const WallpaperIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4" y="1.5" width="10" height="15" rx="2.5" />
    <line x1="7.5" y1="13.5" x2="10.5" y2="13.5" />
  </svg>
);

export const PortraitIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="4.5" y="2" width="9" height="14" rx="2" />
  </svg>
);

export const LandscapeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="4.5" width="14" height="9" rx="2" />
  </svg>
);

export const ChevronRightIcon: React.FC<{ size?: number; className?: string }> = ({ size = 14, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 3.5 10.5 8 6 12.5" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & CONTEXT
   ═══════════════════════════════════════════════════════════════════════════ */

export interface IOSDropdownItemOption {
  id: string;
  label: string;
  icon?: 'square' | 'wallpaper' | 'portrait' | 'landscape' | React.ReactNode;
  checked?: boolean;
  active?: boolean;
  variant?: 'default' | 'blue-pill' | 'subtle';
  disabled?: boolean;
  hasSubmenu?: boolean;
  submenu?: {
    header?: string;
    items: IOSDropdownItemOption[];
  };
  onClick?: () => void;
}

interface DropdownContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  closeMenu: () => void;
}

const DropdownContext = createContext<DropdownContextType>({
  isOpen: false,
  setIsOpen: () => {},
  closeMenu: () => {},
});

export const useIOSDropdown = () => useContext(DropdownContext);

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER ICON RESOLVER
   ═══════════════════════════════════════════════════════════════════════════ */

function renderIcon(icon?: 'square' | 'wallpaper' | 'portrait' | 'landscape' | React.ReactNode) {
  if (!icon) return null;
  if (typeof icon === 'string') {
    switch (icon) {
      case 'square':
        return <SquareIcon />;
      case 'wallpaper':
        return <WallpaperIcon />;
      case 'portrait':
        return <PortraitIcon />;
      case 'landscape':
        return <LandscapeIcon />;
      default:
        return null;
    }
  }
  return icon;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN IOS DROPDOWN COMPONENT (Supports both config & compound children)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface IOSDropdownProps {
  trigger?: React.ReactNode;
  header?: string;
  items?: IOSDropdownItemOption[];
  value?: string;
  onChange?: (id: string, item: IOSDropdownItemOption) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  align?: 'left' | 'right';
  variant?: 'light' | 'dark' | 'auto';
  className?: string;
  menuClassName?: string;
  closeOnSelect?: boolean;
  children?: React.ReactNode;
}

export const IOSDropdown: React.FC<IOSDropdownProps> & {
  Trigger: typeof IOSDropdownTrigger;
  Menu: typeof IOSDropdownMenu;
  Header: typeof IOSDropdownHeader;
  Item: typeof IOSDropdownItem;
  Divider: typeof IOSDropdownDivider;
  Submenu: typeof IOSDropdownSubmenu;
  Badge: typeof IOSDropdownBadge;
} = ({
  trigger,
  header,
  items,
  value,
  onChange,
  isOpen: controlledIsOpen,
  onOpenChange,
  defaultOpen = false,
  align = 'left',
  variant = 'light',
  className = '',
  menuClassName = '',
  closeOnSelect = true,
  children,
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;

  const setIsOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledIsOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setActiveSubmenuId(null);
    }
  };

  const closeMenu = () => setIsOpen(false);

  // Click outside & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const variantClass = variant === 'light' ? 'ios-glass-light' : variant === 'dark' ? 'dark' : '';

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, closeMenu }}>
      <div
        ref={containerRef}
        className={`ios-dropdown-container ${variantClass} ${className}`}
      >
        {/* Render Trigger */}
        {trigger ? (
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="ios-dropdown-trigger-wrapper"
            role="button"
            tabIndex={0}
            aria-haspopup="true"
            aria-expanded={isOpen}
          >
            {trigger}
          </div>
        ) : null}

        {/* Declarative Children Mode */}
        {children}

        {/* Config Items Mode */}
        {isOpen && items && (
          <div
            className={`ios-dropdown-menu ${align === 'right' ? 'align-right' : ''} ${menuClassName}`}
            role="menu"
          >
            {header && <div className="ios-dropdown-header">{header}</div>}

            {items.map((item) => {
              const isChecked = item.checked ?? (value !== undefined ? item.id === value : false);
              const isSubmenuOpen = activeSubmenuId === item.id;
              const hasSub = Boolean(item.hasSubmenu || item.submenu);

              return (
                <div
                  key={item.id}
                  className="ios-dropdown-submenu-wrapper"
                  onMouseEnter={() => hasSub && setActiveSubmenuId(item.id)}
                  onMouseLeave={() => hasSub && setActiveSubmenuId(null)}
                >
                  <button
                    type="button"
                    className={`ios-dropdown-item ${isChecked ? 'is-selected' : ''} ${
                      isSubmenuOpen ? 'submenu-active' : ''
                    } ${item.variant === 'blue-pill' ? 'is-pill-blue' : ''}`}
                    disabled={item.disabled}
                    onClick={() => {
                      if (hasSub) {
                        setActiveSubmenuId(isSubmenuOpen ? null : item.id);
                      } else {
                        item.onClick?.();
                        onChange?.(item.id, item);
                        if (closeOnSelect) closeMenu();
                      }
                    }}
                  >
                    {/* Checkmark Slot */}
                    <span className="ios-dropdown-check-slot">
                      {isChecked && <CheckIcon />}
                    </span>

                    {/* Icon Slot */}
                    {item.icon && (
                      <span className="ios-dropdown-icon">
                        {renderIcon(item.icon)}
                      </span>
                    )}

                    {/* Label */}
                    <span className="ios-dropdown-label">{item.label}</span>

                    {/* Submenu Chevron */}
                    {hasSub && (
                      <span className="ios-dropdown-chevron">
                        <ChevronRightIcon />
                      </span>
                    )}
                  </button>

                  {/* Nested Submenu Card */}
                  {hasSub && isSubmenuOpen && item.submenu && (
                    <div
                      className="ios-dropdown-submenu align-bottom"
                      role="menu"
                    >
                      {item.submenu.header && (
                        <div className="ios-dropdown-header text-center">
                          {item.submenu.header}
                        </div>
                      )}
                      {item.submenu.items.map((subItem) => {
                        const isSubChecked = subItem.checked;
                        const isBluePill = subItem.variant === 'blue-pill' || isSubChecked;

                        return (
                          <button
                            key={subItem.id}
                            type="button"
                            className={`ios-dropdown-item ${
                              isBluePill ? 'is-pill-blue' : ''
                            } ${isSubChecked ? 'is-selected' : ''}`}
                            onClick={() => {
                              subItem.onClick?.();
                              onChange?.(subItem.id, subItem);
                              if (closeOnSelect) closeMenu();
                            }}
                          >
                            <span className="ios-dropdown-check-slot">
                              {isSubChecked && <CheckIcon />}
                            </span>
                            <span className="ios-dropdown-label">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOUND HELPER SUBCOMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

export const IOSDropdownTrigger: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const { isOpen, setIsOpen } = useIOSDropdown();
  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className={`ios-dropdown-trigger ${className}`}
      role="button"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={isOpen}
    >
      {children}
    </div>
  );
};

export const IOSDropdownBadge: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  const { isOpen, setIsOpen } = useIOSDropdown();
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.();
        setIsOpen(!isOpen);
        e.stopPropagation();
      }}
      className={`ios-dropdown-badge ${className}`}
      aria-label="Toggle menu"
    >
      {children}
    </button>
  );
};

export const IOSDropdownMenu: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  isStatic?: boolean;
}> = ({ children, align = 'left', className = '', isStatic = false }) => {
  const { isOpen } = useIOSDropdown();
  if (!isOpen && !isStatic) return null;

  return (
    <div
      className={`ios-dropdown-menu ${align === 'right' ? 'align-right' : ''} ${
        isStatic ? 'is-static' : ''
      } ${className}`}
      role="menu"
    >
      {children}
    </div>
  );
};

export const IOSDropdownHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}> = ({ children, className = '', center = false }) => (
  <div className={`ios-dropdown-header ${center ? 'text-center' : ''} ${className}`}>
    {children}
  </div>
);

export const IOSDropdownItem: React.FC<{
  children: React.ReactNode;
  icon?: 'square' | 'wallpaper' | 'portrait' | 'landscape' | React.ReactNode;
  checked?: boolean;
  variant?: 'default' | 'blue-pill' | 'subtle';
  hasSubmenu?: boolean;
  submenuActive?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({
  children,
  icon,
  checked = false,
  variant = 'default',
  hasSubmenu = false,
  submenuActive = false,
  disabled = false,
  className = '',
  onClick,
}) => {
  const isBlue = variant === 'blue-pill';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`ios-dropdown-item ${checked ? 'is-selected' : ''} ${
        submenuActive ? 'submenu-active' : ''
      } ${isBlue ? 'is-pill-blue' : ''} ${className}`}
    >
      <span className="ios-dropdown-check-slot">
        {checked && <CheckIcon />}
      </span>
      {icon && <span className="ios-dropdown-icon">{renderIcon(icon)}</span>}
      <span className="ios-dropdown-label">{children}</span>
      {hasSubmenu && (
        <span className="ios-dropdown-chevron">
          <ChevronRightIcon />
        </span>
      )}
    </button>
  );
};

export const IOSDropdownDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`ios-dropdown-divider ${className}`} role="separator" />
);

export const IOSDropdownSubmenu: React.FC<{
  children: React.ReactNode;
  alignBottom?: boolean;
  flipLeft?: boolean;
  className?: string;
}> = ({ children, alignBottom = true, flipLeft = false, className = '' }) => (
  <div
    className={`ios-dropdown-submenu ${alignBottom ? 'align-bottom' : ''} ${
      flipLeft ? 'flip-left' : ''
    } ${className}`}
    role="menu"
  >
    {children}
  </div>
);

// Assign Compound Components
IOSDropdown.Trigger = IOSDropdownTrigger;
IOSDropdown.Menu = IOSDropdownMenu;
IOSDropdown.Header = IOSDropdownHeader;
IOSDropdown.Item = IOSDropdownItem;
IOSDropdown.Divider = IOSDropdownDivider;
IOSDropdown.Submenu = IOSDropdownSubmenu;
IOSDropdown.Badge = IOSDropdownBadge;

/* ═══════════════════════════════════════════════════════════════════════════
   DROP-IN CAMERA DROPDOWN DEMO (Exact replication of user screenshot)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface IOSCameraDropdownProps {
  initialRatio?: 'Square' | 'Wallpaper' | 'Portrait' | 'Landscape';
  initialResolution?: '12MP' | '24MP' | '48MP';
  onRatioChange?: (ratio: string) => void;
  onResolutionChange?: (res: string) => void;
  className?: string;
  defaultOpen?: boolean;
}

export const IOSCameraDropdown: React.FC<IOSCameraDropdownProps> = ({
  initialRatio = 'Square',
  initialResolution = '12MP',
  onRatioChange,
  onResolutionChange,
  className = '',
  defaultOpen = true,
}) => {
  const [selectedRatio, setSelectedRatio] = useState(initialRatio);
  const [selectedResolution, setSelectedResolution] = useState(initialResolution);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(true);

  return (
    <IOSDropdown
      defaultOpen={defaultOpen}
      variant="light"
      className={className}
      trigger={
        <button
          type="button"
          className="ios-dropdown-badge"
          aria-label="Resolution and aspect ratio settings"
        >
          {selectedResolution}
        </button>
      }
    >
      <IOSDropdown.Menu className="ios-camera-menu">
        <IOSDropdown.Header>Aspect Ratio</IOSDropdown.Header>

        <IOSDropdown.Item
          icon="square"
          checked={selectedRatio === 'Square'}
          onClick={() => {
            setSelectedRatio('Square');
            onRatioChange?.('Square');
          }}
        >
          Square
        </IOSDropdown.Item>

        <IOSDropdown.Item
          icon="wallpaper"
          checked={selectedRatio === 'Wallpaper'}
          onClick={() => {
            setSelectedRatio('Wallpaper');
            onRatioChange?.('Wallpaper');
          }}
        >
          Wallpaper
        </IOSDropdown.Item>

        <IOSDropdown.Item
          icon="portrait"
          checked={selectedRatio === 'Portrait'}
          onClick={() => {
            setSelectedRatio('Portrait');
            onRatioChange?.('Portrait');
          }}
        >
          Portrait
        </IOSDropdown.Item>

        <IOSDropdown.Item
          icon="landscape"
          checked={selectedRatio === 'Landscape'}
          onClick={() => {
            setSelectedRatio('Landscape');
            onRatioChange?.('Landscape');
          }}
        >
          Landscape
        </IOSDropdown.Item>

        <IOSDropdown.Divider />

        {/* Resolution row with Submenu */}
        <div
          className="ios-dropdown-submenu-wrapper"
          onMouseEnter={() => setIsSubmenuOpen(true)}
        >
          <IOSDropdown.Item
            hasSubmenu
            submenuActive={isSubmenuOpen}
            onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
          >
            Resolution
          </IOSDropdown.Item>

          {isSubmenuOpen && (
            <IOSDropdown.Submenu alignBottom>
              <IOSDropdown.Header center>Standard</IOSDropdown.Header>
              {(['12MP', '24MP', '48MP'] as const).map((res) => {
                const isSelected = selectedResolution === res;
                return (
                  <IOSDropdown.Item
                    key={res}
                    variant={isSelected ? 'blue-pill' : 'default'}
                    checked={isSelected}
                    onClick={() => {
                      setSelectedResolution(res);
                      onResolutionChange?.(res);
                    }}
                  >
                    {res}
                  </IOSDropdown.Item>
                );
              })}
            </IOSDropdown.Submenu>
          )}
        </div>
      </IOSDropdown.Menu>
    </IOSDropdown>
  );
};

export default IOSDropdown;
