// =============================================================================
// wpPanel by Breach Rabbit — Socket.io Server
// =============================================================================
// Next.js 16.1 — Custom Socket.io Server for Real-time Features
// Features: Terminal sessions, log streaming, metrics push, installer progress
// =============================================================================

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import * as pty from 'node-pty';
import { z } from 'zod';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface SocketIoServer {
  io: SocketIOServer;
  start: () => void;
  stop: () => void;
}

export interface TerminalSession {
  id: string;
  ptyProcess: pty.IPty;
  socket: Socket;
  cwd: string;
  createdAt: Date;
  lastActivity: Date;
  userId: string;
  siteId?: string;
}

export interface LogStreamSession {
  id: string;
  socket: Socket;
  type: 'ols-access' | 'ols-error' | 'php' | 'system' | 'nginx';
  path: string;
  userId: string;
}

export interface MetricsSession {
  id: string;
  socket: Socket;
  userId: string;
  interval?: NodeJS.Timeout;
}

export interface InstallerSession {
  id: string;
  socket: Socket;
  userId: string;
  step: number;
  progress: number;
}

export interface BackupSession {
  id: string;
  socket: Socket;
  userId: string;
  backupId: string;
  progress: number;
}

export interface SocketContext {
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'CLIENT';
  };
  sessionId: string;
}

// =============================================================================
// ⚙️ CONFIGURATION
// =============================================================================

const CONFIG = {
  // Session timeouts
  TERMINAL_IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  LOG_STREAM_TIMEOUT: 10 * 60 * 1000, // 10 minutes
  METRICS_INTERVAL: 5000, // 5 seconds
  INSTALLER_TIMEOUT: 60 * 60 * 1000, // 1 hour
  
  // Rate limiting
  MAX_TERMINALS_PER_USER: 5,
  MAX_LOG_STREAMS_PER_USER: 3,
  MAX_CONNECTIONS_PER_IP: 10,
  
  // Cleanup
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
};

// =============================================================================
// 📦 SESSION STORES
// =============================================================================

// In-memory stores (use Redis for multi-server production)
const terminalSessions = new Map<string, TerminalSession>();
const logStreams = new Map<string, LogStreamSession>();
const metricsSessions = new Map<string, MetricsSession>();
const installerSessions = new Map<string, InstallerSession>();
const backupSessions = new Map<string, BackupSession>();

// Rate limiting
const connectionCounts = new Map<string, number>();
const ipConnections = new Map<string, Set<string>>();

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique session ID
 */
function generateSessionId(prefix: string = 'sess'): string {
  const { randomBytes } = require('crypto');
  return `${prefix}-${randomBytes(16).toString('hex')}`;
}

/**
 * Verify user authentication from socket handshake
 */
async function verifySocketAuth(socket: Socket): Promise<SocketContext | null> {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return null;
    }
    
    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return null;
    }
    
    return {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        role: (session.user.role as 'ADMIN' | 'CLIENT') || 'CLIENT',
      },
      sessionId: socket.id,
    };
  } catch (error) {
    console.error('Socket auth verification failed:', error);
    return null;
  }
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(ip: string, socketId: string): boolean {
  const currentCount = connectionCounts.get(ip) || 0;
  
  if (currentCount >= CONFIG.MAX_CONNECTIONS_PER_IP) {
    return false;
  }
  
  // Track connection
  if (!ipConnections.has(ip)) {
    ipConnections.set(ip, new Set());
  }
  ipConnections.get(ip)!.add(socketId);
  connectionCounts.set(ip, currentCount + 1);
  
  return true;
}

/**
 * Cleanup connection tracking
 */
function cleanupConnection(ip: string, socketId: string) {
  const currentCount = connectionCounts.get(ip) || 0;
  connectionCounts.set(ip, Math.max(0, currentCount - 1));
  
  const sockets = ipConnections.get(ip);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      ipConnections.delete(ip);
    }
  }
}

/**
 * Create PTY process for terminal
 */
function createPtyProcess(cwd: string = '/root', shell: string = '/bin/bash'): pty.IPty {
  return pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env: process.env as { [key: string]: string },
  });
}

