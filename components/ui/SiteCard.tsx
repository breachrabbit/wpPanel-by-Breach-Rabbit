'use client';

// =============================================================================
// wpPanel by Breach Rabbit — SiteCard Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Site status, SSL status, metrics, quick actions
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Globe,
  Shield,
  Zap,
  Activity,
  MoreVertical,
  Play,
  Square,
  RotateCcw,
  Settings,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Server,
  Lock,
  Unlock,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type SiteStatus = 'running' | 'stopped' | 'error' | 'maintenance';
export type SslStatus = 'active' | 'expiring' | 'expired' | 'none';

export interface SiteCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Site ID */
  siteId: string;
  
  /** Site name */
  name: string;
  
  /** Domain name */
  domain: string;
  
  /** Site status */
  status: SiteStatus;
  
  /** SSL status */
  sslStatus: SslStatus;
  
  /** SSL expiry date (optional) */
  sslExpiryDate?: string;
  
  /** PHP version */
  phpVersion: string;
  
  /** Site type */
  type: 'wordpress' | 'static' | 'php' | 'nodejs' | 'proxy' | 'docker';
  
  /** Requests per day */
  requestsDay?: number;
  
  /** Bandwidth per day (bytes) */
  bandwidthDay?: number;
  
  /** Average response time (ms) */
  responseTime?: number;
  
  /** Disk usage (bytes) */
  diskUsage?: number;
  
  /** Disk limit (bytes) */
  diskLimit?: number;
  
  /** Is site favorite */
  isFavorite?: boolean;
  
  /** Last backup date */
  lastBackupAt?: string;
  
  /** Auto-restart enabled */
  autoRestart?: boolean;
  
  /** Health check enabled */
  healthCheck?: boolean;
  
  /** Health status */
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  
  /** Loading state */
  isLoading?: boolean;
  
  /** On start site */
  onStart?: (siteId: string) => void;
  
  /** On stop site */
  onStop?: (siteId: string) => void;
  
  /** On restart site */
  onRestart?: (siteId: string) => void;
  
  /** On toggle favorite */
  onToggleFavorite?: (siteId: string) => void;
  
  /** On navigate to site details */
  onNavigate?: (siteId: string) => void;
  
  /** On open settings */
  onSettings?: (siteId: string) => void;
  
  /** On delete site */
  onDelete?: (siteId: string) => void;
  
  /** On visit site */
  onVisit?: (domain: string) => void;
}

// =============================================================================
// ⚙️ HELPERS
// =============================================================================

/**
 * Get status color configuration
 */
function getStatusConfig(status: SiteStatus): {
  color: string;
  bg: string;
  border: string;
  label: string;
  animated: boolean;
} {
  switch (status) {
    case 'running':
      return {
        color: 'text-success',
        bg: 'bg-success-subtle',
        border: 'border-success',
        label: 'Running',
        animated: true,
      };
    case 'stopped':
      return {
        color: 'text-text-muted',
        bg: 'bg-bg-overlay',
        border: 'border-border',
        label: 'Stopped',
        animated: false,
      };
    case 'error':
      return {
        color: 'text-error',
        bg: 'bg-error-subtle',
        border: 'border-error',
        label: 'Error',
        animated: false,
      };
    case 'maintenance':
      return {
        color: 'text-warning',
        bg: 'bg-warning-subtle',
        border: 'border-warning',
        label: 'Maintenance',
        animated: false,
      };
  }
}

/**
 * Get SSL status color configuration
 */
function getSslStatusConfig(sslStatus: SslStatus): {
  color: string;
  bg: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (sslStatus) {
    case 'active':
      return {
        color: 'text-success',
        bg: 'bg-success-subtle',
        label: 'Active',
        icon: Lock,
      };
    case 'expiring':
      return {
        color: 'text-warning',
        bg: 'bg-warning-subtle',
        label: 'Expiring',
        icon: AlertTriangle,
      };
    case 'expired':
      return {
        color: 'text-error',
        bg: 'bg-error-subtle',
        label: 'Expired',
        icon: Unlock,
      };
    case 'none':
      return {
        color: 'text-text-muted',
        bg: 'bg-bg-overlay',
        label: 'None',
        icon: Unlock,
      };
  }
}

