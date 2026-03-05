'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Skeleton Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, shimmer animation, responsive, accessible
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type SkeletonVariant = 'text' | 'circle' | 'rectangle' | 'rounded' | 'card' | 'table' | 'image';
export type SkeletonSize = 'sm' | 'md' | 'lg' | 'xl';
export type SkeletonAnimation = 'none' | 'pulse' | 'shimmer' | 'wave';

export interface SkeletonProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Skeleton variant (shape) */
  variant?: SkeletonVariant;
  
  /** Skeleton size */
  size?: SkeletonSize;
  
  /** Animation type */
  animation?: SkeletonAnimation;
  
  /** Width override (any CSS value) */
  width?: string | number;
  
  /** Height override (any CSS value) */
  height?: string | number;
  
  /** Border radius override */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none';
  
  /** Delay animation start (ms) */
  delay?: number;
  
  /** Disable animation (static skeleton) */
  static?: boolean;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (default width/height for each variant)
 */
const sizeStyles: Record<SkeletonSize, {
  width?: string;
  height: string;
  borderRadius?: string;
}> = {
  sm: {
    height: 'h-3',
    width: 'w-full',
  },
  md: {
    height: 'h-4',
    width: 'w-full',
  },
  lg: {
    height: 'h-6',
    width: 'w-full',
  },
  xl: {
    height: 'h-8',
    width: 'w-full',
  },
};

/**
 * Variant configurations (shape-specific styles)
 */
const variantStyles: Record<SkeletonVariant, string> = {
  text: `
    h-4 w-full
    rounded-sm
  `,
  circle: `
    rounded-full
    aspect-square
  `,
  rectangle: `
    rounded-md
  `,
  rounded: `
    rounded-lg
  `,
  card: `
    rounded-md
    w-full
  `,
  table: `
    h-4 w-full
    rounded-sm
  `,
  image: `
    rounded-md
    w-full
    aspect-video
  `,
};

/**
 * Border radius configurations
 */
const radiusStyles: Record<'sm' | 'md' | 'lg' | 'xl' | 'full' | 'none', string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
  none: 'rounded-none',
};

/**
 * Animation configurations
 */
const animationStyles: Record<SkeletonAnimation, string> = {
  none: '',
  pulse: 'animate-pulse',
  shimmer: 'animate-shimmer',
  wave: 'animate-wave',
};

// =============================================================================
// 🏗️ SKELETON COMPONENT
// =============================================================================

/**
 * Skeleton Component — wpPanel by Breach Rabbit UI
 * 
 * Loading placeholder with shimmer animation.
 * Used to reduce perceived load time and prevent layout shift.
 * 
 * @example
 * <Skeleton variant="text" />
 * <Skeleton variant="circle" size="lg" />
 * <Skeleton variant="card" animation="shimmer" />
 */
export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'text',
      size = 'md',
      animation = 'shimmer',
      width,
      height,
      rounded,
      delay = 0,
      static: isStatic = false,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    const radiusStyle = rounded ? radiusStyles[rounded] : '';
    const animationStyle = isStatic ? '' : animationStyles[animation];

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'overflow-hidden',
          'bg-bg-overlay',
          'before:absolute',
          'before:inset-0',
          'before:-translate-x-full',
          'before:bg-gradient-to-r',
          'before:from-transparent',
          'before:via-bg-elevated',
          'before:to-transparent',
          'before:opacity-50',
          
          // Size
          sizes.height,
          sizes.width,
          
          // Variant
          variantStyle,
          
          // Border radius
          radiusStyle,
          
          // Animation
          !isStatic && animationStyle,
          
          // Custom styles
          width && 'w-auto',
          height && 'h-auto',
          
          // Delay (via inline style)
          delay > 0 && 'before:animate-delayed',
          
          className
        )}
        style={{
          width: width,
          height: height,
          animationDelay: delay > 0 ? `${delay}ms` : undefined,
          '--shimmer-duration': '2s',
        } as React.CSSProperties}
        role="status"
        aria-label="Loading content"
        aria-busy="true"
        {...props}
      />
    );
  }
);

