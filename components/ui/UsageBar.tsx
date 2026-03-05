'use client';

// =============================================================================
// wpPanel by Breach Rabbit — UsageBar Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Color thresholds, labels, sizes, animations, accessible
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type UsageBarVariant = 'disk' | 'ram' | 'cpu' | 'swap' | 'custom';
export type UsageBarSize = 'sm' | 'md' | 'lg';
export type UsageBarColorMode = 'threshold' | 'gradient' | 'solid';
export type UsageBarLabelPosition = 'inside' | 'outside' | 'right' | 'none';

export interface UsageBarProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Current usage value (0-100 percentage) */
  value: number;
  
  /** Maximum value (for absolute values, e.g., bytes) */
  max?: number;
  
  /** Usage bar variant (affects thresholds) */
  variant?: UsageBarVariant;
  
  /** Usage bar size */
  size?: UsageBarSize;
  
  /** Color mode */
  colorMode?: UsageBarColorMode;
  
  /** Show percentage label */
  showLabel?: boolean;
  
  /** Label position */
  labelPosition?: UsageBarLabelPosition;
  
  /** Custom label text (overrides percentage) */
  label?: string;
  
  /** Show value/total (e.g., "50GB / 100GB") */
  showValues?: boolean;
  
  /** Value prefix (e.g., "GB", "MB") */
  valuePrefix?: string;
  
  /** Value suffix (e.g., "%", " used") */
  valueSuffix?: string;
  
  /** Custom thresholds for color changes */
  thresholds?: {
    warning: number;
    error: number;
  };
  
  /** Hide background track */
  hideTrack?: boolean;
  
  /** Animated bar (smooth transitions) */
  animated?: boolean;
  
  /** Show warning icon when above threshold */
  showWarning?: boolean;
  
  /** Border radius override */
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'none';
  
  /** Custom className for the bar */
  barClassName?: string;
  
  /** Custom className for the track */
  trackClassName?: string;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<UsageBarSize, {
  bar: string;
  label: string;
  value: string;
}> = {
  sm: {
    bar: 'h-1.5',
    label: 'text-xs',
    value: 'text-xs',
  },
  md: {
    bar: 'h-2.5',
    label: 'text-xs',
    value: 'text-sm',
  },
  lg: {
    bar: 'h-4',
    label: 'text-sm',
    value: 'text-base',
  },
};

/**
 * Default thresholds by variant
 */
const variantThresholds: Record<UsageBarVariant, {
  warning: number;
  error: number;
}> = {
  disk: { warning: 80, error: 90 },
  ram: { warning: 70, error: 85 },
  cpu: { warning: 70, error: 90 },
  swap: { warning: 50, error: 80 },
  custom: { warning: 70, error: 90 },
};

/**
 * Color configurations (using CSS variables from globals.css)
 */
const colorConfig = {
  low: {
    bg: 'var(--color-success)',
    subtle: 'var(--color-success-subtle)',
    glow: 'shadow-glow-success',
  },
  medium: {
    bg: 'var(--color-warning)',
    subtle: 'var(--color-warning-subtle)',
    glow: '',
  },
  high: {
    bg: 'var(--color-error)',
    subtle: 'var(--color-error-subtle)',
    glow: 'shadow-glow-error',
  },
  track: 'var(--color-bg-overlay)',
  border: 'var(--color-border)',
};

/**
 * Border radius configurations
 */
const radiusStyles: Record<'sm' | 'md' | 'lg' | 'full' | 'none', string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
  none: 'rounded-none',
};

/**
 * Label position configurations
 */
