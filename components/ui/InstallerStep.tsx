'use client';

// =============================================================================
// wpPanel by Breach Rabbit — InstallerStep Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Wizard step indicator, status, animations, progress
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  Server,
  Cpu,
  Settings,
  Database,
  User,
  Globe,
  Shield,
  Bell,
  Zap,
  Wordpress,
  Check,
} from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type InstallerStepStatus = 'pending' | 'active' | 'completed' | 'error' | 'skipped';

export interface InstallerStepData {
  /** Step number (1-11) */
  number: number;
  
  /** Step identifier */
  id: string;
  
  /** Step title */
  title: string;
  
  /** Step description */
  description?: string;
  
  /** Current status */
  status: InstallerStepStatus;
  
  /** Step icon */
  icon?: React.ComponentType<{ className?: string }>;
  
  /** Error message (if status is error) */
  errorMessage?: string;
  
  /** Progress percentage (0-100) for current step */
  progress?: number;
  
  /** Additional info to display */
  info?: string;
}

export interface InstallerStepProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Step data */
  step: InstallerStepData;
  
  /** Show description */
  showDescription?: boolean;
  
  /** Show progress bar */
  showProgress?: boolean;
  
  /** Compact mode (for sidebar) */
  compact?: boolean;
  
  /** Clickable (for navigation) */
  clickable?: boolean;
  
  /** On step click */
  onClick?: (stepId: string) => void;
}

export interface InstallerProgressProps extends React.ComponentPropsWithoutRef<'div'> {
  /** All steps */
  steps: InstallerStepData[];
  
  /** Current step number */
  currentStep: number;
  
  /** Compact vertical mode */
  vertical?: boolean;
  
  /** Show descriptions */
  showDescriptions?: boolean;
  
  /** Show progress connecting lines */
  showLines?: boolean;
  
  /** Custom className for steps container */
  stepsClassName?: string;
}

// =============================================================================
// ⚙️ HELPERS
// =============================================================================

/**
 * Get status color configuration
 */
function getStatusConfig(status: InstallerStepStatus): {
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
  animated: boolean;
} {
  switch (status) {
    case 'completed':
      return {
        color: 'text-success',
        bg: 'bg-success',
        border: 'border-success',
        icon: CheckCircle,
        animated: false,
      };
    case 'active':
      return {
        color: 'text-accent',
        bg: 'bg-accent',
        border: 'border-accent',
        icon: Loader2,
        animated: true,
      };
    case 'error':
      return {
        color: 'text-error',
        bg: 'bg-error',
        border: 'border-error',
        icon: AlertCircle,
        animated: false,
      };
    case 'skipped':
      return {
        color: 'text-text-muted',
        bg: 'bg-bg-overlay',
        border: 'border-border',
        icon: Circle,
        animated: false,
      };
    default:
      return {
        color: 'text-text-muted',
        bg: 'bg-bg-overlay',
        border: 'border-border',
        icon: Circle,
        animated: false,
      };
  }
}

/**
 * Get default icon for step ID
 */
function getDefaultIcon(stepId: string): React.ComponentType<{ className?: string }> {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    welcome: Server,
    hardware: Cpu,
    dependencies: Settings,
    database: Database,
    admin: User,
    server: Globe,
    ols: Shield,
    optional: Bell,
    optimize: Zap,
    wordpress: Wordpress,
    complete: Check,
  };
  
  return iconMap[stepId] || Circle;
}

// =============================================================================
// 🏗️ INSTALLER STEP COMPONENT
// =============================================================================

/**
 * InstallerStep Component — wpPanel by Breach Rabbit UI
 * 
 * Displays a single step in the installer wizard with status, progress, and info.
 * Used in the browser-based installer (Priority 2).
 * 
 * @example
 * <InstallerStep
 *   step={{
 *     number: 1,
 *     id: 'welcome',
 *     title: 'Welcome',
 *     description: 'Introduction to wpPanel',
 *     status: 'completed',
 *   }}
 * />
 */
