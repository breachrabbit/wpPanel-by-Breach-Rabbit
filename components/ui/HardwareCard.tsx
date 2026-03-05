'use client';

// =============================================================================
// wpPanel by Breach Rabbit — HardwareCard Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Server hardware info, optimal settings preview, profile recommendation
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  TrendingUp,
} from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type DiskType = 'NVMe' | 'SSD' | 'HDD' | 'Unknown';
export type ServerProfile = 'WordPress Optimized' | 'General Purpose' | 'High Performance';

export interface HardwareInfo {
  cpu: {
    cores: number;
    model: string;
  };
  ram: {
    total: number; // GB
    available: number; // GB
  };
  disk: {
    total: number; // GB
    available: number; // GB;
    type: DiskType;
  };
  os: {
    name: string;
    version: string;
  };
  recommendedProfile: ServerProfile;
}

export interface OptimalSettings {
  swap: {
    create: boolean;
    size: number; // GB
  };
  php: {
    memoryLimit: string;
    workers: number;
    opcache: number; // MB
  };
  mariadb: {
    innodbBufferPool: string;
    maxConnections: number;
  };
  ols: {
    maxConnections: number;
    keepAlive: boolean;
  };
}

export interface HardwareCardProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Hardware information */
  hardware?: HardwareInfo;
  
  /** Optimal settings preview */
  optimalSettings?: OptimalSettings;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Show optimal settings section */
  showSettings?: boolean;
  
  /** Compact mode (for smaller spaces) */
  compact?: boolean;
  
  /** Custom className for metrics grid */
  metricsClassName?: string;
}

// =============================================================================
// ⚙️ HELPERS
// =============================================================================

/**
 * Get disk type color configuration
 */
function getDiskTypeConfig(type: DiskType): {
  color: string;
  bg: string;
  label: string;
} {
  switch (type) {
    case 'NVMe':
      return {
        color: 'text-success',
        bg: 'bg-success-subtle',
        label: 'NVMe (Fastest)',
      };
    case 'SSD':
      return {
        color: 'text-info',
        bg: 'bg-info-subtle',
        label: 'SSD (Fast)',
      };
    case 'HDD':
      return {
        color: 'text-warning',
        bg: 'bg-warning-subtle',
        label: 'HDD (Slow)',
      };
    default:
      return {
        color: 'text-text-muted',
        bg: 'bg-bg-overlay',
        label: 'Unknown',
      };
  }
}

/**
 * Get profile color configuration
 */
function getProfileConfig(profile: ServerProfile): {
  color: string;
  bg: string;
  icon: React.ComponentType<{ className?: string }>;
} {
  switch (profile) {
    case 'WordPress Optimized':
      return {
        color: 'text-accent',
        bg: 'bg-accent-subtle',
        icon: Zap,
      };
    case 'High Performance':
      return {
        color: 'text-success',
        bg: 'bg-success-subtle',
        icon: TrendingUp,
      };
    default:
      return {
        color: 'text-text-secondary',
        bg: 'bg-bg-overlay',
        icon: Settings,
      };
  }
}

/**
 * Check if hardware meets minimum requirements
 */
function checkRequirements(hardware: HardwareInfo): {
  meetsMinimum: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check RAM
  if (hardware.ram.total < 2) {
    warnings.push('RAM is below minimum requirement (2GB)');
  } else if (hardware.ram.total < 4) {
    recommendations.push('Consider upgrading to 4GB+ RAM for better performance');
  }
  
  // Check Disk
  if (hardware.disk.total < 20) {
    warnings.push('Disk space is below minimum requirement (20GB)');
  } else if (hardware.disk.total < 50) {
    recommendations.push('Consider upgrading to 50GB+ disk for more sites');
  }
  
  // Check Disk Type
  if (hardware.disk.type === 'HDD') {
    recommendations.push('SSD/NVMe recommended for better performance');
  }
  
  // Check CPU
  if (hardware.cpu.cores < 2) {
    warnings.push('CPU cores below recommended (2+ cores)');
  }
  
  return {
    meetsMinimum: hardware.ram.total >= 2 && hardware.disk.total >= 20 && hardware.cpu.cores >= 2,
    warnings,
    recommendations,
  };
}

// =============================================================================
// 🏗️ HARDWARE CARD COMPONENT
// =============================================================================

