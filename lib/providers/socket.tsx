'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Socket.io Provider
// =============================================================================
// Next.js 16.1 — Client Component
// Socket.io client for real-time features: terminal, logs, metrics, installer
// Features: Auto-reconnect, connection state, event typing, toast integration
// =============================================================================

import * as React from 'react';
import { useEffect, useState, useCallback, createContext, useContext, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/Toast';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface SocketContextType {
  /** Socket.io instance */
  socket: Socket | null;
  
  /** Connection status */
  isConnected: boolean;
  
  /** Connection error (if any) */
  error: Error | null;
  
  /** Is currently attempting to reconnect */
  isReconnecting: boolean;
  
  /** Connection attempts count */
  attemptCount: number;
  
  /** Manually connect */
  connect: () => void;
  
  /** Manually disconnect */
  disconnect: () => void;
  
  /** Emit event to server */
  emit: <T = any>(event: string, data?: T) => void;
  
  /** Subscribe to event */
  on: <T = any>(event: string, callback: (data: T) => void) => void;
  
  /** Unsubscribe from event */
  off: (event: string, callback?: (...args: any[]) => void) => void;
  
  /** Join a room */
  joinRoom: (room: string) => void;
  
  /** Leave a room */
  leaveRoom: (room: string) => void;
}

export interface SocketProviderProps {
  children: React.ReactNode;
  
  /** Socket.io server URL */
  url?: string;
  
  /** Auto-connect on mount */
  autoConnect?: boolean;
  
  /** Enable reconnection */
  reconnection?: boolean;
  
  /** Maximum reconnection attempts */
  reconnectionAttempts?: number;
  
  /** Delay between reconnection attempts */
  reconnectionDelay?: number;
  
  /** Connection timeout */
  timeout?: number;
  
  /** Show toast on connection errors */
  showErrors?: boolean;
}

export interface SocketEventMap {
  // Terminal events
  'terminal:output': { data: string };
  'terminal:error': { message: string };
  'terminal:ready': { sessionId: string; cwd: string; pid?: number; reconnected: boolean };
  'terminal:exit': { code: number };
  
  // Log streaming events
  'log:data': { type: 'historical' | 'live';  string };
  'log:error': { message: string };
  'log:ready': { streamId: string; type: string; path: string };
  'log:stopped': { streamId: string };
  
  // Metrics events
  'metrics:data': {
    type: 'server' | 'site';
    siteId?: string;
    cpu?: number;
    ram?: number;
    load?: number[];
    timestamp: number;
    [key: string]: any;
  };
  'metrics:error': { message: string };
  'metrics:ready': { sessionId: string; type: string };
  'metrics:unsubscribed': { sessionId: string };
  
  // Installer events
  'installer:progress': {
    step: number;
    progress: number;
    currentStep: string;
    output?: string;
    estimatedTime?: number;
  };
  'installer:complete': { success: boolean; redirectUrl?: string };
  'installer:error': { message: string };
  'installer:ready': { sessionId: string; installerId: string };
  
  // Backup events
  'backup:progress': {
    progress: number;
    currentFile?: string;
    transferredBytes?: number;
    estimatedTimeRemaining?: number;
  };
  'backup:complete': { success: boolean; backupId?: string };
  'backup:error': { message: string };
  'backup:ready': { sessionId: string; backupId: string };
  
  // System events
  'system:update': { version: string; changelog?: string };
  'system:alert': { type: 'warning' | 'error' | 'info'; message: string };
  
  // Connection events
  'connect': void;
  'disconnect': (reason: string) => void;
  'connect_error': (error: Error) => void;
  'reconnect': (attemptNumber: number) => void;
  'reconnect_error': (error: Error) => void;
}

// =============================================================================
// 📦 CONTEXT
// =============================================================================

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// =============================================================================
// ⚙️ DEFAULT CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: Partial<SocketProviderProps> = {
  url: process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  timeout: 20000,
  showErrors: true,
};

// =============================================================================
// 🏗️ SOCKET PROVIDER COMPONENT
// =============================================================================

/**
 * SocketProvider — Socket.io Client Provider for wpPanel
 * 
 * Provides real-time WebSocket connection for:
 * - Terminal sessions (node-pty → xterm.js)
 * - Log streaming (live tail)
 * - Metrics push (server stats)
 * - Installer progress (setup steps)
 * - Backup progress (Restic)
 * 
 * @example
 * // In app/layout.tsx
 * <SocketProvider>
 *   {children}
 * </SocketProvider>
 * 
 * // In components
 * const { socket, isConnected, emit, on } = useSocket();
 * 
 * // Subscribe to metrics
 * useEffect(() => {
 *   on('metrics:data', (data) => {
 *     updateChart(data);
 *   });
 *   
 *   return () => off('metrics:data');
 * }, [on, off]);
 * 
 * // Emit event
 * emit('metrics:subscribe', { type: 'server' });
 */
