'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Theme Provider
// =============================================================================
// Next.js 16.1 — Client Component
// Manages dark/light/system theme with localStorage persistence
// Features: SSR-safe, no flash, system preference detection, smooth transitions
// =============================================================================

import * as React from 'react';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type Theme = 'dark' | 'light' | 'system';

export interface ThemeContextType {
  /** Current active theme (dark/light) */
  theme: 'dark' | 'light';
  
  /** Stored theme preference (dark/light/system) */
  storedTheme: Theme;
  
  /** Set theme preference */
  setTheme: (theme: Theme) => void;
  
  /** Toggle between dark and light */
  toggleTheme: () => void;
  
  /** Is system preference dark */
  isSystemDark: boolean;
  
  /** Is theme changing (for transition suppression) */
  isTransitioning: boolean;
}

// =============================================================================
// 📦 CONTEXT
// =============================================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const STORAGE_KEY = 'wppanel-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Get system theme preference
 */
function getSystemPreference(): boolean {
  if (typeof window === 'undefined') {
    return false; // SSR default to dark
  }
  return window.matchMedia(MEDIA_QUERY).matches;
}

/**
 * Get stored theme from localStorage
 */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'; // SSR default
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    return stored;
  }
  return 'system';
}

/**
 * Set stored theme to localStorage
 */
function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Resolve actual theme from stored preference
 */
function resolveTheme(storedTheme: Theme, isSystemDark: boolean): 'dark' | 'light' {
  if (storedTheme === 'system') {
    return isSystemDark ? 'dark' : 'light';
  }
  return storedTheme;
}

// =============================================================================
// 🏗️ THEME PROVIDER COMPONENT
// =============================================================================

/**
 * ThemeProvider — wpPanel by Breach Rabbit UI
 * 
 * Provides theme context with dark/light/system support.
 * SSR-safe with no flash on load.
 * 
 * @example
 * // In app/layout.tsx
 * <ThemeProvider
 *   attribute="data-theme"
 *   defaultTheme="system"
 *   enableSystem
 *   disableTransitionOnChange={false}
 * >
 *   {children}
 * </ThemeProvider>
 * 
 * // In components
 * const { theme, setTheme, toggleTheme } = useTheme();
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = STORAGE_KEY,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
}) {
  const [storedTheme, setStoredThemeState] = useState<Theme>(defaultTheme);
  const [isSystemDark, setIsSystemDark] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // =============================================================================
  // 🔄 INITIALIZATION
  // =============================================================================

  // Initialize theme on mount (SSR-safe)
  useEffect(() => {
    setMounted(true);
    
    // Get stored theme
    const stored = localStorage.getItem(storageKey) as Theme | null;
    const initialTheme = stored || defaultTheme;
    setStoredThemeState(initialTheme);
    
    // Get system preference
    const systemDark = window.matchMedia(MEDIA_QUERY).matches;
    setIsSystemDark(systemDark);
    
    // Apply theme to document
    const resolvedTheme = resolveTheme(initialTheme, systemDark);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    const handleChange = (e: MediaQueryListEvent) => {
      setIsSystemDark(e.matches);
      
      if (initialTheme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [storageKey, defaultTheme]);

  // =============================================================================
  // 🔧 THEME ACTIONS
  // =============================================================================

  const handleSetTheme = useCallback((newTheme: Theme) => {
    if (!mounted) return;
    
    setIsTransitioning(true);
    
    // Suppress transitions during theme switch
    if (disableTransitionOnChange) {
      document.documentElement.style.setProperty('transition', 'none');
    }
    
    // Store preference
    setStoredThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
    
    // Resolve and apply actual theme
    const resolved = resolveTheme(newTheme, isSystemDark);
    document.documentElement.setAttribute('data-theme', resolved);
    
    // Dispatch custom event for other components to listen
    window.dispatchEvent(
      new CustomEvent('theme-change', { 
        detail: { theme: resolved, storedTheme: newTheme } 
      })
    );
    
    // Re-enable transitions after brief delay
    if (disableTransitionOnChange) {
      setTimeout(() => {
        document.documentElement.style.removeProperty('transition');
        setIsTransitioning(false);
      }, 50);
    } else {
      setIsTransitioning(false);
    }
  }, [mounted, isSystemDark, disableTransitionOnChange, storageKey]);

  const handleToggleTheme = useCallback(() => {
    const current = storedTheme;
    const newTheme: Theme = current === 'dark' ? 'light' : current === 'light' ? 'dark' : 'system';
    handleSetTheme(newTheme);
  }, [storedTheme, handleSetTheme]);

  // Update theme when system preference changes and stored is 'system'
  useEffect(() => {
    if (storedTheme === 'system' && mounted) {
      const resolved = isSystemDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', resolved);
      
      window.dispatchEvent(
        new CustomEvent('theme-change', { 
          detail: { theme: resolved, storedTheme: 'system' } 
        })
      );
    }
  }, [isSystemDark, storedTheme, mounted]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  // Prevent flash during SSR
  if (!mounted) {
    return (
      <div className="invisible" suppressHydrationWarning>
        {children}
      </div>
    );
  }

  const contextValue: ThemeContextType = {
    theme: resolveTheme(storedTheme, isSystemDark),
    storedTheme,
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
    isSystemDark,
    isTransitioning,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// 🪝 HOOKS
// =============================================================================

/**
 * useTheme — Access theme context
 * 
 * @throws Error if used outside ThemeProvider
 * 
 * @example
 * const { theme, setTheme, toggleTheme } = useTheme();
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * useIsDark — Check if current theme is dark
 * 
 * @example
 * const isDark = useIsDark();
 */
