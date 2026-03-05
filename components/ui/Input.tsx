'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Input Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, sizes, icons, labels, password toggle, validation
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, X } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type InputVariant = 'default' | 'error' | 'success';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'time' | 'datetime-local' | 'date' | 'month' | 'week';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input variant (visual style) */
  variant?: InputVariant;
  
  /** Input size */
  size?: InputSize;
  
  /** Input type */
  type?: InputType;
  
  /** Label text */
  label?: string;
  
  /** Helper/description text */
  helperText?: string;
  
  /** Error message (overrides helperText when error) */
  errorMessage?: string;
  
  /** Success message */
  successMessage?: string;
  
  /** Left icon (Lucide component) */
  leftIcon?: React.ReactNode;
  
  /** Right icon (Lucide component) */
  rightIcon?: React.ReactNode;
  
  /** Show password toggle (for password type) */
  showPasswordToggle?: boolean;
  
  /** Clear button (for search/text inputs) */
  showClearButton?: boolean;
  
  /** Full width input */
  fullWidth?: boolean;
  
  /** Custom className for the icon container */
  iconClassName?: string;
  
  /** Custom className for the label */
  labelClassName?: string;
  
  /** Custom className for the input wrapper */
  wrapperClassName?: string;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (padding, font size, height)
 */
const sizeStyles: Record<InputSize, {
  height: string;
  padding: string;
  fontSize: string;
  iconSize: string;
  gap: string;
}> = {
  sm: {
    height: 'h-8',
    padding: 'px-2.5 py-1.5',
    fontSize: 'text-xs',
    iconSize: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
  md: {
    height: 'h-9',
    padding: 'px-3 py-2',
    fontSize: 'text-sm',
    iconSize: 'w-4 h-4',
    gap: 'gap-2',
  },
  lg: {
    height: 'h-10',
    padding: 'px-4 py-2.5',
    fontSize: 'text-base',
    iconSize: 'w-5 h-5',
    gap: 'gap-2.5',
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<InputVariant, {
  base: string;
  border: string;
  focus: string;
  placeholder: string;
}> = {
  default: {
    base: 'bg-bg-base text-text-primary',
    border: 'border-border hover:border-border-hover',
    focus: 'focus:border-accent focus:ring-2 focus:ring-accent-subtle',
    placeholder: 'placeholder:text-text-muted',
  },
  error: {
    base: 'bg-bg-base text-text-primary',
    border: 'border-error hover:border-error',
    focus: 'focus:border-error focus:ring-2 focus:ring-error-subtle',
    placeholder: 'placeholder:text-text-muted',
  },
  success: {
    base: 'bg-bg-base text-text-primary',
    border: 'border-success hover:border-success',
    focus: 'focus:border-success focus:ring-2 focus:ring-success-subtle',
    placeholder: 'placeholder:text-text-muted',
  },
};

// =============================================================================
// 🏗️ INPUT COMPONENT
// =============================================================================

/**
 * Input Component — wpPanel by Breach Rabbit UI
 * 
 * @example
 * <Input label="Email" type="email" placeholder="Enter email" />
 * <Input label="Password" type="password" showPasswordToggle />
 * <Input label="Search" leftIcon={<Search />} showClearButton />
 * <Input variant="error" errorMessage="Invalid email" />
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      type = 'text',
      label,
      helperText,
      errorMessage,
      successMessage,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      showClearButton = false,
      fullWidth = true,
      iconClassName,
      labelClassName,
      wrapperClassName,
      disabled,
      value,
      onChange,
      id,
      required,
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
    const inputId = id || `input-${reactId}`;
    const labelId = label ? `${inputId}-label` : undefined;
    const helperId = effectiveMessage ? `${inputId}-helper` : undefined;
    
    // Password visibility state
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const effectiveType = isPassword && showPassword ? 'text' : type;
    
    // Handle clear button
    const handleClear = () => {
      if (onChange) {
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    // Determine if we should show right icon area
    const hasRightArea = showPasswordToggle && isPassword;
    const hasClearButton = showClearButton && value && value !== '';

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            id={labelId}
            htmlFor={inputId}
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

        {/* Input Wrapper */}
        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'flex items-center justify-center',
                'text-text-muted',
                sizes.iconSize,
                iconClassName
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            className={cn(
              // Base styles
              'relative',
              'w-full',
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
              variantStyle.placeholder,
              
              // Left icon padding
              leftIcon && 'pl-10',
              
              // Right icon padding
              (hasRightArea || hasClearButton || rightIcon) && 'pr-10',
              
              // Full width
              fullWidth && 'w-full',
              
              // Custom className
              className
            )}
            disabled={disabled}
            aria-invalid={!!errorMessage}
            aria-labelledby={labelId}
            aria-describedby={helperId}
            value={value}
            onChange={onChange}
            required={required}
            {...props}
          />

          {/* Right Icon Area */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Password Toggle */}
            {showPasswordToggle && isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'flex items-center justify-center',
                  'text-text-muted hover:text-text-primary',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
                  'rounded',
                  sizes.iconSize
                )}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className={sizes.iconSize} aria-hidden="true" />
                ) : (
                  <Eye className={sizes.iconSize} aria-hidden="true" />
                )}
              </button>
            )}

            {/* Clear Button */}
            {hasClearButton && !showPasswordToggle && (
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  'flex items-center justify-center',
                  'text-text-muted hover:text-text-primary',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
                  'rounded',
                  sizes.iconSize
                )}
                aria-label="Clear input"
                tabIndex={-1}
              >
                <X className={sizes.iconSize} aria-hidden="true" />
              </button>
            )}

            {/* Custom Right Icon */}
            {rightIcon && !showPasswordToggle && !hasClearButton && (
              <div
                className={cn(
                  'flex items-center justify-center',
                  'text-text-muted',
                  sizes.iconSize,
                  iconClassName
                )}
                aria-hidden="true"
              >
                {rightIcon}
              </div>
            )}
          </div>
        </div>

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
Input.displayName = 'Input';

