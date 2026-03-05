// =============================================================================
// wpPanel by Breach Rabbit — Restic Backup Wrapper
// =============================================================================
// Full Restic 0.18+ orchestration layer
// Features: init, backup, restore, snapshots, prune, stats, multi-storage
// =============================================================================

import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type StorageType = 'local' | 's3' | 'sftp' | 'b2';

export interface ResticConfig {
  /** Repository path (local) or URL (remote) */
  repository: string;
  
  /** Repository password */
  password: string;
  
  /** Password file path (alternative to password) */
  passwordFile?: string;
  
  /** Storage type */
  storageType: StorageType;
  
  /** S3 configuration */
  s3?: {
    endpoint: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    region?: string;
  };
  
  /** SFTP configuration */
  sftp?: {
    host: string;
    port: number;
    user: string;
    keyFile: string;
    path: string;
  };
  
  /** B2 configuration */
  b2?: {
    bucket: string;
    accountId: string;
    applicationKey: string;
  };
  
  /** Restic binary path */
  binaryPath?: string;
  
  /** Timeout for operations (ms) */
  timeout?: number;
  
  /** Number of parallel operations */
  parallelism?: number;
}

export interface BackupOptions {
  /** Paths to backup */
  paths: string[];
  
  /** Tags for categorization */
  tags?: Record<string, string>;
  
  /** Exclude patterns */
  exclude?: string[];
  
  /** Exclude file */
  excludeFile?: string;
  
  /** Force backup even if nothing changed */
  force?: boolean;
  
  /** Dry run (show what would be backed up) */
  dryRun?: boolean;
  
  /** Compression level (0-9) */
  compression?: number;
  
  /** Callback for progress updates */
  onProgress?: (progress: BackupProgress) => void;
}

export interface BackupProgress {
  /** Current files processed */
  filesProcessed: number;
  
  /** Total files (estimated) */
  filesTotal?: number;
  
  /** Bytes processed */
  bytesProcessed: number;
  
  /** Total bytes (estimated) */
  bytesTotal?: number;
  
  /** Current file being processed */
  currentFile?: string;
  
  /** Backup speed (bytes/sec) */
  speed: number;
  
  /** ETA in seconds */
  eta?: number;
  
  /** Percentage complete */
  percent: number;
}

export interface Snapshot {
  /** Restic snapshot ID */
  id: string;
  
  /** Short ID (first 8 chars) */
  shortId: string;
  
  /** Backup start time */
  time: Date;
  
  /** Backup end time */
  timeEnd?: Date;
  
  /** Hostname */
  host: string;
  
  /** Backup paths */
  paths: string[];
  
  /** Tags */
  tags: Record<string, string>;
  
  /** Parent snapshot ID */
  parent?: string;
  
  /** Backup size (uncompressed) */
  sizeBytes?: number;
  
  /** Backup size (compressed) */
  sizeCompressed?: number;
  
  /** Number of files */
  fileCount?: number;
  
  /** Number of directories */
  dirCount?: number;
  
  /** Backup duration (seconds) */
  duration?: number;
}

export interface RestoreOptions {
  /** Snapshot ID to restore from */
  snapshotId: string;
  
  /** Target directory for restore */
  target: string;
  
  /** Specific paths to restore (optional, restores all if not specified) */
  paths?: string[];
  
  /** Overwrite existing files */
  overwrite?: boolean;
  
  /** Dry run */
  dryRun?: boolean;
}

export interface PruneOptions {
  /** Keep all snapshots newer than */
  keepLast?: number;
  
  /** Keep hourly snapshots */
  keepHourly?: number;
  
  /** Keep daily snapshots */
  keepDaily?: number;
  
  /** Keep weekly snapshots */
  keepWeekly?: number;
  
  /** Keep monthly snapshots */
  keepMonthly?: number;
  
  /** Keep yearly snapshots */
  keepYearly?: number;
  
  /** Keep snapshots within duration */
  keepWithin?: string;
  
  /** Dry run */
  dryRun?: boolean;
  
  /** Remove unreachable data */
  pruneUnreachable?: boolean;
}

export interface RepositoryStats {
  /** Total size of repository */
  totalSize: number;
  
