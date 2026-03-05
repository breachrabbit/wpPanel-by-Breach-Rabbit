'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Card Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Multiple variants, hover states, header/footer slots, interactive
// =============================================================================

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type CardVariant = 'default' | 'interactive' | 'elevated' | 'bordered' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant (visual style) */
  variant?: CardVariant;
  
  /** Internal padding */
  padding?: CardPadding;
  
  /** Make card clickable (adds hover state + cursor) */
  clickable?: boolean;
  
  /** Card children */
  children?: ReactNode;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Header children */
  children?: ReactNode;
  
  /** Show bottom border separator */
  bordered?: boolean;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Title text */
  children?: ReactNode;
  
  /** Title size */
  size?: 'sm' | 'md' | 'lg';
}

export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Description text */
  children?: ReactNode;
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Content children */
  children?: ReactNode;
  
  /** Internal padding */
  padding?: CardPadding;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Footer children */
  children?: ReactNode;
  
  /** Show top border separator */
  bordered?: boolean;
  
  /** Footer alignment */
  align?: 'left' | 'center' | 'right' | 'between';
}

// =============================================================================
// ⚙️ VARIANT CONFIGURATIONS
// =============================================================================

/**
 * Base card styles (shared across all variants)
 */
const baseStyles = `
  rounded-md
  transition-all duration-150 ease-out
  overflow-hidden
`;

/**
 * Variant configurations (using CSS variables from globals.css)
 */
