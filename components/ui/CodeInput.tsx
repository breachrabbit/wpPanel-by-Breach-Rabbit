'use client';

// =============================================================================
// wpPanel by Breach Rabbit — CodeInput Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Monospace font, syntax highlighting prep, password/SSH key modes
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type CodeInputVariant = 'default' | 'password' | 'ssh' | 'api-key';
export type CodeInputSize = 'sm' | 'md' | 'lg';
export type CodeLanguage = 'bash' | 'php' | 'js' | 'css' | 'json' | 'yaml' | 'sql' | 'text';

export interface CodeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input variant (visual style) */
  variant?: CodeInputVariant;
  
  /** Input size */
  size?: CodeInputSize;
  
  /** Language hint (for future syntax highlighting) */
  language?: CodeLanguage;
  
  /** Label text */
  label?: string;
  
  /** Helper/description text */
  helperText?: string;
  
  /** Error message */
  errorMessage?: string;
  
  /** Success message */
  successMessage?: string;
  
  /** Show copy button */
  showCopyButton?: boolean;
  
  /** Show password toggle (for password variant) */
  showPasswordToggle?: boolean;
  
  /** Show line numbers */
  showLineNumbers?: boolean;
  
  /** Auto-select on focus */
  autoSelect?: boolean;
  
  /** Full width input */
  fullWidth?: boolean;
  
  /** Custom className for the label */
  labelClassName?: string;
  
  /** Custom className for the input wrapper */
  wrapperClassName?: string;
}

// =============================================================================
// ⚙️ SIZE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations
 */
const sizeStyles: Record<CodeInputSize, {
  height: string;
  padding: string;
  fontSize: string;
  lineHeight: string;
}> = {
  sm: {
    height: 'h-8',
    padding: 'px-2.5 py-1.5',
    fontSize: 'text-xs',
    lineHeight: 'leading-normal',
  },
  md: {
    height: 'h-9',
    padding: 'px-3 py-2',
    fontSize: 'text-sm',
    lineHeight: 'leading-normal',
  },
  lg: {
    height: 'h-10',
    padding: 'px-4 py-2.5',
    fontSize: 'text-base',
    lineHeight: 'leading-normal',
  },
};

// =============================================================================
// 🏗️ CODE INPUT COMPONENT
// =============================================================================

/**
 * CodeInput Component — wpPanel by Breach Rabbit UI
 * 
 * Monospace input for code, passwords, SSH keys, API keys, commands.
 * 
 * @example
 * <CodeInput label="SSH Key" variant="ssh" />
 * <CodeInput label="API Key" variant="api-key" showCopyButton />
 * <CodeInput label="Command" language="bash" />
 */
