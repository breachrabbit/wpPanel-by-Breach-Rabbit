// =============================================================================
// wpPanel by Breach Rabbit — Cron API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// Cron job management (CRUD, run, logs, scheduling)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface CronQuery {
  action?: 'list' | 'info' | 'logs';
  cronId?: string;
  siteId?: string;
}

interface CronBody {
  action?: 'create' | 'update' | 'delete' | 'run' | 'toggle';
  cronId?: string;
  command?: string;
  schedule?: string;
  user?: string;
  siteId?: string;
  enabled?: boolean;
  description?: string;
}

interface CronJob {
  id: string;
  command: string;
  schedule: string;
  user: string;
  siteId?: string;
  enabled: boolean;
  description?: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const CronQuerySchema = z.object({
  action: z.enum(['list', 'info', 'logs']).optional(),
  cronId: z.string().optional(),
  siteId: z.string().optional(),
});

const CreateCronSchema = z.object({
  command: z.string().min(1).max(1000),
  schedule: z.string().regex(/^(\*|[0-9]+|\*\/[0-9]+)(\s+(\*|[0-9]+|\*\/[0-9]+)){4}$/),
  user: z.string().default('www-data'),
  siteId: z.string().optional(),
  description: z.string().max(255).optional(),
});

const UpdateCronSchema = z.object({
  command: z.string().min(1).max(1000).optional(),
  schedule: z.string().regex(/^(\*|[0-9]+|\*\/[0-9]+)(\s+(\*|[0-9]+|\*\/[0-9]+)){4}$/).optional(),
  user: z.string().optional(),
  description: z.string().max(255).optional(),
  enabled: z.boolean().optional(),
});

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Parse cron expression to human readable
 */
function parseCronExpression(expression: string): string {
  const parts = expression.split(/\s+/);
  if (parts.length !== 5) return expression;

  const [minute, hour, day, month, weekday] = parts;
  const descriptions: string[] = [];

  // Minute
  if (minute === '*') descriptions.push('every minute');
  else if (minute === '0') descriptions.push('at :00');
  else descriptions.push(`at minute ${minute}`);

  // Hour
  if (hour === '*') descriptions.push('every hour');
  else descriptions.push(`at hour ${hour}`);

  // Day
  if (day === '*') descriptions.push('every day');
  else descriptions.push(`on day ${day}`);

  // Month
  if (month === '*') descriptions.push('every month');
  else descriptions.push(`in month ${month}`);

  // Weekday
  if (weekday === '*') descriptions.push('every weekday');
  else descriptions.push(`on weekday ${weekday}`);

  return descriptions.join(' ');
}

/**
 * Calculate next run time from cron expression
 */
function calculateNextRun(cronExpression: string): Date {
  // Simple implementation - use node-cron in production
  const now = new Date();
  return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
}

/**
 * Get system cron jobs for user
 */
async function getSystemCrons(user: string = 'www-data'): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`crontab -u ${user} -l 2>/dev/null || echo ""`);
    return stdout.trim().split('\n').filter(line => line && !line.startsWith('#'));
  } catch {
    return [];
  }
}

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/cron
 * List cron jobs or get job info/logs
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const validatedQuery = CronQuerySchema.parse({
      action: query.get('action') || 'list',
      cronId: query.get('cronId'),
      siteId: query.get('siteId'),
    });

    const { action, cronId, siteId } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // LIST ALL CRON JOBS
      // =======================================================================
      case 'list':
        const where: any = {};
        
        // Filter by site if provided
        if (siteId) {
          const site = await prisma.site.findUnique({
            where: { id: siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
          }
          
          where.siteId = siteId;
        } else {
          // Get all sites for user
          const sites = await prisma.site.findMany({
            where: { userId },
            select: { id: true },
          });
          
          where.siteId = { in: sites.map(s => s.id) };
        }

        const cronJobs = await prisma.cronJob.findMany({
          where,
          include: {
            site: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Add human readable schedule
        result = cronJobs.map(job => ({
          ...job,
          scheduleHuman: parseCronExpression(job.schedule),
          nextRunAt: calculateNextRun(job.schedule),
        }));
        break;

      // =======================================================================
      // GET CRON JOB INFO
      // =======================================================================
      case 'info':
        if (!cronId) {
          return NextResponse.json({ error: 'cronId is required' }, { status: 400 });
        }

        const cronJob = await prisma.cronJob.findUnique({
          where: { id: cronId },
          include: {
            site: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
          },
        });

        if (!cronJob) {
          return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
        }

        // Verify ownership
        if (cronJob.site) {
          const site = await prisma.site.findUnique({
            where: { id: cronJob.siteId!, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        result = {
          ...cronJob,
          scheduleHuman: parseCronExpression(cronJob.schedule),
          nextRunAt: calculateNextRun(cronJob.schedule),
        };
        break;

      // =======================================================================
      // GET CRON JOB LOGS
      // =======================================================================
      case 'logs':
        if (!cronId) {
          return NextResponse.json({ error: 'cronId is required' }, { status: 400 });
        }

        const logs = await prisma.cronLog.findMany({
          where: { cronId },
          orderBy: { executedAt: 'desc' },
          take: 100,
        });

        result = logs;
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
    console.error('[Cron API] GET error:', error);

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
 * POST /api/cron
 * Cron operations (create, update, delete, run, toggle)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, cronId, ...data } = body;

    let result: any;

    switch (action) {
      // =======================================================================
      // CREATE CRON JOB
      // =======================================================================
      case 'create':
        const validatedCreate = CreateCronSchema.parse(data);

        // Verify site ownership if siteId provided
        if (data.siteId) {
          const site = await prisma.site.findUnique({
            where: { id: data.siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Site not found' }, { status: 404 });
          }
        }

        const cronJob = await prisma.cronJob.create({
          data: {
            id: `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            command: validatedCreate.command,
            schedule: validatedCreate.schedule,
            user: validatedCreate.user,
            siteId: validatedCreate.siteId,
            description: validatedCreate.description,
            enabled: true,
            nextRunAt: calculateNextRun(validatedCreate.schedule),
          },
        });

        // Add to system crontab
        try {
          await addToSystemCron(cronJob);
        } catch (error) {
          console.error('[Cron API] Failed to add to system cron:', error);
        }

        await createAuditLog({
          action: 'CREATE',
          resource: 'cron_job',
          userId,
          metadata: {
            cronId: cronJob.id,
            command: cronJob.command,
            schedule: cronJob.schedule,
          },
        });

        result = {
          ...cronJob,
          scheduleHuman: parseCronExpression(cronJob.schedule),
          nextRunAt: calculateNextRun(cronJob.schedule),
        };
        break;

      // =======================================================================
      // UPDATE CRON JOB
      // =======================================================================
      case 'update':
        if (!cronId) {
          return NextResponse.json({ error: 'cronId is required' }, { status: 400 });
        }

        const existingJob = await prisma.cronJob.findUnique({
          where: { id: cronId },
        });

        if (!existingJob) {
          return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
        }

        // Verify ownership
        if (existingJob.siteId) {
          const site = await prisma.site.findUnique({
            where: { id: existingJob.siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        const validatedUpdate = UpdateCronSchema.parse(data);

        const updatedJob = await prisma.cronJob.update({
          where: { id: cronId },
          data: {
            ...validatedUpdate,
            nextRunAt: validatedUpdate.schedule ? calculateNextRun(validatedUpdate.schedule) : undefined,
          },
        });

        // Update system crontab
        try {
          await removeFromSystemCron(existingJob);
          if (updatedJob.enabled) {
            await addToSystemCron(updatedJob);
          }
        } catch (error) {
          console.error('[Cron API] Failed to update system cron:', error);
        }

        await createAuditLog({
          action: 'UPDATE',
          resource: 'cron_job',
          userId,
          metadata: {
            cronId,
            changes: Object.keys(validatedUpdate),
          },
        });

        result = {
          ...updatedJob,
          scheduleHuman: parseCronExpression(updatedJob.schedule),
          nextRunAt: calculateNextRun(updatedJob.schedule),
        };
        break;

      // =======================================================================
      // DELETE CRON JOB
      // =======================================================================
      case 'delete':
        if (!cronId) {
          return NextResponse.json({ error: 'cronId is required' }, { status: 400 });
        }

        const deleteJob = await prisma.cronJob.findUnique({
          where: { id: cronId },
        });

        if (!deleteJob) {
          return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
        }

        // Verify ownership
        if (deleteJob.siteId) {
          const site = await prisma.site.findUnique({
            where: { id: deleteJob.siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        // Remove from system crontab
        try {
          await removeFromSystemCron(deleteJob);
        } catch (error) {
          console.error('[Cron API] Failed to remove from system cron:', error);
        }

        await prisma.cronJob.delete({
          where: { id: cronId },
        });

        await createAuditLog({
          action: 'DELETE',
          resource: 'cron_job',
          userId,
          metadata: {
            cronId,
          },
        });

        result = { success: true, message: 'Cron job deleted successfully' };
        break;

      // =======================================================================
      // RUN CRON JOB MANUALLY
      // =======================================================================
      case 'run':
        if (!cronId) {
          return NextResponse.json({ error: 'cronId is required' }, { status: 400 });
        }

        const runJob = await prisma.cronJob.findUnique({
          where: { id: cronId },
        });

        if (!runJob) {
          return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
        }

        // Verify ownership
        if (runJob.siteId) {
          const site = await prisma.site.findUnique({
            where: { id: runJob.siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        // Execute command
        const startTime = Date.now();
        let stdout = '';
        let stderr = '';
        let exitCode = 0;

        try {
          const execResult = await execAsync(runJob.command, {
            timeout: 3600000, // 1 hour max
            maxBuffer: 1024 * 1024 * 50, // 50MB
          });
          stdout = execResult.stdout;
          stderr = execResult.stderr;
        } catch (error: any) {
          stderr = error.stderr || error.message;
          exitCode = error.code || 1;
        }

        const duration = Date.now() - startTime;

        // Log execution
        const log = await prisma.cronLog.create({
          data: {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            cronId,
            executedAt: new Date(),
            duration,
            exitCode,
            stdout: stdout.slice(0, 10000), // Limit storage
            stderr: stderr.slice(0, 10000),
            success: exitCode === 0,
          },
        });

        // Update last run
        await prisma.cronJob.update({
          where: { id: cronId },
          data: {
            lastRunAt: new Date(),
            nextRunAt: calculateNextRun(runJob.schedule),
          },
        });

        result = {
          success: exitCode === 0,
          logId: log.id,
          duration,
          exitCode,
          output: stdout || stderr,
        };
        break;

      // =======================================================================
      // TOGGLE CRON JOB (ENABLE/DISABLE)
      // =======================================================================
      case 'toggle':
        if (!cronId) {
          return NextResponse.json({ error: 'cronId is required' }, { status: 400 });
        }

        const toggleJob = await prisma.cronJob.findUnique({
          where: { id: cronId },
        });

        if (!toggleJob) {
          return NextResponse.json({ error: 'Cron job not found' }, { status: 404 });
        }

        // Verify ownership
        if (toggleJob.siteId) {
          const site = await prisma.site.findUnique({
            where: { id: toggleJob.siteId, userId },
          });
          
          if (!site) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        const newEnabledState = !toggleJob.enabled;

        const toggledJob = await prisma.cronJob.update({
          where: { id: cronId },
          data: { enabled: newEnabledState },
        });

        // Update system crontab
        try {
          if (newEnabledState) {
            await addToSystemCron(toggledJob);
          } else {
            await removeFromSystemCron(toggledJob);
          }
        } catch (error) {
          console.error('[Cron API] Failed to toggle system cron:', error);
        }

        await createAuditLog({
          action: 'UPDATE',
          resource: 'cron_job',
          userId,
          metadata: {
            cronId,
            action: newEnabledState ? 'enabled' : 'disabled',
          },
        });

        result = {
          ...toggledJob,
          enabled: newEnabledState,
        };
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
    console.error('[Cron API] POST error:', error);

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
// 🔧 SYSTEM CRON HELPERS
// =============================================================================

/**
 * Add cron job to system crontab
 */
async function addToSystemCron(job: any): Promise<void> {
  const user = job.user || 'www-data';
  const cronLine = `${job.schedule} ${job.command} # wpPanel:${job.id}`;
  
  // Get existing crontab
  const { stdout: existing } = await execAsync(`crontab -u ${user} -l 2>/dev/null || echo ""`);
  
  // Remove old entry for this job if exists
  const lines = existing.split('\n').filter(line => !line.includes(`wpPanel:${job.id}`));
  
  // Add new entry
  lines.push(cronLine);
  
  // Write back
  const newCrontab = lines.join('\n');
  await execAsync(`echo "${newCrontab}" | crontab -u ${user} -`);
}

/**
 * Remove cron job from system crontab
 */
async function removeFromSystemCron(job: any): Promise<void> {
  const user = job.user || 'www-data';
  
  // Get existing crontab
  const { stdout: existing } = await execAsync(`crontab -u ${user} -l 2>/dev/null || echo ""`);
  
  // Remove entry for this job
  const lines = existing.split('\n').filter(line => !line.includes(`wpPanel:${job.id}`));
  
  // Write back
  const newCrontab = lines.join('\n');
  await execAsync(`echo "${newCrontab}" | crontab -u ${user} -`);
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Cron API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/cron?action=list
 * - GET  /api/cron?action=info&cronId=:id
 * - GET  /api/cron?action=logs&cronId=:id
 * - POST /api/cron (action: create/update/delete/run/toggle)
 * 
 * Request Examples:
 * 
 * // List all cron jobs
 * GET /api/cron?action=list
 * 
 * // List cron jobs for site
 * GET /api/cron?action=list&siteId=abc123
 * 
 * // Get cron job info
 * GET /api/cron?action=info&cronId=cron123
 * 
 * // Get cron job logs
 * GET /api/cron?action=logs&cronId=cron123
 * 
 * // Create cron job
 * POST /api/cron
 * {
 *   "action": "create",
 *   "command": "wp cron event run --due-now --path=/var/www/example.com",
 *   "schedule": "0 * * * *",
 *   "user": "www-data",
 *   "siteId": "abc123",
 *   "description": "Run WP cron hourly"
 * }
 * 
 * // Update cron job
 * POST /api/cron
 * {
 *   "action": "update",
 *   "cronId": "cron123",
 *   "schedule": "0 3 * * *",
 *   "description": "Run daily at 3 AM"
 * }
 * 
 * // Delete cron job
 * POST /api/cron
 * { "action": "delete", "cronId": "cron123" }
 * 
 * // Run cron job manually
 * POST /api/cron
 * { "action": "run", "cronId": "cron123" }
 * 
 * // Toggle cron job (enable/disable)
 * POST /api/cron
 * { "action": "toggle", "cronId": "cron123" }
 * 
 * Cron Schedule Format:
 * ┌───────────── minute (0 - 59)
 * │ ┌───────────── hour (0 - 23)
 * │ │ ┌───────────── day of month (1 - 31)
 * │ │ │ ┌───────────── month (1 - 12)
 * │ │ │ │ ┌───────────── day of week (0 - 6)
 * │ │ │ │ │
 * * * * * *
 * 
 * Examples:
 * * * * * *   — Every minute
 * 0 * * * *   — Every hour at :00
 * 0 3 * * *   — Daily at 3:00 AM
 * 0 3 * * 0   — Weekly on Sunday at 3:00 AM
 * 0 3 1 * *   — Monthly on 1st at 3:00 AM
 * */5 * * * * — Every 5 minutes
 * 
 * Security:
 * - Authentication required
 * - Site ownership verification
 * - Command length limit (1000 chars)
 * - Execution timeout (1 hour)
 * - Output limit (50MB buffer, 10KB stored)
 * - Audit logging for all operations
 * - System crontab sync (per user)
 */