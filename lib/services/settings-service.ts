// =============================================================================
// wpPanel by Breach Rabbit — Settings Service
// =============================================================================
// Service layer for all settings management (PHP, MariaDB, OLS, System, Panel, Profile, Security)
// Features: Validation, recommendations, system commands, audit logging
// =============================================================================

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type SettingsCategory =
  | 'php'
  | 'mariadb'
  | 'ols'
  | 'swap'
  | 'system'
  | 'panel'
  | 'profile'
  | 'security'
  | 'password'
  | 'sessions';

export interface ServerHardware {
  cpu: {
    cores: number;
    model: string;
  };
  ram: {
    total: number; // GB
    available: number; // GB
  };
  disk: {
    total: number; // GB
    available: number; // GB;
    type: 'NVMe' | 'SSD' | 'HDD' | 'Unknown';
  };
}

export interface PHPSettings {
  defaultVersion: string;
  memoryLimit: string;
  maxExecutionTime: number;
  maxInputTime: number;
  uploadMaxFilesize: string;
  postMaxSize: string;
  maxInputVars: number;
  displayErrors: boolean;
  timezone: string;
  opcache: {
    enabled: boolean;
    memoryConsumption: number;
    maxAcceleratedFiles: number;
    revalidateFreq: number;
  };
  workers: number;
  timeout: number;
}

export interface MariaDBSettings {
  innodbBufferPoolSize: string;
  innodbBufferPoolInstances: number;
  innodbLogFilesize: string;
  innodbFlushLogAtTrxCommit: number;
  maxConnections: number;
  waitTimeout: number;
  interactiveTimeout: number;
  connectTimeout: number;
  slowQueryLog: boolean;
  longQueryTime: number;
}

export interface OLSSettings {
  maxConnections: number;
  maxSSLConnections: number;
  connTimeout: number;
  maxKeepAliveReq: number;
  keepAliveTimeout: number;
  smartKeepAlive: boolean;
  gzip: {
    enabled: boolean;
    level: number;
  };
  brotli: {
    enabled: boolean;
    level: number;
  };
  lscache: {
    enabled: boolean;
    defaultTTL: number;
    staleCache: boolean;
  };
  security: {
    hideServerSignature: boolean;
    maxReqURLLen: number;
    maxReqHeaderSize: number;
    maxReqBodySize: number;
  };
}

export interface SwapSettings {
  size: number; // GB
  swappiness: number;
  action?: 'create' | 'resize' | 'remove';
}

export interface SystemSettings {
  openFiles: number;
  maxProcesses: number;
  sysctl: Record<string, number>;
}

export interface PanelSettings {
  theme: 'dark' | 'light' | 'system';
  language: 'en' | 'ru' | 'es';
  timezone: string;
  emailNotifications: boolean;
  telegramNotifications: boolean;
  updateCheck: boolean;
}

export interface ProfileSettings {
  name: string;
  email: string;
}

export interface PasswordChangeSettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  twoFactorCode?: string;
}

export interface SessionSettings {
  sessionId?: string;
  terminateAll?: boolean;
}

