'use client';

// =============================================================================
// wpPanel by Breach Rabbit — AlertBanner Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, sizes, icons, dismissible, actions, titles
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export type AlertSize = 'sm' | 'md' | 'lg';

export interface AlertBannerProps extends React.ComponentPropsWithoutRef<'div'> {
  variant?: AlertVariant;
  size?: AlertSize;
  title?: string;
  message?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  borderless?: boolean;
  fullWidth?: boolean;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

const variantConfig: Record<AlertVariant, {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
  iconColor: string;
}> = {
  info: {
    bg: 'var(--color-info-subtle)',
    border: 'var(--color-info-border, rgba(99,102,241,0.30))',
    text: 'var(--color-info)',
    icon: <Info className="w-5 h-5" />,
    iconColor: 'var(--color-info)',
  },
  success: {
    bg: 'var(--color-success-subtle)',
    border: 'var(--color-success-border, rgba(16,185,129,0.30))',
    text: 'var(--color-success)',
    icon: <CheckCircle className="w-5 h-5" />,
    iconColor: 'var(--color-success)',
  },
  warning: {
    bg: 'var(--color-warning-subtle)',
    border: 'var(--color-warning-border, rgba(245,158,11,0.30))',
    text: 'var(--color-warning)',
    icon: <AlertTriangle className="w-5 h-5" />,
    iconColor: 'var(--color-warning)',
  },
  error: {
    bg: 'var(--color-error-subtle)',
    border: 'var(--color-error-border, rgba(239,68,68,0.30))',
    text: 'var(--color-error)',
    icon: <AlertCircle className="w-5 h-5" />,
    iconColor: 'var(--color-error)',
  },
};

const sizeStyles: Record<AlertSize, {
  padding: string;
  gap: string;
  titleSize: string;
  messageSize: string;
  iconSize: string;
}> = {
  sm: {
    padding: 'p-2.5',
    gap: 'gap-2.5',
    titleSize: 'text-sm',
    messageSize: 'text-xs',
    iconSize: 'w-4 h-4',
  },
  md: {
    padding: 'p-3.5',
    gap: 'gap-3',
    titleSize: 'text-sm',
    messageSize: 'text-sm',
    iconSize: 'w-5 h-5',
  },
  lg: {
    padding: 'p-4',
    gap: 'gap-3.5',
    titleSize: 'text-base',
    messageSize: 'text-sm',
    iconSize: 'w-6 h-6',
  },
};

// =============================================================================
// 🏗️ ALERT BANNER COMPONENT
// =============================================================================

export const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  (
    {
      className,
      variant = 'info',
      size = 'md',
      title,
      message,
      showIcon = true,
      icon,
      dismissible = false,
      onDismiss,
      action,
      borderless = false,
      fullWidth = true,
      children,
      ...props
    },
    ref
  ) => {
    const [isDismissed, setIsDismissed] = React.useState(false);
    const config = variantConfig[variant];
    const sizes = sizeStyles[size];

    const handleDismiss = () => {
      setIsDismissed(true);
      onDismiss?.();
    };

    if (isDismissed) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          'flex items-start',
          'rounded-md',
          'transition-all duration-150 ease-out',
          config.bg,
          !borderless && `border ${config.border}`,
          sizes.padding,
          sizes.gap,
          fullWidth && 'w-full',
          className
        )}
        role="alert"
        aria-live="polite"
        data-variant={variant}
        data-size={size}
        {...props}
      >
        {showIcon && (
          <div
            className={cn('flex-shrink-0', sizes.iconSize)}
            style={{ color: config.iconColor }}
            aria-hidden="true"
          >
            {icon || config.icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <h4
              className={cn(
                'font-semibold',
                config.text,
                sizes.titleSize,
                title && message && 'mb-1'
              )}
            >
              {title}
            </h4>
          )}

          {(message || children) && (
            <p
              className={cn(
                'text-text-secondary',
                sizes.messageSize,
                'leading-relaxed'
              )}
            >
              {children || message}
            </p>
          )}

          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={cn(
                  'text-sm font-medium',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-base',
                  action.variant === 'primary' && cn(
                    'text-white',
                    'px-3 py-1.5 rounded-md',
                    config.text.replace('var(--color-', 'bg-').replace(')', '')
                  ),
                  action.variant === 'secondary' && cn(
                    'text-text-primary',
                    'px-3 py-1.5 rounded-md',
                    'bg-bg-overlay hover:bg-bg-elevated',
                    'border border-border'
                  ),
                  action.variant === 'ghost' && cn(
                    config.text,
                    'hover:underline',
                    'px-0 py-0'
                  )
                )}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0',
              'p-1 -mr-1 -mt-1',
              'text-text-muted hover:text-text-primary',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
              'rounded'
            )}
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';

// =============================================================================
// 📦 PRE-CONFIGURED ALERT HELPERS
// =============================================================================

export function InfoAlert(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="info" {...props} />;
}

export function SuccessAlert(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="success" {...props} />;
}

export function WarningAlert(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="warning" {...props} />;
}

export function ErrorAlert(props: Omit<AlertBannerProps, 'variant'>) {
  return <AlertBanner variant="error" {...props} />;
}

// =============================================================================
// 📦 ALERT GROUP COMPONENT
// =============================================================================

export interface AlertGroupProps extends React.ComponentPropsWithoutRef<'div'> {
  children?: React.ReactNode;
  gap?: 'sm' | 'md' | 'lg';
}

export const AlertGroup = React.forwardRef<HTMLDivElement, AlertGroupProps>(
  ({ className, children, gap = 'md', ...props }, ref) => {
    const gapStyles = {
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    };

    return (
      <div
        ref={ref}
        className={cn('flex flex-col', gapStyles[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AlertGroup.displayName = 'AlertGroup';

export type { AlertBannerProps, AlertGroupProps, AlertVariant, AlertSize };
