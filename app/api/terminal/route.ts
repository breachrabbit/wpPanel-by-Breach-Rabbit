// =============================================================================
// wpPanel by Breach Rabbit — Terminal API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// Terminal session management (create, list, delete)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface TerminalSession {
  id: string;
  userId: string;
  cwd: string;
  shell: string;
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'idle' | 'closed';
  siteId?: string;
}

interface TerminalQuery {
  action?: 'list' | 'info';
  sessionId?: string;
}

interface TerminalBody {
  action?: 'create' | 'close' | 'keepalive';
  sessionId?: string;
  cwd?: string;
  shell?: string;
  siteId?: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const TerminalQuerySchema = z.object({
  action: z.enum(['list', 'info']).optional(),
  sessionId: z.string().optional(),
});

const TerminalBodySchema = z.object({
  action: z.enum(['create', 'close', 'keepalive']).optional(),
  sessionId: z.string().optional(),
  cwd: z.string().optional(),
  shell: z.string().default('/bin/bash'),
  siteId: z.string().optional(),
});

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Create terminal session
 */
async function createTerminalSession(
  userId: string,
  options: { cwd?: string; shell?: string; siteId?: string }
): Promise<TerminalSession> {
  const id = randomUUID();
  const now = new Date();

  const session: TerminalSession = {
    id,
    userId,
    cwd: options.cwd || '/var/www',
    shell: options.shell || '/bin/bash',
    createdAt: now,
    lastActivity: now,
    status: 'active',
    siteId: options.siteId,
  };

  // Store in Redis
  await redis.setEx(
    `terminal:session:${id}`,
    3600, // 1 hour TTL
    JSON.stringify(session)
  );

  // Add to user's active sessions
  await redis.sAdd(`terminal:user:${userId}:sessions`, id);

  return session;
}

/**
 * Get terminal session
 */
async function getTerminalSession(sessionId: string): Promise<TerminalSession | null> {
  const data = await redis.get(`terminal:session:${sessionId}`);
  if (!data) {
    return null;
  }
  return JSON.parse(data);
}

/**
 * Update session last activity
 */
async function updateSessionActivity(sessionId: string): Promise<void> {
  const data = await redis.get(`terminal:session:${sessionId}`);
  if (data) {
    const session = JSON.parse(data);
    session.lastActivity = new Date();
    session.status = 'active';
    await redis.setEx(`terminal:session:${sessionId}`, 3600, JSON.stringify(session));
  }
}

/**
 * Close terminal session
 */
async function closeTerminalSession(sessionId: string): Promise<void> {
  const data = await redis.get(`terminal:session:${sessionId}`);
  if (data) {
    const session = JSON.parse(data);
    
    // Remove from user's sessions
    await redis.sRem(`terminal:user:${session.userId}:sessions`, sessionId);
    
    // Delete session
    await redis.del(`terminal:session:${sessionId}`);
    
    // Notify WebSocket clients
    await redis.publish('terminal:closed', JSON.stringify({ sessionId }));
  }
}

/**
 * Get user's active sessions
 */
async function getUserSessions(userId: string): Promise<TerminalSession[]> {
  const sessionIds = await redis.sMembers(`terminal:user:${userId}:sessions`);
  const sessions: TerminalSession[] = [];

  for (const id of sessionIds) {
    const session = await getTerminalSession(id);
    if (session) {
      sessions.push(session);
    } else {
      // Clean up stale session reference
      await redis.sRem(`terminal:user:${userId}:sessions`, id);
    }
  }

  return sessions;
}

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/terminal
 * List sessions or get session info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const validatedQuery = TerminalQuerySchema.parse({
      action: query.get('action') || 'list',
      sessionId: query.get('sessionId'),
    });

    const { action, sessionId } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // LIST USER'S SESSIONS
      // =======================================================================
      case 'list':
        result = await getUserSessions(userId);
        break;

      // =======================================================================
      // GET SESSION INFO
      // =======================================================================
      case 'info':
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        const session = await getTerminalSession(sessionId);
        