/**
 * Get site type icon
 */
function getTypeIcon(type: string): React.ComponentType<{ className?: string }> {
  switch (type) {
    case 'wordpress':
      return Globe;
    case 'static':
      return FileText;
    case 'php':
      return Server;
    case 'nodejs':
      return Activity;
    case 'proxy':
      return Globe;
    case 'docker':
      return Server;
    default:
      return Globe;
  }
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format number with K/M suffix
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Get relative time
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// =============================================================================
// 🏗️ SITE CARD COMPONENT
// =============================================================================

/**
 * SiteCard Component — wpPanel by Breach Rabbit UI
 * 
 * Displays site information with status, SSL, metrics, and quick actions.
 * 
 * @example
 * <SiteCard
 *   siteId="1"
 *   name="Example Site"
 *   domain="example.com"
 *   status="running"
 *   sslStatus="active"
 *   phpVersion="8.3"
 *   type="wordpress"
 *   requestsDay={15234}
 *   onNavigate={(id) => router.push(`/dashboard/sites/${id}`)}
 * />
 */
export const SiteCard = React.forwardRef<HTMLDivElement, SiteCardProps>(
  (
    {
      className,
      siteId,
      name,
      domain,
      status,
      sslStatus,
      sslExpiryDate,
      phpVersion,
      type,
      requestsDay,
      bandwidthDay,
      responseTime,
      diskUsage,
      diskLimit,
      isFavorite = false,
      lastBackupAt,
      autoRestart = false,
      healthCheck = false,
      healthStatus = 'unknown',
      isLoading = false,
      onStart,
      onStop,
      onRestart,
      onToggleFavorite,
      onNavigate,
      onSettings,
      onDelete,
      onVisit,
      ...props
    },
    ref
  ) => {
    const statusConfig = getStatusConfig(status);
    const sslConfig = getSslStatusConfig(sslStatus);
    const TypeIcon = getTypeIcon(type);
    
    const isRunning = status === 'running';
    const canInteract = !isLoading && (status === 'running' || status === 'stopped');

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex flex-col',
          'rounded-md',
          'border',
          'bg-bg-surface',
          'transition-all duration-150 ease-out',
          
          // Border based on status
          status === 'error' ? 'border-error' :
          status === 'maintenance' ? 'border-warning' :
          'border-border',
          
          // Hover state
          'hover:border-border-hover',
          'hover:shadow-md',
          
          // Loading state
          isLoading && 'opacity-50 pointer-events-none',
          
          // Custom className
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          {/* Site Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type Icon */}
            <div
              className={cn(
                'flex items-center justify-center',
                'w-10 h-10',
                'rounded-md',
                'flex-shrink-0',
                type === 'wordpress' ? 'bg-wordpress-subtle text-wordpress' :
                type === 'static' ? 'bg-info-subtle text-info' :
                type === 'php' ? 'bg-accent-subtle text-accent' :
                'bg-bg-overlay text-text-secondary'
              )}
            >
              <TypeIcon className="w-5 h-5" aria-hidden="true" />
            </div>

            {/* Name & Domain */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {name}
                </h3>
                {isFavorite && (
                  <span className="text-warning" aria-label="Favorite">
                    ★
                  </span>
                )}
              </div>
              <button
                onClick={() => onVisit?.(domain)}
                className={cn(
                  'text-xs',
                  'text-text-secondary hover:text-accent',
                  'transition-colors',
                  'truncate',
                  'text-left'
                )}
                title={domain}
              >
                {domain}
              </button>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Site actions"
              >
                <MoreVertical className="w-4 h-4" aria-hidden="true" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className={cn(
                  'z-50',
                  'min-w-[180px]',
                  'bg-bg-elevated',
                  'border border-border',
                  'rounded-md',
                  'shadow-elevated',
                  'p-1',
                  'animate-slide-up'
                )}
                sideOffset={8}
              >
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-2',
                    'px-3 py-2',
                    'rounded-sm',
                    'text-sm',
                    'text-text-secondary',
                    'hover:bg-bg-overlay hover:text-text-primary',
                    'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                    'cursor-pointer'
                  )}
                  onClick={() => onNavigate?.(siteId)}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-2',
                    'px-3 py-2',
                    'rounded-sm',
                    'text-sm',
                    'text-text-secondary',
                    'hover:bg-bg-overlay hover:text-text-primary',
                    'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                    'cursor-pointer'
                  )}
                  onClick={() => onVisit?.(domain)}
                >
                  <Globe className="w-4 h-4" />
                  Visit Site
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-2',
                    'px-3 py-2',
                    'rounded-sm',
                    'text-sm',
                    'text-text-secondary',
                    'hover:bg-bg-overlay hover:text-text-primary',
                    'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                    'cursor-pointer'
                  )}
                  onClick={() => onSettings?.(siteId)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-2',
                    'px-3 py-2',
                    'rounded-sm',
                    'text-sm',
                    'text-text-secondary',
                    'hover:bg-bg-overlay hover:text-text-primary',
                    'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                    'cursor-pointer'
                  )}
                  onClick={() => onToggleFavorite?.(siteId)}
                >
                  {isFavorite ? (
                    <>
                      <StarOff className="w-4 h-4" />
                      Remove Favorite
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      Add to Favorites
                    </>
                  )}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1" />
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-2',
                    'px-3 py-2',
                    'rounded-sm',
                    'text-sm',
                    'text-error',
                    'hover:bg-error-subtle hover:text-error',
                    'focus:outline-none focus:bg-error-subtle focus:text-error',
                    'cursor-pointer'
                  )}
                  onClick={() => onDelete?.(siteId)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {/* Site Status */}
          <div
            className={cn(
              'flex items-center gap-1.5',
              'px-2 py-1',
              'rounded-md',
              'text-xs font-medium',
              statusConfig.bg,
              statusConfig.color,
              'border',
              statusConfig.border
            )}
          >
            {statusConfig.animated && (
              <span
                className={cn(
                  'w-1.5 h-1.5',
                  'rounded-full',
                  statusConfig.color.replace('text-', 'bg-'),
                  'animate-pulse-dot'
                )}
                aria-hidden="true"
              />
            )}
            <span>{statusConfig.label}</span>
          </div>

          {/* SSL Status */}
          <div
            className={cn(
              'flex items-center gap-1',
              'px-2 py-1',
              'rounded-md',
              'text-xs font-medium',
              sslConfig.bg,
              sslConfig.color
            )}
            title={sslExpiryDate ? `Expires: ${new Date(sslExpiryDate).toLocaleDateString()}` : undefined}
          >
            <sslConfig.icon className="w-3 h-3" aria-hidden="true" />
            <span>{sslConfig.label}</span>
          </div>

          {/* PHP Version */}
          <div
            className={cn(
              'flex items-center gap-1',
              'px-2 py-1',
              'rounded-md',
              'text-xs font-medium',
              'bg-bg-overlay',
              'text-text-secondary'
            )}
          >
            <Server className="w-3 h-3" aria-hidden="true" />
            <span>PHP {phpVersion}</span>
          </div>
        </div>

        {/* Metrics */}
        {(requestsDay !== undefined || bandwidthDay !== undefined || responseTime !== undefined || diskUsage !== undefined) && (
          <div className="grid grid-cols-2 gap-3 px-4 pb-3">
            {/* Requests */}
            {requestsDay !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-text-muted" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted">Requests/Day</div>
                  <div className="text-sm font-medium text-text-primary truncate">
                    {formatNumber(requestsDay)}
                  </div>
                </div>
              </div>
            )}

            {/* Bandwidth */}
            {bandwidthDay !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-text-muted" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted">Bandwidth/Day</div>
                  <div className="text-sm font-medium text-text-primary truncate">
                    {formatBytes(bandwidthDay)}
                  </div>
                </div>
              </div>
            )}

            {/* Response Time */}
            {responseTime !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-text-muted" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted">Response Time</div>
                  <div
                    className={cn(
                      'text-sm font-medium truncate',
                      responseTime < 200 ? 'text-success' :
                      responseTime < 500 ? 'text-warning' :
                      'text-error'
                    )}
                  >
                    {responseTime}ms
                  </div>
                </div>
              </div>
            )}

            {/* Disk Usage */}
            {diskUsage !== undefined && diskLimit !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
                  <Server className="w-4 h-4 text-text-muted" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-muted">Disk Usage</div>
                  <div className="text-sm font-medium text-text-primary truncate">
                    {formatBytes(diskUsage)} / {formatBytes(diskLimit)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Health & Backup Info */}
        {(healthCheck || lastBackupAt) && (
          <div className="flex items-center gap-4 px-4 pb-3 text-xs text-text-muted">
            {healthCheck && (
              <div className="flex items-center gap-1">
                {healthStatus === 'healthy' ? (
                  <CheckCircle className="w-3 h-3 text-success" aria-hidden="true" />
                ) : healthStatus === 'unhealthy' ? (
                  <AlertTriangle className="w-3 h-3 text-warning" aria-hidden="true" />
                ) : (
                  <Clock className="w-3 h-3" aria-hidden="true" />
                )}
                <span>
                  {healthStatus === 'healthy' ? 'Healthy' :
                   healthStatus === 'unhealthy' ? 'Unhealthy' :
                   'Checking'}
                </span>
              </div>
            )}
            
            {lastBackupAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span>Last backup: {getRelativeTime(lastBackupAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 px-4 py-3 mt-auto border-t border-border">
          {isRunning ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onStop?.(siteId)}
                disabled={!canInteract}
                leftIcon={<Square className="w-3.5 h-3.5" />}
                className="flex-1"
              >
                Stop
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRestart?.(siteId)}
                disabled={!canInteract}
                className="h-9 w-9 p-0"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStart?.(siteId)}
              disabled={!canInteract}
              leftIcon={<Play className="w-3.5 h-3.5" />}
              className="flex-1"
            >
              Start
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSettings?.(siteId)}
            className="h-9 w-9 p-0"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm rounded-md">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Loading...</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
SiteCard.displayName = 'SiteCard';

// =============================================================================
// 📦 SITE CARD SKELETON
// =============================================================================

/**
 * SiteCardSkeleton — Loading placeholder for SiteCard
 */
export interface SiteCardSkeletonProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Show metrics section */
  showMetrics?: boolean;
}

export const SiteCardSkeleton = React.forwardRef<HTMLDivElement, SiteCardSkeletonProps>(
  ({ className, showMetrics = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          'rounded-md',
          'border border-border',
          'bg-bg-surface',
          'p-4',
          'animate-shimmer',
          className
        )}
        {...props}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>

        {/* Metrics */}
        {showMetrics && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-2 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
    );
  }
);

// Set display name for debugging
SiteCardSkeleton.displayName = 'SiteCardSkeleton';

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

/**
 * Button — Simplified button for card actions
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

function Button({
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  fullWidth = false,
  children,
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: 'h-9 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
  };

  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-bg-overlay text-text-primary border border-border hover:bg-bg-elevated',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-overlay hover:text-text-primary',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center',
        'font-medium',
        'rounded-md',
        'transition-all duration-150 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
    </button>
  );
}

// Import icons for favorite actions
import { Star, StarOff, FileText } from 'lucide-react';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { SiteCardProps, SiteCardSkeletonProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { SiteCard, SiteCardSkeleton } from '@/components/ui/SiteCard';
 * 
 * // Simple site card
 * <SiteCard
 *   siteId="1"
 *   name="Example Site"
 *   domain="example.com"
 *   status="running"
 *   sslStatus="active"
 *   phpVersion="8.3"
 *   type="wordpress"
 * />
 * 
 * // With metrics
 * <SiteCard
 *   siteId="1"
 *   name="Example Site"
 *   domain="example.com"
 *   status="running"
 *   sslStatus="active"
 *   phpVersion="8.3"
 *   type="wordpress"
 *   requestsDay={15234}
 *   bandwidthDay={1250000000}
 *   responseTime={245}
 *   diskUsage={2500000000}
 *   diskLimit={10000000000}
 * />
 * 
 * // With actions
 * <SiteCard
 *   siteId="1"
 *   name="Example Site"
 *   domain="example.com"
 *   status="running"
 *   sslStatus="active"
 *   phpVersion="8.3"
 *   type="wordpress"
 *   onStart={(id) => handleStart(id)}
 *   onStop={(id) => handleStop(id)}
 *   onRestart={(id) => handleRestart(id)}
 *   onNavigate={(id) => router.push(`/dashboard/sites/${id}`)}
 *   onSettings={(id) => router.push(`/dashboard/sites/${id}/settings`)}
 *   onDelete={(id) => handleDelete(id)}
 *   onVisit={(domain) => window.open(`https://${domain}`, '_blank')}
 * />
 * 
 * // Loading state
 * <SiteCard
 *   siteId="1"
 *   name="Example Site"
 *   domain="example.com"
 *   status="running"
 *   sslStatus="active"
 *   phpVersion="8.3"
 *   type="wordpress"
 *   isLoading={true}
 * />
 * 
 * // Skeleton loading
 * <SiteCardSkeleton />
 * 
 * // Grid of cards
 * <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *   {sites.map(site => (
 *     <SiteCard key={site.id} {...site} />
 *   ))}
 * </div>
 * 
 * // With mixed loading states
 * <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *   {isLoading ? (
 *     Array.from({ length: 6 }).map((_, i) => (
 *       <SiteCardSkeleton key={i} />
 *     ))
 *   ) : (
 *     sites.map(site => (
 *       <SiteCard key={site.id} {...site} />
 *     ))
 *   )}
 * </div>
 * 
 * // Different status states
 * <SiteCard status="running" sslStatus="active" />
 * <SiteCard status="stopped" sslStatus="active" />
 * <SiteCard status="error" sslStatus="expired" />
 * <SiteCard status="maintenance" sslStatus="expiring" />
 * 
 * // Different site types
 * <SiteCard type="wordpress" />
 * <SiteCard type="static" />
 * <SiteCard type="php" />
 * <SiteCard type="nodejs" />
 * <SiteCard type="proxy" />
 * <SiteCard type="docker" />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * SiteCard Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — card background
 * - bg-elevated:    #181818 (dark) / #f0f0f0 (light) — dropdown background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — metric icons
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - success:        #10b981 (Green) — running status
 * - warning:        #f59e0b (Yellow) — maintenance/expiring
 * - error:          #ef4444 (Red) — error/expired
 * - accent:         #3b82f6 (Blue) — primary actions
 * - wordpress:      #21759b — WordPress type
 * 
 * Sizing:
 * - Card: fluid width, min-h for consistent grid
 * - Icon: w-10 h-10 (type), w-8 h-8 (metrics)
 * - Status badges: px-2 py-1, text-xs
 * - Actions: h-9 (buttons)
 * 
 * Border Radius:
 * - Card: rounded-md (6px)
 * - Icons: rounded-md (6px)
 * - Buttons: rounded-md (6px)
 * - Badges: rounded-md (6px)
 * 
 * Transitions:
 * - Card hover: 150ms ease-out
 * - Button hover: 150ms ease-out
 * - Dropdown: slide-up 200ms ease
 * 
 * Status States:
 * - running: green + pulsing dot
 * - stopped: gray (neutral)
 * - error: red border + badge
 * - maintenance: yellow border + badge
 * 
 * SSL States:
 * - active: green lock icon
 * - expiring: yellow warning icon
 * - expired: red unlock icon
 * - none: gray unlock icon
 * 
 * Accessibility:
 * - aria-label on action buttons
 * - aria-hidden on decorative icons
 * - Keyboard navigation for dropdown
 * - Focus visible rings
 * - Screen reader friendly status labels
 * 
 * Performance:
 * - CSS-first (no JS for hover states)
 * - Lucide icons tree-shaken
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Dashboard site list (grid layout)
 * - Sites list page (grid or list)
 * - Site selection dropdowns
 * - Backup source selection
 * - SSL certificate site list
 */