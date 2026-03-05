'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Spinner Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, sizes, CSS-only animations, accessible
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type SpinnerVariant = 'default' | 'primary' | 'success' | 'error' | 'warning';
export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerAnimation = 'spin' | 'pulse' | 'bounce' | 'dots';

export interface SpinnerProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Spinner variant (color) */
  variant?: SpinnerVariant;
  
  /** Spinner size */
  size?: SpinnerSize;
  
  /** Animation type */
  animation?: SpinnerAnimation;
  
  /** Label for screen readers */
  label?: string;
  
  /** Show label text visually */
  showLabel?: boolean;
  
  /** Label position */
  labelPosition?: 'left' | 'right' | 'top' | 'bottom';
  
  /** Spinner thickness (for ring variant) */
  thickness?: number;
  
  /** Speed in milliseconds */
  speed?: number;
  
  /** Inherit parent color */
  inheritColor?: boolean;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (dimensions)
 */
const sizeStyles: Record<SpinnerSize, {
  container: string;
  ring: string;
  dots: string;
  label: string;
  gap: string;
}> = {
  sm: {
    container: 'w-4 h-4',
    ring: 'w-4 h-4',
    dots: 'w-1 h-1',
    label: 'text-xs',
    gap: 'gap-1.5',
  },
  md: {
    container: 'w-6 h-6',
    ring: 'w-6 h-6',
    dots: 'w-1.5 h-1.5',
    label: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    container: 'w-8 h-8',
    ring: 'w-8 h-8',
    dots: 'w-2 h-2',
    label: 'text-base',
    gap: 'gap-2.5',
  },
  xl: {
    container: 'w-12 h-12',
    ring: 'w-12 h-12',
    dots: 'w-2.5 h-2.5',
    label: 'text-lg',
    gap: 'gap-3',
  },
};

/**
 * Variant color configurations (using CSS variables from globals.css)
 */
const variantColors: Record<SpinnerVariant, string> = {
  default: 'text-text-muted',
  primary: 'text-accent',
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
};

/**
 * Label position configurations
 */
const labelPositionStyles: Record<'left' | 'right' | 'top' | 'bottom', string> = {
  left: 'flex-row',
  right: 'flex-row-reverse',
  top: 'flex-col',
  bottom: 'flex-col-reverse',
};

// =============================================================================
// 🏗️ SPINNER COMPONENT
// =============================================================================

/**
 * Spinner Component — wpPanel by Breach Rabbit UI
 * 
 * CSS-only loading spinner with multiple variants and animations.
 * No JavaScript animation overhead.
 * 
 * @example
 * <Spinner />
 * <Spinner variant="primary" size="lg" />
 * <Spinner animation="dots" label="Loading..." />
 */
export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      animation = 'spin',
      label,
      showLabel = false,
      labelPosition = 'right',
      thickness = 2,
      speed = 750,
      inheritColor = false,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const color = inheritColor ? 'text-current' : variantColors[variant];

    // Render different animation types
    const renderSpinner = () => {
      switch (animation) {
        case 'pulse':
          return (
            <div
              className={cn(
                'relative',
                sizes.container,
                color,
                className
              )}
              style={{ animationDuration: `${speed}ms` }}
            >
              <div
                className={cn(
                  'absolute inset-0',
                  'rounded-full',
                  'bg-current',
                  'opacity-25',
                  'animate-ping'
                )}
              />
              <div
                className={cn(
                  'absolute inset-0',
                  'rounded-full',
                  'bg-current',
                  'opacity-75'
                )}
              />
            </div>
          );

        case 'bounce':
          return (
            <div
              className={cn(
                'flex items-center justify-center',
                sizes.gap,
                className
              )}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-full',
                    'bg-current',
                    color,
                    sizes.dots,
                    'animate-bounce'
                  )}
                  style={{
                    animationDelay: `${i * 150}ms`,
                    animationDuration: `${speed}ms`,
                  }}
                />
              ))}
            </div>
          );

        case 'dots':
          return (
            <div
              className={cn(
                'flex items-center justify-center',
                sizes.gap,
                className
              )}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-full',
                    'bg-current',
                    color,
                    sizes.dots,
                    'animate-pulse'
                  )}
                  style={{
                    animationDelay: `${i * 100}ms`,
                    opacity: 0.2 + (i * 0.15),
                  }}
                />
              ))}
            </div>
          );

        case 'spin':
        default:
          return (
            <div
              ref={ref}
              className={cn(
                // Base styles
                'relative',
                'inline-block',
                sizes.ring,
                color,
                className
              )}
              role="status"
              aria-label={label || 'Loading'}
              aria-busy="true"
              {...props}
            >
              {/* SVG Ring Spinner */}
              <svg
                className="w-full h-full animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ animationDuration: `${speed}ms` }}
              >
                {/* Background ring */}
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth={thickness}
                />
                {/* Progress arc */}
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              
              {/* Screen reader text */}
              {label && (
                <span className="sr-only">{label}</span>
              )}
            </div>
          );
      }
    };

    // With label
    if (showLabel && label) {
      return (
        <div
          className={cn(
            'flex items-center justify-center',
            labelPositionStyles[labelPosition],
            sizes.gap,
            className
          )}
          role="status"
          aria-label={label}
          aria-busy="true"
          {...props}
        >
          {renderSpinner()}
          <span
            className={cn(
              'font-medium',
              'text-text-secondary',
              sizes.label
            )}
          >
            {label}
          </span>
        </div>
      );
    }

    return renderSpinner();
  }
);

