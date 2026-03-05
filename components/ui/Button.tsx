'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Button Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, sizes, loading state, icons, full width
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant (visual style) */
  variant?: ButtonVariant;
  
  /** Button size */
  size?: ButtonSize;
  
  /** Button type */
  type?: ButtonType;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Left icon (Lucide component) */
  leftIcon?: React.ReactNode;
  
  /** Right icon (Lucide component) */
  rightIcon?: React.ReactNode;
  
  /** Full width button */
  fullWidth?: boolean;
  
  /** Custom className for the icon container */
  iconClassName?: string;
  
  /** Children (button text) */
  children?: React.ReactNode;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (padding, font size, icon size)
 */
const sizeStyles: Record<ButtonSize, {
  padding: string;
  fontSize: string;
  height: string;
  iconSize: string;
  gap: string;
}> = {
  sm: {
    padding: 'px-2.5 py-1.5',
    fontSize: 'text-xs',
    height: 'h-8',
    iconSize: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  md: {
    padding: 'px-4 py-2',
    fontSize: 'text-sm',
    height: 'h-9',
    iconSize: 'w-4 h-4',
    gap: 'gap-2',
  },
  lg: {
    padding: 'px-6 py-2.5',
    fontSize: 'text-base',
    height: 'h-10',
    iconSize: 'w-5 h-5',
    gap: 'gap-2.5',
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<ButtonVariant, {
  base: string;
  hover: string;
  active: string;
  disabled: string;
  focus: string;
}> = {
  primary: {
    base: 'bg-accent text-white',
    hover: 'hover:bg-accent-hover',
    active: 'active:bg-accent-hover',
    disabled: 'disabled:bg-accent/50 disabled:text-white/70',
    focus: 'focus:ring-accent focus:ring-offset-bg-base',
  },
  secondary: {
    base: 'bg-bg-overlay text-text-primary border border-border',
    hover: 'hover:bg-bg-elevated hover:border-border-hover',
    active: 'active:bg-bg-elevated',
    disabled: 'disabled:bg-bg-overlay disabled:text-text-muted disabled:border-border',
    focus: 'focus:ring-accent focus:ring-offset-bg-base',
  },
  ghost: {
    base: 'bg-transparent text-text-secondary',
    hover: 'hover:bg-bg-overlay hover:text-text-primary',
    active: 'active:bg-bg-overlay',
    disabled: 'disabled:bg-transparent disabled:text-text-muted',
    focus: 'focus:ring-accent focus:ring-offset-bg-base',
  },
  danger: {
    base: 'bg-transparent text-text-secondary',
    hover: 'hover:bg-error-subtle hover:text-error',
    active: 'active:bg-error-subtle',
    disabled: 'disabled:bg-transparent disabled:text-text-muted',
    focus: 'focus:ring-error focus:ring-offset-bg-base',
  },
  success: {
    base: 'bg-transparent text-text-secondary',
    hover: 'hover:bg-success-subtle hover:text-success',
    active: 'active:bg-success-subtle',
    disabled: 'disabled:bg-transparent disabled:text-text-muted',
    focus: 'focus:ring-success focus:ring-offset-bg-base',
  },
};

// =============================================================================
// 🏗️ BUTTON COMPONENT
// =============================================================================

/**
 * Button Component — wpPanel by Breach Rabbit UI
 * 
 * @example
 * <Button variant="primary">Click me</Button>
 * <Button variant="secondary" leftIcon={<Plus />}>Add</Button>
 * <Button variant="danger" isLoading>Deleting...</Button>
 * <Button variant="ghost" size="sm">Cancel</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      type = 'button',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      iconClassName,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    
    // Determine if button should be disabled
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          // Base styles
          'relative',
          'inline-flex items-center justify-center',
          'font-medium',
          'rounded-md',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:cursor-not-allowed',
          
          // Size
          sizes.padding,
          sizes.fontSize,
          sizes.height,
          sizes.gap,
          
          // Variant
          variantStyle.base,
          variantStyle.hover,
          variantStyle.active,
          variantStyle.disabled,
          variantStyle.focus,
          
          // Full width
          fullWidth && 'w-full',
          
          // Custom className
          className
        )}
        disabled={isDisabled}
        data-variant={variant}
        data-size={size}
        data-loading={isLoading}
        {...props}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <Loader2
            className={cn(
              'absolute animate-spin',
              sizes.iconSize,
              iconClassName
            )}
            aria-hidden="true"
          />
        )}

        {/* Left Icon */}
        {!isLoading && leftIcon && (
          <span
            className={cn(
              'flex items-center justify-center',
              sizes.iconSize,
              iconClassName
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        {/* Children (with visibility hidden during loading to maintain width) */}
        <span className={cn(isLoading && 'invisible')}>
          {children}
        </span>

        {/* Right Icon */}
        {!isLoading && rightIcon && (
          <span
            className={cn(
              'flex items-center justify-center',
              sizes.iconSize,
              iconClassName
            )}
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

// Set display name for debugging
Button.displayName = 'Button';

// =============================================================================
// 📦 ICON BUTTON COMPONENT
// =============================================================================

/**
 * IconButton — Square button for icon-only actions
 */
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  /** Icon component (Lucide) */
  icon: React.ReactNode;
  
  /** Icon size override */
  iconSize?: 'sm' | 'md' | 'lg';
  
  /** Tooltip text (optional) */
  tooltip?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      icon,
      iconSize,
      tooltip,
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'inline-flex items-center justify-center',
          'rounded-md',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:cursor-not-allowed',
          
          // Size (square)
          sizes.height,
          sizes.width || sizes.height,
          
          // Variant
          variantStyle.base,
          variantStyle.hover,
          variantStyle.active,
          variantStyle.disabled,
          variantStyle.focus,
          
          // Custom className
          className
        )}
        disabled={isDisabled}
        aria-label={tooltip}
        data-variant={variant}
        data-loading={isLoading}
        {...props}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <Loader2
            className={cn(
              'absolute animate-spin',
              iconSize === 'sm' ? 'w-3.5 h-3.5' :
              iconSize === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
            )}
            aria-hidden="true"
          />
        )}

        {/* Icon */}
        <span className={cn(isLoading && 'invisible')}>
          {icon}
        </span>
      </button>
    );
  }
);

// Set display name for debugging
IconButton.displayName = 'IconButton';

// =============================================================================
// 📦 BUTTON GROUP COMPONENT
// =============================================================================

/**
 * ButtonGroup — Group buttons together with connected styling
 */
export interface ButtonGroupProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Children (Button components) */
  children?: React.ReactNode;
  
  /** Vertical layout */
  vertical?: boolean;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, vertical = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex',
          vertical ? 'flex-col' : 'flex-row',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) {
            return child;
          }

          return React.cloneElement(child as React.ReactElement<any>, {
            className: cn(
              (child as React.ReactElement<any>).props.className,
              // Remove border radius on connected sides
              !vertical && index > 0 && 'rounded-l-none -ml-px',
              !vertical && index < React.Children.count(children) - 1 && 'rounded-r-none',
              vertical && index > 0 && 'rounded-t-none -mt-px',
              vertical && index < React.Children.count(children) - 1 && 'rounded-b-none',
              // Focus ring adjustments for grouped buttons
              'focus:z-10'
            ),
          });
        })}
      </div>
    );
  }
);

