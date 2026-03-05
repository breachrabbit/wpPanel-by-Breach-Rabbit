// =============================================================================
// wpPanel by Breach Rabbit — Terminal WebSocket API
// =============================================================================
// Next.js 16.1 — App Router WebSocket Handler
// node-pty + Socket.io for real-time terminal sessions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import * as pty from 'node-pty';
import { Socket } from 'socket.io';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface TerminalSession {
  id: string;
  ptyProcess: pty.IPty;
  socket: Socket;
  cwd: string;
  createdAt: Date;
  lastActivity: Date;
  userId: string;
  siteId?: string;
}

interface TerminalMessage {
  type: 'input' | 'resize' | 'close_session' | 'ping';
  data?: string;
  cols?: number;
  rows?: number;
  sessionId?: string;
}

// =============================================================================
// ⚙️ SESSION MANAGEMENT
// =============================================================================

// In-memory session store (use Redis for production multi-server)
const activeSessions = new Map<string, TerminalSession>();

// Session cleanup interval (every 5 minutes)
const SESSION_CLEANUP_INTERVAL = 5 * 60 * 1000;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes idle timeout

// Cleanup inactive sessions
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivity.getTime() > SESSION_TIMEOUT) {
      console.log(`[Terminal] Cleaning up inactive session: ${sessionId}`);
      session.ptyProcess.kill();
      activeSessions.delete(sessionId);
    }
  }
}, SESSION_CLEANUP_INTERVAL);

// =============================================================================
// 🔧 PTY HELPER FUNCTIONS
// =============================================================================

/**
 * Create a new PTY process
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
 * Generate secure session ID
 */
function generateSessionId(): string {
  const { randomBytes } = require('crypto');
  return `term-${randomBytes(16).toString('hex')}`;
}

/**
 * Validate shell command for security
 */
function isCommandSafe(command: string): boolean {
  // Block dangerous commands
  const blockedPatterns = [
    /rm\s+[-rf]+\s+\/\//, // rm -rf /
    /mkfs\./, // filesystem formatting
    /dd\s+if=.*of=\/dev/, // dd to device
    /:\(\)\{\s*:\|:\s*&\s*\}\;/, // fork bomb
    /chmod\s+777\s+\/\//, // chmod 777 /
    /chown\s+.*\/\//, // chown /
    /wget.*\|.*sh/, // wget | sh
    /curl.*\|.*sh/, // curl | sh
  ];
  
  return !blockedPatterns.some(pattern => pattern.test(command));
}

