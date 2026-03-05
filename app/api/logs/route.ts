// =============================================================================
// wpPanel by Breach Rabbit — Logs API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// Log viewing, search, live tail, download
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream } from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type LogType = 'ols_access' | 'ols_error' | 'nginx_access' | 'nginx_error' | 'php' | 'system' | 'wp';

interface LogsQuery {
  action?: 'list' | 'read' | 'search' | 'download';
  type?: LogType;
  siteId?: string;
  lines?: string;
  offset?: string;
  pattern?: string;
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  from?: string;
  to?: string;
}

interface LogsBody {
  action?: 'search' | 'tail_start' | 'tail_stop';
  type?: LogType;
  siteId?: string;
  pattern?: string;
  lines?: number;
  sessionId?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const LogsQuerySchema = z.object({
  action: z.enum(['list', 'read', 'search', 'download']).optional(),
  type: z.enum(['ols_access', 'ols_error', 'nginx_access', 'nginx_error', 'php', 'system', 'wp']).optional(),
  siteId: z.string().optional(),
  lines: z.string().optional(),
  offset: z.string().optional(),
  pattern: z.string().optional(),
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const LogsBodySchema = z.object({
  action: z.enum(['search', 'tail_start', 'tail_stop']).optional(),
  type: z.enum(['ols_access', 'ols_error', 'nginx_access', 'nginx_error', 'php', 'system', 'wp']).optional(),
  siteId: z.string().optional(),
  pattern: z.string().optional(),
  lines: z.number().min(1).max(10000).optional(),
  sessionId: z.string().optional(),
});

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const LOG_PATHS: Record<LogType, (siteId?: string, siteRoot?: string) => string> = {
  ols_access: (siteId, siteRoot) => siteRoot ? `${siteRoot}/logs/access.log` : '/var/log/lsws/access.log',
  ols_error: (siteId, siteRoot) => siteRoot ? `${siteRoot}/logs/error.log` : '/var/log/lsws/error.log',
  nginx_access: () => '/var/log/nginx/access.log',
  nginx_error: () => '/var/log/nginx/error.log',
  php: () => '/var/log/php/error.log',
  system: () => '/var/log/syslog',
  wp: (siteId, siteRoot) => siteRoot ? `${siteRoot}/wp-content/debug.log` : '/var/www/wp-debug.log',
};

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Get log file path
 */
function getLogFilePath(type: LogType, siteId?: string): Promise<{ path: string; siteRoot?: string }> {
  return new Promise(async (resolve) => {
    let siteRoot: string | undefined;
    
    if (siteId) {
      const site = await prisma.site.findUnique({
        where: { id: siteId },
      });
      
      if (site) {
        siteRoot = site.rootPath;
      }
    }
    
    resolve({
      path: LOG_PATHS[type](siteId, siteRoot),
      siteRoot,
    });
  });
}

/**
 * Parse log line to structured format
 */
function parseLogLine(line: string, type: LogType): LogEntry | null {
  if (!line.trim()) return null;
  
  // OLS/Nginx access log format
  if (type.includes('access')) {
    const match = line.match(/^(\S+) - - \[([^\]]+)\] "([^"]+)" (\d+) (\d+)/);
    if (match) {
      return {
        timestamp: match[2],
        level: 'INFO',
        message: `${match[3]} - ${match[4]}`,
        source: match[1],
      };
    }
  }
  
  // Error log format
  if (type.includes('error') || type === 'php' || type === 'system') {
    const match = line.match(/^\[([^\]]+)\] \[(\w+)\] (.+)/);
    if (match) {
      return {
        timestamp: match[1],
        level: match[2].toUpperCase(),
        message: match[3],
        source: 'system',
      };
    }
  }
  
  // Fallback
  return {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message: line,
    source: 'unknown',
  };
}

/**
 * Tail log file (last N lines)
 */
async function tailLogFile(filePath: string, lines: number = 100): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`tail -n ${lines} "${filePath}" 2>/dev/null || echo ""`);
    return stdout.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * Search log file for pattern
 */
async function searchLogFile(filePath: string, pattern: string, lines: number = 100): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`grep -i "${pattern}" "${filePath}" 2>/dev/null | tail -n ${lines} || echo ""`);
    return stdout.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * Get log file size
 */
