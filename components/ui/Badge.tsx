'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Badge Component
// =============================================================================
// Inline status badge / label component
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  size?: 'sm' | 'md';
}

// =============================================================================
// COMPONENT
// =============================================================================

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap',

          // Size
          size === 'sm' && 'px-2 py-0.5 text-xs',
          size === 'md' && 'px-2.5 py-1 text-sm',

          // Variants
          variant === 'default' && 'bg-bg-overlay text-text-secondary',
          variant === 'success' && 'bg-success-subtle text-success',
          variant === 'warning' && 'bg-warning-subtle text-warning',
          variant === 'error' && 'bg-error-subtle text-error',
          variant === 'info' && 'bg-info-subtle text-info',
          variant === 'outline' && 'border border-border text-text-secondary',

          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

// =============================================================================
// EXPORTS
// =============================================================================

export { Badge };
export type { BadgeProps };