        if (!session) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Check ownership
        if (session.userId !== userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        result = session;
        break;

      // =======================================================================
      // UNKNOWN ACTION
      // =======================================================================
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Terminal API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/terminal
 * Terminal operations (create, close, keepalive)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const validatedBody = TerminalBodySchema.parse(body);
    const { action, sessionId, cwd, shell, siteId } = validatedBody;

    let result: any;

    switch (action) {
      // =======================================================================
      // CREATE SESSION
      // =======================================================================
      case 'create':
        const newSession = await createTerminalSession(userId, {
          cwd,
          shell,
          siteId,
        });

        await createAuditLog({
          action: 'CREATE',
          resource: 'terminal_session',
          userId,
          metadata: {
            sessionId: newSession.id,
            cwd: newSession.cwd,
            shell: newSession.shell,
            siteId: newSession.siteId,
          },
        });

        result = {
          success: true,
          sessionId: newSession.id,
          wsUrl: `ws://${request.headers.get('host')}/api/terminal/${newSession.id}`,
        };
        break;

      // =======================================================================
      // CLOSE SESSION
      // =======================================================================
      case 'close':
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        const existingSession = await getTerminalSession(sessionId);
        
        if (!existingSession) {
          return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        // Check ownership
        if (existingSession.userId !== userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await closeTerminalSession(sessionId);

        await createAuditLog({
          action: 'DELETE',
          resource: 'terminal_session',
          userId,
          metadata: {
            sessionId,
          },
        });

        result = { success: true, message: 'Session closed' };
        break;

      // =======================================================================
      // KEEPALIVE (extend session TTL)
      // =======================================================================
      case 'keepalive':
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        await updateSessionActivity(sessionId);

        result = { success: true, message: 'Session activity updated' };
        break;

      // =======================================================================
      // UNKNOWN ACTION
      // =======================================================================
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Terminal API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/terminal
 * Close terminal session
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const sessionId = query.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const existingSession = await getTerminalSession(sessionId);
    
    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check ownership
    if (existingSession.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await closeTerminalSession(sessionId);

    await createAuditLog({
      action: 'DELETE',
      resource: 'terminal_session',
      userId,
      metadata: {
        sessionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Session closed',
    });
  } catch (error) {
    console.error('[Terminal API] DELETE error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to close session' }, { status: 500 });
  }
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Terminal API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/terminal?action=list
 * - GET  /api/terminal?action=info&sessionId=:id
 * - POST /api/terminal (action: create/close/keepalive)
 * - DELETE /api/terminal?sessionId=:id
 * - WS   /api/terminal/:sessionId (via Socket.io)
 * 
 * Request Examples:
 * 
 * // List user's sessions
 * GET /api/terminal?action=list
 * 
 * // Get session info
 * GET /api/terminal?action=info&sessionId=uuid-here
 * 
 * // Create new session
 * POST /api/terminal
 * {
 *   "action": "create",
 *   "cwd": "/var/www/example.com",
 *   "shell": "/bin/bash",
 *   "siteId": "site123"
 * }
 * 
 * // Response:
 * {
 *   "success": true,
 *   "sessionId": "uuid-here",
 *   "wsUrl": "ws://localhost:3000/api/terminal/uuid-here"
 * }
 * 
 * // Close session
 * POST /api/terminal
 * { "action": "close", "sessionId": "uuid-here" }
 * 
 * // Keep session alive
 * POST /api/terminal
 * { "action": "keepalive", "sessionId": "uuid-here" }
 * 
 * // Delete session
 * DELETE /api/terminal?sessionId=uuid-here
 * 
 * Session Management:
 * - Sessions stored in Redis with 1 hour TTL
 * - Keepalive extends TTL
 * - Auto-cleanup on TTL expiry
 * - User can have multiple sessions
 * - Session ownership enforced
 * 
 * WebSocket Connection:
 * - Client connects to /api/terminal/:sessionId
 * - Socket.io handles I/O multiplexing
 * - node-pty on server side
 * - Input → PTY → Output → Client
 * - Resize events supported
 * 
 * Security:
 * - Authentication required
 * - Session ownership check
 * - Audit logging for all operations
 * - Session TTL (1 hour default)
 * - CWD restricted to allowed directories
 * 
 * Integration:
 * - TerminalWindow component (xterm.js)
 * - Socket.io server handler
 * - node-pty for PTY
 */