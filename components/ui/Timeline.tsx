'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Timeline Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Vertical timeline, status indicators, icons, responsive, accessible
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type TimelineVariant = 'default' | 'compact' | 'detailed';
export type TimelineStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending';
export type TimelineOrientation = 'vertical' | 'horizontal';
export type TimelineSize = 'sm' | 'md' | 'lg';

export interface TimelineItem {
  /** Unique identifier */
  id: string;
  
  /** Item title */
  title: string;
  
  /** Item description */
  description?: string;
  
  /** Item timestamp */
  timestamp?: Date | string;
  
  /** Item status */
  status?: TimelineStatus;
  
  /** Custom icon */
  icon?: LucideIcon | React.ReactNode;
  
  /** Custom content */
  content?: React.ReactNode;
  
  /** Metadata (key-value pairs) */
  metadata?: Record<string, string | number>;
}

export interface TimelineProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Timeline items */
  items: TimelineItem[];
  
  /** Timeline variant */
  variant?: TimelineVariant;
  
  /** Timeline orientation */
  orientation?: TimelineOrientation;
  
  /** Timeline size */
  size?: TimelineSize;
  
  /** Show timestamps */
  showTimestamp?: boolean;
  
  /** Show status indicators */
  showStatus?: boolean;
  
  /** Show icons */
  showIcons?: boolean;
  
  /** Show connecting line */
  showLine?: boolean;
  
  /** Reverse order (newest first) */
  reverse?: boolean;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Empty state message */
  emptyMessage?: string;
  
  /** Custom className for items */
  itemClassName?: string;
  
  /** Custom className for content */
  contentClassName?: string;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<TimelineSize, {
  container: string;
  item: string;
  dot: string;
  line: string;
  title: string;
  description: string;
  timestamp: string;
  gap: string;
}> = {
  sm: {
    container: 'gap-4',
    item: 'gap-3',
    dot: 'w-2.5 h-2.5',
    line: 'w-0.5',
    title: 'text-sm',
    description: 'text-xs',
    timestamp: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    container: 'gap-6',
    item: 'gap-4',
    dot: 'w-3 h-3',
    line: 'w-0.5',
    title: 'text-sm',
    description: 'text-sm',
    timestamp: 'text-xs',
    gap: 'gap-2.5',
  },
  lg: {
    container: 'gap-8',
    item: 'gap-5',
    dot: 'w-4 h-4',
    line: 'w-1',
    title: 'text-base',
    description: 'text-sm',
    timestamp: 'text-sm',
    gap: 'gap-3',
  },
};

/**
 * Status configurations (using CSS variables from globals.css)
 */
const statusConfig: Record<TimelineStatus, {
  bg: string;
  border: string;
  text: string;
  line: string;
  icon?: React.ReactNode;
}> = {
  success: {
    bg: 'var(--color-success-subtle)',
    border: 'var(--color-success)',
    text: 'var(--color-success)',
    line: 'var(--color-success)',
  },
  warning: {
    bg: 'var(--color-warning-subtle)',
    border: 'var(--color-warning)',
    text: 'var(--color-warning)',
    line: 'var(--color-warning)',
  },
  error: {
    bg: 'var(--color-error-subtle)',
    border: 'var(--color-error)',
    text: 'var(--color-error)',
    line: 'var(--color-error)',
  },
  info: {
    bg: 'var(--color-info-subtle)',
    border: 'var(--color-info)',
    text: 'var(--color-info)',
    line: 'var(--color-info)',
  },
  neutral: {
    bg: 'var(--color-bg-overlay)',
    border: 'var(--color-border)',
    text: 'var(--color-text-secondary)',
    line: 'var(--color-border)',
  },
  pending: {
    bg: 'var(--color-bg-overlay)',
    border: 'var(--color-border)',
    text: 'var(--color-text-muted)',
    line: 'var(--color-border)',
  },
};

/**
 * Variant configurations
 */
const variantStyles: Record<TimelineVariant, string> = {
  default: '',
  compact: 'density-compact',
  detailed: 'density-detailed',
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Format timestamp to human-readable string
 */
function formatTimestamp(timestamp: Date | string, options?: {
  showDate?: boolean;
  showTime?: boolean;
  relative?: boolean;
}): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  if (options?.relative) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: options?.showDate ? 'numeric' : undefined,
    hour: options?.showTime !== false ? '2-digit' : undefined,
    minute: options?.showTime !== false ? '2-digit' : undefined,
  });
}