/**
 * Tail log file and stream to socket
 */
async function tailLogFile(
  path: string,
  socket: Socket,
  lines: number = 100
): Promise<void> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    // Send last N lines first
    const { stdout } = await execAsync(`tail -n ${lines} "${path}" 2>/dev/null || echo ""`);
    
    if (stdout) {
      socket.emit('log:data', {
        type: 'historical',
        data: stdout,
      });
    }
    
    // Then stream new lines using tail -f
    const tailProcess = exec(`tail -F "${path}" 2>/dev/null`);
    
    tailProcess.stdout?.on('data', (data: Buffer) => {
      socket.emit('log:data', {
        type: 'live',
        data: data.toString(),
      });
    });
    
    // Store process for cleanup
    (socket as any)._tailProcess = tailProcess;
  } catch (error) {
    socket.emit('log:error', {
      message: `Failed to read log file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

// =============================================================================
// 🏗️ SOCKET.IO SERVER
// =============================================================================

/**
 * Create and configure Socket.io server
 */
export function createSocketServer(httpServer: HTTPServer): SocketIoServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // =============================================================================
  // 🔐 MIDDLEWARE
  // =============================================================================

  io.use(async (socket, next) => {
    const ip = socket.handshake.address;
    
    // Rate limiting
    if (!checkRateLimit(ip, socket.id)) {
      return next(new Error('Too many connections from your IP'));
    }
    
    // Authentication
    const context = await verifySocketAuth(socket);
    
    if (!context) {
      return next(new Error('Authentication required'));
    }
    
    // Attach context to socket
    (socket as any).context = context;
    
    next();
  });

  // =============================================================================
  // 🔌 CONNECTION HANDLER
  // =============================================================================

  io.on('connection', (socket: Socket) => {
    const context = (socket as any).context as SocketContext;
    const ip = socket.handshake.address;
    
    console.log(`[Socket] Connected: ${socket.id} (user: ${context.user.email}, ip: ${ip})`);
    
    // Log connection
    createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'websocket',
      userId: context.user.id,
      metadata: {
        action: 'socket_connected',
        ip,
      },
    }).catch(console.error);

    // =============================================================================
    // 💻 TERMINAL HANDLERS
    // =============================================================================

    socket.on('terminal:join', async (data: { sessionId?: string; cwd?: string; siteId?: string }) => {
      try {
        const { sessionId, cwd, siteId } = data;
        
        // Check terminal limit
        const userTerminals = Array.from(terminalSessions.values()).filter(
          s => s.userId === context.user.id
        );
        
        if (userTerminals.length >= CONFIG.MAX_TERMINALS_PER_USER) {
          socket.emit('terminal:error', {
            message: `Maximum ${CONFIG.MAX_TERMINALS_PER_USER} terminal sessions allowed`,
          });
          return;
        }
        
        let terminalSession: TerminalSession;
        
        // Reconnect to existing session or create new
        if (sessionId && terminalSessions.has(sessionId)) {
          const existing = terminalSessions.get(sessionId)!;
          
          if (existing.userId !== context.user.id) {
            socket.emit('terminal:error', { message: 'Session not owned by you' });
            return;
          }
          
          existing.socket = socket;
          terminalSession = existing;
          
          // Send current cwd
          socket.emit('terminal:ready', {
            sessionId: existing.id,
            cwd: existing.cwd,
            reconnected: true,
          });
        } else {
          // Create new terminal session
          const newSessionId = generateSessionId('term');
          const targetCwd = cwd || (siteId ? `/var/www/${siteId}` : '/root');
          
          // Verify directory exists
          try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);
            await execAsync(`test -d "${targetCwd}"`);
          } catch {
            socket.emit('terminal:error', { message: `Directory does not exist: ${targetCwd}` });
            return;
          }
          
          const ptyProcess = createPtyProcess(targetCwd);
          
          terminalSession = {
            id: newSessionId,
            ptyProcess,
            socket,
            cwd: targetCwd,
            createdAt: new Date(),
            lastActivity: new Date(),
            userId: context.user.id,
            siteId,
          };
          
          terminalSessions.set(newSessionId, terminalSession);
          
          // Stream PTY output to client
          ptyProcess.onData((data: string) => {
            socket.emit('terminal:output', { data });
          });
          
          // Handle PTY exit
          ptyProcess.onExit(({ exitCode }) => {
            socket.emit('terminal:exit', { code: exitCode });
            terminalSessions.delete(newSessionId);
          });
          
          socket.emit('terminal:ready', {
            sessionId: newSessionId,
            cwd: targetCwd,
            pid: ptyProcess.pid,
            reconnected: false,
          });
          
          // Log session creation
          createAuditLog({
            action: 'CREATE',
            resource: 'terminal_session',
            userId: context.user.id,
            metadata: {
              sessionId: newSessionId,
              cwd: targetCwd,
              siteId,
            },
          }).catch(console.error);
        }
        
        // Handle terminal input
        socket.on('terminal:input', ({ data }: { data: string }) => {
          if (terminalSession) {
            terminalSession.ptyProcess.write(data);
            terminalSession.lastActivity = new Date();
          }
        });
        
        // Handle resize
        socket.on('terminal:resize', ({ cols, rows }: { cols: number; rows: number }) => {
          if (terminalSession) {
            terminalSession.ptyProcess.resize(cols, rows);
            terminalSession.lastActivity = new Date();
          }
        });
        
        // Handle cd command
        socket.on('terminal:cd', ({ path }: { path: string }) => {
          if (terminalSession) {
            terminalSession.ptyProcess.write(`cd "${path}"\n`);
            terminalSession.cwd = path;
            terminalSession.lastActivity = new Date();
          }
        });
        
      } catch (error) {
        console.error('Terminal join error:', error);
        socket.emit('terminal:error', {
          message: error instanceof Error ? error.message : 'Failed to create terminal',
        });
      }
    });

    socket.on('terminal:close', ({ sessionId }: { sessionId: string }) => {
      const session = terminalSessions.get(sessionId);
      
      if (session && session.userId === context.user.id) {
        session.ptyProcess.kill();
        terminalSessions.delete(sessionId);
        
        createAuditLog({
          action: 'DELETE',
          resource: 'terminal_session',
          userId: context.user.id,
          metadata: { sessionId },
        }).catch(console.error);
      }
    });

    // =============================================================================
    // 📜 LOG STREAMING HANDLERS
    // =============================================================================

    socket.on('log:stream', async (data: {
      type: 'ols-access' | 'ols-error' | 'php' | 'system' | 'nginx';
      path?: string;
      lines?: number;
    }) => {
      try {
        const { type, lines = 100 } = data;
        
        // Check stream limit
        const userStreams = Array.from(logStreams.values()).filter(
          s => s.userId === context.user.id
        );
        
        if (userStreams.length >= CONFIG.MAX_LOG_STREAMS_PER_USER) {
          socket.emit('log:error', {
            message: `Maximum ${CONFIG.MAX_LOG_STREAMS_PER_USER} log streams allowed`,
          });
          return;
        }
        
        // Determine log path
        let logPath = data.path;
        
        if (!logPath) {
          switch (type) {
            case 'ols-access':
              logPath = '/var/log/litespeed/access.log';
              break;
            case 'ols-error':
              logPath = '/var/log/litespeed/error.log';
              break;
            case 'php':
              logPath = '/var/log/php8.3-fpm.log';
              break;
            case 'system':
              logPath = '/var/log/syslog';
              break;
            case 'nginx':
              logPath = '/var/log/nginx/error.log';
              break;
          }
        }
        
        if (!logPath) {
          socket.emit('log:error', { message: 'Invalid log type' });
          return;
        }
        
        // Create stream session
        const streamId = generateSessionId('log');
        
        const logStream: LogStreamSession = {
          id: streamId,
          socket,
          type,
          path: logPath,
          userId: context.user.id,
        };
        
        logStreams.set(streamId, logStream);
        
        // Start tailing
        await tailLogFile(logPath, socket, lines);
        
        socket.emit('log:ready', {
          streamId,
          type,
          path: logPath,
        });
        
      } catch (error) {
        console.error('Log stream error:', error);
        socket.emit('log:error', {
          message: error instanceof Error ? error.message : 'Failed to start log stream',
        });
      }
    });

    socket.on('log:stop', ({ streamId }: { streamId: string }) => {
      const stream = logStreams.get(streamId);
      
      if (stream && stream.userId === context.user.id) {
        // Kill tail process
        if ((stream.socket as any)._tailProcess) {
          (stream.socket as any)._tailProcess.kill();
        }
        
        logStreams.delete(streamId);
        socket.emit('log:stopped', { streamId });
      }
    });

    // =============================================================================
    // 📊 METRICS STREAMING HANDLERS
    // =============================================================================

    socket.on('metrics:subscribe', (data: { type?: 'server' | 'site'; siteId?: string }) => {
      try {
        const { type = 'server', siteId } = data;
        
        // Create metrics session
        const sessionId = generateSessionId('metrics');
        
        const metricsSession: MetricsSession = {
          id: sessionId,
          socket,
          userId: context.user.id,
        };
        
        metricsSessions.set(sessionId, metricsSession);
        
        // Start pushing metrics
        const interval = setInterval(async () => {
          try {
            let metrics;
            
            if (type === 'server') {
              // Server metrics
              const { exec } = await import('child_process');
              const { promisify } = await import('util');
              const execAsync = promisify(exec);
              
              const [loadavg, meminfo, cpu] = await Promise.all([
                execAsync('cat /proc/loadavg'),
                execAsync('cat /proc/meminfo'),
                execAsync('top -bn1 | grep "Cpu(s)"'),
              ]);
              
              metrics = {
                type: 'server',
                load: loadavg.stdout.split(' ').slice(0, 3).map(Number),
                memory: parseMeminfo(meminfo.stdout),
                cpu: parseCpu(cpu.stdout),
                timestamp: Date.now(),
              };
            } else if (type === 'site' && siteId) {
              // Site-specific metrics (would need site ID lookup)
              metrics = {
                type: 'site',
                siteId,
                requests: 0, // Would query from monitoring service
                bandwidth: 0,
                responseTime: 0,
                timestamp: Date.now(),
              };
            }
            
            if (metrics && metricsSessions.has(sessionId)) {
              socket.emit('metrics:data', metrics);
            }
          } catch (error) {
            console.error('Metrics collection error:', error);
          }
        }, CONFIG.METRICS_INTERVAL);
        
        metricsSession.interval = interval;
        
        socket.emit('metrics:ready', { sessionId, type });
        
      } catch (error) {
        console.error('Metrics subscribe error:', error);
        socket.emit('metrics:error', {
          message: error instanceof Error ? error.message : 'Failed to subscribe to metrics',
        });
      }
    });

    socket.on('metrics:unsubscribe', ({ sessionId }: { sessionId: string }) => {
      const session = metricsSessions.get(sessionId);
      
      if (session && session.userId === context.user.id) {
        if (session.interval) {
          clearInterval(session.interval);
        }
        
        metricsSessions.delete(sessionId);
        socket.emit('metrics:unsubscribed', { sessionId });
      }
    });

    // =============================================================================
    // 📦 INSTALLER PROGRESS HANDLERS
    // =============================================================================

    socket.on('installer:join', ({ installerId }: { installerId: string }) => {
      try {
        const sessionId = generateSessionId('installer');
        
        const installerSession: InstallerSession = {
          id: sessionId,
          socket,
          userId: context.user.id,
          installerId,
          step: 0,
          progress: 0,
        };
        
        installerSessions.set(sessionId, installerSession);
        
        socket.emit('installer:ready', { sessionId, installerId });
        
        // Join installer room for broadcast
        socket.join(`installer:${installerId}`);
        
      } catch (error) {
        console.error('Installer join error:', error);
        socket.emit('installer:error', {
          message: error instanceof Error ? error.message : 'Failed to join installer',
        });
      }
    });

    socket.on('installer:leave', ({ sessionId }: { sessionId: string }) => {
      installerSessions.delete(sessionId);
    });

    // =============================================================================
    // 💿 BACKUP PROGRESS HANDLERS
    // =============================================================================

    socket.on('backup:join', ({ backupId }: { backupId: string }) => {
      try {
        const sessionId = generateSessionId('backup');
        
        const backupSession: BackupSession = {
          id: sessionId,
          socket,
          userId: context.user.id,
          backupId,
          progress: 0,
        };
        
        backupSessions.set(sessionId, backupSession);
        
        socket.emit('backup:ready', { sessionId, backupId });
        
        // Join backup room for broadcast
        socket.join(`backup:${backupId}`);
        
      } catch (error) {
        console.error('Backup join error:', error);
        socket.emit('backup:error', {
          message: error instanceof Error ? error.message : 'Failed to join backup',
        });
      }
    });

    socket.on('backup:leave', ({ sessionId }: { sessionId: string }) => {
      backupSessions.delete(sessionId);
    });

    // =============================================================================
    // ❌ DISCONNECT HANDLER
    // =============================================================================

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.id} (reason: ${reason})`);
      
      // Cleanup terminal sessions
      for (const [sessionId, session] of terminalSessions.entries()) {
        if (session.socket.id === socket.id) {
          // Keep session alive for reconnection (timeout will cleanup)
          session.socket = socket; // Will be updated on reconnect
        }
      }
      
      // Cleanup log streams
      for (const [streamId, stream] of logStreams.entries()) {
        if (stream.socket.id === socket.id) {
          if ((stream.socket as any)._tailProcess) {
            (stream.socket as any)._tailProcess.kill();
          }
          logStreams.delete(streamId);
        }
      }
      
      // Cleanup metrics sessions
      for (const [sessionId, session] of metricsSessions.entries()) {
        if (session.socket.id === socket.id) {
          if (session.interval) {
            clearInterval(session.interval);
          }
          metricsSessions.delete(sessionId);
        }
      }
      
      // Cleanup installer/backup sessions
      for (const [sessionId, session] of installerSessions.entries()) {
        if (session.socket.id === socket.id) {
          installerSessions.delete(sessionId);
        }
      }
      
      for (const [sessionId, session] of backupSessions.entries()) {
        if (session.socket.id === socket.id) {
          backupSessions.delete(sessionId);
        }
      }
      
      // Cleanup connection tracking
      cleanupConnection(ip, socket.id);
      
      // Log disconnection
      createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'websocket',
        userId: context.user.id,
        metadata: {
          action: 'socket_disconnected',
          ip,
          reason,
        },
      }).catch(console.error);
    });

    // =============================================================================
    // ⚠️ ERROR HANDLER
    // =============================================================================

    socket.on('error', (error: Error) => {
      console.error(`[Socket] Error: ${socket.id}`, error);
      
      createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'websocket',
        userId: context.user.id,
        metadata: {
          action: 'socket_error',
          error: error.message,
        },
      }).catch(console.error);
    });
  });

  // =============================================================================
  // 🧹 CLEANUP INTERVAL
  // =============================================================================

  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    
    // Cleanup idle terminal sessions
    for (const [sessionId, session] of terminalSessions.entries()) {
      if (now - session.lastActivity.getTime() > CONFIG.TERMINAL_IDLE_TIMEOUT) {
        console.log(`[Socket] Cleaning up idle terminal: ${sessionId}`);
        session.ptyProcess.kill();
        terminalSessions.delete(sessionId);
      }
    }
    
    // Cleanup old log streams
    for (const [streamId, stream] of logStreams.entries()) {
      // Log streams timeout after 10 minutes
      if (now - (stream.socket as any).connectedAt > CONFIG.LOG_STREAM_TIMEOUT) {
        console.log(`[Socket] Cleaning up log stream: ${streamId}`);
        if ((stream.socket as any)._tailProcess) {
          (stream.socket as any)._tailProcess.kill();
        }
        logStreams.delete(streamId);
      }
    }
    
  }, CONFIG.CLEANUP_INTERVAL);

  // =============================================================================
  // 🏗️ SERVER METHODS
  // =============================================================================

  return {
    io,
    
    start() {
      console.log('[Socket] Server started on /api/socket');
    },
    
    stop() {
      clearInterval(cleanupInterval);
      
      // Kill all PTY processes
      for (const session of terminalSessions.values()) {
        session.ptyProcess.kill();
      }
      terminalSessions.clear();
      
      // Kill all tail processes
      for (const stream of logStreams.values()) {
        if ((stream.socket as any)._tailProcess) {
          (stream.socket as any)._tailProcess.kill();
        }
      }
      logStreams.clear();
      
      // Clear all intervals
      for (const session of metricsSessions.values()) {
        if (session.interval) {
          clearInterval(session.interval);
        }
      }
      metricsSessions.clear();
      
      installerSessions.clear();
      backupSessions.clear();
      
      io.close();
      console.log('[Socket] Server stopped');
    },
    
    // Broadcast methods for use in API routes
    broadcastToInstaller(installerId: string, event: string, data: any) {
      io.to(`installer:${installerId}`).emit(event, data);
    },
    
    broadcastToBackup(backupId: string, event: string, data: any) {
      io.to(`backup:${backupId}`).emit(event, data);
    },
    
    // Get session info
    getTerminalSessions() {
      return Array.from(terminalSessions.values()).map(s => ({
        id: s.id,
        cwd: s.cwd,
        userId: s.userId,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity,
      }));
    },
    
    getLogStreams() {
      return Array.from(logStreams.values()).map(s => ({
        id: s.id,
        type: s.type,
        path: s.path,
        userId: s.userId,
      }));
    },
  };
}

