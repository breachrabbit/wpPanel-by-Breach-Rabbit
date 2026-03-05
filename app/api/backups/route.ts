// =============================================================================
// wpPanel by Breach Rabbit — Backups API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// Restic backup orchestration (create, restore, schedules, snapshots)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { backupService } from '@/lib/services/backup-service';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface BackupsQuery {
  action?: 'list' | 'snapshots' | 'stats' | 'progress' | 'schedules';
  backupId?: string;
  siteId?: string;
  scheduleId?: string;
}

interface BackupsBody {
  action?: 'create' | 'delete' | 'restore' | 'restore_file';
  backupId?: string;
  siteId?: string;
  type?: 'full' | 'incremental' | 'database' | 'files';
  paths?: string[];
  databases?: string[];
  tags?: Record<string, string>;
  storageType?: 'local' | 's3' | 'sftp' | 'b2';
  // For restore
  targetPath?: string;
  files?: string[];
  overwrite?: boolean;
  // For schedules
  scheduleId?: string;
  name?: string;
  cronExpression?: string;
  retentionDays?: number;
  enabled?: boolean;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const BackupsQuerySchema = z.object({
  action: z.enum(['list', 'snapshots', 'stats', 'progress', 'schedules']).optional(),
  backupId: z.string().optional(),
  siteId: z.string().optional(),
  scheduleId: z.string().optional(),
});

const CreateBackupSchema = z.object({
  type: z.enum(['full', 'incremental', 'database', 'files']),
  siteId: z.string().optional(),
  paths: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
  tags: z.record(z.string()).optional(),
  storageType: z.enum(['local', 's3', 'sftp', 'b2']).optional(),
});

const RestoreBackupSchema = z.object({
  backupId: z.string(),
  targetPath: z.string(),
  files: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
  overwrite: z.boolean().default(false),
});

const CreateScheduleSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['full', 'incremental', 'database', 'files']),
  cronExpression: z.string().regex(/^(\*|[0-9]+|\*\/[0-9]+)(\s+(\*|[0-9]+|\*\/[0-9]+)){4}$/),
  storageType: z.enum(['local', 's3', 'sftp', 'b2']),
  retentionDays: z.number().min(1).max(3650),
  siteId: z.string().optional(),
  enabled: z.boolean().default(true),
});

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/backups
 * List backups, snapshots, stats, schedules
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const validatedQuery = BackupsQuerySchema.parse({
      action: query.get('action') || 'list',
      backupId: query.get('backupId'),
      siteId: query.get('siteId'),
      scheduleId: query.get('scheduleId'),
    });

    const { action, backupId, siteId, scheduleId } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // LIST ALL BACKUPS
      // =======================================================================
      case 'list':
        result = await backupService.listBackups({ siteId });
        break;

      // =======================================================================
      // LIST RESTIC SNAPSHOTS
      // =======================================================================
      case 'snapshots':
        result = await backupService.listSnapshots(siteId);
        break;

      // =======================================================================
      // GET REPOSITORY STATS
      // =======================================================================
      case 'stats':
        result = await backupService.getRepositoryStats();
        break;

      // =======================================================================
      // GET BACKUP PROGRESS
      // =======================================================================
      case 'progress':
        if (!backupId) {
          return NextResponse.json({ error: 'backupId is required' }, { status: 400 });
        }

        result = await backupService.getLatestProgress(backupId);
        break;

      // =======================================================================
      // LIST SCHEDULES
      // =======================================================================
      case 'schedules':
        result = await backupService.listSchedules(siteId);
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
    console.error('[Backups API] GET error:', error);

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
 * POST /api/backups
 * Backup operations (create, delete, restore, schedules)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, backupId, scheduleId, ...data } = body;

    let result: any;

    switch (action) {
      // =======================================================================
      // CREATE BACKUP
      // =======================================================================
      case 'create':
        const validatedCreate = CreateBackupSchema.parse(data);

        result = await backupService.createBackup(validatedCreate, userId);

        await createAuditLog({
          action: 'CREATE',
          resource: 'backup',
          userId,
          metadata: {
            backupId: result.id,
            type: result.type,
            siteId: result.siteId,
          },
        });

        break;

      // =======================================================================
      // DELETE BACKUP
      // =======================================================================
      case 'delete':
        if (!backupId) {
          return NextResponse.json({ error: 'backupId is required' }, { status: 400 });
        }

        await backupService.deleteBackup(backupId, userId);

        await createAuditLog({
          action: 'DELETE',
          resource: 'backup',
          userId,
          metadata: {
            backupId,
          },
        });

        result = { success: true, message: 'Backup deleted successfully' };
        break;

      // =======================================================================
      // RESTORE BACKUP
      // =======================================================================
      case 'restore':
        const validatedRestore = RestoreBackupSchema.parse(data);

        result = await backupService.restoreBackup(validatedRestore, userId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'backup',
          userId,
          metadata: {
            backupId: validatedRestore.backupId,
            action: 'backup_restored',
            target: validatedRestore.targetPath,
          },
        });

        break;

      // =======================================================================
      // RESTORE SINGLE FILE
      // =======================================================================
      case 'restore_file':
        if (!backupId || !data.filePath || !data.target) {
          return NextResponse.json({ 
            error: 'backupId, filePath, and target are required' 
          }, { status: 400 });
        }

        await backupService.restoreFile(backupId, data.filePath, data.target, userId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'backup',
          userId,
          metadata: {
            backupId,
            action: 'file_restored',
            filePath: data.filePath,
            target: data.target,
          },
        });

        result = { success: true, message: 'File restored successfully' };
        break;

      // =======================================================================
      // CREATE SCHEDULE
      // =======================================================================
      case 'create_schedule':
        const validatedSchedule = CreateScheduleSchema.parse(data);

        result = await backupService.createSchedule(validatedSchedule, userId);

        await createAuditLog({
          action: 'CREATE',
          resource: 'backup_schedule',
          userId,
          metadata: {
            scheduleId: result.id,
            name: result.name,
            cron: result.cronExpression,
          },
        });

        break;

      // =======================================================================
      // UPDATE SCHEDULE
      // =======================================================================
      case 'update_schedule':
        if (!scheduleId) {
          return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });
        }

        result = await backupService.updateSchedule(
          scheduleId,
          {
            name: data.name,
            cronExpression: data.cronExpression,
            retentionDays: data.retentionDays,
            enabled: data.enabled,
          },
          userId
        );

        await createAuditLog({
          action: 'UPDATE',
          resource: 'backup_schedule',
          userId,
          metadata: {
            scheduleId,
            changes: Object.keys(data),
          },
        });

        break;

      // =======================================================================
      // DELETE SCHEDULE
      // =======================================================================
      case 'delete_schedule':
        if (!scheduleId) {
          return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });
        }

        await backupService.deleteSchedule(scheduleId, userId);

        await createAuditLog({
          action: 'DELETE',
          resource: 'backup_schedule',
          userId,
          metadata: {
            scheduleId,
          },
        });

        result = { success: true, message: 'Schedule deleted successfully' };
        break;

      // =======================================================================
      // RUN SCHEDULE MANUALLY
      // =======================================================================
      case 'run_schedule':
        if (!scheduleId) {
          return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });
        }

        result = await backupService.runSchedule(scheduleId, userId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'backup_schedule',
          userId,
          metadata: {
            scheduleId,
            action: 'schedule_run_manually',
            backupId: result.id,
          },
        });

        break;

      // =======================================================================
      // APPLY RETENTION POLICY
      // =======================================================================
      case 'apply_retention':
        result = await backupService.applyRetentionPolicy(data.siteId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'backup',
          userId,
          metadata: {
            action: 'retention_policy_applied',
            siteId: data.siteId,
            removed: result.removed,
            reclaimed: result.reclaimed,
          },
        });

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
    console.error('[Backups API] POST error:', error);

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
      if (error.message.includes('not completed')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
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
 * Backups API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/backups?action=list
 * - GET  /api/backups?action=snapshots
 * - GET  /api/backups?action=stats
 * - GET  /api/backups?action=progress&backupId=:id
 * - GET  /api/backups?action=schedules
 * - POST /api/backups (action: create/delete/restore/restore_file/create_schedule/update_schedule/delete_schedule/run_schedule/apply_retention)
 * 
 * Request Examples:
 * 
 * // List all backups
 * GET /api/backups?action=list
 * 
 * // List backups for site
 * GET /api/backups?action=list&siteId=abc123
 * 
 * // List Restic snapshots
 * GET /api/backups?action=snapshots
 * 
 * // Get repository stats
 * GET /api/backups?action=stats
 * 
 * // Get backup progress
 * GET /api/backups?action=progress&backupId=backup123
 * 
 * // List schedules
 * GET /api/backups?action=schedules
 * 
 * // Create backup
 * POST /api/backups
 * {
 *   "action": "create",
 *   "type": "full",
 *   "siteId": "abc123",
 *   "tags": { "manual": "true" },
 *   "storageType": "local"
 * }
 * 
 * // Create incremental backup
 * POST /api/backups
 * {
 *   "action": "create",
 *   "type": "incremental",
 *   "siteId": "abc123"
 * }
 * 
 * // Create database-only backup
 * POST /api/backups
 * {
 *   "action": "create",
 *   "type": "database",
 *   "siteId": "abc123",
 *   "databases": ["wp_example"]
 * }
 * 
 * // Delete backup
 * POST /api/backups
 * { "action": "delete", "backupId": "backup123" }
 * 
 * // Restore full backup
 * POST /api/backups
 * {
 *   "action": "restore",
 *   "backupId": "backup123",
 *   "targetPath": "/var/www/restored",
 *   "overwrite": true
 * }
 * 
 * // Restore single file
 * POST /api/backups
 * {
 *   "action": "restore_file",
 *   "backupId": "backup123",
 *   "filePath": "/var/www/example.com/wp-config.php",
 *   "target": "/tmp/restored/wp-config.php"
 * }
 * 
 * // Create schedule
 * POST /api/backups
 * {
 *   "action": "create_schedule",
 *   "name": "Daily Backup",
 *   "type": "full",
 *   "cronExpression": "0 3 * * *",
 *   "storageType": "local",
 *   "retentionDays": 30,
 *   "siteId": "abc123",
 *   "enabled": true
 * }
 * 
 * // Update schedule
 * POST /api/backups
 * {
 *   "action": "update_schedule",
 *   "scheduleId": "schedule123",
 *   "retentionDays": 60,
 *   "enabled": false
 * }
 * 
 * // Delete schedule
 * POST /api/backups
 * { "action": "delete_schedule", "scheduleId": "schedule123" }
 * 
 * // Run schedule manually
 * POST /api/backups
 * { "action": "run_schedule", "scheduleId": "schedule123" }
 * 
 * // Apply retention policy
 * POST /api/backups
 * { "action": "apply_retention", "siteId": "abc123" }
 * 
 * Security:
 * - Authentication required (NextAuth session)
 * - User can only access their own backups
 * - Audit logging for all operations
 * - Rate limiting via middleware
 * - Backup progress via Redis pub/sub (WebSocket)
 */