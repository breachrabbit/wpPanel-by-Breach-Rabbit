'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Toast Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, positions, auto-dismiss, actions, queue system
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Toast {
  /** Unique identifier */
  id: string;
  
  /** Toast title */
  title?: string;
  
  /** Toast message/description */
  message?: string;
  
  /** Toast variant */
  variant?: ToastVariant;
  
  /** Auto-dismiss duration in ms (0 = no auto-dismiss) */
  duration?: number;
  
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  
  /** Dismissible by user */
  dismissible?: boolean;
  
  /** Icon override */
  icon?: React.ReactNode;
}

export interface ToastOptions extends Omit<Toast, 'id'> {
  /** Unique identifier (optional, auto-generated if not provided) */
  id?: string;
}

export interface ToastContextType {
  /** Add a new toast */
  addToast: (toast: ToastOptions) => string;
  
  /** Remove a toast by ID */
  removeToast: (id: string) => void;
  
  /** Remove all toasts */
  removeAllToasts: () => void;
  
  /** Success toast helper */
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  
  /** Error toast helper */
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  
  /** Warning toast helper */
  warning: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  
  /** Info toast helper */
  info: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  
  /** Loading toast helper */
  loading: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  
  /** Update an existing toast */
  updateToast: (id: string, options: Omit<ToastOptions, 'id'>) => void;

  /** Current toasts array */
  toasts: Toast[];
}

// =============================================================================
// 📦 CONTEXT
// =============================================================================

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantConfig: Record<ToastVariant, {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
  iconColor: string;
}> = {
  success: {
    bg: 'var(--color-success-subtle)',
    border: 'var(--color-success)',
    text: 'var(--color-success)',
    icon: <CheckCircle className="w-5 h-5" />,
    iconColor: 'var(--color-success)',
  },
  error: {
    bg: 'var(--color-error-subtle)',
    border: 'var(--color-error)',
    text: 'var(--color-error)',
    icon: <AlertCircle className="w-5 h-5" />,
    iconColor: 'var(--color-error)',
  },
  warning: {
    bg: 'var(--color-warning-subtle)',
    border: 'var(--color-warning)',
    text: 'var(--color-warning)',
    icon: <AlertTriangle className="w-5 h-5" />,
    iconColor: 'var(--color-warning)',
  },
  info: {
    bg: 'var(--color-info-subtle)',
    border: 'var(--color-info)',
    text: 'var(--color-info)',
    icon: <Info className="w-5 h-5" />,
    iconColor: 'var(--color-info)',
  },
  loading: {
    bg: 'var(--color-bg-overlay)',
    border: 'var(--color-border)',
    text: 'var(--color-text-primary)',
    icon: (
      <div className="w-5 h-5 animate-spin">
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    ),
    iconColor: 'var(--color-accent)',
  },
};

/**
 * Position configurations
 */
const positionStyles: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

// =============================================================================
// 🏗️ TOAST COMPONENT
// =============================================================================

/**
 * Individual Toast Item Component
 */
interface ToastItemProps extends Toast {
  onDismiss: (id: string) => void;
}

