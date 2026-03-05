'use client';

// =============================================================================
// wpPanel by Breach Rabbit — AppShell Layout Component
// =============================================================================
// Next.js 16.1 — Client Component
// Main application shell with sidebar, header, and content area
// Features: Collapsible sidebar, responsive, theme-aware, keyboard navigation
// =============================================================================

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/providers/theme';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface AppShellProps {
  /** Page content */
  children: React.ReactNode;
  
  /** Show sidebar (default: true) */
  showSidebar?: boolean;
  
  /** Show header (default: true) */
  showHeader?: boolean;
  
  /** Custom className for main content */
  contentClassName?: string;
  
  /** Custom className for the shell container */
  className?: string;
}

// =============================================================================
// 🏗️ APP SHELL COMPONENT
// =============================================================================

/**
 * AppShell — Main application layout wrapper
 * 
 * Provides the standard dashboard layout with:
 * - Collapsible sidebar (240px → 56px)
 * - Top header with search, notifications, profile
 * - Main content area with proper spacing
 * - Responsive mobile support
 * - Theme-aware styling (dark/light)
 * 
 * @example
 * // In dashboard layout
 * <AppShell>
 *   <PageHeader title="Dashboard" />
 *   <PageContent>
 *     {/* page content *}/}
 *   </PageContent>
 * </AppShell>
 * 
 * // Without sidebar (for full-page views)
 * <AppShell showSidebar={false}>
 *   {/* full-width content *}/}
 * </AppShell>
 */
