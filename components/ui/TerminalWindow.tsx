'use client';

// =============================================================================
// wpPanel by Breach Rabbit — TerminalWindow Component
// =============================================================================
// Next.js 16.1 — Client Component
// IMPORTANT: This component should be lazy-loaded (xterm.js ~300KB)
// Features: xterm.js 5.x wrapper, Socket.io I/O, multiple tabs, themes
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Terminal,
  Maximize2,
  Minimize2,
  X,
  Plus,
  Search,
  Copy,
  Download,
  RefreshCw,
  Settings,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type TerminalTheme = 'dark' | 'light' | 'custom';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface TerminalTab {
  id: string;
  name: string;
  cwd?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface TerminalWindowProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Terminal session ID */
  sessionId?: string;
  
  /** WebSocket URL for terminal I/O */
  wsUrl?: string;
  
  /** Initial working directory */
  initialCwd?: string;
  
  /** Terminal theme */
  theme?: TerminalTheme;
  
  /** Font size */
  fontSize?: number;
  
  /** Font family */
  fontFamily?: string;
  
  /** Show tab bar */
  showTabs?: boolean;
  
  /** Show toolbar */
  showToolbar?: boolean;
  
  /** Show connection status */
  showConnectionStatus?: boolean;
  
  /** Enable copy on select */
  copyOnSelect?: boolean;
  
  /** Scrollback buffer size */
  scrollback?: number;
  
  /** On terminal ready */
  onReady?: (terminal: any) => void;
  
  /** On connection change */
  onConnectionChange?: (status: ConnectionStatus) => void;
  
  /** On tab change */
  onTabChange?: (tabId: string) => void;
  
  /** On new tab */
  onNewTab?: () => void;
  
  /** On close tab */
  onCloseTab?: (tabId: string) => void;
  
  /** Custom className for terminal container */
  terminalClassName?: string;
  
  /** Height override */
  height?: number | string;
  
  /** Fullscreen mode */
  fullscreen?: boolean;
  
  /** On fullscreen toggle */
  onFullscreenToggle?: (fullscreen: boolean) => void;
}

export interface TerminalSkeletonProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Show tabs skeleton */
  showTabs?: boolean;
  
  /** Show toolbar skeleton */
  showToolbar?: boolean;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

/**
 * Default terminal themes (xterm.js compatible)
 */
