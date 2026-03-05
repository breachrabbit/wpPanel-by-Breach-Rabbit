'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Tooltip Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Radix UI Tooltip — Accessibility primitive without styles
// Features: Multiple positions, sizes, variants, delays, accessibility
// =============================================================================

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type TooltipVariant = 'default' | 'error' | 'success' | 'warning' | 'info';
export type TooltipSize = 'sm' | 'md' | 'lg';
export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = 'start' | 'center' | 'end';

export interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  /** Tooltip content (string or React node) */
  content: React.ReactNode;
  
  /** Tooltip variant (visual style) */
  variant?: TooltipVariant;
  
  /** Tooltip size */
  size?: TooltipSize;
  
  /** Position relative to trigger */
  side?: TooltipSide;
  
  /** Alignment within side */
  align?: TooltipAlign;
  
  /** Distance from trigger in pixels */
  sideOffset?: number;
  
  /** Delay before showing (ms) */
  delayDuration?: number;
  
  /** Disable tooltip */
  disabled?: boolean;
  
  /** Custom className for content */
  contentClassName?: string;
  
  /** Custom className for arrow */
  arrowClassName?: string;
  
  /** Trigger children */
  children: React.ReactNode;
  
  /** Force open state (controlled) */
  open?: boolean;
  
  /** Open change handler */
  onOpenChange?: (open: boolean) => void;
}

export interface TooltipProviderProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider> {
  /** Children */
  children: React.ReactNode;
  
  /** Default delay duration (ms) */
  delayDuration?: number;
  
