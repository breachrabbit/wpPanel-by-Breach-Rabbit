'use client';

// =============================================================================
// wpPanel by Breach Rabbit — ChartCard Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Recharts wrapper (lazy loaded), multiple chart types, responsive
// IMPORTANT: This component should be lazy-loaded (not in initial bundle)
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Maximize2,
  Download,
  RefreshCw,
} from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type ChartType = 'line' | 'area' | 'bar' | 'pie';
export type ChartSize = 'sm' | 'md' | 'lg' | 'full';
export type ChartTimeRange = '1h' | '6h' | '24h' | '7d' | '30d';

export interface ChartDataPoint {
  [key: string]: string | number | null;
}

export interface ChartSeries {
  name: string;
  dataKey: string;
  color?: string;
  type?: 'line' | 'area' | 'bar';
}

export interface ChartCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Chart title */
  title: string;
  
  /** Chart description/subtitle */
  description?: string;
  
  /** Chart type */
  chartType?: ChartType;
  
  /** Chart data */
  data: ChartDataPoint[];
  
  /** Data series to display */
  series: ChartSeries[];
  
  /** X-axis data key */
  xAxisDataKey?: string;
  
  /** Chart size */
  size?: ChartSize;
  
  /** Time range selector */
  timeRange?: ChartTimeRange;
  
  /** On time range change */
  onTimeRangeChange?: (range: ChartTimeRange) => void;
  
  /** Show legend */
  showLegend?: boolean;
  
  /** Show grid */
  showGrid?: boolean;
  
  /** Show tooltip */
  showTooltip?: boolean;
  
  /** Y-axis label */
  yAxisLabel?: string;
  
  /** X-axis label */
  xAxisLabel?: string;
  
  /** Y-axis domain (min, max) */
  yAxisDomain?: [number, number] | ['auto', 'auto'];
  
  /** Number of Y-axis ticks */
  yAxisTickCount?: number;
  
  /** Value formatter for tooltip */
  valueFormatter?: (value: number) => string;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Empty state message */
  emptyMessage?: string;
  
  /** Show refresh button */
  showRefresh?: boolean;
  
  /** On refresh */
  onRefresh?: () => void;
  
  /** Show expand button */
  showExpand?: boolean;
  
  /** On expand */
  onExpand?: () => void;
  
  /** Show download button */
  showDownload?: boolean;
  
  /** On download */
  onDownload?: () => void;
  
  /** Custom className for chart container */
  chartClassName?: string;
  
  /** Height override */
  height?: number;
}

export interface ChartSkeletonProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Chart size */
  size?: ChartSize;
  
  /** Show header skeleton */
  showHeader?: boolean;
  
  /** Show legend skeleton */
  showLegend?: boolean;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

/**
 * Default chart colors (from wpPanel design system)
 */
const DEFAULT_COLORS = [
  '#3b82f6', // accent (blue)
  '#10b981', // success (green)
  '#f59e0b', // warning (yellow)
  '#ef4444', // error (red)
  '#6366f1', // info (indigo)
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

/**
 * Size configurations
 */
const sizeStyles: Record<ChartSize, {
  height: number;
  containerHeight: string;
}> = {
  sm: {
    height: 200,
    containerHeight: 'h-[200px]',
  },
  md: {
    height: 300,
    containerHeight: 'h-[300px]',
  },
  lg: {
    height: 400,
    containerHeight: 'h-[400px]',
  },
  full: {
    height: 500,
    containerHeight: 'h-[500px]',
  },
};

/**
 * Time range options
 */
const TIME_RANGES: { value: ChartTimeRange; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
];

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Format large numbers with K/M suffix
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
}

/**
 * Get default value formatter based on data
 */
function getDefaultFormatter(data: ChartDataPoint[], dataKey: string): (value: number) => string {
  const values = data.map(d => d[dataKey] as number).filter(v => typeof v === 'number');
  const maxValue = Math.max(...values, 0);
  
  if (maxValue >= 1000000) {
    return (value: number) => formatNumber(value);
  }
  if (maxValue >= 1000) {
    return (value: number) => formatNumber(value);
  }
  return (value: number) => value.toString();
}

