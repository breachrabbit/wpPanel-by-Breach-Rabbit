'use client';

// =============================================================================
// wpPanel by Breach Rabbit — EmptyState Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, icons, actions, responsive, accessible
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type EmptyStateVariant = 'default' | 'success' | 'warning' | 'error';
export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateIconType = 'icon' | 'illustration' | 'image' | 'none';

export interface EmptyStateProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Empty state variant (visual style) */
  variant?: EmptyStateVariant;
  
  /** Empty state size */
  size?: EmptyStateSize;
  
  /** Icon component (Lucide icon) */
  icon?: LucideIcon;
  
  /** Custom icon element (for illustrations/images) */
  customIcon?: React.ReactNode;
  
  /** Icon type */
  iconType?: EmptyStateIconType;
  
  /** Title text */
  title?: string;
  
  /** Description text */
  description?: string;
  
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  
  /** Hide icon */
  hideIcon?: boolean;
  
  /** Center content */
  centered?: boolean;
  
  /** Full width */
  fullWidth?: boolean;
  
  /** Custom className for the icon */
  iconClassName?: string;
  
  /** Custom className for the title */
  titleClassName?: string;
  
  /** Custom className for the description */
  descriptionClassName?: string;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<EmptyStateSize, {
  container: string;
  icon: string;
  title: string;
  description: string;
  gap: string;
}> = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-10 h-10',
    title: 'text-base',
    description: 'text-sm',
    gap: 'gap-3',
  },
  md: {
    container: 'py-12 px-6',
    icon: 'w-14 h-14',
    title: 'text-lg',
    description: 'text-sm',
    gap: 'gap-4',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-20 h-20',
    title: 'text-xl',
    description: 'text-base',
    gap: 'gap-5',
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<EmptyStateVariant, {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
}> = {
  default: {
    icon: 'var(--color-bg-overlay)',
    iconColor: 'var(--color-text-muted)',
    title: 'var(--color-text-primary)',
    description: 'var(--color-text-secondary)',
  },
  success: {
    icon: 'var(--color-success-subtle)',
    iconColor: 'var(--color-success)',
    title: 'var(--color-text-primary)',
    description: 'var(--color-text-secondary)',
  },
  warning: {
    icon: 'var(--color-warning-subtle)',
    iconColor: 'var(--color-warning)',
    title: 'var(--color-text-primary)',
    description: 'var(--color-text-secondary)',
  },
  error: {
    icon: 'var(--color-error-subtle)',
    iconColor: 'var(--color-error)',
    title: 'var(--color-text-primary)',
    description: 'var(--color-text-secondary)',
  },
};

// =============================================================================
// 🎨 DEFAULT ICONS FOR COMMON SCENARIOS
// =============================================================================

/**
 * Pre-configured icon mappings for common empty states
 */
export const EmptyStateIcons = {
  // Data states
  NoData: 'FolderOpen',
  NoResults: 'Search',
  NoItems: 'Inbox',
  NoFiles: 'FileText',
  NoSites: 'Globe',
  NoDatabases: 'Database',
  NoBackups: 'HardDrive',
  NoUsers: 'Users',
  NoNotifications: 'Bell',
  NoMessages: 'MessageSquare',
  
  // Success states
  AllDone: 'CheckCircle',
  Completed: 'CheckCircle2',
  Success: 'Check',
  
  // Warning states
  Warning: 'AlertTriangle',
  Caution: 'AlertCircle',
  
  // Error states
  Error: 'XCircle',
  NotFound: 'SearchX',
  Blocked: 'ShieldAlert',
  
  // Actions
  Upload: 'Upload',
  Create: 'Plus',
  Add: 'PlusCircle',
  Connect: 'Link',
  Setup: 'Settings',
  
  // Features
  Terminal: 'Terminal',
  Code: 'Code',
  Security: 'Shield',
  Stats: 'BarChart3',
  Calendar: 'Calendar',
  Clock: 'Clock',
  Lock: 'Lock',
  Unlock: 'LockOpen',
} as const;

// =============================================================================
// 🏗️ EMPTY STATE COMPONENT
// =============================================================================

/**
 * EmptyState Component — wpPanel by Breach Rabbit UI
 * 
 * Displays when there's no content to show. Provides context and actions.
 * Used for empty lists, no results, first-time setup, etc.
 * 
 * @example
 * <EmptyState 
 *   icon={Inbox} 
 *   title="No sites yet" 
 *   description="Create your first site to get started"
 *   action={{ label: 'Create Site', onClick: handleCreate }}
 * />
 */
export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      icon: IconComponent,
      customIcon,
      iconType = 'icon',
      title = 'No data available',
      description,
      action,
      secondaryAction,
      hideIcon = false,
      centered = true,
      fullWidth = true,
      iconClassName,
      titleClassName,
      descriptionClassName,
      children,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];

    // Render icon based on type
    const renderIcon = () => {
      if (hideIcon || iconType === 'none') {
        return null;
      }

      if (iconType === 'custom' && customIcon) {
        return (
          <div
            className={cn(sizes.icon, iconClassName)}
            aria-hidden="true"
          >
            {customIcon}
          </div>
        );
      }

      if (IconComponent) {
        return (
          <div
            className={cn(
              'flex items-center justify-center',
              'rounded-full',
              sizes.icon
            )}
            style={{ 
              backgroundColor: variantStyle.icon,
              color: variantStyle.iconColor,
            }}
            aria-hidden="true"
          >
            <IconComponent 
              className={cn('w-full h-full', 'p-2.5')} 
            />
          </div>
        );
      }

      // Default fallback icon
      return (
        <div
          className={cn(
            'flex items-center justify-center',
            'rounded-full',
            sizes.icon
          )}
          style={{ 
            backgroundColor: variantStyle.icon,
            color: variantStyle.iconColor,
          }}
          aria-hidden="true"
        >
          <svg
            className="w-full h-full p-2.5"
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
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex flex-col',
          
          // Alignment
          centered && 'items-center justify-center text-center',
          !centered && 'items-start text-left',
          
          // Size
          sizes.container,
          sizes.gap,
          
          // Width
          fullWidth && 'w-full',
          
          // Custom className
          className
        )}
        role="status"
        aria-label={title}
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {/* Icon */}
        {!hideIcon && renderIcon()}

        {/* Content */}
        <div className={cn('flex flex-col', sizes.gap)}>
          {/* Title */}
          {title && (
            <h3
              className={cn(
                'font-semibold',
                'leading-tight',
                sizes.title,
                titleClassName
              )}
              style={{ color: variantStyle.title }}
            >
              {title}
            </h3>
          )}

          {/* Description */}
          {description && (
            <p
              className={cn(
                'leading-relaxed',
                sizes.description,
                descriptionClassName
              )}
              style={{ color: variantStyle.description }}
            >
              {description}
            </p>
          )}

          {/* Children (custom content) */}
          {children}

          {/* Actions */}
          {(action || secondaryAction) && (
            <div className={cn(
              'flex items-center gap-2',
              'flex-wrap',
              centered && 'justify-center',
              !centered && 'justify-start',
              'mt-2'
            )}>
              {action && (
                <button
                  onClick={action.onClick}
                  className={cn(
                    // Base
                    'inline-flex items-center justify-center',
                    'px-4 py-2',
                    'rounded-md',
                    'text-sm font-medium',
                    'transition-all duration-150 ease-out',
                    'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
                    
                    // Variants
                    action.variant === 'primary' && cn(
                      'bg-accent text-white',
                      'hover:bg-accent-hover',
                      'active:scale-[0.98]'
                    ),
                    action.variant === 'secondary' && cn(
                      'bg-bg-overlay text-text-primary',
                      'border border-border',
                      'hover:bg-bg-elevated hover:border-border-hover',
                    ),
                    action.variant === 'ghost' && cn(
                      'bg-transparent text-text-primary',
                      'hover:bg-bg-overlay',
                    ),
                  )}
                >
                  {action.label}
                </button>
              )}

              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className={cn(
                    // Base
                    'inline-flex items-center justify-center',
                    'px-4 py-2',
                    'rounded-md',
                    'text-sm font-medium',
                    'transition-all duration-150 ease-out',
                    'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
                    
                    // Variants
                    secondaryAction.variant === 'primary' && cn(
                      'bg-accent text-white',
                      'hover:bg-accent-hover',
                      'active:scale-[0.98]'
                    ),
                    secondaryAction.variant === 'secondary' && cn(
                      'bg-bg-overlay text-text-primary',
                      'border border-border',
                      'hover:bg-bg-elevated hover:border-border-hover',
                    ),
                    secondaryAction.variant === 'ghost' && cn(
                      'bg-transparent text-text-primary',
                      'hover:bg-bg-overlay',
                    ),
                  )}
                >
                  {secondaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

// Set display name for debugging
EmptyState.displayName = 'EmptyState';

// =============================================================================
// 📦 PRE-CONFIGURED EMPTY STATE HELPERS
// =============================================================================

/**
 * NoData — Generic empty state for no data
 */
export function NoData(props: Omit<EmptyStateProps, 'icon' | 'title'>) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No data available"
      description="There's no data to display at the moment"
      {...props}
    />
  );
}

/**
 * NoResults — Empty state for search with no results
 */
export function NoResults(props: Omit<EmptyStateProps, 'icon' | 'title'>) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search terms or filters"
      {...props}
    />
  );
}

