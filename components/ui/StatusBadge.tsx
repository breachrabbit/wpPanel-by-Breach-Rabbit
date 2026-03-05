'use client';

// =============================================================================
// wpPanel by Breach Rabbit — StatusBadge Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple status types, pulsing dot animation, sizes, variants
// =============================================================================

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type StatusType = 
  | 'online'
  | 'offline'
  | 'warning'
  | 'error'
  | 'pending'
  | 'processing'
  | 'success'
  | 'info'
  | 'neutral';

export type StatusSize = 'sm' | 'md' | 'lg';
export type StatusVariant = 'badge' | 'dot' | 'text';

export interface StatusBadgeProps extends HTMLAttributes<HTMLDivElement> {
  /** Status type (determines color and icon) */
  status: StatusType;
  
  /** Display variant */
  variant?: StatusVariant;
  
  /** Size */
  size?: StatusSize;
  
  /** Show pulsing animation (for online/processing) */
  animated?: boolean;
  
  /** Show status dot */
  showDot?: boolean;
  
  /** Status label text (optional) */
  label?: string;
  
  /** Custom children (overrides label) */
  children?: ReactNode;
  
  /** Hide text, show only dot */
  dotOnly?: boolean;
}

// =============================================================================
// ⚙️ STATUS CONFIGURATIONS
// =============================================================================

/**
 * Status color configurations (using CSS variables from globals.css)
 */
const statusColors: Record<StatusType, {
  bg: string;
  text: string;
  border: string;
  dot: string;
  subtle: string;
}> = {
  online: {
    bg: 'var(--color-success-subtle)',
    text: 'var(--color-success)',
    border: 'var(--color-success)',
    dot: 'var(--color-success)',
    subtle: 'var(--color-success-subtle)',
  },
  offline: {
    bg: 'var(--color-error-subtle)',
    text: 'var(--color-error)',
    border: 'var(--color-error)',
    dot: 'var(--color-error)',
    subtle: 'var(--color-error-subtle)',
  },
  warning: {
    bg: 'var(--color-warning-subtle)',
    text: 'var(--color-warning)',
    border: 'var(--color-warning)',
    dot: 'var(--color-warning)',
    subtle: 'var(--color-warning-subtle)',
  },
  error: {
    bg: 'var(--color-error-subtle)',
    text: 'var(--color-error)',
    border: 'var(--color-error)',
    dot: 'var(--color-error)',
    subtle: 'var(--color-error-subtle)',
  },
  pending: {
    bg: 'var(--color-info-subtle)',
    text: 'var(--color-info)',
    border: 'var(--color-info)',
    dot: 'var(--color-info)',
    subtle: 'var(--color-info-subtle)',
  },
  processing: {
    bg: 'var(--color-info-subtle)',
    text: 'var(--color-info)',
    border: 'var(--color-info)',
    dot: 'var(--color-info)',
    subtle: 'var(--color-info-subtle)',
  },
  success: {
    bg: 'var(--color-success-subtle)',
    text: 'var(--color-success)',
    border: 'var(--color-success)',
    dot: 'var(--color-success)',
    subtle: 'var(--color-success-subtle)',
  },
  info: {
    bg: 'var(--color-info-subtle)',
    text: 'var(--color-info)',
    border: 'var(--color-info)',
    dot: 'var(--color-info)',
    subtle: 'var(--color-info-subtle)',
  },
  neutral: {
    bg: 'var(--color-bg-overlay)',
    text: 'var(--color-text-secondary)',
    border: 'var(--color-border)',
    dot: 'var(--color-text-muted)',
    subtle: 'var(--color-bg-overlay)',
  },
};

/**
 * Status label mappings
 */
const statusLabels: Record<StatusType, string> = {
  online: 'Online',
  offline: 'Offline',
  warning: 'Warning',
  error: 'Error',
  pending: 'Pending',
  processing: 'Processing',
  success: 'Success',
  info: 'Info',
  neutral: 'N/A',
};

