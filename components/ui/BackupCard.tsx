'use client';

// =============================================================================
// wpPanel by Breach Rabbit — BackupCard Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Backup snapshot info, restore options, size, age, status
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  HardDrive,
  Database,
  FolderOpen,
  Clock,
  Download,
  RotateCcw,
  Trash2,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Loader2,
  Archive,
  FileText,
  Server,
  Calendar,
  Shield,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type BackupType = 'full' | 'incremental' | 'database' | 'files';
export type BackupStatus = 'completed' | 'running' | 'failed' | 'pending';
export type BackupStorage = 'local' | 's3' | 'sftp' | 'b2';

export interface BackupCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Backup snapshot ID */
  backupId: string;
  
  /** Backup name/label */
  name: string;
  
  /** Backup type */
  type: BackupType;
  
  /** Backup status */
  status: BackupStatus;
  
  /** Storage location */
  storage: BackupStorage;
  
  /** Backup size in bytes */
  sizeBytes: number;
  
  /** Uncompressed size in bytes */
  uncompressedSizeBytes?: number;
  
  /** Created at timestamp */
  createdAt: string;
  
  /** Completed at timestamp */
  completedAt?: string;
  
  /** Number of files */
  filesCount?: number;
  
  /** Number of databases */
  databasesCount?: number;
  
  /** Site ID (if associated) */
  siteId?: string;
  
  /** Site name (if associated) */
  siteName?: string;
  
  /** Retention days */
  retentionDays?: number;
  
  /** Expires at timestamp */
  expiresAt?: string;
  
  /** Is this backup protected (can't be deleted) */
  isProtected?: boolean;
  
  /** Compression ratio */
  compressionRatio?: number;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** On restore backup */
  onRestore?: (backupId: string) => void;
  
  /** On download backup */
  onDownload?: (backupId: string) => void;
  
  /** On delete backup */
  onDelete?: (backupId: string) => void;
  
  /** On view files */
  onViewFiles?: (backupId: string) => void;
  
  /** On navigate to site */
  onNavigateToSite?: (siteId: string) => void;
}

// =============================================================================
// ⚙️ HELPERS
// =============================================================================

/**
 * Get status color configuration
 */
function getStatusConfig(status: BackupStatus): {
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  animated: boolean;
} {
  switch (status) {
    case 'completed':
      return {
        color: 'text-success',
        bg: 'bg-success-subtle',
        border: 'border-success',
        label: 'Completed',
        icon: CheckCircle,
        animated: false,
      };
    case 'running':
      return {
        color: 'text-info',
        bg: 'bg-info-subtle',
        border: 'border-info',
        label: 'Running',
        icon: Loader2,
        animated: true,
      };
    case 'failed':
      return {
        color: 'text-error',
        bg: 'bg-error-subtle',
        border: 'border-error',
        label: 'Failed',
        icon: AlertCircle,
        animated: false,
      };
    case 'pending':
      return {
        color: 'text-warning',
        bg: 'bg-warning-subtle',
        border: 'border-warning',
        label: 'Pending',
        icon: Clock,
        animated: false,
      };
  }
}

/**
 * Get backup type configuration
 */
function getTypeConfig(type: BackupType): {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
} {
  switch (type) {
    case 'full':
      return {
        label: 'Full Backup',
        icon: Archive,
        color: 'text-accent',
      };
    case 'incremental':
      return {
        label: 'Incremental',
        icon: FileText,
        color: 'text-info',
      };
    case 'database':
      return {
        label: 'Database Only',
        icon: Database,
        color: 'text-success',
      };
    case 'files':
      return {
        label: 'Files Only',
        icon: FolderOpen,
        color: 'text-warning',
      };
  }
}

/**
 * Get storage configuration
 */
