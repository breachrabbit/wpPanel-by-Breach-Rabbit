'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Modal Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Radix UI Dialog primitives, multiple sizes, animations, accessibility
// =============================================================================

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalOverlay = 'none' | 'blur' | 'dark';

export interface ModalProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  /** Modal open state (controlled) */
  open?: boolean;
  
  /** On open change callback */
  onOpenChange?: (open: boolean) => void;
  
  /** Modal size */
  size?: ModalSize;
  
  /** Modal title */
  title?: React.ReactNode;
  
  /** Modal description */
  description?: React.ReactNode;
  
  /** Modal content */
  children?: React.ReactNode;
  
  /** Footer content (actions) */
  footer?: React.ReactNode;
  
  /** Show close button */
  showCloseButton?: boolean;
  
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  
  /** Close on escape key */
  closeOnEscape?: boolean;
  
  /** Overlay style */
  overlay?: ModalOverlay;
  
  /** Custom className for the overlay */
  overlayClassName?: string;
  
  /** Custom className for the content */
  contentClassName?: string;
  
  /** Custom className for the header */
  headerClassName?: string;
  
  /** Custom className for the footer */
  footerClassName?: string;
  
  /** Prevent body scroll when modal is open */
  preventScroll?: boolean;
  
  /** Modal is loading (shows spinner) */
  isLoading?: boolean;
}

export interface ModalHeaderProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Modal title */
  title?: React.ReactNode;
  
  /** Modal description */
  description?: React.ReactNode;
  
  /** Show close button */
  showCloseButton?: boolean;
  
  /** Custom className for the header */
  className?: string;
}

export interface ModalContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Modal size */
  size?: ModalSize;
  
  /** Custom className for the content */
  className?: string;
}

export interface ModalFooterProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Custom className for the footer */
  className?: string;
}

export interface ModalTriggerProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger> {
  /** Custom className for the trigger */
  className?: string;
}

export interface ModalCloseProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close> {
  /** Custom className for the close button */
  className?: string;
}

// =============================================================================
// ⚙️ SIZE CONFIGURATIONS
// =============================================================================

/**
 * Size configurations (max width and padding)
 */
const sizeStyles: Record<ModalSize, {
  maxWidth: string;
  padding: string;
  contentPadding: string;
}> = {
  sm: {
    maxWidth: 'max-w-sm',
    padding: 'p-4',
    contentPadding: 'p-4',
  },
  md: {
    maxWidth: 'max-w-md',
    padding: 'p-5',
    contentPadding: 'p-5',
  },
  lg: {
    maxWidth: 'max-w-lg',
    padding: 'p-6',
    contentPadding: 'p-6',
  },
  xl: {
    maxWidth: 'max-w-xl',
    padding: 'p-6',
    contentPadding: 'p-6',
  },
  full: {
    maxWidth: 'max-w-5xl',
    padding: 'p-6',
    contentPadding: 'p-6',
  },
};

// =============================================================================
// 🏗️ MODAL COMPONENT
// =============================================================================

/**
 * Modal Component — wpPanel by Breach Rabbit UI
 * 
 * Built on Radix UI Dialog primitives for full accessibility.
 * 
 * @example
 * <Modal open={isOpen} onOpenChange={setIsOpen} title="Confirm Action">
 *   <p>Are you sure you want to delete this item?</p>
 *   <Modal.Footer>
 *     <Button variant="ghost">Cancel</Button>
 *     <Button variant="danger">Delete</Button>
 *   </Modal.Footer>
 * </Modal>
 * 
 * <Modal size="lg" title="Large Modal">
 *   <p>Content here...</p>
 * </Modal>
 */
export const Modal = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Root>,
  ModalProps
