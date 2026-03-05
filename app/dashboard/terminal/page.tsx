'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Terminal Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Full-featured terminal with xterm.js, multiple tabs, and Socket.io
// =============================================================================

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell, PageHeader, PageContent } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';
import {
  Terminal as TerminalIcon,
  Plus,
  X,
  Copy,
  Download,
  Settings,
  Search,
  Maximize2,
  Minimize2,
  RefreshCw,
  Home,
  FolderOpen,
  Globe,
  Database,
  Server,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Activity,
  Monitor,
  Palette,
  Type,
  Expand,
  Shrink,
  Save,
  Upload,
  ClearFormat,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface TerminalTab {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  isBusy: boolean;
}

interface TerminalConfig {
  theme: 'dark' | 'light' | 'custom';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  cursorBlink: boolean;
  cursorStyle: 'block' | 'underline' | 'bar';
  scrollback: number;
  bell: boolean;
  copyOnSelect: boolean;
  quickEdit: boolean;
}

interface TerminalSession {
  id: string;
  tabId: string;
  connected: boolean;
  pid?: number;
  cwd?: string;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const DEFAULT_CONFIG: TerminalConfig = {
  theme: 'dark',
  fontSize: 14,
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  lineHeight: 1.2,
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 10000,
  bell: false,
  copyOnSelect: true,
  quickEdit: false,
};

const THEMES = {
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
};

const QUICK_PATHS = [
  { label: 'Home', path: '~', icon: Home },
  { label: 'Web Root', path: '/var/www', icon: Globe },
  { label: 'Backups', path: '/var/backups', icon: Database },
  { label: 'Logs', path: '/var/log', icon: Activity },
  { label: 'Config', path: '/etc', icon: Settings },
];

// =============================================================================
// 🏗️ TERMINAL PAGE COMPONENT
// =============================================================================

export default function TerminalPage() {
  const router = useRouter();
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const [terminalInstance, setTerminalInstance] = useState<any>(null);
  const [fitAddon, setFitAddon] = useState<any>(null);
  const [webLinksAddon, setWebLinksAddon] = useState<any>(null);
  const [searchAddon, setSearchAddon] = useState<any>(null);
  
  // State
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, TerminalSession>>({});
  const [config, setConfig] = useState<TerminalConfig>(DEFAULT_CONFIG);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickPaths, setShowQuickPaths] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  // Terminal ref for cleanup
  const terminalRef = useRef<any>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // =============================================================================
  // 🔄 INITIALIZATION
  // =============================================================================

  // Load xterm.js lazily
  useEffect(() => {
    const loadTerminal = async () => {
      try {
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');
        const { WebLinksAddon } = await import('xterm-addon-web-links');
        const { SearchAddon } = await import('xterm-addon-search');
        
        const term = new Terminal({
          theme: THEMES[config.theme],
          fontSize: config.fontSize,
          fontFamily: config.fontFamily,
          lineHeight: config.lineHeight,
          cursorBlink: config.cursorBlink,
          cursorStyle: config.cursorStyle,
          scrollback: config.scrollback,
          bell: config.bell,
          convertEol: true,
          disableStdin: false,
          allowProposedApi: true,
        });
        
        const fit = new FitAddon();
        const webLinks = new WebLinksAddon();
        const search = new SearchAddon();
        
        term.loadAddon(fit);
        term.loadAddon(webLinks);
        term.loadAddon(search);
        
        setTerminalInstance(term);
        setFitAddon(fit);
        setWebLinksAddon(webLinks);
        setSearchAddon(search);
        terminalRef.current = term;
      } catch (error) {
        console.error('Failed to load terminal:', error);
        setConnectionError('Failed to load terminal component');
      }
    };
    
    loadTerminal();
    
    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose();
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Initialize terminal in DOM
  useEffect(() => {
    if (terminalInstance && terminalContainerRef.current && !terminalRef.current?.element) {
      terminalInstance.open(terminalContainerRef.current);
      fitAddon?.fit();
      
      // Handle terminal input
      terminalInstance.onData((data: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'input', data }));
        }
      });
      
      // Handle resize
      const handleResize = () => {
        fitAddon?.fit();
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          const { cols, rows } = terminalInstance;
          socketRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // Initial fit
      setTimeout(() => fitAddon?.fit(), 100);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [terminalInstance, fitAddon]);

  // Connect to terminal WebSocket
  useEffect(() => {
    if (!terminalInstance || !activeTabId) return;
    
    const connectTerminal = () => {
      try {
        const wsUrl = `ws://${window.location.host}/api/terminal/${activeTabId}`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsConnected(true);
          setConnectionError(null);
          socketRef.current = ws;
          setSocket(ws);
          
          // Send initial size
          const { cols, rows } = terminalInstance;
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        };
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'output':
              terminalInstance.write(message.data);
              break;
            case 'session':
              setSessions(prev => ({
                ...prev,
                [activeTabId]: {
                  id: message.sessionId,
                  tabId: activeTabId,
                  connected: true,
                  pid: message.pid,
                  cwd: message.cwd,
                },
              }));
              break;
            case 'error':
              setConnectionError(message.message);
              break;
          }
        };
        
        ws.onclose = () => {
          setIsConnected(false);
          socketRef.current = null;
          setSocket(null);
        };
        
        ws.onerror = () => {
          setConnectionError('Connection failed');
        };
      } catch (error) {
        console.error('Failed to connect terminal:', error);
        setConnectionError('Failed to connect to terminal server');
      }
    };
    
    connectTerminal();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [terminalInstance, activeTabId]);

  // =============================================================================
  // 🔧 TAB MANAGEMENT
  // =============================================================================

  const createTab = useCallback((path: string = '~') => {
    const newTab: TerminalTab = {
      id: `tab-${Date.now()}`,
      name: `Terminal ${tabs.length + 1}`,
      path,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: false,
      isBusy: false,
    };
    
    setTabs(prev => [...prev.map(t => ({ ...t, isActive: false })), newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      
      // Close session
      if (sessions[tabId]?.id && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ 
          type: 'close_session', 
          sessionId: sessions[tabId].id 
        }));
      }
      
      // Activate another tab
      if (filtered.length > 0 && activeTabId === tabId) {
        setActiveTabId(filtered[filtered.length - 1].id);
      } else if (filtered.length === 0) {
        setActiveTabId(null);
      }
      
      return filtered.map((t, i, arr) => ({
        ...t,
        isActive: t.id === arr[arr.length - 1]?.id,
      }));
    });
    
    setSessions(prev => {
      const { [tabId]: _, ...rest } = prev;
      return rest;
    });
  }, [activeTabId, sessions]);

  const switchTab = useCallback((tabId: string) => {
    setTabs(prev => prev.map(t => ({ ...t, isActive: t.id === tabId })));
    setActiveTabId(tabId);
  }, []);

  const renameTab = useCallback((tabId: string, name: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, name } : t));
  }, []);

  // =============================================================================
  // 🔧 TERMINAL ACTIONS
  // =============================================================================

  const handleCopy = useCallback(() => {
    if (terminalInstance) {
      const selected = terminalInstance.getSelection();
      if (selected) {
        navigator.clipboard.writeText(selected);
      }
    }
  }, [terminalInstance]);

  const handlePaste = useCallback(async () => {
    if (terminalInstance && config.quickEdit) {
      const text = await navigator.clipboard.readText();
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'input', data: text }));
      }
    }
  }, [terminalInstance, config.quickEdit]);

  const handleClear = useCallback(() => {
    if (terminalInstance) {
      terminalInstance.clear();
    }
  }, [terminalInstance]);

  const handleReset = useCallback(() => {
    if (terminalInstance) {
      terminalInstance.reset();
    }
  }, [terminalInstance]);

  const handleDownload = useCallback(() => {
    if (terminalInstance) {
      // This would require accessing the buffer - simplified for now
      const content = 'Terminal session log';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terminal-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [terminalInstance]);

  const handleQuickPath = useCallback((path: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ 
        type: 'input', 
        data: `cd ${path}\n` 
      }));
      setShowQuickPaths(false);
    }
  }, []);

  // =============================================================================
  // 🔧 CONFIGURATION
  // =============================================================================

  const updateConfig = useCallback((updates: Partial<TerminalConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // Apply theme changes immediately
      if (updates.theme && terminalInstance) {
        terminalInstance.options.theme = THEMES[newConfig.theme];
      }
      
      // Apply font changes
      if (updates.fontSize && terminalInstance) {
        terminalInstance.options.fontSize = newConfig.fontSize;
        fitAddon?.fit();
      }
      
      if (updates.fontFamily && terminalInstance) {
        terminalInstance.options.fontFamily = newConfig.fontFamily;
      }
      
      if (updates.lineHeight && terminalInstance) {
        terminalInstance.options.lineHeight = newConfig.lineHeight;
      }
      
      if (updates.cursorBlink !== undefined && terminalInstance) {
        terminalInstance.options.cursorBlink = newConfig.cursorBlink;
      }
      
      if (updates.cursorStyle && terminalInstance) {
        terminalInstance.options.cursorStyle = newConfig.cursorStyle;
      }
      
      return newConfig;
    });
  }, [terminalInstance, fitAddon]);

  // =============================================================================
  // 🔍 SEARCH
  // =============================================================================

  const handleSearch = useCallback(() => {
    if (searchAddon && searchQuery) {
      searchAddon.findNext(searchQuery, {
        caseSensitive: false,
        wholeWord: false,
        regex: false,
      });
    }
  }, [searchAddon, searchQuery]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Terminal"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Terminal' },
        ]}
        description="Full-featured terminal with multiple sessions"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => createTab()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Tab
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickPaths(!showQuickPaths)}
              leftIcon={<FolderOpen className="w-4 h-4" />}
            >
              Quick Nav
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              leftIcon={<Settings className="w-4 h-4" />}
            >
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className={cn(
          'h-[calc(100vh-200px)]',
          isFullscreen && 'fixed inset-4 z-50 h-[calc(100vh-32px)]'
        )}>
          <Card className={cn(
            'h-full flex flex-col',
            isFullscreen && 'border-0'
          )}>
            {/* Connection Status */}
            {!isConnected && !connectionError && (
              <div className="p-3 border-b border-border bg-bg-overlay">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Connecting to terminal server...
                </div>
              </div>
            )}
            
            {connectionError && (
              <AlertBanner
                variant="error"
                title="Connection Error"
                message={connectionError}
                action={{
                  label: 'Retry',
                  onClick: () => {
                    setConnectionError(null);
                    if (activeTabId) {
                      // Reconnect logic
                    }
                  },
                }}
                dismissible
                onDismiss={() => setConnectionError(null)}
                size="sm"
              />
            )}

            {/* Terminal Tabs */}
            <div className="flex items-center gap-1 px-2 py-2 border-b border-border bg-bg-overlay overflow-x-auto">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
                    'transition-colors cursor-pointer',
                    tab.isActive
                      ? 'bg-accent text-white'
                      : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
                  )}
                  onClick={() => switchTab(tab.id)}
                >
                  <TerminalIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{tab.name}</span>
                  {tab.isBusy && (
                    <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className={cn(
                      'flex items-center justify-center',
                      'w-4 h-4 rounded',
                      'hover:bg-white/20',
                      tab.isActive ? 'text-white' : 'text-text-muted hover:text-text-primary'
                    )}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0"
                onClick={() => createTab()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Paths Dropdown */}
            {showQuickPaths && (
              <div className="absolute top-20 right-4 z-50 w-48 bg-bg-elevated border border-border rounded-md shadow-elevated p-1">
                <div className="text-xs font-medium text-text-muted px-2 py-1.5">
                  Quick Navigation
                </div>
                {QUICK_PATHS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleQuickPath(item.path)}
                      className={cn(
                        'flex items-center gap-2 w-full px-2 py-1.5',
                        'text-sm text-text-secondary',
                        'hover:bg-bg-overlay hover:text-text-primary',
                        'rounded transition-colors'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                      <span className="ml-auto text-xs text-text-muted font-mono">
                        {item.path}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
              <div className="absolute top-20 right-4 z-50 w-64 bg-bg-elevated border border-border rounded-md shadow-elevated p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-text-primary">Terminal Settings</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-text-muted hover:text-text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Theme */}
                <div className="space-y-2">
                  <label className="text-xs text-text-muted">Theme</label>
                  <div className="flex gap-1">
                    {(['dark', 'light'] as const).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => updateConfig({ theme })}
                        className={cn(
                          'flex-1 px-2 py-1.5 rounded text-xs font-medium',
                          config.theme === theme
                            ? 'bg-accent text-white'
                            : 'bg-bg-overlay text-text-secondary hover:bg-bg-elevated'
                        )}
                      >
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Font Size */}
                <div className="space-y-2">
                  <label className="text-xs text-text-muted">
                    Font Size: {config.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    value={config.fontSize}
                    onChange={(e) => updateConfig({ fontSize: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                {/* Cursor Style */}
                <div className="space-y-2">
                  <label className="text-xs text-text-muted">Cursor Style</label>
                  <Select
                    value={config.cursorStyle}
                    onValueChange={(value) => updateConfig({ cursorStyle: value as any })}
                  >
                    <Select.Item value="block">Block</Select.Item>
                    <Select.Item value="underline">Underline</Select.Item>
                    <Select.Item value="bar">Bar</Select.Item>
                  </Select>
                </div>
                
                {/* Toggles */}
                <div className="space-y-2">
                  <Toggle
                    label="Cursor Blink"
                    checked={config.cursorBlink}
                    onCheckedChange={(checked) => updateConfig({ cursorBlink: checked })}
                    size="sm"
                  />
                  <Toggle
                    label="Copy on Select"
                    checked={config.copyOnSelect}
                    onCheckedChange={(checked) => updateConfig({ copyOnSelect: checked })}
                    size="sm"
                  />
                  <Toggle
                    label="Quick Edit (Paste on right-click)"
                    checked={config.quickEdit}
                    onCheckedChange={(checked) => updateConfig({ quickEdit: checked })}
                    size="sm"
                  />
                </div>
                
                {/* Actions */}
                <div className="pt-3 border-t border-border flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => updateConfig(DEFAULT_CONFIG)}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowSettings(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            {/* Terminal Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-surface">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleCopy}
                  title="Copy selection"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setShowSearch(!showSearch)}
                  title="Search"
                >
                  <Search className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleClear}
                  title="Clear terminal"
                >
                  <ClearFormat className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleDownload}
                  title="Download log"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-text-muted">
                {sessions[activeTabId || '']?.cwd && (
                  <span className="flex items-center gap-1 font-mono">
                    <FolderOpen className="w-3 h-3" />
                    {sessions[activeTabId || ''].cwd}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Activity className={cn(
                    'w-3 h-3',
                    isConnected ? 'text-success' : 'text-error'
                  )} />
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-bg-overlay">
                <Search className="w-4 h-4 text-text-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search in terminal..."
                  className="h-8 flex-1"
                  size="sm"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSearch}
                >
                  Find
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowSearch(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Terminal Container */}
            <div
              ref={terminalContainerRef}
              className={cn(
                'flex-1 overflow-hidden',
                'bg-terminal-bg'
              )}
              style={{
                backgroundColor: THEMES[config.theme].background,
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (config.quickEdit) {
                  handlePaste();
                }
              }}
            />

            {/* Terminal Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-bg-surface text-xs text-text-muted">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" />
                  {terminalInstance ? `${terminalInstance.cols}×${terminalInstance.rows}` : '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {tabs.length} tab{tabs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono">wpPanel Terminal</span>
                <span className="text-text-secondary">v1.0</span>
              </div>
            </div>
          </Card>

          {/* Empty State */}
          {tabs.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-base/80">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mx-auto">
                  <TerminalIcon className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">
                    No Terminal Sessions
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    Open a new terminal tab to start managing your server
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => createTab()}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    New Terminal
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}