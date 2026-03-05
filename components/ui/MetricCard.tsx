'use client';

// =============================================================================
// wpPanel by Breach Rabbit — MetricCard Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Value display, icons, delta indicators, sparklines, trends
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type MetricVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type MetricSize = 'sm' | 'md' | 'lg';
export type DeltaType = 'positive' | 'negative' | 'neutral';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface MetricCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Metric title/label */
  title?: string;
  
  /** Main value to display */
  value: string | number;
  
  /** Value prefix (e.g., "$", "€") */
  valuePrefix?: string;
  
  /** Value suffix (e.g., "%", "GB", "ms") */
  valueSuffix?: string;
  
  /** Metric icon (Lucide icon component) */
  icon?: LucideIcon;
  
  /** Metric variant (affects colors) */
  variant?: MetricVariant;
  
  /** Metric size */
  size?: MetricSize;
  
  /** Delta value (e.g., "+12%", "-5%") */
  delta?: string | number;
  
  /** Delta type (affects color) */
  deltaType?: DeltaType;
  
  /** Delta label (e.g., "vs last month") */
  deltaLabel?: string;
  
  /** Show trend indicator (arrow) */
  showTrend?: boolean;
  
  /** Trend direction */
  trend?: TrendDirection;
  
  /** Sparkline data points (for mini chart) */
  sparkline?: number[];
  
  /** Show sparkline chart */
  showSparkline?: boolean;
  
  /** Sparkline color override */
  sparklineColor?: string;
  
  /** Description text below value */
  description?: string;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Clickable card */
  clickable?: boolean;
  
  /** onClick handler */
  onClick?: () => void;
  
  /** Custom className for the value */
  valueClassName?: string;
  
  /** Custom className for the delta */
  deltaClassName?: string;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<MetricSize, {
  container: string;
  icon: string;
  title: string;
  value: string;
  description: string;
  delta: string;
  sparkline: string;
}> = {
  sm: {
    container: 'p-3',
    icon: 'w-8 h-8 p-1.5',
    title: 'text-xs',
    value: 'text-xl',
    description: 'text-xs',
    delta: 'text-xs',
    sparkline: 'h-8',
  },
  md: {
    container: 'p-4',
    icon: 'w-10 h-10 p-2',
    title: 'text-sm',
    value: 'text-2xl',
    description: 'text-sm',
    delta: 'text-sm',
    sparkline: 'h-10',
  },
  lg: {
    container: 'p-5',
    icon: 'w-12 h-12 p-2.5',
    title: 'text-base',
    value: 'text-3xl',
    description: 'text-base',
    delta: 'text-base',
    sparkline: 'h-12',
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantConfig: Record<MetricVariant, {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  deltaPositive: string;
  deltaNegative: string;
}> = {
  default: {
    bg: 'var(--color-bg-surface)',
    border: 'var(--color-border)',
    iconBg: 'var(--color-bg-overlay)',
    iconColor: 'var(--color-text-secondary)',
    deltaPositive: 'var(--color-success)',
    deltaNegative: 'var(--color-error)',
  },
  success: {
    bg: 'var(--color-success-subtle)',
    border: 'var(--color-success-border, rgba(16,185,129,0.30))',
    iconBg: 'var(--color-success-subtle)',
    iconColor: 'var(--color-success)',
    deltaPositive: 'var(--color-success)',
    deltaNegative: 'var(--color-error)',
  },
  warning: {
    bg: 'var(--color-warning-subtle)',
    border: 'var(--color-warning-border, rgba(245,158,11,0.30))',
    iconBg: 'var(--color-warning-subtle)',
    iconColor: 'var(--color-warning)',
    deltaPositive: 'var(--color-success)',
    deltaNegative: 'var(--color-error)',
  },
  error: {
    bg: 'var(--color-error-subtle)',
    border: 'var(--color-error-border, rgba(239,68,68,0.30))',
    iconBg: 'var(--color-error-subtle)',
    iconColor: 'var(--color-error)',
    deltaPositive: 'var(--color-success)',
    deltaNegative: 'var(--color-error)',
  },
  info: {
    bg: 'var(--color-info-subtle)',
    border: 'var(--color-info-border, rgba(99,102,241,0.30))',
    iconBg: 'var(--color-info-subtle)',
    iconColor: 'var(--color-info)',
    deltaPositive: 'var(--color-success)',
    deltaNegative: 'var(--color-error)',
  },
};

// =============================================================================
// 🔧 HELPER COMPONENTS
// =============================================================================

/**
 * Sparkline — Mini chart component for trend visualization
 */
interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
  height?: number;
}

function Sparkline({ data, color, className, height = 40 }: SparklineProps) {
  if (!data || data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const width = 100;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // Determine trend
  const firstValue = data[0];
  const lastValue = data[data.length - 1];
  const isUp = lastValue > firstValue;
  
  const strokeColor = color || (isUp ? 'var(--color-success)' : 'var(--color-error)');
  const fillColor = color || (isUp ? 'var(--color-success-subtle)' : 'var(--color-error-subtle)');

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
    >
      {/* Gradient fill */}
      <defs>
        <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill="url(#sparkline-gradient)"
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * DeltaIndicator — Shows change indicator with arrow
 */
interface DeltaIndicatorProps {
  delta: string | number;
  deltaType?: DeltaType;
  trend?: TrendDirection;
  showTrend?: boolean;
  className?: string;
}

function DeltaIndicator({
  delta,
  deltaType = 'neutral',
  trend,
  showTrend = true,
  className,
}: DeltaIndicatorProps) {
  // Auto-detect trend from delta if not provided
  const effectiveTrend = trend || (
    typeof delta === 'string' 
      ? delta.startsWith('+') ? 'up' : delta.startsWith('-') ? 'down' : 'stable'
      : delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'
  );

  const effectiveDeltaType = deltaType || (
    effectiveTrend === 'up' ? 'positive' : effectiveTrend === 'down' ? 'negative' : 'neutral'
  );

  return (
    <div
      className={cn(
        'flex items-center gap-1 font-medium',
        effectiveDeltaType === 'positive' && 'text-success',
        effectiveDeltaType === 'negative' && 'text-error',
        effectiveDeltaType === 'neutral' && 'text-text-muted',
        className
      )}
    >
      {showTrend && effectiveTrend !== 'stable' && (
        <svg
          className={cn('w-3 h-3', effectiveTrend === 'down' && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
      <span>{typeof delta === 'number' ? (delta > 0 ? '+' : '') + delta + '%' : delta}</span>
    </div>
  );
}

// =============================================================================
// 🏗️ METRIC CARD COMPONENT
// =============================================================================

/**
 * MetricCard Component — wpPanel by Breach Rabbit UI
 * 
 * Displays key metrics with value, icon, delta indicator, and optional sparkline.
 * Used for dashboard statistics, monitoring widgets, and KPI displays.
 * 
 * @example
 * <MetricCard 
 *   title="Total Sites" 
 *   value={42} 
 *   icon={Globe} 
 *   delta="+12%" 
 *   deltaType="positive"
 * />
 */
export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      className,
      title,
      value,
      valuePrefix,
      valueSuffix,
      icon: IconComponent,
      variant = 'default',
      size = 'md',
      delta,
      deltaType,
      deltaLabel,
      showTrend = true,
      trend,
      sparkline,
      showSparkline = false,
      sparklineColor,
      description,
      isLoading = false,
      clickable = false,
      onClick,
      valueClassName,
      deltaClassName,
      children,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const config = variantConfig[variant];
    
    const formattedValue = React.useMemo(() => {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      const displayValue = typeof value === 'number' && !Number.isInteger(value) 
        ? numValue.toFixed(2) 
        : value;
      
      return `${valuePrefix || ''}${displayValue}${valueSuffix || ''}`;
    }, [value, valuePrefix, valueSuffix]);

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'rounded-md',
          'border',
          'transition-all duration-150 ease-out',
          
          // Background & Border
          config.bg,
          config.border,
          
          // Size
          sizes.container,
          
          // Clickable state
          clickable && 'cursor-pointer hover:border-border-hover hover:shadow-elevated',
          
          // Loading state
          isLoading && 'opacity-50 pointer-events-none',
          
          // Custom className
          className
        )}
        onClick={clickable ? onClick : undefined}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {/* Header: Icon + Title */}
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h4
              className={cn(
                'font-medium',
                'text-text-secondary',
                sizes.title
              )}
            >
              {title}
            </h4>
          )}
          
          {IconComponent && (
            <div
              className={cn(
                'flex items-center justify-center',
                'rounded-md',
                sizes.icon,
                config.iconBg
              )}
              style={{ color: config.iconColor }}
              aria-hidden="true"
            >
              <IconComponent className="w-full h-full" />
            </div>
          )}
        </div>

        {/* Main Value */}
        <div className="flex items-baseline gap-2 mb-1">
          <span
            className={cn(
              'font-semibold',
              'text-text-primary',
              sizes.value,
              valueClassName
            )}
          >
            {isLoading ? (
              <span className="inline-block w-20 h-6 bg-bg-overlay rounded animate-pulse" />
            ) : (
              formattedValue
            )}
          </span>
          
          {/* Delta Indicator */}
          {delta && !isLoading && (
            <DeltaIndicator
              delta={delta}
              deltaType={deltaType}
              trend={trend}
              showTrend={showTrend}
              className={cn(sizes.delta, deltaClassName)}
            />
          )}
        </div>

        {/* Description */}
        {description && (
          <p
            className={cn(
              'text-text-muted',
              sizes.description,
              'mt-1'
            )}
          >
            {description}
          </p>
        )}

        {/* Delta Label */}
        {deltaLabel && !isLoading && (
          <p
            className={cn(
              'text-text-muted',
              sizes.delta,
              'mt-1'
            )}
          >
            {deltaLabel}
          </p>
        )}

        {/* Sparkline Chart */}
        {showSparkline && sparkline && sparkline.length > 1 && !isLoading && (
          <div className={cn('mt-3', sizes.sparkline)}>
            <Sparkline
              data={sparkline}
              color={sparklineColor}
              className={cn('w-full', sizes.sparkline)}
            />
          </div>
        )}

        {/* Children (custom content) */}
        {children}
      </div>
    );
  }
);