/**
 * NoSites — Empty state for sites list
 */
export function NoSites(props: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon={Globe}
      title="No sites yet"
      description="Create your first site to get started"
      {...props}
    />
  );
}

/**
 * NoBackups — Empty state for backups list
 */
export function NoBackups(props: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon={HardDrive}
      title="No backups yet"
      description="Create your first backup to protect your data"
      {...props}
    />
  );
}

/**
 * NoNotifications — Empty state for notifications
 */
export function NoNotifications(props: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      description="You're all caught up!"
      {...props}
    />
  );
}

/**
 * FirstTimeSetup — Empty state for first-time setup
 */
export function FirstTimeSetup(props: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon={Settings}
      title="Let's get started"
      description="Complete the setup to start using wpPanel"
      variant="success"
      {...props}
    />
  );
}

/**
 * AccessDenied — Empty state for permission errors
 */
export function AccessDenied(props: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon={Lock}
      title="Access denied"
      description="You don't have permission to view this content"
      variant="error"
      {...props}
    />
  );
}

/**
 * NotFound — Empty state for 404 pages
 */
export function NotFound(props: Omit<EmptyStateProps, 'icon' | 'title' | 'description'>) {
  return (
    <EmptyState
      icon={SearchX}
      title="Page not found"
      description="The page you're looking for doesn't exist"
      variant="warning"
      {...props}
    />
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { EmptyStateProps, EmptyStateVariant, EmptyStateSize, EmptyStateIconType };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { EmptyState, NoData, NoResults, NoSites, NoBackups } from '@/components/ui/EmptyState';
 * import { Inbox, Search, Globe, HardDrive } from 'lucide-react';
 * 
 * // Simple empty state
 * <EmptyState 
 *   title="No items" 
 *   description="There are no items to display" 
 * />
 * 
 * // With icon
 * <EmptyState 
 *   icon={Inbox} 
 *   title="No messages" 
 *   description="Your inbox is empty" 
 * />
 * 
 * // With action button
 * <EmptyState 
 *   icon={Globe} 
 *   title="No sites yet" 
 *   description="Create your first site to get started"
 *   action={{ 
 *     label: 'Create Site', 
 *     onClick: handleCreate 
 *   }} 
 * />
 * 
 * // With two action buttons
 * <EmptyState 
 *   icon={HardDrive} 
 *   title="No backups" 
 *   description="Set up automatic backups to protect your data"
 *   action={{ 
 *     label: 'Create Backup', 
 *     onClick: handleBackup,
 *     variant: 'primary'
 *   }}
 *   secondaryAction={{ 
 *     label: 'Learn More', 
 *     onClick: handleLearnMore,
 *     variant: 'ghost'
 *   }}
 * />
 * 
 * // Different sizes
 * <EmptyState size="sm" title="Small" />
 * <EmptyState size="md" title="Medium" />
 * <EmptyState size="lg" title="Large" />
 * 
 * // Different variants
 * <EmptyState variant="default" title="Default" />
 * <EmptyState variant="success" title="Success" />
 * <EmptyState variant="warning" title="Warning" />
 * <EmptyState variant="error" title="Error" />
 * 
 * // Without icon
 * <EmptyState hideIcon title="No icon" />
 * 
 * // Left aligned (not centered)
 * <EmptyState centered={false} title="Left aligned" />
 * 
 * // Pre-configured helpers
 * <NoData />
 * <NoResults />
 * <NoSites 
 *   action={{ label: 'Create Site', onClick: handleCreate }} 
 * />
 * <NoBackups 
 *   action={{ label: 'Create Backup', onClick: handleBackup }} 
 * />
 * <NoNotifications />
 * <FirstTimeSetup 
 *   action={{ label: 'Start Setup', onClick: handleSetup }} 
 * />
 * <AccessDenied 
 *   action={{ label: 'Contact Admin', onClick: handleContact }} 
 * />
 * <NotFound 
 *   action={{ label: 'Go Home', onClick: handleHome }} 
 * />
 * 
 * // In list rendering
 * function SiteList({ sites }) {
 *   if (sites.length === 0) {
 *     return (
 *       <NoSites 
 *         action={{ 
 *           label: 'Create Site', 
 *           onClick: () => router.push('/sites/new') 
 *         }} 
 *       />
 *     );
 *   }
 *   
 *   return (
 *     <ul>
 *       {sites.map(site => <SiteItem key={site.id} site={site} />)}
 *     </ul>
 *   );
 * }
 * 
 * // In search results
 * function SearchResults({ results, query }) {
 *   if (results.length === 0 && query) {
 *     return <NoResults />;
 *   }
 *   
 *   if (results.length === 0) {
 *     return <NoData />;
 *   }
 *   
 *   return <ResultsList results={results} />;
 * }
 * 
 * // In card container
 * <Card>
 *   <Card.Header>
 *     <Card.Title>Backups</Card.Title>
 *   </Card.Header>
 *   <Card.Content>
 *     {backups.length === 0 ? (
 *       <NoBackups 
 *         action={{ label: 'Create Backup', onClick: handleBackup }} 
 *       />
 *     ) : (
 *       <BackupList backups={backups} />
 *     )}
 *   </Card.Content>
 * </Card>
 * 
 * // Custom illustration
 * <EmptyState 
 *   iconType="custom"
 *   customIcon={
 *     <svg viewBox="0 0 200 200" className="w-full h-full">
 *       {/* Custom SVG illustration */}
 *     </svg>
 *   }
 *   title="Welcome to wpPanel"
 * />
 * 
 * // With custom content
 * <EmptyState 
 *   icon={Terminal}
 *   title="Terminal Ready"
 *   description="Connect to start managing your server"
 * >
 *   <div className="mt-4 p-3 bg-bg-overlay rounded-md">
 *     <code className="text-text-muted text-xs">
 *       $ ssh admin@your-server.com
 *     </code>
 *   </div>
 * </EmptyState>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * EmptyState Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - default:
 *   - icon bg: var(--color-bg-overlay)      #202020
 *   - icon:    var(--color-text-muted)      #444444
 *   - title:   var(--color-text-primary)    #f0f0f0
 *   - desc:    var(--color-text-secondary)  #888888
 * 
 * - success:
 *   - icon bg: var(--color-success-subtle)  rgba(16,185,129,0.10)
 *   - icon:    var(--color-success)         #10b981
 * 
 * - warning:
 *   - icon bg: var(--color-warning-subtle)  rgba(245,158,11,0.10)
 *   - icon:    var(--color-warning)         #f59e0b
 * 
 * - error:
 *   - icon bg: var(--color-error-subtle)    rgba(239,68,68,0.10)
 *   - icon:    var(--color-error)           #ef4444
 * 
 * Sizing:
 * - sm:  py-8 px-4,  icon: 40x40px, title: text-base (16px)
 * - md:  py-12 px-6, icon: 56x56px, title: text-lg (18px)  — DEFAULT
 * - lg:  py-16 px-8, icon: 80x80px, title: text-xl (20px)
 * 
 * Border Radius:
 * - Icon container: rounded-full (50%)
 * - Action buttons: rounded-md (6px)
 * 
 * Spacing:
 * - sm:  gap-3 (12px)
 * - md:  gap-4 (16px)
 * - lg:  gap-5 (20px)
 * 
 * Typography:
 * - Title: font-semibold, leading-tight
 * - Description: leading-relaxed, text-secondary color
 * 
 * Accessibility:
 * - role="status" for screen readers
 * - aria-label with title
 * - aria-hidden for decorative icons
 * - Focus visible ring on action buttons
 * - Proper heading hierarchy (h3 for title)
 * 
 * Performance:
 * - CSS-first (no JS for hover/focus states)
 * - Tree-shaken Lucide icons
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Empty site list (first time)
 * - Empty backup list
 * - Empty database list
 * - Empty cron job list
 * - Empty firewall rules
 * - Empty notifications
 * - Search with no results
 * - 404 pages
 * - Permission denied pages
 * - First-time setup prompts
 * - Feature not available states
 */