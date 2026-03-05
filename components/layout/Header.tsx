'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Header Component
// =============================================================================
// Next.js 16.1 — Client Component
// Top navigation bar with search, notifications, theme toggle, and profile
// Features: Responsive, theme-aware, keyboard navigation, accessibility
// =============================================================================

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/providers/theme';
import { cn } from '@/lib/utils';
import {
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Github,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface HeaderProps {
  /** On mobile menu click */
  onMenuClick?: () => void;
  
  /** Show mobile menu button */
  showMenuButton?: boolean;
  
  /** Custom className */
  className?: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  avatar?: string;
}

// =============================================================================
// ⚙️ MOCK DATA (Replace with real API calls)
// =============================================================================

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'SSL Certificate Expiring',
    message: 'blog.example.com certificate expires in 5 days',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    action: { label: 'Renew', href: '/dashboard/ssl' },
  },
  {
    id: '2',
    type: 'error',
    title: 'Site Down',
    message: 'api.example.com is not responding to health checks',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    read: false,
    action: { label: 'View', href: '/dashboard/sites/3' },
  },
  {
    id: '3',
    type: 'info',
    title: 'Backup Completed',
    message: 'Daily backup completed successfully',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
  {
    id: '4',
    type: 'success',
    title: 'Update Available',
    message: 'wpPanel v1.2.0 is available for update',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    read: true,
    action: { label: 'Update', href: '/dashboard/settings' },
  },
];

const MOCK_USER: UserProfile = {
  name: 'Admin',
  email: 'admin@example.com',
  role: 'ADMIN',
};

// =============================================================================
// 🏗️ HEADER COMPONENT
// =============================================================================

/**
 * Header — Top navigation bar with search, notifications, theme toggle, and profile
 * 
 * @example
 * <Header
 *   onMenuClick={() => setMobileOpen(true)}
 *   showMenuButton={isMobile}
 * />
 */
export function Header({
  onMenuClick,
  showMenuButton = false,
  className,
}: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notifications, setNotifications] = React.useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [user] = React.useState<UserProfile>(MOCK_USER);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle theme toggle (cycle: dark → light → system → dark)
  const handleThemeToggle = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('system');
    } else {
      setTheme('dark');
    }
  };

  // Get theme icon
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  // Handle mark all notifications as read
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Handle dismiss notification
  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <TooltipProvider>
      <header
        className={cn(
          // Base styles
          'sticky',
          'top-0',
          'z-40',
          'h-14',
          'flex',
          'items-center',
          'gap-4',
          'px-4',
          'border-b',
          'border-border',
          'bg-bg-base',
          'backdrop-blur-sm',
          
          // Custom className
          className
        )}
        role="banner"
      >
        {/* Mobile Menu Button */}
        {showMenuButton && onMenuClick && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </Button>
        )}

        {/* Logo (Mobile only) */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-bold text-text-primary">wpPanel</span>
        </div>

        {/* Search Bar */}
        <div className={cn(
          'flex-1',
          'max-w-xl',
          'hidden',
          'md:block'
        )}>
          <div
            className={cn(
              // Base
              'relative',
              'flex',
              'items-center',
              'transition-all',
              'duration-150',
              'ease-out',
              
              // Focus state
              isSearchFocused && 'ring-2 ring-accent ring-offset-2 ring-offset-bg-base'
            )}
          >
            <Search
              className={cn(
                'absolute',
                'left-3',
                'w-4',
                'h-4',
                'text-text-muted',
                'transition-colors',
                isSearchFocused && 'text-accent'
              )}
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                'w-full',
                'pl-9',
                'bg-bg-overlay',
                'border-0',
                'focus:ring-0',
                'placeholder:text-text-muted'
              )}
              aria-label="Search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={cn(
                  'absolute',
                  'right-3',
                  'flex',
                  'items-center',
                  'justify-center',
                  'w-5',
                  'h-5',
                  'rounded',
                  'text-text-muted',
                  'hover:text-text-primary',
                  'hover:bg-bg-base',
                  'transition-colors'
                )}
                aria-label="Clear search"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile Search Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 md:hidden"
                aria-label="Search"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search</TooltipContent>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleThemeToggle}
                aria-label={`Theme: ${theme}. Click to change`}
              >
                <ThemeIcon className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {theme === 'dark' && 'Dark theme (click for Light)'}
              {theme === 'light' && 'Light theme (click for System)'}
              {theme === 'system' && 'System theme (click for Dark)'}
            </TooltipContent>
          </Tooltip>

          {/* Documentation Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hidden sm:flex"
                onClick={() => window.open('https://docs.wppanel.dev', '_blank')}
                aria-label="Documentation"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Documentation</TooltipContent>
          </Tooltip>

          {/* GitHub Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hidden sm:flex"
                onClick={() => window.open('https://github.com/breach-rabbit/wppanel', '_blank')}
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <NotificationsDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={handleMarkAllRead}
            onDismiss={handleDismissNotification}
          />

          {/* User Profile */}
          <UserDropdown user={user} />
        </div>
      </header>
    </TooltipProvider>
  );
}

