'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Select Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Radix UI primitives, multiple sizes, variants, icons, validation
// =============================================================================

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type SelectVariant = 'default' | 'error' | 'success';
export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root> {
  /** Select variant (visual style) */
  variant?: SelectVariant;
  
  /** Select size */
  size?: SelectSize;
  
  /** Label text */
  label?: string;
  
  /** Helper/description text */
  helperText?: string;
  
  /** Error message (overrides helperText when error) */
  errorMessage?: string;
  
  /** Success message */
  successMessage?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Full width select */
  fullWidth?: boolean;
  
  /** Custom className for the trigger */
  triggerClassName?: string;
  
  /** Custom className for the content */
  contentClassName?: string;
  
  /** Custom className for the label */
  labelClassName?: string;
  
  /** Custom className for the select wrapper */
  wrapperClassName?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Required state */
  required?: boolean;
  
  /** Custom icon */
  icon?: React.ReactNode;
}

export interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  /** Custom className for the item */
  className?: string;
}

export interface SelectGroupProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Group> {
  /** Group label */
  label?: string;
  
  /** Custom className for the group */
  className?: string;
}

export interface SelectLabelProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label> {
  /** Custom className for the label */
  className?: string;
}

export interface SelectSeparatorProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator> {
  /** Custom className for the separator */
  className?: string;
}

export interface SelectValueProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value> {
  /** Custom className for the value */
  className?: string;
}

export interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> {
  /** Custom className for the trigger */
  className?: string;
}

export interface SelectContentProps extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  /** Custom className for the content */
  className?: string;
  
  /** Position of the content */
  position?: 'popper' | 'item-aligned';
  
  /** Side of the content */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (padding, font size, height)
 */