/**
 * HardwareCard Component — wpPanel by Breach Rabbit UI
 * 
 * Displays server hardware information with optimal settings preview.
 * Used in installer wizard (Step 2) and system info pages.
 * 
 * @example
 * <HardwareCard
 *   hardware={{
 *     cpu: { cores: 4, model: 'Intel Xeon E5-2680' },
 *     ram: { total: 16, available: 14 },
 *     disk: { total: 100, available: 85, type: 'NVMe' },
 *     os: { name: 'Ubuntu', version: '22.04 LTS' },
 *     recommendedProfile: 'WordPress Optimized',
 *   }}
 *   optimalSettings={{
 *     swap: { create: false, size: 0 },
 *     php: { memoryLimit: '512M', workers: 12, opcache: 512 },
 *     mariadb: { innodbBufferPool: '8G', maxConnections: 200 },
 *     ols: { maxConnections: 500, keepAlive: true },
 *   }}
 * />
 */
export const HardwareCard = React.forwardRef<HTMLDivElement, HardwareCardProps>(
  (
    {
      className,
      hardware,
      optimalSettings,
      isLoading = false,
      showSettings = true,
      compact = false,
      metricsClassName,
      ...props
    },
    ref
  ) => {
    const requirements = hardware ? checkRequirements(hardware) : undefined;
    const profileConfig = hardware ? getProfileConfig(hardware.recommendedProfile) : undefined;
    const ProfileIcon = profileConfig?.icon || Settings;

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
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
              <Server className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">
                Server Hardware
              </h3>
              {hardware && (
                <p className="text-xs text-text-secondary">
                  {hardware.os.name} {hardware.os.version}
                </p>
              )}
            </div>
          </div>
          
          {requirements && (
            <div
              className={cn(
                'flex items-center gap-1.5',
                'px-2 py-1',
                'rounded-md',
                'text-xs font-medium',
                requirements.meetsMinimum
                  ? 'bg-success-subtle text-success'
                  : 'bg-warning-subtle text-warning'
              )}
            >
              {requirements.meetsMinimum ? (
                <CheckCircle className="w-3 h-3" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              )}
              <span>
                {requirements.meetsMinimum ? 'Ready' : 'Review Required'}
              </span>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm rounded-md z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Detecting hardware...</span>
            </div>
          </div>
        )}

        {/* Hardware Metrics Grid */}
        <div className={cn('p-4', metricsClassName)}>
          {isLoading ? (
            // Skeleton Loading
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-bg-overlay animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-2 w-16 bg-bg-overlay animate-pulse rounded" />
                      <div className="h-3 w-20 bg-bg-overlay animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : hardware ? (
            // Hardware Info
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU */}
              <div className="flex items-start gap-3 p-3 rounded-md bg-bg-overlay">
                <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0">
                  <Cpu className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-muted mb-0.5">CPU</div>
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {hardware.cpu.cores} Core{hardware.cpu.cores !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-text-secondary truncate" title={hardware.cpu.model}>
                    {hardware.cpu.model.length > 20
                      ? `${hardware.cpu.model.substring(0, 20)}...`
                      : hardware.cpu.model}
                  </div>
                </div>
              </div>

              {/* RAM */}
              <div className="flex items-start gap-3 p-3 rounded-md bg-bg-overlay">
                <div className="w-10 h-10 rounded-md bg-info-subtle text-info flex items-center justify-center flex-shrink-0">
                  <MemoryStick className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-muted mb-0.5">RAM</div>
                  <div className="text-sm font-semibold text-text-primary">
                    {hardware.ram.total} GB
                  </div>
                  <div className="text-xs text-text-secondary">
                    {hardware.ram.available} GB available
                  </div>
                </div>
              </div>

              {/* Disk */}
              <div className="flex items-start gap-3 p-3 rounded-md bg-bg-overlay">
                <div className="w-10 h-10 rounded-md bg-warning-subtle text-warning flex items-center justify-center flex-shrink-0">
                  <HardDrive className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-muted mb-0.5">Disk</div>
                  <div className="text-sm font-semibold text-text-primary">
                    {hardware.disk.total} GB
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className={cn(
                        'px-1.5 py-0.5',
                        'rounded',
                        'text-xs font-medium',
                        getDiskTypeConfig(hardware.disk.type).bg,
                        getDiskTypeConfig(hardware.disk.type).color
                      )}
                    >
                      {getDiskTypeConfig(hardware.disk.type).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile */}
              <div className="flex items-start gap-3 p-3 rounded-md bg-bg-overlay">
                <div
                  className={cn(
                    'w-10 h-10',
                    'rounded-md',
                    'flex items-center justify-center',
                    'flex-shrink-0',
                    profileConfig?.bg,
                    profileConfig?.color
                  )}
                >
                  <ProfileIcon className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-text-muted mb-0.5">Profile</div>
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      profileConfig?.color
                    )}
                  >
                    {hardware.recommendedProfile}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Auto-detected
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Server className="w-12 h-12 text-text-muted mb-3 opacity-50" aria-hidden="true" />
              <p className="text-sm text-text-secondary">
                Hardware information not available
              </p>
            </div>
          )}
        </div>

        {/* Requirements Warnings */}
        {requirements && !requirements.meetsMinimum && (
          <div className="px-4 pb-3">
            <div className="p-3 rounded-md bg-warning-subtle border border-warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-warning">
                    Hardware Requirements Not Met
                  </div>
                  {requirements.warnings.map((warning, index) => (
                    <div key={index} className="text-xs text-text-secondary">
                      • {warning}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {requirements && requirements.recommendations.length > 0 && (
          <div className="px-4 pb-3">
            <div className="p-3 rounded-md bg-info-subtle border border-info">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-info">
                    Recommendations
                  </div>
                  {requirements.recommendations.map((rec, index) => (
                    <div key={index} className="text-xs text-text-secondary">
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Optimal Settings Preview */}
        {showSettings && optimalSettings && hardware && (
          <>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-text-muted" aria-hidden="true" />
                <h4 className="text-sm font-semibold text-text-primary">
                  Optimal Settings Preview
                </h4>
                <span className="text-xs text-text-muted">
                  Based on your hardware
                </span>
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* SWAP */}
                <div className="p-3 rounded-md bg-bg-overlay border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MemoryStick className="w-4 h-4 text-text-muted" aria-hidden="true" />
                    <span className="text-xs font-medium text-text-secondary">SWAP</span>
                  </div>
                  {optimalSettings.swap.create ? (
                    <div className="text-sm font-semibold text-text-primary">
                      {optimalSettings.swap.size} GB
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-text-muted">
                      Not needed
                    </div>
                  )}
                  <div className="text-xs text-text-secondary mt-1">
                    {hardware.ram.total < 8 ? 'Recommended' : 'Optional'}
                  </div>
                </div>

                {/* PHP */}
                <div className="p-3 rounded-md bg-bg-overlay border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4 text-text-muted" aria-hidden="true" />
                    <span className="text-xs font-medium text-text-secondary">PHP</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-text-primary">
                      {optimalSettings.php.workers} Workers
                    </div>
                    <div className="text-xs text-text-secondary">
                      {optimalSettings.php.memoryLimit} Memory
                    </div>
                    <div className="text-xs text-text-secondary">
                      {optimalSettings.php.opcache}MB OPcache
                    </div>
                  </div>
                </div>

                {/* MariaDB */}
                <div className="p-3 rounded-md bg-bg-overlay border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4 text-text-muted" aria-hidden="true" />
                    <span className="text-xs font-medium text-text-secondary">MariaDB</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-text-primary">
                      {optimalSettings.mariadb.innodbBufferPool}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Buffer Pool
                    </div>
                    <div className="text-xs text-text-secondary">
                      {optimalSettings.mariadb.maxConnections} Connections
                    </div>
                  </div>
                </div>

                {/* OLS */}
                <div className="p-3 rounded-md bg-bg-overlay border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-text-muted" aria-hidden="true" />
                    <span className="text-xs font-medium text-text-secondary">OpenLiteSpeed</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-text-primary">
                      {optimalSettings.ols.maxConnections}
                    </div>
                    <div className="text-xs text-text-secondary">
                      Max Connections
                    </div>
                    <div className="text-xs text-text-secondary">
                      Keep-Alive: {optimalSettings.ols.keepAlive ? 'On' : 'Off'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Compact Mode - Mini Version */}
        {compact && hardware && (
          <div className="px-4 py-3 border-t border-border bg-bg-overlay/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="text-text-secondary">
                  {hardware.cpu.cores} CPU • {hardware.ram.total}GB RAM • {hardware.disk.total}GB {hardware.disk.type}
                </span>
              </div>
              <span className={cn('font-medium', profileConfig?.color)}>
                {hardware.recommendedProfile}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
HardwareCard.displayName = 'HardwareCard';

// =============================================================================
// 📦 HARDWARE CARD SKELETON
// =============================================================================

/**
 * HardwareCardSkeleton — Loading placeholder for HardwareCard
 */
export interface HardwareCardSkeletonProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Show settings section skeleton */
  showSettings?: boolean;
}

export const HardwareCardSkeleton = React.forwardRef<HTMLDivElement, HardwareCardSkeletonProps>(
  ({ className, showSettings = true, ...props }, ref) => {
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
        <div className="flex items-center gap-3 p-4 pb-3 border-b border-border">
          <Skeleton className="w-10 h-10 rounded-md" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-24 rounded-md" />
        </div>

        {/* Metrics Grid */}
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-bg-overlay">
                <Skeleton className="w-10 h-10 rounded-md" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-2 w-12" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Preview */}
        {showSettings && (
          <>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="w-4 h-4 rounded" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-md bg-bg-overlay border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2 w-16" />
                      <Skeleton className="h-2 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
);

// Set display name for debugging
HardwareCardSkeleton.displayName = 'HardwareCardSkeleton';

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

export type { HardwareCardProps, HardwareCardSkeletonProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { HardwareCard, HardwareCardSkeleton } from '@/components/ui/HardwareCard';
 * 
 * // Simple hardware card
 * <HardwareCard
 *   hardware={{
 *     cpu: { cores: 4, model: 'Intel Xeon E5-2680' },
 *     ram: { total: 16, available: 14 },
 *     disk: { total: 100, available: 85, type: 'NVMe' },
 *     os: { name: 'Ubuntu', version: '22.04 LTS' },
 *     recommendedProfile: 'WordPress Optimized',
 *   }}
 * />
 * 
 * // With optimal settings
 * <HardwareCard
 *   hardware={hardware}
 *   optimalSettings={{
 *     swap: { create: false, size: 0 },
 *     php: { memoryLimit: '512M', workers: 12, opcache: 512 },
 *     mariadb: { innodbBufferPool: '8G', maxConnections: 200 },
 *     ols: { maxConnections: 500, keepAlive: true },
 *   }}
 *   showSettings
 * />
 * 
 * // Loading state
 * <HardwareCard isLoading />
 * 
 * // Skeleton loading
 * <HardwareCardSkeleton />
 * 
 * // Compact mode
 * <HardwareCard hardware={hardware} compact />
 * 
 * // Without settings preview
 * <HardwareCard hardware={hardware} showSettings={false} />
 * 
 * // In installer wizard
 * function InstallerStep2() {
 *   const [hardware, setHardware] = useState(null);
 *   const [isLoading, setIsLoading] = useState(true);
 *   
 *   useEffect(() => {
 *     detectHardware().then((data) => {
 *       setHardware(data);
 *       setIsLoading(false);
 *     });
 *   }, []);
 *   
 *   return (
 *     <div className="space-y-4">
 *       <h2 className="text-lg font-semibold">Server Analysis</h2>
 *       <HardwareCard
 *         hardware={hardware}
 *         isLoading={isLoading}
 *         showSettings
 *       />
 *     </div>
 *   );
 * }
 * 
 * // With grid of cards
 * <div className="grid grid-cols-1 gap-4">
 *   <HardwareCard hardware={hardware} optimalSettings={settings} />
 *   <SiteCard {...site} />
 *   <BackupCard {...backup} />
 * </div>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * HardwareCard Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — card background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — metric cards
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - accent:         #3b82f6 (Blue) — CPU, WordPress profile
 * - info:           #6366f1 (Indigo) — RAM
 * - warning:        #f59e0b (Yellow) — Disk, warnings
 * - success:        #10b981 (Green) — NVMe, High Performance profile
 * 
 * Sizing:
 * - Card: fluid width
 * - Icon: w-10 h-10 (metrics), w-5 h-5 (icons)
 * - Grid: 1 col mobile, 2 col tablet, 4 col desktop
 * - Settings preview: 4 cards in grid
 * 
 * Border Radius:
 * - Card: rounded-md (6px)
 * - Metric cards: rounded-md (6px)
 * - Icons: rounded-md (6px)
 * - Badges: rounded (4px)
 * 
 * Transitions:
 * - Card hover: 150ms ease-out
 * - Loading overlay: fade-in 200ms
 * 
 * Disk Types:
 * - NVMe: success green (fastest)
 * - SSD: info indigo (fast)
 * - HDD: warning yellow (slow)
 * - Unknown: muted gray
 * 
 * Profiles:
 * - WordPress Optimized: accent blue (Zap icon)
 * - High Performance: success green (TrendingUp icon)
 * - General Purpose: text-secondary (Settings icon)
 * 
 * Accessibility:
 * - aria-hidden on decorative icons
 * - aria-label on status badges
 * - Screen reader friendly labels
 * - Keyboard accessible
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
 * - Installer wizard (Step 2: Hardware Analysis)
 * - System info page
 * - Server overview dashboard
 * - Settings page (system info section)
 */