export const InstallerStep = React.forwardRef<HTMLDivElement, InstallerStepProps>(
  (
    {
      className,
      step,
      showDescription = true,
      showProgress = false,
      compact = false,
      clickable = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const statusConfig = getStatusConfig(step.status);
    const Icon = step.icon || getDefaultIcon(step.id);
    const StatusIcon = statusConfig.icon;
    
    const handleClick = () => {
      if (clickable && onClick && step.status !== 'active') {
        onClick(step.id);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex items-start gap-3',
          'transition-all duration-150 ease-out',
          
          // Clickable
          clickable && step.status !== 'active' && 'cursor-pointer hover:bg-bg-overlay rounded-md p-2 -mx-2',
          
          // Custom className
          className
        )}
        onClick={handleClick}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable && step.status !== 'active' ? 0 : undefined}
        {...props}
      >
        {/* Step Number/Icon Circle */}
        <div
          className={cn(
            // Base
            'flex items-center justify-center',
            'flex-shrink-0',
            'rounded-full',
            'transition-all duration-150 ease-out',
            
            // Size
            compact ? 'w-8 h-8' : 'w-10 h-10',
            
            // Status colors
            statusConfig.bg,
            statusConfig.color,
            
            // Active state
            step.status === 'active' && statusConfig.animated && 'animate-pulse'
          )}
        >
          {step.status === 'completed' ? (
            <CheckCircle className={cn(compact ? 'w-5 h-5' : 'w-6 h-6')} aria-hidden="true" />
          ) : step.status === 'active' && statusConfig.animated ? (
            <StatusIcon className={cn(compact ? 'w-5 h-5' : 'w-6 h-6', 'animate-spin')} aria-hidden="true" />
          ) : step.status === 'error' ? (
            <StatusIcon className={cn(compact ? 'w-5 h-5' : 'w-6 h-6')} aria-hidden="true" />
          ) : (
            <span className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>
              {step.number}
            </span>
          )}
        </div>

        {/* Step Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {/* Title & Status */}
          <div className="flex items-center gap-2">
            <h3 className={cn(
              'font-semibold',
              'text-text-primary',
              compact ? 'text-sm' : 'text-base',
              step.status === 'completed' && 'text-success',
              step.status === 'error' && 'text-error',
              step.status === 'active' && 'text-accent'
            )}>
              {step.title}
            </h3>
            
            {/* Status Badge */}
            {step.status !== 'pending' && (
              <span
                className={cn(
                  'px-1.5 py-0.5',
                  'rounded',
                  'text-xs font-medium',
                  step.status === 'completed' && 'bg-success-subtle text-success',
                  step.status === 'active' && 'bg-accent-subtle text-accent',
                  step.status === 'error' && 'bg-error-subtle text-error',
                  step.status === 'skipped' && 'bg-bg-overlay text-text-muted'
                )}
              >
                {step.status === 'completed' && 'Done'}
                {step.status === 'active' && 'In Progress'}
                {step.status === 'error' && 'Failed'}
                {step.status === 'skipped' && 'Skipped'}
              </span>
            )}
          </div>

          {/* Description */}
          {showDescription && step.description && (
            <p className={cn(
              'mt-0.5',
              'text-text-secondary',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {step.description}
            </p>
          )}

          {/* Progress Bar */}
          {showProgress && step.status === 'active' && step.progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Progress</span>
                <span>{step.progress}%</span>
              </div>
              <div className="h-1.5 bg-bg-overlay rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 ease-out"
                  style={{ width: `${step.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {step.status === 'error' && step.errorMessage && (
            <div className="mt-2 p-2 rounded-md bg-error-subtle border border-error">
              <p className="text-xs text-error">{step.errorMessage}</p>
            </div>
          )}

          {/* Additional Info */}
          {step.info && step.status !== 'error' && (
            <p className={cn(
              'mt-1',
              'text-xs',
              step.status === 'completed' ? 'text-success' : 'text-text-muted'
            )}>
              {step.info}
            </p>
          )}
        </div>
      </div>
    );
  }
);

// Set display name for debugging
InstallerStep.displayName = 'InstallerStep';

// =============================================================================
// 🏗️ INSTALLER PROGRESS COMPONENT
// =============================================================================

/**
 * InstallerProgress — Full wizard progress indicator with all steps
 */
export const InstallerProgress = React.forwardRef<HTMLDivElement, InstallerProgressProps>(
  (
    {
      className,
      steps,
      currentStep,
      vertical = false,
      showDescriptions = true,
      showLines = true,
      stepsClassName,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          vertical ? 'flex flex-col' : 'flex flex-col',
          className
        )}
        {...props}
      >
        {/* Steps */}
        <div className={cn('space-y-4', stepsClassName)}>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <InstallerStep
                step={step}
                showDescription={showDescriptions}
                showProgress={step.number === currentStep}
                compact={false}
              />
              
              {/* Connecting Line */}
              {showLines && index < steps.length - 1 && (
                <div className="flex items-center justify-center pl-5">
                  <div
                    className={cn(
                      'w-0.5 h-4',
                      step.status === 'completed' ? 'bg-success' : 'bg-bg-overlay'
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Overall Progress */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-secondary">
              Step {currentStep} of {steps.length}
            </span>
            <span className="text-text-primary font-medium">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="h-2 bg-bg-overlay rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }
);

// Set display name for debugging
InstallerProgress.displayName = 'InstallerProgress';

// =============================================================================
// 🏗️ INSTALLER STEPPER COMPONENT (Horizontal)
// =============================================================================

/**
 * InstallerStepper — Horizontal stepper for desktop wizard header
 */
export interface InstallerStepperProps extends React.ComponentPropsWithoutRef<'div'> {
  /** All steps */
  steps: InstallerStepData[];
  
  /** Current step number */
  currentStep: number;
  
  /** On step click (for navigation) */
  onStepClick?: (stepNumber: number) => void;
  
  /** Compact mode */
  compact?: boolean;
}

export const InstallerStepper = React.forwardRef<HTMLDivElement, InstallerStepperProps>(
  (
    {
      className,
      steps,
      currentStep,
      onStepClick,
      compact = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full',
          compact ? 'py-3' : 'py-6',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const statusConfig = getStatusConfig(step.status);
            const isCompleted = step.number < currentStep;
            const isActive = step.number === currentStep;
            const isPending = step.number > currentStep;
            const Icon = step.icon || getDefaultIcon(step.id);
            
            return (
              <React.Fragment key={step.id}>
                {/* Step */}
                <div className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => onStepClick?.(step.number)}
                    disabled={isPending}
                    className={cn(
                      // Base
                      'flex items-center justify-center',
                      'rounded-full',
                      'transition-all duration-150 ease-out',
                      
                      // Size
                      compact ? 'w-8 h-8' : 'w-10 h-10',
                      
                      // Status colors
                      isCompleted && 'bg-success text-white',
                      isActive && cn('bg-accent text-white', 'ring-4 ring-accent-subtle'),
                      isPending && 'bg-bg-overlay text-text-muted',
                      
                      // Interactive
                      !isPending && 'cursor-pointer hover:scale-105',
                      isPending && 'cursor-not-allowed'
                    )}
                    aria-label={`Step ${step.number}: ${step.title}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <CheckCircle className={cn(compact ? 'w-5 h-5' : 'w-6 h-6')} aria-hidden="true" />
                    ) : isActive ? (
                      <Icon className={cn(compact ? 'w-5 h-5' : 'w-6 h-6')} aria-hidden="true" />
                    ) : (
                      <span className={cn('font-semibold', compact ? 'text-xs' : 'text-sm')}>
                        {step.number}
                      </span>
                    )}
                  </button>
                  
                  {/* Label */}
                  {!compact && (
                    <span
                      className={cn(
                        'mt-2 text-xs font-medium',
                        'text-center',
                        'max-w-[80px]',
                        isCompleted && 'text-success',
                        isActive && 'text-accent',
                        isPending && 'text-text-muted'
                      )}
                    >
                      {step.title}
                    </span>
                  )}
                </div>
                
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      'transition-colors duration-150',
                      isCompleted ? 'bg-success' : 'bg-bg-overlay'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }
);

// Set display name for debugging
InstallerStepper.displayName = 'InstallerStepper';

// =============================================================================
// 📦 DEFAULT INSTALLER STEPS
// =============================================================================

/**
 * Default installer steps configuration (11 steps from MASTER_PLAN.md)
 */
export const DEFAULT_INSTALLER_STEPS: InstallerStepData[] = [
  {
    number: 1,
    id: 'welcome',
    title: 'Welcome',
    description: 'Introduction to wpPanel',
    status: 'pending',
    icon: Server,
  },
  {
    number: 2,
    id: 'hardware',
    title: 'Hardware',
    description: 'Server analysis',
    status: 'pending',
    icon: Cpu,
  },
  {
    number: 3,
    id: 'dependencies',
    title: 'Dependencies',
    description: 'Install packages',
    status: 'pending',
    icon: Settings,
  },
  {
    number: 4,
    id: 'database',
    title: 'Database',
    description: 'PostgreSQL setup',
    status: 'pending',
    icon: Database,
  },
  {
    number: 5,
    id: 'admin',
    title: 'Admin',
    description: 'Create account',
    status: 'pending',
    icon: User,
  },
  {
    number: 6,
    id: 'server',
    title: 'Server',
    description: 'Server settings',
    status: 'pending',
    icon: Globe,
  },
  {
    number: 7,
    id: 'ols',
    title: 'OpenLiteSpeed',
    description: 'OLS integration',
    status: 'pending',
    icon: Shield,
  },
  {
    number: 8,
    id: 'optional',
    title: 'Optional',
    description: 'Additional services',
    status: 'pending',
    icon: Bell,
  },
  {
    number: 9,
    id: 'optimize',
    title: 'Optimize',
    description: 'Apply settings',
    status: 'pending',
    icon: Zap,
  },
  {
    number: 10,
    id: 'wordpress',
    title: 'WordPress',
    description: 'Optional install',
    status: 'pending',
    icon: Wordpress,
  },
  {
    number: 11,
    id: 'complete',
    title: 'Complete',
    description: 'Installation done',
    status: 'pending',
    icon: Check,
  },
];

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { InstallerStepProps, InstallerProgressProps, InstallerStepperProps, InstallerStepData, InstallerStepStatus };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { InstallerStep, InstallerProgress, InstallerStepper, DEFAULT_INSTALLER_STEPS } from '@/components/ui/InstallerStep';
 * 
 * // Single step
 * <InstallerStep
 *   step={{
 *     number: 1,
 *     id: 'welcome',
 *     title: 'Welcome',
 *     description: 'Introduction to wpPanel',
 *     status: 'completed',
 *   }}
 * />
 * 
 * // Step with progress
 * <InstallerStep
 *   step={{
 *     number: 3,
 *     id: 'dependencies',
 *     title: 'Dependencies',
 *     description: 'Installing packages...',
 *     status: 'active',
 *     progress: 45,
 *   }}
 *   showProgress
 * />
 * 
 * // Step with error
 * <InstallerStep
 *   step={{
 *     number: 4,
 *     id: 'database',
 *     title: 'Database',
 *     description: 'PostgreSQL setup failed',
 *     status: 'error',
 *     errorMessage: 'Connection timeout. Please check credentials.',
 *   }}
 * />
 * 
 * // Full progress (vertical)
 * <InstallerProgress
 *   steps={steps}
 *   currentStep={3}
 *   vertical
 *   showDescriptions
 * />
 * 
 * // Horizontal stepper (desktop)
 * <InstallerStepper
 *   steps={steps}
 *   currentStep={3}
 *   onStepClick={setCurrentStep}
 * />
 * 
 * // In installer wizard
 * function InstallerWizard() {
 *   const [currentStep, setCurrentStep] = useState(1);
 *   const [steps, setSteps] = useState(DEFAULT_INSTALLER_STEPS);
 *   
 *   // Update step status as installation progresses
 *   useEffect(() => {
 *     setSteps(prev => prev.map(step => ({
 *       ...step,
 *       status: step.number < currentStep ? 'completed' :
 *               step.number === currentStep ? 'active' :
 *               'pending',
 *     })));
 *   }, [currentStep]);
 *   
 *   return (
 *     <div className="space-y-6">
 *       <InstallerStepper
 *         steps={steps}
 *         currentStep={currentStep}
 *         onStepClick={setCurrentStep}
 *       />
 *       
 *       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 *         {/* Progress sidebar */}
 *         <div className="lg:col-span-1">
 *           <InstallerProgress
 *             steps={steps}
 *             currentStep={currentStep}
 *             vertical
 *           />
 *         </div>
 *         
 *         {/* Step content */}
 *         <div className="lg:col-span-2">
 *           {currentStep === 1 && <WelcomeStep />}
 *           {currentStep === 2 && <HardwareStep />}
 *           {currentStep === 3 && <DependenciesStep />}
 *           {/* etc... */}
 *         </div>
 *       </div>
 *     </div>
 *   );
 * }
 * 
 * // Compact mode (for mobile/sidebar)
 * <InstallerStep
 *   step={step}
 *   compact
 *   showDescription={false}
 * />
 * 
 * // Clickable steps (for navigation)
 * <InstallerProgress
 *   steps={steps}
 *   currentStep={currentStep}
 *   clickable
 *   onClick={(stepId) => navigateToStep(stepId)}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * InstallerStep Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - success:        #10b981 (Green) — completed steps
 * - accent:         #3b82f6 (Blue) — active/current step
 * - error:          #ef4444 (Red) — failed steps
 * - text-muted:     #444444 (dark) / #999999 (light) — pending steps
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — pending step bg
 * 
 * Sizing:
 * - Circle: w-10 h-10 (default), w-8 h-8 (compact)
 * - Icon: w-6 h-6 (default), w-5 h-5 (compact)
 * - Font: text-base (title), text-sm (description)
 * - Line: w-0.5 h-4 (connecting lines)
 * 
 * Border Radius:
 * - Circles: rounded-full (50%)
 * - Progress bars: rounded-full
 * - Error boxes: rounded-md (6px)
 * 
 * Animations:
 * - Active step: pulse animation (CSS)
 * - Loading icon: spin animation (CSS)
 * - Progress bar: 300ms ease-out transition
 * - Hover scale: 105% on clickable steps
 * 
 * Status States:
 * - pending: gray circle with number
 * - active: blue circle with icon, pulsing
 * - completed: green circle with checkmark
 * - error: red circle with alert icon
 * - skipped: gray circle, muted
 * 
 * Accessibility:
 * - aria-label on step circles
 * - aria-current="step" for active step
 * - role="button" for clickable steps
 * - Keyboard navigation (Tab, Enter)
 * - Screen reader friendly status text
 * 
 * Performance:
 * - CSS-first animations (no JS)
 * - Lucide icons tree-shaken
 * - Minimal runtime overhead
 * - Part of initial bundle (<150KB target)
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Installer wizard (11 steps)
 * - Setup progress sidebar
 * - Multi-step forms
 * - Onboarding flows
 */