const sizeStyles: Record<SelectSize, {
  height: string;
  padding: string;
  fontSize: string;
  iconSize: string;
}> = {
  sm: {
    height: 'h-8',
    padding: 'px-2.5 py-1.5',
    fontSize: 'text-xs',
    iconSize: 'w-3.5 h-3.5',
  },
  md: {
    height: 'h-9',
    padding: 'px-3 py-2',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
  },
  lg: {
    height: 'h-10',
    padding: 'px-4 py-2.5',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<SelectVariant, {
  base: string;
  border: string;
  focus: string;
  placeholder: string;
}> = {
  default: {
    base: 'bg-bg-base text-text-primary',
    border: 'border-border hover:border-border-hover',
    focus: 'focus:border-accent focus:ring-2 focus:ring-accent-subtle',
    placeholder: 'text-text-muted',
  },
  error: {
    base: 'bg-bg-base text-text-primary',
    border: 'border-error hover:border-error',
    focus: 'focus:border-error focus:ring-2 focus:ring-error-subtle',
    placeholder: 'text-text-muted',
  },
  success: {
    base: 'bg-bg-base text-text-primary',
    border: 'border-success hover:border-success',
    focus: 'focus:border-success focus:ring-2 focus:ring-success-subtle',
    placeholder: 'text-text-muted',
  },
};

// =============================================================================
// 🏗️ SELECT COMPONENT
// =============================================================================

/**
 * Select Component — wpPanel by Breach Rabbit UI
 * 
 * Built on Radix UI Select primitives for full accessibility.
 * 
 * @example
 * <Select>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select option" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *     <SelectItem value="2">Option 2</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * <Select label="Status" errorMessage="Required">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select status" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="active">Active</SelectItem>
 *     <SelectItem value="inactive">Inactive</SelectItem>
 *   </SelectContent>
 * </Select>
 */
export const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Root>,
  SelectProps
>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      errorMessage,
      successMessage,
      placeholder,
      fullWidth = true,
      triggerClassName,
      contentClassName,
      labelClassName,
      wrapperClassName,
      disabled,
      required,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    
    // Determine effective variant based on state
    const effectiveVariant = errorMessage ? 'error' : successMessage ? 'success' : variant;
    
    // Determine effective message
    const effectiveMessage = errorMessage || successMessage || helperText;
    const messageVariant = errorMessage ? 'error' : successMessage ? 'success' : 'default';
    
    // Generate unique ID if not provided
    const reactId = React.useId();
    const selectId = props.id || `select-${reactId}`;
    const labelId = label ? `${selectId}-label` : undefined;
    const helperId = effectiveMessage ? `${selectId}-helper` : undefined;

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            id={labelId}
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              messageVariant === 'error' ? 'text-error' :
              messageVariant === 'success' ? 'text-success' :
              'text-text-secondary',
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="text-error ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        {/* Select Root */}
        <SelectPrimitive.Root
          ref={ref}
          disabled={disabled}
          required={required}
          {...props}
        >
          {/* Select Trigger */}
          <SelectPrimitive.Trigger
            id={selectId}
            className={cn(
              // Base styles
              'relative',
              'w-full',
              'inline-flex items-center justify-between',
              'rounded-md',
              'transition-all duration-150 ease-out',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-overlay',
              'focus:outline-none focus:ring-offset-0',
              
              // Size
              sizes.height,
              sizes.padding,
              sizes.fontSize,
              
              // Variant
              variantStyle.base,
              variantStyle.border,
              variantStyle.focus,
              
              // Full width
              fullWidth && 'w-full',
              
              // Custom className
              triggerClassName
            )}
            aria-labelledby={labelId}
            aria-describedby={helperId}
            aria-invalid={!!errorMessage}
          >
            {/* Left Icon */}
            {icon && (
              <span className="flex items-center mr-2 text-text-muted">
                {icon}
              </span>
            )}
            
            {/* Value */}
            <SelectPrimitive.Value
              placeholder={placeholder}
              className={cn(
                'flex-1 text-left',
                !props.value && sizes.placeholder
              )}
            />
            
            {/* Chevron Icon */}
            <SelectPrimitive.Icon asChild>
              <ChevronDown className={cn('ml-2', sizes.iconSize, 'text-text-muted')} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          {/* Select Content */}
          <SelectPrimitive.Content
            className={cn(
              // Base styles
              'relative',
              'z-50',
              'min-w-[8rem]',
              'overflow-hidden',
              'rounded-md',
              'bg-bg-elevated',
              'border border-border',
              'shadow-elevated',
              
              // Animations
              'animate-slide-up',
              
              // Custom className
              contentClassName
            )}
            position={props.position || 'popper'}
            side={props.side || 'bottom'}
            sideOffset={8}
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-bg-elevated text-text-muted cursor-default">
              <ChevronUp className="w-4 h-4" />
            </SelectPrimitive.ScrollUpButton>
            
            <SelectPrimitive.Viewport className="p-1">
              {children}
            </SelectPrimitive.Viewport>
            
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-bg-elevated text-text-muted cursor-default">
              <ChevronDown className="w-4 h-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Root>

        {/* Helper/Error/Success Message */}
        {effectiveMessage && (
          <p
            id={helperId}
            className={cn(
              'mt-1.5 text-xs',
              messageVariant === 'error' ? 'text-error' :
              messageVariant === 'success' ? 'text-success' :
              'text-text-muted'
            )}
            role={messageVariant === 'error' ? 'alert' : undefined}
          >
            {effectiveMessage}
          </p>
        )}
      </div>
    );
  }
);

// Set display name for debugging
Select.displayName = 'Select';

// =============================================================================
// 📦 SELECT ITEM COMPONENT
// =============================================================================

/**
 * SelectItem — Individual select option
 */
export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>(({ className, children, ...props }, ref) => {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        // Base styles
        'relative',
        'flex items-center',
        'w-full',
        'rounded-sm',
        'px-3 py-2',
        'text-sm',
        'text-text-secondary',
        'transition-colors',
        'cursor-pointer',
        'focus:outline-none',
        'focus:bg-bg-overlay',
        'focus:text-text-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        
        // Custom className
        className
      )}
      {...props}
    >
      {/* Check Icon */}
      <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center justify-center">
        <Check className="w-4 h-4 text-accent" />
      </SelectPrimitive.ItemIndicator>
      
      {/* Item Text */}
      <SelectPrimitive.ItemText className="pl-6">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});

// Set display name for debugging
SelectItem.displayName = 'SelectItem';

// =============================================================================
// 📦 SELECT GROUP COMPONENT
// =============================================================================

/**
 * SelectGroup — Group select items with label
 */
export const SelectGroup = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Group>,
  SelectGroupProps
>(({ label, className, children, ...props }, ref) => {
  return (
    <SelectPrimitive.Group ref={ref} {...props}>
      {label && (
        <SelectPrimitive.Label
          className={cn(
            'px-3 py-2',
            'text-xs font-medium',
            'text-text-muted'
          )}
        >
          {label}
        </SelectPrimitive.Label>
      )}
      <SelectPrimitive.Viewport className={className}>
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Group>
  );
});