// Set display name for debugging
Spinner.displayName = 'Spinner';

// =============================================================================
// 📦 LOADING OVERLAY COMPONENT
// =============================================================================

/**
 * LoadingOverlay — Full page or container loading overlay
 */
export interface LoadingOverlayProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Overlay visible */
  visible?: boolean;
  
  /** Full screen overlay */
  fullscreen?: boolean;
  
  /** Loading message */
  message?: string;
  
  /** Spinner variant */
  variant?: SpinnerVariant;
  
  /** Spinner size */
  spinnerSize?: SpinnerSize;
  
  /** Background blur */
  blur?: boolean;
  
  /** Background opacity */
  bgOpacity?: 'light' | 'medium' | 'heavy';
}

export const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  (
    {
      className,
      visible = true,
      fullscreen = false,
      message = 'Loading...',
      variant = 'primary',
      spinnerSize = 'lg',
      blur = true,
      bgOpacity = 'medium',
      children,
      ...props
    },
    ref
  ) => {
    if (!visible) {
      return <>{children}</>;
    }

    const opacityStyles = {
      light: 'bg-black/30',
      medium: 'bg-black/50',
      heavy: 'bg-black/70',
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base
          'relative',
          fullscreen && 'fixed inset-0 z-[100]',
          !fullscreen && 'absolute inset-0',
          
          // Background
          opacityStyles[bgOpacity],
          blur && 'backdrop-blur-sm',
          
          // Content
          'flex items-center justify-center',
          'flex-col',
          'gap-4',
          
          className
        )}
        role="status"
        aria-label={message}
        aria-busy="true"
        {...props}
      >
        <Spinner variant={variant} size={spinnerSize} />
        {message && (
          <p className="text-sm font-medium text-text-primary">
            {message}
          </p>
        )}
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';

// =============================================================================
// 📦 INLINE LOADING COMPONENT
// =============================================================================

/**
 * InlineLoading — Small inline spinner for buttons, inputs, etc.
 */
export interface InlineLoadingProps {
  /** Size */
  size?: 'xs' | 'sm' | 'md';
  
  /** Color */
  color?: string;
  
  /** Custom className */
  className?: string;
}