export interface SettingsRecommendations {
  php: {
    memoryLimit: string;
    workers: number;
    opcacheMemory: number;
  };
  mariadb: {
    innodbBufferPoolSize: string;
    maxConnections: number;
  };
  ols: {
    maxConnections: number;
    workers: number;
  };
  swap: {
    shouldCreate: boolean;
    recommendedSize: number;
  };
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

export const PHPSettingsSchema = z.object({
  defaultVersion: z.enum(['8.2', '8.3', '8.4', '8.5']).optional(),
  memoryLimit: z.string().regex(/^\d+[MGT]$/).optional(),
  maxExecutionTime: z.number().min(30).max(3600).optional(),
  maxInputTime: z.number().min(30).max(3600).optional(),
  uploadMaxFilesize: z.string().regex(/^\d+[MGT]$/).optional(),
  postMaxSize: z.string().regex(/^\d+[MGT]$/).optional(),
  maxInputVars: z.number().min(1000).max(10000).optional(),
  displayErrors: z.boolean().optional(),
  timezone: z.string().optional(),
  opcache: z
    .object({
      enabled: z.boolean().optional(),
      memoryConsumption: z.number().min(64).max(2048).optional(),
      maxAcceleratedFiles: z.number().min(1000).max(100000).optional(),
      revalidateFreq: z.number().min(0).max(3600).optional(),
    })
    .optional(),
  workers: z.number().min(1).max(64).optional(),
  timeout: z.number().min(60).max(600).optional(),
});

export const MariaDBSettingsSchema = z.object({
  innodbBufferPoolSize: z.string().regex(/^\d+[MGT]$/).optional(),
  innodbBufferPoolInstances: z.number().min(1).max(64).optional(),
  innodbLogFilesize: z.string().regex(/^\d+[MGT]$/).optional(),
  innodbFlushLogAtTrxCommit: z.number().min(0).max(2).optional(),
  maxConnections: z.number().min(10).max(10000).optional(),
  waitTimeout: z.number().min(60).max(31536000).optional(),
  interactiveTimeout: z.number().min(60).max(31536000).optional(),
  connectTimeout: z.number().min(1).max(3600).optional(),
  slowQueryLog: z.boolean().optional(),
  longQueryTime: z.number().min(0.1).max(60).optional(),
});

export const OLSSettingsSchema = z.object({
  maxConnections: z.number().min(100).max(10000).optional(),
  maxSSLConnections: z.number().min(100).max(10000).optional(),
  connTimeout: z.number().min(10).max(300).optional(),
  maxKeepAliveReq: z.number().min(1).max(1000).optional(),
  keepAliveTimeout: z.number().min(1).max(60).optional(),
  smartKeepAlive: z.boolean().optional(),
  gzip: z
    .object({
      enabled: z.boolean().optional(),
      level: z.number().min(1).max(9).optional(),
    })
    .optional(),
  brotli: z
    .object({
      enabled: z.boolean().optional(),
      level: z.number().min(1).max(11).optional(),
    })
    .optional(),
  lscache: z
    .object({
      enabled: z.boolean().optional(),
      defaultTTL: z.number().min(60).max(86400).optional(),
      staleCache: z.boolean().optional(),
    })
    .optional(),
  security: z
    .object({
      hideServerSignature: z.boolean().optional(),
      maxReqURLLen: z.number().min(1024).max(65535).optional(),
      maxReqHeaderSize: z.number().min(8192).max(65535).optional(),
      maxReqBodySize: z.number().min(1048576).max(524288000).optional(),
    })
    .optional(),
});

export const SwapSettingsSchema = z.object({
  size: z.number().min(1).max(32).optional(),
  swappiness: z.number().min(0).max(100).optional(),
  action: z.enum(['create', 'resize', 'remove']).optional(),
});

export const SystemSettingsSchema = z.object({
  openFiles: z.number().min(1024).max(1048576).optional(),
  maxProcesses: z.number().min(512).max(524288).optional(),
  sysctl: z.record(z.number()).optional(),
});

export const PanelSettingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  language: z.enum(['en', 'ru', 'es']).optional(),
  timezone: z.string().optional(),
  emailNotifications: z.boolean().optional(),
  telegramNotifications: z.boolean().optional(),
  updateCheck: z.boolean().optional(),
});

export const ProfileSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const SecuritySettingsSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  twoFactorSecret: z.string().optional(),
  twoFactorCode: z.string().regex(/^\d{6}$/).optional(),
});

export const SessionSettingsSchema = z.object({
  sessionId: z.string().optional(),
  terminateAll: z.boolean().optional(),
});

// =============================================================================
// 🔧 HARDWARE DETECTION
// =============================================================================

/**
 * Detect server hardware specifications
 */