// Set display name for debugging
Skeleton.displayName = 'Skeleton';

// =============================================================================
// 📦 SKELETON COMPOSITION COMPONENTS
// =============================================================================

/**
 * SkeletonText — Pre-configured text skeleton with lines
 */
export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  
  /** Gap between lines */
  gap?: 'sm' | 'md' | 'lg';
  
  /** Last line width percentage */
  lastLineWidth?: number;
  
  /** Animation type */
  animation?: SkeletonAnimation;
  
  /** Custom className */
  className?: string;
}

export function SkeletonText({
  lines = 3,
  gap = 'md',
  lastLineWidth = 60,
  animation = 'shimmer',
  className,
}: SkeletonTextProps) {
  const gapStyles = {
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-3',
  };

  return (
    <div
      className={cn('flex flex-col', gapStyles[gap], className)}
      role="status"
      aria-label="Loading text content"
    >
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          animation={animation}
          delay={index * 100}
          className={
            index === lines - 1 ? { width: `${lastLineWidth}%` } : undefined
          }
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard — Pre-configured card skeleton
 */
export interface SkeletonCardProps {
  /** Show image placeholder */
  showImage?: boolean;
  
  /** Show title */
  showTitle?: boolean;
  
  /** Show description lines */
  descriptionLines?: number;
  
  /** Show footer/actions */
  showFooter?: boolean;
  
  /** Animation type */
  animation?: SkeletonAnimation;
  
  /** Custom className */
  className?: string;
}

export function SkeletonCard({
  showImage = true,
  showTitle = true,
  descriptionLines = 2,
  showFooter = false,
  animation = 'shimmer',
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      role="status"
      aria-label="Loading card"
    >
      {/* Image Placeholder */}
      {showImage && (
        <Skeleton
          variant="image"
          size="lg"
          animation={animation}
          className="w-full"
        />
      )}

      {/* Content */}
      <div className="flex flex-col gap-2">
        {/* Title */}
        {showTitle && (
          <Skeleton
            variant="text"
            size="lg"
            animation={animation}
            className="w-3/4"
          />
        )}

        {/* Description */}
        {descriptionLines > 0 && (
          <SkeletonText
            lines={descriptionLines}
            gap="sm"
            lastLineWidth={40}
            animation={animation}
          />
        )}
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="flex gap-2 pt-2">
          <Skeleton
            variant="rectangle"
            size="sm"
            animation={animation}
            className="w-20"
          />
          <Skeleton
            variant="rectangle"
            size="sm"
            animation={animation}
            className="w-20"
          />
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonTable — Pre-configured table skeleton
 */
export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  
  /** Number of columns */
  columns?: number;
  
  /** Show header */
  showHeader?: boolean;
  
  /** Animation type */
  animation?: SkeletonAnimation;
  
  /** Custom className */
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  showHeader = true,
  animation = 'shimmer',
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      role="status"
      aria-label="Loading table"
    >
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton
              key={index}
              variant="table"
              size="sm"
              animation={animation}
              className="flex-1"
            />
          ))}
        </div>
      )}

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4"
          style={{ animationDelay: `${rowIndex * 100}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="table"
              size="md"
              animation={animation}
              className="flex-1"
              delay={rowIndex * 100}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonAvatar — Pre-configured avatar skeleton
 */
export interface SkeletonAvatarProps {
  /** Avatar size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  
  /** Show status indicator */
  showStatus?: boolean;
  
  /** Animation type */
  animation?: SkeletonAnimation;
  
  /** Custom className */
  className?: string;
}

export function SkeletonAvatar({
  size = 'md',
  showStatus = false,
  animation = 'shimmer',
  className,
}: SkeletonAvatarProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div
      className={cn('relative inline-flex', className)}
      role="status"
      aria-label="Loading avatar"
    >
      <Skeleton
        variant="circle"
        animation={animation}
        className={sizeMap[size]}
      />
      {showStatus && (
        <Skeleton
          variant="circle"
          animation={animation}
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-bg-surface"
        />
      )}
    </div>
  );
}

/**
 * SkeletonChart — Pre-configured chart/graph skeleton
 */
export interface SkeletonChartProps {
  /** Show title */
  showTitle?: boolean;
  
  /** Chart height */
  height?: string;
  
  /** Animation type */
  animation?: SkeletonAnimation;
  
  /** Custom className */
  className?: string;
}

export function SkeletonChart({
  showTitle = true,
  height = 'h-48',
  animation = 'shimmer',
  className,
}: SkeletonChartProps) {
  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      role="status"
      aria-label="Loading chart"
    >
      {/* Title */}
      {showTitle && (
        <Skeleton
          variant="text"
          size="lg"
          animation={animation}
          className="w-1/3"
        />
      )}

      {/* Chart Area */}
      <div className={cn('w-full', height)}>
        <Skeleton
          variant="rectangle"
          animation={animation}
          className="w-full h-full"
        />
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            size="sm"
            animation={animation}
            className="w-8"
            delay={index * 50}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonList — Pre-configured list skeleton
 */
export interface SkeletonListProps {
  /** Number of items */
  items?: number;
  
  /** Item height */
  itemSize?: 'sm' | 'md' | 'lg';
  
  /** Show avatar in each item */
  showAvatar?: boolean;
  
  /** Show secondary text */
  showSecondary?: boolean;
  
  /** Animation type */
  animation?: SkeletonAnimation;
  
  /** Custom className */
  className?: string;
}

export function SkeletonList({
  items = 5,
  itemSize = 'md',
  showAvatar = true,
  showSecondary = true,
  animation = 'shimmer',
  className,
}: SkeletonListProps) {
  const sizeMap = {
    sm: 'h-10',
    md: 'h-14',
    lg: 'h-18',
  };

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      role="status"
      aria-label="Loading list"
    >
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'flex items-center gap-3',
            sizeMap[itemSize]
          )}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Avatar */}
          {showAvatar && (
            <Skeleton
              variant="circle"
              size={itemSize === 'sm' ? 'sm' : 'md'}
              animation={animation}
            />
          )}

          {/* Content */}
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton
              variant="text"
              size="md"
              animation={animation}
              className="w-2/3"
            />
            {showSecondary && (
              <Skeleton
                variant="text"
                size="sm"
                animation={animation}
                className="w-1/2"
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  SkeletonProps,
  SkeletonTextProps,
  SkeletonCardProps,
  SkeletonTableProps,
  SkeletonAvatarProps,
  SkeletonChartProps,
  SkeletonListProps,
  SkeletonVariant,
  SkeletonSize,
  SkeletonAnimation,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonAvatar, SkeletonChart, SkeletonList } from '@/components/ui/Skeleton';
 * 
 * // Simple skeleton
 * <Skeleton variant="text" />
 * <Skeleton variant="circle" size="lg" />
 * <Skeleton variant="rectangle" width="200px" height="100px" />
 * 
 * // Different animations
 * <Skeleton animation="pulse" />
 * <Skeleton animation="shimmer" />
 * <Skeleton animation="wave" />
 * <Skeleton static />  // No animation
 * 
 * // Text skeleton with multiple lines
 * <SkeletonText lines={3} gap="md" lastLineWidth={60} />
 * 
 * // Card skeleton
 * <SkeletonCard 
 *   showImage 
 *   showTitle 
 *   descriptionLines={2} 
 *   showFooter 
 * />
 * 
 * // Table skeleton
 * <SkeletonTable rows={5} columns={4} showHeader />
 * 
 * // Avatar skeleton
 * <SkeletonAvatar size="md" showStatus />
 * 
 * // Chart skeleton
 * <SkeletonChart showTitle height="h-48" />
 * 
 * // List skeleton
 * <SkeletonList 
 *   items={5} 
 *   itemSize="md" 
 *   showAvatar 
 *   showSecondary 
 * />
 * 
 * // In loading states (React Query example)
 * function SiteList() {
 *   const {  sites, isLoading } = useQuery({
 *     queryKey: ['sites'],
 *     queryFn: fetchSites,
 *   });
 *   
 *   if (isLoading) {
 *     return <SkeletonList items={5} showAvatar={false} />;
 *   }
 *   
 *   return (
 *     <ul>
 *       {sites.map(site => <SiteItem key={site.id} site={site} />)}
 *     </ul>
 *   );
 * }
 * 
 * // In Suspense boundaries
 * <Suspense fallback={<SkeletonCard />}>
 *   <DashboardStats />
 * </Suspense>
 * 
 * // Staggered animation delays
 * <div className="grid grid-cols-3 gap-4">
 *   {Array.from({ length: 6 }).map((_, i) => (
 *     <SkeletonCard key={i} animation="shimmer" delay={i * 100} />
 *   ))}
 * </div>
 * 
 * // Custom dimensions
 * <Skeleton width="100%" height="200px" variant="image" />
 * <Skeleton width={120} height={40} variant="rectangle" rounded="full" />
 * 
 * // Dashboard loading state
 * function DashboardLoading() {
 *   return (
 *     <div className="space-y-6">
 *       {/* Stats Row */}
 *       <div className="grid grid-cols-4 gap-4">
 *         {Array.from({ length: 4 }).map((_, i) => (
 *           <SkeletonCard key={i} showImage={false} descriptionLines={1} />
 *         ))}
 *       </div>
 *       
 *       {/* Chart */}
 *       <SkeletonChart showTitle height="h-64" />
 *       
 *       {/* Recent Activity */}
 *       <SkeletonList items={5} showAvatar showSecondary />
 *     </div>
 *   );
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Skeleton Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — base skeleton color
 * - bg-elevated:    #181818 (dark) / #f0f0f0 (light) — shimmer highlight
 * - Uses gradient overlay for shimmer effect
 * 
 * Variants:
 * - text:      Single line, h-4, rounded-sm
 * - circle:    Circular (avatar), aspect-square, rounded-full
 * - rectangle: Generic box, rounded-md
 * - rounded:   Softer corners, rounded-lg
 * - card:      Full card placeholder, w-full
 * - table:     Table cell/row, h-4, rounded-sm
 * - image:     Image placeholder, aspect-video, rounded-md
 * 
 * Sizes:
 * - sm: h-3 (12px)
 * - md: h-4 (16px) — DEFAULT
 * - lg: h-6 (24px)
 * - xl: h-8 (32px)
 * 
 * Animations:
 * - none:   Static, no animation
 * - pulse:  CSS pulse (opacity fade in/out)
 * - shimmer: Gradient sweep across skeleton (DEFAULT)
 * - wave:   Wave effect (sequential items)
 * 
 * Shimmer Animation Details:
 * - Duration: 2s
 * - Gradient: transparent → bg-elevated → transparent
 * - Direction: left to right (-translate-x-full to 0)
 * - Opacity: 50% for subtle effect
 * - Delay: configurable per component
 * 
 * Accessibility:
 * - role="status" for screen readers
 * - aria-label describing what's loading
 * - aria-busy="true" to indicate loading state
 * - Reduced motion support (via prefers-reduced-motion in globals.css)
 * 
 * Performance:
 * - CSS-only animations (no JS overhead)
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
 * - Dashboard stats loading
 * - Site list loading
 * - Table data loading
 * - Chart/graph loading
 * - User profile loading
 * - Settings page loading
 * - Backup list loading
 * - Log viewer loading
 * - File manager loading
 * - WordPress plugin list loading
 */