export function InlineLoading({
  size = 'sm',
  color,
  className,
}: InlineLoadingProps) {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
  };

  return (
    <svg
      className={cn(
        'animate-spin',
        sizeMap[size],
        color || 'text-current',
        className
      )}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// =============================================================================
// 📦 DOTS LOADING COMPONENT
// =============================================================================

/**
 * DotsLoading — Animated dots loading indicator
 */
export interface DotsLoadingProps {
  /** Number of dots */
  count?: number;
  
  /** Dot size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Color variant */
  variant?: SpinnerVariant;
  
  /** Gap between dots */
  gap?: 'sm' | 'md' | 'lg';
  
  /** Custom className */
  className?: string;
}

export function DotsLoading({
  count = 3,
  size = 'md',
  variant = 'default',
  gap = 'md',
  className,
}: DotsLoadingProps) {
  const sizeMap = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  const gapMap = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        gapMap[gap],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full',
            'bg-current',
            variantColors[variant],
            sizeMap[size],
            'animate-pulse'
          )}
          style={{
            animationDelay: `${i * 150}ms`,
            opacity: 0.3 + (i * 0.2),
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  SpinnerProps,
  LoadingOverlayProps,
  InlineLoadingProps,
  DotsLoadingProps,
  SpinnerVariant,
  SpinnerSize,
  SpinnerAnimation,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Spinner, LoadingOverlay, InlineLoading, DotsLoading } from '@/components/ui/Spinner';
 * 
 * // Simple spinner
 * <Spinner />
 * 
 * // Different variants
 * <Spinner variant="default" />
 * <Spinner variant="primary" />
 * <Spinner variant="success" />
 * <Spinner variant="error" />
 * <Spinner variant="warning" />
 * 
 * // Different sizes
 * <Spinner size="sm" />
 * <Spinner size="md" />
 * <Spinner size="lg" />
 * <Spinner size="xl" />
 * 
 * // Different animations
 * <Spinner animation="spin" />
 * <Spinner animation="pulse" />
 * <Spinner animation="bounce" />
 * <Spinner animation="dots" />
 * 
 * // With label
 * <Spinner label="Loading..." showLabel />
 * <Spinner label="Saving..." showLabel labelPosition="bottom" />
 * 
 * // Custom speed
 * <Spinner speed={500} />  // Faster
 * <Spinner speed={1500} /> // Slower
 * 
 * // Inherit parent color
 * <div className="text-accent">
 *   <Spinner inheritColor />
 * </div>
 * 
 * // Loading overlay
 * <LoadingOverlay visible={isLoading} message="Processing..." />
 * 
 * <LoadingOverlay 
 *   fullscreen 
 *   visible={isGlobalLoading} 
 *   message="Please wait..." 
 *   blur 
 * />
 * 
 * // Inline loading (for buttons)
 * <Button disabled={isLoading}>
 *   {isLoading && <InlineLoading size="sm" className="mr-2" />}
 *   {isLoading ? 'Saving...' : 'Save'}
 * </Button>
 * 
 * // Dots loading
 * <DotsLoading count={3} size="md" variant="primary" />
 * 
 * // In Suspense boundaries
 * <Suspense fallback={<Spinner size="lg" className="mx-auto" />}>
 *   <DashboardStats />
 * </Suspense>
 * 
 * // In table row
 * <Table.Row>
 *   <Table.Cell>
 *     {loading ? <InlineLoading /> : data}
 *   </Table.Cell>
 * </Table.Row>
 * 
 * // In card
 * <Card>
 *   <Card.Content className="flex items-center justify-center h-48">
 *     <Spinner size="lg" variant="primary" />
 *   </Card.Content>
 * </Card>
 * 
 * // Custom thickness
 * <Spinner thickness={4} />  // Thicker ring
 * <Spinner thickness={1} />  // Thinner ring
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Spinner Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - default: var(--color-text-muted)    #444444 (Gray)
 * - primary: var(--color-accent)        #3b82f6 (Blue)
 * - success: var(--color-success)       #10b981 (Green)
 * - error:   var(--color-error)         #ef4444 (Red)
 * - warning: var(--color-warning)       #f59e0b (Yellow/Orange)
 * 
 * Sizing:
 * - sm:  w-4 h-4  (16x16px),  label: text-xs
 * - md:  w-6 h-6  (24x24px),  label: text-sm — DEFAULT
 * - lg:  w-8 h-8  (32x32px),  label: text-base
 * - xl:  w-12 h-12 (48x48px), label: text-lg
 * 
 * Animations (CSS-only):
 * - spin:   360° rotation (default, 750ms)
 * - pulse:  ping + fade effect
 * - bounce: 3 dots bouncing (150ms delay each)
 * - dots:   5 dots pulsing (100ms delay each)
 * 
 * Speed:
 * - Default: 750ms
 * - Configurable: 100ms - 5000ms
 * - Lower = faster spin
 * 
 * Thickness:
 * - Default: 2px
 * - Configurable: 1-8px
 * - Affects SVG ring stroke width
 * 
 * Accessibility:
 * - role="status" for screen readers
 * - aria-label with loading message
 * - aria-busy="true" to indicate loading state
 * - sr-only text for spin variant with label
 * 
 * Performance:
 * - CSS-only animations (no JS overhead)
 * - Hardware-accelerated transforms
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * - InlineLoading: ~50 lines SVG (no external deps)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - inheritColor option for custom contexts
 * - No additional styles needed for light mode
 * 
 * Common Use Cases in wpPanel:
 * - Button loading states (InlineLoading)
 * - Page loading (Spinner lg/xl)
 * - Table row loading (InlineLoading sm)
 * - Form submission (Spinner + label)
 * - Full page loading (LoadingOverlay fullscreen)
 * - Modal loading (LoadingOverlay)
 * - Data fetching (Spinner md)
 * - Installation progress (DotsLoading)
 * - Terminal connection (Spinner primary)
 * - Backup in progress (LoadingOverlay with message)
 */