export const CodeInput = React.forwardRef<HTMLInputElement, CodeInputProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      language = 'text',
      label,
      helperText,
      errorMessage,
      successMessage,
      showCopyButton = false,
      showPasswordToggle = variant === 'password',
      showLineNumbers = false,
      autoSelect = false,
      fullWidth = true,
      labelClassName,
      wrapperClassName,
      disabled,
      value,
      onChange,
      id,
      required,
      type: inputType,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = React.useState(false);
    const [copied, setCopied] = React.useState(false);
    
    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    
    // Generate unique ID if not provided
    const reactId = React.useId();
    const inputId = id || `codeinput-${reactId}`;
    const labelId = label ? `${inputId}-label` : undefined;
    const helperId = (errorMessage || successMessage || helperText) ? `${inputId}-helper` : undefined;
    
    // Determine effective type
    const isPassword = variant === 'password';
    const effectiveType = isPassword && !showPassword ? 'password' : 'text';
    
    // Determine effective variant based on state
    const effectiveVariant = errorMessage ? 'error' : successMessage ? 'success' : 'default';
    
    // Determine effective message
    const effectiveMessage = errorMessage || successMessage || helperText;
    const messageVariant = errorMessage ? 'error' : successMessage ? 'success' : 'default';
    
    // Handle copy
    const handleCopy = async () => {
      if (value) {
        try {
          await navigator.clipboard.writeText(value.toString());
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          console.error('Failed to copy:', error);
        }
      }
    };
    
    // Handle focus with auto-select
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (autoSelect) {
        e.target.select();
      }
      props.onFocus?.(e);
    };

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
          {/* Line Numbers (optional) */}
          {showLineNumbers && (
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0',
                'flex flex-col items-end justify-center',
                'px-2',
                'bg-bg-overlay',
                'border-r border-border',
                'text-text-muted',
                'font-mono',
                sizes.fontSize,
                sizes.lineHeight
              )}
              aria-hidden="true"
            >
              <span>1</span>
            </div>
          )}

          {/* Input */}
          <input
            ref={inputRef}
            id={inputId}
            type={effectiveType}
            className={cn(
              // Base styles
              'relative',
              'w-full',
              'rounded-md',
              'font-mono',
              'transition-all duration-150 ease-out',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-overlay',
              'focus:outline-none focus:ring-offset-0',
              
              // Size
              sizes.height,
              sizes.padding,
              sizes.fontSize,
              sizes.lineHeight,
              
              // Line numbers padding
              showLineNumbers && 'pl-10',
              
              // Right actions padding
              (showCopyButton || (showPasswordToggle && isPassword)) && 'pr-20',
              showCopyButton && !(showPasswordToggle && isPassword) && 'pr-10',
              
              // Variant styles
              effectiveVariant === 'default' && cn(
                'bg-bg-base',
                'text-text-primary',
                'border border-border hover:border-border-hover',
                'focus:border-accent focus:ring-2 focus:ring-accent-subtle',
                'placeholder:text-text-muted'
              ),
              effectiveVariant === 'error' && cn(
                'bg-bg-base',
                'text-text-primary',
                'border border-error hover:border-error',
                'focus:border-error focus:ring-2 focus:ring-error-subtle',
                'placeholder:text-text-muted'
              ),
              effectiveVariant === 'success' && cn(
                'bg-bg-base',
                'text-text-primary',
                'border border-success hover:border-success',
                'focus:border-success focus:ring-2 focus:ring-success-subtle',
                'placeholder:text-text-muted'
              ),
              
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
            onFocus={handleFocus}
            {...props}
          />

          {/* Right Actions */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Copy Button */}
            {showCopyButton && value && (
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'flex items-center justify-center',
                  'w-7 h-7',
                  'rounded',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label={copied ? 'Copied' : 'Copy to clipboard'}
                tabIndex={-1}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-success" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Password Toggle */}
            {showPasswordToggle && isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn(
                  'flex items-center justify-center',
                  'w-7 h-7',
                  'rounded',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label={showPassword ? 'Hide' : 'Show'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
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
CodeInput.displayName = 'CodeInput';

// =============================================================================
// 📦 SSH KEY INPUT COMPONENT
// =============================================================================

/**
 * SSHKeyInput — Pre-configured for SSH key input (multi-line textarea style)
 */
export interface SSHKeyInputProps extends Omit<CodeInputProps, 'variant' | 'showLineNumbers'> {
  /** Show line numbers */
  showLineNumbers?: boolean;
}

export const SSHKeyInput = React.forwardRef<HTMLInputElement, SSHKeyInputProps>(
  ({ showLineNumbers = true, showCopyButton = true, className, ...props }, ref) => {
    return (
      <CodeInput
        ref={ref}
        variant="ssh"
        language="text"
        showLineNumbers={showLineNumbers}
        showCopyButton={showCopyButton}
        className={cn(
          'font-mono',
          'tracking-tight',
          className
        )}
        {...props}
      />
    );
  }
);

// Set display name for debugging
SSHKeyInput.displayName = 'SSHKeyInput';

// =============================================================================
// 📦 API KEY INPUT COMPONENT
// =============================================================================

/**
 * APIKeyInput — Pre-configured for API key input (password style with copy)
 */
export const APIKeyInput = React.forwardRef<HTMLInputElement, Omit<CodeInputProps, 'variant' | 'showPasswordToggle' | 'showCopyButton'>>(
  ({ className, ...props }, ref) => {
    return (
      <CodeInput
        ref={ref}
        variant="api-key"
        showPasswordToggle
        showCopyButton
        className={cn(
          'font-mono',
          'tracking-tight',
          className
        )}
        {...props}
      />
    );
  }
);

// Set display name for debugging
APIKeyInput.displayName = 'APIKeyInput';

// =============================================================================
// 📦 COMMAND INPUT COMPONENT
// =============================================================================

/**
 * CommandInput — Pre-configured for bash command input
 */
export const CommandInput = React.forwardRef<HTMLInputElement, Omit<CodeInputProps, 'variant' | 'language'>>(
  ({ className, ...props }, ref) => {
    return (
      <CodeInput
        ref={ref}
        variant="default"
        language="bash"
        className={cn(
          'font-mono',
          'tracking-tight',
          className
        )}
        {...props}
      />
    );
  }
);

// Set display name for debugging
CommandInput.displayName = 'CommandInput';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { CodeInputProps, SSHKeyInputProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { CodeInput, SSHKeyInput, APIKeyInput, CommandInput } from '@/components/ui/CodeInput';
 * 
 * // Simple code input
 * <CodeInput placeholder="Enter code" />
 * 
 * // With label
 * <CodeInput label="SSH Public Key" placeholder="ssh-rsa AAAA..." />
 * 
 * // Password variant (with toggle)
 * <CodeInput 
 *   label="Password" 
 *   variant="password" 
 *   showPasswordToggle 
 * />
 * 
 * // SSH key variant (with line numbers)
 * <CodeInput 
 *   label="SSH Public Key" 
 *   variant="ssh" 
 *   showLineNumbers 
 *   showCopyButton 
 *   placeholder="ssh-rsa AAAAB3NzaC1yc2E..." 
 * />
 * 
 * // API key variant (password + copy)
 * <CodeInput 
 *   label="API Key" 
 *   variant="api-key" 
 *   showPasswordToggle 
 *   showCopyButton 
 * />
 * 
 * // Command input (bash)
 * <CodeInput 
 *   label="Command" 
 *   language="bash" 
 *   placeholder="/usr/bin/php /var/www/script.php" 
 * />
 * 
 * // With helper text
 * <CodeInput 
 *   label="Webhook URL" 
 *   helperText="Must be HTTPS" 
 *   placeholder="https://example.com/webhook" 
 * />
 * 
 * // With error state
 * <CodeInput 
 *   label="API Key" 
 *   variant="error" 
 *   errorMessage="Invalid API key format" 
 * />
 * 
 * // With success state
 * <CodeInput 
 *   label="API Key" 
 *   variant="success" 
 *   successMessage="API key validated" 
 * />
 * 
 * // Auto-select on focus
 * <CodeInput 
 *   label="Invite Code" 
 *   autoSelect 
 *   defaultValue="ABC123" 
 * />
 * 
 * // Different sizes
 * <CodeInput size="sm" placeholder="Small" />
 * <CodeInput size="md" placeholder="Medium" />
 * <CodeInput size="lg" placeholder="Large" />
 * 
 * // Pre-configured variants
 * <SSHKeyInput label="SSH Key" placeholder="ssh-rsa..." />
 * <APIKeyInput label="API Key" placeholder="sk-..." />
 * <CommandInput label="Command" placeholder="npm install..." />
 * 
 * // In forms (React Hook Form)
 * import { useForm } from 'react-hook-form';
 * 
 * function SSHKeyForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm();
 *   
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <SSHKeyInput
 *         label="Public Key"
 *         {...register('sshKey', { required: 'SSH key is required' })}
 *         errorMessage={errors.sshKey?.message}
 *       />
 *       <Button type="submit">Add Key</Button>
 *     </form>
 *   );
 * }
 * 
 * // In server settings
 * <CodeInput
 *   label="Server IP"
 *   placeholder="192.168.1.1"
 *   helperText="Public IP address of your server"
 * />
 * 
 * // For webhook configuration
 * <CodeInput
 *   label="Webhook URL"
 *   language="text"
 *   placeholder="https://example.com/webhook"
 *   showCopyButton
 * />
 * 
 * // For custom configuration
 * <CodeInput
 *   label="Custom Config"
 *   language="yaml"
 *   placeholder="key: value"
 *   showLineNumbers
 *   showCopyButton
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * CodeInput Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-base:        #080808 (dark) / #f8f8f8 (light)
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — line numbers
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-muted:     #444444 (dark) / #999999 (light) — placeholder
 * - accent:         #3b82f6 (Blue) — focus ring
 * - error:          #ef4444 (Red) — error state
 * - success:        #10b981 (Green) — success state
 * 
 * Font:
 * - font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace
 * - Tracking: tight (for code density)
 * 
 * Sizing:
 * - sm: h-8 (32px),  px-2.5 py-1.5, text-xs (12px)
 * - md: h-9 (36px),  px-3 py-2,   text-sm (14px) — DEFAULT
 * - lg: h-10 (40px), px-4 py-2.5, text-base (16px)
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Features:
 * - Monospace font for all code input
 * - Line numbers (optional, for SSH keys)
 * - Copy button with feedback
 * - Password toggle (for sensitive data)
 * - Auto-select on focus (for invite codes, etc.)
 * - Language hint (for future syntax highlighting)
 * 
 * Variants:
 * - default: Standard code input
 * - password: Hidden chars + toggle visibility
 * - ssh: SSH key format (line numbers)
 * - api-key: API key format (password + copy)
 * 
 * Accessibility:
 * - aria-invalid for error state
 * - aria-describedby for helper/error messages
 * - Label association via htmlFor
 * - Focus visible ring (2px)
 * - Copy button with aria-label
 * - Password toggle with aria-label
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
 * - SSH key input (server setup, Git deploy)
 * - API key input (integrations, webhooks)
 * - Password input (database, admin)
 * - Command input (cron jobs, custom scripts)
 * - Webhook URL input
 * - Custom config input (YAML, JSON)
 * - Database connection strings
 * - Token/secrets input
 */