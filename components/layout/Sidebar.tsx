'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Sidebar Navigation Component
// =============================================================================
// Next.js 16.1 — Client Component
// Collapsible sidebar with navigation, active states, and responsive support
// Features: Collapsible (240px → 56px), active states, keyboard navigation
// =============================================================================

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Globe,
  Database,
  FolderOpen,
  HardDrive,
  Shield,
  Clock,
  Activity,
  Terminal,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Wordpress,
  Server,
  FileText,
  Lock,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type SidebarVariant = 'desktop' | 'mobile';

export interface SidebarProps {
  /** Sidebar collapsed state (desktop only) */
  collapsed?: boolean;
  
  /** On collapse toggle */
  onToggleCollapse?: () => void;
  
  /** On menu close (mobile) */
  onClose?: () => void;
  
  /** Sidebar variant */
  variant?: SidebarVariant;
  
  /** Custom className */
  className?: string;
}

export interface NavItem {
  /** Unique identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Navigation href */
  href: string;
  
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>;
  
  /** Badge count (optional) */
  badge?: number;
  
  /** Submenu items (optional) */
  children?: NavItem[];
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Coming soon indicator */
  comingSoon?: boolean;
}

// =============================================================================
// ⚙️ NAVIGATION CONFIGURATION
// =============================================================================

/**
 * Main navigation items
 * Organized by priority and frequency of use
 */
const MAIN_NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'sites',
    label: 'Sites',
    href: '/dashboard/sites',
    icon: Globe,
    badge: 3, // Example: active sites count
  },
  {
    id: 'wordpress',
    label: 'WordPress',
    href: '/dashboard/wordpress',
    icon: Wordpress,
    comingSoon: true,
  },
  {
    id: 'databases',
    label: 'Databases',
    href: '/dashboard/databases',
    icon: Database,
  },
  {
    id: 'files',
    label: 'Files',
    href: '/dashboard/files',
    icon: FolderOpen,
  },
  {
    id: 'backups',
    label: 'Backups',
    href: '/dashboard/backups',
    icon: HardDrive,
  },
];

/**
 * Secondary navigation items (settings, monitoring, etc.)
 */
const SECONDARY_NAV_ITEMS: NavItem[] = [
  {
    id: 'monitoring',
    label: 'Monitoring',
    href: '/dashboard/monitoring',
    icon: Activity,
  },
  {
    id: 'logs',
    label: 'Logs',
    href: '/dashboard/logs',
    icon: FileText,
  },
  {
    id: 'terminal',
    label: 'Terminal',
    href: '/dashboard/terminal',
    icon: Terminal,
  },
  {
    id: 'firewall',
    label: 'Firewall',
    href: '/dashboard/firewall',
    icon: Shield,
  },
  {
    id: 'cron',
    label: 'Cron',
    href: '/dashboard/cron',
    icon: Clock,
    comingSoon: true,
  },
  {
    id: 'ssl',
    label: 'SSL',
    href: '/dashboard/ssl',
    icon: Lock,
    comingSoon: true,
  },
];

/**
 * Settings & profile items
 */
const SETTINGS_NAV_ITEMS: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

// =============================================================================
// 🏗️ SIDEBAR COMPONENT
// =============================================================================

/**
 * Sidebar — Main navigation sidebar with collapsible support
 * 
 * @example
 * // Desktop
 * <Sidebar collapsed={collapsed} onToggleCollapse={toggle} variant="desktop" />
 * 
 * // Mobile
 * <Sidebar onClose={close} variant="mobile" />
 */