// Set display name for debugging
MetricCard.displayName = 'MetricCard';

// =============================================================================
// 📦 PRE-CONFIGURED METRIC HELPERS
// =============================================================================

/**
 * SitesMetric — Pre-configured for site count
 */
export function SitesMetric(props: Omit<MetricCardProps, 'icon' | 'valueSuffix'>) {
  const { Globe } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="Total Sites"
      icon={Globe}
      variant="info"
      {...props}
    />
  );
}

/**
 * UsersMetric — Pre-configured for user count
 */
export function UsersMetric(props: Omit<MetricCardProps, 'icon'>) {
  const { Users } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="Total Users"
      icon={Users}
      variant="default"
      {...props}
    />
  );
}

/**
 * RevenueMetric — Pre-configured for revenue (with $ prefix)
 */
export function RevenueMetric(props: Omit<MetricCardProps, 'icon' | 'valuePrefix'>) {
  const { DollarSign } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="Revenue"
      icon={DollarSign}
      valuePrefix="$"
      variant="success"
      {...props}
    />
  );
}

/**
 * CpuMetric — Pre-configured for CPU usage
 */
export function CpuMetric(props: Omit<MetricCardProps, 'icon' | 'valueSuffix'>) {
  const { Cpu } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="CPU Usage"
      icon={Cpu}
      valueSuffix="%"
      variant={typeof props.value === 'number' && props.value > 80 ? 'error' : 'default'}
      {...props}
    />
  );
}