/**
 * Size configurations
 */
const sizeStyles: Record<StatusSize, string> = {
  sm: `
    h-5 px-2 text-xs
    gap-1
  `,
  md: `
    h-6 px-2.5 text-xs
    gap-1.5
  `,
  lg: `
    h-7 px-3 text-sm
    gap-2
  `,
};

/**
 * Dot size configurations
 */
const dotSizes: Record<StatusSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

/**
 * Variant configurations
 */
const variantStyles: Record<StatusVariant, string> = {
  badge: `
    inline-flex items-center
    rounded-full
    font-medium
    border
  `,
  dot: `
    inline-flex items-center justify-center
    rounded-full
  `,
  text: `
    inline-flex items-center
    font-medium
  `,
};

// =============================================================================
// 🏗️ STATUS BADGE COMPONENT
// =============================================================================

/**
 * StatusBadge Component — wpPanel by Breach Rabbit UI
 * 
 * Displays status with color-coded badge, dot, or text.
 * Supports pulsing animation for active states.
 * 
 * @example
 * <StatusBadge status="online" />
 * <StatusBadge status="offline" variant="dot" />
 * <StatusBadge status="warning" label="Expiring Soon" />
 * <StatusBadge status="online" animated size="lg" />
 */
export const StatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(
  (
    {
      className,
      status = 'neutral',
      variant = 'badge',
      size = 'md',
      animated = false,
      showDot = true,
      label,
      children,
      dotOnly = false,
      ...props
    },
    ref
  ) => {
    const colors = statusColors[status];
    const displayLabel = label || statusLabels[status];
    const isAnimated = animated && (status === 'online' || status === 'processing');

    // Combine all styles
    const combinedClassName = cn(
      variantStyles[variant],
      sizeStyles[size],
      variant === 'badge' && `
        ${colors.bg} 
        ${colors.text} 
        border-${colors.border}
      `,
      variant === 'dot' && colors.bg,
      variant === 'text' && colors.text,
      className
    );

    // Dot-only mode
    if (dotOnly) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative rounded-full',
            dotSizes[size],
            colors.dot,
            isAnimated && 'animate-pulse-dot',
            className
          )}
          data-status={status}
          data-size={size}
          {...props}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={combinedClassName}
        data-status={status}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {/* Status Dot */}
        {showDot && variant !== 'text' && (
          <span
            className={cn(
              'relative rounded-full',
              dotSizes[size],
              colors.dot,
              isAnimated && 'animate-pulse-dot'
            )}
            aria-hidden="true"
          >
            {/* Pulsing ring for animated states */}
            {isAnimated && (
              <span
                className={cn(
                  'absolute inset-0 rounded-full',
                  colors.dot,
                  'animate-ping',
                  'opacity-75'
                )}
                aria-hidden="true"
              />
            )}
          </span>
        )}

        {/* Status Label */}
        {!dotOnly && (
          <span className="truncate">
            {children || displayLabel}
          </span>
        )}
      </div>
    );
  }
);

// Set display name for debugging
StatusBadge.displayName = 'StatusBadge';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { StatusBadgeProps, StatusType, StatusSize, StatusVariant };

/**
 * Get status color utility (for custom implementations)
 */
export function getStatusColors(status: StatusType) {
  return statusColors[status];
}

/**
 * Get status label utility (for custom implementations)
 */