// =============================================================================
// 🏗️ TIMELINE ITEM COMPONENT
// =============================================================================

interface TimelineItemComponentProps {
  item: TimelineItem;
  index: number;
  total: number;
  variant: TimelineVariant;
  size: TimelineSize;
  showTimestamp: boolean;
  showStatus: boolean;
  showIcons: boolean;
  showLine: boolean;
  itemClassName?: string;
  contentClassName?: string;
}

function TimelineItemComponent({
  item,
  index,
  total,
  variant,
  size,
  showTimestamp,
  showStatus,
  showIcons,
  showLine,
  itemClassName,
  contentClassName,
}: TimelineItemComponentProps) {
  const sizes = sizeStyles[size];
  const status = item.status || 'neutral';
  const config = statusConfig[status];
  const IconComponent = typeof item.icon === 'function' ? item.icon : null;

  return (
    <div
      className={cn(
        'relative',
        'flex',
        sizes.item,
        variant === 'compact' ? 'items-center' : 'items-start',
        itemClassName
      )}
      data-status={status}
      data-index={index}
    >
      {/* Timeline Dot & Line */}
      <div className="flex flex-col items-center">
        {/* Dot */}
        <div
          className={cn(
            'relative',
            'rounded-full',
            'border-2',
            sizes.dot,
            config.bg,
            config.border,
            // Pending animation
            status === 'pending' && 'animate-pulse'
          )}
          style={{ zIndex: 1 }}
        >
          {/* Icon inside dot */}
          {showIcons && IconComponent && (
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                config.text
              )}
            >
              <IconComponent className="w-full h-full p-0.5" />
            </div>
          )}
          
          {/* Status indicator ring for success/error */}
          {(status === 'success' || status === 'error') && (
            <div
              className={cn(
                'absolute inset-0 rounded-full',
                'border-2',
                status === 'success' ? 'border-success/30' : 'border-error/30',
                'animate-ping',
                'opacity-50'
              )}
              style={{ animationDuration: '2s' }}
            />
          )}
        </div>

        {/* Connecting Line */}
        {showLine && index < total - 1 && (
          <div
            className={cn(
              'flex-1',
              sizes.line,
              config.line,
              'min-h-4',
              'my-1'
            )}
            style={{ minHeight: variant === 'compact' ? '0' : '16px' }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1',
          'min-w-0',
          sizes.gap,
          contentClassName
        )}
      >
        {/* Header: Title + Timestamp */}
        <div className={cn(
          'flex items-center gap-2',
          showTimestamp ? 'justify-between' : 'justify-start'
        )}>
          <h4
            className={cn(
              'font-medium',
              'text-text-primary',
              sizes.title,
              'truncate'
            )}
          >
            {item.title}
          </h4>
          
          {showTimestamp && item.timestamp && (
            <span
              className={cn(
                'font-medium',
                'text-text-muted',
                sizes.timestamp,
                'whitespace-nowrap'
              )}
            >
              {formatTimestamp(item.timestamp, { relative: true })}
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p
            className={cn(
              'text-text-secondary',
              sizes.description,
              'leading-relaxed',
              'mt-0.5'
            )}
          >
            {item.description}
          </p>
        )}

        {/* Metadata */}
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <div className={cn(
            'mt-2',
            'flex flex-wrap gap-2'
          )}>
            {Object.entries(item.metadata).map(([key, value]) => (
              <div
                key={key}
                className={cn(
                  'inline-flex items-center gap-1',
                  'px-2 py-0.5',
                  'rounded-sm',
                  'bg-bg-overlay',
                  'text-xs',
                  'text-text-secondary'
                )}
              >
                <span className="font-medium text-text-muted">{key}:</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Custom Content */}
        {item.content && (
          <div className="mt-2">
            {item.content}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// 🏗️ TIMELINE COMPONENT
// =============================================================================

/**
 * Timeline Component — wpPanel by Breach Rabbit UI
 * 
 * Displays vertical or horizontal timeline of events.
 * Used for backup history, activity logs, deployment history, etc.
 * 
 * @example
 * <Timeline 
 *   items={[
 *     { id: '1', title: 'Backup created', status: 'success', timestamp: new Date() },
 *     { id: '2', title: 'Backup started', status: 'info', timestamp: new Date(Date.now() - 3600000) },
 *   ]} 
 * />
 */
export const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  (
    {
      className,
      items,
      variant = 'default',
      orientation = 'vertical',
      size = 'md',
      showTimestamp = true,
      showStatus = true,
      showIcons = true,
      showLine = true,
      reverse = false,
      isLoading = false,
      emptyMessage = 'No events to display',
      itemClassName,
      contentClassName,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    
    // Process items
    const processedItems = React.useMemo(() => {
      let processed = [...items];
      
      // Reverse if needed
      if (reverse) {
        processed.reverse();
      }
      
      return processed;
    }, [items, reverse]);

    // Loading state
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            'relative',
            'flex flex-col',
            sizes.container,
            className
          )}
          {...props}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                sizes.item,
                'items-start'
              )}
            >
              {/* Skeleton dot */}
              <div className={cn('rounded-full bg-bg-overlay', sizes.dot)} />
              
              {/* Skeleton content */}
              <div className="flex-1 space-y-2">
                <div className={cn('h-4 bg-bg-overlay rounded', sizes.title)} style={{ width: '40%' }} />
                <div className={cn('h-3 bg-bg-overlay rounded', sizes.description)} style={{ width: '70%' }} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Empty state
    if (processedItems.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center',
            'py-12 px-4',
            'text-center',
            className
          )}
          {...props}
        >
          <div
            className={cn(
              'w-12 h-12',
              'rounded-full',
              'bg-bg-overlay',
              'flex items-center justify-center',
              'mb-3'
            )}
          >
            <svg
              className="w-6 h-6 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-text-secondary">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          'flex',
          orientation === 'vertical' ? 'flex-col' : 'flex-row overflow-x-auto',
          sizes.container,
          variantStyles[variant],
          className
        )}
        role="feed"
        aria-label="Timeline"
        {...props}
      >
        {processedItems.map((item, index) => (
          <TimelineItemComponent
            key={item.id}
            item={item}
            index={index}
            total={processedItems.length}
            variant={variant}
            size={size}
            showTimestamp={showTimestamp}
            showStatus={showStatus}
            showIcons={showIcons}
            showLine={showLine}
            itemClassName={itemClassName}
            contentClassName={contentClassName}
          />
        ))}
      </div>
    );
  }
);

