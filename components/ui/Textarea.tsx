'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Textarea Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, sizes, resize control, auto-resize, character count
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type TextareaVariant = 'default' | 'error' | 'success';
export type TextareaSize = 'sm' | 'md' | 'lg';
export type TextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Textarea variant (visual style) */
  variant?: TextareaVariant;
  
  /** Textarea size */
  size?: TextareaSize;
  
  /** Label text */
  label?: string;
  
  /** Helper/description text */
  helperText?: string;
  
  /** Error message (overrides helperText when error) */
  errorMessage?: string;
  
  /** Success message */
  successMessage?: string;
  
  /** Resize control */
  resize?: TextareaResize;
  
  /** Auto-resize to fit content */
  autoResize?: boolean;
  
  /** Minimum rows for auto-resize */
  minRows?: number;
  
  /** Maximum rows for auto-resize */
  maxRows?: number;
  
  /** Show character count */
  showCharCount?: boolean;
  
  /** Maximum characters */
  maxLength?: number;
  
  /** Full width textarea */
  fullWidth?: boolean;
  
  /** Custom className for the label */
  labelClassName?: string;
  
  /** Custom className for the textarea wrapper */
  wrapperClassName?: string;
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (padding, font size, rows)
 */
const sizeStyles: Record<TextareaSize, {
  padding: string;
  fontSize: string;
  lineHeight: string;
  minRows: number;
}> = {
  sm: {
    padding: 'px-2.5 py-1.5',
    fontSize: 'text-xs',
    lineHeight: 'leading-relaxed',
    minRows: 2,
  },
  md: {
    padding: 'px-3 py-2',
    fontSize: 'text-sm',
    lineHeight: 'leading-relaxed',
    minRows: 3,
  },
  lg: {
    padding: 'px-4 py-2.5',
    fontSize: 'text-base',
    lineHeight: 'leading-relaxed',
    minRows: 4,
  },
};

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<TextareaVariant, {
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

/**
 * Resize configurations
 */
const resizeStyles: Record<TextareaResize, string> = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Auto-resize textarea to fit content
 */
function autoResizeTextarea(
  textarea: HTMLTextAreaElement,
  minRows: number,
  maxRows?: number
) {
  if (!textarea) return;
  
  // Reset height to auto to get correct scrollHeight
  textarea.style.height = 'auto';
  
  const styles = window.getComputedStyle(textarea);
  const lineHeight = parseFloat(styles.lineHeight) || 20;
  const minHeight = lineHeight * minRows;
  
  let newHeight = textarea.scrollHeight;
  
  if (maxRows) {
    const maxHeight = lineHeight * maxRows;
    newHeight = Math.min(newHeight, maxHeight);
  }
  
  textarea.style.height = `${Math.max(newHeight, minHeight)}px`;
}

// =============================================================================
// 🏗️ TEXTAREA COMPONENT
// =============================================================================

/**
 * Textarea Component — wpPanel by Breach Rabbit UI
 * 
 * @example
 * <Textarea label="Description" placeholder="Enter description" />
 * <Textarea label="Code" resize="vertical" minRows={5} />
 * <Textarea label="Message" errorMessage="Required" showCharCount maxLength={500} />
 * <Textarea label="Auto-resize" autoResize minRows={3} maxRows={10} />
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      label,
      helperText,
      errorMessage,
      successMessage,
      resize = 'vertical',
      autoResize = false,
      minRows,
      maxRows,
      showCharCount = false,
      maxLength,
      fullWidth = true,
      labelClassName,
      wrapperClassName,
      disabled,
      value,
      onChange,
      id,
      required,
      rows,
      ...props
    },
    ref
  ) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const sizes = sizeStyles[size];
    const variantStyle = variantStyles[variant];
    
    // Determine effective variant based on state
    const effectiveVariant = errorMessage ? 'error' : successMessage ? 'success' : variant;
    
    // Determine effective message
    const effectiveMessage = errorMessage || successMessage || helperText;
    const messageVariant = errorMessage ? 'error' : successMessage ? 'success' : 'default';
    
    // Generate unique ID if not provided
    const reactId = React.useId();
    const textareaId = id || `textarea-${reactId}`;
    const labelId = label ? `${textareaId}-label` : undefined;
    const helperId = effectiveMessage ? `${textareaId}-helper` : undefined;
    const charCountId = showCharCount ? `${textareaId}-charcount` : undefined;
    
    // Character count
    const valueString = value?.toString() || '';
    const charCount = valueString.length;
    const charLimit = maxLength;
    const charRemaining = charLimit ? charLimit - charCount : 0;
    
    // Auto-resize effect
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const effectiveMinRows = minRows || sizes.minRows;
        autoResizeTextarea(textareaRef.current, effectiveMinRows, maxRows);
      }
    }, [value, autoResize, minRows, maxRows, sizes.minRows]);

    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (autoResize && textareaRef.current) {
        const effectiveMinRows = minRows || sizes.minRows;
        autoResizeTextarea(textareaRef.current, effectiveMinRows, maxRows);
      }
      onChange?.(e);
    };

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            id={labelId}
            htmlFor={textareaId}
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

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id={textareaId}
          className={cn(
            // Base styles
            'relative',
            'w-full',
            'rounded-md',
            'transition-all duration-150 ease-out',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-bg-overlay',
            'focus:outline-none focus:ring-offset-0',
            
            // Size
            sizes.padding,
            sizes.fontSize,
            sizes.lineHeight,
            
            // Rows (if not auto-resize)
            !autoResize && rows ? `rows-${rows}` : `rows-${sizes.minRows}`,
            
            // Resize
            resizeStyles[resize],
            
            // Variant
            variantStyle.base,
            variantStyle.border,
            variantStyle.focus,
            variantStyle.placeholder,
            
            // Full width
            fullWidth && 'w-full',
            
            // Custom className
            className
          )}
          disabled={disabled}
          aria-invalid={!!errorMessage}
          aria-labelledby={labelId}
          aria-describedby={cn(helperId, showCharCount ? charCountId : undefined)}
          value={value}
          onChange={handleChange}
          required={required}
          maxLength={maxLength}
          {...props}
        />

        {/* Footer: Helper message + Character count */}
        {(effectiveMessage || showCharCount) && (
          <div className="flex items-center justify-between mt-1.5">
            {/* Helper/Error/Success Message */}
            {effectiveMessage && (
              <p
                id={helperId}
                className={cn(
                  'text-xs',
                  messageVariant === 'error' ? 'text-error' :
                  messageVariant === 'success' ? 'text-success' :
                  'text-text-muted'
                )}
                role={messageVariant === 'error' ? 'alert' : undefined}
              >
                {effectiveMessage}
              </p>
            )}
            
            {/* Character Count */}
            {showCharCount && charLimit && (
              <p
                id={charCountId}
                className={cn(
                  'text-xs',
                  charRemaining < 0 ? 'text-error' :
                  charRemaining < 20 ? 'text-warning' :
                  'text-text-muted'
                )}
              >
                {charCount}/{charLimit}
                {charRemaining < 0 && ' characters over limit'}
                {charRemaining >= 0 && charRemaining < 20 && ` ${charRemaining} remaining`}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
Textarea.displayName = 'Textarea';

// =============================================================================
// 📦 CODE TEXTAREA COMPONENT
// =============================================================================

/**
 * CodeTextarea — Pre-configured for code/commands (monospace font)
 */
export interface CodeTextareaProps extends Omit<TextareaProps, 'resize'> {
  /** Language hint (for future syntax highlighting) */
  language?: string;
}

export const CodeTextarea = React.forwardRef<HTMLTextAreaElement, CodeTextareaProps>(
  ({ language, className, resize = 'both', ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={cn(
          'font-mono',
          'tracking-tight',
          className
        )}
        resize={resize}
        minRows={5}
        {...props}
      />
    );
  }
);

// Set display name for debugging
CodeTextarea.displayName = 'CodeTextarea';

// =============================================================================
// 📦 AUTO TEXTAREA COMPONENT
// =============================================================================

/**
 * AutoTextarea — Pre-configured with auto-resize
 */
export const AutoTextarea = React.forwardRef<HTMLTextAreaElement, Omit<TextareaProps, 'autoResize' | 'resize'>>(
  ({ className, minRows = 3, maxRows = 10, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        className={className}
        autoResize
        resize="none"
        minRows={minRows}
        maxRows={maxRows}
        {...props}
      />
    );
  }
);

// Set display name for debugging
AutoTextarea.displayName = 'AutoTextarea';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { TextareaProps, CodeTextareaProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Textarea, CodeTextarea, AutoTextarea } from '@/components/ui/Textarea';
 * 
 * // Simple textarea
 * <Textarea placeholder="Enter text" />
 * 
 * // With label
 * <Textarea label="Description" placeholder="Enter description" />
 * 
 * // With helper text
 * <Textarea 
 *   label="Bio" 
 *   helperText="Tell us about yourself" 
 * />
 * 
 * // Error state
 * <Textarea 
 *   variant="error" 
 *   errorMessage="Description is required" 
 * />
 * 
 * // Success state
 * <Textarea 
 *   variant="success" 
 *   successMessage="Description saved" 
 * />
 * 
 * // Different sizes
 * <Textarea size="sm" placeholder="Small" />
 * <Textarea size="md" placeholder="Medium" />
 * <Textarea size="lg" placeholder="Large" />
 * 
 * // Resize control
 * <Textarea resize="none" placeholder="No resize" />
 * <Textarea resize="vertical" placeholder="Vertical only" />
 * <Textarea resize="horizontal" placeholder="Horizontal only" />
 * <Textarea resize="both" placeholder="Both directions" />
 * 
 * // Auto-resize
 * <Textarea 
 *   autoResize 
 *   minRows={3} 
 *   maxRows={10} 
 *   placeholder="Auto-resizes to fit content" 
 * />
 * 
 * // Character count
 * <Textarea 
 *   label="Message" 
 *   showCharCount 
 *   maxLength={500} 
 *   placeholder="Up to 500 characters" 
 * />
 * 
 * // Code textarea (monospace)
 * <CodeTextarea 
 *   label="Custom Configuration" 
 *   language="yaml" 
 *   placeholder="key: value" 
 * />
 * 
 * // Auto textarea (pre-configured)
 * <AutoTextarea 
 *   label="Comments" 
 *   placeholder="Enter comments" 
 * />
 * 
 * // Disabled state
 * <Textarea label="Read-only" disabled value="Cannot edit" />
 * 
 * // Required field
 * <Textarea label="Description" required />
 * 
 * // Fixed rows
 * <Textarea label="Notes" rows={5} />
 * 
 * // In forms (React Hook Form)
 * import { useForm } from 'react-hook-form';
 * 
 * function SiteForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm();
 *   
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <Textarea
 *         label="Description"
 *         {...register('description', { required: 'Description is required' })}
 *         errorMessage={errors.description?.message}
 *         showCharCount
 *         maxLength={1000}
 *       />
 *       <Textarea
 *         label="Notes"
 *         {...register('notes')}
 *         autoResize
 *         minRows={3}
 *         maxRows={8}
 *       />
 *       <Button type="submit">Save</Button>
 *     </form>
 *   );
 * }
 * 
 * // In site creation
 * <Textarea
 *   label="Site Description"
 *   placeholder="Brief description of your site"
 *   helperText="This will be shown in search results"
 *   showCharCount
 *   maxLength={200}
 * />
 * 
 * // For custom configurations
 * <CodeTextarea
 *   label="Custom Nginx Config"
 *   language="nginx"
 *   placeholder="# Enter custom configuration"
 *   resize="both"
 *   minRows={10}
 * />
 * 
 * // For cron commands
 * <CodeTextarea
 *   label="Command"
 *   language="bash"
 *   placeholder="/usr/bin/php /var/www/script.php"
 *   resize="vertical"
 *   minRows={3}
 * />
 * 
 * // For backup notes
 * <AutoTextarea
 *   label="Backup Notes"
 *   placeholder="Add notes about this backup..."
 *   minRows={3}
 *   maxRows={8}
 * />
 * 
 * // With validation
 * <Textarea
 *   label="SSH Public Key"
 *   placeholder="ssh-rsa AAAA..."
 *   helperText="Paste your SSH public key"
 *   autoResize
 *   minRows={5}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Textarea Design System — wpPanel by Breach Rabbit
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
 * - sm: px-2.5 py-1.5, text-xs (12px), minRows: 2
 * - md: px-3 py-2,   text-sm (14px), minRows: 3 — DEFAULT
 * - lg: px-4 py-2.5, text-base (16px), minRows: 4
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Resize Options:
 * - none: No resize handle
 * - vertical: Vertical resize only (default)
 * - horizontal: Horizontal resize only
 * - both: Both directions
 * 
 * Auto-resize:
 * - Expands to fit content
 * - Respects minRows and maxRows
 * - Resets on value change
 * - No scrollbar when within limits
 * 
 * Character Count:
 * - Shows current/max characters
 * - Warning when < 20 remaining
 * - Error when over limit
 * - Positioned in footer with helper text
 * 
 * Accessibility:
 * - aria-invalid for error state
 * - aria-describedby for helper/error messages
 * - Label association via htmlFor
 * - Focus visible ring (2px)
 * - Required indicator (*)
 * - Keyboard accessible
 * 
 * Performance:
 * - CSS-first (no JS for hover/focus states)
 * - Minimal runtime overhead (only auto-resize)
 * - No external dependencies
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Site descriptions
 * - Backup notes
 * - Cron job commands
 * - Custom configurations (Nginx, PHP, etc.)
 * - SSH key input
 * - API key/token input
 * - Webhook payloads
 * - Email templates
 * - Support tickets
 * - Comments/annotations
 */