export function AppShell({
  children,
  showSidebar = true,
  showHeader = true,
  contentClassName,
  className,
}: AppShellProps) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // =============================================================================
  // 🔄 RESPONSIVE HANDLING
  // =============================================================================

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      
      // Auto-collapse sidebar on mobile
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setSidebarMobileOpen(false);
  }, [pathname]);

  // Handle keyboard navigation (Escape to close mobile sidebar)
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarMobileOpen) {
        setSidebarMobileOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarMobileOpen]);

  // Prevent body scroll when mobile sidebar is open
  React.useEffect(() => {
    if (sidebarMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarMobileOpen]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <div
      className={cn(
        // Base styles
        'min-h-screen',
        'bg-bg-base',
        'text-text-primary',
        'font-sans',
        'antialiased',
        
        // Layout
        'flex',
        
        // Custom className
        className
      )}
      data-theme={theme}
    >
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarMobileOpen && showSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      {showSidebar && (
        <>
          {/* Desktop Sidebar */}
          <div
            className={cn(
              // Base styles
              'hidden lg:flex',
              'flex-col',
              'fixed top-0 left-0',
              'h-screen',
              'z-50',
              'transition-all duration-200 ease-out',
              'border-r border-border',
              'bg-bg-base',
              
              // Collapsed state
              sidebarCollapsed ? 'w-[56px]' : 'w-[240px]'
            )}
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              variant="desktop"
            />
          </div>

          {/* Mobile Sidebar */}
          <div
            className={cn(
              // Base styles
              'fixed top-0 left-0',
              'h-screen',
              'z-50',
              'transition-transform duration-200 ease-out',
              'border-r border-border',
              'bg-bg-base',
              'w-[240px]',
              'lg:hidden',
              
              // Open/close state
              sidebarMobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => setSidebarMobileOpen(false)}
              variant="mobile"
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div
        className={cn(
          // Base styles
          'flex-1',
          'flex',
          'flex-col',
          'min-h-screen',
          
          // Sidebar spacing (desktop only)
          showSidebar && 'lg:pl-[240px]',
          showSidebar && sidebarCollapsed && 'lg:pl-[56px]',
          
          // Custom className
          contentClassName
        )}
      >
        {/* Header */}
        {showHeader && (
          <Header
            onMenuClick={() => setSidebarMobileOpen(true)}
            showMenuButton={isMobile && showSidebar}
          />
        )}

        {/* Page Content */}
        <main
          className={cn(
            // Base styles
            'flex-1',
            'flex',
            'flex-col',
            
            // Spacing
            showHeader ? 'pt-0' : 'pt-0',
            'p-4',
            'md:p-6',
            'lg:p-8'
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// 📦 PAGE HEADER COMPONENT
// =============================================================================

export interface PageHeaderProps {
  /** Page title */
  title: React.ReactNode;
  
  /** Page description/subtitle */
  description?: React.ReactNode;
  
  /** Breadcrumb items */
  breadcrumb?: Array<{
    label: string;
    href?: string;
  }>;
  
  /** Actions (buttons, etc.) */
  actions?: React.ReactNode;
  
  /** Custom className */
  className?: string;
}

/**
 * PageHeader — Standard page header with title, breadcrumb, and actions
 * 
 * @example
 * <PageHeader
 *   title="Dashboard"
 *   description="Server overview and quick actions"
 *   breadcrumb={[
 *     { label: 'Home', href: '/dashboard' },
 *     { label: 'Dashboard' }
 *   ]}
 *   actions={
 *     <Button variant="primary">Refresh</Button>
 *   }
 * />
 */
export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        // Base styles
        'flex',
        'flex-col',
        'gap-4',
        'mb-6',
        'pb-6',
        'border-b',
        'border-border',
        
        // Responsive
        'md:flex-row',
        'md:items-center',
        'md:justify-between',
        
        // Custom className
        className
      )}
    >
      {/* Title & Breadcrumb */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb */}
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-2" aria-label="Breadcrumb">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-text-muted" aria-hidden="true">/</span>
                )}
                {item.href ? (
                  <a
                    href={item.href}
                    className="hover:text-text-primary transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-text-secondary">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        
        {/* Title */}
        <h1 className="text-xl md:text-2xl font-bold text-text-primary truncate">
          {title}
        </h1>
        
        {/* Description */}
        {description && (
          <p className="text-sm text-text-secondary mt-1">
            {description}
          </p>
        )}
      </div>
      
      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 📦 PAGE CONTENT COMPONENT
// =============================================================================

export interface PageContentProps {
  /** Page content */
  children: React.ReactNode;
  
  /** Custom className */
  className?: string;
}

/**
 * PageContent — Standard page content wrapper
 * 
 * @example
 * <PageContent>
 *   <Card>
 *     <CardContent>
 *       {/* content *}/}
 *     </CardContent>
 *   </Card>
 * </PageContent>
 */
export function PageContent({
  children,
  className,
}: PageContentProps) {
  return (
    <div
      className={cn(
        // Base styles
        'flex-1',
        'flex',
        'flex-col',
        'gap-6',
        
        // Custom className
        className
      )}
    >
      {children}
    </div>
  );
}

// =============================================================================
// 📦 SECTION COMPONENT
// =============================================================================

export interface SectionProps {
  /** Section title */
  title: string;
  
  /** Section icon */
  icon?: React.ReactNode;
  
  /** Section description */
  description?: string;
  
  /** Section actions */
  action?: React.ReactNode;
  
  /** Section content */
  children: React.ReactNode;
  
  /** Custom className */
  className?: string;
}

/**
 * Section — Standard section wrapper with title and optional actions
 * 
 * @example
 * <Section
 *   title="Server Metrics"
 *   icon={<Server className="w-4 h-4" />}
 *   action={<Button size="sm">Refresh</Button>}
 * >
 *   {/* section content *}/}
 * </Section>
 */
export function Section({
  title,
  icon,
  description,
  action,
  children,
  className,
}: SectionProps) {
  return (
    <section
      className={cn(
        // Base styles
        'flex',
        'flex-col',
        'gap-4',
        
        // Custom className
        className
      )}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-text-muted">{icon}</span>
          )}
          <h2 className="text-base font-semibold text-text-primary">
            {title}
          </h2>
          {description && (
            <span className="text-xs text-text-muted">
              {description}
            </span>
          )}
        </div>
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
      
      {/* Section Content */}
      {children}
    </section>
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { AppShellProps, PageHeaderProps, PageContentProps, SectionProps };