  /** Size of blobs (unique data) */
  blobSize: number;
  
  /** Size of trees */
  treeSize: number;
  
  /** Number of snapshots */
  snapshotCount: number;
  
  /** Number of files across all snapshots */
  fileCount: number;
  
  /** Total size of all snapshots (uncompressed) */
  uncompressedSize: number;
  
  /** Compression ratio */
  compressionRatio: number;
  
  /** Oldest snapshot date */
  oldestSnapshot?: Date;
  
  /** Newest snapshot date */
  newestSnapshot?: Date;
}

export interface FileInfo {
  /** File path */
  path: string;
  
  /** File type */
  type: 'file' | 'dir' | 'symlink';
  
  /** File size */
  size: number;
  
  /** Modification time */
  mtime: Date;
  
  /** Mode/permissions */
  mode: string;
  
  /** UID */
  uid: number;
  
  /** GID */
  gid: number;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const ResticConfigSchema = z.object({
  repository: z.string().min(1),
  password: z.string().min(1).optional(),
  passwordFile: z.string().optional(),
  storageType: z.enum(['local', 's3', 'sftp', 'b2']),
  s3: z.object({
    endpoint: z.string().url(),
    bucket: z.string().min(1),
    accessKeyId: z.string().min(1),
    secretAccessKey: z.string().min(1),
    region: z.string().optional(),
  }).optional(),
  sftp: z.object({
    host: z.string().min(1),
    port: z.number().min(1).max(65535),
    user: z.string().min(1),
    keyFile: z.string().min(1),
    path: z.string().min(1),
  }).optional(),
  b2: z.object({
    bucket: z.string().min(1),
    accountId: z.string().min(1),
    applicationKey: z.string().min(1),
  }).optional(),
  binaryPath: z.string().optional(),
  timeout: z.number().min(1000).optional(),
  parallelism: z.number().min(1).max(32).optional(),
});

// =============================================================================
// 🏗️ RESTIC WRAPPER CLASS
// =============================================================================

export class ResticWrapper {
  private config: ResticConfig;
  private env: NodeJS.ProcessEnv;

  constructor(config: ResticConfig) {
    // Validate configuration
    const validated = ResticConfigSchema.parse(config);
    this.config = validated;
    
    // Build environment for restic commands
    this.env = this.buildEnv();
  }

  // =============================================================================
  // 🔧 ENVIRONMENT SETUP
  // =============================================================================

  /**
   * Build environment variables for restic commands
   */
  private buildEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      RESTIC_REPOSITORY: this.config.repository,
    };

    // Password handling
    if (this.config.passwordFile) {
      env.RESTIC_PASSWORD_FILE = this.config.passwordFile;
    } else if (this.config.password) {
      env.RESTIC_PASSWORD = this.config.password;
    }

    // S3 configuration
    if (this.config.storageType === 's3' && this.config.s3) {
      env.AWS_ACCESS_KEY_ID = this.config.s3.accessKeyId;
      env.AWS_SECRET_ACCESS_KEY = this.config.s3.secretAccessKey;
      if (this.config.s3.region) {
        env.AWS_DEFAULT_REGION = this.config.s3.region;
      }
    }

    // B2 configuration
    if (this.config.storageType === 'b2' && this.config.b2) {
      env.B2_ACCOUNT_ID = this.config.b2.accountId;
      env.B2_ACCOUNT_KEY = this.config.b2.applicationKey;
    }

    // Parallelism
    if (this.config.parallelism) {
      env.RESTIC_PARALLELISM = this.config.parallelism.toString();
    }