  /** Skip delay for keyboard users */
  skipDelayDuration?: number;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<TooltipSize, string> = {
  sm: `
    px-2 py-1 text-xs
    max-w-[200px]
  `,
  md: `
    px-2.5 py-1.5 text-xs
    max-w-[280px]
  `,
  lg: `
    px-3 py-2 text-sm
    max-w-[360px]
  `,
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<TooltipVariant, string> = {
  default: `
    bg-bg-elevated
    text-text-primary
    border border-border
  `,
  error: `
    bg-error
    text-white
    border border-error
  `,
  success: `
    bg-success
    text-white
    border border-success
  `,
  warning: `
    bg-warning
    text-white
    border border-warning
  `,
  info: `
    bg-info
    text-white
    border border-info
  `,
};

/**
 * Arrow size configurations
 */
const arrowSizes: Record<TooltipSize, { width: string; height: string }> = {
  sm: { width: '8', height: '4' },
  md: { width: '10', height: '5' },
  lg: { width: '12', height: '6' },
};

// =============================================================================
// 🏗️ TOOLTIP COMPONENT
// =============================================================================

/**
 * Tooltip Component — wpPanel by Breach Rabbit UI
 * 
 * Built on Radix UI Tooltip primitives for full accessibility.
 * Custom styled to match wpPanel design system.
 * 
 * @example
 * <Tooltip content="Helpful information">
 *   <Button>Hover me</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Error message" variant="error">
 *   <Input variant="error" />
 * </Tooltip>
 */
export const Tooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipProps
>(
  (
    {
      content,
      variant = 'default',
      size = 'md',
      side = 'top',
      align = 'center',
      sideOffset = 4,
      delayDuration = 200,
      disabled = false,
      contentClassName,
      arrowClassName,
      children,
      open,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    // Don't render tooltip if disabled or no content
    if (disabled || !content) {
      return <>{children}</>;
    }

    return (
      <TooltipPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        delayDuration={delayDuration}
        {...props}
      >
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            ref={ref}
            className={cn(
              // Base styles
              'relative',
              'z-[1003]', // Above modals, below terminals
              'rounded-md',
              'font-medium',
              'shadow-elevated',
              'data-[state=delayed-open]:animate-slide-up',
              'data-[state=closed]:animate-fade-out',
              'data-[side=bottom]:animate-slide-down',
              'data-[side=left]:animate-slide-left',
              'data-[side=right]:animate-slide-right',
              
              // Size & Variant
              sizeStyles[size],
              variantStyles[variant],
              
              // Custom className
              contentClassName
            )}
            side={side}
            align={align}
            sideOffset={sideOffset}
            avoidCollisions
            sticky="partial"
          >
            {content}
            
            {/* Arrow */}
            <TooltipPrimitive.Arrow
              className={cn(
                'fill-current',
                variant === 'default' ? 'text-bg-elevated' :
                variant === 'error' ? 'text-error' :
                variant === 'success' ? 'text-success' :
                variant === 'warning' ? 'text-warning' :
                'text-info',
                arrowClassName
              )}
              width={arrowSizes[size].width}
              height={arrowSizes[size].height}
            />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    );
  }
);

// Set display name for debugging
Tooltip.displayName = TooltipPrimitive.Content.displayName;

// =============================================================================
// 📦 TOOLTIP PROVIDER
// =============================================================================

/**
 * Tooltip Provider — Wrap your app to provide default tooltip settings
 * 
 * Should be placed at the root level (in layout.tsx)
 * 
 * @example
 * <TooltipProvider delayDuration={200}>
 *   <App />
 * </TooltipProvider>
 */
export const TooltipProvider = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Provider>,
  TooltipProviderProps
>(({ children, delayDuration = 200, skipDelayDuration = 0, ...props }, ref) => (
  <TooltipPrimitive.Provider
    ref={ref}
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    {...props}
  >
    {children}
  </TooltipPrimitive.Provider>
));

TooltipProvider.displayName = TooltipPrimitive.Provider.displayName;

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { TooltipProps, TooltipProviderProps, TooltipVariant, TooltipSize, TooltipSide, TooltipAlign };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
 * 
 * // Wrap app with provider (in layout.tsx)
 * <TooltipProvider>
 *   <App />
 * </TooltipProvider>
 * 
 * // Simple tooltip
 * <Tooltip content="Helpful information">
 *   <Button>Hover me</Button>
 * </Tooltip>
 * 
 * // Different positions
 * <Tooltip content="Top" side="top">
 *   <Button>Top</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Right" side="right">
 *   <Button>Right</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Bottom" side="bottom">
 *   <Button>Bottom</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Left" side="left">
 *   <Button>Left</Button>
 * </Tooltip>
 * 
 * // Different variants
 * <Tooltip content="Default info" variant="default">
 *   <Button>Default</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Success message" variant="success">
 *   <Button>Success</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Warning message" variant="warning">
 *   <Button>Warning</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Error message" variant="error">
 *   <Button>Error</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Info message" variant="info">
 *   <Button>Info</Button>
 * </Tooltip>
 * 
 * // Different sizes
 * <Tooltip content="Small tooltip" size="sm">
 *   <Button>Small</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Medium tooltip" size="md">
 *   <Button>Medium</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Large tooltip with more content" size="lg">
 *   <Button>Large</Button>
 * </Tooltip>
 * 
 * // With alignment
 * <Tooltip content="Aligned start" align="start">
 *   <Button>Start</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Aligned center" align="center">
 *   <Button>Center</Button>
 * </Tooltip>
 * 
 * <Tooltip content="Aligned end" align="end">
 *   <Button>End</Button>
 * </Tooltip>
 * 
 * // Disabled tooltip
 * <Tooltip content="Won't show" disabled>
 *   <Button>No tooltip</Button>
 * </Tooltip>
 * 
 * // Custom delay
 * <Tooltip content="Shows after 500ms" delayDuration={500}>
 *   <Button>Delayed</Button>
 * </Tooltip>
 * 
 * // Controlled open state
 * const [open, setOpen] = useState(false);
 * 
 * <Tooltip 
 *   content="Controlled tooltip" 
 *   open={open} 
 *   onOpenChange={setOpen}
 * >
 *   <Button onClick={() => setOpen(true)}>Click me</Button>
 * </Tooltip>
 * 
 * // Complex content
 * <Tooltip
 *   content={
 *     <div className="flex flex-col gap-1">
 *       <span className="font-semibold">Keyboard Shortcuts</span>
 *       <span className="text-text-muted">Ctrl+K: Search</span>
 *       <span className="text-text-muted">Ctrl+J: Jump</span>
 *     </div>
 *   }
 *   size="lg"
 * >
 *   <Button>?</Button>
 * </Tooltip>
 * 
 * // In forms (field hints)
 * <div className="space-y-2">
 *   <div className="flex items-center gap-2">
 *     <Label>Password</Label>
 *     <Tooltip content="Must be at least 8 characters with uppercase, lowercase, and number" size="lg">
 *       <HelpCircle className="w-4 h-4 text-text-muted cursor-help" />
 *     </Tooltip>
 *   </div>
 *   <Input type="password" />
 * </div>
 * 
 * // In tables (column headers)
 * <Table>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.HeaderCell>
 *         <div className="flex items-center gap-1">
 *           CPU Usage
 *           <Tooltip content="Average CPU usage over the last 5 minutes" size="sm">
 *             <HelpCircle className="w-3.5 h-3.5 text-text-muted cursor-help" />
 *           </Tooltip>
 *         </div>
 *       </Table.HeaderCell>
 *     </Table.Row>
 *   </Table.Header>
 * </Table>
 * 
 * // In settings (option descriptions)
 * <div className="flex items-center justify-between">
 *   <div className="flex items-center gap-2">
 *     <Toggle label="Auto-restart" />
 *     <Tooltip content="Automatically restart the site if it becomes unresponsive" size="md">
 *       <HelpCircle className="w-4 h-4 text-text-muted cursor-help" />
 *     </Tooltip>
 *   </div>
 * </div>
 * 
 * // With icons (Lucide)
 * import { HelpCircle, Info, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
 * 
 * <Tooltip content="Help information" variant="default">
 *   <HelpCircle className="w-4 h-4 cursor-help" />
 * </Tooltip>
 * 
 * <Tooltip content="Additional info" variant="info">
 *   <Info className="w-4 h-4 cursor-help" />
 * </Tooltip>
 * 
 * <Tooltip content="Warning: This action is irreversible" variant="warning">
 *   <AlertCircle className="w-4 h-4 cursor-help" />
 * </Tooltip>
 * 
 * <Tooltip content="Successfully completed" variant="success">
 *   <CheckCircle className="w-4 h-4 cursor-help" />
 * </Tooltip>
 * 
 * <Tooltip content="Error occurred" variant="error">
 *   <XCircle className="w-4 h-4 cursor-help" />
 * </Tooltip>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Tooltip Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - default: bg-elevated (#181818) + text-primary (#f0f0f0) + border
 * - error:   bg-error (#ef4444) + text-white
 * - success: bg-success (#10b981) + text-white
 * - warning: bg-warning (#f59e0b) + text-white
 * - info:    bg-info (#6366f1) + text-white
 * 
 * Sizing:
 * - sm: px-2 py-1, text-xs (12px), max-w-[200px], arrow: 8x4
 * - md: px-2.5 py-1.5, text-xs (12px), max-w-[280px], arrow: 10x5 — DEFAULT
 * - lg: px-3 py-2, text-sm (14px), max-w-[360px], arrow: 12x6
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Positioning:
 * - side: top / right / bottom / left
 * - align: start / center / end
 * - sideOffset: 4px (default)
 * - avoidCollisions: true (auto-flip if needed)
 * - sticky: partial (stay visible when scrolling)
 * 
 * Animations:
 * - slide-up: 150ms ease-out (top side)
 * - slide-down: 150ms ease-out (bottom side)
 * - slide-left: 150ms ease-out (left side)
 * - slide-right: 150ms ease-out (right side)
 * - fade-out: 100ms ease-out (closing)
 * 
 * Accessibility (Radix UI):
 * - Full keyboard support (Tab to focus, Escape to close)
 * - Screen reader support (aria-describedby)
 * - Proper role (tooltip)
 * - Delay for keyboard users (skipDelayDuration)
 * - Dismissible with Escape key
 * 
 * Performance:
 * - Radix UI primitives (no styles, tree-shakeable)
 * - CSS-first animations (no JS)
 * - Portal rendering (no z-index issues)
 * - Minimal runtime overhead
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Z-Index Hierarchy:
 * - Tooltip: 1003 (above modals 1000, below terminals 1004)
 * - Ensures tooltips appear over most UI elements
 * 
 * Common Use Cases in wpPanel:
 * - Field hints in forms (password requirements, etc.)
 * - Column header descriptions in tables
 * - Icon explanations (settings, actions)
 * - Keyboard shortcut hints
 * - Status explanations (what does "degraded" mean?)
 * - Setting descriptions (toggle explanations)
 * - Error context (why did this fail?)
 * - Feature tooltips (new features, beta features)
 */