>(
  (
    {
      open,
      onOpenChange,
      size = 'md',
      title,
      description,
      children,
      footer,
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      overlay = 'blur',
      overlayClassName,
      contentClassName,
      headerClassName,
      footerClassName,
      preventScroll = true,
      isLoading = false,
      ...props
    },
    ref
  ) => {
    const sizes = sizeStyles[size];

    return (
      <DialogPrimitive.Root
        open={open}
        onOpenChange={onOpenChange}
        {...props}
      >
        <DialogPrimitive.Portal>
          {/* Overlay */}
          <DialogPrimitive.Overlay
            className={cn(
              // Base styles
              'fixed inset-0 z-50',
              'transition-all duration-200 ease-out',
              
              // Overlay style
              overlay === 'blur' && 'bg-black/50 backdrop-blur-sm',
              overlay === 'dark' && 'bg-black/70',
              overlay === 'none' && 'bg-transparent',
              
              // Animation
              'data-[state=open]:animate-fade-in',
              'data-[state=closed]:animate-fade-out',
              
              // Custom className
              overlayClassName
            )}
          />

          {/* Modal Content */}
          <DialogPrimitive.Content
            className={cn(
              // Base styles
              'fixed top-1/2 left-1/2 z-50',
              'translate-x-[-50%] translate-y-[-50%]',
              'w-[90vw]',
              'rounded-md',
              'bg-bg-surface',
              'border border-border',
              'shadow-elevated',
              
              // Size
              sizes.maxWidth,
              sizes.padding,
              
              // Animation
              'data-[state=open]:animate-slide-up',
              'data-[state=closed]:animate-fade-out',
              
              // Scroll prevention
              preventScroll && 'data-[state=open]:overflow-hidden',
              
              // Custom className
              contentClassName
            )}
            onInteractOutside={(e) => {
              if (!closeOnOverlayClick) {
                e.preventDefault();
              }
            }}
            onEscapeKeyDown={(e) => {
              if (!closeOnEscape) {
                e.preventDefault();
              }
            }}
          >
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm rounded-md">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-text-secondary">Loading...</span>
                </div>
              </div>
            )}

            {/* Header (if title or description provided) */}
            {(title || description) && (
              <ModalHeader
                title={title}
                description={description}
                showCloseButton={showCloseButton}
                className={headerClassName}
              />
            )}

            {/* Close Button (if no header) */}
            {showCloseButton && !title && !description && (
              <DialogPrimitive.Close
                className={cn(
                  'absolute top-4 right-4',
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary',
                  'hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface'
                )}
              >
                <X className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}

            {/* Body */}
            <div className={cn(sizes.contentPadding, 'pt-0')}>
              {children}
            </div>

            {/* Footer (if provided) */}
            {footer && (
              <ModalFooter className={footerClassName}>
                {footer}
              </ModalFooter>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }
);

// Set display name for debugging
Modal.displayName = 'Modal';

// =============================================================================
// 📦 MODAL HEADER COMPONENT
// =============================================================================

/**
 * ModalHeader — Header section with title, description, and close button
 */
export const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  (
    {
      title,
      description,
      showCloseButton = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'flex items-start justify-between',
          'pb-4',
          'border-b border-border',
          
          // Custom className
          className
        )}
        {...props}
      >
        {/* Title & Description */}
        <div className="flex-1 min-w-0">
          {title && (
            <DialogPrimitive.Title
              className={cn(
                'text-base font-semibold',
                'text-text-primary',
                'leading-tight'
              )}
            >
              {title}
            </DialogPrimitive.Title>
          )}
          
          {description && (
            <DialogPrimitive.Description
              className={cn(
                'text-sm',
                'text-text-secondary',
                'mt-1',
                title && 'mt-1.5'
              )}
            >
              {description}
            </DialogPrimitive.Description>
          )}
        </div>

        {/* Close Button */}
        {showCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              'flex items-center justify-center',
              'w-8 h-8',
              'rounded-md',
              'text-text-muted hover:text-text-primary',
              'hover:bg-bg-overlay',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface',
              'flex-shrink-0',
              title ? '-mt-1' : ''
            )}
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </div>
    );
  }
);

// Set display name for debugging
ModalHeader.displayName = 'ModalHeader';

// =============================================================================
// 📦 MODAL CONTENT COMPONENT
// =============================================================================

/**
 * ModalContent — Content wrapper for advanced use cases
 */
export const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ size = 'md', className, children, ...props }, ref) => {
  const sizes = sizeStyles[size];

  return (
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Base styles
        'fixed top-1/2 left-1/2',
        'translate-x-[-50%] translate-y-[-50%]',
        'w-[90vw]',
        'rounded-md',
        'bg-bg-surface',
        'border border-border',
        'shadow-elevated',
        
        // Size
        sizes.maxWidth,
        sizes.padding,
        
        // Animation
        'data-[state=open]:animate-slide-up',
        'data-[state=closed]:animate-fade-out',
        
        // Custom className
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  );
});

