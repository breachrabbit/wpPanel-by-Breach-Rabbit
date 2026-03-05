'use client';

// =============================================================================
// wpPanel by Breach Rabbit — ProgressBar Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, sizes, animations, labels, indeterminate state
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type ProgressBarSize = 'sm' | 'md' | 'lg';
export type ProgressBarAnimation = 'none' | 'pulse' | 'shimmer';

export interface ProgressBarProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Progress value (0-100) */
  value?: number;
  
  /** Progress bar variant (visual style) */
  variant?: ProgressBarVariant;
  
  /** Progress bar size */
  size?: ProgressBarSize;
  
  /** Show percentage label */
  showLabel?: boolean;
  
  /** Label position */
  labelPosition?: 'inside' | 'outside' | 'right';
  
  /** Custom label text (overrides percentage) */
  label?: string;
  
  /** Show striped pattern */
  striped?: boolean;
  
  /** Animate striped pattern */
  animated?: boolean;
  
  /** Animation type */
  animation?: ProgressBarAnimation;
  
  /** Indeterminate state (for unknown progress) */
  indeterminate?: boolean;
  
  /** Minimum width for small values */
  minDisplayWidth?: string;
  
  /** Show background track */
  showTrack?: boolean;
  
  /** Border radius override */
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (bar height + label font sizes)
 */