function getStorageConfig(storage: BackupStorage): {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (storage) {
    case 'local':
      return {
        label: 'Local',
        icon: HardDrive,
      };
    case 's3':
      return {
        label: 'S3',
        icon: Server,
      };
    case 'sftp':
      return {
        label: 'SFTP',
        icon: Shield,
      };
    case 'b2':
      return {
        label: 'Backblaze B2',
        icon: Archive,
      };
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

/**
 * Calculate compression ratio percentage
 */
function calculateCompressionRatio(compressed: number, uncompressed: number): number {
  if (uncompressed === 0) return 0;
  return Math.round((1 - (compressed / uncompressed)) * 100);
}

// =============================================================================
// 🏗️ BACKUP CARD COMPONENT
// =============================================================================

/**
 * BackupCard Component — wpPanel by Breach Rabbit UI
 * 
 * Displays backup snapshot information with status, size, age, and actions.
 * 
 * @example
 * <BackupCard
 *   backupId="snap-abc123"
 *   name="Daily Backup"
 *   type="full"
 *   status="completed"
 *   storage="local"
 *   sizeBytes={1250000000}
 *   createdAt={new Date().toISOString()}
 *   siteName="Example Site"
 *   onRestore={(id) => handleRestore(id)}
 *   onDelete={(id) => handleDelete(id)}
 * />
 */
export const BackupCard = React.forwardRef<HTMLDivElement, BackupCardProps>(
  (
    {
      className,
      backupId,
      name,
      type,
      status,
      storage,
      sizeBytes,
      uncompressedSizeBytes,
      createdAt,
      completedAt,
      filesCount,
      databasesCount,
      siteId,
      siteName,
      retentionDays,
      expiresAt,
      isProtected = false,
      compressionRatio,
      isLoading = false,
      onRestore,
      onDownload,
      onDelete,
      onViewFiles,
      onNavigateToSite,
      ...props
    },
    ref
  ) => {
    const statusConfig = getStatusConfig(status);
    const typeConfig = getTypeConfig(type);
    const storageConfig = getStorageConfig(storage);
    
    const StatusIcon = statusConfig.icon;
    const TypeIcon = typeConfig.icon;
    const StorageIcon = storageConfig.icon;
    
    const calculatedCompression = compressionRatio ?? (
      uncompressedSizeBytes ? calculateCompressionRatio(sizeBytes, uncompressedSizeBytes) : undefined
    );

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
          status === 'failed' ? 'border-error' :
          status === 'running' ? 'border-info' :
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
          {/* Backup Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Type Icon */}
            <div
              className={cn(
                'flex items-center justify-center',
                'w-10 h-10',
                'rounded-md',
                'flex-shrink-0',
                type === 'full' ? 'bg-accent-subtle text-accent' :
                type === 'incremental' ? 'bg-info-subtle text-info' :
                type === 'database' ? 'bg-success-subtle text-success' :
                'bg-warning-subtle text-warning'
              )}
            >
              <TypeIcon className="w-5 h-5" aria-hidden="true" />
            </div>

            {/* Name & Details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-primary truncate mb-0.5">
                {name}
              </h3>
              
              {/* Site Association */}
              {siteName && (
                <button
                  onClick={() => onNavigateToSite?.(siteId!)}
                  className={cn(
                    'text-xs',
                    'text-text-secondary hover:text-accent',
                    'transition-colors',
                    'truncate',
                    'text-left'
                  )}
                  title={`View site: ${siteName}`}
                >
                  {siteName}
                </button>
              )}
              
              {/* Storage & Age */}
              <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                <div className="flex items-center gap-1">
                  <StorageIcon className="w-3 h-3" aria-hidden="true" />
                  <span>{storageConfig.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  <span>{getRelativeTime(createdAt)}</span>
                </div>
              </div>
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
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Backup actions"
                disabled={isLoading || status === 'running'}
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
                    'cursor-pointer',
                    (isLoading || status === 'running') && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => onViewFiles?.(backupId)}
                  disabled={isLoading || status === 'running'}
                >
                  <FolderOpen className="w-4 h-4" />
                  View Files
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
                    'cursor-pointer',
                    (isLoading || status !== 'completed') && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => onDownload?.(backupId)}
                  disabled={isLoading || status !== 'completed'}
                >
                  <Download className="w-4 h-4" />
                  Download
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
                    'cursor-pointer',
                    (isLoading || status !== 'completed') && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => onRestore?.(backupId)}
                  disabled={isLoading || status !== 'completed'}
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1" />
                <DropdownMenu.Item
                  className={cn(
                    'flex items-center gap-2',
                    'px-3 py-2',
                    'rounded-sm',
                    'text-sm',
                    isProtected ? 'text-text-muted' : 'text-error',
                    'hover:bg-error-subtle hover:text-error',
                    'focus:outline-none focus:bg-error-subtle focus:text-error',
                    'cursor-pointer',
                    (isLoading || isProtected) && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => onDelete?.(backupId)}
                  disabled={isLoading || isProtected}
                >
                  <Trash2 className="w-4 h-4" />
                  {isProtected ? 'Protected' : 'Delete'}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {/* Status Badge */}
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
              <StatusIcon className={cn('w-3 h-3 animate-spin')} aria-hidden="true" />
            )}
            {!statusConfig.animated && (
              <StatusIcon className="w-3 h-3" aria-hidden="true" />
            )}
            <span>{statusConfig.label}</span>
          </div>

          {/* Type Badge */}
          <div
            className={cn(
              'flex items-center gap-1',
              'px-2 py-1',
              'rounded-md',
              'text-xs font-medium',
              'bg-bg-overlay',
              typeConfig.color
            )}
          >
            <TypeIcon className="w-3 h-3" aria-hidden="true" />
            <span>{typeConfig.label}</span>
          </div>

          {/* Protected Badge */}
          {isProtected && (
            <div
              className={cn(
                'flex items-center gap-1',
                'px-2 py-1',
                'rounded-md',
                'text-xs font-medium',
                'bg-warning-subtle',
                'text-warning'
              )}
              title="This backup is protected and cannot be deleted"
            >
              <Shield className="w-3 h-3" aria-hidden="true" />
              <span>Protected</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-3">
          {/* Size */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
              <HardDrive className="w-4 h-4 text-text-muted" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-text-muted">Size</div>
              <div className="text-sm font-medium text-text-primary truncate">
                {formatBytes(sizeBytes)}
              </div>
              {calculatedCompression !== undefined && calculatedCompression > 0 && (
                <div className="text-xs text-success">
                  -{calculatedCompression}% compressed
                </div>
              )}
            </div>
          </div>

          {/* Files/Databases */}
          {(filesCount !== undefined || databasesCount !== undefined) && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
                {databasesCount !== undefined ? (
                  <Database className="w-4 h-4 text-text-muted" aria-hidden="true" />
                ) : (
                  <FolderOpen className="w-4 h-4 text-text-muted" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-text-muted">
                  {databasesCount !== undefined ? 'Databases' : 'Files'}
                </div>
                <div className="text-sm font-medium text-text-primary truncate">
                  {databasesCount !== undefined 
                    ? databasesCount 
                    : filesCount !== undefined 
                      ? filesCount.toLocaleString() 
                      : '—'}
                </div>
              </div>
            </div>
          )}

          {/* Retention */}
          {retentionDays !== undefined && expiresAt && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-text-muted" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted">Retention</div>
                  <div className="text-sm font-medium text-text-primary truncate">
                    {retentionDays} days
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-text-muted" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-text-muted">Expires</div>
                  <div className={cn(
                    'text-sm font-medium truncate',
                    new Date(expiresAt) < new Date(Date.now() + 7 * 86400000) 
                      ? 'text-warning' 
                      : 'text-text-primary'
                  )}>
                    {new Date(expiresAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 px-4 py-3 mt-auto border-t border-border">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRestore?.(backupId)}
            disabled={isLoading || status !== 'completed'}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="flex-1"
          >
            Restore
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload?.(backupId)}
            disabled={isLoading || status !== 'completed'}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download
          </Button>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm rounded-md">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Processing...</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
BackupCard.displayName = 'BackupCard';

// =============================================================================
// 📦 BACKUP CARD SKELETON
// =============================================================================

/**
 * BackupCardSkeleton — Loading placeholder for BackupCard
 */
export interface BackupCardSkeletonProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Show metrics section */
  showMetrics?: boolean;
}

export const BackupCardSkeleton = React.forwardRef<HTMLDivElement, BackupCardSkeletonProps>(
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
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>

        {/* Metrics */}
        {showMetrics && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-md" />
                <div className="space-y-1">
                  <Skeleton className="h-2 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    );
  }
);

// Set display name for debugging
BackupCardSkeleton.displayName = 'BackupCardSkeleton';

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

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { BackupCardProps, BackupCardSkeletonProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { BackupCard, BackupCardSkeleton } from '@/components/ui/BackupCard';
 * 
 * // Simple backup card
 * <BackupCard
 *   backupId="snap-abc123"
 *   name="Daily Backup"
 *   type="full"
 *   status="completed"
 *   storage="local"
 *   sizeBytes={1250000000}
 *   createdAt={new Date().toISOString()}
 * />
 * 
 * // With site association
 * <BackupCard
 *   backupId="snap-def456"
 *   name="Site Backup"
 *   type="full"
 *   status="completed"
 *   storage="s3"
 *   sizeBytes={2500000000}
 *   createdAt={new Date().toISOString()}
 *   siteId="1"
 *   siteName="Example Site"
 *   onNavigateToSite={(id) => router.push(`/dashboard/sites/${id}`)}
 * />
 * 
 * // With all metrics
 * <BackupCard
 *   backupId="snap-ghi789"
 *   name="Full Backup"
 *   type="full"
 *   status="completed"
 *   storage="local"
 *   sizeBytes={1250000000}
 *   uncompressedSizeBytes={5000000000}
 *   createdAt={new Date().toISOString()}
 *   filesCount={15234}
 *   databasesCount={3}
 *   retentionDays={30}
 *   expiresAt={new Date(Date.now() + 30 * 86400000).toISOString()}
 *   isProtected={true}
 * />
 * 
 * // With actions
 * <BackupCard
 *   backupId="snap-jkl012"
 *   name="Daily Backup"
 *   type="full"
 *   status="completed"
 *   storage="local"
 *   sizeBytes={1250000000}
 *   createdAt={new Date().toISOString()}
 *   onRestore={(id) => handleRestore(id)}
 *   onDownload={(id) => handleDownload(id)}
 *   onDelete={(id) => handleDelete(id)}
 *   onViewFiles={(id) => handleViewFiles(id)}
 * />
 * 
 * // Running backup
 * <BackupCard
 *   backupId="snap-mno345"
 *   name="Backup in Progress"
 *   type="full"
 *   status="running"
 *   storage="local"
 *   sizeBytes={0}
 *   createdAt={new Date().toISOString()}
 *   isLoading={true}
 * />
 * 
 * // Failed backup
 * <BackupCard
 *   backupId="snap-pqr678"
 *   name="Failed Backup"
 *   type="full"
 *   status="failed"
 *   storage="s3"
 *   sizeBytes={0}
 *   createdAt={new Date().toISOString()}
 * />
 * 
 * // Skeleton loading
 * <BackupCardSkeleton />
 * 
 * // Grid of backup cards
 * <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *   {backups.map(backup => (
 *     <BackupCard key={backup.id} {...backup} />
 *   ))}
 * </div>
 * 
 * // With mixed loading states
 * <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *   {isLoading ? (
 *     Array.from({ length: 6 }).map((_, i) => (
 *       <BackupCardSkeleton key={i} />
 *     ))
 *   ) : (
 *     backups.map(backup => (
 *       <BackupCard key={backup.id} {...backup} />
 *     ))
 *   )}
 * </div>
 * 
 * // Different backup types
 * <BackupCard type="full" />
 * <BackupCard type="incremental" />
 * <BackupCard type="database" />
 * <BackupCard type="files" />
 * 
 * // Different storage types
 * <BackupCard storage="local" />
 * <BackupCard storage="s3" />
 * <BackupCard storage="sftp" />
 * <BackupCard storage="b2" />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * BackupCard Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — card background
 * - bg-elevated:    #181818 (dark) / #f0f0f0 (light) — dropdown background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — metric icons
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - success:        #10b981 (Green) — completed status
 * - warning:        #f59e0b (Yellow) — pending/protected
 * - error:          #ef4444 (Red) — failed status
 * - info:           #6366f1 (Indigo) — running status
 * - accent:         #3b82f6 (Blue) — primary actions
 * 
 * Sizing:
 * - Card: fluid width, consistent height for grid
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
 * - completed: green badge + checkmark
 * - running: info badge + spinning loader
 * - failed: red border + error badge
 * - pending: yellow badge + clock
 * 
 * Backup Types:
 * - full: accent blue (Archive icon)
 * - incremental: info indigo (FileText icon)
 * - database: success green (Database icon)
 * - files: warning yellow (FolderOpen icon)
 * 
 * Storage Types:
 * - local: HardDrive icon
 * - s3: Server icon
 * - sftp: Shield icon
 * - b2: Archive icon
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
 * - Backup list page (grid layout)
 * - Site backup history
 * - Restore selection modal
 * - Backup schedule overview
 */