// Set display name for debugging
ButtonGroup.displayName = 'ButtonGroup';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { ButtonProps, IconButtonProps, ButtonGroupProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
 * import { Plus, Trash2, Settings, Check, X } from 'lucide-react';
 * 
 * // Simple button
 * <Button>Click me</Button>
 * 
 * // Different variants
 * <Button variant="primary">Primary</Button>
 * <Button variant="secondary">Secondary</Button>
 * <Button variant="ghost">Ghost</Button>
 * <Button variant="danger">Danger</Button>
 * <Button variant="success">Success</Button>
 * 
 * // Different sizes
 * <Button size="sm">Small</Button>
 * <Button size="md">Medium</Button>
 * <Button size="lg">Large</Button>
 * 
 * // With icons
 * <Button leftIcon={<Plus className="w-4 h-4" />}>Add Site</Button>
 * <Button rightIcon={<Check className="w-4 h-4" />}>Confirm</Button>
 * <Button leftIcon={<Trash2 className="w-4 h-4" />} variant="danger">Delete</Button>
 * 
 * // Loading state
 * <Button isLoading>Saving...</Button>
 * <Button isLoading variant="primary">Creating...</Button>
 * 
 * // Full width
 * <Button fullWidth>Full Width Button</Button>
 * 
 * // Disabled state
 * <Button disabled>Disabled</Button>
 * 
 * // Icon button
 * <IconButton icon={<Settings className="w-4 h-4" />} tooltip="Settings" />
 * <IconButton icon={<Trash2 className="w-4 h-4" />} variant="danger" tooltip="Delete" />
 * <IconButton icon={<Check className="w-4 h-4" />} variant="success" />
 * 
 * // Icon button sizes
 * <IconButton icon={<Plus className="w-3.5 h-3.5" />} size="sm" />
 * <IconButton icon={<Plus className="w-4 h-4" />} size="md" />
 * <IconButton icon={<Plus className="w-5 h-5" />} size="lg" />
 * 
 * // Button group (horizontal)
 * <ButtonGroup>
 *   <Button variant="secondary">Left</Button>
 *   <Button variant="secondary">Center</Button>
 *   <Button variant="secondary">Right</Button>
 * </ButtonGroup>
 * 
 * // Button group (vertical)
 * <ButtonGroup vertical>
 *   <Button variant="secondary">Top</Button>
 *   <Button variant="secondary">Middle</Button>
 *   <Button variant="secondary">Bottom</Button>
 * </ButtonGroup>
 * 
 * // In forms
 * <form onSubmit={handleSubmit}>
 *   <div className="flex gap-2">
 *     <Button type="button" variant="ghost">Cancel</Button>
 *     <Button type="submit" variant="primary" isLoading={isSubmitting}>
 *       Save Changes
 *     </Button>
 *   </div>
 * </form>
 * 
 * // In modals
 * <Modal.Footer>
 *   <Button variant="ghost" onClick={handleClose}>Cancel</Button>
 *   <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
 *     Delete
 *   </Button>
 * </Modal.Footer>
 * 
 * // In tables (action buttons)
 * <Table.Cell>
 *   <div className="flex items-center gap-1">
 *     <IconButton icon={<Eye className="w-4 h-4" />} tooltip="View" size="sm" />
 *     <IconButton icon={<Edit className="w-4 h-4" />} tooltip="Edit" size="sm" />
 *     <IconButton icon={<Trash2 className="w-4 h-4" />} tooltip="Delete" variant="danger" size="sm" />
 *   </div>
 * </Table.Cell>
 * 
 * // In cards
 * <Card.Footer>
 *   <div className="flex items-center justify-between">
 *     <Button variant="ghost" size="sm">Learn More</Button>
 *     <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
 *       Create
 *     </Button>
 *   </div>
 * </Card.Footer>
 * 
 * // With custom onClick and async operations
 * async function handleDelete() {
 *   setIsDeleting(true);
 *   try {
 *     await deleteItem(id);
 *   } finally {
 *     setIsDeleting(false);
 *   }
 * }
 * 
 * <Button 
 *   variant="danger" 
 *   onClick={handleDelete} 
 *   isLoading={isDeleting}
 * >
 *   {isDeleting ? 'Deleting...' : 'Delete'}
 * </Button>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Button Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - primary:
 *   - bg: var(--color-accent)       #3b82f6 (Blue)
 *   - hover: var(--color-accent-hover) #2563eb
 *   - text: white
 * 
 * - secondary:
 *   - bg: var(--color-bg-overlay)   #202020 (Dark)
 *   - border: var(--color-border)   rgba(255,255,255,0.07)
 *   - text: var(--color-text-primary) #f0f0f0
 * 
 * - ghost:
 *   - bg: transparent
 *   - hover: var(--color-bg-overlay)
 *   - text: var(--color-text-secondary) #888888
 * 
 * - danger:
 *   - bg: transparent
 *   - hover: var(--color-error-subtle) rgba(239,68,68,0.10)
 *   - text: var(--color-error) #ef4444
 * 
 * - success:
 *   - bg: transparent
 *   - hover: var(--color-success-subtle) rgba(16,185,129,0.10)
 *   - text: var(--color-success) #10b981
 * 
 * Sizing:
 * - sm: h-8 (32px), px-2.5 py-1.5, text-xs (12px), icon: w-3.5 h-3.5
 * - md: h-9 (36px), px-4 py-2, text-sm (14px), icon: w-4 h-4 — DEFAULT
 * - lg: h-10 (40px), px-6 py-2.5, text-base (16px), icon: w-5 h-5
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Transitions:
 * - 150ms ease-out for hover/focus states
 * - No heavy spring animations
 * 
 * Accessibility:
 * - Focus visible ring (2px)
 * - Disabled state with proper attributes
 * - aria-label for icon buttons
 * - Proper button type (button/submit/reset)
 * - Loading state with spinner
 * 
 * Performance:
 * - CSS-first (no JS for hover/focus states)
 * - Minimal runtime overhead
 * - Tree-shaken Lucide icons
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Form submissions (primary)
 * - Cancel actions (ghost)
 * - Destructive actions (danger)
 * - Secondary actions (secondary)
 * - Icon-only actions (IconButton)
 * - Button groups (segmented controls)
 * - Loading states (async operations)
 * - Full width buttons (mobile, modals)
 */