    return env;
  }

  /**
   * Get restic binary path
   */
  private getBinary(): string {
    return this.config.binaryPath || 'restic';
  }

  /**
   * Execute restic command
   */
  private async exec(args: string[], options?: { json?: boolean; timeout?: number }): Promise<any> {
    const binary = this.getBinary();
    const command = `${binary} ${args.join(' ')}`;
    const timeout = options?.timeout || this.config.timeout || 3600000; // 1 hour default

    try {
      const { stdout, stderr } = await execAsync(command, {
        env: this.env,
        timeout,
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
      });

      if (options?.json) {
        try {
          return JSON.parse(stdout);
        } catch {
          return stdout;
        }
      }

      return stdout || stderr;
    } catch (error: any) {
      throw new ResticError(
        `Command failed: ${command}`,
        error.stdout,
        error.stderr,
        error.code
      );
    }
  }

  // =============================================================================
  // 📦 REPOSITORY MANAGEMENT
  // =============================================================================

  /**
   * Initialize new restic repository
   */
  async init(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.exec(['init']);
      return {
        success: true,
        message: 'Repository initialized successfully',
      };
    } catch (error) {
      if (error instanceof ResticError && error.message.includes('already initialized')) {
        return {
          success: true,
          message: 'Repository already initialized',
        };
      }
      throw error;
    }
  }

  /**
   * Check repository integrity
   */
  async check(options?: { readData?: boolean; withCache?: boolean }): Promise<{
    healthy: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const args = ['check'];
    
    if (options?.readData) {
      args.push('--read-data');
    }
    
    if (options?.withCache) {
      args.push('--with-cache');
    }

    try {
      await this.exec(args);
      return {
        healthy: true,
        errors: [],
        warnings: [],
      };
    } catch (error: any) {
      return {
        healthy: false,
        errors: [error.stderr || error.message],
        warnings: [],
      };
    }
  }

  /**
   * Unlock repository (remove stale locks)
   */
  async unlock(): Promise<void> {
    await this.exec(['unlock']);
  }

  /**
   * Get repository stats
   */
  async stats(): Promise<RepositoryStats> {
    const result = await this.exec(['stats', '--json'], { json: true });
    
    // Parse stats output
    const stats: RepositoryStats = {
      totalSize: result.total_size || 0,
      blobSize: result.blob_size || 0,
      treeSize: result.tree_size || 0,
      snapshotCount: result.snapshot_count || 0,
      fileCount: result.file_count || 0,
      uncompressedSize: result.uncompressed_size || 0,
      compressionRatio: result.compression_ratio || 0,
      oldestSnapshot: result.oldest_snapshot ? new Date(result.oldest_snapshot) : undefined,
      newestSnapshot: result.newest_snapshot ? new Date(result.newest_snapshot) : undefined,
    };

    return stats;
  }

  // =============================================================================
  // 💾 BACKUP OPERATIONS
  // =============================================================================

  /**
   * Create backup
   */
  async backup(options: BackupOptions): Promise<Snapshot> {
    const args = ['backup'];

    // Add paths
    options.paths.forEach(p => args.push(p));

    // Add tags
    if (options.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        args.push('--tag', `${key}=${value}`);
      });
    }

    // Add excludes
    if (options.exclude) {
      options.exclude.forEach(pattern => {
        args.push('--exclude', pattern);
      });
    }

    // Add exclude file
    if (options.excludeFile) {
      args.push('--exclude-file', options.excludeFile);
    }

    // Force backup
    if (options.force) {
      args.push('--force');
    }

    // Dry run
    if (options.dryRun) {
      args.push('--dry-run');
    }

    // Compression
    if (options.compression !== undefined) {
      args.push('--compression', options.compression.toString());
    }

    // JSON output for parsing
    args.push('--json');

    // Execute backup with progress parsing
    const snapshot = await this.execWithProgress(args, options.onProgress);
    
    return snapshot;
  }

  /**
   * Execute command with progress parsing
   */
  private async execWithProgress(args: string[], onProgress?: (progress: BackupProgress) => void): Promise<Snapshot> {
    const binary = this.getBinary();
    const command = `${binary} ${args.join(' ')}`;
    
    return new Promise((resolve, reject) => {
      const proc = exec(command, { env: this.env, maxBuffer: 1024 * 1024 * 100 });
      
      let lastSnapshot: Snapshot | null = null;
      
      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const json = JSON.parse(line);
            
            // Parse progress message
            if (json.message_type === 'backup') {
              const progress: BackupProgress = {
                filesProcessed: json.files_processed || 0,
                filesTotal: json.total_files,
                bytesProcessed: json.bytes_processed || 0,
                bytesTotal: json.total_bytes,
                currentFile: json.current_file,
                speed: json.speed || 0,
                eta: json.eta,
                percent: json.total_bytes ? Math.round((json.bytes_processed / json.total_bytes) * 100) : 0,
              };
              
              onProgress?.(progress);
            }
            
            // Parse snapshot summary
            if (json.message_type === 'summary') {
              lastSnapshot = {
                id: json.snapshot_id,
                shortId: json.snapshot_id.substring(0, 8),
                time: new Date(json.time),
                timeEnd: json.time_end ? new Date(json.time_end) : undefined,
                host: json.host,
                paths: json.paths,
                tags: json.tags || {},
                parent: json.parent,
                sizeBytes: json.total_bytes_processed,
                sizeCompressed: json.total_bytes_stored,
                fileCount: json.total_files_processed,
                dirCount: json.total_dirs_processed,
                duration: json.snapshot_duration,
              };
            }
          } catch {
            // Ignore non-JSON lines
          }
        }
      });
      
      proc.stderr?.on('data', (data: Buffer) => {
        // Log stderr but don't fail
        console.error('[Restic]', data.toString());
      });
      
      proc.on('close', (code) => {
        if (code === 0 && lastSnapshot) {
          resolve(lastSnapshot);
        } else if (code === 0) {
          // Dry run or no changes
          resolve({
            id: 'dry-run',
            shortId: 'dry-run',
            time: new Date(),
            host: 'unknown',
            paths: options.paths || [],
            tags: {},
          } as Snapshot);
        } else {
          reject(new ResticError(`Backup failed with code ${code}`));
        }
      });
      
      proc.on('error', reject);
    });
  }

  // =============================================================================
  // 📋 SNAPSHOT MANAGEMENT
  // =============================================================================

  /**
   * List all snapshots
   */
  async listSnapshots(options?: { 
    host?: string; 
    paths?: string[]; 
    tags?: Record<string, string>;
    limit?: number;
  }): Promise<Snapshot[]> {
    const args = ['snapshots', '--json'];

    if (options?.host) {
      args.push('--host', options.host);
    }

    if (options?.paths) {
      options.paths.forEach(p => args.push('--path', p));
    }

    if (options?.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        args.push('--tag', `${key}=${value}`);
      });
    }

    const result = await this.exec(args, { json: true });
    
    // Parse snapshots
    const snapshots: Snapshot[] = (result || []).map((s: any) => ({
      id: s.id,
      shortId: s.short_id,
      time: new Date(s.time),
      timeEnd: s.time_end ? new Date(s.time_end) : undefined,
      host: s.hostname,
      paths: s.paths,
      tags: s.tags || {},
      parent: s.parent,
      sizeBytes: s.summary?.total_bytes_processed,
      sizeCompressed: s.summary?.total_bytes_stored,
      fileCount: s.summary?.total_files_processed,
      dirCount: s.summary?.total_dirs_processed,
      duration: s.summary?.snapshot_duration,
    }));

    // Apply limit
    if (options?.limit) {
      return snapshots.slice(0, options.limit);
    }

    return snapshots;
  }

  /**
   * Get single snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<Snapshot | null> {
    const snapshots = await this.listSnapshots();
    return snapshots.find(s => s.id === snapshotId || s.shortId === snapshotId) || null;
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    await this.exec(['forget', snapshotId, '--prune']);
  }

  /**
   * Delete multiple snapshots by filter
   */
  async deleteSnapshots(options: {
    host?: string;
    paths?: string[];
    tags?: Record<string, string>;
    olderThan?: string;
  }): Promise<number> {
    const args = ['forget'];

    if (options.host) {
      args.push('--host', options.host);
    }

    if (options.paths) {
      options.paths.forEach(p => args.push('--path', p));
    }

    if (options.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        args.push('--tag', `${key}=${value}`);
      });
    }

    if (options.olderThan) {
      args.push('--older-than', options.olderThan);
    }

    args.push('--prune');

    await this.exec(args);
    
    // Return count of deleted snapshots (would need to parse output)
    return 0;
  }

  // =============================================================================
  // 🔄 RESTORE OPERATIONS
  // =============================================================================

  /**
   * Restore from snapshot
   */
  async restore(options: RestoreOptions): Promise<{ success: boolean; restored: number }> {
    const args = ['restore', options.snapshotId, '--target', options.target];

    if (options.paths) {
      options.paths.forEach(p => args.push(p));
    }

    if (options.overwrite) {
      args.push('--overwrite');
    }

    if (options.dryRun) {
      args.push('--dry-run');
    }

    args.push('--json');

    const result = await this.exec(args, { json: true });
    
    return {
      success: true,
      restored: result.files_restored || 0,
    };
  }

  /**
   * List files in snapshot
   */
  async listFiles(snapshotId: string, path?: string): Promise<FileInfo[]> {
    const args = ['ls', snapshotId, '--json'];
    
    if (path) {
      args.push(path);
    }

    const result = await this.exec(args, { json: true });
    
    return (result || []).map((f: any) => ({
      path: f.path,
      type: f.type,
      size: f.size,
      mtime: new Date(f.mtime),
      mode: f.mode,
      uid: f.uid,
      gid: f.gid,
    }));
  }

  /**
   * Restore single file from snapshot
   */
  async restoreFile(snapshotId: string, filePath: string, target: string): Promise<void> {
    await this.restore({
      snapshotId,
      target,
      paths: [filePath],
      overwrite: true,
    });
  }

  // =============================================================================
  // 🧹 MAINTENANCE
  // =============================================================================

  /**
   * Prune repository (remove old snapshots)
   */
  async prune(options: PruneOptions = {}): Promise<{
    removed: number;
    reclaimed: number;
  }> {
    const args = ['forget'];

    // Retention policies
    if (options.keepLast) args.push('--keep-last', options.keepLast.toString());
    if (options.keepHourly) args.push('--keep-hourly', options.keepHourly.toString());
    if (options.keepDaily) args.push('--keep-daily', options.keepDaily.toString());
    if (options.keepWeekly) args.push('--keep-weekly', options.keepWeekly.toString());
    if (options.keepMonthly) args.push('--keep-monthly', options.keepMonthly.toString());
    if (options.keepYearly) args.push('--keep-yearly', options.keepYearly.toString());
    if (options.keepWithin) args.push('--keep-within', options.keepWithin);

    // Dry run
    if (options.dryRun) args.push('--dry-run');

    // Prune unreachable
    if (options.pruneUnreachable) args.push('--prune');

    args.push('--json');

    const result = await this.exec(args, { json: true });
    
    return {
      removed: result.snapshots_removed || 0,
      reclaimed: result.bytes_reclaimed || 0,
    };
  }

  /**
   * Run garbage collection
   */
  async gc(): Promise<void> {
    await this.exec(['prune']);
  }

  /**
   * Rebuild index
   */
  async rebuildIndex(): Promise<void> {
    await this.exec(['rebuild-index']);
  }

  // =============================================================================
  // 🔍 SEARCH & INFO
  // =============================================================================

  /**
   * Find files in repository
   */
  async find(pattern: string, options?: { snapshotId?: string; path?: string }): Promise<Array<{
    snapshot: Snapshot;
    path: string;
    size: number;
    mtime: Date;
  }>> {
    const args = ['find', pattern];

    if (options?.snapshotId) {
      args.push(options.snapshotId);
    }

    if (options?.path) {
      args.push('--path', options.path);
    }

    args.push('--json');

    const result = await this.exec(args, { json: true });
    
    return (result || []).map((f: any) => ({
      snapshot: {
        id: f.snapshot_id,
        shortId: f.snapshot_id.substring(0, 8),
        time: new Date(f.snapshot_time),
        host: f.host,
        paths: f.paths,
        tags: {},
      },
      path: f.path,
      size: f.size,
      mtime: new Date(f.mtime),
    }));
  }

  /**
   * Get repository info
   */
  async info(): Promise<{
    repository: string;
    version: number;
    initialized: boolean;
  }> {
    try {
      await this.exec(['cat', 'config']);
      return {
        repository: this.config.repository,
        version: 2,
        initialized: true,
      };
    } catch {
      return {
        repository: this.config.repository,
        version: 0,
        initialized: false,
      };
    }
  }

  // =============================================================================
  // 📊 REPORTING
  // =============================================================================

  /**
   * Generate backup report
   */
  async generateReport(options?: { days?: number }): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    averageSize: number;
    backupsByDay: Record<string, number>;
  }> {
    const snapshots = await this.listSnapshots();
    const days = options?.days || 30;
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const recentSnapshots = snapshots.filter(s => s.time >= cutoff);
    const totalSize = recentSnapshots.reduce((sum, s) => sum + (s.sizeBytes || 0), 0);
    
    const backupsByDay: Record<string, number> = {};
    recentSnapshots.forEach(s => {
      const day = s.time.toISOString().split('T')[0];
      backupsByDay[day] = (backupsByDay[day] || 0) + 1;
    });

    return {
      totalBackups: recentSnapshots.length,
      totalSize,
      oldestBackup: snapshots.length > 0 ? snapshots[snapshots.length - 1].time : null,
      newestBackup: snapshots.length > 0 ? snapshots[0].time : null,
      averageSize: recentSnapshots.length > 0 ? totalSize / recentSnapshots.length : 0,
      backupsByDay,
    };
  }
}