/**
 * RamMetric — Pre-configured for RAM usage
 */
export function RamMetric(props: Omit<MetricCardProps, 'icon' | 'valueSuffix'>) {
  const { MemoryStick } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="RAM Usage"
      icon={MemoryStick}
      valueSuffix="%"
      variant={typeof props.value === 'number' && props.value > 80 ? 'warning' : 'default'}
      {...props}
    />
  );
}

/**
 * DiskMetric — Pre-configured for disk usage
 */
export function DiskMetric(props: Omit<MetricCardProps, 'icon' | 'valueSuffix'>) {
  const { HardDrive } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="Disk Usage"
      icon={HardDrive}
      valueSuffix="%"
      variant={typeof props.value === 'number' && props.value > 85 ? 'error' : 'default'}
      {...props}
    />
  );
}

/**
 * RequestsMetric — Pre-configured for request count
 */
export function RequestsMetric(props: Omit<MetricCardProps, 'icon'>) {
  const { Activity } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="Requests"
      icon={Activity}
      variant="default"
      {...props}
    />
  );
}

/**
 * ErrorsMetric — Pre-configured for error count
 */
export function ErrorsMetric(props: Omit<MetricCardProps, 'icon'>) {
  const { AlertCircle } = require('lucide-react') as typeof import('lucide-react');
  return (
    <MetricCard
      title="Errors"
      icon={AlertCircle}
      variant="error"
      {...props}
    />
  );
}

