'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Checkbox Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Radix UI Checkbox primitive, multiple sizes, variants, indeterminate state
// =============================================================================

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/lib/utils';
import { Check, Minus } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type CheckboxVariant = 'default' | 'error' | 'success';
export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> {
  /** Checkbox variant (visual style) */
  variant?: CheckboxVariant;
  
  /** Checkbox size */
  size?: CheckboxSize;
  
  /** Label text */
  label?: string;
  
  /** Label description/helper text */
  description?: string;
  
  /** Indeterminate state (for partial selection) */
  indeterminate?: boolean;
  
  /** Custom className for the indicator */
  indicatorClassName?: string;
  
  /** Custom className for the label container */
  labelClassName?: string;
  
  /** Custom className for the checkbox wrapper */
  wrapperClassName?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Required state */
  required?: boolean;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (checkbox and icon dimensions)
 */
const sizeStyles: Record<CheckboxSize, {
  checkbox: {
    width: string;
    height: string;
    radius: string;
  };
  icon: string;
  label: string;
  description: string;
  gap: string;
}> = {
  sm: {
    checkbox: {
      width: 'w-4',
      height: 'h-4',
      radius: 'rounded-sm',
    },
    icon: 'w-3 h-3',
    label: 'text-xs',
    description: 'text-xs',
    gap: 'gap-2',
  },
  md: {
    checkbox: {
      width: 'w-4.5',
      height: 'h-4.5',
      radius: 'rounded-md',
    },
    icon: 'w-3.5 h-3.5',
    label: 'text-sm',
    description: 'text-xs',
    gap: 'gap-2.5',
  },
  lg: {
    checkbox: {
      width: 'w-5',
      height: 'h-5',
      radius: 'rounded-md',
    },
    icon: 'w-4 h-4',
    label: 'text-base',
    description: 'text-sm',
    gap: 'gap-3',
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<CheckboxVariant, {
  unchecked: string;
  checked: string;
  focus: string;
  disabled: string;
}> = {
  default: {
    unchecked: 'bg-bg-base border-border hover:border-border-hover',
    checked: 'bg-accent border-accent',
    focus: 'focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
    disabled: 'disabled:bg-bg-overlay disabled:border-border disabled:opacity-50',
  },
  error: {
    unchecked: 'bg-bg-base border-error hover:border-error',
    checked: 'bg-error border-error',
    focus: 'focus:ring-2 focus:ring-error focus:ring-offset-2 focus:ring-offset-bg-base',
    disabled: 'disabled:bg-bg-overlay disabled:border-border disabled:opacity-50',
  },
  success: {
    unchecked: 'bg-bg-base border-success hover:border-success',
    checked: 'bg-success border-success',
    focus: 'focus:ring-2 focus:ring-success focus:ring-offset-2 focus:ring-offset-bg-base',
    disabled: 'disabled:bg-bg-overlay disabled:border-border disabled:opacity-50',
  },
};

// =============================================================================
// 🏗️ CHECKBOX COMPONENT
// =============================================================================

/**
 * Checkbox Component — wpPanel by Breach Rabbit UI
 * 
 * Built on Radix UI Checkbox primitives for full accessibility.
 * 
 * @example
 * <Checkbox label="I agree to the terms" />
 * <Checkbox label="Enable feature" description="This will enable the feature" />
 * <Checkbox indeterminate label="Partial selection" />
 * <Checkbox variant="error" errorMessage="Required" />
 */
export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      label,
      description,
      indeterminate = false,
      indicatorClassName,
      labelClassName,
      wrapperClassName,
      disabled,
      required,
      id,
      checked,
      onCheckedChange,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    
    // Generate unique ID if not provided
    const reactId = React.useId();
    const checkboxId = id || `checkbox-${reactId}`;
    const labelId = label ? `${checkboxId}-label` : undefined;
    const descriptionId = description ? `${checkboxId}-description` : undefined;
    
    // Handle indeterminate state
    const isIndeterminate = indeterminate || (checked === 'indeterminate');

    return (
      <div
        className={cn(
          'flex items-start',
          sizes.gap,
          disabled && 'opacity-50 cursor-not-allowed',
          wrapperClassName
        )}
      >
        {/* Checkbox */}
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          className={cn(
            // Base styles
            'relative',
            'flex items-center justify-center',
            'flex-shrink-0',
            'transition-all duration-150 ease-out',
            'focus:outline-none',
            
            // Size
            sizes.checkbox.width,
            sizes.checkbox.height,
            sizes.checkbox.radius,
            
            // Variant
            variantStyle.unchecked,
            'data-[state=checked]:' + variantStyle.checked,
            variantStyle.focus,
            variantStyle.disabled,
            
            // Custom className
            className
          )}
          disabled={disabled}
          required={required}
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          {...props}
        >
          {/* Indicator */}
          <CheckboxPrimitive.Indicator
            className={cn(
              'flex items-center justify-center',
              'text-white',
              'transition-opacity duration-150 ease-out',
              indicatorClassName
            )}
          >
            {isIndeterminate ? (
              <Minus className={sizes.icon} aria-hidden="true" />
            ) : (
              <Check className={sizes.icon} aria-hidden="true" />
            )}
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>

        {/* Label Container */}
        {(label || description) && (
          <div className={cn('flex flex-col flex-1', labelClassName)}>
            {label && (
              <label
                id={labelId}
                htmlFor={checkboxId}
                className={cn(
                  'font-medium',
                  'text-text-primary',
                  sizes.label,
                  'cursor-pointer',
                  disabled && 'cursor-not-allowed'
                )}
              >
                {label}
                {required && (
                  <span className="text-error ml-1" aria-hidden="true">*</span>
                )}
              </label>
            )}
            {description && (
              <p
                id={descriptionId}
                className={cn(
                  'text-text-muted',
                  sizes.description,
                  'mt-0.5',
                  disabled && 'opacity-50'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
Checkbox.displayName = 'Checkbox';

// =============================================================================
// 📦 CHECKBOX GROUP COMPONENT
// =============================================================================

/**
 * CheckboxGroup — Group multiple checkboxes with common label
 */
export interface CheckboxGroupProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Group label */
  label?: string;
  
  /** Group description */
  description?: string;
  
  /** Orientation (vertical/horizontal) */
  orientation?: 'vertical' | 'horizontal';
  
  /** Children (Checkbox components) */
  children?: React.ReactNode;
}

export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  (
    {
      className,
      label,
      description,
      orientation = 'vertical',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('w-full', className)}
        {...props}
      >
        {label && (
          <div className="mb-3">
            <div className="text-sm font-medium text-text-primary">{label}</div>
            {description && (
              <div className="text-xs text-text-muted mt-0.5">{description}</div>
            )}
          </div>
        )}
        
        <div
          className={cn(
            'flex gap-4',
            orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

// Set display name for debugging
CheckboxGroup.displayName = 'CheckboxGroup';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { CheckboxProps, CheckboxGroupProps, CheckboxVariant, CheckboxSize };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Checkbox, CheckboxGroup } from '@/components/ui/Checkbox';
 * 
 * // Simple checkbox
 * <Checkbox />
 * 
 * // With label
 * <Checkbox label="I agree to the terms" />
 * 
 * // With label and description
 * <Checkbox 
 *   label="Enable feature" 
 *   description="This will enable the feature for all users" 
 * />
 * 
 * // Different sizes
 * <Checkbox size="sm" label="Small" />
 * <Checkbox size="md" label="Medium" />
 * <Checkbox size="lg" label="Large" />
 * 
 * // Different variants
 * <Checkbox variant="default" label="Default" />
 * <Checkbox variant="error" label="Error state" />
 * <Checkbox variant="success" label="Success state" />
 * 
 * // Indeterminate state (for partial selection)
 * <Checkbox indeterminate label="Partial selection" />
 * 
 * // Disabled state
 * <Checkbox disabled label="Disabled" />
 * 
 * // Required field
 * <Checkbox required label="Required *" />
 * 
 * // Controlled state
 * const [checked, setChecked] = useState(false);
 * 
 * <Checkbox 
 *   checked={checked} 
 *   onCheckedChange={setChecked} 
 *   label="Toggle feature" 
 * />
 * 
 * // Checkbox group (vertical)
 * <CheckboxGroup label="Select options" orientation="vertical">
 *   <Checkbox value="1" label="Option 1" />
 *   <Checkbox value="2" label="Option 2" />
 *   <Checkbox value="3" label="Option 3" />
 * </CheckboxGroup>
 * 
 * // Checkbox group (horizontal)
 * <CheckboxGroup label="Select options" orientation="horizontal">
 *   <Checkbox value="1" label="Option 1" />
 *   <Checkbox value="2" label="Option 2" />
 *   <Checkbox value="3" label="Option 3" />
 * </CheckboxGroup>
 * 
 * // In forms (React Hook Form)
 * import { useForm } from 'react-hook-form';
 * 
 * function SettingsForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm();
 *   
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <Checkbox
 *         label="Enable auto-restart"
 *         description="Automatically restart site on failure"
 *         {...register('autoRestart')}
 *       />
 *       <Checkbox
 *         label="Enable health check"
 *         description="Monitor site availability every 60 seconds"
 *         {...register('healthCheck')}
 *       />
 *       <Checkbox
 *         label="I agree to the terms and conditions"
 *         {...register('terms', { required: 'You must agree to the terms' })}
 *       />
 *       {errors.terms && (
 *         <p className="text-error text-xs mt-1">{errors.terms.message}</p>
 *       )}
 *       <Button type="submit">Save Settings</Button>
 *     </form>
 *   );
 * }
 * 
 * // Multi-select with indeterminate state
 * function MultiSelect() {
 *   const [allChecked, setAllChecked] = useState(false);
 *   const [items, setItems] = useState([
 *     { id: '1', label: 'Item 1', checked: false },
 *     { id: '2', label: 'Item 2', checked: false },
 *     { id: '3', label: 'Item 3', checked: false },
 *   ]);
 *   
 *   const indeterminate = items.some(i => i.checked) && !items.every(i => i.checked);
 *   const allCheckedState = items.every(i => i.checked);
 *   
 *   return (
 *     <div className="space-y-2">
 *       <Checkbox
 *         checked={allCheckedState}
 *         indeterminate={indeterminate}
 *         label="Select all"
 *         onCheckedChange={(checked) => {
 *           setItems(items.map(item => ({ ...item, checked: checked as boolean })));
 *         }}
 *       />
 *       {items.map(item => (
 *         <Checkbox
 *           key={item.id}
 *           checked={item.checked}
 *           label={item.label}
 *           onCheckedChange={(checked) => {
 *             setItems(items.map(i => 
 *               i.id === item.id ? { ...i, checked: checked as boolean } : i
 *             ));
 *           }}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * 
 * // In backup settings
 * <CheckboxGroup label="Backup Options" orientation="vertical">
 *   <Checkbox 
 *     label="Include files" 
 *     defaultChecked 
 *     description="Backup all website files" 
 *   />
 *   <Checkbox 
 *     label="Include databases" 
 *     defaultChecked 
 *     description="Backup all databases" 
 *   />
 *   <Checkbox 
 *     label="Include configs" 
 *     description="Backup server configurations" 
 *   />
 * </CheckboxGroup>
 * 
 * // In terms acceptance
 * <Checkbox
 *   label={
 *     <span>
 *       I agree to the{' '}
 *       <a href="/terms" className="text-accent hover:underline">Terms of Service</a>{' '}
 *       and{' '}
 *       <a href="/privacy" className="text-accent hover:underline">Privacy Policy</a>
 *     </span>
 *   }
 *   required
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Checkbox Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - unchecked:
 *   - bg: var(--color-bg-base)       #080808 (Dark)
 *   - border: var(--color-border)    rgba(255,255,255,0.07)
 *   - hover: var(--color-border-hover) rgba(255,255,255,0.12)
 * 
 * - checked (default):
 *   - bg: var(--color-accent)        #3b82f6 (Blue)
 *   - border: var(--color-accent)    #3b82f6
 *   - icon: white                    #ffffff
 * 
 * - checked (error):
 *   - bg: var(--color-error)         #ef4444 (Red)
 *   - border: var(--color-error)     #ef4444
 * 
 * - checked (success):
 *   - bg: var(--color-success)       #10b981 (Green)
 *   - border: var(--color-success)   #10b981
 * 
 * Sizing:
 * - sm: checkbox w-4 h-4  (16x16px), icon: w-3 h-3,   label: text-xs
 * - md: checkbox w-4.5 h-4.5 (18x18px), icon: w-3.5 h-3.5, label: text-sm — DEFAULT
 * - lg: checkbox w-5 h-5  (20x20px), icon: w-4 h-4,   label: text-base
 * 
 * Border Radius:
 * - sm: rounded-sm (2px)
 * - md/lg: rounded-md (4px)
 * 
 * Transitions:
 * - 150ms ease-out for state changes
 * - Smooth check/uncheck animation
 * 
 * Accessibility:
 * - Radix UI Checkbox primitives for full ARIA support
 * - aria-labelledby for label association
 * - aria-describedby for description
 * - Keyboard navigation (Space to toggle, Tab to focus)
 * - Focus visible ring (2px)
 * - Required indicator (*)
 * - Indeterminate state support
 * 
 * Performance:
 * - Radix UI primitives (minimal JS overhead)
 * - CSS-first (no JS for hover/focus states)
 * - Tree-shaken Lucide icons
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Terms acceptance (login/signup)
 * - Backup options (files/databases/configs)
 * - Notification preferences (email/Telegram)
 * - Feature toggles (multiple options)
 * - Bulk selection (tables, lists)
 * - Form consent checkboxes
 * - Settings groups (multiple related options)
 */