// Set display name for debugging
SelectGroup.displayName = 'SelectGroup';

// =============================================================================
// 📦 SELECT LABEL COMPONENT
// =============================================================================

/**
 * SelectLabel — Label for select group
 */
export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  SelectLabelProps
>(({ className, ...props }, ref) => {
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn(
        'px-3 py-2',
        'text-xs font-medium',
        'text-text-muted'
      )}
      {...props}
    />
  );
});

// Set display name for debugging
SelectLabel.displayName = 'SelectLabel';

// =============================================================================
// 📦 SELECT SEPARATOR COMPONENT
// =============================================================================

/**
 * SelectSeparator — Visual separator between groups
 */
export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  SelectSeparatorProps
>(({ className, ...props }, ref) => {
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn(
        'my-1',
        'h-px',
        'bg-border'
      )}
      {...props}
    />
  );
});

// Set display name for debugging
SelectSeparator.displayName = 'SelectSeparator';

// =============================================================================
// 📦 SELECT VALUE COMPONENT
// =============================================================================

/**
 * SelectValue — Display selected value
 */
export const SelectValue = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Value>,
  SelectValueProps
>(({ className, ...props }, ref) => {
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn(
        'flex-1 text-left',
        className
      )}
      {...props}
    />
  );
});

// Set display name for debugging
SelectValue.displayName = 'SelectValue';

// =============================================================================
// 📦 SELECT TRIGGER COMPONENT
// =============================================================================

/**
 * SelectTrigger — Custom trigger for advanced use cases
 */
export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, ...props }, ref) => {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        // Base styles
        'relative',
        'w-full',
        'inline-flex items-center justify-between',
        'rounded-md',
        'transition-all duration-150 ease-out',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
        
        // Custom className
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

// Set display name for debugging
SelectTrigger.displayName = 'SelectTrigger';

// =============================================================================
// 📦 SELECT CONTENT COMPONENT
// =============================================================================

/**
 * SelectContent — Custom content for advanced use cases
 */
export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(({ className, position = 'popper', side = 'bottom', children, ...props }, ref) => {
  return (
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        // Base styles
        'relative',
        'z-50',
        'min-w-[8rem]',
        'overflow-hidden',
        'rounded-md',
        'bg-bg-elevated',
        'border border-border',
        'shadow-elevated',
        
        // Animations
        'animate-slide-up',
        
        // Custom className
        className
      )}
      position={position}
      side={side}
      sideOffset={8}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-bg-elevated text-text-muted cursor-default">
        <ChevronUp className="w-4 h-4" />
      </SelectPrimitive.ScrollUpButton>
      
      <SelectPrimitive.Viewport className="p-1">
        {children}
      </SelectPrimitive.Viewport>
      
      <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-bg-elevated text-text-muted cursor-default">
        <ChevronDown className="w-4 h-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  );
});