// Set display name for debugging
ModalContent.displayName = 'ModalContent';

// =============================================================================
// 📦 MODAL FOOTER COMPONENT
// =============================================================================

/**
 * ModalFooter — Footer section for actions
 */
export const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'flex items-center justify-end',
          'gap-2',
          'pt-4',
          'mt-4',
          'border-t border-border',
          
          // Custom className
          className
        )}
        {...props}
      />
    );
  }
);

// Set display name for debugging
ModalFooter.displayName = 'ModalFooter';

// =============================================================================
// 📦 MODAL TRIGGER COMPONENT
// =============================================================================

/**
 * ModalTrigger — Trigger button to open modal
 */
export const ModalTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  ModalTriggerProps
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Trigger
      ref={ref}
      className={cn(
        // Custom className
        className
      )}
      {...props}
    />
  );
});

// Set display name for debugging
ModalTrigger.displayName = 'ModalTrigger';

// =============================================================================
// 📦 MODAL CLOSE COMPONENT
// =============================================================================

/**
 * ModalClose — Close button (alternative to header close)
 */
export const ModalClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  ModalCloseProps
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Close
      ref={ref}
      className={cn(
        // Base styles
        'flex items-center justify-center',
        'w-8 h-8',
        'rounded-md',
        'text-text-muted hover:text-text-primary',
        'hover:bg-bg-overlay',
        'transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface',
        
        // Custom className
        className
      )}
      {...props}
    />
  );
});

// Set display name for debugging
ModalClose.displayName = 'ModalClose';

// =============================================================================
// 📦 CONFIRM DIALOG COMPONENT
// =============================================================================

/**
 * ConfirmDialog — Pre-built confirmation dialog for destructive actions
 */
export interface ConfirmDialogProps extends Omit<ModalProps, 'title' | 'children' | 'footer'> {
  /** Confirmation title */
  title?: string;
  
  /** Confirmation description */
  description?: string;
  
  /** Confirm button text */
  confirmText?: string;
  
  /** Cancel button text */
  cancelText?: string;
  
  /** Confirm button variant */
  confirmVariant?: 'primary' | 'danger';
  
  /** On confirm callback */
  onConfirm?: () => void | Promise<void>;
  
  /** On cancel callback */
  onCancel?: () => void;
  
  /** Is confirming (loading state) */
  isConfirming?: boolean;
  
  /** Icon to display */
  icon?: React.ReactNode;
}

export const ConfirmDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Root>,
  ConfirmDialogProps
>(
  (
    {
      open,
      onOpenChange,
      title = 'Are you sure?',
      description,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmVariant = 'danger',
      onConfirm,
      onCancel,
      isConfirming = false,
      icon,
      size = 'md',
      overlay = 'blur',
      ...props
    },
    ref
  ) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleConfirm = async () => {
      if (!onConfirm) {
        onOpenChange?.(false);
        return;
      }

      setIsLoading(true);
      try {
        await onConfirm();
        onOpenChange?.(false);
      } catch (error) {
        console.error('Confirm action failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleCancel = () => {
      onCancel?.();
      onOpenChange?.(false);
    };

    // Default icon based on confirm variant
    const defaultIcon = confirmVariant === 'danger' ? (
      <div className="w-10 h-10 rounded-full bg-error-subtle text-error flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-5 h-5" aria-hidden="true" />
      </div>
    ) : (
      <div className="w-10 h-10 rounded-full bg-info-subtle text-info flex items-center justify-center flex-shrink-0">
        <Info className="w-5 h-5" aria-hidden="true" />
      </div>
    );

    return (
      <Modal
        ref={ref}
        open={open}
        onOpenChange={onOpenChange}
        size={size}
        overlay={overlay}
        showCloseButton={!isConfirming}
        closeOnEscape={!isConfirming}
        closeOnOverlayClick={!isConfirming}
        isLoading={isConfirming || isLoading}
        {...props}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          {icon || defaultIcon}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-text-primary mb-1">
                {title}
              </h3>
            )}
            
            {description && (
              <p className="text-sm text-text-secondary">
                {description}
              </p>
            )}
          </div>
        </div>

        <Modal.Footer>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isConfirming || isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={isConfirming || isLoading}
            isLoading={isConfirming || isLoading}
          >
            {confirmText}
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
);

// Set display name for debugging
ConfirmDialog.displayName = 'ConfirmDialog';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  ModalProps,
  ModalHeaderProps,
  ModalContentProps,
  ModalFooterProps,
  ModalTriggerProps,
  ModalCloseProps,
  ConfirmDialogProps,
  ModalSize,
  ModalOverlay,
};