// =============================================================================
// 📦 SEARCH INPUT COMPONENT
// =============================================================================

/**
 * SearchInput — Pre-configured search input with icon and clear button
 */
export interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon' | 'showClearButton'> {
  /** Search placeholder */
  searchPlaceholder?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ searchPlaceholder = 'Search...', className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        }
        showClearButton
        placeholder={searchPlaceholder}
        className={className}
        {...props}
      />
    );
  }
);

// Set display name for debugging
SearchInput.displayName = 'SearchInput';

// =============================================================================
// 📦 PASSWORD INPUT COMPONENT
// =============================================================================

/**
 * PasswordInput — Pre-configured password input with toggle
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'showPasswordToggle'>>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        type="password"
        showPasswordToggle
        {...props}
      />
    );
  }
);

// Set display name for debugging
PasswordInput.displayName = 'PasswordInput';

// =============================================================================
// 📦 EMAIL INPUT COMPONENT
// =============================================================================

/**
 * EmailInput — Pre-configured email input with validation
 */
export const EmailInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  (props, ref) => {
    return (
      <Input
        ref={ref}
        type="email"
        autoComplete="email"
        {...props}
      />
    );
  }
);

// Set display name for debugging
EmailInput.displayName = 'EmailInput';

// =============================================================================
// 📦 NUMBER INPUT COMPONENT
// =============================================================================

/**
 * NumberInput — Pre-configured number input with step controls
 */
export interface NumberInputProps extends Omit<InputProps, 'type'> {
  /** Minimum value */
  min?: number;
  
  /** Maximum value */
  max?: number;
  
  /** Step value */
  step?: number;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ min, max, step = 1, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="number"
        min={min}
        max={max}
        step={step}
        {...props}
      />
    );
  }
);