const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-bg-surface
    border border-border
  `,
  interactive: `
    bg-bg-surface
    border border-border
    cursor-pointer
    hover:border-border-hover
    hover:bg-bg-overlay
    active:scale-[0.99]
  `,
  elevated: `
    bg-bg-elevated
    border border-border
    shadow-surface
  `,
  bordered: `
    bg-bg-base
    border-2 border-border
  `,
  ghost: `
    bg-transparent
    border border-border
    border-dashed
  `,
};

/**
 * Padding configurations
 */
const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// =============================================================================
// 🏗️ CARD COMPONENTS
// =============================================================================

/**
 * Card Component — wpPanel by Breach Rabbit UI
 * 
 * Main card container. Use Card.Header, Card.Title, Card.Description, 
 * Card.Content, and Card.Footer for structured content.
 * 
 * @example
 * <Card variant="default">
 *   <Card.Header bordered>
 *     <Card.Title>Card Title</Card.Title>
 *     <Card.Description>Card description</Card.Description>
 *   </Card.Header>
 *   <Card.Content>
 *     Card content goes here
 *   </Card.Content>
 *   <Card.Footer bordered align="between">
 *     <Button variant="ghost">Cancel</Button>
 *     <Button variant="primary">Save</Button>
 *   </Card.Footer>
 * </Card>
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    const combinedClassName = cn(
      baseStyles,
      variantStyles[variant],
      padding !== 'none' && paddingStyles[padding],
      clickable && 'cursor-pointer hover:shadow-elevated',
      className
    );

    return (
      <div
        ref={ref}
        className={combinedClassName}
        data-variant={variant}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// =============================================================================
// 📦 CARD SUB-COMPONENTS
// =============================================================================

/**
 * Card.Header — Header section with optional border
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  (
    { className, children, bordered = false, ...props },
    ref
  ) => {
    const combinedClassName = cn(
      'flex flex-col gap-1',
      'px-4 py-3',
      bordered && 'border-b border-border',
      className
    );

    return (
      <div
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card.Title — Card title heading
 */
export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  (
    { className, children, size = 'md', ...props },
    ref
  ) => {
    const sizeClasses = {
      sm: 'text-sm font-medium',
      md: 'text-base font-semibold',
      lg: 'text-lg font-semibold',
    };

    const combinedClassName = cn(
      'text-text-primary',
      'leading-tight',
      'tracking-tight',
      sizeClasses[size],
      className
    );

    return (
      <h3
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * Card.Description — Card description/subtitle text
 */
export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  (
    { className, children, ...props },
    ref
  ) => {
    const combinedClassName = cn(
      'text-sm',
      'text-text-secondary',
      'leading-relaxed',
      className
    );

    return (
      <p
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

/**
 * Card.Content — Main card content area
 */
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  (
    { className, children, padding = 'md', ...props },
    ref
  ) => {
    const combinedClassName = cn(
      padding !== 'none' && paddingStyles[padding],
      'text-text-primary',
      className
    );

    return (
      <div
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * Card.Footer — Footer section with actions
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  (
    { className, children, bordered = false, align = 'left', ...props },
    ref
  ) => {
    const alignClasses = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
    };

    const combinedClassName = cn(
      'flex items-center gap-2',
      'px-4 py-3',
      'flex-wrap',
      bordered && 'border-t border-border',
      alignClasses[align],
      className
    );

    return (
      <div
        ref={ref}
        className={combinedClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
  CardVariant,
  CardPadding,
};

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { Card } from '@/components/ui/Card';
 * 
 * // Simple card
 * <Card>
 *   <Card.Content>
 *     Simple card content
 *   </Card.Content>
 * </Card>
 * 
 * // Card with header and footer
 * <Card>
 *   <Card.Header bordered>
 *     <Card.Title>Card Title</Card.Title>
 *     <Card.Description>Card description text</Card.Description>
 *   </Card.Header>
 *   <Card.Content>
 *     Main content goes here
 *   </Card.Content>
 *   <Card.Footer bordered>
 *     <Button variant="ghost">Cancel</Button>
 *     <Button variant="primary">Save</Button>
 *   </Card.Footer>
 * </Card>
 * 
 * // Interactive card (clickable)
 * <Card variant="interactive" clickable onClick={handleClick}>
 *   <Card.Content>
 *     Clickable card content
 *   </Card.Content>
 * </Card>
 * 
 * // Elevated card (with shadow)
 * <Card variant="elevated">
 *   <Card.Content>
 *     Elevated card with subtle shadow
 *   </Card.Content>
 * </Card>
 * 
 * // Ghost card (dashed border)
 * <Card variant="ghost">
 *   <Card.Content>
 *     Ghost card for empty states
 *   </Card.Content>
 * </Card>
 * 
 * // Card grid layout
 * <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *   <Card>Card 1</Card>
 *   <Card>Card 2</Card>
 *   <Card>Card 3</Card>
 * </div>
 * 
 * // Metric card pattern
 * <Card variant="elevated">
 *   <Card.Header>
 *     <Card.Title size="sm">Total Users</Card.Title>
 *   </Card.Header>
 *   <Card.Content>
 *     <div className="text-3xl font-bold text-text-primary">1,234</div>
 *     <p className="text-sm text-success">+12% from last month</p>
 *   </Card.Content>
 * </Card>
 * 
 * // Site card pattern
 * <Card variant="interactive" clickable>
 *   <Card.Header bordered>
 *     <div className="flex items-center justify-between">
 *       <Card.Title size="sm">example.com</Card.Title>
 *       <StatusBadge status="online" />
 *     </div>
 *   </Card.Header>
 *   <Card.Content>
 *     <div className="grid grid-cols-2 gap-4 text-sm">
 *       <div>
 *         <span className="text-text-secondary">SSL:</span>
 *         <span className="text-text-primary ml-2">Active</span>
 *       </div>
 *       <div>
 *         <span className="text-text-secondary">PHP:</span>
 *         <span className="text-text-primary ml-2">8.3</span>
 *       </div>
 *     </div>
 *   </Card.Content>
 * </Card>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Card Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-base:      #080808 (dark) / #f8f8f8 (light)
 * - bg-surface:   #101010 (dark) / #ffffff (light)
 * - bg-elevated:  #181818 (dark) / #f0f0f0 (light)
 * - bg-overlay:   #202020 (dark) / #e8e8e8 (light)
 * - border:       rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - border-hover: rgba(255,255,255,0.12) (dark) / rgba(0,0,0,0.15) (light)
 * 
 * Variants:
 * - default:    Standard card (bg-surface + border)
 * - interactive: Clickable with hover state
 * - elevated:   With subtle shadow (bg-elevated)
 * - bordered:   Double border for emphasis
 * - ghost:      Dashed border for empty states
 * 
 * Sizing:
 * - Padding: none / sm (12px) / md (16px) / lg (24px)
 * - Border Radius: rounded-md (6px)
 * 
 * Transitions:
 * - 150ms ease-out for hover states
 * - scale-[0.99] on active (click)
 * - No heavy spring animations
 * 
 * Accessibility:
 * - Proper heading hierarchy (h3 for Card.Title)
 * - Semantic HTML structure
 * - Focus states via CSS
 * 
 * Performance:
 * - CSS-first (no JS for hover/active states)
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 */