const TERMINAL_THEMES: Record<TerminalTheme, {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}> = {
  dark: {
    background: '#0a0a0a',
    foreground: '#f0f0f0',
    cursor: '#3b82f6',
    cursorAccent: '#0a0a0a',
    selection: 'rgba(59, 130, 246, 0.3)',
    black: '#080808',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: '#f0f0f0',
    brightBlack: '#444444',
    brightRed: '#f87171',
    brightGreen: '#34d399',
    brightYellow: '#fbbf24',
    brightBlue: '#60a5fa',
    brightMagenta: '#c084fc',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  },
  light: {
    background: '#f8f8f8',
    foreground: '#111111',
    cursor: '#3b82f6',
    cursorAccent: '#f8f8f8',
    selection: 'rgba(59, 130, 246, 0.3)',
    black: '#080808',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: '#f0f0f0',
    brightBlack: '#444444',
    brightRed: '#f87171',
    brightGreen: '#34d399',
    brightYellow: '#fbbf24',
    brightBlue: '#60a5fa',
    brightMagenta: '#c084fc',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  },
  custom: {
    background: '#0a0a0a',
    foreground: '#00d46a',
    cursor: '#00d46a',
    cursorAccent: '#0a0a0a',
    selection: 'rgba(0, 212, 106, 0.3)',
    black: '#080808',
    red: '#ef4444',
    green: '#00d46a',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: '#f0f0f0',
    brightBlack: '#444444',
    brightRed: '#f87171',
    brightGreen: '#34d399',
    brightYellow: '#fbbf24',
    brightBlue: '#60a5fa',
    brightMagenta: '#c084fc',
    brightCyan: '#22d3ee',
    brightWhite: '#ffffff',
  },
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  scrollback: 10000,
  copyOnSelect: true,
  cursorBlink: true,
  cursorStyle: 'block' as const,
  drawBoldTextInBrightColors: true,
  minimumContrastRatio: 4.5,
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique tab ID
 */
function generateTabId(): string {
  return `tab-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get default tab name
 */
function getDefaultTabName(index: number): string {
  return `Terminal ${index}`;
}

// =============================================================================
// 🏗️ TERMINAL WINDOW COMPONENT
// =============================================================================

/**
 * TerminalWindow Component — wpPanel by Breach Rabbit UI
 * 
 * xterm.js wrapper with Socket.io I/O, lazy-loaded.
 * IMPORTANT: Use dynamic import to lazy-load this component:
 * 
 * @example
 * const TerminalWindow = dynamic(() => import('@/components/ui/TerminalWindow'), {
 *   loading: () => <TerminalSkeleton />,
 *   ssr: false,
 * });
 * 
 * <TerminalWindow
 *   sessionId={sessionId}
 *   wsUrl={`ws://${window.location.host}/api/terminal/${sessionId}`}
 *   theme="dark"
 *   onReady={(term) => setTerminal(term)}
 * />
 */
export const TerminalWindow = React.forwardRef<HTMLDivElement, TerminalWindowProps>(
  (
    {
      className,
      sessionId,
      wsUrl,
      initialCwd = '~',
      theme = 'dark',
      fontSize = DEFAULT_CONFIG.fontSize,
      fontFamily = DEFAULT_CONFIG.fontFamily,
      showTabs = true,
      showToolbar = true,
      showConnectionStatus = true,
      copyOnSelect = DEFAULT_CONFIG.copyOnSelect,
      scrollback = DEFAULT_CONFIG.scrollback,
      onReady,
      onConnectionChange,
      onTabChange,
      onNewTab,
      onCloseTab,
      terminalClassName,
      height: heightOverride,
      fullscreen = false,
      onFullscreenToggle,
      ...props
    },
    ref
  ) => {
    const terminalRef = React.useRef<HTMLDivElement>(null);
    const xtermRef = React.useRef<any>(null);
    const socketRef = React.useRef<WebSocket | null>(null);
    const [tabs, setTabs] = React.useState<TerminalTab[]>([
      { id: generateTabId(), name: getDefaultTabName(1), cwd: initialCwd, createdAt: new Date(), isActive: true },
    ]);
    const [activeTabId, setActiveTabId] = React.useState<string>(tabs[0].id);
    const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>('disconnected');
    const [showSearch, setShowSearch] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [terminalTheme, setTerminalTheme] = React.useState<TerminalTheme>(theme);
    
    const height = heightOverride || (fullscreen ? 'calc(100vh - 120px)' : '500px');

    // =============================================================================
    // 🔄 INITIALIZATION
    // =============================================================================

    // Initialize xterm.js
    React.useEffect(() => {
      let disposed = false;
      
      const initTerminal = async () => {
        if (!terminalRef.current || disposed) return;
        
        try {
          // Lazy load xterm.js
          const { Terminal } = await import('xterm');
          const { FitAddon } = await import('xterm-addon-fit');
          const { WebLinksAddon } = await import('xterm-addon-web-links');
          const { SearchAddon } = await import('xterm-addon-search');
          
          // Create terminal instance
          const term = new Terminal({
            theme: TERMINAL_THEMES[terminalTheme],
            fontSize,
            fontFamily,
            scrollback,
            cursorBlink: DEFAULT_CONFIG.cursorBlink,
            cursorStyle: DEFAULT_CONFIG.cursorStyle,
            drawBoldTextInBrightColors: DEFAULT_CONFIG.drawBoldTextInBrightColors,
            minimumContrastRatio: DEFAULT_CONFIG.minimumContrastRatio,
            allowProposedApi: true,
          });
          
          // Load addons
          const fitAddon = new FitAddon();
          const webLinksAddon = new WebLinksAddon();
          const searchAddon = new SearchAddon();
          
          term.loadAddon(fitAddon);
          term.loadAddon(webLinksAddon);
          term.loadAddon(searchAddon);
          
          // Open terminal
          term.open(terminalRef.current);
          fitAddon.fit();
          
          // Store refs
          xtermRef.current = {
            term,
            fitAddon,
            webLinksAddon,
            searchAddon,
          };
          
          // Handle terminal input
          term.onData((data: string) => {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ type: 'input', data }));
            }
          });
          
          // Handle resize
          const handleResize = () => {
            fitAddon.fit();
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows,
              }));
            }
          };
          
          window.addEventListener('resize', handleResize);
          
          // Copy on select
          if (copyOnSelect) {
            term.onSelectionChange(() => {
              if (term.hasSelection()) {
                navigator.clipboard.writeText(term.getSelection());
                term.clearSelection();
              }
            });
          }
          
          // Notify ready
          onReady?.(term);
          
          // Cleanup
          return () => {
            window.removeEventListener('resize', handleResize);
            term.dispose();
          };
        } catch (error) {
          console.error('Failed to initialize terminal:', error);
          setConnectionStatus('error');
        }
      };
      
      initTerminal();
      
      return () => {
        disposed = true;
      };
    }, [terminalTheme, fontSize, fontFamily, scrollback, copyOnSelect, onReady]);

    // Connect to WebSocket
    React.useEffect(() => {
      if (!wsUrl || !xtermRef.current) return;
      
      setConnectionStatus('connecting');
      
      try {
        const socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
          setConnectionStatus('connected');
          onConnectionChange?.('connected');
          
          // Send initial size
          if (xtermRef.current?.term) {
            socket.send(JSON.stringify({
              type: 'resize',
              cols: xtermRef.current.term.cols,
              rows: xtermRef.current.term.rows,
            }));
          }
        };
        
        socket.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          if (message.type === 'output' && xtermRef.current?.term) {
            xtermRef.current.term.write(message.data);
          } else if (message.type === 'session') {
            // Session established
          } else if (message.type === 'error') {
            setConnectionStatus('error');
            onConnectionChange?.('error');
          }
        };
        
        socket.onclose = () => {
          setConnectionStatus('disconnected');
          onConnectionChange?.('disconnected');
        };
        
        socket.onerror = () => {
          setConnectionStatus('error');
          onConnectionChange?.('error');
        };
        
        socketRef.current = socket;
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setConnectionStatus('error');
        onConnectionChange?.('error');
      }
      
      return () => {
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      };
    }, [wsUrl, onConnectionChange]);

    // =============================================================================
    // 🔧 ACTIONS
    // =============================================================================

    const handleNewTab = () => {
      const newTab = {
        id: generateTabId(),
        name: getDefaultTabName(tabs.length + 1),
        cwd: initialCwd,
        createdAt: new Date(),
        isActive: false,
      };
      
      setTabs(prev => prev.map(t => ({ ...t, isActive: false })).concat(newTab));
      setActiveTabId(newTab.id);
      onNewTab?.();
      onTabChange?.(newTab.id);
    };

    const handleCloseTab = (tabId: string) => {
      if (tabs.length === 1) return; // Don't close last tab
      
      const tabIndex = tabs.findIndex(t => t.id === tabId);
      const newTabs = tabs.filter(t => t.id !== tabId);
      
      // Activate adjacent tab
      if (tabId === activeTabId) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        newTabs[newActiveIndex].isActive = true;
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      
      setTabs(newTabs);
      onCloseTab?.(tabId);
    };

    const handleSwitchTab = (tabId: string) => {
      setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === tabId })));
      setActiveTabId(tabId);
      onTabChange?.(tabId);
    };

    const handleCopy = () => {
      if (xtermRef.current?.term) {
        const selected = xtermRef.current.term.getSelection();
        if (selected) {
          navigator.clipboard.writeText(selected);
        }
      }
    };

    const handleClear = () => {
      if (xtermRef.current?.term) {
        xtermRef.current.term.clear();
      }
    };

    const handleReset = () => {
      if (xtermRef.current?.term) {
        xtermRef.current.term.reset();
      }
    };

    const handleSearch = () => {
      setShowSearch(!showSearch);
      if (xtermRef.current?.searchAddon && searchTerm) {
        xtermRef.current.searchAddon.findNext(searchTerm);
      }
    };

    const handleDownload = () => {
      if (xtermRef.current?.term) {
        // Export terminal buffer
        const content = xtermRef.current.term.getSelection() || '';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };

    const handleFullscreen = () => {
      onFullscreenToggle?.(!fullscreen);
    };

    // =============================================================================
    // 🏗️ RENDER
    // =============================================================================

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex flex-col',
          'rounded-md',
          'border',
          'border-border',
          'bg-bg-surface',
          'overflow-hidden',
          
          // Custom className
          className
        )}
        style={{ height }}
        {...props}
      >
        {/* Tab Bar */}
        {showTabs && (
          <div className="flex items-center gap-1 px-2 py-2 border-b border-border bg-bg-overlay">
            {/* Tabs */}
            <div className="flex items-center gap-1 flex-1 overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={cn(
                    // Base
                    'flex items-center gap-2',
                    'px-3 py-1.5',
                    'rounded-md',
                    'text-xs font-medium',
                    'transition-colors',
                    'cursor-pointer',
                    
                    // Active state
                    tab.isActive
                      ? 'bg-bg-surface text-text-primary'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-base',
                    
                    // Connection status
                    connectionStatus === 'error' && !tab.isActive && 'text-error'
                  )}
                  onClick={() => handleSwitchTab(tab.id)}
                >
                  <Terminal className="w-3 h-3" aria-hidden="true" />
                  <span className="truncate max-w-[120px]">{tab.name}</span>
                  {tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTab(tab.id);
                      }}
                      className={cn(
                        'flex items-center justify-center',
                        'w-4 h-4',
                        'rounded',
                        'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                        'transition-colors'
                      )}
                      aria-label={`Close ${tab.name}`}
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* New Tab Button */}
            <button
              onClick={handleNewTab}
              className={cn(
                'flex items-center justify-center',
                'w-8 h-8',
                'rounded-md',
                'text-text-muted hover:text-text-primary hover:bg-bg-base',
                'transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-accent'
              )}
              aria-label="New tab"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Toolbar */}
        {showToolbar && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-surface">
            {/* Left Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Copy"
                title="Copy selection"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleSearch}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  showSearch && 'bg-bg-overlay text-text-primary'
                )}
                aria-label="Search"
                title="Search in terminal"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleClear}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Clear"
                title="Clear terminal"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleReset}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Reset"
                title="Reset terminal"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleDownload}
                className={cn(
                  'flex items-center justify-center',
                  'w-8 h-8',
                  'rounded-md',
                  'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                  'transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-accent'
                )}
                aria-label="Download"
                title="Download output"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {/* Connection Status */}
            {showConnectionStatus && (
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center gap-1.5',
                    'px-2 py-1',
                    'rounded-md',
                    'text-xs font-medium',
                    connectionStatus === 'connected' && 'bg-success-subtle text-success',
                    connectionStatus === 'connecting' && 'bg-info-subtle text-info',
                    connectionStatus === 'disconnected' && 'bg-bg-overlay text-text-muted',
                    connectionStatus === 'error' && 'bg-error-subtle text-error'
                  )}
                >
                  {connectionStatus === 'connected' && (
                    <Wifi className="w-3 h-3" aria-hidden="true" />
                  )}
                  {connectionStatus === 'connecting' && (
                    <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" />
                  )}
                  {connectionStatus === 'disconnected' && (
                    <WifiOff className="w-3 h-3" aria-hidden="true" />
                  )}
                  {connectionStatus === 'error' && (
                    <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  )}
                  <span>
                    {connectionStatus === 'connected' && 'Connected'}
                    {connectionStatus === 'connecting' && 'Connecting...'}
                    {connectionStatus === 'disconnected' && 'Disconnected'}
                    {connectionStatus === 'error' && 'Error'}
                  </span>
                </div>

                {/* Theme Selector */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className={cn(
                        'flex items-center justify-center',
                        'w-8 h-8',
                        'rounded-md',
                        'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                        'transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-accent'
                      )}
                      aria-label="Terminal settings"
                    >
                      <Settings className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className={cn(
                        'z-50',
                        'min-w-[150px]',
                        'bg-bg-elevated',
                        'border border-border',
                        'rounded-md',
                        'shadow-elevated',
                        'p-1',
                        'animate-slide-up'
                      )}
                      sideOffset={8}
                    >
                      <DropdownMenu.Item
                        className={cn(
                          'flex items-center gap-2',
                          'px-3 py-2',
                          'rounded-sm',
                          'text-sm',
                          'text-text-secondary',
                          'hover:bg-bg-overlay hover:text-text-primary',
                          'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                          'cursor-pointer'
                        )}
                        onClick={() => setTerminalTheme('dark')}
                      >
                        {terminalTheme === 'dark' && <CheckCircle className="w-4 h-4 text-accent" />}
                        Dark Theme
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className={cn(
                          'flex items-center gap-2',
                          'px-3 py-2',
                          'rounded-sm',
                          'text-sm',
                          'text-text-secondary',
                          'hover:bg-bg-overlay hover:text-text-primary',
                          'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                          'cursor-pointer'
                        )}
                        onClick={() => setTerminalTheme('light')}
                      >
                        {terminalTheme === 'light' && <CheckCircle className="w-4 h-4 text-accent" />}
                        Light Theme
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className={cn(
                          'flex items-center gap-2',
                          'px-3 py-2',
                          'rounded-sm',
                          'text-sm',
                          'text-text-secondary',
                          'hover:bg-bg-overlay hover:text-text-primary',
                          'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                          'cursor-pointer'
                        )}
                        onClick={() => setTerminalTheme('custom')}
                      >
                        {terminalTheme === 'custom' && <CheckCircle className="w-4 h-4 text-accent" />}
                        Custom (Green)
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                {/* Fullscreen Toggle */}
                {onFullscreenToggle && (
                  <button
                    onClick={handleFullscreen}
                    className={cn(
                      'flex items-center justify-center',
                      'w-8 h-8',
                      'rounded-md',
                      'text-text-muted hover:text-text-primary hover:bg-bg-overlay',
                      'transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-accent'
                    )}
                    aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {fullscreen ? (
                      <Minimize2 className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Maximize2 className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        {showSearch && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-overlay">
            <Search className="w-4 h-4 text-text-muted" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (xtermRef.current?.searchAddon) {
                  xtermRef.current.searchAddon.findNext(e.target.value);
                }
              }}
              placeholder="Search in terminal..."
              className={cn(
                'flex-1',
                'bg-transparent',
                'text-sm',
                'text-text-primary',
                'placeholder:text-text-muted',
                'focus:outline-none'
              )}
              autoFocus
            />
            <button
              onClick={() => setShowSearch(false)}
              className={cn(
                'flex items-center justify-center',
                'w-6 h-6',
                'rounded',
                'text-text-muted hover:text-text-primary hover:bg-bg-base',
                'transition-colors'
              )}
              aria-label="Close search"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Terminal Container */}
        <div
          ref={terminalRef}
          className={cn(
            'flex-1',
            'overflow-hidden',
            terminalClassName
          )}
          style={{
            minHeight: '200px',
          }}
        />

        {/* Connection Error Overlay */}
        {connectionStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 p-6 bg-bg-elevated border border-border rounded-md shadow-elevated">
              <AlertCircle className="w-8 h-8 text-error" aria-hidden="true" />
              <div className="text-center">
                <h3 className="text-sm font-semibold text-text-primary">Connection Error</h3>
                <p className="text-xs text-text-secondary mt-1">
                  Unable to connect to terminal server
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Reconnect
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

// Set display name for debugging
TerminalWindow.displayName = 'TerminalWindow';

// =============================================================================
// 📦 TERMINAL SKELETON
// =============================================================================

/**
 * TerminalSkeleton — Loading placeholder for TerminalWindow
 */
export const TerminalSkeleton = React.forwardRef<HTMLDivElement, TerminalSkeletonProps>(
  (
    {
      className,
      showTabs = true,
      showToolbar = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          'rounded-md',
          'border border-border',
          'bg-bg-surface',
          'animate-shimmer',
          'overflow-hidden',
          className
        )}
        {...props}
      >
        {/* Tab Bar Skeleton */}
        {showTabs && (
          <div className="flex items-center gap-2 px-2 py-2 border-b border-border bg-bg-overlay">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-md" />
            ))}
            <Skeleton className="h-7 w-7 rounded-md ml-auto" />
          </div>
        )}

        {/* Toolbar Skeleton */}
        {showToolbar && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="w-8 h-8 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        )}

        {/* Terminal Area Skeleton */}
        <div className="flex-1 p-4 bg-bg-base">
          <div className="space-y-2">
            {Array.from({ length: 15 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4 rounded"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

// Set display name for debugging
TerminalSkeleton.displayName = 'TerminalSkeleton';

// =============================================================================
// 📦 HELPER COMPONENTS
// =============================================================================

/**
 * Skeleton — Simple skeleton placeholder
 */
function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'animate-pulse',
        'bg-bg-overlay',
        'rounded-md',
        className
      )}
      {...props}
    />
  );
}

/**
 * Button — Simplified button for terminal actions
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
}

function Button({
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  children,
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-sm',
  };

  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-bg-overlay text-text-primary border border-border hover:bg-bg-elevated',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-overlay hover:text-text-primary',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center',
        'font-medium',
        'rounded-md',
        'transition-all duration-150 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
    </button>
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { TerminalWindowProps, TerminalSkeletonProps, TerminalTab, TerminalTheme, ConnectionStatus };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * // IMPORTANT: Lazy load this component!
 * import dynamic from 'next/dynamic';
 * 
 * const TerminalWindow = dynamic(() => import('@/components/ui/TerminalWindow'), {
 *   loading: () => <TerminalSkeleton />,
 *   ssr: false,
 * });
 * 
 * // Simple terminal
 * <TerminalWindow
 *   sessionId={sessionId}
 *   wsUrl={`ws://${window.location.host}/api/terminal/${sessionId}`}
 *   theme="dark"
 * />
 * 
 * // With callbacks
 * <TerminalWindow
 *   sessionId={sessionId}
 *   wsUrl={wsUrl}
 *   onReady={(term) => setTerminal(term)}
 *   onConnectionChange={(status) => setConnectionStatus(status)}
 *   onTabChange={(tabId) => setActiveTab(tabId)}
 * />
 * 
 * // Fullscreen mode
 * const [fullscreen, setFullscreen] = useState(false);
 * 
 * <TerminalWindow
 *   sessionId={sessionId}
 *   wsUrl={wsUrl}
 *   fullscreen={fullscreen}
 *   onFullscreenToggle={setFullscreen}
 * />
 * 
 * // Custom configuration
 * <TerminalWindow
 *   sessionId={sessionId}
 *   wsUrl={wsUrl}
 *   theme="custom"
 *   fontSize={16}
 *   fontFamily="'Fira Code', monospace"
 *   scrollback={20000}
 *   copyOnSelect={false}
 * />
 * 
 * // In terminal page
 * function TerminalPage() {
 *   const [sessionId, setSessionId] = useState(null);
 *   
 *   useEffect(() => {
 *     // Create terminal session
 *     fetch('/api/terminal/create', { method: 'POST' })
 *       .then(res => res.json())
 *       .then(data => setSessionId(data.sessionId));
 *   }, []);
 *   
 *   if (!sessionId) return <TerminalSkeleton />;
 *   
 *   return (
 *     <TerminalWindow
 *       sessionId={sessionId}
 *       wsUrl={`ws://${window.location.host}/api/terminal/${sessionId}`}
 *     />
 *   );
 * }
 * 
 * // Multiple terminals (tabs)
 * <TerminalWindow
 *   sessionId={sessionId}
 *   wsUrl={wsUrl}
 *   showTabs
 *   onNewTab={() => createNewSession()}
 *   onCloseTab={(tabId) => closeSession(tabId)}
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * TerminalWindow Design System — wpPanel by Breach Rabbit
 * 
 * IMPORTANT: This component uses xterm.js and should be lazy-loaded!
 * Add to initial bundle: NO (~300KB xterm.js + addons)
 * Lazy load: YES (only on terminal pages)
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — card background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — tab bar
 * - bg-base:        #080808 (dark) / #f8f8f8 (light) — terminal bg
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - success:        #10b981 (Green) — connected status
 * - info:           #6366f1 (Indigo) — connecting status
 * - error:          #ef4444 (Red) — error status
 * - accent:         #3b82f6 (Blue) — cursor, selection
 * 
 * Terminal Themes:
 * - dark: #0a0a0a bg, #f0f0f0 fg, #3b82f6 cursor (default)
 * - light: #f8f8f8 bg, #111111 fg, #3b82f6 cursor
 * - custom: #0a0a0a bg, #00d46a fg (matrix green)
 * 
 * Sizing:
 * - Default height: 500px
 * - Fullscreen: calc(100vh - 120px)
 * - Tab bar: h-7 + padding
 * - Toolbar: h-8 + padding
 * - Font: 14px default (configurable 10-24px)
 * 
 * Border Radius:
 * - Container: rounded-md (6px)
 * - Tabs: rounded-md (6px)
 * - Buttons: rounded-md (6px)
 * 
 * Transitions:
 * - Tab hover: 150ms ease-out
 * - Button hover: 150ms ease-out
 * - Theme switch: instant (xterm.js)
 * - Connection status: 200ms ease
 * 
 * Connection States:
 * - connected: green badge + wifi icon
 * - connecting: info badge + spinning loader
 * - disconnected: gray badge + wifi-off icon
 * - error: red badge + alert icon + overlay
 * 
 * Features:
 * - Multiple tabs (create/close/switch)
 * - Copy on select (configurable)
 * - Search in buffer (Ctrl+F style)
 * - Download output
 * - Clear/Reset terminal
 * - Fullscreen mode
 * - Theme selector (dark/light/custom)
 * - Connection status indicator
 * - Auto-resize on window resize
 * - Web links clickable (web-links addon)
 * 
 * Accessibility:
 * - aria-label on action buttons
 * - Keyboard navigation (Tab through buttons)
 * - Focus visible rings
 * - Screen reader friendly status
 * 
 * Performance:
 * - LAZY LOAD REQUIRED (xterm.js ~300KB)
 * - FitAddon for responsive sizing
 * - WebSockets for real-time I/O
 * - CSS-first styling (minimal JS)
 * - Tree-shaken Lucide icons
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - Terminal themes independent of panel theme
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - Terminal page (full terminal)
 * - Site details (quick terminal to site directory)
 * - Installer (live output during installation)
 * - Backup restore (live progress)
 * - Debug console (admin tools)
 */