// Set display name for debugging
SelectContent.displayName = 'SelectContent';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  SelectProps,
  SelectItemProps,
  SelectGroupProps,
  SelectLabelProps,
  SelectSeparatorProps,
  SelectValueProps,
  SelectTriggerProps,
  SelectContentProps,
  SelectVariant,
  SelectSize,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue, SelectGroup, SelectLabel, SelectSeparator } from '@/components/ui/Select';
 * 
 * // Simple select
 * <Select>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select option" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *     <SelectItem value="2">Option 2</SelectItem>
 *     <SelectItem value="3">Option 3</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // With label
 * <Select label="Status">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select status" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="active">Active</SelectItem>
 *     <SelectItem value="inactive">Inactive</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // With error state
 * <Select label="Status" errorMessage="Required field">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select status" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="active">Active</SelectItem>
 *     <SelectItem value="inactive">Inactive</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // With success state
 * <Select label="Status" successMessage="Valid selection">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select status" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="active">Active</SelectItem>
 *     <SelectItem value="inactive">Inactive</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // Different sizes
 * <Select size="sm">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Small" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * <Select size="md">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Medium" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * <Select size="lg">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Large" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // With groups
 * <Select label="PHP Version">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select version" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectGroup>
 *       <SelectLabel>Stable</SelectLabel>
 *       <SelectItem value="8.3">PHP 8.3</SelectItem>
 *       <SelectItem value="8.2">PHP 8.2</SelectItem>
 *     </SelectGroup>
 *     <SelectSeparator />
 *     <SelectGroup>
 *       <SelectLabel>Beta</SelectLabel>
 *       <SelectItem value="8.4">PHP 8.4</SelectItem>
 *     </SelectGroup>
 *   </SelectContent>
 * </Select>
 * 
 * // With icon
 * import { Globe } from 'lucide-react';
 * 
 * <Select label="Domain" icon={<Globe className="w-4 h-4" />}>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select domain" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="example.com">example.com</SelectItem>
 *     <SelectItem value="blog.example.com">blog.example.com</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // Disabled state
 * <Select disabled>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Disabled" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // Required field
 * <Select required>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Required *" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="1">Option 1</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // In forms (React Hook Form)
 * import { useForm } from 'react-hook-form';
 * 
 * function SiteForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm();
 *   
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <Select
 *         label="PHP Version"
 *         {...register('phpVersion', { required: 'PHP version is required' })}
 *         errorMessage={errors.phpVersion?.message}
 *       >
 *         <SelectTrigger>
 *           <SelectValue placeholder="Select version" />
 *         </SelectTrigger>
 *         <SelectContent>
 *           <SelectItem value="8.2">PHP 8.2</SelectItem>
 *           <SelectItem value="8.3">PHP 8.3</SelectItem>
 *           <SelectItem value="8.4">PHP 8.4</SelectItem>
 *         </SelectContent>
 *       </Select>
 *       <Button type="submit">Create Site</Button>
 *     </form>
 *   );
 * }
 * 
 * // With custom positioning
 * <Select>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Top positioned" />
 *   </SelectTrigger>
 *   <SelectContent position="popper" side="top">
 *     <SelectItem value="1">Option 1</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // In site creation form
 * <Select label="Site Type">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select type" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="wordpress">WordPress</SelectItem>
 *     <SelectItem value="static">Static Site</SelectItem>
 *     <SelectItem value="php">PHP Application</SelectItem>
 *     <SelectItem value="nodejs">Node.js Proxy</SelectItem>
 *     <SelectItem value="docker">Docker Container</SelectItem>
 *   </SelectContent>
 * </Select>
 * 
 * // In settings page
 * <Select label="Default PHP Version">
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select default" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectGroup>
 *       <SelectLabel>Available Versions</SelectLabel>
 *       <SelectItem value="8.2">PHP 8.2</SelectItem>
 *       <SelectItem value="8.3">PHP 8.3 (Recommended)</SelectItem>
 *       <SelectItem value="8.4">PHP 8.4</SelectItem>
 *       <SelectItem value="8.5">PHP 8.5 (Beta)</SelectItem>
 *     </SelectGroup>
 *   </SelectContent>
 * </Select>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Select Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-base:        #080808 (dark) / #f8f8f8 (light)
 * - bg-elevated:    #181818 (dark) / #f0f0f0 (light) — dropdown background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — hover state
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light) — placeholder
 * - accent:         #3b82f6 (Blue) — focus ring, check icon
 * - error:          #ef4444 (Red) — error state
 * - success:        #10b981 (Green) — success state
 * 
 * Sizing:
 * - sm: h-8 (32px),  px-2.5 py-1.5, text-xs (12px),  icon: w-3.5 h-3.5
 * - md: h-9 (36px),  px-3 py-2,   text-sm (14px),  icon: w-4 h-4 — DEFAULT
 * - lg: h-10 (40px), px-4 py-2.5, text-base (16px), icon: w-5 h-5
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Animations:
 * - slide-up: 150ms ease-out (dropdown appearance)
 * - 150ms ease-out for hover/focus states
 * - Scroll buttons fade in/out
 * 
 * Accessibility:
 * - Radix UI primitives for full ARIA support
 * - aria-labelledby for label association
 * - aria-describedby for helper/error messages
 * - aria-invalid for error state
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Focus visible ring (2px)
 * - Required indicator (*)
 * - Screen reader announcements
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
 * - Site type selection (WordPress/Static/PHP/Node.js/Docker)
 * - PHP version selection (8.2/8.3/8.4/8.5)
 * - Status filtering (active/inactive/error)
 * - SSL status filtering
 * - Database selection
 * - Backup storage selection
 * - Language selection (EN/RU/ES)
 * - Theme selection (Dark/Light/System)
 * - Timezone selection
 * - Cron schedule selection
 */