// Set display name for debugging
Timeline.displayName = 'Timeline';

// =============================================================================
// 📦 PRE-CONFIGURED TIMELINE HELPERS
// =============================================================================

/**
 * BackupTimeline — Pre-configured for backup history
 */
export interface BackupTimelineProps extends Omit<TimelineProps, 'items' | 'showIcons'> {
  backups: Array<{
    id: string;
    type: 'full' | 'incremental' | 'database' | 'files';
    status: 'completed' | 'running' | 'failed';
    size?: string;
    duration?: string;
    timestamp: Date | string;
  }>;
}

export function BackupTimeline({ backups, ...props }: BackupTimelineProps) {
  const items: TimelineItem[] = backups.map((backup) => ({
    id: backup.id,
    title: `${backup.type === 'full' ? 'Full' : backup.type === 'incremental' ? 'Incremental' : backup.type === 'database' ? 'Database' : 'Files'} Backup`,
    description: backup.status === 'completed' 
      ? `Size: ${backup.size || 'N/A'} • Duration: ${backup.duration || 'N/A'}`
      : backup.status === 'failed'
      ? 'Backup failed to complete'
      : 'Backup in progress...',
    status: backup.status === 'completed' ? 'success' : backup.status === 'failed' ? 'error' : 'pending',
    timestamp: backup.timestamp,
    metadata: backup.size || backup.duration ? {
      ...(backup.size && { Size: backup.size }),
      ...(backup.duration && { Duration: backup.duration }),
    } : undefined,
  }));

  return (
    <Timeline
      items={items}
      showIcons
      showTimestamp
      showLine
      {...props}
    />
  );
}

/**
 * ActivityTimeline — Pre-configured for activity logs
 */
export interface ActivityTimelineProps extends Omit<TimelineProps, 'items'> {
  activities: Array<{
    id: string;
    action: string;
    user?: string;
    resource?: string;
    status?: 'success' | 'warning' | 'error' | 'info';
    timestamp: Date | string;
  }>;
}

export function ActivityTimeline({ activities, ...props }: ActivityTimelineProps) {
  const items: TimelineItem[] = activities.map((activity) => ({
    id: activity.id,
    title: activity.action,
    description: [activity.user, activity.resource].filter(Boolean).join(' • '),
    status: activity.status || 'info',
    timestamp: activity.timestamp,
  }));

  return (
    <Timeline
      items={items}
      showIcons
      showTimestamp
      showLine
      {...props}
    />
  );
}