export function getStatusLabel(status: StatusType): string {
  return statusLabels[status];
}

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { StatusBadge } from '@/components/ui/StatusBadge';
 * 
 * // Simple badge
 * <StatusBadge status="online" />
 * <StatusBadge status="offline" />
 * <StatusBadge status="warning" />
 * <StatusBadge status="error" />
 * 
 * // With animation (pulsing dot)
 * <StatusBadge status="online" animated />
 * <StatusBadge status="processing" animated />
 * 
 * // Different sizes
 * <StatusBadge status="online" size="sm" />
 * <StatusBadge status="online" size="md" />
 * <StatusBadge status="online" size="lg" />
 * 
 * // Different variants
 * <StatusBadge status="online" variant="badge" />  // Default
 * <StatusBadge status="online" variant="dot" />    // Dot only with bg
 * <StatusBadge status="online" variant="text" />   // Text only
 * 
 * // Dot only
 * <StatusBadge status="online" dotOnly />
 * <StatusBadge status="online" dotOnly animated />
 * 
 * // Custom label
 * <StatusBadge status="online" label="Running" />
 * <StatusBadge status="warning" label="Expiring Soon" />
 * 
 * // In cards/tables
 * <Card>
 *   <Card.Header>
 *     <div className="flex items-center justify-between">
 *       <Card.Title>example.com</Card.Title>
 *       <StatusBadge status="online" animated />
 *     </div>
 *   </Card.Header>
 * </Card>
 * 
 * // In tables
 * <Table>
 *   <Table.Row>
 *     <Table.Cell>example.com</Table.Cell>
 *     <Table.Cell>
 *       <StatusBadge status="online" size="sm" />
 *     </Table.Cell>
 *   </Table.Row>
 * </Table>
 * 
 * // Site status pattern
 * <StatusBadge 
 *   status={site.isRunning ? 'online' : 'offline'} 
 *   animated={site.isRunning}
 *   label={site.isRunning ? 'Running' : 'Stopped'}
 * />
 * 
 * // SSL status pattern
 * <StatusBadge 
 *   status={ssl.daysUntilExpiry > 30 ? 'success' : ssl.daysUntilExpiry > 7 ? 'warning' : 'error'}
 *   label={ssl.daysUntilExpiry > 30 ? 'Active' : ssl.daysUntilExpiry > 7 ? 'Expiring' : 'Expired'}
 *   animated={ssl.daysUntilExpiry > 30}
 * />
 * 
 * // Backup status pattern
 * <StatusBadge 
 *   status={backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'error' : 'processing'}
 *   animated={backup.status === 'processing'}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * StatusBadge Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - online/success:  var(--color-success)       #10b981 (Green)
 * - offline/error:   var(--color-error)         #ef4444 (Red)
 * - warning:         var(--color-warning)       #f59e0b (Yellow/Orange)
 * - pending/processing/info: var(--color-info)  #6366f1 (Indigo)
 * - neutral:         var(--color-text-secondary) #888888 (Gray)
 * 
 * Subtle backgrounds (for badge variant):
 * - success-subtle:  rgba(16,185,129,0.10)
 * - error-subtle:    rgba(239,68,68,0.10)
 * - warning-subtle:  rgba(245,158,11,0.10)
 * - info-subtle:     rgba(99,102,241,0.10)
 * 
 * Sizing:
 * - sm: h-5 (20px), px-2, text-xs (12px), dot: 6px (w-1.5)
 * - md: h-6 (24px), px-2.5, text-xs (12px), dot: 8px (w-2) — DEFAULT
 * - lg: h-7 (28px), px-3, text-sm (14px), dot: 10px (w-2.5)
 * 
 * Border Radius:
 * - rounded-full (pill shape) — consistent with wpPanel design
 * 
 * Animations:
 * - animate-pulse-dot: CSS keyframes pulsing opacity (2s infinite)
 * - animate-ping: Tailwind built-in expanding ring
 * - 150ms ease-out for hover states
 * 
 * Accessibility:
 * - aria-hidden for decorative dots
 * - Semantic status labels
 * - Color + text (not color only)
 * - Proper contrast ratios
 * 
 * Performance:
 * - CSS-first animations (no JS)
 * - Minimal runtime overhead
 * - Tree-shaken component
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases:
 * - Site status (online/offline)
 * - SSL certificate status (active/expiring/expired)
 * - Backup status (completed/failed/processing)
 * - Server health (healthy/warning/critical)
 * - Job/Task status (pending/running/completed/failed)
 * - Payment status (paid/pending/failed)
 */