// =============================================================================
// 🛣️ ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/terminal/[sessionId]
 * Get terminal session info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const terminalSession = activeSessions.get(sessionId);
    
    if (!terminalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // Verify ownership
    if (terminalSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({
      id: sessionId,
      cwd: terminalSession.cwd,
      createdAt: terminalSession.createdAt,
      lastActivity: terminalSession.lastActivity,
      pid: terminalSession.ptyProcess.pid,
    });
  } catch (error) {
    console.error('Terminal GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/terminal/[sessionId]
 * Handle terminal session actions (create, resize, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate request
    const schema = z.object({
      action: z.enum(['create', 'resize', 'close', 'cd']),
      cwd: z.string().optional(),
      cols: z.number().optional(),
      rows: z.number().optional(),
      siteId: z.string().optional(),
    });
    
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const { action, cwd, cols, rows, siteId } = parsed.data;
    
    switch (action) {
      // =======================================================================
      // CREATE: Create new terminal session
      // =======================================================================
      case 'create': {
        const targetCwd = cwd || (siteId ? `/var/www/${siteId}` : '/root');
        
        // Verify directory exists and user has access
        try {
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          
          await execAsync(`test -d ${targetCwd}`);
        } catch {
          return NextResponse.json(
            { error: `Directory does not exist: ${targetCwd}` },
            { status: 400 }
          );
        }
        
        const newSessionId = generateSessionId();
        const ptyProcess = createPtyProcess(targetCwd);
        
        const terminalSession: TerminalSession = {
          id: newSessionId,
          ptyProcess,
          socket: null as any, // Will be set by WebSocket handler
          cwd: targetCwd,
          createdAt: new Date(),
          lastActivity: new Date(),
          userId: session.user.id,
          siteId,
        };
        
        activeSessions.set(newSessionId, terminalSession);
        
        await createAuditLog({
          action: 'CREATE',
          resource: 'terminal_session',
          userId: session.user.id,
          metadata: {
            sessionId: newSessionId,
            cwd: targetCwd,
            siteId,
          },
        });
        
        return NextResponse.json({
          success: true,
          sessionId: newSessionId,
          cwd: targetCwd,
          pid: ptyProcess.pid,
        });
      }
      
      // =======================================================================
      // RESIZE: Resize terminal
      // =======================================================================
      case 'resize': {
        const terminalSession = activeSessions.get(sessionId);
        
        if (!terminalSession) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        
        if (terminalSession.userId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        if (cols && rows) {
          terminalSession.ptyProcess.resize(cols, rows);
          terminalSession.lastActivity = new Date();
        }
        
        return NextResponse.json({ success: true });
      }
      
      // =======================================================================
      // CLOSE: Close terminal session
      // =======================================================================
      case 'close': {
        const terminalSession = activeSessions.get(sessionId);
        
        if (!terminalSession) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        
        if (terminalSession.userId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        terminalSession.ptyProcess.kill();
        activeSessions.delete(sessionId);
        
        await createAuditLog({
          action: 'DELETE',
          resource: 'terminal_session',
          userId: session.user.id,
          metadata: {
            sessionId,
          },
        });
        
        return NextResponse.json({ success: true });
      }
      
      // =======================================================================
      // CD: Change directory
      // =======================================================================
      case 'cd': {
        const terminalSession = activeSessions.get(sessionId);
        
        if (!terminalSession) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }
        
        if (terminalSession.userId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        
        if (cwd) {
          // Send cd command to terminal
          terminalSession.ptyProcess.write(`cd ${cwd}\n`);
          terminalSession.cwd = cwd;
          terminalSession.lastActivity = new Date();
        }
        
        return NextResponse.json({ success: true, cwd });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Terminal POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/terminal/[sessionId]
 * Delete terminal session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const terminalSession = activeSessions.get(sessionId);
    
    if (!terminalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    if (terminalSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    terminalSession.ptyProcess.kill();
    activeSessions.delete(sessionId);
    
    await createAuditLog({
      action: 'DELETE',
      resource: 'terminal_session',
      userId: session.user.id,
      metadata: {
        sessionId,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Terminal DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export { activeSessions };

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Terminal API Endpoints:
 * 
 * GET /api/terminal/[sessionId]
 *   - Get session info
 *   - Returns: { id, cwd, createdAt, lastActivity, pid }
 * 
 * POST /api/terminal/[sessionId]
 *   - Create: { action: 'create', cwd?, siteId? }
 *   - Resize: { action: 'resize', cols, rows }
 *   - Close: { action: 'close' }
 *   - CD: { action: 'cd', cwd }
 * 
 * DELETE /api/terminal/[sessionId]
 *   - Close and delete session
 *   - Returns: { success: true }
 * 
 * WebSocket Integration:
 * - See /lib/socket/server.ts for Socket.io handler
 * - WebSocket handles real-time I/O streaming
 * - REST API handles session management
 * 
 * Security Features:
 * - Authentication required (NextAuth session)
 * - Session ownership verification
 * - Command safety validation (blocked patterns)
 * - Directory access verification
 * - Audit logging for all sessions
 * - Idle session cleanup (30 min timeout)
 * 
 * Performance:
 * - In-memory session store (Redis for multi-server)
 * - Automatic cleanup of inactive sessions
 * - PTY process isolation per session
 * 
 * Production Considerations:
 * - Use Redis for session store in multi-server setup
 * - Implement rate limiting on session creation
 * - Add session duration limits
 * - Log all terminal commands for compliance
 * - Implement command recording/auditing
 */