// =============================================================================
// 🏗️ CHART CARD COMPONENT
// =============================================================================

/**
 * ChartCard Component — wpPanel by Breach Rabbit UI
 * 
 * Recharts wrapper with consistent styling, lazy-loaded.
 * IMPORTANT: Use dynamic import to lazy-load this component:
 * 
 * @example
 * const ChartCard = dynamic(() => import('@/components/ui/ChartCard'), {
 *   loading: () => <ChartCardSkeleton />,
 *   ssr: false,
 * });
 * 
 * <ChartCard
 *   title="Server CPU Usage"
 *   chartType="area"
 *   data={cpuData}
 *   series={[{ name: 'CPU', dataKey: 'cpu', color: '#3b82f6' }]}
 *   xAxisDataKey="time"
 * />
 */
export const ChartCard = React.forwardRef<HTMLDivElement, ChartCardProps>(
  (
    {
      className,
      title,
      description,
      chartType = 'line',
      data,
      series,
      xAxisDataKey = 'time',
      size = 'md',
      timeRange,
      onTimeRangeChange,
      showLegend = true,
      showGrid = true,
      showTooltip = true,
      yAxisLabel,
      xAxisLabel,
      yAxisDomain = ['auto', 'auto'],
      yAxisTickCount = 5,
      valueFormatter,
      isLoading = false,
      emptyMessage = 'No data available',
      showRefresh = false,
      onRefresh,
      showExpand = false,
      onExpand,
      showDownload = false,
      onDownload,
      chartClassName,
      height: heightOverride,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const chartHeight = heightOverride || sizes.height;
    const isEmpty = data.length === 0;
    
    // Determine if we should show time range selector
    const showTimeRange = timeRange !== undefined && onTimeRangeChange;

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex flex-col',
          'rounded-md',
          'border',
          'border-border',
          'bg-bg-surface',
          'transition-all duration-150 ease-out',
          
          // Loading state
          isLoading && 'opacity-50 pointer-events-none',
          
          // Custom className
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3 border-b border-border">
          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                {title}
              </h3>
              {description && (
                <div className="group relative">
                  <Info className="w-4 h-4 text-text-muted cursor-help" />
                  <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50">
                    <div className="px-3 py-2 bg-bg-elevated border border-border rounded-md text-xs text-text-secondary max-w-[250px] shadow-elevated">
                      {description}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Time Range Selector */}
            {showTimeRange && (
              <div className="flex items-center gap-1 mr-2">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => onTimeRangeChange(range.value)}
                    className={cn(
                      'px-2 py-1',
                      'text-xs font-medium',
                      'rounded',
                      'transition-colors',
                      timeRange === range.value
                        ? 'bg-accent-subtle text-accent'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-overlay'
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}

            {/* Refresh */}
            {showRefresh && onRefresh && (
              <button
                onClick={onRefresh}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Refresh chart"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* Download */}
            {showDownload && onDownload && (
              <button
                onClick={onDownload}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Download chart"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {/* Expand */}
            {showExpand && onExpand && (
              <button
                onClick={onExpand}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Expand chart"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm rounded-md z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Loading chart...</span>
            </div>
          </div>
        )}

        {/* Chart Area */}
        <div className={cn('flex-1 p-4', sizes.containerHeight, chartClassName)}>
          {isEmpty ? (
            // Empty State
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-bg-overlay flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-text-muted" aria-hidden="true" />
              </div>
              <p className="text-sm text-text-secondary">{emptyMessage}</p>
            </div>
          ) : (
            // Chart
            <ResponsiveContainer width="100%" height={chartHeight}>
              {chartType === 'line' && (
                <LineChart data={data}>
                  {showGrid && (
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  )}
                  <XAxis
                    dataKey={xAxisDataKey}
                    stroke="var(--color-text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: 'var(--color-text-muted)' } : undefined}
                  />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={valueFormatter || getDefaultFormatter(data, series[0]?.dataKey || '')}
                    domain={yAxisDomain}
                    tickCount={yAxisTickCount}
                    label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)' } : undefined}
                  />
                  {showTooltip && (
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        boxShadow: 'var(--shadow-elevated)',
                      }}
                      labelStyle={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}
                      itemStyle={{ color: 'var(--color-text-secondary)' }}
                      formatter={(value: number, name: string) => [
                        (valueFormatter || getDefaultFormatter(data, series.find(s => s.name === name)?.dataKey || ''))(value),
                        name,
                      ]}
                    />
                  )}
                  {showLegend && (
                    <Legend
                      wrapperStyle={{
                        paddingTop: '1rem',
                      }}
                    />
                  )}
                  {series.map((s, index) => (
                    <Line
                      key={s.dataKey}
                      type="monotone"
                      dataKey={s.dataKey}
                      name={s.name}
                      stroke={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              )}

              {chartType === 'area' && (
                <AreaChart data={data}>
                  <defs>
                    {series.map((s, index) => (
                      <linearGradient key={s.dataKey} id={`gradient-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  {showGrid && (
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  )}
                  <XAxis
                    dataKey={xAxisDataKey}
                    stroke="var(--color-text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: 'var(--color-text-muted)' } : undefined}
                  />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={valueFormatter || getDefaultFormatter(data, series[0]?.dataKey || '')}
                    domain={yAxisDomain}
                    tickCount={yAxisTickCount}
                    label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)' } : undefined}
                  />
                  {showTooltip && (
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        boxShadow: 'var(--shadow-elevated)',
                      }}
                      labelStyle={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}
                      itemStyle={{ color: 'var(--color-text-secondary)' }}
                      formatter={(value: number, name: string) => [
                        (valueFormatter || getDefaultFormatter(data, series.find(s => s.name === name)?.dataKey || ''))(value),
                        name,
                      ]}
                    />
                  )}
                  {showLegend && (
                    <Legend
                      wrapperStyle={{
                        paddingTop: '1rem',
                      }}
                    />
                  )}
                  {series.map((s, index) => (
                    <Area
                      key={s.dataKey}
                      type="monotone"
                      dataKey={s.dataKey}
                      name={s.name}
                      stroke={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                      strokeWidth={2}
                      fill={`url(#gradient-${s.dataKey})`}
                      fillOpacity={1}
                    />
                  ))}
                </AreaChart>
              )}

              {chartType === 'bar' && (
                <BarChart data={data}>
                  {showGrid && (
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  )}
                  <XAxis
                    dataKey={xAxisDataKey}
                    stroke="var(--color-text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: 'var(--color-text-muted)' } : undefined}
                  />
                  <YAxis
                    stroke="var(--color-text-muted)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={valueFormatter || getDefaultFormatter(data, series[0]?.dataKey || '')}
                    domain={yAxisDomain}
                    tickCount={yAxisTickCount}
                    label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'var(--color-text-muted)' } : undefined}
                  />
                  {showTooltip && (
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        boxShadow: 'var(--shadow-elevated)',
                      }}
                      labelStyle={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}
                      itemStyle={{ color: 'var(--color-text-secondary)' }}
                      formatter={(value: number, name: string) => [
                        (valueFormatter || getDefaultFormatter(data, series.find(s => s.name === name)?.dataKey || ''))(value),
                        name,
                      ]}
                    />
                  )}
                  {showLegend && (
                    <Legend
                      wrapperStyle={{
                        paddingTop: '1rem',
                      }}
                    />
                  )}
                  {series.map((s, index) => (
                    <Bar
                      key={s.dataKey}
                      dataKey={s.dataKey}
                      name={s.name}
                      fill={s.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              )}

              {chartType === 'pie' && (
                <PieChart>
                  {showTooltip && (
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        boxShadow: 'var(--shadow-elevated)',
                      }}
                      labelStyle={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}
                      itemStyle={{ color: 'var(--color-text-secondary)' }}
                    />
                  )}
                  {showLegend && (
                    <Legend
                      wrapperStyle={{
                        paddingTop: '1rem',
                      }}
                    />
                  )}
                  <Pie
                    data={data}
                    dataKey={series[0]?.dataKey || 'value'}
                    nameKey={series[0]?.name || 'name'}
                    cx="50%"
                    cy="50%"
                    outerRadius={chartHeight * 0.35}
                    fill="#8884d8"
                    label
                  >
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  }
);

// Set display name for debugging
ChartCard.displayName = 'ChartCard';

// =============================================================================
// 📦 CHART CARD SKELETON
// =============================================================================

/**
 * ChartCardSkeleton — Loading placeholder for ChartCard
 */
export const ChartCardSkeleton = React.forwardRef<HTMLDivElement, ChartSkeletonProps>(
  (
    {
      className,
      size = 'md',
      showHeader = true,
      showLegend = true,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          'rounded-md',
          'border border-border',
          'bg-bg-surface',
          'animate-shimmer',
          className
        )}
        {...props}
      >
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="w-8 h-8 rounded-md" />
              <Skeleton className="w-8 h-8 rounded-md" />
            </div>
          </div>
        )}

        {/* Chart Area */}
        <div className={cn('p-4', sizes.containerHeight)}>
          <div className="h-full flex items-end gap-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex items-center justify-center gap-4 p-4 pt-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
ChartCardSkeleton.displayName = 'ChartCardSkeleton';

// =============================================================================
// 📦 HELPER COMPONENTS
// =============================================================================

/**
 * Skeleton — Simple skeleton placeholder
 */
function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'animate-pulse',
        'bg-bg-overlay',
        'rounded-md',
        className
      )}
      {...props}
    />
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { ChartCardProps, ChartSkeletonProps, ChartDataPoint, ChartSeries, ChartType, ChartSize, ChartTimeRange };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * // IMPORTANT: Lazy load this component to avoid bloating initial bundle
 * import dynamic from 'next/dynamic';
 * 
 * const ChartCard = dynamic(() => import('@/components/ui/ChartCard'), {
 *   loading: () => <ChartCardSkeleton />,
 *   ssr: false,
 * });
 * 
 * // Simple line chart
 * <ChartCard
 *   title="CPU Usage"
 *   chartType="line"
 *   data={cpuData}
 *   series={[{ name: 'CPU %', dataKey: 'cpu', color: '#3b82f6' }]}
 *   xAxisDataKey="time"
 *   size="md"
 * />
 * 
 * // Area chart with multiple series
 * <ChartCard
 *   title="Network Traffic"
 *   chartType="area"
 *   data={networkData}
 *   series={[
 *     { name: 'Inbound', dataKey: 'in', color: '#10b981' },
 *     { name: 'Outbound', dataKey: 'out', color: '#3b82f6' },
 *   ]}
 *   xAxisDataKey="time"
 *   yAxisLabel="Bytes"
 * />
 * 
 * // Bar chart
 * <ChartCard
 *   title="Requests per Hour"
 *   chartType="bar"
 *   data={requestsData}
 *   series={[{ name: 'Requests', dataKey: 'requests', color: '#6366f1' }]}
 *   xAxisDataKey="hour"
 * />
 * 
 * // Pie chart
 * <ChartCard
 *   title="HTTP Status Codes"
 *   chartType="pie"
 *   data={statusData}
 *   series={[{ name: 'Status', dataKey: 'count' }]}
 * />
 * 
 * // With time range selector
 * <ChartCard
 *   title="Server Metrics"
 *   chartType="area"
 *   data={metricsData}
 *   series={[{ name: 'CPU', dataKey: 'cpu' }]}
 *   timeRange="24h"
 *   onTimeRangeChange={setTimeRange}
 *   showRefresh
 *   onRefresh={handleRefresh}
 * />
 * 
 * // With custom value formatter
 * <ChartCard
 *   title="Memory Usage"
 *   chartType="line"
 *   data={memoryData}
 *   series={[{ name: 'RAM', dataKey: 'ram' }]}
 *   valueFormatter={(value) => `${value} MB`}
 * />
 * 
 * // In monitoring dashboard
 * function MonitoringDashboard() {
 *   const [cpuData, setCpuData] = useState([]);
 *   const [timeRange, setTimeRange] = useState('24h');
 *   
 *   return (
 *     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 *       <ChartCard
 *         title="CPU Usage"
 *         chartType="area"
 *         data={cpuData}
 *         series={[{ name: 'CPU %', dataKey: 'cpu' }]}
 *         timeRange={timeRange}
 *         onTimeRangeChange={setTimeRange}
 *       />
 *       <ChartCard
 *         title="Memory Usage"
 *         chartType="area"
 *         data={memoryData}
 *         series={[{ name: 'RAM %', dataKey: 'ram' }]}
 *         timeRange={timeRange}
 *         onTimeRangeChange={setTimeRange}
 *       />
 *     </div>
 *   );
 * }
 * 
 * // With loading state
 * function ChartWithLoading() {
 *   const [isLoading, setIsLoading] = useState(true);
 *   const [data, setData] = useState([]);
 *   
 *   useEffect(() => {
 *     fetchData().then((d) => {
 *       setData(d);
 *       setIsLoading(false);
 *     });
 *   }, []);
 *   
 *   return (
 *     <ChartCard
 *       title="Data Chart"
 *       data={data}
 *       series={[{ name: 'Value', dataKey: 'value' }]}
 *       isLoading={isLoading}
 *     />
 *   );
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * ChartCard Design System — wpPanel by Breach Rabbit
 * 
 * IMPORTANT: This component uses Recharts and should be lazy-loaded!
 * Add to initial bundle: NO (~150KB Recharts library)
 * Lazy load: YES (only on pages with charts)
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — card background
 * - bg-elevated:    #181818 (dark) / #f0f0f0 (light) — tooltip background
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light) — grid lines
 * - accent:         #3b82f6 (Blue) — default series color
 * - success:        #10b981 (Green)
 * - warning:        #f59e0b (Yellow)
 * - error:          #ef4444 (Red)
 * - info:           #6366f1 (Indigo)
 * 
 * Default Chart Colors (8-color palette):
 * 1. #3b82f6 (Blue)
 * 2. #10b981 (Green)
 * 3. #f59e0b (Yellow)
 * 4. #ef4444 (Red)
 * 5. #6366f1 (Indigo)
 * 6. #8b5cf6 (Purple)
 * 7. #ec4899 (Pink)
 * 8. #06b6d4 (Cyan)
 * 
 * Sizing:
 * - sm: h-[200px] — compact cards
 * - md: h-[300px] — default, dashboard cards
 * - lg: h-[400px] — detailed views
 * - full: h-[500px] — expanded/fullscreen
 * 
 * Border Radius:
 * - Card: rounded-md (6px)
 * - Tooltip: rounded-md (6px)
 * - Buttons: rounded-md (6px)
 * 
 * Transitions:
 * - Card hover: 150ms ease-out
 * - Button hover: 150ms ease-out
 * - Chart animation: Recharts default (300-400ms)
 * 
 * Chart Types:
 * - line: Trend data over time (CPU, RAM, requests)
 * - area: Filled line charts (traffic, bandwidth)
 * - bar: Comparison data (status codes, top URLs)
 * - pie: Distribution data (disk usage, status distribution)
 * 
 * Accessibility:
 * - aria-label on action buttons
 * - Keyboard navigation for time range selector
 * - Focus visible rings
 * - Screen reader friendly labels
 * 
 * Performance:
 * - LAZY LOAD REQUIRED (Recharts ~150KB)
 * - ResponsiveContainer for fluid sizing
 * - CSS-first styling (minimal JS)
 * - Tree-shaken Lucide icons
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - Recharts components styled via CSS variables
 * - Tooltip and legend themed automatically
 * 
 * Common Use Cases in wpPanel:
 * - Monitoring dashboard (CPU, RAM, disk, network)
 * - Site metrics (requests, bandwidth, response time)
 * - HTTP status code distribution
 * - Top URLs/IPs (bar charts)
 * - Backup storage usage (pie chart)
 * - Historical trends (line/area charts)
 */