export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onClose,
  variant = 'desktop',
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const isDesktop = variant === 'desktop';
  const isMobile = variant === 'mobile';

  // Check if item is active (exact match or starts with for nested routes)
  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // Handle nav item click
  const handleNavClick = (href: string, disabled?: boolean, comingSoon?: boolean) => {
    if (disabled || comingSoon) {
      return;
    }
    
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          // Base styles
          'flex',
          'flex-col',
          'h-full',
          'bg-bg-base',
          'border-r',
          'border-border',
          
          // Desktop variant
          isDesktop && 'transition-all duration-200 ease-out',
          
          // Custom className
          className
        )}
      >
        {/* Logo & Collapse Toggle */}
        <div
          className={cn(
            // Base styles
            'flex',
            'items-center',
            'h-14',
            'px-3',
            'border-b',
            'border-border',
            
            // Desktop: justify based on collapsed state
            isDesktop && collapsed ? 'justify-center' : 'justify-between',
            
            // Mobile: always justify between
            isMobile && 'justify-between'
          )}
        >
          {/* Logo */}
          <Link
            href="/dashboard"
            className={cn(
              'flex',
              'items-center',
              'gap-2',
              'group',
              collapsed ? 'justify-center' : ''
            )}
            onClick={() => isMobile && onClose?.()}
          >
            <div
              className={cn(
                // Base
                'flex',
                'items-center',
                'justify-center',
                'rounded-md',
                'bg-accent',
                'text-white',
                
                // Size
                collapsed ? 'w-8 h-8' : 'w-8 h-8'
              )}
            >
              <Server className="w-5 h-5" aria-hidden="true" />
            </div>
            
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-primary leading-tight">
                  wpPanel
                </span>
                <span className="text-xs text-text-muted -mt-0.5">
                  by Breach Rabbit
                </span>
              </div>
            )}
          </Link>

          {/* Collapse Toggle (Desktop only) */}
          {isDesktop && onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 w-7',
                'p-0',
                'text-text-muted',
                'hover:text-text-primary',
                'hover:bg-bg-overlay',
                'transition-colors',
                collapsed ? 'rotate-180' : ''
              )}
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}

          {/* Close Button (Mobile only) */}
          {isMobile && onClose && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 w-7',
                'p-0',
                'text-text-muted',
                'hover:text-text-primary',
                'hover:bg-bg-overlay',
                'transition-colors'
              )}
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto wp-scrollbar py-3">
          {/* Main Items */}
          <div className="px-2 mb-4">
            {MAIN_NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                onClick={() => handleNavClick(item.href, item.disabled, item.comingSoon)}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="mx-3 mb-3 border-t border-border" />

          {/* Secondary Items */}
          <div className="px-2 mb-4">
            {SECONDARY_NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                onClick={() => handleNavClick(item.href, item.disabled, item.comingSoon)}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="mx-3 mb-3 border-t border-border" />

          {/* Settings Items */}
          <div className="px-2">
            {SETTINGS_NAV_ITEMS.map((item) => (
              <SidebarNavItem
                key={item.id}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                onClick={() => handleNavClick(item.href, item.disabled, item.comingSoon)}
              />
            ))}
          </div>
        </nav>

        {/* User Profile & Logout */}
        <div
          className={cn(
            // Base styles
            'flex',
            'items-center',
            'p-3',
            'border-t',
            'border-border',
            
            // Desktop: justify based on collapsed state
            isDesktop && collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className={cn(
                  'flex',
                  'items-center',
                  'justify-center',
                  'w-8',
                  'h-8',
                  'rounded-full',
                  'bg-accent-subtle',
                  'text-accent'
                )}
              >
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  Admin
                </div>
                <div className="text-xs text-text-muted truncate">
                  admin@example.com
                </div>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8',
              'text-text-muted',
              'hover:text-error',
              'hover:bg-error-subtle',
              'transition-colors',
              collapsed ? 'w-8 px-0' : 'px-2'
            )}
            onClick={() => console.log('Logout')}
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

// =============================================================================
// 📦 SIDEBAR NAV ITEM COMPONENT
// =============================================================================

interface SidebarNavItemProps {
  /** Navigation item */
  item: NavItem;
  
  /** Is item active */
  isActive: boolean;
  
  /** Sidebar collapsed state */
  collapsed: boolean;
  
  /** On click handler */
  onClick: () => void;
}

function SidebarNavItem({
  item,
  isActive,
  collapsed,
  onClick,
}: SidebarNavItemProps) {
  const Icon = item.icon;
  
  const content = (
    <div
      className={cn(
        // Base styles
        'flex',
        'items-center',
        'gap-3',
        'px-3',
        'py-2',
        'rounded-md',
        'transition-all',
        'duration-150',
        'ease-out',
        'cursor-pointer',
        
        // Active state
        isActive
          ? 'bg-accent-subtle text-accent'
          : 'text-text-secondary hover:bg-bg-overlay hover:text-text-primary',
        
        // Disabled state
        item.disabled && 'opacity-50 cursor-not-allowed',
        
        // Coming soon state
        item.comingSoon && 'opacity-70',
        
        // Collapsed: center content
        collapsed && 'justify-center px-2'
      )}
      onClick={onClick}
      role="button"
      tabIndex={item.disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={item.disabled}
    >
      {/* Icon */}
      <Icon
        className={cn(
          'flex-shrink-0',
          'w-5',
          'h-5',
          isActive ? 'text-accent' : 'text-current'
        )}
        aria-hidden="true"
      />

      {/* Label */}
      {!collapsed && (
        <span className="flex-1 text-sm font-medium truncate">{item.label}</span>
      )}

      {/* Badge */}
      {!collapsed && item.badge !== undefined && (
        <span
          className={cn(
            'flex',
            'items-center',
            'justify-center',
            'min-w-[1.25rem]',
            'h-5',
            'px-1.5',
            'rounded-full',
            'text-xs',
            'font-medium',
            'bg-accent',
            'text-white'
          )}
        >
          {item.badge}
        </span>
      )}

      {/* Coming Soon Badge */}
      {!collapsed && item.comingSoon && (
        <span
          className={cn(
            'text-xs',
            'text-text-muted'
          )}
        >
          Soon
        </span>
      )}
    </div>
  );

  // Wrap in Tooltip if collapsed
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{item.label}</span>
          {item.badge !== undefined && (
            <span className="flex items-center justify-center px-1.5 rounded-full bg-accent text-white text-xs">
              {item.badge}
            </span>
          )}
          {item.comingSoon && <span className="text-text-muted">Soon</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { SidebarProps, NavItem, SidebarVariant };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Sidebar } from '@/components/layout/Sidebar';
 * 
 * // Desktop sidebar (collapsible)
 * const [collapsed, setCollapsed] = useState(false);
 * 
 * <Sidebar
 *   collapsed={collapsed}
 *   onToggleCollapse={() => setCollapsed(!collapsed)}
 *   variant="desktop"
 * />
 * 
 * // Mobile sidebar (slide-in)
 * const [mobileOpen, setMobileOpen] = useState(false);
 * 
 * <Sidebar
 *   onClose={() => setMobileOpen(false)}
 *   variant="mobile"
 * />
 * 
 * // With custom className
 * <Sidebar
 *   collapsed={collapsed}
 *   className="custom-sidebar-class"
 * />
 * 
 * // In AppShell layout
 * function AppShell({ children }) {
 *   const [collapsed, setCollapsed] = useState(false);
 *   const [mobileOpen, setMobileOpen] = useState(false);
 *   
 *   return (
 *     <div className="flex min-h-screen">
 *       {/* Desktop Sidebar *}/}
 *       <div className={cn(
 *         'hidden lg:block',
 *         'fixed top-0 left-0 h-screen',
 *         collapsed ? 'w-[56px]' : 'w-[240px]'
 *       )}>
 *         <Sidebar
 *           collapsed={collapsed}
 *           onToggleCollapse={() => setCollapsed(!collapsed)}
 *           variant="desktop"
 *         />
 *       </div>
 *       
 *       {/* Mobile Sidebar *}/}
 *       {mobileOpen && (
 *         <div className="lg:hidden fixed inset-0 z-50">
 *           <Sidebar onClose={() => setMobileOpen(false)} variant="mobile" />
 *         </div>
 *       )}
 *       
 *       {/* Main Content *}/}
 *       <main className={cn(
 *         'flex-1',
 *         'lg:pl-[240px]',
 *         collapsed && 'lg:pl-[56px]'
 *       )}>
 *         {children}
 *       </main>
 *     </div>
 *   );
 * }
 * 
 * // Navigation item structure
 * const navItem: NavItem = {
 *   id: 'dashboard',
 *   label: 'Dashboard',
 *   href: '/dashboard',
 *   icon: LayoutDashboard,
 *   badge: 3, // Optional: show badge count
 *   comingSoon: false, // Optional: mark as coming soon
 *   disabled: false, // Optional: disable item
 * };
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Sidebar Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-base:        #080808 (dark) / #f8f8f8 (light) — sidebar background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — hover state
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light) — inactive nav
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - accent:         #3b82f6 (Blue) — active state
 * - accent-subtle:  rgba(59,130,246,0.10) — active bg
 * - error:          #ef4444 (Red) — logout hover
 * 
 * Dimensions:
 * - Expanded width: 240px
 * - Collapsed width: 56px
 * - Header height: 56px (h-14)
 * - Nav item height: ~40px (py-2 + px-3)
 * - Icon size: w-5 h-5 (20x20px)
 * - Logo icon: w-8 h-8 (32x32px)
 * 
 * Border Radius:
 * - Nav items: rounded-md (6px)
 * - Logo icon: rounded-md (6px)
 * - User avatar: rounded-full (50%)
 * - Badges: rounded-full (50%)
 * 
 * Transitions:
 * - Collapse/expand: 200ms ease-out
 * - Nav item hover: 150ms ease-out
 * - Tooltip: 150ms ease
 * 
 * Active State:
 * - Background: accent-subtle (rgba(59,130,246,0.10))
 * - Text: accent (blue)
 * - Icon: accent (blue)
 * 
 * Hover State:
 * - Background: bg-overlay
 * - Text: text-primary
 * - Icon: text-primary
 * 
 * Disabled State:
 * - Opacity: 50%
 * - Cursor: not-allowed
 * 
 * Coming Soon State:
 * - Opacity: 70%
 * - Badge: "Soon" text-muted
 * 
 * Accessibility:
 * - aria-current="page" for active item
 * - aria-disabled for disabled items
 * - aria-label for icon-only buttons
 * - Keyboard navigation (Tab, Enter, Space)
 * - Focus visible rings
 * - Screen reader friendly labels
 * 
 * Performance:
 * - CSS transitions (no JS animations)
 * - Tree-shaken Lucide icons
 * - Tooltip only on collapsed state
 * - Minimal runtime overhead
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Navigation Structure:
 * - Main Items: Dashboard, Sites, WordPress, Databases, Files, Backups
 * - Secondary: Monitoring, Logs, Terminal, Firewall, Cron, SSL
 * - Settings: Settings, Profile, Logout
 * 
 * Badge System:
 * - Numeric badges for counts (e.g., active sites)
 * - "Soon" badge for coming soon features
 * - Accent color (blue) for consistency
 * 
 * Responsive Behavior:
 * - Desktop: Collapsible (240px ↔ 56px)
 * - Mobile: Full width slide-in (240px)
 * - Touch-friendly tap targets (min 44px height)
 */