// =============================================================================
// 📦 METRIC GRID COMPONENT
// =============================================================================

/**
 * MetricGrid — Grid layout for multiple metric cards
 */
export interface MetricGridProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Grid columns (responsive) */
  columns?: 1 | 2 | 3 | 4 | 'auto';
  
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg';
  
  /** Children (MetricCard components) */
  children?: React.ReactNode;
}

export const MetricGrid = React.forwardRef<HTMLDivElement, MetricGridProps>(
  (
    {
      className,
      columns = 4,
      gap = 'md',
      children,
      ...props
    },
    ref
  ) => {
    const columnStyles = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      auto: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    };

    const gapStyles = {
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          columnStyles[columns],
          gapStyles[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MetricGrid.displayName = 'MetricGrid';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  MetricCardProps,
  MetricGridProps,
  MetricVariant,
  MetricSize,
  DeltaType,
  TrendDirection,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { MetricCard, MetricGrid, CpuMetric, RamMetric, DiskMetric } from '@/components/ui/MetricCard';
 * import { Globe, Users, DollarSign, Activity } from 'lucide-react';
 * 
 * // Simple metric card
 * <MetricCard 
 *   title="Total Sites" 
 *   value={42} 
 * />
 * 
 * // With icon
 * <MetricCard 
 *   title="Total Sites" 
 *   value={42} 
 *   icon={Globe} 
 * />
 * 
 * // With delta indicator
 * <MetricCard 
 *   title="Revenue" 
 *   value={12450} 
 *   valuePrefix="$"
 *   delta="+12.5%" 
 *   deltaType="positive"
 *   deltaLabel="vs last month"
 * />
 * 
 * // With sparkline chart
 * <MetricCard 
 *   title="Requests" 
 *   value={15234} 
 *   icon={Activity}
 *   delta="+8%" 
 *   deltaType="positive"
 *   showSparkline 
 *   sparkline={[120, 150, 180, 160, 200, 220, 250, 230, 280, 300]}
 * />
 * 
 * // Different sizes
 * <MetricCard size="sm" title="Small" value={100} />
 * <MetricCard size="md" title="Medium" value={100} />
 * <MetricCard size="lg" title="Large" value={100} />
 * 
 * // Different variants
 * <MetricCard variant="default" title="Default" value={100} />
 * <MetricCard variant="success" title="Success" value={100} />
 * <MetricCard variant="warning" title="Warning" value={100} />
 * <MetricCard variant="error" title="Error" value={100} />
 * <MetricCard variant="info" title="Info" value={100} />
 * 
 * // Loading state
 * <MetricCard title="Loading" value={0} isLoading />
 * 
 * // Clickable card
 * <MetricCard 
 *   title="View Details" 
 *   value={42} 
 *   clickable 
 *   onClick={() => router.push('/details')} 
 * />
 * 
 * // With description
 * <MetricCard 
 *   title="Active Users" 
 *   value={1234} 
 *   description="Users online in the last 5 minutes"
 * />
 * 
 * // Metric Grid (dashboard layout)
 * <MetricGrid columns={4} gap="md">
 *   <MetricCard title="Sites" value={42} icon={Globe} delta="+5%" />
 *   <MetricCard title="Users" value={1234} icon={Users} delta="+12%" />
 *   <MetricCard title="Revenue" value={5678} icon={DollarSign} valuePrefix="$" delta="+8%" />
 *   <MetricCard title="Requests" value={98765} icon={Activity} delta="-3%" deltaType="negative" />
 * </MetricGrid>
 * 
 * // Pre-configured helpers
 * <MetricGrid columns={3}>
 *   <CpuMetric value={45} delta="+5%" sparkline={[30, 35, 40, 45, 50, 48, 45]} showSparkline />
 *   <RamMetric value={62} delta="+2%" />
 *   <DiskMetric value={78} delta="+1%" />
 * </MetricGrid>
 * 
 * // Dashboard stats row
 * function DashboardStats() {
 *   const {  metrics } = useQuery({ queryKey: ['metrics'], queryFn: fetchMetrics });
 *   
 *   if (!metrics) {
 *     return (
 *       <MetricGrid columns={4}>
 *         {[...Array(4)].map((_, i) => (
 *           <MetricCard key={i} title="Loading" value={0} isLoading />
 *         ))}
 *       </MetricGrid>
 *     );
 *   }
 *   
 *   return (
 *     <MetricGrid columns={4}>
 *       <SitesMetric value={metrics.sites} delta={metrics.sitesDelta} />
 *       <UsersMetric value={metrics.users} delta={metrics.usersDelta} />
 *       <RevenueMetric value={metrics.revenue} delta={metrics.revenueDelta} />
 *       <RequestsMetric value={metrics.requests} delta={metrics.requestsDelta} showSparkline sparkline={metrics.requestsHistory} />
 *     </MetricGrid>
 *   );
 * }
 * 
 * // Server monitoring widgets
 * <div className="grid grid-cols-3 gap-4">
 *   <CpuMetric 
 *     value={serverMetrics.cpu} 
 *     delta={serverMetrics.cpuChange} 
 *     showSparkline 
 *     sparkline={serverMetrics.cpuHistory}
 *     variant={serverMetrics.cpu > 80 ? 'error' : serverMetrics.cpu > 60 ? 'warning' : 'default'}
 *   />
 *   <RamMetric 
 *     value={serverMetrics.ram} 
 *     delta={serverMetrics.ramChange} 
 *     variant={serverMetrics.ram > 80 ? 'error' : serverMetrics.ram > 60 ? 'warning' : 'default'}
 *   />
 *   <DiskMetric 
 *     value={serverMetrics.disk} 
 *     delta={serverMetrics.diskChange} 
 *     variant={serverMetrics.disk > 85 ? 'error' : serverMetrics.disk > 70 ? 'warning' : 'default'}
 *   />
 * </div>
 * 
 * // With custom trend
 * <MetricCard 
 *   title="Bounce Rate" 
 *   value={32.5} 
 *   valueSuffix="%"
 *   delta="-5.2%" 
 *   deltaType="positive"  // Lower bounce rate is good
 *   trend="down"  // Explicitly set trend direction
 *   showTrend
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * MetricCard Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - default: bg-surface (#101010) + border + text-secondary icon
 * - success: success-subtle bg + success icon
 * - warning: warning-subtle bg + warning icon
 * - error:   error-subtle bg + error icon
 * - info:    info-subtle bg + info icon
 * 
 * Delta Colors:
 * - positive: var(--color-success)  #10b981 (Green)
 * - negative: var(--color-error)    #ef4444 (Red)
 * - neutral:  var(--color-text-muted) #444444 (Gray)
 * 
 * Sizing:
 * - sm:  p-3,   icon: 32x32, title: text-xs,  value: text-xl,  sparkline: h-8
 * - md:  p-4,   icon: 40x40, title: text-sm,  value: text-2xl, sparkline: h-10 — DEFAULT
 * - lg:  p-5,   icon: 48x48, title: text-base, value: text-3xl, sparkline: h-12
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Sparkline:
 * - SVG-based mini chart
 * - Gradient fill area
 * - Stroke line with trend color
 * - Auto-colors based on trend (up=green, down=red)
 * 
 * Accessibility:
 * - Semantic HTML (h4 for title)
 * - aria-hidden for decorative icons
 * - role="button" when clickable
 * - tabIndex for keyboard navigation
 * - Loading state with skeleton placeholder
 * 
 * Performance:
 * - CSS-first (no JS for hover/focus states)
 * - SVG sparkline (no external chart library)
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Dashboard overview stats (sites, users, revenue)
 * - Server monitoring (CPU, RAM, disk usage)
 * - Site metrics (requests, bandwidth, response time)
 * - Backup statistics (count, size, last backup)
 * - SSL certificate stats (active, expiring, expired)
 * - Error tracking (4xx, 5xx counts)
 * - Performance metrics (avg response time, uptime)
 */