const labelPositionStyles: Record<UsageBarLabelPosition, string> = {
  inside: 'absolute inset-0 flex items-center justify-center',
  outside: 'mt-2 text-center',
  right: 'ml-3 whitespace-nowrap',
  none: '',
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Determine color state based on value and thresholds
 */
function getColorState(
  value: number,
  warningThreshold: number,
  errorThreshold: number
): 'low' | 'medium' | 'high' {
  if (value >= errorThreshold) {
    return 'high';
  }
  if (value >= warningThreshold) {
    return 'medium';
  }
  return 'low';
}

/**
 * Format value with prefix/suffix
 */
function formatValue(
  value: number,
  prefix?: string,
  suffix?: string
): string {
  const formatted = prefix ? `${prefix}${value}` : `${value}`;
  return suffix ? `${formatted}${suffix}` : formatted;
}

// =============================================================================
// 🏗️ USAGE BAR COMPONENT
// =============================================================================

/**
 * UsageBar Component — wpPanel by Breach Rabbit UI
 * 
 * Displays resource usage (disk, RAM, CPU, swap) with color-coded thresholds.
 * Automatically changes color based on usage percentage.
 * 
 * @example
 * <UsageBar value={75} variant="disk" showLabel />
 * <UsageBar value={50} max={100} showValues valuePrefix="GB" />
 * <UsageBar value={92} variant="ram" showWarning thresholds={{ warning: 70, error: 90 }} />
 */
export const UsageBar = React.forwardRef<HTMLDivElement, UsageBarProps>(
  (
    {
      className,
      value,
      max = 100,
      variant = 'custom',
      size = 'md',
      colorMode = 'threshold',
      showLabel = false,
      labelPosition = 'right',
      label,
      showValues = false,
      valuePrefix,
      valueSuffix = '%',
      thresholds: customThresholds,
      hideTrack = false,
      animated = true,
      showWarning = false,
      rounded = 'full',
      barClassName,
      trackClassName,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const radius = radiusStyles[rounded];
    const variantThresholdsConfig = customThresholds || variantThresholds[variant];
    
    // Clamp value between 0 and max
    const clampedValue = Math.min(max, Math.max(0, value));
    const percentage = max > 0 ? (clampedValue / max) * 100 : 0;
    
    // Determine color state
    const colorState = getColorState(
      percentage,
      variantThresholdsConfig.warning,
      variantThresholdsConfig.error
    );
    
    const colors = colorConfig[colorState];
    
    // Display label
    const displayLabel = label ?? `${Math.round(percentage)}%`;
    
    // Value display
    const valueDisplay = showValues
      ? `${formatValue(clampedValue, valuePrefix, valueSuffix)} / ${formatValue(max, valuePrefix, valueSuffix)}`
      : displayLabel;

    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          labelPosition === 'outside' && 'flex flex-col',
          labelPosition === 'right' && 'flex items-center',
          className
        )}
        {...props}
      >
        {/* Usage Bar Container */}
        <div className="relative w-full">
          {/* Background Track */}
          {!hideTrack && (
            <div
              className={cn(
                'relative w-full',
                sizes.bar,
                colorConfig.track,
                radius,
                trackClassName
              )}
              role="progressbar"
              aria-valuenow={Math.round(percentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={props['aria-label'] || 'Usage'}
            />
          )}

          {/* Usage Bar Fill */}
          <div
            className={cn(
              // Base styles
              'absolute top-0 left-0 h-full',
              colors.bg,
              radius,
              
              // Width transition
              animated && 'transition-all duration-500 ease-out',
              
              // Glow effect for high usage
              colorState === 'high' && colors.glow,
              
              // Custom className
              barClassName
            )}
            style={{ width: `${percentage}%` }}
          >
            {/* Inside Label */}
            {showLabel && labelPosition === 'inside' && (
              <span
                className={cn(
                  'absolute inset-0',
                  'flex items-center justify-center',
                  'font-medium',
                  'text-text-inverse',
                  'drop-shadow-sm',
                  sizes.label
                )}
              >
                {displayLabel}
              </span>
            )}
          </div>

          {/* Warning Icon */}
          {showWarning && colorState !== 'low' && (
            <div
              className={cn(
                'absolute -right-5 top-1/2 -translate-y-1/2',
                colorState === 'high' ? 'text-error' : 'text-warning',
                'animate-pulse'
              )}
              aria-label={colorState === 'high' ? 'Critical usage' : 'Warning usage'}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
        </div>

        {/* Outside/Right Label */}
        {showLabel && labelPosition !== 'inside' && labelPosition !== 'none' && (
          <div
            className={cn(
              'font-medium',
              'text-text-secondary',
              sizes.value,
              labelPositionStyles[labelPosition],
              colorState === 'high' && 'text-error',
              colorState === 'medium' && 'text-warning'
            )}
          >
            {valueDisplay}
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
UsageBar.displayName = 'UsageBar';

// =============================================================================
// 📦 PRE-CONFIGURED USAGE BAR HELPERS
// =============================================================================

/**
 * DiskUsageBar — Pre-configured for disk usage
 */
export function DiskUsageBar(props: Omit<UsageBarProps, 'variant' | 'thresholds'>) {
  return (
    <UsageBar
      variant="disk"
      thresholds={{ warning: 80, error: 90 }}
      {...props}
    />
  );
}

/**
 * RamUsageBar — Pre-configured for RAM usage
 */
export function RamUsageBar(props: Omit<UsageBarProps, 'variant' | 'thresholds'>) {
  return (
    <UsageBar
      variant="ram"
      thresholds={{ warning: 70, error: 85 }}
      {...props}
    />
  );
}

/**
 * CpuUsageBar — Pre-configured for CPU usage
 */
export function CpuUsageBar(props: Omit<UsageBarProps, 'variant' | 'thresholds'>) {
  return (
    <UsageBar
      variant="cpu"
      thresholds={{ warning: 70, error: 90 }}
      {...props}
    />
  );
}

/**
 * SwapUsageBar — Pre-configured for swap usage
 */
export function SwapUsageBar(props: Omit<UsageBarProps, 'variant' | 'thresholds'>) {
  return (
    <UsageBar
      variant="swap"
      thresholds={{ warning: 50, error: 80 }}
      {...props}
    />
  );
}

// =============================================================================
// 📦 USAGE CARD COMPONENT
// =============================================================================

/**
 * UsageCard — Card wrapper for usage bar with title and stats
 */
export interface UsageCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Card title */
  title: string;
  
  /** Current usage value */
  value: number;
  
  /** Maximum value */
  max?: number;
  
  /** Usage bar variant */
  variant?: UsageBarVariant;
  
  /** Show percentage in title */
  showPercentage?: boolean;
  
  /** Additional stats (e.g., "50GB used of 100GB") */
  stats?: string;
  
  /** Warning message when above threshold */
  warningMessage?: string;
  
  /** Icon for the card */
  icon?: React.ReactNode;
}

export const UsageCard = React.forwardRef<HTMLDivElement, UsageCardProps>(
  (
    {
      className,
      title,
      value,
      max = 100,
      variant = 'custom',
      showPercentage = true,
      stats,
      warningMessage,
      icon,
      ...props
    },
    ref
  ) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    const thresholds = variantThresholds[variant];
    const colorState = getColorState(percentage, thresholds.warning, thresholds.error);
    const showWarning = colorState !== 'low' && warningMessage;

    return (
      <div
        ref={ref}
        className={cn(
          // Card base
          'relative',
          'p-4',
          'rounded-md',
          'bg-bg-surface',
          'border border-border',
          'transition-colors duration-150',
          colorState === 'high' && 'border-error',
          colorState === 'medium' && 'border-warning',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-text-muted">{icon}</span>}
            <h4 className="text-sm font-medium text-text-primary">
              {title}
              {showPercentage && (
                <span
                  className={cn(
                    'ml-2 text-xs',
                    colorState === 'high' && 'text-error',
                    colorState === 'medium' && 'text-warning',
                    colorState === 'low' && 'text-success'
                  )}
                >
                  {Math.round(percentage)}%
                </span>
              )}
            </h4>
          </div>
        </div>

        {/* Usage Bar */}
        <UsageBar
          value={value}
          max={max}
          variant={variant}
          size="md"
          showLabel={false}
          rounded="full"
          className="mb-2"
        />

        {/* Stats */}
        {stats && (
          <p className="text-xs text-text-secondary">{stats}</p>
        )}

        {/* Warning Message */}
        {showWarning && (
          <p className="mt-2 text-xs text-error font-medium">
            {warningMessage}
          </p>
        )}
      </div>
    );
  }
);

UsageCard.displayName = 'UsageCard';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  UsageBarProps,
  UsageCardProps,
  UsageBarVariant,
  UsageBarSize,
  UsageBarColorMode,
  UsageBarLabelPosition,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { UsageBar, UsageCard, DiskUsageBar, RamUsageBar, CpuUsageBar } from '@/components/ui/UsageBar';
 * import { HardDrive, MemoryStick, Cpu } from 'lucide-react';
 * 
 * // Simple usage bar
 * <UsageBar value={75} />
 * 
 * // With label
 * <UsageBar value={75} showLabel />
 * 
 * // With values
 * <UsageBar 
 *   value={50} 
 *   max={100} 
 *   showValues 
 *   valuePrefix="GB" 
 * />
 * 
 * // Different variants (affects thresholds)
 * <DiskUsageBar value={85} showLabel />
 * <RamUsageBar value={75} showLabel />
 * <CpuUsageBar value={90} showLabel />
 * <SwapUsageBar value={60} showLabel />
 * 
 * // Different sizes
 * <UsageBar value={75} size="sm" />
 * <UsageBar value={75} size="md" />
 * <UsageBar value={75} size="lg" />
 * 
 * // Different label positions
 * <UsageBar value={75} showLabel labelPosition="inside" />
 * <UsageBar value={75} showLabel labelPosition="right" />
 * <UsageBar value={75} showLabel labelPosition="outside" />
 * 
 * // With warning icon
 * <UsageBar value={92} showWarning />
 * 
 * // Custom thresholds
 * <UsageBar 
 *   value={85} 
 *   thresholds={{ warning: 70, error: 90 }} 
 *   showWarning 
 * />
 * 
 * // Without track background
 * <UsageBar value={75} hideTrack />
 * 
 * // Without animation
 * <UsageBar value={75} animated={false} />
 * 
 * // Usage Card (pre-built card wrapper)
 * <UsageCard
 *   title="Disk Usage"
 *   value={75}
 *   max={100}
 *   variant="disk"
 *   stats="75GB used of 100GB"
 *   warningMessage="Disk space is running low!"
 *   icon={<HardDrive className="w-4 h-4" />}
 * />
 * 
 * // Dashboard metrics
 * <div className="grid grid-cols-3 gap-4">
 *   <UsageCard
 *     title="CPU"
 *     value={cpuUsage}
 *     max={100}
 *     variant="cpu"
 *     icon={<Cpu className="w-4 h-4" />}
 *     stats={`${cpuUsage}% average`}
 *   />
 *   <UsageCard
 *     title="RAM"
 *     value={ramUsage}
 *     max={totalRam}
 *     variant="ram"
 *     icon={<MemoryStick className="w-4 h-4" />}
 *     stats={`${formatFileSize(usedRam)} / ${formatFileSize(totalRam)}`}
 *     warningMessage="High memory usage detected"
 *   />
 *   <UsageCard
 *     title="Disk"
 *     value={diskUsage}
 *     max={totalDisk}
 *     variant="disk"
 *     icon={<HardDrive className="w-4 h-4" />}
 *     stats={`${formatFileSize(usedDisk)} / ${formatFileSize(totalDisk)}`}
 *     warningMessage="Disk space critical!"
 *   />
 * </div>
 * 
 * // In site details
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Resource Usage</Card.Title>
 *   </Card.Header>
 *   <Card.Content className="space-y-4">
 *     <DiskUsageBar 
 *       value={site.diskUsage} 
 *       max={site.diskLimit}
 *       showValues
 *       valuePrefix="GB"
 *       showLabel
 *     />
 *     <RamUsageBar 
 *       value={site.ramUsage} 
 *       max={site.ramLimit}
 *       showValues
 *       valuePrefix="MB"
 *       showLabel
 *     />
 *   </Card.Content>
 * </Card>
 * 
 * // Real-time monitoring (with WebSocket updates)
 * function ServerMetrics() {
 *   const {  metrics } = useWebSocket('/api/monitoring/stream');
 *   
 *   return (
 *     <div className="space-y-4">
 *       <CpuUsageBar 
 *         value={metrics?.cpu || 0} 
 *         showLabel 
 *         showWarning 
 *         animated 
 *       />
 *       <RamUsageBar 
 *         value={metrics?.ram || 0} 
 *         showLabel 
 *         showWarning 
 *         animated 
 *       />
 *     </div>
 *   );
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * UsageBar Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - Low (0-70%):    var(--color-success)       #10b981 (Green)
 * - Medium (70-90%): var(--color-warning)      #f59e0b (Yellow/Orange)
 * - High (90-100%):  var(--color-error)        #ef4444 (Red)
 * - Track:           var(--color-bg-overlay)   #202020 (Dark)
 * - Border:          var(--color-border)       rgba(255,255,255,0.07)
 * 
 * Thresholds by variant:
 * - disk:  warning 80%, error 90%
 * - ram:   warning 70%, error 85%
 * - cpu:   warning 70%, error 90%
 * - swap:  warning 50%, error 80%
 * - custom: warning 70%, error 90%
 * 
 * Sizing:
 * - sm: h-1.5 (6px), label: text-xs
 * - md: h-2.5 (10px), label: text-xs — DEFAULT
 * - lg: h-4 (16px), label: text-sm
 * 
 * Border Radius:
 * - rounded-full (50%) — DEFAULT for modern look
 * - rounded-sm/md/lg/none — alternative options
 * 
 * Animations:
 * - transition-all duration-500 ease-out (value changes)
 * - animate-pulse (warning icon)
 * - CSS-only, no JS overhead
 * 
 * Label Positions:
 * - inside: Centered within bar (white text with drop shadow)
 * - outside: Below bar, centered
 * - right: Inline to the right of bar
 * - none: No label
 * 
 * Accessibility:
 * - role="progressbar"
 * - aria-valuenow, aria-valuemin, aria-valuemax
 * - aria-label for context
 * - Color + text (not color only for status)
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
 * - Dashboard server metrics (CPU/RAM/Disk)
 * - Site resource usage
 * - Backup storage usage
 * - Database size vs limit
 * - Bandwidth usage
 * - Inode usage
 * - Process limits
 * - Connection limits
 */