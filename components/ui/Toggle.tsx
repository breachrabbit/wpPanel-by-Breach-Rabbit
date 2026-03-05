'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Toggle Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Radix UI Switch primitive, multiple sizes, labels, loading state
// =============================================================================

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type ToggleSize = 'sm' | 'md' | 'lg';

export interface ToggleProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  /** Toggle size */
  size?: ToggleSize;
  
  /** Label text */
  label?: string;
  
  /** Label description/helper text */
  description?: string;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Show label on the right (default) or left */
  labelPosition?: 'left' | 'right';
  
  /** Custom className for the thumb */
  thumbClassName?: string;
  
  /** Custom className for the label container */
  labelClassName?: string;
}

// =============================================================================
// ⚙️ SIZE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (track and thumb dimensions)
 */
const sizeStyles: Record<ToggleSize, {
  track: {
    width: string;
    height: string;
    padding: string;
  };
  thumb: {
    width: string;
    height: string;
    translate: string;
  };
  label: string;
  gap: string;
}> = {
  sm: {
    track: {
      width: 'w-8',
      height: 'h-4',
      padding: 'p-0.5',
    },
    thumb: {
      width: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    label: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    track: {
      width: 'w-10',
      height: 'h-5',
      padding: 'p-0.5',
    },
    thumb: {
      width: 'w-4 h-4',
      translate: 'translate-x-5',
    },
    label: 'text-sm',
    gap: 'gap-2.5',
  },
  lg: {
    track: {
      width: 'w-12',
      height: 'h-6',
      padding: 'p-0.5',
    },
    thumb: {
      width: 'w-5 h-5',
      translate: 'translate-x-6',
    },
    label: 'text-base',
    gap: 'gap-3',
  },
};

// =============================================================================
// 🏗️ TOGGLE COMPONENT
// =============================================================================

/**
 * Toggle Component — wpPanel by Breach Rabbit UI
 * 
 * Built on Radix UI Switch primitives for full accessibility.
 * 
 * @example
 * <Toggle label="Enable feature" />
 * <Toggle label="Auto-restart" description="Automatically restart on failure" />
 * <Toggle isLoading label="Loading..." />
 * <Toggle size="lg" label="Large toggle" />
 */
export const Toggle = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  ToggleProps
>(
  (
    {
      className,
      size = 'md',
      label,
      description,
      isLoading = false,
      labelPosition = 'right',
      thumbClassName,
      labelClassName,
      disabled,
      checked,
      onCheckedChange,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const isDisabled = disabled || isLoading;
    
    // Generate unique ID if not provided (useId for SSR hydration safety)
    const reactId = React.useId();
    const toggleId = id || `toggle-${reactId}`;
    const labelId = label ? `${toggleId}-label` : undefined;
    const descriptionId = description ? `${toggleId}-description` : undefined;

    return (
      <div
        className={cn(
          'flex items-center',
          labelPosition === 'right' ? 'flex-row' : 'flex-row-reverse',
          sizes.gap,
          className
        )}
      >
        {/* Label Container */}
        {(label || description) && (
          <div className={cn('flex flex-col', labelClassName)}>
            {label && (
              <label
                id={labelId}
                htmlFor={toggleId}
                className={cn(
                  'font-medium',
                  'text-text-primary',
                  sizes.label,
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                id={descriptionId}
                className={cn(
                  'text-text-muted',
                  'text-xs',
                  'mt-0.5',
                  isDisabled && 'opacity-50'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Switch */}
        <SwitchPrimitives.Root
          ref={ref}
          id={toggleId}
          className={cn(
            // Base styles
            'relative',
            'inline-flex',
            'items-center',
            'rounded-full',
            'transition-all duration-150 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            
            // Size
            sizes.track.width,
            sizes.track.height,
            sizes.track.padding,
            
            // Colors (using CSS variables)
            'bg-bg-overlay',
            'data-[state=checked]:bg-accent',
            
            // Custom className
            className
          )}
          disabled={isDisabled}
          checked={checked}
          onCheckedChange={onCheckedChange}
          required={required}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          {...props}
        >
          {/* Thumb */}
          <SwitchPrimitives.Thumb
            className={cn(
              // Base styles
              'block',
              'rounded-full',
              'bg-white',
              'transition-transform duration-150 ease-out',
              'will-change-transform',
              
              // Size
              sizes.thumb.width,
              sizes.thumb.height,
              
              // Transform (unchecked state)
              'translate-x-0',
              
              // Transform (checked state)
              'data-[state=checked]:' + sizes.thumb.translate,
              
              // Loading state
              isLoading && 'opacity-50',
              
              // Custom className
              thumbClassName
            )}
          >
            {/* Loading Spinner (inside thumb) */}
            {isLoading && (
              <Loader2 className={cn('w-full h-full p-0.5 animate-spin text-accent')} />
            )}
          </SwitchPrimitives.Thumb>
        </SwitchPrimitives.Root>
      </div>
    );
  }
);

// Set display name for debugging
Toggle.displayName = 'Toggle';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { ToggleProps, ToggleSize };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Toggle } from '@/components/ui/Toggle';
 * 
 * // Simple toggle
 * <Toggle />
 * 
 * // With label
 * <Toggle label="Enable feature" />
 * 
 * // With label and description
 * <Toggle 
 *   label="Auto-restart" 
 *   description="Automatically restart on failure" 
 * />
 * 
 * // Different sizes
 * <Toggle size="sm" label="Small" />
 * <Toggle size="md" label="Medium" />
 * <Toggle size="lg" label="Large" />
 * 
 * // Loading state
 * <Toggle isLoading label="Saving..." />
 * 
 * // Disabled state
 * <Toggle disabled label="Disabled" />
 * 
 * // Controlled state
 * const [enabled, setEnabled] = useState(false);
 * 
 * <Toggle 
 *   checked={enabled} 
 *   onCheckedChange={setEnabled} 
 *   label="Enable feature" 
 * />
 * 
 * // Label on left
 * <Toggle labelPosition="left" label="Label on left" />
 * 
 * // In forms (React Hook Form)
 * import { useForm } from 'react-hook-form';
 * 
 * function SettingsForm() {
 *   const { register, handleSubmit } = useForm();
 *   
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <Toggle
 *         label="Auto-restart"
 *         description="Automatically restart site on failure"
 *         {...register('autoRestart')}
 *       />
 *       <Toggle
 *         label="Health Check"
 *         description="Monitor site availability every 60 seconds"
 *         {...register('healthCheck')}
 *       />
 *       <Button type="submit">Save Settings</Button>
 *     </form>
 *   );
 * }
 * 
 * // In settings page
 * <div className="space-y-4">
 *   <Toggle
 *     label="Enable SSL"
 *     description="Automatically issue and renew SSL certificates"
 *     checked={sslEnabled}
 *     onCheckedChange={setSslEnabled}
 *   />
 *   <Toggle
 *     label="Force HTTPS"
 *     description="Redirect all HTTP traffic to HTTPS"
 *     checked={forceHttps}
 *     onCheckedChange={setForceHttps}
 *     disabled={!sslEnabled}
 *   />
 * </div>
 * 
 * // In site creation
 * <Toggle
 *   label="Auto-restart on crash"
 *   description="Automatically restart site if it becomes unresponsive"
 *   checked={autoRestart}
 *   onCheckedChange={setAutoRestart}
 * />
 * 
 * // In backup settings
 * <Toggle
 *   label="Enable automatic backups"
 *   description="Create daily backups at 3:00 AM"
 *   checked={autoBackups}
 *   onCheckedChange={setAutoBackups}
 * />
 * 
 * // In monitoring settings
 * <Toggle
 *   label="Email notifications"
 *   description="Receive alerts via email"
 *   checked={emailNotifications}
 *   onCheckedChange={setEmailNotifications}
 * />
 * 
 * <Toggle
 *   label="Telegram notifications"
 *   description="Receive alerts via Telegram bot"
 *   checked={telegramNotifications}
 *   onCheckedChange={setTelegramNotifications}
 * />
 * 
 * // With loading state (async operation)
 * async function handleToggle() {
 *   setIsLoading(true);
 *   try {
 *     await updateSetting({ enabled: !enabled });
 *     setEnabled(!enabled);
 *   } finally {
 *     setIsLoading(false);
 *   }
 * }
 * 
 * <Toggle
 *   label="Enable feature"
 *   checked={enabled}
 *   onCheckedChange={handleToggle}
 *   isLoading={isLoading}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Toggle Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - Track (unchecked): var(--color-bg-overlay)   #202020 (Dark)
 * - Track (checked):   var(--color-accent)       #3b82f6 (Blue)
 * - Thumb:             white                     #ffffff
 * - Label:             var(--color-text-primary) #f0f0f0
 * - Description:       var(--color-text-muted)   #444444
 * 
 * Sizing:
 * - sm: track w-8 h-4  (32x16px), thumb w-3 h-3  (12x12px), label: text-xs
 * - md: track w-10 h-5 (40x20px), thumb w-4 h-4  (16x16px), label: text-sm — DEFAULT
 * - lg: track w-12 h-6 (48x24px), thumb w-5 h-5  (20x20px), label: text-base
 * 
 * Border Radius:
 * - Track: rounded-full (50%)
 * - Thumb: rounded-full (50%)
 * 
 * Transitions:
 * - 150ms ease-out for track color change
 * - 150ms ease-out for thumb translate
 * - will-change-transform for smooth animation
 * 
 * Accessibility:
 * - Radix UI Switch primitives for full ARIA support
 * - aria-labelledby for label association
 * - aria-describedby for description
 * - Keyboard navigation (Space to toggle, Tab to focus)
 * - Focus visible ring (2px accent)
 * - Disabled state with proper attributes
 * - Loading state with spinner
 * 
 * Performance:
 * - Radix UI primitives (minimal JS overhead)
 * - CSS-first (no JS for hover/focus states)
 * - will-change-transform for GPU acceleration
 * - Tree-shaken Lucide icons (only for loading)
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Site auto-restart toggle
 * - Health check enable/disable
 * - SSL auto-renewal
 * - Force HTTPS redirect
 * - Email/Telegram notifications
 * - Automatic backups
 * - 2FA enable/disable
 * - Auto-update settings
 * - Monitoring alerts
 * - Firewall rules toggle
 */