// =============================================================================
// ❌ ERROR CLASS
// =============================================================================

export class ResticError extends Error {
  constructor(
    message: string,
    public stdout?: string,
    public stderr?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ResticError';
  }
}

// =============================================================================
// 📦 FACTORY FUNCTION
// =============================================================================

/**
 * Create ResticWrapper instance from config
 */
export function createResticWrapper(config: ResticConfig): ResticWrapper {
  return new ResticWrapper(config);
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Restic Wrapper — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Repository Management:
 *    - init: Create new repository
 *    - check: Verify integrity
 *    - unlock: Remove stale locks
 *    - stats: Repository statistics
 * 
 * 2. Backup Operations:
 *    - backup: Create backup with progress tracking
 *    - Incremental by default (restic feature)
 *    - Tags for categorization
 *    - Exclude patterns
 *    - Compression support
 * 
 * 3. Snapshot Management:
 *    - listSnapshots: List all snapshots
 *    - getSnapshot: Get single snapshot
 *    - deleteSnapshot: Delete by ID
 *    - deleteSnapshots: Delete by filter
 * 
 * 4. Restore Operations:
 *    - restore: Full/partial restore
 *    - listFiles: List files in snapshot
 *    - restoreFile: Restore single file
 * 
 * 5. Maintenance:
 *    - prune: Remove old snapshots (retention policies)
 *    - gc: Garbage collection
 *    - rebuildIndex: Rebuild repository index
 * 
 * 6. Search & Info:
 *    - find: Search files in repository
 *    - info: Repository info
 *    - generateReport: Backup statistics
 * 
 * Storage Types:
 * - local: /path/to/repo
 * - s3: s3:endpoint/bucket/path
 * - sftp: sftp:user@host:/path
 * - b2: b2:bucket:path
 * 
 * Environment Variables:
 * - RESTIC_REPOSITORY: Repository path/URL
 * - RESTIC_PASSWORD: Repository password
 * - RESTIC_PASSWORD_FILE: Password file path
 * - AWS_ACCESS_KEY_ID: S3 access key
 * - AWS_SECRET_ACCESS_KEY: S3 secret
 * - B2_ACCOUNT_ID: Backblaze account ID
 * - B2_ACCOUNT_KEY: Backblaze application key
 * 
 * Usage Example:
 * 
 * import { createResticWrapper } from '@/lib/integrations/restic-wrapper';
 * 
 * const restic = createResticWrapper({
 *   repository: '/var/backups/restic',
 *   password: 'secure-password',
 *   storageType: 'local',
 * });
 * 
 * // Initialize repository
 * await restic.init();
 * 
 * // Create backup
 * const snapshot = await restic.backup({
 *   paths: ['/var/www/example.com'],
 *   tags: { site: 'example.com', type: 'full' },
 *   onProgress: (progress) => {
 *     console.log(`${progress.percent}% complete`);
 *   },
 * });
 * 
 * // List snapshots
 * const snapshots = await restic.listSnapshots();
 * 
 * // Restore
 * await restic.restore({
 *   snapshotId: snapshot.id,
 *   target: '/var/www/restored',
 * });
 * 
 * // Prune old backups
 * await restic.prune({
 *   keepDaily: 7,
 *   keepWeekly: 4,
 *   keepMonthly: 6,
 * });
 */