export async function detectHardware(): Promise<ServerHardware> {
  try {
    // CPU Detection
    const cpuInfo = await execAsync('lscpu');
    const cpuCoresMatch = cpuInfo.stdout.match(/CPU\(s\):\s*(\d+)/);
    const cpuModelMatch = cpuInfo.stdout.match(/Model name:\s*(.+)/);

    const cpu = {
      cores: cpuCoresMatch ? parseInt(cpuCoresMatch[1], 10) : 2,
      model: cpuModelMatch ? cpuModelMatch[1].trim() : 'Unknown',
    };

    // RAM Detection
    const memInfo = await execAsync('free -g');
    const memLines = memInfo.stdout.split('\n');
    const memMatch = memLines[1].match(/\s+(\d+)\s+(\d+)/);

    const ram = {
      total: memMatch ? parseInt(memMatch[1], 10) : 4,
      available: memMatch ? parseInt(memMatch[2], 10) : 2,
    };

    // Disk Detection
    const diskInfo = await execAsync('df -BG / --output=size,avail');
    const diskLines = diskInfo.stdout.split('\n');
    const diskMatch = diskLines[1].match(/(\d+)G\s+(\d+)G/);

    const diskTotal = diskMatch ? parseInt(diskMatch[1], 10) : 50;
    const diskAvailable = diskMatch ? parseInt(diskMatch[2], 10) : 25;

    // Detect disk type
    let diskType: 'NVMe' | 'SSD' | 'HDD' | 'Unknown' = 'Unknown';
    try {
      const lsblk = await execAsync('lsblk -d -o name,rota,type');
      if (lsblk.stdout.includes('nvme')) {
        diskType = 'NVMe';
      } else if (lsblk.stdout.includes('0')) {
        diskType = 'SSD';
      } else if (lsblk.stdout.includes('1')) {
        diskType = 'HDD';
      }
    } catch {
      diskType = 'Unknown';
    }

    const disk = {
      total: diskTotal,
      available: diskAvailable,
      type: diskType,
    };

    return { cpu, ram, disk };
  } catch (error) {
    console.error('Hardware detection failed:', error);
    return {
      cpu: { cores: 2, model: 'Unknown' },
      ram: { total: 4, available: 2 },
      disk: { total: 50, available: 25, type: 'Unknown' },
    };
  }
}

/**
 * Calculate optimal settings recommendations based on hardware
 */
export function calculateRecommendations(hardware: ServerHardware): SettingsRecommendations {
  const ram = hardware.ram.total;
  const cpuCores = hardware.cpu.cores;

  // PHP Recommendations
  let phpMemoryLimit = '256M';
  let phpWorkers = 4;
  let opcacheMemory = 128;

  if (ram <= 2) {
    phpMemoryLimit = '128M';
    phpWorkers = 2;
    opcacheMemory = 64;
  } else if (ram <= 4) {
    phpMemoryLimit = '256M';
    phpWorkers = 4;
    opcacheMemory = 128;
  } else if (ram <= 8) {
    phpMemoryLimit = '256M';
    phpWorkers = 8;
    opcacheMemory = 256;
  } else if (ram <= 16) {
    phpMemoryLimit = '512M';
    phpWorkers = cpuCores * 3;
    opcacheMemory = 512;
  } else {
    phpMemoryLimit = '512M';
    phpWorkers = cpuCores * 4;
    opcacheMemory = 1024;
  }

  // MariaDB Recommendations
  let innodbBufferPool = '512M';
  let maxConnections = 100;

  if (ram <= 2) {
    innodbBufferPool = '256M';
    maxConnections = 50;
  } else if (ram <= 4) {
    innodbBufferPool = '512M';
    maxConnections = 100;
  } else if (ram <= 8) {
    innodbBufferPool = '1G';
    maxConnections = 150;
  } else if (ram <= 16) {
    innodbBufferPool = `${Math.floor(ram * 0.5)}G`;
    maxConnections = 200;
  } else {
    innodbBufferPool = `${Math.floor(ram * 0.6)}G`;
    maxConnections = 300;
  }

  // OLS Recommendations
  const olsMaxConnections = maxConnections;
  const olsWorkers = phpWorkers;

  // SWAP Recommendations
  const shouldCreateSwap = ram < 8;
  const recommendedSwapSize = ram < 2 ? 2 : ram < 4 ? 4 : ram < 8 ? 4 : 0;

  return {
    php: {
      memoryLimit: phpMemoryLimit,
      workers: phpWorkers,
      opcacheMemory,
    },
    mariadb: {
      innodbBufferPoolSize: innodbBufferPool,
      maxConnections,
    },
    ols: {
      maxConnections: olsMaxConnections,
      workers: olsWorkers,
    },
    swap: {
      shouldCreate: shouldCreateSwap,
      recommendedSize: recommendedSwapSize,
    },
  };
}

