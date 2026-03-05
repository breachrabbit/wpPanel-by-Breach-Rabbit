// =============================================================================
// wpPanel by Breach Rabbit — Backup Service
// =============================================================================
// Service layer for Restic backup orchestration
// Features: full/incremental backup, schedules, restore, retention, multi-storage
// =============================================================================

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { createResticWrapper, ResticWrapper, Snapshot as ResticSnapshot } from '@/lib/integrations/restic-wrapper';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type BackupType = 'full' | 'incremental' | 'database' | 'files';
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StorageType = 'local' | 's3' | 'sftp' | 'b2';

export interface Backup {
  id: string;
  type: BackupType;
  status: BackupStatus;
  storageType: StorageType;
  sizeBytes?: number;
  uncompressedSizeBytes?: number;
  filesCount?: number;
  databasesCount?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: BackupType;
  cronExpression: string;
  storageType: StorageType;
  retentionDays: number;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  siteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBackupInput {
  type: BackupType;
  siteId?: string;
  paths?: string[];
  databases?: string[];
  tags?: Record<string, string>;
  storageType?: StorageType;
}

export interface CreateScheduleInput {
  name: string;
  type: BackupType;
  cronExpression: string;
  storageType: StorageType;
  retentionDays: number;
  siteId?: string;
  enabled?: boolean;
}

export interface RestoreInput {
  backupId: string;
  targetPath: string;
  files?: string[];
  databases?: string[];
  overwrite?: boolean;
}

export interface BackupProgress {
  backupId: string;
  status: BackupStatus;
  progress: number;
  currentFile?: string;
  filesProcessed: number;
  filesTotal?: number;
  bytesProcessed: number;
  bytesTotal?: number;
  speed: number;
  eta?: number;
  message: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const CreateBackupSchema = z.object({
  type: z.enum(['full', 'incremental', 'database', 'files']),
  siteId: z.string().optional(),
  paths: z.array(z.string()).optional(),
  databases: z.array(z.string()).optional(),
  tags: z.record(z.string()).optional(),
  storageType: z.enum(['local', 's3', 'sftp', 'b2']).optional(),
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
// ⚙️ CONSTANTS
// =============================================================================

const BACKUP_ROOT = process.env.BACKUP_ROOT || '/var/backups/wppanel';
const RESTIC_PASSWORD = process.env.RESTIC_PASSWORD || generateSecurePassword(32);

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate secure random string
 */
function generateSecureString(length: number = 32): string {
  const { randomBytes } = require('crypto');
  return randomBytes(length).toString('hex');
}

/**
 * Generate secure password
 */
function generateSecurePassword(length: number = 32): string {
  const { randomBytes } = require('crypto');
  return randomBytes(length).toString('base64').slice(0, length);
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
 * Format bytes to human-readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// 🏗️ BACKUP SERVICE
// =============================================================================

export class BackupService {
  private restic: ResticWrapper;

  constructor() {
    // Initialize Restic wrapper
    this.restic = createResticWrapper({
      repository: process.env.RESTIC_REPOSITORY || `${BACKUP_ROOT}/restic`,
      password: RESTIC_PASSWORD,
      storageType: (process.env.RESTIC_STORAGE_TYPE as StorageType) || 'local',
      s3: process.env.RESTIC_S3_CONFIG ? JSON.parse(process.env.RESTIC_S3_CONFIG) : undefined,
      sftp: process.env.RESTIC_SFTP_CONFIG ? JSON.parse(process.env.RESTIC_SFTP_CONFIG) : undefined,
      b2: process.env.RESTIC_B2_CONFIG ? JSON.parse(process.env.RESTIC_B2_CONFIG) : undefined,
    });
  }

  // =============================================================================
  // 📦 BACKUP CRUD
  // =============================================================================

  /**
   * Create backup
   */
  async createBackup(input: CreateBackupInput, userId: string): Promise<Backup> {
    // Validate input
    const validatedInput = CreateBackupSchema.parse(input);

    // Ensure backup directories exist
    await this.ensureDirectories();

    // Initialize restic repository if needed
    await this.initializeRepository();

    // Create database record
    const backup = await prisma.backup.create({
      data: {
        id: generateSecureString(16),
        type: validatedInput.type,
        status: 'pending',
        storageType: validatedInput.storageType || 'local',
        siteId: validatedInput.siteId,
        tags: validatedInput.tags || {},
      },
    });

    // Start backup in background
    this.executeBackup(backup.id, validatedInput, userId).catch(error => {
      console.error('[Backup] Background backup failed:', error);
    });

    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'backup',
      userId,
      metadata: {
        backupId: backup.id,
        type: backup.type,
        siteId: backup.siteId,
      },
    });

    return backup;
  }

  /**
   * Execute backup (background)
   */
  private async executeBackup(
    backupId: string,
    input: CreateBackupInput,
    userId: string
  ): Promise<void> {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
      include: { site: true },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    try {
      // Update status to running
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'running',
          startedAt: new Date(),
        },
      });

      // Emit progress start
      await this.emitProgress(backupId, {
        status: 'running',
        progress: 0,
        message: 'Starting backup...',
        filesProcessed: 0,
        bytesProcessed: 0,
        speed: 0,
      });

      // Determine paths to backup
      const paths: string[] = [];

      if (input.type === 'full' || input.type === 'files') {
        if (input.paths) {
          paths.push(...input.paths);
        } else if (backup.site) {
          paths.push(backup.site.rootPath);
        }
      }

      if (input.type === 'full' || input.type === 'database') {
        if (input.databases) {
          // Database dumps will be created before backup
          for (const db of input.databases) {
            const dumpPath = await this.createDatabaseDump(db);
            paths.push(dumpPath);
          }
        } else if (backup.site) {
          // Create database dump for site
          const dumpPath = await this.createDatabaseDumpForSite(backup.site.id);
          if (dumpPath) {
            paths.push(dumpPath);
          }
        }
      }

      // Execute restic backup
      const snapshot = await this.restic.backup({
        paths,
        tags: {
          ...input.tags,
          backup_id: backupId,
          type: backup.type,
          site_id: backup.siteId || 'unknown',
        },
        onProgress: async (progress) => {
          await this.emitProgress(backupId, {
            status: 'running',
            progress: progress.percent,
            message: progress.currentFile ? `Backing up ${progress.currentFile}` : 'Backing up...',
            filesProcessed: progress.filesProcessed,
            filesTotal: progress.filesTotal,
            bytesProcessed: progress.bytesProcessed,
            bytesTotal: progress.bytesTotal,
            speed: progress.speed,
            eta: progress.eta,
          });
        },
      });

      // Get repository stats
      const stats = await this.restic.stats();

      // Update backup record
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          sizeBytes: snapshot.sizeCompressed,
          uncompressedSizeBytes: snapshot.sizeBytes,
          filesCount: snapshot.fileCount,
          databasesCount: input.type.includes('database') ? 1 : 0,
        },
      });

      // Create ResticSnapshot record
      await prisma.resticSnapshot.create({
        data: {
          id: generateSecureString(16),
          snapshotId: snapshot.id,
          backupId: backup.id,
          hostname: snapshot.host,
          paths: snapshot.paths,
          tags: snapshot.tags,
          sizeBytes: BigInt(snapshot.sizeBytes || 0),
          snapshotTime: snapshot.time,
        },
      });

      // Emit progress complete
      await this.emitProgress(backupId, {
        status: 'completed',
        progress: 100,
        message: 'Backup completed successfully',
        filesProcessed: snapshot.fileCount || 0,
        bytesProcessed: snapshot.sizeCompressed || 0,
        speed: 0,
      });

      // Apply retention policy
      await this.applyRetentionPolicy(backup.siteId);

      // Create audit log
      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'backup',
        userId: 'system',
        metadata: {
          backupId: backup.id,
          action: 'backup_completed',
          size: snapshot.sizeCompressed,
          files: snapshot.fileCount,
        },
      });
    } catch (error) {
      // Update status to failed
      await prisma.backup.update({
        where: { id: backupId },
        data: {
          status: 'failed',
          completedAt: new Date(),
        },
      });

      // Emit progress error
      await this.emitProgress(backupId, {
        status: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Backup failed',
        filesProcessed: 0,
        bytesProcessed: 0,
        speed: 0,
      });

      // Create audit log
      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'backup',
        userId: 'system',
        metadata: {
          backupId: backup.id,
          action: 'backup_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  }

  /**
   * Get backup by ID
   */
  async getBackup(backupId: string): Promise<Backup | null> {
    return prisma.backup.findUnique({
      where: { id: backupId },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        resticSnapshots: true,
      },
    });
  }

  /**
   * List backups
   */
  async listBackups(options?: {
    siteId?: string;
    type?: BackupType;
    status?: BackupStatus;
    limit?: number;
  }): Promise<Backup[]> {
    const where: any = {};

    if (options?.siteId) {
      where.siteId = options.siteId;
    }

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.status) {
      where.status = options.status;
    }

    return prisma.backup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        resticSnapshots: {
          take: 1,
        },
      },
    });
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string, userId: string): Promise<void> {
    const backup = await this.getBackup(backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    try {
      // Delete from Restic (if snapshot exists)
      if (backup.resticSnapshots && backup.resticSnapshots.length > 0) {
        for (const snapshot of backup.resticSnapshots) {
          try {
            await this.restic.deleteSnapshot(snapshot.snapshotId);
          } catch (error) {
            console.error('[Backup] Failed to delete Restic snapshot:', error);
          }
        }
      }

      // Delete database record
      await prisma.backup.delete({
        where: { id: backupId },
      });

      // Create audit log
      await createAuditLog({
        action: 'DELETE',
        resource: 'backup',
        userId,
        metadata: {
          backupId: backup.id,
          type: backup.type,
        },
      });
    } catch (error) {
      console.error('[Backup] Failed to delete backup:', error);
      throw error;
    }
  }

  // =============================================================================
  // 🔄 RESTORE
  // =============================================================================

  /**
   * Restore from backup
   */
  async restoreBackup(input: RestoreInput, userId: string): Promise<{ success: boolean; restored: number }> {
    const backup = await this.getBackup(input.targetPath);

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (backup.status !== 'completed') {
      throw new Error('Backup is not completed');
    }

    // Get Restic snapshot
    const snapshot = await prisma.resticSnapshot.findFirst({
      where: { backupId: backup.id },
    });

    if (!snapshot) {
      throw new Error('Restic snapshot not found');
    }

    try {
      // Restore from Restic
      const result = await this.restic.restore({
        snapshotId: snapshot.snapshotId,
        target: input.targetPath,
        paths: input.files,
        overwrite: input.overwrite,
      });

      // Create audit log
      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'backup',
        userId,
        metadata: {
          backupId: backup.id,
          action: 'backup_restored',
          target: input.targetPath,
          files: input.files,
        },
      });

      return { success: true, restored: result.restored };
    } catch (error) {
      console.error('[Backup] Failed to restore backup:', error);
      throw error;
    }
  }

  /**
   * Restore single file from backup
   */
  async restoreFile(backupId: string, filePath: string, target: string, userId: string): Promise<void> {
    const backup = await this.getBackup(backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    const snapshot = await prisma.resticSnapshot.findFirst({
      where: { backupId: backup.id },
    });

    if (!snapshot) {
      throw new Error('Restic snapshot not found');
    }

    await this.restic.restoreFile(snapshot.snapshotId, filePath, target);

    // Create audit log
    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'backup',
      userId,
      metadata: {
        backupId: backup.id,
        action: 'file_restored',
        filePath,
        target,
      },
    });
  }

  // =============================================================================
  // 📅 SCHEDULES
  // =============================================================================

  /**
   * Create backup schedule
   */
  async createSchedule(input: CreateScheduleInput, userId: string): Promise<BackupSchedule> {
    // Validate input
    const validatedInput = CreateScheduleSchema.parse(input);

    const schedule = await prisma.backupSchedule.create({
      data: {
        id: generateSecureString(16),
        name: validatedInput.name,
        type: validatedInput.type,
        cronExpression: validatedInput.cronExpression,
        storageType: validatedInput.storageType,
        retentionDays: validatedInput.retentionDays,
        enabled: validatedInput.enabled ?? true,
        siteId: validatedInput.siteId,
        nextRunAt: calculateNextRun(validatedInput.cronExpression),
      },
    });

    // Create audit log
    await createAuditLog({
      action: 'CREATE',
      resource: 'backup_schedule',
      userId,
      metadata: {
        scheduleId: schedule.id,
        name: schedule.name,
        cron: schedule.cronExpression,
      },
    });

    return schedule;
  }

  /**
   * List schedules
   */
  async listSchedules(siteId?: string): Promise<BackupSchedule[]> {
    return prisma.backupSchedule.findMany({
      where: siteId ? { siteId } : {},
      orderBy: { createdAt: 'desc' },
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
  }

  /**
   * Update schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<BackupSchedule>,
    userId: string
  ): Promise<BackupSchedule> {
    const schedule = await prisma.backupSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const updated = await prisma.backupSchedule.update({
      where: { id: scheduleId },
      data: updates,
    });

    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'backup_schedule',
      userId,
      metadata: {
        scheduleId: schedule.id,
        changes: Object.keys(updates),
      },
    });

    return updated;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: string, userId: string): Promise<void> {
    const schedule = await prisma.backupSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    await prisma.backupSchedule.delete({
      where: { id: scheduleId },
    });

    // Create audit log
    await createAuditLog({
      action: 'DELETE',
      resource: 'backup_schedule',
      userId,
      metadata: {
        scheduleId: schedule.id,
        name: schedule.name,
      },
    });
  }

  /**
   * Run schedule manually
   */
  async runSchedule(scheduleId: string, userId: string): Promise<Backup> {
    const schedule = await prisma.backupSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Create backup
    const backup = await this.createBackup(
      {
        type: schedule.type,
        siteId: schedule.siteId,
        storageType: schedule.storageType,
      },
      userId
    );

    // Update schedule last run
    await prisma.backupSchedule.update({
      where: { id: scheduleId },
      data: {
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(schedule.cronExpression),
      },
    });

    return backup;
  }

  // =============================================================================
  // 🧹 MAINTENANCE
  // =============================================================================

  /**
   * Apply retention policy
   */
  async applyRetentionPolicy(siteId?: string): Promise<{ removed: number; reclaimed: number }> {
    const schedules = await prisma.backupSchedule.findMany({
      where: siteId ? { siteId, enabled: true } : { enabled: true },
    });

    let totalRemoved = 0;
    let totalReclaimed = 0;

    for (const schedule of schedules) {
      try {
        const result = await this.restic.prune({
          keepDaily: Math.min(schedule.retentionDays, 7),
          keepWeekly: Math.min(Math.floor(schedule.retentionDays / 7), 4),
          keepMonthly: Math.min(Math.floor(schedule.retentionDays / 30), 6),
        });

        totalRemoved += result.removed;
        totalReclaimed += result.reclaimed;
      } catch (error) {
        console.error('[Backup] Failed to apply retention policy:', error);
      }
    }

    return { removed: totalRemoved, reclaimed: totalReclaimed };
  }

  /**
   * Get repository stats
   */
  async getRepositoryStats(): Promise<{
    totalSize: number;
    snapshotCount: number;
    oldestSnapshot?: Date;
    newestSnapshot?: Date;
  }> {
    const stats = await this.restic.stats();

    return {
      totalSize: stats.totalSize,
      snapshotCount: stats.snapshotCount,
      oldestSnapshot: stats.oldestSnapshot,
      newestSnapshot: stats.newestSnapshot,
    };
  }

  /**
   * List Restic snapshots
   */
  async listSnapshots(siteId?: string): Promise<ResticSnapshot[]> {
    return this.restic.listSnapshots();
  }

  // =============================================================================
  // 🔧 UTILITIES
  // =============================================================================

  /**
   * Ensure backup directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(BACKUP_ROOT, { recursive: true, mode: 0o755 });
    await fs.mkdir(path.join(BACKUP_ROOT, 'restic'), { recursive: true, mode: 0o700 });
    await fs.mkdir(path.join(BACKUP_ROOT, 'dumps'), { recursive: true, mode: 0o755 });
  }

  /**
   * Initialize Restic repository
   */
  private async initializeRepository(): Promise<void> {
    await this.restic.init();
  }

  /**
   * Create database dump
   */
  private async createDatabaseDump(database: string): Promise<string> {
    const dumpPath = path.join(BACKUP_ROOT, 'dumps', `${database}_${Date.now()}.sql`);
    
    await execAsync(`mysqldump ${database} > ${dumpPath}`);
    
    return dumpPath;
  }

  /**
   * Create database dump for site
   */
  private async createDatabaseDumpForSite(siteId: string): Promise<string | null> {
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: { databases: true },
    });

    if (!site || !site.databases || site.databases.length === 0) {
      return null;
    }

    const dumpPath = path.join(BACKUP_ROOT, 'dumps', `site_${siteId}_${Date.now()}.sql`);
    
    // Dump all databases for site
    const dbNames = site.databases.map(db => db.name).join(' ');
    await execAsync(`mysqldump ${dbNames} > ${dumpPath}`);
    
    return dumpPath;
  }

  /**
   * Emit progress via Redis pub/sub
   */
  private async emitProgress(backupId: string, progress: BackupProgress): Promise<void> {
    await redis.publish(
      `backup:${backupId}:progress`,
      JSON.stringify(progress)
    );

    // Also store latest progress
    await redis.setEx(
      `backup:${backupId}:latest-progress`,
      3600,
      JSON.stringify(progress)
    );
  }

  /**
   * Get latest progress
   */
  async getLatestProgress(backupId: string): Promise<BackupProgress | null> {
    const data = await redis.get(`backup:${backupId}:latest-progress`);
    
    if (data) {
      return JSON.parse(data);
    }

    return null;
  }
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export const backupService = new BackupService();

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Backup Service — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Backup Types:
 *    - Full: Files + Database
 *    - Incremental: Only changes (Restic native)
 *    - Database: Database dumps only
 *    - Files: Files only
 * 
 * 2. Storage Types:
 *    - Local: /var/backups/wppanel
 *    - S3: AWS S3 or compatible (MinIO, Wasabi)
 *    - SFTP: Remote SFTP server
 *    - B2: Backblaze B2
 * 
 * 3. Schedules:
 *    - Cron-based scheduling
 *    - Per-site or global
 *    - Retention policies (days)
 *    - Manual trigger
 * 
 * 4. Restore:
 *    - Full restore
 *    - Single file restore
 *    - Database restore
 *    - Overwrite option
 * 
 * 5. Monitoring:
 *    - Real-time progress (WebSocket via Redis)
 *    - Repository stats
 *    - Snapshot list
 *    - Retention policy enforcement
 * 
 * File Structure:
 * /var/backups/wppanel/
 *   ├── restic/        # Restic repository
 *   └── dumps/         # Database dumps (temporary)
 * 
 * Environment Variables:
 * - BACKUP_ROOT: /var/backups/wppanel
 * - RESTIC_REPOSITORY: /var/backups/wppanel/restic
 * - RESTIC_PASSWORD: secure-password
 * - RESTIC_STORAGE_TYPE: local/s3/sftp/b2
 * - RESTIC_S3_CONFIG: JSON string
 * - RESTIC_SFTP_CONFIG: JSON string
 * - RESTIC_B2_CONFIG: JSON string
 * 
 * API Routes (to be implemented):
 * - GET    /api/backups
 * - POST   /api/backups
 * - GET    /api/backups/:id
 * - DELETE /api/backups/:id
 * - POST   /api/backups/:id/restore
 * - GET    /api/backups/snapshots
 * - GET    /api/backups/schedules
 * - POST   /api/backups/schedules
 * - PATCH  /api/backups/schedules/:id
 * - DELETE /api/backups/schedules/:id
 * - POST   /api/backups/schedules/:id/run
 * - GET    /api/backups/stats
 * - WS     /api/backups/stream/:backupId
 */