const ToastItem = React.forwardRef<HTMLDivElement, ToastItemProps>(
  (
    {
      id,
      title,
      message,
      variant = 'info',
      duration = 5000,
      action,
      dismissible = true,
      icon,
      onDismiss,
    },
    ref
  ) => {
    const config = variantConfig[variant];
    const [isExiting, setIsExiting] = React.useState(false);
    const [progress, setProgress] = React.useState(100);
    const startTimeRef = React.useRef<number>(Date.now());
    const animationFrameRef = React.useRef<number>();

    const handleDismiss = React.useCallback(() => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss(id);
      }, 150); // Match animation duration
    }, [id, onDismiss]);

    // Auto-dismiss timer
    React.useEffect(() => {
      if (duration <= 0 || variant === 'loading') {
        return;
      }

      const updateProgress = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = 100 - (elapsed / duration) * 100;
        
        if (remaining <= 0) {
          handleDismiss();
          return;
        }
        
        setProgress(remaining);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      };

      animationFrameRef.current = requestAnimationFrame(updateProgress);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [duration, variant, handleDismiss]);

    // Pause progress on hover
    const handleMouseEnter = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    const handleMouseLeave = () => {
      if (duration > 0 && variant !== 'loading' && !isExiting) {
        startTimeRef.current = Date.now() - (100 - progress) * (duration / 100);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex items-start gap-3',
          'w-full max-w-sm',
          'p-4',
          'rounded-md',
          'border',
          'shadow-elevated',
          'bg-bg-elevated',
          
          // Variant-specific border
          `border-l-4`,
          variant === 'success' && 'border-l-success',
          variant === 'error' && 'border-l-error',
          variant === 'warning' && 'border-l-warning',
          variant === 'info' && 'border-l-info',
          variant === 'loading' && 'border-l-accent',
          
          // Animations
          'transition-all duration-150 ease-out',
          isExiting ? 'animate-fade-out opacity-0 translate-x-full' : 'animate-slide-up',
          
          // Interactive
          dismissible && 'cursor-default',
        )}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-variant={variant}
      >
        {/* Icon */}
        <div
          className={cn('flex-shrink-0', 'text-current')}
          style={{ color: config.iconColor }}
          aria-hidden="true"
        >
          {icon || config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-semibold text-text-primary mb-0.5">
              {title}
            </h4>
          )}
          {message && (
            <p className="text-sm text-text-secondary leading-relaxed">
              {message}
            </p>
          )}
          
          {/* Action Button */}
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'mt-2 text-xs font-medium',
                'text-accent hover:text-accent-hover',
                'transition-colors'
              )}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0',
              'p-1 -mr-1 -mt-1',
              'text-text-muted hover:text-text-primary',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-elevated',
              'rounded'
            )}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        {/* Progress Bar (for auto-dismiss) */}
        {duration > 0 && variant !== 'loading' && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0',
              'h-0.5',
              'rounded-b-md',
              'overflow-hidden',
              'bg-bg-overlay'
            )}
            aria-hidden="true"
          >
            <div
              className={cn('h-full transition-all duration-100 linear')}
              style={{
                width: `${progress}%`,
                backgroundColor: config.iconColor,
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

ToastItem.displayName = 'ToastItem';

// =============================================================================
// 🏗️ TOAST CONTAINER COMPONENT
// =============================================================================

/**
 * Toast Container — Renders all active toasts
 */
export function Toaster({
  position = 'bottom-right',
  maxToasts = 5,
}: {
  position?: ToastPosition;
  maxToasts?: number;
}) {
  const { toasts, removeToast } = useToast();
  
  // Limit visible toasts
  const visibleToasts = toasts.slice(0, maxToasts);

  return (
    <div
      className={cn(
        'fixed z-[1002]', // Above modals (1000), below tooltips (1003)
        'pointer-events-none',
        'flex flex-col gap-2',
        positionStyles[position],
        'max-w-[calc(100vw-2rem)]'
      )}
      aria-label="Notifications"
    >
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem {...toast} onDismiss={removeToast} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// 🏗️ TOAST PROVIDER
// =============================================================================

/**
 * Toast Provider — Manages toast state
 */
export function ToastProvider({
  children,
  defaultPosition = 'bottom-right',
  defaultDuration = 5000,
  maxToasts = 5,
}: {
  children: React.ReactNode;
  defaultPosition?: ToastPosition;
  defaultDuration?: number;
  maxToasts?: number;
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: ToastOptions): string => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts((prev) => [
      ...prev,
      {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
        dismissible: toast.dismissible ?? true,
        variant: toast.variant ?? 'info',
      },
    ]);
    
    return id;
  }, [defaultDuration]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const removeAllToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = React.useCallback((id: string, options: Omit<ToastOptions, 'id'>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...options } : t))
    );
  }, []);

  // Helper methods
  const success = React.useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast({ ...options, variant: 'success', message }),
    [addToast]
  );

  const error = React.useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast({ ...options, variant: 'error', message }),
    [addToast]
  );

  const warning = React.useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast({ ...options, variant: 'warning', message }),
    [addToast]
  );

  const info = React.useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast({ ...options, variant: 'info', message }),
    [addToast]
  );

  const loading = React.useCallback(
    (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast({ ...options, variant: 'loading', duration: 0, message }),
    [addToast]
  );

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
    loading,
    updateToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Toaster position={defaultPosition} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// 🪝 HOOK
// =============================================================================

/**
 * useToast Hook — Access toast functionality from anywhere
 * 
 * @returns Toast context methods
 * 
 * @example
 * const { success, error, info } = useToast();
 * 
 * success('Settings saved successfully');
 * error('Failed to connect to database');
 */
export function useToast(): ToastContextType {
  const context = React.useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { Toast, ToastOptions, ToastVariant, ToastPosition };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { ToastProvider, useToast } from '@/components/ui/Toast';
 * 
 * // Wrap app with provider (in layout.tsx)
 * <ToastProvider defaultPosition="bottom-right" defaultDuration={5000}>
 *   <App />
 * </ToastProvider>
 * 
 * // In components
 * function MyComponent() {
 *   const { success, error, info, warning, loading, addToast } = useToast();
 *   
 *   // Success toast
 *   success('Settings saved successfully');
 *   
 *   // Error toast
 *   error('Failed to connect to database');
 *   
 *   // Warning toast
 *   warning('SSL certificate expires in 7 days');
 *   
 *   // Info toast
 *   info('New version available');
 *   
 *   // Loading toast (no auto-dismiss)
 *   const loadingId = loading('Saving changes...');
 *   
 *   // Update loading toast
 *   updateToast(loadingId, { variant: 'success', message: 'Saved!' });
 *   
 *   // Custom toast
 *   addToast({
 *     title: 'Backup Complete',
 *     message: 'Your backup was created successfully',
 *     variant: 'success',
 *     duration: 5000,
 *     action: {
 *       label: 'View Backup',
 *       onClick: () => router.push('/backups'),
 *     },
 *   });
 *   
 *   // Remove specific toast
 *   removeToast(loadingId);
 *   
 *   // Remove all toasts
 *   removeAllToasts();
 * }
 * 
 * // In API calls
 * async function handleSave() {
 *   const { loading, success, error } = useToast();
 *   
 *   const loadingId = loading('Saving...');
 *   
 *   try {
 *     await api.save(data);
 *     updateToast(loadingId, { variant: 'success', message: 'Saved successfully' });
 *   } catch (e) {
 *     updateToast(loadingId, { variant: 'error', message: 'Failed to save' });
 *   }
 * }
 * 
 * // In forms
 * function ContactForm() {
 *   const { success, error } = useToast();
 *   
 *   const handleSubmit = async (data) => {
 *     try {
 *       await submitForm(data);
 *       success('Message sent successfully');
 *     } catch (e) {
 *       error('Failed to send message. Please try again.');
 *     }
 *   };
 * }
 * 
 * // In site operations
 * function SiteActions() {
 *   const { info, success, error } = useToast();
 *   
 *   const handleRestart = async () => {
 *     info('Restarting site...');
 *     try {
 *       await api.restartSite(siteId);
 *       success('Site restarted successfully');
 *     } catch (e) {
 *       error('Failed to restart site');
 *     }
 *   };
 * }
 * 
 * // In backup operations
 * function BackupActions() {
 *   const { loading, success, error } = useToast();
 *   
 *   const handleBackup = async () => {
 *     const id = loading('Creating backup...');
 *     try {
 *       await api.createBackup(siteId);
 *       updateToast(id, {
 *         variant: 'success',
 *         message: 'Backup completed',
 *         action: { label: 'View', onClick: () => router.push('/backups') },
 *       });
 *     } catch (e) {
 *       updateToast(id, { variant: 'error', message: 'Backup failed' });
 *     }
 *   };
 * }
 * 
 * // In SSL operations
 * function SSLActions() {
 *   const { warning, info } = useToast();
 *   
 *   // SSL expiry warning
 *   if (sslDaysUntilExpiry < 30) {
 *     warning(`SSL certificate expires in ${sslDaysUntilExpiry} days`);
 *   }
 *   
 *   // SSL renewal
 *   const handleRenew = async () => {
 *     info('Renewing SSL certificate...');
 *     await api.renewSSL(certId);
 *   };
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Toast Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - success: var(--color-success)       #10b981 (Green)
 * - error:   var(--color-error)         #ef4444 (Red)
 * - warning: var(--color-warning)       #f59e0b (Yellow/Orange)
 * - info:    var(--color-info)          #6366f1 (Indigo)
 * - loading: var(--color-accent)        #3b82f6 (Blue)
 * - bg:      var(--color-bg-elevated)   #181818 (Dark)
 * - border:  var(--color-border)        rgba(255,255,255,0.07)
 * 
 * Sizing:
 * - Width: max-w-sm (320px)
 * - Max width: calc(100vw - 2rem) on mobile
 * - Padding: p-4 (16px)
 * - Gap: gap-3 (12px) between icon and content
 * - Border-left: 4px accent color
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Positioning:
 * - Default: bottom-right
 * - Options: top-right, top-left, bottom-left, top-center, bottom-center
 * - z-index: 1002 (above modals 1000, below tooltips 1003)
 * - Gap between toasts: 8px (gap-2)
 * 
 * Animations:
 * - slide-up: 150ms ease-out (enter)
 * - fade-out: 150ms ease-out (exit)
 * - Progress bar: linear countdown
 * - Hover pause: progress pauses on hover
 * 
 * Accessibility:
 * - role="alert" for screen readers
 * - aria-live="assertive" for immediate announcement
 * - aria-atomic="true" for complete message
 * - Keyboard accessible dismiss button
 * - Focus visible ring on dismiss button
 * 
 * Performance:
 * - CSS-first animations (no JS for enter/exit)
 * - requestAnimationFrame for progress bar
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Auto-dismiss:
 * - Default: 5000ms (5 seconds)
 * - Loading toasts: no auto-dismiss (duration: 0)
 * - Hover pauses countdown
 * - Progress bar shows remaining time
 * 
 * Max Toasts:
 * - Default: 5 visible toasts
 * - Queue system for additional toasts
 * - Prevents screen overflow
 * 
 * Common Use Cases in wpPanel:
 * - Site operations (start/stop/restart)
 * - Backup complete/failed
 * - SSL expiry warnings
 * - Form submissions
 * - Settings saved
 * - API errors
 * - File upload progress
 * - Terminal session started
 * - Firewall rule added/removed
 * - Cron job executed
 */