// =============================================================================
// 🔧 PHP SETTINGS
// =============================================================================

/**
 * Get current PHP settings from system
 */
export async function getPHPSettings(): Promise<PHPSettings> {
  try {
    const phpInfo = await execAsync('php -i');
    const output = phpInfo.stdout;

    const getValue = (key: string, defaultValue: string): string => {
      const match = output.match(new RegExp(`${key} => ([^\\s]+)`, 'i'));
      return match ? match[1] : defaultValue;
    };

    const getNumericValue = (key: string, defaultValue: number): number => {
      const match = output.match(new RegExp(`${key} => (\\d+)`, 'i'));
      return match ? parseInt(match[1], 10) : defaultValue;
    };

    const getBooleanValue = (key: string, defaultValue: boolean): boolean => {
      const match = output.match(new RegExp(`${key} => (\\d+|On|Off)`, 'i'));
      if (!match) return defaultValue;
      const value = match[1].toLowerCase();
      return value === '1' || value === 'on';
    };

    return {
      defaultVersion: '8.3',
      memoryLimit: getValue('memory_limit', '256M'),
      maxExecutionTime: getNumericValue('max_execution_time', 300),
      maxInputTime: getNumericValue('max_input_time', 300),
      uploadMaxFilesize: getValue('upload_max_filesize', '64M'),
      postMaxSize: getValue('post_max_size', '64M'),
      maxInputVars: getNumericValue('max_input_vars', 3000),
      displayErrors: getBooleanValue('display_errors', false),
      timezone: getValue('date.timezone', 'UTC'),
      opcache: {
        enabled: getBooleanValue('opcache.enable', true),
        memoryConsumption: getNumericValue('opcache.memory_consumption', 256),
        maxAcceleratedFiles: getNumericValue('opcache.max_accelerated_files', 10000),
        revalidateFreq: getNumericValue('opcache.revalidate_freq', 60),
      },
      workers: 12,
      timeout: 300,
    };
  } catch (error) {
    console.error('Failed to get PHP settings:', error);
    return {
      defaultVersion: '8.3',
      memoryLimit: '256M',
      maxExecutionTime: 300,
      maxInputTime: 300,
      uploadMaxFilesize: '64M',
      postMaxSize: '64M',
      maxInputVars: 3000,
      displayErrors: false,
      timezone: 'UTC',
      opcache: {
        enabled: true,
        memoryConsumption: 256,
        maxAcceleratedFiles: 10000,
        revalidateFreq: 60,
      },
      workers: 12,
      timeout: 300,
    };
  }
}

/**
 * Apply PHP settings to system
 */