export function SocketProvider({
  children,
  url = DEFAULT_CONFIG.url,
  autoConnect = DEFAULT_CONFIG.autoConnect,
  reconnection = DEFAULT_CONFIG.reconnection,
  reconnectionAttempts = DEFAULT_CONFIG.reconnectionAttempts,
  reconnectionDelay = DEFAULT_CONFIG.reconnectionDelay,
  timeout = DEFAULT_CONFIG.timeout,
  showErrors = DEFAULT_CONFIG.showErrors,
}: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  
  const { error: toastError } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const eventListenersRef = useRef<Map<string, Set<(...args: any[]) => void>>>(new Map());

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect || typeof window === 'undefined') {
      return;
    }

    const newSocket = io(url, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      timeout,
      autoConnect: false, // We'll connect manually
      forceNew: false,
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      setAttemptCount(0);
      console.log('[Socket] Connected');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('[Socket] Disconnected:', reason);
      
      if (showErrors && reason === 'io server disconnect') {
        toastError({
          title: 'Connection Lost',
          message: 'Reconnecting to server...',
          duration: 3000,
        });
      }
    });

    newSocket.on('connect_error', (err) => {
      setError(err);
      console.error('[Socket] Connection error:', err);
      
      if (showErrors) {
        toastError({
          title: 'Connection Error',
          message: err.message || 'Failed to connect to server',
          duration: 5000,
        });
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      setIsReconnecting(false);
      setAttemptCount(attemptNumber);
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      
      if (showErrors && attemptNumber > 1) {
        toastError({
          title: 'Reconnected',
          message: `Successfully reconnected after ${attemptNumber} attempts`,
          duration: 3000,
        });
      }
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      setIsReconnecting(true);
      setAttemptCount(attemptNumber);
      console.log('[Socket] Reconnection attempt', attemptNumber);
    });

    newSocket.on('reconnect_error', (err) => {
      console.error('[Socket] Reconnection error:', err);
    });

    newSocket.on('reconnect_failed', () => {
      setIsReconnecting(false);
      console.error('[Socket] Reconnection failed');
      
      if (showErrors) {
        toastError({
          title: 'Connection Failed',
          message: 'Unable to reconnect to server. Please refresh the page.',
          duration: 10000,
        });
      }
    });

    // Store socket instance
    socketRef.current = newSocket;
    setSocket(newSocket);

    // Auto-connect
    if (autoConnect) {
      newSocket.connect();
    }

    // Cleanup on unmount
    return () => {
      // Remove all event listeners
      eventListenersRef.current.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          newSocket.off(event, callback);
        });
      });
      eventListenersRef.current.clear();
      
      // Disconnect socket
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [url, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay, timeout, showErrors, toastError]);

  // =============================================================================
  // 🔧 METHODS
  // =============================================================================

  const connect = useCallback(() => {
    if (socketRef.current && !isConnected) {
      socketRef.current.connect();
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const emit = useCallback(<T = any>(event: string, data?: T) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('[Socket] Cannot emit event - not connected:', event);
    }
  }, [isConnected]);

  const on = useCallback(<T = any>(event: string, callback: (data: T) => void) => {
    if (!socketRef.current) return;

    // Store listener for cleanup
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, new Set());
    }
    eventListenersRef.current.get(event)!.add(callback);

    // Register with socket
    socketRef.current.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (!socketRef.current) return;

    if (callback) {
      // Remove specific listener
      socketRef.current.off(event, callback);
      eventListenersRef.current.get(event)?.delete(callback);
    } else {
      // Remove all listeners for event
      const callbacks = eventListenersRef.current.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => {
          socketRef.current!.off(event, cb);
        });
        eventListenersRef.current.delete(event);
      }
    }
  }, []);

  const joinRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_room', room);
    }
  }, [isConnected]);

  const leaveRoom = useCallback((room: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_room', room);
    }
  }, [isConnected]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    error,
    isReconnecting,
    attemptCount,
    connect,
    disconnect,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
      
      {/* Connection Status Indicator (optional, can be rendered in UI) */}
      {!isConnected && autoConnect && (
        <div
          className="fixed bottom-4 right-4 z-[9999] px-3 py-2 bg-warning text-text-inverse text-xs font-medium rounded-md shadow-lg"
          role="status"
          aria-live="polite"
        >
          {isReconnecting ? `Reconnecting... (${attemptCount})` : 'Connecting...'}
        </div>
      )}
    </SocketContext.Provider>
  );
}