const sizeStyles: Record<ProgressBarSize, {
  bar: string;
  label: string;
  striped: string;
}> = {
  sm: {
    bar: 'h-1.5',
    label: 'text-xs',
    striped: 'bg-[length:0.5rem_0.5rem]',
  },
  md: {
    bar: 'h-2.5',
    label: 'text-xs',
    striped: 'bg-[length:0.75rem_0.75rem]',
  },
  lg: {
    bar: 'h-4',
    label: 'text-sm',
    striped: 'bg-[length:1rem_1rem]',
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<ProgressBarVariant, {
  bar: string;
  track: string;
  glow: string;
}> = {
  default: {
    bar: 'bg-accent',
    track: 'bg-bg-overlay',
    glow: 'shadow-glow-accent',
  },
  success: {
    bar: 'bg-success',
    track: 'bg-bg-overlay',
    glow: 'shadow-glow-success',
  },
  warning: {
    bar: 'bg-warning',
    track: 'bg-bg-overlay',
    glow: '',
  },
  error: {
    bar: 'bg-error',
    track: 'bg-bg-overlay',
    glow: 'shadow-glow-error',
  },
  info: {
    bar: 'bg-info',
    track: 'bg-bg-overlay',
    glow: '',
  },
};

/**
 * Border radius configurations
 */
const radiusStyles: Record<'sm' | 'md' | 'lg' | 'full', string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Label position configurations
 */
const labelPositionStyles: Record<'inside' | 'outside' | 'right', string> = {
  inside: 'absolute inset-0 flex items-center justify-center',
  outside: 'mt-2 text-center',
  right: 'ml-3 whitespace-nowrap',
};

// =============================================================================
// 🏗️ PROGRESS BAR COMPONENT
// =============================================================================

/**
 * ProgressBar Component — wpPanel by Breach Rabbit UI
 * 
 * Displays progress with customizable variants, sizes, and animations.
 * Supports determinate and indeterminate states.
 * 
 * @example
 * <ProgressBar value={75} />
 * <ProgressBar value={50} variant="success" showLabel />
 * <ProgressBar indeterminate variant="info" />
 */
export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value = 0,
      variant = 'default',
      size = 'md',
      showLabel = false,
      labelPosition = 'inside',
      label,
      striped = false,
      animated = false,
      animation = 'none',
      indeterminate = false,
      minDisplayWidth = '1rem',
      showTrack = true,
      rounded = 'full',
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variants = variantStyles[variant];
    const radius = radiusStyles[rounded];
    
    // Clamp value between 0 and 100
    const clampedValue = Math.min(100, Math.max(0, value));
    
    // Display label text
    const displayLabel = label ?? `${Math.round(clampedValue)}%`;
    
    // Determine if we should show the bar
    const showBar = indeterminate || clampedValue > 0;

    return (
      <div
        className={cn('w-full', labelPosition === 'outside' && 'flex flex-col', className)}
        {...props}
      >
        {/* Progress Track */}
        {showTrack && (
          <div
            ref={ref}
            className={cn(
              // Base styles
              'relative',
              'w-full',
              'overflow-hidden',
              sizes.bar,
              variants.track,
              radius
            )}
            role="progressbar"
            aria-valuenow={indeterminate ? undefined : clampedValue}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={props['aria-label'] || 'Progress'}
          >
            {/* Progress Bar */}
            {showBar && (
              <div
                className={cn(
                  // Base styles
                  'absolute',
                  'top-0 left-0',
                  'h-full',
                  variants.bar,
                  radius,
                  
                  // Width (indeterminate or fixed)
                  indeterminate
                    ? 'w-1/3 animate-indeterminate'
                    : 'transition-all duration-300 ease-out',
                  !indeterminate && 'min-w-[1rem]',
                  
                  // Striped pattern
                  striped && `bg-gradient-to-r from-transparent via-white/20 to-transparent`,
                  striped && sizes.striped,
                  
                  // Animated stripes
                  striped && animated && 'animate-stripes',
                  
                  // Pulse animation
                  animation === 'pulse' && 'animate-pulse',
                  
                  // Shimmer animation
                  animation === 'shimmer' && 'animate-shimmer',
                  
                  // Glow effect (for certain variants)
                  variants.glow
                )}
                style={!indeterminate ? { width: `${clampedValue}%` } : undefined}
              >
                {/* Inside Label */}
                {showLabel && labelPosition === 'inside' && (
                  <span
                    className={cn(
                      'font-medium',
                      'text-text-inverse',
                      'drop-shadow-sm',
                      sizes.label,
                      labelPositionStyles.inside
                    )}
                  >
                    {displayLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Outside/Right Label */}
        {showLabel && labelPosition !== 'inside' && (
          <span
            className={cn(
              'font-medium',
              'text-text-secondary',
              sizes.label,
              labelPositionStyles[labelPosition]
            )}
          >
            {displayLabel}
          </span>
        )}
      </div>
    );
  }
);

// Set display name for debugging
ProgressBar.displayName = 'ProgressBar';

// =============================================================================
// 📦 MULTI-PROGRESS BAR COMPONENT
// =============================================================================

/**
 * MultiProgressBar — Stack multiple progress bars (for storage breakdown, etc.)
 */
export interface MultiProgressBarItem {
  /** Segment value (0-100, will be normalized) */
  value: number;
  
  /** Segment color variant */
  variant: ProgressBarVariant;
  
  /** Segment label (for tooltip/legend) */
  label?: string;
}

export interface MultiProgressBarProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Progress segments */
  items: MultiProgressBarItem[];
  
  /** Progress bar size */
  size?: ProgressBarSize;
  
  /** Show total percentage */
  showTotal?: boolean;
  
  /** Show legend */
  showLegend?: boolean;
  
  /** Border radius */
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export const MultiProgressBar = React.forwardRef<HTMLDivElement, MultiProgressBarProps>(
  (
    {
      className,
      items,
      size = 'md',
      showTotal = false,
      showLegend = false,
      rounded = 'full',
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const radius = radiusStyles[rounded];
    
    // Calculate total value
    const totalValue = items.reduce((sum, item) => sum + item.value, 0);
    const clampedTotal = Math.min(100, totalValue);
    
    // Calculate cumulative offsets for stacking
    let cumulativeOffset = 0;

    return (
      <div className={cn('w-full', className)} {...props}>
        {/* Multi Progress Track */}
        <div
          ref={ref}
          className={cn(
            'relative',
            'w-full',
            'overflow-hidden',
            sizes.bar,
            'bg-bg-overlay',
            radius
          )}
          role="progressbar"
          aria-valuenow={clampedTotal}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Progress Segments */}
          {items.map((item, index) => {
            const normalizedWidth = (item.value / 100) * clampedTotal;
            const leftOffset = cumulativeOffset;
            cumulativeOffset += normalizedWidth;
            
            const variant = variantStyles[item.variant];
            
            return (
              <div
                key={index}
                className={cn(
                  'absolute',
                  'top-0',
                  'h-full',
                  variant.bar,
                  'transition-all duration-300 ease-out',
                  index === 0 && cn('rounded-l', rounded === 'full' ? 'rounded-l-full' : `rounded-l-${rounded}`),
                  index === items.length - 1 && cn('rounded-r', rounded === 'full' ? 'rounded-r-full' : `rounded-r-${rounded}`)
                )}
                style={{
                  left: `${leftOffset}%`,
                  width: `${normalizedWidth}%`,
                }}
                title={item.label}
              />
            );
          })}
        </div>

        {/* Total Label */}
        {showTotal && (
          <div className={cn('mt-2 text-center', sizes.label, 'text-text-secondary')}>
            {Math.round(clampedTotal)}% used
          </div>
        )}

        {/* Legend */}
        {showLegend && (
          <div className="mt-3 flex flex-wrap gap-4">
            {items.map((item, index) => {
              const variant = variantStyles[item.variant];
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className={cn('w-3 h-3', variant.bar, radiusStyles.sm)} />
                  <span className={cn('text-xs', 'text-text-secondary')}>
                    {item.label || `Segment ${index + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

MultiProgressBar.displayName = 'MultiProgressBar';

// =============================================================================
// 📦 CIRCULAR PROGRESS COMPONENT
// =============================================================================

/**
 * CircularProgress — Circular progress indicator
 */
export interface CircularProgressProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Progress value (0-100) */
  value?: number;
  
  /** Circle size (diameter in pixels) */
  size?: number;
  
  /** Stroke width */
  strokeWidth?: number;
  
  /** Variant */
  variant?: ProgressBarVariant;
  
  /** Show percentage in center */
  showLabel?: boolean;
  
  /** Custom center content */
  children?: React.ReactNode;
  
  /** Stroke line cap */
  lineCap?: 'round' | 'square' | 'butt';
  
  /** Background track color */
  trackColor?: string;
}

export const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      className,
      value = 0,
      size = 120,
      strokeWidth = 8,
      variant = 'default',
      showLabel = true,
      children,
      lineCap = 'round',
      trackColor,
      ...props
    },
    ref
  ) => {
    const variants = variantStyles[variant];
    const clampedValue = Math.min(100, Math.max(0, value));
    
    // Calculate circle dimensions
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedValue / 100) * circumference;
    
    // Center coordinates
    const center = size / 2;

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
        {...props}
      >
        {/* SVG Circle */}
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={trackColor || 'var(--color-bg-overlay)'}
            strokeWidth={strokeWidth}
          />
          
          {/* Progress Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap={lineCap}
            className={cn(
              variants.bar,
              'transition-all duration-500 ease-out'
            )}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (
            showLabel && (
              <span className="text-sm font-semibold text-text-primary">
                {Math.round(clampedValue)}%
              </span>
            )
          )}
        </div>
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  ProgressBarProps,
  MultiProgressBarProps,
  MultiProgressBarItem,
  CircularProgressProps,
  ProgressBarVariant,
  ProgressBarSize,
  ProgressBarAnimation,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { ProgressBar, MultiProgressBar, CircularProgress } from '@/components/ui/ProgressBar';
 * 
 * // Simple progress bar
 * <ProgressBar value={75} />
 * 
 * // With label inside
 * <ProgressBar value={50} showLabel />
 * 
 * // With label outside
 * <ProgressBar value={50} showLabel labelPosition="outside" />
 * 
 * // With label on right
 * <ProgressBar value={50} showLabel labelPosition="right" />
 * 
 * // Different variants
 * <ProgressBar value={75} variant="default" />
 * <ProgressBar value={75} variant="success" />
 * <ProgressBar value={75} variant="warning" />
 * <ProgressBar value={75} variant="error" />
 * <ProgressBar value={75} variant="info" />
 * 
 * // Different sizes
 * <ProgressBar value={75} size="sm" />
 * <ProgressBar value={75} size="md" />
 * <ProgressBar value={75} size="lg" />
 * 
 * // Striped pattern
 * <ProgressBar value={75} striped />
 * 
 * // Animated stripes
 * <ProgressBar value={75} striped animated />
 * 
 * // Pulse animation
 * <ProgressBar value={75} animation="pulse" />
 * 
 * // Shimmer animation
 * <ProgressBar value={75} animation="shimmer" />
 * 
 * // Indeterminate state (unknown progress)
 * <ProgressBar indeterminate variant="info" />
 * 
 * // Custom label
 * <ProgressBar value={75} showLabel label="3 of 4 completed" />
 * 
 * // Custom border radius
 * <ProgressBar value={75} rounded="sm" />
 * <ProgressBar value={75} rounded="md" />
 * <ProgressBar value={75} rounded="lg" />
 * <ProgressBar value={75} rounded="full" />
 * 
 * // Without track background
 * <ProgressBar value={75} showTrack={false} />
 * 
 * // Multi-progress bar (for storage breakdown)
 * <MultiProgressBar
 *   items={[
 *     { value: 40, variant: 'success', label: 'Used' },
 *     { value: 30, variant: 'warning', label: 'Cache' },
 *     { value: 10, variant: 'error', label: 'Logs' },
 *   ]}
 *   showTotal
 *   showLegend
 * />
 * 
 * // Circular progress
 * <CircularProgress value={75} size={120} strokeWidth={8} />
 * 
 * <CircularProgress 
 *   value={75} 
 *   size={100} 
 *   variant="success"
 *   showLabel
 * />
 * 
 * <CircularProgress 
 *   value={75} 
 *   size={80} 
 *   strokeWidth={6}
 *   lineCap="round"
 * >
 *   <span className="text-lg">75%</span>
 * </CircularProgress>
 * 
 * // In cards (disk usage)
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Disk Usage</Card.Title>
 *   </Card.Header>
 *   <Card.Content>
 *     <ProgressBar 
 *       value={diskUsagePercent} 
 *       variant={diskUsagePercent > 90 ? 'error' : diskUsagePercent > 70 ? 'warning' : 'success'}
 *       showLabel
 *       size="lg"
 *     />
 *     <div className="mt-2 text-sm text-text-secondary">
 *       {formatFileSize(diskUsed)} / {formatFileSize(diskTotal)}
 *     </div>
 *   </Card.Content>
 * </Card>
 * 
 * // In backup operations
 * <ProgressBar 
 *   value={backupProgress} 
 *   showLabel 
 *   animated 
 *   variant="info"
 *   label={`Backing up... ${backupProgress}%`}
 * />
 * 
 * // In file upload
 * <ProgressBar 
 *   value={uploadProgress} 
 *   striped 
 *   animated 
 *   variant="success"
 * />
 * 
 * // In installer (indeterminate)
 * <ProgressBar indeterminate variant="info" size="lg" />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * ProgressBar Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - default: var(--color-accent)       #3b82f6 (Blue)
 * - success: var(--color-success)      #10b981 (Green)
 * - warning: var(--color-warning)      #f59e0b (Yellow/Orange)
 * - error:   var(--color-error)        #ef4444 (Red)
 * - info:    var(--color-info)         #6366f1 (Indigo)
 * - track:   var(--color-bg-overlay)   #202020 (Dark)
 * 
 * Sizing:
 * - sm: h-1.5 (6px), text-xs (12px), stripe: 0.5rem
 * - md: h-2.5 (10px), text-xs (12px), stripe: 0.75rem — DEFAULT
 * - lg: h-4 (16px), text-sm (14px), stripe: 1rem
 * 
 * Border Radius:
 * - rounded-full (50%) — DEFAULT for modern look
 * - rounded-sm/md/lg — alternative options
 * 
 * Animations:
 * - transition-all duration-300 ease-out (value changes)
 * - animate-stripes (striped pattern movement)
 * - animate-pulse (pulsing effect)
 * - animate-shimmer (shimmer effect)
 * - animate-indeterminate (sliding bar for unknown progress)
 * 
 * Label Positions:
 * - inside: Centered within bar (white text with drop shadow)
 * - outside: Below bar, centered
 * - right: Inline to the right of bar
 * 
 * Multi-Progress:
 * - Stacked segments for breakdown visualization
 * - Automatic normalization to 100%
 * - Legend support for segment labels
 * - Total percentage display
 * 
 * Circular Progress:
 * - SVG-based for smooth rendering
 * - Configurable size and stroke width
 * - Line cap options (round/square/butt)
 * - Custom center content support
 * 
 * Accessibility:
 * - role="progressbar"
 * - aria-valuenow, aria-valuemin, aria-valuemax
 * - aria-label for context
 * - Keyboard accessible
 * 
 * Performance:
 * - CSS-first animations (no JS for transitions)
 * - Hardware-accelerated transforms
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Disk usage visualization
 * - RAM usage visualization
 * - Backup progress
 * - File upload progress
 * - Installer step progress
 * - Site creation progress
 * - Database import/export progress
 * - Update/upgrade progress
 * - Storage breakdown (multi-progress)
 * - CPU/RAM real-time usage (circular)
 */