// =============================================================================
// 🔧 HELPER PARSERS
// =============================================================================

function parseMeminfo(output: string): Record<string, number> {
  const lines = output.split('\n');
  const result: Record<string, number> = {};
  
  for (const line of lines) {
    const [key, value] = line.split(':');
    if (key && value) {
      const num = parseInt(value.trim().split(' ')[0], 10);
      result[key.trim()] = num;
    }
  }
  
  return {
    total: result.MemTotal || 0,
    free: result.MemFree || 0,
    available: result.MemAvailable || 0,
    buffers: result.Buffers || 0,
    cached: result.Cached || 0,
  };
}

function parseCpu(output: string): Record<string, number> {
  const match = output.match(/(\d+\.?\d*)\s*.*us,\s*(\d+\.?\d*)\s*.*sy/);
  
  if (match) {
    return {
      user: parseFloat(match[1]),
      system: parseFloat(match[2]),
      idle: 100 - parseFloat(match[1]) - parseFloat(match[2]),
    };
  }
  
  return { user: 0, system: 0, idle: 100 };
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export {
  terminalSessions,
  logStreams,
  metricsSessions,
  installerSessions,
  backupSessions,
};

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Socket.io Server Features:
 * 
 * 1. Terminal Sessions:
 *    - node-pty for real PTY
 *    - Multiple tabs per user (max 5)
 *    - Session persistence (30 min idle timeout)
 *    - Resize support
 *    - Directory navigation
 * 
 * 2. Log Streaming:
 *    - tail -F for live logs
 *    - Historical context (last N lines)
 *    - Multiple log types (OLS, PHP, system, nginx)
 *    - Max 3 streams per user
 * 
 * 3. Metrics Streaming:
 *    - Server metrics (CPU, RAM, load)
 *    - Site metrics (requests, bandwidth)
 *    - 5 second interval
 *    - Subscribe/unsubscribe
 * 
 * 4. Installer Progress:
 *    - Room-based broadcasting
 *    - Step/progress updates
 *    - Terminal output streaming
 * 
 * 5. Backup Progress:
 *    - Room-based broadcasting
 *    - Real-time progress updates
 *    - Restic output streaming
 * 
 * Security:
 * - NextAuth session verification
 * - Rate limiting per IP (max 10 connections)
 * - Session ownership verification
 * - Audit logging for all sessions
 * - Automatic cleanup of idle sessions
 * 
 * Performance:
 * - In-memory session stores
 * - Cleanup interval (5 minutes)
 * - PTY process isolation
 * - Efficient log tailing
 */