// Import Button and icons for ConfirmDialog
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Info } from 'lucide-react';

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Modal, ModalTrigger, ModalClose, ConfirmDialog } from '@/components/ui/Modal';
 * import { Button } from '@/components/ui/Button';
 * 
 * // Simple modal
 * <Modal open={isOpen} onOpenChange={setIsOpen} title="Modal Title">
 *   <p>Modal content goes here...</p>
 * </Modal>
 * 
 * // Modal with trigger
 * <Modal>
 *   <ModalTrigger asChild>
 *     <Button>Open Modal</Button>
 *   </ModalTrigger>
 *   <ModalContent>
 *     <ModalHeader title="Modal Title" />
 *     <p>Modal content...</p>
 *     <ModalFooter>
 *       <Button variant="ghost">Cancel</Button>
 *       <Button variant="primary">Save</Button>
 *     </ModalFooter>
 *   </ModalContent>
 * </Modal>
 * 
 * // Modal with description
 * <Modal 
 *   open={isOpen} 
 *   onOpenChange={setIsOpen} 
 *   title="Delete Item"
 *   description="Are you sure you want to delete this item? This action cannot be undone."
 * >
 *   <Modal.Footer>
 *     <Button variant="ghost">Cancel</Button>
 *     <Button variant="danger">Delete</Button>
 *   </Modal.Footer>
 * </Modal>
 * 
 * // Different sizes
 * <Modal size="sm" title="Small Modal">Content</Modal>
 * <Modal size="md" title="Medium Modal">Content</Modal>
 * <Modal size="lg" title="Large Modal">Content</Modal>
 * <Modal size="xl" title="Extra Large Modal">Content</Modal>
 * <Modal size="full" title="Full Width Modal">Content</Modal>
 * 
 * // Without close button
 * <Modal showCloseButton={false} title="No Close Button">
 *   <p>You must use the action buttons to close this modal</p>
 * </Modal>
 * 
 * // Without overlay click close
 * <Modal closeOnOverlayClick={false} title="Must Use Button">
 *   <p>Click outside won't close this modal</p>
 * </Modal>
 * 
 * // Without escape close
 * <Modal closeOnEscape={false} title="No Escape">
 *   <p>Pressing Escape won't close this modal</p>
 * </Modal>
 * 
 * // With loading state
 * <Modal open={isOpen} onOpenChange={setIsOpen} title="Loading..." isLoading>
 *   <p>Content will be shown when loaded</p>
 * </Modal>
 * 
 * // With blur overlay
 * <Modal overlay="blur" title="Blurred Overlay">Content</Modal>
 * 
 * // With dark overlay
 * <Modal overlay="dark" title="Dark Overlay">Content</Modal>
 * 
 * // Without overlay
 * <Modal overlay="none" title="No Overlay">Content</Modal>
 * 
 * // Confirm Dialog (destructive)
 * <ConfirmDialog
 *   open={isDeleteOpen}
 *   onOpenChange={setIsDeleteOpen}
 *   title="Delete Site"
 *   description="Are you sure you want to delete this site? All files and databases will be permanently deleted."
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   confirmVariant="danger"
 *   onConfirm={async () => {
 *     await deleteSite(siteId);
 *   }}
 * />
 * 
 * // Confirm Dialog (non-destructive)
 * <ConfirmDialog
 *   open={isRestartOpen}
 *   onOpenChange={setIsRestartOpen}
 *   title="Restart Site"
 *   description="This will restart the site. There may be a brief downtime."
 *   confirmText="Restart"
 *   cancelText="Cancel"
 *   confirmVariant="primary"
 *   onConfirm={async () => {
 *     await restartSite(siteId);
 *   }}
 * />
 * 
 * // With custom icon
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Custom Icon"
 *   icon={
 *     <div className="w-10 h-10 rounded-full bg-success-subtle text-success flex items-center justify-center">
 *       <CheckCircle className="w-5 h-5" />
 *     </div>
 *   }
 * />
 * 
 * // In forms
 * function EditSiteModal({ site, open, onOpenChange }) {
 *   const [formData, setFormData] = useState(site);
 *   const [isSaving, setIsSaving] = useState(false);
 *   
 *   const handleSave = async () => {
 *     setIsSaving(true);
 *     try {
 *       await updateSite(site.id, formData);
 *       onOpenChange(false);
 *     } finally {
 *       setIsSaving(false);
 *     }
 *   };
 *   
 *   return (
 *     <Modal open={open} onOpenChange={onOpenChange} title="Edit Site" size="lg">
 *       <div className="space-y-4">
 *         <Input
 *           label="Site Name"
 *           value={formData.name}
 *           onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 *         />
 *         <Input
 *           label="Domain"
 *           value={formData.domain}
 *           onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
 *         />
 *       </div>
 *       <Modal.Footer>
 *         <Button variant="ghost" onClick={() => onOpenChange(false)}>
 *           Cancel
 *         </Button>
 *         <Button 
 *           variant="primary" 
 *           onClick={handleSave}
 *           isLoading={isSaving}
 *         >
 *           Save Changes
 *         </Button>
 *       </Modal.Footer>
 *     </Modal>
 *   );
 * }
 * 
 * // With scrollable content
 * <Modal open={isOpen} onOpenChange={setIsOpen} title="Terms and Conditions" size="lg">
 *   <div className="max-h-96 overflow-y-auto space-y-4">
 *     <p>Long content paragraph 1...</p>
 *     <p>Long content paragraph 2...</p>
 *     <p>Long content paragraph 3...</p>
 *     {/* More content... */}
 *   </div>
 *   <Modal.Footer>
 *     <Button variant="primary">I Agree</Button>
 *   </Modal.Footer>
 * </Modal>
 * 
 * // Nested modals (not recommended, but possible)
 * <Modal open={outerOpen} onOpenChange={setOuterOpen} title="Outer Modal">
 *   <p>Outer content</p>
 *   <Button onClick={() => setInnerOpen(true)}>Open Inner Modal</Button>
 * </Modal>
 * 
 * <Modal open={innerOpen} onOpenChange={setInnerOpen} title="Inner Modal">
 *   <p>Inner content</p>
 * </Modal>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Modal Design System — wpPanel by Breach Rabbit
 * 
 * Overlay Styles:
 * - blur: bg-black/50 + backdrop-blur-sm (default)
 * - dark: bg-black/70 (more opaque)
 * - none: transparent (no overlay)
 * 
 * Sizes:
 * - sm: max-w-sm (384px), p-4
 * - md: max-w-md (448px), p-5 — DEFAULT
 * - lg: max-w-lg (512px), p-6
 * - xl: max-w-xl (576px), p-6
 * - full: max-w-5xl (1024px), p-6
 * 
 * Border Radius:
 * - rounded-md (6px) — consistent with wpPanel design
 * 
 * Animations:
 * - Overlay: fade-in/fade-out 200ms ease
 * - Content: slide-up 200ms ease
 * - No heavy spring animations
 * 
 * Z-Index:
 * - Overlay: z-50
 * - Content: z-50
 * - Modal is above sidebar (z-40) and header (z-40)
 * 
 * Accessibility:
 * - Radix UI Dialog primitives for full ARIA support
 * - aria-labelledby for title
 * - aria-describedby for description
 * - Keyboard navigation (Tab, Escape to close)
 * - Focus trap inside modal
 * - Body scroll prevention when open
 * - Screen reader announcements
 * 
 * Performance:
 * - Radix UI primitives (minimal JS overhead)
 * - CSS-first animations
 * - Portal rendering (no layout shift)
 * - Tree-shaken Lucide icons
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Confirm destructive actions (delete site, database, etc.)
 * - Edit forms (site settings, user profile)
 * - Create forms (new site, new database)
 * - View details (file preview, log viewer)
 * - Settings dialogs (PHP settings, SSL upload)
 * - Two-factor authentication setup
 * - Backup restore confirmation
 * - Firewall rule creation
 * - Cron job editor
 * - Terms acceptance
 */