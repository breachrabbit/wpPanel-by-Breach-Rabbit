'use client';

// =============================================================================
// wpPanel by Breach Rabbit — SegmentedControl Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Radix UI Toggle Group, multiple variants, sizes, icons
// =============================================================================

import * as React from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type SegmentedControlSize = 'sm' | 'md' | 'lg';
export type SegmentedControlVariant = 'default' | 'outline' | 'filled';

export interface SegmentedControlItem {
  /** Unique value for the item */
  value: string;
  
  /** Display label */
  label: string;
  
  /** Optional icon */
  icon?: React.ReactNode;
  
  /** Optional description (for larger variants) */
  description?: string;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Badge count */
  badge?: number;
}

export interface SegmentedControlProps extends React.ComponentPropsWithoutRef<typeof ToggleGroup.Root> {
  /** Control items */
  items: SegmentedControlItem[];
  
  /** Control size */
  size?: SegmentedControlSize;
  
  /** Control variant */
  variant?: SegmentedControlVariant;
  
  /** Full width */
  fullWidth?: boolean;
  
  /** Disabled state */
  disabled?: boolean;
  
  /** On value change */
  onValueChange?: (value: string) => void;
  
  /** Custom className for the container */
  containerClassName?: string;
  
  /** Custom className for items */
  itemClassName?: string;
}

