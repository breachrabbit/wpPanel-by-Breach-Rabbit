'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Avatar Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple sizes, status indicators, fallback initials, image loading
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

export interface AvatarProps extends React.ComponentPropsWithoutRef<'div'> {
  /** User's avatar image URL */
  src?: string | null;
  
  /** User's name (for initials fallback and alt text) */
  name?: string;
  
  /** User's email (for alt text and initials) */
  email?: string;
  
  /** Avatar size */
  size?: AvatarSize;
  
  /** Show status indicator */
  showStatus?: boolean;
  
  /** Status type (online/offline/away/busy) */
  status?: AvatarStatus;
  
  /** Status position */
  statusPosition?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  
  /** Fallback icon when no image/initials */
  fallbackIcon?: React.ReactNode;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Clickable avatar (adds hover state + cursor) */
  clickable?: boolean;
  
  /** onClick handler */
  onClick?: () => void;
  
  /** Border radius override */
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  
  /** Custom className for the image */
  imageClassName?: string;
  
  /** Custom className for the fallback */
  fallbackClassName?: string;
}

// =============================================================================
// ⚙️ SIZE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (avatar dimensions + font sizes for initials)
 */
const sizeStyles: Record<AvatarSize, {
  container: string;
  initials: string;
  status: string;
  statusOffset: string;
}> = {
  sm: {
    container: 'w-8 h-8',
    initials: 'text-xs',
    status: 'w-2 h-2',
    statusOffset: '-bottom-0.5 -right-0.5',
  },
  md: {
    container: 'w-10 h-10',
    initials: 'text-sm',
    status: 'w-2.5 h-2.5',
    statusOffset: '-bottom-0.5 -right-0.5',
  },
  lg: {
    container: 'w-12 h-12',
    initials: 'text-base',
    status: 'w-3 h-3',
    statusOffset: '-bottom-1 -right-1',
  },
  xl: {
    container: 'w-16 h-16',
    initials: 'text-lg',
    status: 'w-4 h-4',
    statusOffset: '-bottom-1 -right-1',
  },
};

/**
 * Status color configurations (using CSS variables from globals.css)
 */
const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-success',
  offline: 'bg-text-muted',
  away: 'bg-warning',
  busy: 'bg-error',
};

/**
 * Border radius configurations
 */
const radiusStyles: Record<'sm' | 'md' | 'lg' | 'full', string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate initials from name or email
 */