// =============================================================================
// 📦 NOTIFICATIONS DROPDOWN
// =============================================================================

interface NotificationsDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

function NotificationsDropdown({
  notifications,
  unreadCount,
  onMarkAllRead,
  onDismiss,
}: NotificationsDropdownProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                'relative',
                unreadCount > 0 && 'text-accent'
              )}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className={cn(
                    'absolute',
                    '-top-1',
                    '-right-1',
                    'min-w-[1.25rem]',
                    'h-5',
                    'px-1.5',
                    'text-xs',
                    'rounded-full',
                    'bg-error',
                    'text-white',
                    'border-2',
                    'border-bg-base'
                  )}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          'w-80',
          'max-h-[400px]',
          'overflow-hidden'
        )}
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-accent hover:underline"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[320px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="w-8 h-8 text-text-muted mb-2 opacity-50" />
              <p className="text-sm text-text-secondary">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDismiss={() => onDismiss(notification.id)}
              />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// 📦 NOTIFICATION ITEM
// =============================================================================

interface NotificationItemProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const Icon = {
    info: Info,
    warning: AlertTriangle,
    error: AlertTriangle,
    success: CheckCircle,
  }[notification.type];

  const colorClass = {
    info: 'text-info',
    warning: 'text-warning',
    error: 'text-error',
    success: 'text-success',
  }[notification.type];

  const bgClass = {
    info: 'bg-info-subtle',
    warning: 'bg-warning-subtle',
    error: 'bg-error-subtle',
    success: 'bg-success-subtle',
  }[notification.type];

  return (
    <DropdownMenuItem
      className={cn(
        'flex',
        'items-start',
        'gap-3',
        'p-3',
        'cursor-pointer',
        !notification.read && 'bg-bg-overlay',
        'focus:bg-bg-overlay',
        'focus:text-text-primary'
      )}
    >
      <div
        className={cn(
          'flex',
          'items-center',
          'justify-center',
          'w-8',
          'h-8',
          'rounded-md',
          'flex-shrink-0',
          bgClass,
          colorClass
        )}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm',
            'font-medium',
            'text-text-primary',
            !notification.read && 'font-semibold'
          )}>
            {notification.title}
          </p>
          <button
            onClick={onDismiss}
            className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-muted">
            {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!notification.read && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </div>
        {notification.action && (
          <a
            href={notification.action.href}
            className="inline-flex items-center gap-1 mt-2 text-xs text-accent hover:underline"
          >
            {notification.action.label}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </DropdownMenuItem>
  );
}

// =============================================================================
// 📦 USER DROPDOWN
// =============================================================================

interface UserDropdownProps {
  user: UserProfile;
}

function UserDropdown({ user }: UserDropdownProps) {
  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8',
            'px-2',
            'gap-2',
            'hidden',
            'sm:flex'
          )}
          aria-label="User menu"
        >
          <div
            className={cn(
              'flex',
              'items-center',
              'justify-center',
              'w-7',
              'h-7',
              'rounded-full',
              'bg-accent-subtle',
              'text-accent',
              'text-xs',
              'font-medium'
            )}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-sm font-medium text-text-primary">{user.name}</div>
            <div className="text-xs text-text-muted">{user.role}</div>
          </div>
          <ChevronDown className="w-3 h-3 text-text-muted" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span>{user.name}</span>
            <span className="text-xs font-normal text-text-muted">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="w-4 h-4 mr-2" aria-hidden="true" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="w-4 h-4 mr-2" aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-error focus:text-error">
          <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { HeaderProps, Notification, UserProfile };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Header } from '@/components/layout/Header';
 * 
 * // In AppShell
 * <Header
 *   onMenuClick={() => setMobileOpen(true)}
 *   showMenuButton={isMobile}
 * />
 * 
 * // Without menu button (desktop)
 * <Header />
 * 
 * // Custom className
 * <Header className="custom-header-class" />
 * 
 * // With real notifications from API
 * function HeaderWithAPI() {
 *   const [notifications, setNotifications] = useState([]);
 *   
 *   useEffect(() => {
 *     fetch('/api/notifications')
 *       .then(res => res.json())
 *       .then(setNotifications);
 *   }, []);
 *   
 *   return <Header notifications={notifications} />;
 * }
 * 
 * // Theme toggle cycles: dark → light → system → dark
 * // Icon changes: Moon → Sun → Monitor → Moon
 * 
 * // Search bar:
 * - Hidden on mobile (toggle button shown)
 * - Visible on md+ screens
 * - Focus ring on focus
 * - Clear button when has query
 * 
 * // Notifications:
 * - Badge count for unread
 * - Mark all as read
 * - Dismiss individual
 * - Action links
 * - Time stamps
 * 
 * // User dropdown:
 * - Avatar or initials
 * - Name + role on lg screens
 * - Profile / Settings / Logout
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Header Design System — wpPanel by Breach Rabbit
 * 
 * Dimensions:
 * - Height: 56px (h-14)
 * - Logo: w-8 h-8 (32x32px)
 * - Icons: w-4 h-4 (16x16px)
 * - Buttons: h-8 w-8 (32x32px)
 * - Avatar: w-7 h-7 (28x28px)
 * 
 * Colors (CSS variables from globals.css):
 * - bg-base: #080808 (dark) / #f8f8f8 (light)
 * - bg-overlay: #202020 (dark) / #e8e8e8 (light)
 * - border: rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary: #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted: #444444 (dark) / #999999 (light)
 * - accent: #3b82f6 (Blue)
 * - error: #ef4444 (Red) — notification badge
 * 
 * Spacing:
 * - px-4 (16px) horizontal padding
 * - gap-2 (8px) between items
 * - gap-4 (16px) main sections
 * 
 * Transitions:
 * - Search focus: 150ms ease
 * - Theme toggle: instant (CSS variable swap)
 * - Dropdown: 150ms ease
 * 
 * Breakpoints:
 * - Mobile: < 768px (md)
 * - Tablet: 768px - 1024px
 * - Desktop: >= 1024px (lg)
 * 
 * Accessibility:
 * - aria-label on icon buttons
 * - Keyboard navigation (Tab through items)
 * - Focus visible rings
 * - Screen reader friendly labels
 * - Semantic HTML (header, nav, button)
 * 
 * Performance:
 * - CSS transitions (no JS animations)
 * - Tree-shaken Lucide icons
 * - Lazy notification data
 * - Minimal runtime overhead
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - Theme toggle button cycles: dark → light → system
 * - Icons change: Moon → Sun → Monitor
 * - No flash on load (SSR safe via ThemeProvider)
 */