// Set display name for debugging
NumberInput.displayName = 'NumberInput';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { InputProps, SearchInputProps, NumberInputProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Input, SearchInput, PasswordInput, EmailInput, NumberInput } from '@/components/ui/Input';
 * import { Search, Mail, Lock, User } from 'lucide-react';
 * 
 * // Simple input
 * <Input placeholder="Enter text" />
 * 
 * // With label
 * <Input label="Username" placeholder="Enter username" />
 * 
 * // With helper text
 * <Input 
 *   label="Email" 
 *   helperText="We'll never share your email" 
 * />
 * 
 * // Error state
 * <Input 
 *   variant="error" 
 *   errorMessage="Invalid email address" 
 * />
 * 
 * // Success state
 * <Input 
 *   variant="success" 
 *   successMessage="Email is available" 
 * />
 * 
 * // Different sizes
 * <Input size="sm" placeholder="Small" />
 * <Input size="md" placeholder="Medium" />
 * <Input size="lg" placeholder="Large" />
 * 
 * // With left icon
 * <Input 
 *   leftIcon={<User className="w-4 h-4" />} 
 *   placeholder="Username" 
 * />
 * 
 * // With right icon
 * <Input 
 *   rightIcon={<Check className="w-4 h-4" />} 
 *   placeholder="Verified" 
 * />
 * 
 * // Password with toggle
 * <Input 
 *   label="Password" 
 *   type="password" 
 *   showPasswordToggle 
 * />
 * 
 * // Search input
 * <Input 
 *   type="search" 
 *   leftIcon={<Search className="w-4 h-4" />} 
 *   showClearButton 
 *   placeholder="Search..." 
 * />
 * 
 * // Email input
 * <EmailInput 
 *   label="Email" 
 *   placeholder="Enter email" 
 * />
 * 
 * // Password input (pre-configured)
 * <PasswordInput 
 *   label="Password" 
 *   placeholder="Enter password" 
 * />
 * 
 * // Search input (pre-configured)
 * <SearchInput 
 *   placeholder="Search sites..." 
 * />
 * 
 * // Number input
 * <NumberInput 
 *   label="Port" 
 *   min={1} 
 *   max={65535} 
 *   defaultValue={80} 
 * />
 * 
 * // Disabled state
 * <Input label="Read-only" disabled value="Cannot edit" />
 * 
 * // Required field
 * <Input label="Email" required />
 * 
 * // In forms (React Hook Form)
 * import { useForm } from 'react-hook-form';
 * 
 * function LoginForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm();
 *   
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <Input
 *         label="Email"
 *         type="email"
 *         {...register('email', { required: 'Email is required' })}
 *         errorMessage={errors.email?.message}
 *       />
 *       <PasswordInput
 *         label="Password"
 *         {...register('password', { required: 'Password is required' })}
 *         errorMessage={errors.password?.message}
 *       />
 *       <Button type="submit">Login</Button>
 *     </form>
 *   );
 * }
 * 
 * // In filters
 * <div className="flex gap-2">
 *   <SearchInput placeholder="Search sites..." className="flex-1" />
 *   <Select>
 *     <Select.Item value="all">All</Select.Item>
 *     <Select.Item value="active">Active</Select.Item>
 *   </Select>
 * </div>
 * 
 * // In settings
 * <div className="space-y-4">
 *   <Input 
 *     label="Site Name" 
 *     defaultValue="My Website" 
 *   />
 *   <Input 
 *     label="Domain" 
 *     defaultValue="example.com" 
 *     helperText="Without www or https" 
 *   />
 *   <Input 
 *     label="Admin Email" 
 *     type="email" 
 *     defaultValue="admin@example.com" 
 *   />
 * </div>
 * 
 * // With custom validation
 * <Input
 *   label="Username"
 *   placeholder="Choose username"
 *   helperText="3-20 characters, letters and numbers only"
 *   pattern="[a-zA-Z0-9]{3,20}"
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Input Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-base:        #080808 (dark) / #f8f8f8 (light)
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — disabled state
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - border-hover:   rgba(255,255,255,0.12) (dark) / rgba(0,0,0,0.15) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-muted:     #444444 (dark) / #999999 (light) — placeholder
 * - accent:         #3b82f6 (Blue) — focus ring
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
 * Transitions:
 * - 150ms ease-out for hover/focus states
 * - Border color + ring on focus
 * - No heavy spring animations
 * 
 * Accessibility:
 * - aria-invalid for error state
 * - aria-describedby for helper/error messages
 * - Label association via htmlFor
 * - Focus visible ring (2px)
 * - Required indicator (*)
 * - Password toggle with aria-label
 * - Clear button with aria-label
 * 
 * Performance:
 * - CSS-first (no JS for hover/focus states)
 * - Minimal runtime overhead (only password toggle state)
 * - Tree-shaken Lucide icons
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Login forms (email/password)
 * - Site creation (name, domain)
 * - Database credentials
 * - Search bars (header, tables)
 * - Settings forms
 * - Filter inputs
 * - SSH key input
 * - API key input
 * - Webhook URL input
 */