// =============================================================================
// ⚙️ SIZE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<SegmentedControlSize, {
  height: string;
  padding: string;
  fontSize: string;
  gap: string;
  itemPadding: string;
  iconSize: string;
}> = {
  sm: {
    height: 'h-8',
    padding: 'p-0.5',
    fontSize: 'text-xs',
    gap: 'gap-0',
    itemPadding: 'px-2.5 py-1',
    iconSize: 'w-3.5 h-3.5',
  },
  md: {
    height: 'h-9',
    padding: 'p-1',
    fontSize: 'text-sm',
    gap: 'gap-0',
    itemPadding: 'px-3 py-1.5',
    iconSize: 'w-4 h-4',
  },
  lg: {
    height: 'h-10',
    padding: 'p-1.5',
    fontSize: 'text-base',
    gap: 'gap-0',
    itemPadding: 'px-4 py-2',
    iconSize: 'w-5 h-5',
  },
};

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<SegmentedControlVariant, {
  container: string;
  item: string;
  itemActive: string;
  itemHover: string;
  itemDisabled: string;
}> = {
  default: {
    container: 'bg-bg-overlay border border-border',
    item: 'text-text-secondary bg-transparent',
    itemActive: 'bg-bg-surface text-text-primary shadow-sm',
    itemHover: 'hover:text-text-primary',
    itemDisabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
  outline: {
    container: 'bg-transparent border border-border',
    item: 'text-text-secondary bg-transparent border border-transparent',
    itemActive: 'bg-accent-subtle text-accent border-accent-border',
    itemHover: 'hover:border-border-hover hover:text-text-primary',
    itemDisabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
  filled: {
    container: 'bg-bg-overlay',
    item: 'text-text-secondary bg-transparent',
    itemActive: 'bg-accent text-white',
    itemHover: 'hover:text-text-primary',
    itemDisabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
  },
};

// =============================================================================
// 🏗️ SEGMENTED CONTROL COMPONENT
// =============================================================================

/**
 * SegmentedControl Component — wpPanel by Breach Rabbit UI
 * 
 * Built on Radix UI Toggle Group primitives for full accessibility.
 * 
 * @example
 * <SegmentedControl
 *   items={[
 *     { value: 'day', label: 'Day' },
 *     { value: 'week', label: 'Week' },
 *     { value: 'month', label: 'Month' },
 *   ]}
 *   defaultValue="day"
 *   onValueChange={setValue}
 * />
 */
export const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroup.Root>,
  SegmentedControlProps
>(
  (
    {
      className,
      items,
      size = 'md',
      variant = 'default',
      fullWidth = true,
      disabled = false,
      onValueChange,
      containerClassName,
      itemClassName,
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    
    const handleValueChange = (newValue: string) => {
      if (disabled) return;
      onValueChange?.(newValue);
    };

    return (
      <ToggleGroup.Root
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'inline-flex',
          'items-center',
          'rounded-md',
          'transition-all duration-150 ease-out',
          
          // Size
          sizes.height,
          sizes.padding,
          
          // Variant container
          variantStyle.container,
          
          // Full width
          fullWidth && 'w-full',
          
          // Disabled
          disabled && 'opacity-50 pointer-events-none',
          
          // Custom className
          containerClassName || className
        )}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        type="single"
        {...props}
      >
        {items.map((item) => (
          <ToggleGroup.Item
            key={item.value}
            value={item.value}
            disabled={disabled || item.disabled}
            className={cn(
              // Base styles
              'relative',
              'inline-flex',
              'items-center',
              'justify-center',
              'gap-2',
              'rounded-md',
              'font-medium',
              'transition-all duration-150 ease-out',
              'focus:outline-none focus:z-10',
              'focus:ring-2 focus:ring-accent focus:ring-offset-0',
              
              // Size
              sizes.fontSize,
              sizes.itemPadding,
              
              // Variant styles
              variantStyle.item,
              'data-[state=on]:' + variantStyle.itemActive,
              variantStyle.itemHover,
              variantStyle.itemDisabled,
              
              // Custom className
              itemClassName
            )}
            aria-label={item.label}
          >
            {/* Icon */}
            {item.icon && (
              <span className={cn('flex-shrink-0', sizes.iconSize)}>
                {item.icon}
              </span>
            )}
            
            {/* Label */}
            <span>{item.label}</span>
            
            {/* Badge */}
            {item.badge !== undefined && (
              <span
                className={cn(
                  'flex items-center justify-center',
                  'min-w-[1.25rem] h-5',
                  'px-1.5',
                  'rounded-full',
                  'text-xs font-medium',
                  'bg-accent text-white'
                )}
              >
                {item.badge}
              </span>
            )}
            
            {/* Description (for larger variants) */}
            {item.description && size === 'lg' && (
              <span className="text-xs text-text-muted mt-0.5">
                {item.description}
              </span>
            )}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    );
  }
);

// Set display name for debugging
SegmentedControl.displayName = 'SegmentedControl';

// =============================================================================
// 📦 SEGMENTED CONTROL GROUP COMPONENT
// =============================================================================

/**
 * SegmentedControlGroup — Group with label for forms
 */
export interface SegmentedControlGroupProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Group label */
  label?: string;
  
  /** Group description */
  description?: string;
  
  /** Error message */
  errorMessage?: string;
  
  /** Children (SegmentedControl) */
  children: React.ReactNode;
  
  /** Custom className for the group */
  groupClassName?: string;
}

export const SegmentedControlGroup = React.forwardRef<
  HTMLDivElement,
  SegmentedControlGroupProps
>(
  (
    {
      label,
      description,
      errorMessage,
      children,
      groupClassName,
      className,
      ...props
    },
    ref
  ) => {
    const hasError = !!errorMessage;
    
    return (
      <div
        ref={ref}
        className={cn('w-full', groupClassName)}
        {...props}
      >
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium mb-1.5">
            <span className={cn(
              hasError ? 'text-error' : 'text-text-secondary'
            )}>
              {label}
            </span>
            {description && (
              <span className="block text-xs text-text-muted mt-0.5 font-normal">
                {description}
              </span>
            )}
          </label>
        )}
        
        {/* Control */}
        {children}
        
        {/* Error Message */}
        {errorMessage && (
          <p className="mt-1.5 text-xs text-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

// Set display name for debugging
SegmentedControlGroup.displayName = 'SegmentedControlGroup';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  SegmentedControlProps,
  SegmentedControlGroupProps,
  SegmentedControlItem,
  SegmentedControlSize,
  SegmentedControlVariant,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { SegmentedControl, SegmentedControlGroup } from '@/components/ui/SegmentedControl';
 * import { Calendar, List, Grid, BarChart3, PieChart, Activity } from 'lucide-react';
 * 
 * // Simple segmented control
 * <SegmentedControl
 *   items={[
 *     { value: 'day', label: 'Day' },
 *     { value: 'week', label: 'Week' },
 *     { value: 'month', label: 'Month' },
 *   ]}
 *   defaultValue="day"
 *   onValueChange={setValue}
 * />
 * 
 * // With icons
 * <SegmentedControl
 *   items={[
 *     { value: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
 *     { value: 'grid', label: 'Grid', icon: <Grid className="w-4 h-4" /> },
 *   ]}
 *   defaultValue="list"
 * />
 * 
 * // With badges
 * <SegmentedControl
 *   items={[
 *     { value: 'all', label: 'All', badge: 25 },
 *     { value: 'active', label: 'Active', badge: 12 },
 *     { value: 'archived', label: 'Archived', badge: 8 },
 *   ]}
 *   defaultValue="all"
 * />
 * 
 * // Different sizes
 * <SegmentedControl size="sm" items={[{ value: '1', label: 'Small' }]} />
 * <SegmentedControl size="md" items={[{ value: '2', label: 'Medium' }]} />
 * <SegmentedControl size="lg" items={[{ value: '3', label: 'Large' }]} />
 * 
 * // Different variants
 * <SegmentedControl variant="default" items={[{ value: '1', label: 'Default' }]} />
 * <SegmentedControl variant="outline" items={[{ value: '2', label: 'Outline' }]} />
 * <SegmentedControl variant="filled" items={[{ value: '3', label: 'Filled' }]} />
 * 
 * // With label and error
 * <SegmentedControlGroup
 *   label="View Mode"
 *   description="Choose how to display items"
 *   errorMessage="Please select a view mode"
 * >
 *   <SegmentedControl
 *     items={[
 *       { value: 'list', label: 'List' },
 *       { value: 'grid', label: 'Grid' },
 *     ]}
 *   />
 * </SegmentedControlGroup>
 * 
 * // Disabled state
 * <SegmentedControl
 *   disabled
 *   items={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' },
 *   ]}
 * />
 * 
 * // Individual item disabled
 * <SegmentedControl
 *   items={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2', disabled: true },
 *     { value: '3', label: 'Option 3' },
 *   ]}
 * />
 * 
 * // Full width
 * <SegmentedControl
 *   fullWidth
 *   items={[
 *     { value: '1', label: 'Option 1' },
 *     { value: '2', label: 'Option 2' },
 *     { value: '3', label: 'Option 3' },
 *   ]}
 * />
 * 
 * // In forms (React Hook Form)
 * import { useForm } from 'react-hook-form';
 * 
 * function SettingsForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm();
 *   
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <SegmentedControlGroup
 *         label="Time Range"
 *         errorMessage={errors.timeRange?.message}
 *       >
 *         <SegmentedControl
 *           items={[
 *             { value: '1h', label: '1H' },
 *             { value: '6h', label: '6H' },
 *             { value: '24h', label: '24H' },
 *             { value: '7d', label: '7D' },
 *           ]}
 *           {...register('timeRange', { required: 'Time range is required' })}
 *         />
 *       </SegmentedControlGroup>
 *       <Button type="submit">Save</Button>
 *     </form>
 *   );
 * }
 * 
 * // For chart time range
 * <SegmentedControl
 *   items={[
 *     { value: '1h', label: '1H' },
 *     { value: '6h', label: '6H' },
 *     { value: '24h', label: '24H' },
 *     { value: '7d', label: '7D' },
 *     { value: '30d', label: '30D' },
 *   ]}
 *   defaultValue="24h"
 *   onValueChange={setTimeRange}
 * />
 * 
 * // For view mode toggle
 * <SegmentedControl
 *   items={[
 *     { value: 'list', label: 'List', icon: <List className="w-4 h-4" /> },
 *     { value: 'grid', label: 'Grid', icon: <Grid className="w-4 h-4" /> },
 *   ]}
 *   defaultValue="list"
 *   onValueChange={setViewMode}
 * />
 * 
 * // For status filter
 * <SegmentedControl
 *   items={[
 *     { value: 'all', label: 'All', badge: 50 },
 *     { value: 'active', label: 'Active', badge: 35 },
 *     { value: 'inactive', label: 'Inactive', badge: 15 },
 *   ]}
 *   defaultValue="all"
 *   onValueChange={setStatusFilter}
 * />
 * 
 * // For theme toggle (custom implementation)
 * <SegmentedControl
 *   variant="outline"
 *   items={[
 *     { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
 *     { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
 *     { value: 'system', label: 'Auto', icon: <Monitor className="w-4 h-4" /> },
 *   ]}
 *   defaultValue="system"
 *   onValueChange={setTheme}
 * />
 * 
 * // For billing period
 * <SegmentedControl
 *   variant="filled"
 *   items={[
 *     { value: 'monthly', label: 'Monthly' },
 *     { value: 'yearly', label: 'Yearly', badge: 20 },
 *   ]}
 *   defaultValue="monthly"
 *   onValueChange={setBillingPeriod}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * SegmentedControl Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — active item bg
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — container bg
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light) — active text
 * - text-secondary: #888888 (dark) / #555555 (light) — inactive text
 * - accent:         #3b82f6 (Blue) — active state (filled variant)
 * 
 * Sizing:
 * - sm: h-8 (32px),  p-0.5, text-xs,  px-2.5 py-1
 * - md: h-9 (36px),  p-1,   text-sm, px-3 py-1.5 — DEFAULT
 * - lg: h-10 (40px), p-1.5, text-base, px-4 py-2
 * 
 * Border Radius:
 * - Container: rounded-md (6px)
 * - Items: rounded-md (6px)
 * 
 * Variants:
 * - default: bg-overlay container, bg-surface active item
 * - outline: transparent container, accent-subtle active item
 * - filled: bg-overlay container, accent solid active item
 * 
 * Transitions:
 * - 150ms ease-out for state changes
 * - Smooth active state transition
 * 
 * Accessibility:
 * - Radix UI Toggle Group for full ARIA support
 * - Keyboard navigation (Arrow keys, Tab)
 * - Focus visible ring
 * - aria-label for each item
 * - Role="radiogroup" semantics
 * 
 * Performance:
 * - Radix UI primitives (minimal JS overhead)
 * - CSS-first (no JS for hover/focus states)
 * - Tree-shaken icons
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Time range selector (1H/6H/24H/7D/30D)
 * - View mode toggle (List/Grid)
 * - Status filter (All/Active/Inactive)
 * - Theme toggle (Light/Dark/Auto)
 * - Billing period (Monthly/Yearly)
 * - Chart type (Bar/Line/Pie)
 * - Tab-like navigation within cards
 * - Filter toggles
 */