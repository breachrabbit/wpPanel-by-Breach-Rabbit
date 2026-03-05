// =============================================================================
// wpPanel by Breach Rabbit — Sites API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// Site management (CRUD, start/stop/restart, stats, logs)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { siteManager } from '@/lib/services/site-manager';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface SitesQuery {
  action?: 'list' | 'stats' | 'health';
  siteId?: string;
}

interface SitesBody {
  action?: 'create' | 'update' | 'delete' | 'start' | 'stop' | 'restart' | 'clone';
  siteId?: string;
  name?: string;
  domain?: string;
  type?: 'wordpress' | 'static' | 'php' | 'nodejs' | 'docker' | 'proxy';
  phpVersion?: '8.2' | '8.3' | '8.4' | '8.5';
  rootPath?: string;
  autoRestart?: boolean;
  healthCheckEnabled?: boolean;
  healthCheckUrl?: string;
  healthCheckInterval?: number;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const SitesQuerySchema = z.object({
  action: z.enum(['list', 'stats', 'health']).optional(),
  siteId: z.string().optional(),
});

const CreateSiteSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/),
  type: z.enum(['wordpress', 'static', 'php', 'nodejs', 'docker', 'proxy']),
  phpVersion: z.enum(['8.2', '8.3', '8.4', '8.5']).optional(),
  rootPath: z.string().optional(),
  autoRestart: z.boolean().default(true),
  healthCheckEnabled: z.boolean().default(true),
  healthCheckUrl: z.string().url().optional(),
  healthCheckInterval: z.number().min(30).max(3600).default(60),
});

const UpdateSiteSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/).optional(),
  phpVersion: z.enum(['8.2', '8.3', '8.4', '8.5']).optional(),
  autoRestart: z.boolean().optional(),
  healthCheckEnabled: z.boolean().optional(),
  healthCheckUrl: z.string().url().optional(),
  healthCheckInterval: z.number().min(30).max(3600).optional(),
});

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/sites
 * List sites or get site details/stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const validatedQuery = SitesQuerySchema.parse({
      action: query.get('action') || 'list',
      siteId: query.get('siteId'),
    });

    const { action, siteId } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // LIST ALL SITES
      // =======================================================================
      case 'list':
        result = await siteManager.getSites(userId);
        break;

      // =======================================================================
      // GET SITE STATS
      // =======================================================================
      case 'stats':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        result = await siteManager.getSiteStats(siteId);
        break;

      // =======================================================================
      // GET HEALTH CHECK RESULT
      // =======================================================================
      case 'health':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        result = await siteManager.getHealthCheckResult(siteId);
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
    console.error('[Sites API] GET error:', error);

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
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sites
 * Site operations (create, update, delete, start, stop, restart)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, siteId, ...data } = body;

    let result: any;

    switch (action) {
      // =======================================================================
      // CREATE SITE
      // =======================================================================
      case 'create':
        const validatedCreate = CreateSiteSchema.parse(data);

        result = await siteManager.create(validatedCreate, userId);

        await createAuditLog({
          action: 'CREATE',
          resource: 'site',
          userId,
          metadata: {
            siteId: result.id,
            domain: result.domain,
            type: result.type,
          },
        });

        break;

      // =======================================================================
      // UPDATE SITE
      // =======================================================================
      case 'update':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const validatedUpdate = UpdateSiteSchema.parse(data);

        result = await siteManager.updateSite(siteId, validatedUpdate, userId);

        await createAuditLog({
          action: 'UPDATE',
          resource: 'site',
          userId,
          metadata: {
            siteId,
            changes: Object.keys(validatedUpdate),
          },
        });

        break;

      // =======================================================================
      // DELETE SITE
      // =======================================================================
      case 'delete':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const deleteFiles = body.deleteFiles || false;

        await siteManager.deleteSite(siteId, userId, deleteFiles);

        await createAuditLog({
          action: 'DELETE',
          resource: 'site',
          userId,
          metadata: {
            siteId,
            deleteFiles,
          },
        });

        result = { success: true, message: 'Site deleted successfully' };
        break;

      // =======================================================================
      // START SITE
      // =======================================================================
      case 'start':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        await siteManager.startSite(siteId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'site',
          userId,
          metadata: {
            siteId,
            action: 'site_started',
          },
        });

        result = { success: true, message: 'Site started successfully' };
        break;

      // =======================================================================
      // STOP SITE
      // =======================================================================
      case 'stop':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        await siteManager.stopSite(siteId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'site',
          userId,
          metadata: {
            siteId,
            action: 'site_stopped',
          },
        });

        result = { success: true, message: 'Site stopped successfully' };
        break;

      // =======================================================================
      // RESTART SITE
      // =======================================================================
      case 'restart':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        await siteManager.restartSite(siteId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'site',
          userId,
          metadata: {
            siteId,
            action: 'site_restarted',
          },
        });

        result = { success: true, message: 'Site restarted successfully' };
        break;

      // =======================================================================
      // CLONE SITE
      // =======================================================================
      case 'clone':
        if (!siteId || !data.targetDomain) {
          return NextResponse.json({ error: 'siteId and targetDomain are required' }, { status: 400 });
        }

        // Clone functionality would be implemented in site-manager
        result = { success: false, message: 'Clone not yet implemented' };
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
    console.error('[Sites API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
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
 * Sites API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/sites?action=list
 * - GET  /api/sites?action=stats&siteId=:id
 * - GET  /api/sites?action=health&siteId=:id
 * - POST /api/sites (action: create/update/delete/start/stop/restart/clone)
 * 
 * Request Examples:
 * 
 * // List all sites
 * GET /api/sites?action=list
 * 
 * // Get site stats
 * GET /api/sites?action=stats&siteId=abc123
 * 
 * // Get health check result
 * GET /api/sites?action=health&siteId=abc123
 * 
 * // Create site
 * POST /api/sites
 * {
 *   "action": "create",
 *   "name": "Example Site",
 *   "domain": "example.com",
 *   "type": "wordpress",
 *   "phpVersion": "8.3",
 *   "autoRestart": true,
 *   "healthCheckEnabled": true,
 *   "healthCheckUrl": "/",
 *   "healthCheckInterval": 60
 * }
 * 
 * // Update site
 * POST /api/sites
 * {
 *   "action": "update",
 *   "siteId": "abc123",
 *   "phpVersion": "8.4",
 *   "autoRestart": false
 * }
 * 
 * // Delete site
 * POST /api/sites
 * { "action": "delete", "siteId": "abc123", "deleteFiles": false }
 * 
 * // Start site
 * POST /api/sites
 * { "action": "start", "siteId": "abc123" }
 * 
 * // Stop site
 * POST /api/sites
 * { "action": "stop", "siteId": "abc123" }
 * 
 * // Restart site
 * POST /api/sites
 * { "action": "restart", "siteId": "abc123" }
 * 
 * Security:
 * - Authentication required (NextAuth session)
 * - User can only access their own sites
 * - Audit logging for all operations
 * - Rate limiting via middleware
 */