/**
 * DeploymentTimeline — Pre-configured for deployment history
 */
export interface DeploymentTimelineProps extends Omit<TimelineProps, 'items'> {
  deployments: Array<{
    id: string;
    version: string;
    status: 'success' | 'running' | 'failed' | 'rolled_back';
    environment?: string;
    author?: string;
    timestamp: Date | string;
  }>;
}

export function DeploymentTimeline({ deployments, ...props }: DeploymentTimelineProps) {
  const items: TimelineItem[] = deployments.map((deployment) => ({
    id: deployment.id,
    title: `v${deployment.version}`,
    description: [
      deployment.environment && `Environment: ${deployment.environment}`,
      deployment.author && `By: ${deployment.author}`,
      deployment.status === 'rolled_back' && 'Rolled back to previous version',
    ].filter(Boolean).join(' • '),
    status: deployment.status === 'success' ? 'success' 
      : deployment.status === 'failed' ? 'error'
      : deployment.status === 'rolled_back' ? 'warning'
      : 'pending',
    timestamp: deployment.timestamp,
  }));

  return (
    <Timeline
      items={items}
      showIcons
      showTimestamp
      showLine
      {...props}
    />
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  TimelineProps,
  TimelineItem,
  BackupTimelineProps,
  ActivityTimelineProps,
  DeploymentTimelineProps,
  TimelineVariant,
  TimelineStatus,
  TimelineOrientation,
  TimelineSize,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Timeline, BackupTimeline, ActivityTimeline, DeploymentTimeline } from '@/components/ui/Timeline';
 * import { CheckCircle, XCircle, Clock, Upload, Download, Settings } from 'lucide-react';
 * 
 * // Simple timeline
 * <Timeline 
 *   items={[
 *     { id: '1', title: 'Backup created', status: 'success', timestamp: new Date() },
 *     { id: '2', title: 'Backup started', status: 'info', timestamp: new Date(Date.now() - 3600000) },
 *     { id: '3', title: 'Backup scheduled', status: 'neutral', timestamp: new Date(Date.now() - 7200000) },
 *   ]} 
 * />
 * 
 * // With custom icons
 * import { CheckCircle, XCircle, Clock } from 'lucide-react';
 * 
 * <Timeline 
 *   items={[
 *     { id: '1', title: 'Completed', icon: CheckCircle, status: 'success' },
 *     { id: '2', title: 'Failed', icon: XCircle, status: 'error' },
 *     { id: '3', title: 'Pending', icon: Clock, status: 'pending' },
 *   ]} 
 * />
 * 
 * // With description
 * <Timeline 
 *   items={[
 *     { 
 *       id: '1', 
 *       title: 'Backup completed', 
 *       description: 'Full backup of all files and databases',
 *       status: 'success',
 *       timestamp: new Date()
 *     },
 *   ]} 
 * />
 * 
 * // With metadata
 * <Timeline 
 *   items={[
 *     { 
 *       id: '1', 
 *       title: 'Backup completed', 
 *       status: 'success',
 *       timestamp: new Date(),
 *       metadata: {
 *         Size: '1.2 GB',
 *         Duration: '5m 32s',
 *         Files: '1,234',
 *       }
 *     },
 *   ]} 
 * />
 * 
 * // With custom content
 * <Timeline 
 *   items={[
 *     { 
 *       id: '1', 
 *       title: 'Backup completed', 
 *       status: 'success',
 *       timestamp: new Date(),
 *       content: (
 *         <div className="flex gap-2">
 *           <Button size="sm" variant="secondary">Download</Button>
 *           <Button size="sm" variant="ghost">Restore</Button>
 *         </div>
 *       )
 *     },
 *   ]} 
 * />
 * 
 * // Different sizes
 * <Timeline size="sm" items={items} />
 * <Timeline size="md" items={items} />
 * <Timeline size="lg" items={items} />
 * 
 * // Different variants
 * <Timeline variant="default" items={items} />
 * <Timeline variant="compact" items={items} />
 * <Timeline variant="detailed" items={items} />
 * 
 * // Without timestamps
 * <Timeline showTimestamp={false} items={items} />
 * 
 * // Without connecting line
 * <Timeline showLine={false} items={items} />
 * 
 * // Reverse order (newest first)
 * <Timeline reverse items={items} />
 * 
 * // Loading state
 * <Timeline isLoading items={[]} />
 * 
 * // Empty state
 * <Timeline items={[]} emptyMessage="No backup history yet" />
 * 
 * // Pre-configured: Backup timeline
 * <BackupTimeline 
 *   backups={[
 *     { 
 *       id: '1', 
 *       type: 'full', 
 *       status: 'completed', 
 *       size: '1.2 GB', 
 *       duration: '5m 32s',
 *       timestamp: new Date()
 *     },
 *     { 
 *       id: '2', 
 *       type: 'incremental', 
 *       status: 'completed', 
 *       size: '150 MB', 
 *       duration: '1m 15s',
 *       timestamp: new Date(Date.now() - 86400000)
 *     },
 *   ]} 
 * />
 * 
 * // Pre-configured: Activity timeline
 * <ActivityTimeline 
 *   activities={[
 *     { 
 *       id: '1', 
 *       action: 'Site created', 
 *       user: 'admin@example.com',
 *       resource: 'example.com',
 *       status: 'success',
 *       timestamp: new Date()
 *     },
 *     { 
 *       id: '2', 
 *       action: 'SSL certificate renewed', 
 *       user: 'system',
 *       resource: 'example.com',
 *       status: 'success',
 *       timestamp: new Date(Date.now() - 3600000)
 *     },
 *   ]} 
 * />
 * 
 * // Pre-configured: Deployment timeline
 * <DeploymentTimeline 
 *   deployments={[
 *     { 
 *       id: '1', 
 *       version: '1.2.0', 
 *       status: 'success', 
 *       environment: 'production',
 *       author: 'John Doe',
 *       timestamp: new Date()
 *     },
 *     { 
 *       id: '2', 
 *       version: '1.1.9', 
 *       status: 'rolled_back', 
 *       environment: 'production',
 *       author: 'Jane Smith',
 *       timestamp: new Date(Date.now() - 86400000)
 *     },
 *   ]} 
 * />
 * 
 * // In backup details page
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Backup History</Card.Title>
 *   </Card.Header>
 *   <Card.Content>
 *     <BackupTimeline backups={backups} size="md" />
 *   </Card.Content>
 * </Card>
 * 
 * // In site details page
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Recent Activity</Card.Title>
 *   </Card.Header>
 *   <Card.Content>
 *     <ActivityTimeline activities={activities} size="sm" />
 *   </Card.Content>
 * </Card>
 * 
 * // With real-time updates (WebSocket)
 * function LiveTimeline() {
 *   const {  events } = useWebSocket('/api/events/stream');
 *   
 *   return (
 *     <Timeline 
 *       items={events.map(e => ({
 *         id: e.id,
 *         title: e.title,
 *         description: e.description,
 *         status: e.status,
 *         timestamp: e.timestamp,
 *       }))}
 *       reverse
 *     />
 *   );
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Timeline Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - success: var(--color-success)       #10b981 (Green)
 * - warning: var(--color-warning)       #f59e0b (Yellow/Orange)
 * - error:   var(--color-error)         #ef4444 (Red)
 * - info:    var(--color-info)          #6366f1 (Indigo)
 * - neutral: var(--color-text-secondary) #888888 (Gray)
 * - pending: var(--color-text-muted)    #444444 (Gray)
 * - line:    Matches status color
 * 
 * Sizing:
 * - sm:  gap-4, dot: 10x10px, title: text-xs,  desc: text-xs
 * - md:  gap-6, dot: 12x12px, title: text-sm,  desc: text-sm — DEFAULT
 * - lg:  gap-8, dot: 16x16px, title: text-base, desc: text-sm
 * 
 * Dot Styles:
 * - Border: 2px solid status color
 * - Background: status-subtle color
 * - Pending: animate-pulse
 * - Success/Error: animate-ping ring
 * 
 * Line Styles:
 * - Width: 1-2px based on size
 * - Color: Matches status color
 * - Connects items vertically
 * 
 * Timestamps:
 * - Relative format: "5m ago", "2h ago", "3d ago"
 * - Full format: "Dec 25, 2:30 PM"
 * - Color: text-muted
 * 
 * Accessibility:
 * - role="feed" for timeline container
 * - aria-label for context
 * - Semantic HTML (h4 for titles)
 * - Proper color contrast
 * 
 * Performance:
 * - CSS-first animations (no JS)
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Backup history (BackupTimeline)
 * - Activity logs (ActivityTimeline)
 * - Deployment history (DeploymentTimeline)
 * - SSL certificate history
 * - Site creation/modification history
 * - User action audit log
 * - System update history
 * - Cron job execution history
 * - Firewall rule changes
 * - Database backup/restore history
 */