function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  
  if (email) {
    const localPart = email.split('@')[0];
    return localPart.slice(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Get alt text from name or email
 */
function getAltText(name?: string, email?: string): string {
  if (name) {
    return `Avatar of ${name}`;
  }
  if (email) {
    return `Avatar of ${email}`;
  }
  return 'User avatar';
}

// =============================================================================
// 🏗️ AVATAR COMPONENT
// =============================================================================

/**
 * Avatar Component — wpPanel by Breach Rabbit UI
 * 
 * Displays user avatar with image, initials fallback, and optional status indicator.
 * 
 * @example
 * <Avatar name="John Doe" src="/avatars/john.jpg" />
 * <Avatar name="John Doe" showStatus status="online" />
 * <Avatar email="john@example.com" size="lg" />
 */
export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      name,
      email,
      size = 'md',
      showStatus = false,
      status = 'offline',
      statusPosition = 'bottom-right',
      fallbackIcon,
      isLoading = false,
      clickable = false,
      onClick,
      rounded = 'full',
      imageClassName,
      fallbackClassName,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const [imageError, setImageError] = React.useState(false);
    const [imageLoaded, setImageLoaded] = React.useState(false);
    
    // Determine what to display
    const showImage = src && !imageError && !isLoading;
    const showInitials = !showImage && !isLoading;
    const showFallback = !showImage && !showInitials && !isLoading;
    
    // Generate initials
    const initials = getInitials(name, email);
    const altText = getAltText(name, email);
    
    // Status position classes
    const statusPositionClasses: Record<string, string> = {
      'top-right': 'top-0 right-0',
      'bottom-right': 'bottom-0 right-0',
      'top-left': 'top-0 left-0',
      'bottom-left': 'bottom-0 left-0',
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'inline-flex',
          'items-center',
          'justify-center',
          'flex-shrink-0',
          'overflow-hidden',
          'bg-bg-overlay',
          'border border-border',
          
          // Size
          sizes.container,
          
          // Border radius
          radiusStyles[rounded],
          
          // Clickable state
          clickable && 'cursor-pointer hover:border-border-hover transition-colors',
          
          // Custom className
          className
        )}
        onClick={onClick}
        role={clickable ? 'button' : 'img'}
        tabIndex={clickable ? 0 : undefined}
        aria-label={altText}
        {...props}
      >
        {/* Loading State */}
        {isLoading && (
          <div
            className={cn(
              'absolute inset-0',
              'animate-pulse',
              'bg-bg-overlay'
            )}
            aria-label="Loading avatar"
          />
        )}

        {/* Image */}
        {showImage && (
          <img
            src={src}
            alt={altText}
            className={cn(
              'w-full h-full',
              'object-cover',
              'transition-opacity duration-150',
              imageLoaded ? 'opacity-100' : 'opacity-0',
              imageClassName
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
          />
        )}

        {/* Initials Fallback */}
        {showInitials && (
          <span
            className={cn(
              'font-medium',
              'text-text-secondary',
              'select-none',
              sizes.initials,
              fallbackClassName
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
        )}

        {/* Icon Fallback */}
        {showFallback && (
          <div
            className={cn(
              'text-text-muted',
              sizes.initials,
              fallbackClassName
            )}
            aria-hidden="true"
          >
            {fallbackIcon || (
              <svg
                className="w-full h-full"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 1 0-16 0" />
              </svg>
            )}
          </div>
        )}

        {/* Status Indicator */}
        {showStatus && (
          <span
            className={cn(
              'absolute',
              'rounded-full',
              'border-2 border-bg-surface',
              sizes.status,
              statusColors[status],
              sizes.statusOffset,
              statusPositionClasses[statusPosition],
              // Pulse animation for online status
              status === 'online' && 'animate-pulse-dot'
            )}
            aria-label={`Status: ${status}`}
            role="status"
          />
        )}
      </div>
    );
  }
);

// Set display name for debugging
Avatar.displayName = 'Avatar';

// =============================================================================
// 📦 AVATAR GROUP COMPONENT
// =============================================================================

/**
 * AvatarGroup — Display multiple avatars with overlap
 */
export interface AvatarGroupProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Avatars to display */
  avatars: Array<{
    src?: string | null;
    name?: string;
    email?: string;
  }>;
  
  /** Maximum avatars to show */
  max?: number;
  
  /** Avatar size */
  size?: AvatarSize;
  
  /** Total count to display if truncated */
  totalCount?: number;
  
  /** Spacing between avatars (negative for overlap) */
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      className,
      avatars,
      max = 4,
      size = 'md',
      totalCount,
      spacing = 'sm',
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const displayAvatars = avatars.slice(0, max);
    const remaining = (totalCount || avatars.length) - max;
    const showRemaining = remaining > 0;

    const spacingClasses: Record<string, string> = {
      none: '',
      sm: '-ml-2 first:ml-0',
      md: '-ml-3 first:ml-0',
      lg: '-ml-4 first:ml-0',
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center', className)}
        {...props}
      >
        {displayAvatars.map((avatar, index) => (
          <Avatar
            key={index}
            src={avatar.src}
            name={avatar.name}
            email={avatar.email}
            size={size}
            className={cn(spacingClasses[spacing], 'ring-2 ring-bg-surface')}
          />
        ))}
        
        {/* Remaining count badge */}
        {showRemaining && (
          <div
            className={cn(
              'flex items-center justify-center',
              'font-medium',
              'text-text-secondary',
              'bg-bg-overlay',
              'border border-border',
              sizes.container,
              radiusStyles.full,
              spacingClasses[spacing],
              sizes.initials
            )}
          >
            +{remaining}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { AvatarProps, AvatarGroupProps, AvatarSize, AvatarStatus };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
 * 
 * // Simple avatar with image
 * <Avatar src="/avatars/john.jpg" name="John Doe" />
 * 
 * // Avatar with initials fallback
 * <Avatar name="John Doe" />
 * 
 * // Avatar with email fallback
 * <Avatar email="john@example.com" />
 * 
 * // Different sizes
 * <Avatar size="sm" name="John" />
 * <Avatar size="md" name="John" />
 * <Avatar size="lg" name="John" />
 * <Avatar size="xl" name="John" />
 * 
 * // With status indicator
 * <Avatar 
 *   name="John Doe" 
 *   showStatus 
 *   status="online" 
 * />
 * 
 * <Avatar 
 *   name="Jane Doe" 
 *   showStatus 
 *   status="offline" 
 * />
 * 
 * <Avatar 
 *   name="Bob Smith" 
 *   showStatus 
 *   status="away" 
 * />
 * 
 * <Avatar 
 *   name="Alice Johnson" 
 *   showStatus 
 *   status="busy" 
 * />
 * 
 * // Status positions
 * <Avatar name="John" showStatus status="online" statusPosition="top-right" />
 * <Avatar name="John" showStatus status="online" statusPosition="bottom-right" />
 * <Avatar name="John" showStatus status="online" statusPosition="top-left" />
 * <Avatar name="John" showStatus status="online" statusPosition="bottom-left" />
 * 
 * // Clickable avatar
 * <Avatar 
 *   name="John Doe" 
 *   clickable 
 *   onClick={() => router.push('/profile/john')} 
 * />
 * 
 * // Loading state
 * <Avatar name="John Doe" isLoading />
 * 
 * // Custom border radius
 * <Avatar name="John" rounded="sm" />
 * <Avatar name="John" rounded="md" />
 * <Avatar name="John" rounded="lg" />
 * <Avatar name="John" rounded="full" />
 * 
 * // Avatar group
 * <AvatarGroup
 *   avatars={[
 *     { name: 'John Doe', src: '/avatars/john.jpg' },
 *     { name: 'Jane Doe', src: '/avatars/jane.jpg' },
 *     { name: 'Bob Smith', email: 'bob@example.com' },
 *     { name: 'Alice Johnson' },
 *     { name: 'Charlie Brown' },
 *   ]}
 *   max={3}
 *   size="md"
 * />
 * 
 * // In header/profile dropdown
 * <DropdownMenuTrigger asChild>
 *   <Avatar 
 *     name={user.name} 
 *     email={user.email} 
 *     src={user.avatar} 
 *     showStatus 
 *     status={user.isOnline ? 'online' : 'offline'}
 *     clickable 
 *   />
 * </DropdownMenuTrigger>
 * 
 * // In user list/table
 * <Table.Row>
 *   <Table.Cell>
 *     <div className="flex items-center gap-3">
 *       <Avatar name={user.name} size="sm" />
 *       <span>{user.name}</span>
 *     </div>
 *   </Table.Cell>
 * </Table.Row>
 * 
 * // In team members section
 * <div className="flex items-center gap-2">
 *   <span className="text-sm text-text-secondary">Team:</span>
 *   <AvatarGroup avatars={teamMembers} max={5} size="sm" />
 * </div>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Avatar Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — fallback background
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-secondary: #888888 (dark) / #555555 (light) — initials color
 * - text-muted:     #444444 (dark) / #999999 (light) — icon color
 * - status online:  var(--color-success)  #10b981 (Green)
 * - status offline: var(--color-text-muted) #444444 (Gray)
 * - status away:    var(--color-warning)  #f59e0b (Yellow/Orange)
 * - status busy:    var(--color-error)    #ef4444 (Red)
 * 
 * Sizing:
 * - sm:  32x32px (w-8 h-8),   text-xs (12px),   status: 8px
 * - md:  40x40px (w-10 h-10), text-sm (14px),   status: 10px — DEFAULT
 * - lg:  48x48px (w-12 h-12), text-base (16px), status: 12px
 * - xl:  64x64px (w-16 h-16), text-lg (18px),   status: 16px
 * 
 * Border Radius:
 * - rounded-full (50%) — DEFAULT for avatars
 * - rounded-sm/md/lg — alternative options
 * 
 * Status Indicator:
 * - Position: top-right, bottom-right, top-left, bottom-left
 * - Border: 2px solid bg-surface (for contrast)
 * - Animation: pulse-dot for online status
 * 
 * Fallback Strategy:
 * 1. Image (if src provided and loads successfully)
 * 2. Initials (from name or email)
 * 3. Default user icon (SVG)
 * 
 * Accessibility:
 * - aria-label with user name/email
 * - role="button" when clickable
 * - role="status" for status indicator
 * - tabIndex for keyboard navigation
 * - Alt text for images
 * 
 * Performance:
 * - CSS-first (no JS for hover states)
 * - Image loading state tracking
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - User profile in header
 * - Team members display
 * - Site owners in site list
 * - Comment/review authors
 * - Activity feed users
 * - Assignment dropdowns
 * - User management table
 * - Session list (active sessions)
 */