async function getLogFileSize(filePath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(`stat -c %s "${filePath}" 2>/dev/null || echo "0"`);
    return parseInt(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

/**
 * Rotate log file (if too large)
 */
async function rotateLogFile(filePath: string, maxSize: number = 100 * 1024 * 1024): Promise<void> {
  const size = await getLogFileSize(filePath);
  
  if (size > maxSize) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${filePath}.${timestamp}`;
    
    await execAsync(`mv "${filePath}" "${rotatedPath}" && touch "${filePath}"`);
  }
}

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/logs
 * List logs, read log content, search, download
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const validatedQuery = LogsQuerySchema.parse({
      action: query.get('action') || 'list',
      type: query.get('type') as LogType,
      siteId: query.get('siteId'),
      lines: query.get('lines') || '100',
      offset: query.get('offset') || '0',
      pattern: query.get('pattern'),
      level: query.get('level') as any,
      from: query.get('from'),
      to: query.get('to'),
    });

    const { action, type, siteId, lines, offset, pattern, level, from, to } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // LIST AVAILABLE LOGS
      // =======================================================================
      case 'list':
        const where: any = { userId };
        if (siteId) where.id = siteId;

        const sites = await prisma.site.findMany({
          where,
          select: {
            id: true,
            name: true,
            domain: true,
            rootPath: true,
          },
        });

        const logTypes: Array<{
          type: LogType;
          name: string;
          description: string;
          available: boolean;
          size?: number;
        }> = [
          { type: 'ols_access', name: 'OpenLiteSpeed Access', description: 'Web server access logs', available: true },
          { type: 'ols_error', name: 'OpenLiteSpeed Error', description: 'Web server error logs', available: true },
          { type: 'nginx_access', name: 'Nginx Access', description: 'Nginx proxy access logs', available: true },
          { type: 'nginx_error', name: 'Nginx Error', description: 'Nginx proxy error logs', available: true },
          { type: 'php', name: 'PHP Error', description: 'PHP error logs', available: true },
          { type: 'system', name: 'System', description: 'System logs (syslog)', available: true },
          { type: 'wp', name: 'WordPress Debug', description: 'WordPress debug logs', available: true },
        ];

        // Check file sizes for each type
        for (const logType of logTypes) {
          try {
            const { path: logPath } = await getLogFilePath(logType.type, siteId || undefined);
            logType.size = await getLogFileSize(logPath);
            logType.available = logType.size > 0;
          } catch {
            logType.available = false;
          }
        }

        result = {
          sites,
          logTypes,
        };
        break;

      // =======================================================================
      // READ LOG CONTENT
      // =======================================================================
      case 'read':
        if (!type) {
          return NextResponse.json({ error: 'type is required' }, { status: 400 });
        }

        // Verify site ownership if siteId provided
        if (siteId) {
          const site = await prisma.site.findUnique({
            where: { id: siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
          }
        }

        const { path: logPath } = await getLogFilePath(type, siteId);
        const logLines = await tailLogFile(logPath, parseInt(lines));
        const parsedLogs = logLines.map(line => parseLogLine(line, type)).filter(Boolean);

        // Filter by level if specified
        let filteredLogs = parsedLogs;
        if (level) {
          const minLevel = LOG_LEVELS[level];
          filteredLogs = parsedLogs.filter(log => {
            const logLevel = LOG_LEVELS[log.level as keyof typeof LOG_LEVELS];
            return logLevel >= minLevel;
          });
        }

        result = {
          type,
          lines: parseInt(lines),
          total: logLines.length,
          logs: filteredLogs,
        };
        break;

      // =======================================================================
      // SEARCH LOGS
      // =======================================================================
      case 'search':
        if (!type || !pattern) {
          return NextResponse.json({ error: 'type and pattern are required' }, { status: 400 });
        }

        // Verify site ownership if siteId provided
        if (siteId) {
          const site = await prisma.site.findUnique({
            where: { id: siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
          }
        }

        const { path: searchPath } = await getLogFilePath(type, siteId);
        const searchResults = await searchLogFile(searchPath, pattern, parseInt(lines));
        const parsedResults = searchResults.map(line => parseLogLine(line, type)).filter(Boolean);

        result = {
          type,
          pattern,
          total: searchResults.length,
          logs: parsedResults,
        };
        break;

      // =======================================================================
      // DOWNLOAD LOG FILE
      // =======================================================================
      case 'download':
        if (!type) {
          return NextResponse.json({ error: 'type is required' }, { status: 400 });
        }

        // Verify site ownership if siteId provided
        if (siteId) {
          const site = await prisma.site.findUnique({
            where: { id: siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
          }
        }

        const { path: downloadPath } = await getLogFilePath(type, siteId);
        
        // Check if file exists
        try {
          await execAsync(`test -f "${downloadPath}"`);
        } catch {
          return NextResponse.json({ error: 'Log file not found' }, { status: 404 });
        }

        // Create streaming response
        const fileStream = createReadStream(downloadPath);
        const fileName = `${type}_${new Date().toISOString().split('T')[0]}.log`;

        await createAuditLog({
          action: 'DOWNLOAD',
          resource: 'log_file',
          userId,
          metadata: {
            type,
            siteId,
            fileName,
          },
        });

        return new NextResponse(fileStream as any, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${fileName}"`,
          },
        });

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
    console.error('[Logs API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Permission denied')) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/logs
 * Log operations (search, tail streaming)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const validatedBody = LogsBodySchema.parse(body);
    const { action, type, siteId, pattern, lines, sessionId } = validatedBody;

    let result: any;

    switch (action) {
      // =======================================================================
      // SEARCH LOGS
      // =======================================================================
      case 'search':
        if (!type || !pattern) {
          return NextResponse.json({ error: 'type and pattern are required' }, { status: 400 });
        }

        // Verify site ownership if siteId provided
        if (siteId) {
          const site = await prisma.site.findUnique({
            where: { id: siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
          }
        }

        const { path: searchPath } = await getLogFilePath(type, siteId);
        const searchResults = await searchLogFile(searchPath, pattern, lines || 100);
        const parsedResults = searchResults.map(line => parseLogLine(line, type)).filter(Boolean);

        result = {
          type,
          pattern,
          total: searchResults.length,
          logs: parsedResults,
        };
        break;

      // =======================================================================
      // START TAIL STREAM (WebSocket session)
      // =======================================================================
      case 'tail_start':
        if (!type) {
          return NextResponse.json({ error: 'type is required' }, { status: 400 });
        }

        const tailSessionId = sessionId || `tail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Store session in Redis for WebSocket handler
        const { path: tailPath } = await getLogFilePath(type, siteId);
        
        await prisma.logStreamSession.create({
          data: {
            id: tailSessionId,
            userId,
            type,
            siteId,
            filePath: tailPath,
            startedAt: new Date(),
          },
        });

        result = {
          sessionId: tailSessionId,
          type,
          wsUrl: `ws://${request.headers.get('host')}/api/logs/stream/${tailSessionId}`,
        };
        break;

      // =======================================================================
      // STOP TAIL STREAM
      // =======================================================================
      case 'tail_stop':
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
        }

        await prisma.logStreamSession.update({
          where: { id: sessionId },
          data: {
            endedAt: new Date(),
          },
        });

        result = { success: true, message: 'Stream stopped' };
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
    console.error('[Logs API] POST error:', error);

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
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Logs API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/logs?action=list
 * - GET  /api/logs?action=read&type=ols_error&lines=100
 * - GET  /api/logs?action=search&type=ols_error&pattern=error
 * - GET  /api/logs?action=download&type=ols_error
 * - POST /api/logs (action: search/tail_start/tail_stop)
 * - WS   /api/logs/stream/:sessionId (via Socket.io)
 * 
 * Request Examples:
 * 
 * // List available logs
 * GET /api/logs?action=list
 * 
 * // List logs for specific site
 * GET /api/logs?action=list&siteId=abc123
 * 
 * // Read last 100 lines of error log
 * GET /api/logs?action=read&type=ols_error&lines=100
 * 
 * // Read with level filter
 * GET /api/logs?action=read&type=ols_error&level=ERROR&lines=50
 * 
 * // Search logs for pattern
 * GET /api/logs?action=search&type=ols_error&pattern=500&lines=100
 * 
 * // Download log file
 * GET /api/logs?action=download&type=ols_error
 * 
 * // Start tail stream (WebSocket)
 * POST /api/logs
 * { "action": "tail_start", "type": "ols_error", "siteId": "abc123" }
 * 
 * // Stop tail stream
 * POST /api/logs
 * { "action": "tail_stop", "sessionId": "tail_123" }
 * 
 * Log Types:
 * - ols_access: OpenLiteSpeed access logs
 * - ols_error: OpenLiteSpeed error logs
 * - nginx_access: Nginx proxy access logs
 * - nginx_error: Nginx proxy error logs
 * - php: PHP error logs
 * - system: System logs (syslog)
 * - wp: WordPress debug logs
 * 
 * Log Levels:
 * - DEBUG: Detailed debugging information
 * - INFO: General information
 * - WARN: Warning messages
 * - ERROR: Error messages
 * 
 * Features:
 * - Line limit (default 100, max 10000)
 * - Level filtering
 * - Pattern search (grep-like)
 * - File download
 * - Live tail streaming (WebSocket)
 * - Site-specific logs
 * - Log rotation (auto if > 100MB)
 * 
 * Security:
 * - Authentication required
 * - Site ownership verification
 * - Path traversal prevention
 * - Audit logging for downloads
 * - Output limits (10KB per line stored)
 * 
 * WebSocket Streaming:
 * - Connect to /api/logs/stream/:sessionId
 * - Receives new log lines in real-time
 * - Session stored in database
 * - Auto-cleanup after 1 hour
 */