export function useIsDark(): boolean {
  const { theme } = useTheme();
  return theme === 'dark';
}

/**
 * useIsLight — Check if current theme is light
 * 
 * @example
 * const isLight = useIsLight();
 */
export function useIsLight(): boolean {
  const { theme } = useTheme();
  return theme === 'light';
}

/**
 * useIsSystemTheme — Check if theme is following system preference
 * 
 * @example
 * const isSystem = useIsSystemTheme();
 */
export function useIsSystemTheme(): boolean {
  const { storedTheme } = useTheme();
  return storedTheme === 'system';
}

// =============================================================================
// 🎯 THEME TOGGLE COMPONENT
// =============================================================================

export interface ThemeToggleProps {
  /** Custom className */
  className?: string;
  
  /** Show labels (Dark/Light/Auto) */
  showLabels?: boolean;
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Variant style */
  variant?: 'button' | 'icon' | 'segmented';
}

/**
 * ThemeToggle — Pre-built theme switcher component
 * 
 * @example
 * <ThemeToggle />
 * <ThemeToggle variant="segmented" showLabels />
 */
export function ThemeToggle({
  className,
  showLabels = false,
  size = 'md',
  variant = 'icon',
}: ThemeToggleProps) {
  const { storedTheme, setTheme, theme, isSystemDark } = useTheme();
  
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };
  
  const handleToggle = () => {
    const cycle: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = cycle.indexOf(storedTheme);
    const nextIndex = (currentIndex + 1) % cycle.length;
    setTheme(cycle[nextIndex]);
  };

  // Icon button variant (default)
  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center justify-center',
          'rounded-md',
          'text-text-secondary hover:text-text-primary',
          'hover:bg-bg-overlay',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base',
          sizes[size],
          className
        )}
        aria-label={`Theme: ${storedTheme}. Click to change`}
        title={`Theme: ${storedTheme} (click to change)`}
      >
        {storedTheme === 'light' && (
          <SunIcon className="w-5 h-5" />
        )}
        {storedTheme === 'dark' && (
          <MoonIcon className="w-5 h-5" />
        )}
        {storedTheme === 'system' && (
          <MonitorIcon className="w-5 h-5" />
        )}
      </button>
    );
  }

  // Segmented control variant
  if (variant === 'segmented') {
    return (
      <div
        className={cn(
          'flex items-center gap-1',
          'p-1',
          'bg-bg-overlay',
          'rounded-md',
          className
        )}
        role="group"
        aria-label="Theme selection"
      >
        <button
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-1.5',
            'px-3 py-1.5',
            'rounded',
            'text-xs font-medium',
            'transition-colors',
            storedTheme === 'light'
              ? 'bg-bg-surface text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
          aria-pressed={storedTheme === 'light'}
        >
          <SunIcon className="w-3.5 h-3.5" />
          {showLabels && <span>Light</span>}
        </button>
        
        <button
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-1.5',
            'px-3 py-1.5',
            'rounded',
            'text-xs font-medium',
            'transition-colors',
            storedTheme === 'dark'
              ? 'bg-bg-surface text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
          aria-pressed={storedTheme === 'dark'}
        >
          <MoonIcon className="w-3.5 h-3.5" />
          {showLabels && <span>Dark</span>}
        </button>
        
        <button
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center gap-1.5',
            'px-3 py-1.5',
            'rounded',
            'text-xs font-medium',
            'transition-colors',
            storedTheme === 'system'
              ? 'bg-bg-surface text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
          aria-pressed={storedTheme === 'system'}
        >
          <MonitorIcon className="w-3.5 h-3.5" />
          {showLabels && <span>Auto</span>}
        </button>
      </div>
    );
  }

  // Button variant
  return (
    <button
      onClick={handleToggle}
      className={cn(
        'flex items-center gap-2',
        'px-3 py-1.5',
        'rounded-md',
        'bg-bg-overlay',
        'text-text-secondary hover:text-text-primary',
        'hover:bg-bg-elevated',
        'transition-colors',
        'text-sm font-medium',
        className
      )}
      aria-label={`Theme: ${storedTheme}. Click to change`}
    >
      {storedTheme === 'light' && <SunIcon className="w-4 h-4" />}
      {storedTheme === 'dark' && <MoonIcon className="w-4 h-4" />}
      {storedTheme === 'system' && <MonitorIcon className="w-4 h-4" />}
      {showLabels && (
        <span>
          {storedTheme === 'light' && 'Light'}
          {storedTheme === 'dark' && 'Dark'}
          {storedTheme === 'system' && `Auto (${isSystemDark ? 'Dark' : 'Light'})`}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// 🎨 ICONS (Inline SVG — no external dependency)
// =============================================================================

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { Theme, ThemeContextType, ThemeToggleProps };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { ThemeProvider, useTheme, ThemeToggle } from '@/lib/providers/theme';
 * 
 * // In app/layout.tsx
 * <ThemeProvider
 *   defaultTheme="system"
 *   enableSystem
 *   disableTransitionOnChange={false}
 * >
 *   {children}
 * </ThemeProvider>
 * 
 * // In Header component
 * function Header() {
 *   const { theme, setTheme, toggleTheme } = useTheme();
 *   
 *   return (
 *     <header>
 *       <ThemeToggle />
 *       <ThemeToggle variant="segmented" showLabels />
 *       <ThemeToggle size="lg" />
 *     </header>
 *   );
 * }
 * 
 * // Custom theme switcher
 * function CustomThemeSwitcher() {
 *   const { storedTheme, setTheme, isSystemDark } = useTheme();
 *   
 *   return (
 *     <div className="flex gap-2">
 *       <button
 *         onClick={() => setTheme('light')}
 *         className={storedTheme === 'light' ? 'active' : ''}
 *       >
 *         Light
 *       </button>
 *       <button
 *         onClick={() => setTheme('dark')}
 *         className={storedTheme === 'dark' ? 'active' : ''}
 *       >
 *         Dark
 *       </button>
 *       <button
 *         onClick={() => setTheme('system')}
 *         className={storedTheme === 'system' ? 'active' : ''}
 *       >
 *         Auto {isSystemDark ? '(Dark)' : '(Light)'}
 *       </button>
 *     </div>
 *   );
 * }
 * 
 * // Conditional rendering based on theme
 * function ThemedComponent() {
 *   const isDark = useIsDark();
 *   
 *   return (
 *     <div className={isDark ? 'dark-styles' : 'light-styles'}>
 *       Content
 *     </div>
 *   );
 * }
 * 
 * // Listen for theme changes
 * useEffect(() => {
 *   const handleThemeChange = (e: CustomEvent) => {
 *     console.log('Theme changed:', e.detail);
 *   };
 *   
 *   window.addEventListener('theme-change', handleThemeChange as EventListener);
 *   return () => window.removeEventListener('theme-change', handleThemeChange as EventListener);
 * }, []);
 * 
 * // SSR-safe theme check
 * function ServerSafeComponent() {
 *   const { theme } = useTheme(); // Only works in client components
 *   
 *   return <div>Current theme: {theme}</div>;
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Theme Provider Design System — wpPanel by Breach Rabbit
 * 
 * Theme Modes:
 * - dark: Force dark theme (#080808 bg)
 * - light: Force light theme (#f8f8f8 bg)
 * - system: Follow OS preference (prefers-color-scheme)
 * 
 * Storage:
 * - localStorage key: 'wppanel-theme'
 * - Values: 'dark' | 'light' | 'system'
 * - SSR-safe initialization
 * 
 * DOM Attribute:
 * - data-theme="dark" | "light" on <html>
 * - CSS variables in globals.css handle color switching
 * - No JS for actual color changes (CSS-first)
 * 
 * Transitions:
 * - Default: 200ms ease on color changes
 * - disableTransitionOnChange: Temporarily suppress during switch
 * - Prevents flash/ugly transitions during theme toggle
 * 
 * System Detection:
 * - window.matchMedia('(prefers-color-scheme: dark)')
 * - Auto-updates when OS theme changes
 * - Only applies when storedTheme === 'system'
 * 
 * Events:
 * - Custom 'theme-change' event dispatched on change
 * - Other components can listen for theme updates
 * - Event detail: { theme, storedTheme }
 * 
 * Icons:
 * - Inline SVG (no Lucide dependency for core functionality)
 * - Sun (light), Moon (dark), Monitor (system)
 * - Accessible with aria-hidden
 * 
 * Performance:
 * - No re-renders on system theme change (only DOM attribute)
 * - Mounted state prevents SSR hydration mismatch
 * - Invisible wrapper during SSR to prevent flash
 * 
 * Accessibility:
 * - aria-label on toggle buttons
 * - aria-pressed for segmented control
 * - Keyboard accessible (Tab, Enter, Space)
 * - Focus visible rings
 * 
 * Dark/Light Theme:
 * - CSS variables in globals.css
 * - data-theme attribute on <html>
 * - Automatic switching via prefers-color-scheme
 * - Manual override via ThemeProvider
 * - Persisted in localStorage
 * 
 * CSS Variables (from globals.css):
 * 
 * Dark (default):
 *   --color-bg-base:      #080808
 *   --color-bg-surface:   #101010
 *   --color-text-primary: #f0f0f0
 *   --color-accent:       #3b82f6
 * 
 * Light:
 *   --color-bg-base:      #f8f8f8
 *   --color-bg-surface:   #ffffff
 *   --color-text-primary: #111111
 *   --color-accent:       #3b82f6
 */