export async function applyPHPSettings(settings: z.infer<typeof PHPSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: string[] = [];

    if (settings.memoryLimit) {
      updates.push(`memory_limit = ${settings.memoryLimit}`);
    }
    if (settings.maxExecutionTime) {
      updates.push(`max_execution_time = ${settings.maxExecutionTime}`);
    }
    if (settings.uploadMaxFilesize) {
      updates.push(`upload_max_filesize = ${settings.uploadMaxFilesize}`);
    }
    if (settings.postMaxSize) {
      updates.push(`post_max_size = ${settings.postMaxSize}`);
    }
    if (settings.maxInputVars) {
      updates.push(`max_input_vars = ${settings.maxInputVars}`);
    }
    if (settings.timezone) {
      updates.push(`date.timezone = ${settings.timezone}`);
    }

    if (updates.length > 0) {
      const phpIniPath = '/etc/php/8.3/litespeed/php.ini';

      for (const update of updates) {
        const [key, value] = update.split(' = ');
        await execAsync(`sed -i "s/^${key} = .*/${key} = ${value}/" ${phpIniPath}`);
      }

      // Graceful reload OpenLiteSpeed (which handles PHP-FPM)
      await execAsync('systemctl reload lsws');
    }

    // Apply OPcache settings if provided
    if (settings.opcache) {
      const opcacheUpdates: string[] = [];

      if (settings.opcache.enabled !== undefined) {
        opcacheUpdates.push(`opcache.enable = ${settings.opcache.enabled ? 1 : 0}`);
      }
      if (settings.opcache.memoryConsumption) {
        opcacheUpdates.push(`opcache.memory_consumption = ${settings.opcache.memoryConsumption}`);
      }
      if (settings.opcache.maxAcceleratedFiles) {
        opcacheUpdates.push(`opcache.max_accelerated_files = ${settings.opcache.maxAcceleratedFiles}`);
      }
      if (settings.opcache.revalidateFreq !== undefined) {
        opcacheUpdates.push(`opcache.revalidate_freq = ${settings.opcache.revalidateFreq}`);
      }

      if (opcacheUpdates.length > 0) {
        const opcacheIniPath = '/etc/php/8.3/mods-available/opcache.ini';

        for (const update of opcacheUpdates) {
          const [key, value] = update.split(' = ');
          await execAsync(`sed -i "s/^${key} = .*/${key} = ${value}/" ${opcacheIniPath}`);
        }

        await execAsync('systemctl reload lsws');
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to apply PHP settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 MARIADB SETTINGS
// =============================================================================

/**
 * Get current MariaDB settings from system
 */
export async function getMariaDBSettings(): Promise<MariaDBSettings> {
  try {
    const variables = await execAsync(
      `mysql -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size'; SHOW VARIABLES LIKE 'max_connections'; SHOW VARIABLES LIKE 'slow_query_log'; SHOW VARIABLES LIKE 'long_query_time';"`
    );

    const parseValue = (output: string, variable: string): string => {
      const match = output.match(new RegExp(`${variable}\\s+\\|\\s+(\\S+)`, 'i'));
      return match ? match[1] : '';
    };

    return {
      innodbBufferPoolSize: parseValue(variables.stdout, 'innodb_buffer_pool_size') || '8G',
      innodbBufferPoolInstances: 8,
      innodbLogFilesize: '2G',
      innodbFlushLogAtTrxCommit: 1,
      maxConnections: parseInt(parseValue(variables.stdout, 'max_connections')) || 300,
      waitTimeout: 28800,
      interactiveTimeout: 28800,
      connectTimeout: 10,
      slowQueryLog: parseValue(variables.stdout, 'slow_query_log') === '1',
      longQueryTime: parseFloat(parseValue(variables.stdout, 'long_query_time')) || 2,
    };
  } catch (error) {
    console.error('Failed to get MariaDB settings:', error);
    return {
      innodbBufferPoolSize: '8G',
      innodbBufferPoolInstances: 8,
      innodbLogFilesize: '2G',
      innodbFlushLogAtTrxCommit: 1,
      maxConnections: 300,
      waitTimeout: 28800,
      interactiveTimeout: 28800,
      connectTimeout: 10,
      slowQueryLog: true,
      longQueryTime: 2,
    };
  }
}

/**
 * Apply MariaDB settings to system
 */
export async function applyMariaDBSettings(settings: z.infer<typeof MariaDBSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    const updates: string[] = [];

    if (settings.innodbBufferPoolSize) {
      updates.push(`innodb_buffer_pool_size = ${settings.innodbBufferPoolSize}`);
    }
    if (settings.innodbBufferPoolInstances) {
      updates.push(`innodb_buffer_pool_instances = ${settings.innodbBufferPoolInstances}`);
    }
    if (settings.innodbLogFilesize) {
      updates.push(`innodb_log_file_size = ${settings.innodbLogFilesize}`);
    }
    if (settings.innodbFlushLogAtTrxCommit !== undefined) {
      updates.push(`innodb_flush_log_at_trx_commit = ${settings.innodbFlushLogAtTrxCommit}`);
    }
    if (settings.maxConnections) {
      updates.push(`max_connections = ${settings.maxConnections}`);
    }
    if (settings.waitTimeout) {
      updates.push(`wait_timeout = ${settings.waitTimeout}`);
    }
    if (settings.slowQueryLog !== undefined) {
      updates.push(`slow_query_log = ${settings.slowQueryLog ? 1 : 0}`);
    }
    if (settings.longQueryTime) {
      updates.push(`long_query_time = ${settings.longQueryTime}`);
    }

    if (updates.length > 0) {
      const mysqlCnfPath = '/etc/mysql/mariadb.conf.d/50-server.cnf';

      for (const update of updates) {
        const [key, value] = update.split(' = ');
        await execAsync(`sed -i "s/^${key} = .*/${key} = ${value}/" ${mysqlCnfPath}`);
      }

      // Restart MariaDB to apply changes
      await execAsync('systemctl restart mariadb');
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to apply MariaDB settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 OLS SETTINGS
// =============================================================================

/**
 * Get current OLS settings from WebAdmin API
 */
export async function getOLSSettings(): Promise<OLSSettings> {
  try {
    const olsApiUrl = process.env.OLS_API_URL || 'http://localhost:7080';
    const olsUser = process.env.OLS_API_USER || 'admin';
    const olsPass = process.env.OLS_API_PASS;

    if (!olsPass) {
      throw new Error('OLS API password not configured');
    }

    const response = await fetch(`${olsApiUrl}/v1/config`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${olsUser}:${olsPass}`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OLS config');
    }

    const config = await response.json();

    return {
      maxConnections: config.maxConnections || 500,
      maxSSLConnections: config.maxSSLConnections || 500,
      connTimeout: config.connTimeout || 30,
      maxKeepAliveReq: config.maxKeepAliveReq || 100,
      keepAliveTimeout: config.keepAliveTimeout || 5,
      smartKeepAlive: config.smartKeepAlive ?? true,
      gzip: {
        enabled: config.gzip?.enabled ?? true,
        level: config.gzip?.level ?? 6,
      },
      brotli: {
        enabled: config.brotli?.enabled ?? true,
        level: config.brotli?.level ?? 4,
      },
      lscache: {
        enabled: config.lscache?.enabled ?? true,
        defaultTTL: config.lscache?.defaultTTL ?? 3600,
        staleCache: config.lscache?.staleCache ?? true,
      },
      security: {
        hideServerSignature: config.security?.hideServerSignature ?? true,
        maxReqURLLen: config.security?.maxReqURLLen ?? 8192,
        maxReqHeaderSize: config.security?.maxReqHeaderSize ?? 16384,
        maxReqBodySize: config.security?.maxReqBodySize ?? 52428800,
      },
    };
  } catch (error) {
    console.error('Failed to get OLS settings:', error);
    return {
      maxConnections: 500,
      maxSSLConnections: 500,
      connTimeout: 30,
      maxKeepAliveReq: 100,
      keepAliveTimeout: 5,
      smartKeepAlive: true,
      gzip: { enabled: true, level: 6 },
      brotli: { enabled: true, level: 4 },
      lscache: { enabled: true, defaultTTL: 3600, staleCache: true },
      security: {
        hideServerSignature: true,
        maxReqURLLen: 8192,
        maxReqHeaderSize: 16384,
        maxReqBodySize: 52428800,
      },
    };
  }
}

/**
 * Apply OLS settings via WebAdmin API
 */
export async function applyOLSSettings(settings: z.infer<typeof OLSSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    const olsApiUrl = process.env.OLS_API_URL || 'http://localhost:7080';
    const olsUser = process.env.OLS_API_USER || 'admin';
    const olsPass = process.env.OLS_API_PASS;

    if (!olsPass) {
      throw new Error('OLS API password not configured');
    }

    const response = await fetch(`${olsApiUrl}/v1/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${olsUser}:${olsPass}`).toString('base64')}`,
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to apply OLS settings');
    }

    // Graceful restart OLS to apply changes
    await execAsync('systemctl reload lsws');

    return { success: true };
  } catch (error) {
    console.error('Failed to apply OLS settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 SWAP SETTINGS
// =============================================================================

/**
 * Get current SWAP settings from system
 */
export async function getSwapSettings(): Promise<{ exists: boolean; size: number; used: number; swappiness: number }> {
  try {
    const swapInfo = await execAsync('free -g | grep Swap');
    const [_, total, used] = swapInfo.stdout.split(/\s+/).map(Number);

    const swappinessInfo = await execAsync('sysctl -n vm.swappiness');
    const swappiness = parseInt(swappinessInfo.stdout.trim());

    return {
      exists: total > 0,
      size: total,
      used: used,
      swappiness,
    };
  } catch (error) {
    return {
      exists: false,
      size: 0,
      used: 0,
      swappiness: 60,
    };
  }
}

/**
 * Apply SWAP settings to system
 */
export async function applySwapSettings(settings: z.infer<typeof SwapSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    if (settings.action === 'create' && settings.size) {
      // Create swap file
      await execAsync(`fallocate -l ${settings.size}G /swapfile`);
      await execAsync('chmod 600 /swapfile');
      await execAsync('mkswap /swapfile');
      await execAsync('swapon /swapfile');
      await execAsync('echo "/swapfile none swap sw 0 0" >> /etc/fstab');
    } else if (settings.action === 'remove') {
      // Remove swap file
      await execAsync('swapoff /swapfile');
      await execAsync('rm /swapfile');
      await execAsync('sed -i "/\\/swapfile/d" /etc/fstab');
    }

    if (settings.swappiness !== undefined) {
      await execAsync(`sysctl -w vm.swappiness=${settings.swappiness}`);
      await execAsync(`echo "vm.swappiness=${settings.swappiness}" >> /etc/sysctl.conf`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to apply SWAP settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 SYSTEM SETTINGS
// =============================================================================

/**
 * Get current system limits
 */
export async function getSystemLimits(): Promise<SystemSettings> {
  try {
    const openFilesInfo = await execAsync('ulimit -n');
    const maxProcessesInfo = await execAsync('ulimit -u');

    const sysctlKeys = [
      'net.core.somaxconn',
      'vm.overcommit_memory',
      'net.ipv4.tcp_max_syn_backlog',
      'vm.swappiness',
    ];

    const sysctl: Record<string, number> = {};

    for (const key of sysctlKeys) {
      const { stdout } = await execAsync(`sysctl -n ${key}`);
      sysctl[key] = parseInt(stdout.trim());
    }

    return {
      openFiles: parseInt(openFilesInfo.stdout.trim()),
      maxProcesses: parseInt(maxProcessesInfo.stdout.trim()),
      sysctl,
    };
  } catch (error) {
    console.error('Failed to get system limits:', error);
    return {
      openFiles: 1024,
      maxProcesses: 512,
      sysctl: {},
    };
  }
}

/**
 * Apply system settings
 */
export async function applySystemSettings(settings: z.infer<typeof SystemSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    if (settings.sysctl) {
      for (const [key, value] of Object.entries(settings.sysctl)) {
        await execAsync(`sysctl -w ${key}=${value}`);
        await execAsync(`echo "${key}=${value}" >> /etc/sysctl.conf`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to apply system settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 PANEL SETTINGS
// =============================================================================

/**
 * Get panel settings for user
 */
export async function getPanelSettings(userId: string): Promise<PanelSettings> {
  try {
    const prefs = await prisma.userPreference.findUnique({
      where: { userId },
    });

    return {
      theme: prefs?.theme || 'dark',
      language: prefs?.language || 'en',
      timezone: prefs?.timezone || 'UTC',
      emailNotifications: prefs?.emailNotifications ?? true,
      telegramNotifications: prefs?.telegramNotifications ?? false,
      updateCheck: prefs?.updateCheck ?? true,
    };
  } catch (error) {
    console.error('Failed to get panel settings:', error);
    return {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      emailNotifications: true,
      telegramNotifications: false,
      updateCheck: true,
    };
  }
}

/**
 * Update panel settings for user
 */
export async function updatePanelSettings(userId: string, settings: z.infer<typeof PanelSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...settings,
      },
      update: settings,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update panel settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 PROFILE SETTINGS
// =============================================================================

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<{ id: string; name: string; email: string; role: string; createdAt: Date; lastLoginAt: Date | null }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, settings: z.infer<typeof ProfileSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: settings,
    });

    await createAuditLog({
      action: 'UPDATE',
      resource: 'user_profile',
      userId,
      metadata: {
        action: 'profile_updated',
        changes: Object.keys(settings),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 PASSWORD CHANGE
// =============================================================================

/**
 * Change user password
 */
export async function changePassword(userId: string, settings: z.infer<typeof PasswordChangeSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return {
        success: false,
        error: 'Current password verification failed',
      };
    }

    // Verify current password
    const isValid = await bcrypt.compare(settings.currentPassword, user.passwordHash);

    if (!isValid) {
      return {
        success: false,
        error: 'Current password is incorrect',
      };
    }

    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(settings.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'user_password',
      userId,
      metadata: {
        action: 'password_changed',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to change password:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 SECURITY SETTINGS
// =============================================================================

/**
 * Get security settings for user
 */
export async function getSecuritySettings(userId: string): Promise<{ twoFactorEnabled: boolean; twoFactorSetup: boolean; sessions: any[]; loginAttempts: any }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    // Get active sessions from Redis
    const sessionsKey = `sessions:${userId}`;
    const sessionsData = await redis.hgetall(sessionsKey);
    const sessions = Object.entries(sessionsData).map(([sessionId, data]: [string, any]) => {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        id: sessionId,
        ip: parsed.ip,
        browser: parsed.browser,
        os: parsed.os,
        country: parsed.country,
        lastActive: parsed.lastActive,
        current: false, // Will be set by caller
      };
    });

    // Get login attempts from Redis
    const attemptsKey = `login:attempts:${userId}`;
    const attemptsData = await redis.get(attemptsKey);

    return {
      twoFactorEnabled: user?.twoFactorEnabled || false,
      twoFactorSetup: !!user?.twoFactorSecret,
      sessions,
      loginAttempts: attemptsData ? JSON.parse(attemptsData) : { count: 0 },
    };
  } catch (error) {
    console.error('Failed to get security settings:', error);
    return {
      twoFactorEnabled: false,
      twoFactorSetup: false,
      sessions: [],
      loginAttempts: { count: 0 },
    };
  }
}

/**
 * Update security settings (2FA)
 */
export async function updateSecuritySettings(userId: string, settings: z.infer<typeof SecuritySettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    if (settings.twoFactorEnabled !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: settings.twoFactorEnabled,
          twoFactorSecret: settings.twoFactorEnabled ? settings.twoFactorSecret : null,
        },
      });

      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'user_2fa',
        userId,
        metadata: {
          action: settings.twoFactorEnabled ? '2fa_enabled' : '2fa_disabled',
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update security settings:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 SESSION MANAGEMENT
// =============================================================================

/**
 * Terminate user sessions
 */
export async function terminateSessions(userId: string, settings: z.infer<typeof SessionSettingsSchema>): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionsKey = `sessions:${userId}`;

    if (settings.terminateAll) {
      // Terminate all other sessions
      const allSessions = await redis.hkeys(sessionsKey);

      for (const sessionId of allSessions) {
        await redis.hdel(sessionsKey, sessionId);
      }
    } else if (settings.sessionId) {
      // Terminate specific session
      await redis.hdel(sessionsKey, settings.sessionId);
    }

    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'user_sessions',
      userId,
      metadata: {
        action: 'sessions_terminated',
        sessionId: settings.sessionId,
        terminateAll: settings.terminateAll,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to terminate sessions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export const settingsService = {
  // Hardware
  detectHardware,
  calculateRecommendations,

  // PHP
  getPHPSettings,
  applyPHPSettings,

  // MariaDB
  getMariaDBSettings,
  applyMariaDBSettings,

  // OLS
  getOLSSettings,
  applyOLSSettings,

  // SWAP
  getSwapSettings,
  applySwapSettings,

  // System
  getSystemLimits,
  applySystemSettings,

  // Panel
  getPanelSettings,
  updatePanelSettings,

  // Profile
  getUserProfile,
  updateUserProfile,

  // Password
  changePassword,

  // Security
  getSecuritySettings,
  updateSecuritySettings,

  // Sessions
  terminateSessions,
};