// =============================================================================
// 🪝 HOOKS
// =============================================================================

/**
 * useSocket — Access socket context
 * 
 * @throws Error if used outside SocketProvider
 * 
 * @example
 * const { socket, isConnected, emit, on } = useSocket();
 */
export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}

/**
 * useSocketEvent — Subscribe to socket event with automatic cleanup
 * 
 * @example
 * useSocketEvent('metrics:data', (data) => {
 *   updateChart(data);
 * });
 */
export function useSocketEvent<T = any>(
  event: string,
  callback: (data: T) => void,
  dependencies: React.DependencyList = []
) {
  const { on, off } = useSocket();

  useEffect(() => {
    on(event, callback);
    return () => {
      off(event, callback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, on, off, ...dependencies]);
}

/**
 * useSocketRoom — Join/leave socket room with automatic cleanup
 * 
 * @example
 * useSocketRoom(`backup:${backupId}`);
 */
export function useSocketRoom(room: string) {
  const { joinRoom, leaveRoom, isConnected } = useSocket();

  useEffect(() => {
    if (isConnected && room) {
      joinRoom(room);
      return () => {
        leaveRoom(room);
      };
    }
  }, [room, isConnected, joinRoom, leaveRoom]);
}

/**
 * useSocketConnection — Monitor connection state
 * 
 * @example
 * const { isConnected, isReconnecting, attemptCount } = useSocketConnection();
 */
export function useSocketConnection() {
  const { isConnected, isReconnecting, attemptCount, error } = useSocket();

  return {
    isConnected,
    isReconnecting,
    attemptCount,
    hasError: error !== null,
    error,
  };
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { SocketContextType, SocketProviderProps, SocketEventMap };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { SocketProvider, useSocket, useSocketEvent } from '@/lib/providers/socket';
 * 
 * // In app/layout.tsx
 * <SocketProvider>
 *   {children}
 * </SocketProvider>
 * 
 * // In components
 * function MetricsChart() {
 *   const { emit, isConnected } = useSocket();
 *   const [metrics, setMetrics] = useState(null);
 *   
 *   // Subscribe to metrics
 *   useSocketEvent('metrics:data', (data) => {
 *     setMetrics(data);
 *   });
 *   
 *   // Subscribe on mount
 *   useEffect(() => {
 *     if (isConnected) {
 *       emit('metrics:subscribe', { type: 'server' });
 *     }
 *     
 *     return () => {
 *       emit('metrics:unsubscribe');
 *     };
 *   }, [isConnected, emit]);
 *   
 *   return <Chart  data={metrics} />;
 * }
 * 
 * // Terminal component
 * function TerminalWindow({ siteId }: { siteId: string }) {
 *   const { emit, on, off, isConnected } = useSocket();
 *   const terminalRef = useRef(null);
 *   
 *   useEffect(() => {
 *     if (!isConnected) return;
 *     
 *     // Create terminal session
 *     emit('terminal:join', { cwd: `/var/www/${siteId}` });
 *     
 *     // Listen for output
 *     on('terminal:output', ({ data }) => {
 *       terminalRef.current?.write(data);
 *     });
 *     
 *     on('terminal:ready', ({ sessionId, cwd }) => {
 *       console.log('Terminal ready:', sessionId, cwd);
 *     });
 *     
 *     return () => {
 *       off('terminal:output');
 *       off('terminal:ready');
 *       emit('terminal:close', { sessionId });
 *     };
 *   }, [isConnected, emit, on, off, siteId]);
 *   
 *   return <div ref={terminalRef} />;
 * }
 * 
 * // Installer progress
 * function InstallerProgress({ installerId }: { installerId: string }) {
 *   const [progress, setProgress] = useState(0);
 *   const [currentStep, setCurrentStep] = useState('');
 *   
 *   useSocketEvent('installer:progress', ({ step, progress, currentStep }) => {
 *     setProgress(progress);
 *     setCurrentStep(currentStep);
 *   });
 *   
 *   useSocketEvent('installer:complete', ({ success, redirectUrl }) => {
 *     if (success && redirectUrl) {
 *       router.push(redirectUrl);
 *     }
 *   });
 *   
 *   return (
 *     <div>
 *       <ProgressBar value={progress} />
 *       <p>{currentStep}</p>
 *     </div>
 *   );
 * }
 * 
 * // Log streaming
 * function LogViewer({ type, siteId }: { type: string; siteId?: string }) {
 *   const { emit, isConnected } = useSocket();
 *   const [logs, setLogs] = useState<string[]>([]);
 *   
 *   useSocketEvent('log:data', ({ type: dataType, data }) => {
 *     if (dataType === 'historical') {
 *       setLogs(data.split('\n'));
 *     } else {
 *       setLogs(prev => [...prev.slice(-100), data]);
 *     }
 *   });
 *   
 *   useEffect(() => {
 *     if (isConnected) {
 *       emit('log:stream', { type, siteId, lines: 100 });
 *     }
 *     
 *     return () => {
 *       emit('log:stop');
 *     };
 *   }, [isConnected, emit, type, siteId]);
 *   
 *   return (
 *     <div className="terminal">
 *       {logs.map((log, i) => <div key={i}>{log}</div>)}
 *     </div>
 *   );
 * }
 * 
 * // Backup progress with room
 * function BackupProgress({ backupId }: { backupId: string }) {
 *   const [progress, setProgress] = useState(0);
 *   
 *   // Auto-join backup room
 *   useSocketRoom(`backup:${backupId}`);
 *   
 *   useSocketEvent('backup:progress', ({ progress, currentFile, estimatedTimeRemaining }) => {
 *     setProgress(progress);
 *   });
 *   
 *   return <ProgressBar value={progress} />;
 * }
 * 
 * // Connection status indicator
 * function ConnectionStatus() {
 *   const { isConnected, isReconnecting, attemptCount } = useSocketConnection();
 *   
 *   return (
 *     <div className={cn(
 *       'flex items-center gap-2 text-xs',
 *       isConnected ? 'text-success' : 'text-warning'
 *     )}>
 *       <div className={cn(
 *         'w-2 h-2 rounded-full',
 *         isConnected ? 'bg-success animate-pulse-dot' : 'bg-warning'
 *       )} />
 *       <span>
 *         {isConnected ? 'Connected' : isReconnecting ? `Reconnecting (${attemptCount})` : 'Disconnected'}
 *       </span>
 *     </div>
 *   );
 * }
 * 
 * // Custom socket config
 * <SocketProvider
 *   url="wss://panel.example.com"
 *   autoConnect={true}
 *   reconnection={true}
 *   reconnectionAttempts={5}
 *   reconnectionDelay={2000}
 *   timeout={30000}
 *   showErrors={true}
 * >
 *   {children}
 * </SocketProvider>
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Socket Provider Design System — wpPanel by Breach Rabbit
 * 
 * Connection States:
 * - disconnected: Initial state or connection lost
 * - connecting: Attempting to connect
 * - connected: Active WebSocket connection
 * - reconnecting: Attempting to reconnect after disconnect
 * - failed: Max reconnection attempts reached
 * 
 * Reconnection Strategy:
 * - Max attempts: 10 (configurable)
 * - Delay: 1s between attempts (configurable)
 * - Exponential backoff: Not implemented (linear for simplicity)
 * - Timeout: 20s for initial connection
 * 
 * Events by Category:
 * 
 * Terminal:
 * - terminal:join → terminal:ready / terminal:error
 * - terminal:input → PTY write
 * - terminal:resize → PTY resize
 * - terminal:output → data stream
 * - terminal:exit → process exit
 * 
 * Logs:
 * - log:stream → log:ready / log:error
 * - log:data → historical + live data
 * - log:stop → log:stopped
 * 
 * Metrics:
 * - metrics:subscribe → metrics:ready
 * - metrics:data → push every 5s
 * - metrics:unsubscribe → metrics:unsubscribed
 * 
 * Installer:
 * - installer:join → installer:ready
 * - installer:progress → step/progress/currentStep
 * - installer:complete → success/redirectUrl
 * 
 * Backup:
 * - backup:join → backup:ready
 * - backup:progress → progress/currentFile/estimatedTime
 * - backup:complete → success/backupId
 * 
 * Rooms:
 * - installer:{installerId} — Installer progress broadcast
 * - backup:{backupId} — Backup progress broadcast
 * - logs:{type} — Log streaming
 * - metrics:{userId} — User-specific metrics
 * 
 * Error Handling:
 * - Toast notifications on connection errors (configurable)
 * - Visual connection status indicator (bottom-right)
 * - Automatic reconnection with attempt counter
 * - Graceful degradation (features work offline with warning)
 * 
 * Performance:
 * - Single socket connection per app
 * - Event listener cleanup on unmount
 * - Lazy event subscription (only when needed)
 * - Room-based broadcasting (reduces unnecessary events)
 * 
 * Security:
 * - Authentication via NextAuth session (handled in socket/server.ts)
 * - Token-based connection (passed in handshake)
 * - Room access control (users can only join their rooms)
 * - Rate limiting on server side
 * 
 * SSR Safety:
 * - Only connects on client (typeof window check)
 * - No socket operations during SSR
 * - Graceful handling if provider is missing
 */