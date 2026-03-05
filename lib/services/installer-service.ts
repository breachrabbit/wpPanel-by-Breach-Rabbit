// =============================================================================
// wpPanel by Breach Rabbit — Installer Service
// =============================================================================
// Service layer for browser-based installer
// Handles: hardware detection, optimal settings, dependency installation,
//          configuration, completion, and status tracking
// =============================================================================

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface HardwareInfo {
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
    available: number; // GB
    type: 'NVMe' | 'SSD' | 'HDD' | 'Unknown';
  };
  os: {
    name: string;
    version: string;
  };
  recommendedProfile: 'WordPress Optimized' | 'General Purpose' | 'High Performance';
}

export interface OptimalSettings {
  swap: {
    create: boolean;
    size: number; // GB
  };
  php: {
    memoryLimit: string;
    workers: number;
    opcache: number; // MB
  };
  mariadb: {
    innodbBufferPool: string;
    maxConnections: number;
  };
  ols: {
    maxConnections: number;
    keepAlive: boolean;
  };
}

export interface InstallerConfig {
  // Admin
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  
  // Server
  panelDomain?: string;
  panelPort?: string;
  sslEmail?: string;
  
  // OLS
  olsUrl?: string;
  olsUser?: string;
  olsPassword?: string;
  
  // Optional
  enableTelegram?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  enableSmtp?: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  
  // WordPress
  installWordPress?: boolean;
  wpDomain?: string;
  wpDbName?: string;
  wpDbUser?: string;
  wpDbPassword?: string;
  wpAdminUser?: string;
  wpAdminPassword?: string;
  wpAdminEmail?: string;
  wpLanguage?: string;
}

export interface InstallerStatus {
  completed: boolean;
  currentStep?: string;
  progress?: number;
  lastUpdate?: Date;
}

export interface InstallationProgress {
  step: string;
  message: string;
  progress: number;
  timestamp: Date;
}

// =============================================================================
// 🔐 SECURITY & VALIDATION
// =============================================================================

/**
 * Validate installer configuration
 */
const installerConfigSchema = z.object({
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  adminName: z.string().min(1, 'Name is required'),
  panelDomain: z.string().optional(),
  panelPort: z.string().optional(),
  sslEmail: z.string().email().optional(),
  olsUrl: z.string().optional(),
  olsUser: z.string().optional(),
  olsPassword: z.string().optional(),
  enableTelegram: z.boolean().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  enableSmtp: z.boolean().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  installWordPress: z.boolean().optional(),
  wpDomain: z.string().optional(),
  wpDbName: z.string().optional(),
  wpDbUser: z.string().optional(),
  wpDbPassword: z.string().optional(),
  wpAdminUser: z.string().optional(),
  wpAdminPassword: z.string().optional(),
  wpAdminEmail: z.string().email().optional(),
  wpLanguage: z.string().optional(),
});

/**
 * Check if installer is already completed
 */
export async function isInstallerCompleted(): Promise<boolean> {
  const session = await prisma.installerSession.findFirst({
    where: { completed: true },
  });
  return !!session;
}

/**
 * Validate installer token (for setup access)
 */
export async function validateInstallerToken(token?: string): Promise<boolean> {
  if (!token || !process.env.INSTALLER_TOKEN) {
    return false;
  }
  return token === process.env.INSTALLER_TOKEN;
}

/**
 * Rate limiting for installer endpoints
 */
export async function checkRateLimit(ip: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
}> {
  const key = `installer:ratelimit:${ip}`;
  const attempts = await redis.get(key);
  const count = attempts ? parseInt(attempts, 10) : 0;
  
  if (count >= 10) {
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      remaining: 0,
      resetTime: ttl > 0 ? ttl : 60,
    };
  }
  
  await redis.incr(key);
  await redis.expire(key, 60);
  
  return {
    allowed: true,
    remaining: 10 - count - 1,
    resetTime: 60,
  };
}

// =============================================================================
// 🔧 HARDWARE DETECTION
// =============================================================================

/**
 * Detect server hardware specifications
 */
export async function detectHardware(): Promise<HardwareInfo> {
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

    // OS Detection
    const osInfo = await execAsync('cat /etc/os-release');
    const osNameMatch = osInfo.stdout.match(/PRETTY_NAME="(.+)"/);
    const osVersionMatch = osInfo.stdout.match(/VERSION_ID="(.+)"/);
    
    const os = {
      name: osNameMatch ? osNameMatch[1] : 'Linux',
      version: osVersionMatch ? osVersionMatch[1] : 'Unknown',
    };

    // Recommended Profile (from MASTER_PLAN.md logic)
    let recommendedProfile: 'WordPress Optimized' | 'General Purpose' | 'High Performance' = 'General Purpose';
    
    if (ram.total >= 8 && cpu.cores >= 4 && disk.type === 'NVMe') {
      recommendedProfile = 'WordPress Optimized';
    } else if (ram.total >= 16 && cpu.cores >= 8) {
      recommendedProfile = 'High Performance';
    }

    return { cpu, ram, disk, os, recommendedProfile };
  } catch (error) {
    console.error('Hardware detection failed:', error);
    
    // Return safe defaults
    return {
      cpu: { cores: 2, model: 'Unknown' },
      ram: { total: 4, available: 2 },
      disk: { total: 50, available: 25, type: 'Unknown' },
      os: { name: 'Linux', version: 'Unknown' },
      recommendedProfile: 'General Purpose',
    };
  }
}

/**
 * Calculate optimal settings based on hardware
 * Based on MASTER_PLAN.md logic table
 */
export function calculateOptimalSettings(hardware: {
  cpu: { cores: number };
  ram: { total: number };
}): OptimalSettings {
  const ram = hardware.ram.total;
  const cpuCores = hardware.cpu.cores;
  
  // RAM 1-2 GB
  if (ram <= 2) {
    return {
      swap: { create: true, size: 2 },
      php: { memoryLimit: '128M', workers: 2, opcache: 64 },
      mariadb: { innodbBufferPool: '256M', maxConnections: 50 },
      ols: { maxConnections: 100, keepAlive: true },
    };
  }
  
  // RAM 2-4 GB
  if (ram <= 4) {
    return {
      swap: { create: true, size: 4 },
      php: { memoryLimit: '256M', workers: 4, opcache: 128 },
      mariadb: { innodbBufferPool: '512M', maxConnections: 100 },
      ols: { maxConnections: 200, keepAlive: true },
    };
  }
  
  // RAM 4-8 GB
  if (ram <= 8) {
    return {
      swap: { create: true, size: 4 },
      php: { memoryLimit: '256M', workers: 8, opcache: 256 },
      mariadb: { innodbBufferPool: '1G', maxConnections: 150 },
      ols: { maxConnections: 300, keepAlive: true },
    };
  }
  
  // RAM 8-16 GB
  if (ram <= 16) {
    return {
      swap: { create: ram < 8, size: 2 },
      php: { memoryLimit: '512M', workers: cpuCores * 3, opcache: 512 },
      mariadb: { innodbBufferPool: `${Math.floor(ram * 0.5)}G`, maxConnections: 200 },
      ols: { maxConnections: 500, keepAlive: true },
    };
  }
  
  // RAM 16+ GB
  return {
    swap: { create: false, size: 0 },
    php: { memoryLimit: '512M', workers: cpuCores * 4, opcache: 1024 },
    mariadb: { innodbBufferPool: `${Math.floor(ram * 0.6)}G`, maxConnections: 300 },
    ols: { maxConnections: 1000, keepAlive: true },
  };
}

// =============================================================================
// 📦 DEPENDENCY MANAGEMENT
// =============================================================================

/**
 * Check if required dependencies are installed
 */
export async function checkDependencies(): Promise<{
  allInstalled: boolean;
  results: Array<{ name: string; installed: boolean }>;
}> {
  const checks = [
    { name: 'openlitespeed', command: 'which lswsctrl' },
    { name: 'mariadb', command: 'which mysql' },
    { name: 'postgresql', command: 'which psql' },
    { name: 'redis', command: 'which redis-cli' },
    { name: 'nodejs', command: 'node --version' },
    { name: 'npm', command: 'npm --version' },
    { name: 'git', command: 'which git' },
    { name: 'curl', command: 'which curl' },
    { name: 'wget', command: 'which wget' },
    { name: 'ufw', command: 'which ufw' },
    { name: 'fail2ban', command: 'which fail2ban-client' },
    { name: 'restic', command: 'which restic' },
    { name: 'acme.sh', command: 'which acme.sh' },
    { name: 'wp-cli', command: 'which wp' },
  ];

  const results = await Promise.all(
    checks.map(async (check) => {
      try {
        await execAsync(check.command);
        return { name: check.name, installed: true };
      } catch {
        return { name: check.name, installed: false };
      }
    })
  );

  const allInstalled = results.every((r) => r.installed);

  return { allInstalled, results };
}

/**
 * Install base dependencies
 */
export async function installBaseDependencies(): Promise<void> {
  const packages = [
    'curl', 'git', 'wget', 'nano', 'ufw', 'fail2ban', 'htop', 'unzip',
    'openlitespeed', 'lsphp83', 'lsphp83-mysql', 'lsphp83-curl', 'lsphp83-imap',
    'lsphp83-gd', 'lsphp83-mbstring', 'lsphp83-xml', 'lsphp83-zip', 'lsphp83-intl',
    'mariadb-server', 'mariadb-client', 'postgresql', 'redis-server',
    'restic', 'acme.sh', 'wp-cli', 'nodejs', 'npm',
  ];

  await execAsync('apt update');
  await execAsync('apt upgrade -y');
  
  for (const pkg of packages) {
    await execAsync(`apt install -y ${pkg}`);
  }
}

// =============================================================================
// ⚙️ CONFIGURATION MANAGEMENT
// =============================================================================

/**
 * Save installer configuration
 */
export async function saveInstallerConfig(config: InstallerConfig): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    // Validate configuration
    const parsed = installerConfigSchema.safeParse(config);
    if (!parsed.success) {
      return {
        success: false,
        error: 'Invalid configuration',
      };
    }

    // Create or update installer session
    const session = await prisma.installerSession.upsert({
      where: { id: 'installer' },
      create: {
        id: 'installer',
        token: process.env.INSTALLER_TOKEN || 'default-token',
        completed: false,
        config: config,
        currentStep: 'configure',
      },
      update: {
        config: config,
        currentStep: 'configure',
        updatedAt: new Date(),
      },
    });

    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'installer',
      metadata: {
        action: 'config_saved',
        adminEmail: config.adminEmail,
      },
    });

    return {
      success: true,
      sessionId: session.id,
    };
  } catch (error) {
    console.error('Failed to save installer config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get installer configuration
 */
export async function getInstallerConfig(): Promise<InstallerConfig | null> {
  const session = await prisma.installerSession.findUnique({
    where: { id: 'installer' },
  });
  
  if (!session || !session.config) {
    return null;
  }
  
  return session.config as unknown as InstallerConfig;
}

// =============================================================================
// 🚀 INSTALLATION EXECUTION
// =============================================================================

/**
 * Apply optimal server settings
 */
export async function applyOptimalSettings(settings: OptimalSettings): Promise<{
  success: boolean;
  results: Array<{ action: string; success: boolean; error?: string }>;
}> {
  const results = [];

  // Apply SWAP if needed
  if (settings.swap.create) {
    try {
      await execAsync(`fallocate -l ${settings.swap.size}G /swapfile`);
      await execAsync('chmod 600 /swapfile');
      await execAsync('mkswap /swapfile');
      await execAsync('swapon /swapfile');
      
      // Make permanent
      await execAsync('echo "/swapfile none swap sw 0 0" >> /etc/fstab');
      
      results.push({ action: 'swap', success: true, size: settings.swap.size });
    } catch (error) {
      results.push({
        action: 'swap',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Apply sysctl settings
  try {
    await execAsync('echo "vm.swappiness=10" >> /etc/sysctl.conf');
    await execAsync('sysctl -p');
    results.push({ action: 'sysctl', success: true });
  } catch (error) {
    results.push({
      action: 'sysctl',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Apply PHP settings
  try {
    const phpIniPath = '/etc/php/8.3/litespeed/php.ini';
    await execAsync(`sed -i 's/memory_limit = .*/memory_limit = ${settings.php.memoryLimit}/' ${phpIniPath}`);
    await execAsync(`sed -i 's/opcache.memory_consumption = .*/opcache.memory_consumption = ${settings.php.opcache}/' ${phpIniPath}`);
    results.push({ action: 'php', success: true });
  } catch (error) {
    results.push({
      action: 'php',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Apply MariaDB settings
  try {
    const mysqlCnfPath = '/etc/mysql/mariadb.conf.d/50-server.cnf';
    await execAsync(`sed -i 's/innodb_buffer_pool_size = .*/innodb_buffer_pool_size = ${settings.mariadb.innodbBufferPool}/' ${mysqlCnfPath}`);
    await execAsync(`sed -i 's/max_connections = .*/max_connections = ${settings.mariadb.maxConnections}/' ${mysqlCnfPath}`);
    await execAsync('systemctl restart mariadb');
    results.push({ action: 'mariadb', success: true });
  } catch (error) {
    results.push({
      action: 'mariadb',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return {
    success: results.every((r) => r.success),
    results,
  };
}

/**
 * Setup PostgreSQL database for panel
 */
export async function setupPanelDatabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const dbPassword = process.env.DB_PASSWORD || await generateSecurePassword(32);
    
    await execAsync(`sudo -u postgres psql -c "CREATE USER wppanel WITH PASSWORD '${dbPassword}'"`);
    await execAsync(`sudo -u postgres psql -c "CREATE DATABASE wppanel OWNER wppanel"`);
    await execAsync(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wppanel TO wppanel"`);
    
    // Update .env with database URL
    const databaseUrl = `postgresql://wppanel:${dbPassword}@localhost:5432/wppanel?schema=public`;
    await execAsync(`echo "DATABASE_URL=${databaseUrl}" >> .env`);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create admin user
 */
export async function createAdminUser(config: InstallerConfig): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(config.adminPassword, 12);

    await prisma.user.create({
      data: {
        email: config.adminEmail.toLowerCase(),
        passwordHash,
        name: config.adminName,
        role: 'ADMIN',
        theme: 'DARK',
        language: 'EN',
        timezone: 'UTC',
      },
    });

    await createAuditLog({
      action: 'CREATE',
      resource: 'user',
      metadata: {
        email: config.adminEmail,
        role: 'ADMIN',
        source: 'installer',
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete installation
 */
export async function completeInstallation(config: InstallerConfig, hardware?: HardwareInfo, optimalSettings?: OptimalSettings): Promise<{
  success: boolean;
  redirectUrl?: string;
  error?: string;
}> {
  try {
    // Mark installer as completed
    await prisma.installerSession.update({
      where: { id: 'installer' },
      data: {
        completed: true,
        completedAt: new Date(),
        config: {
          ...config,
          hardware,
          optimalSettings,
        },
        currentStep: 'complete',
      },
    });

    // Create admin user
    const adminResult = await createAdminUser(config);
    if (!adminResult.success) {
      return {
        success: false,
        error: adminResult.error,
      };
    }

    // Log completion to Redis for audit
    await redis.set(
      'installer:completed',
      JSON.stringify({
        completedAt: new Date().toISOString(),
        adminEmail: config.adminEmail,
        hardware,
        ip: 'installer',
      }),
      { EX: 31536000 } // 1 year
    );

    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'installer',
      metadata: {
        action: 'installation_completed',
        adminEmail: config.adminEmail,
        hardware,
      },
    });

    return {
      success: true,
      redirectUrl: '/login',
    };
  } catch (error) {
    console.error('Installation completion failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate secure random password
 */
export async function generateSecurePassword(length: number = 32): Promise<string> {
  const { randomBytes } = await import('crypto');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  
  return password;
}

/**
 * Get installer status
 */
export async function getInstallerStatus(): Promise<InstallerStatus> {
  const session = await prisma.installerSession.findUnique({
    where: { id: 'installer' },
  });

  if (!session) {
    return { completed: false };
  }

  return {
    completed: session.completed,
    currentStep: session.currentStep || undefined,
    lastUpdate: session.updatedAt || undefined,
  };
}

/**
 * Reset installer (development only)
 */
export async function resetInstaller(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        error: 'Not allowed in production',
      };
    }

    await prisma.installerSession.deleteMany();
    await redis.del('installer:completed');

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate command for security (whitelist)
 */
export function isCommandAllowed(command: string): boolean {
  const allowedCommands = [
    'apt update',
    'apt upgrade',
    'apt install',
    'fallocate',
    'chmod',
    'mkswap',
    'swapon',
    'echo',
    'systemctl',
    'sudo -u postgres psql',
    'cp',
    'npx prisma',
    'npm run',
    'wp',
    'sed -i',
    'cat',
    'which',
    'lscpu',
    'free',
    'df',
    'lsblk',
  ];

  return allowedCommands.some((allowed) => command.startsWith(allowed));
}

// =============================================================================
// 📝 EXPORTS
// =============================================================================

export type {
  HardwareInfo,
  OptimalSettings,
  InstallerConfig,
  InstallerStatus,
  InstallationProgress,
};

export const installerService = {
  // Status & Validation
  isInstallerCompleted,
  validateInstallerToken,
  checkRateLimit,
  getInstallerStatus,
  resetInstaller,
  
  // Hardware
  detectHardware,
  calculateOptimalSettings,
  
  // Dependencies
  checkDependencies,
  installBaseDependencies,
  
  // Configuration
  saveInstallerConfig,
  getInstallerConfig,
  
  // Installation
  applyOptimalSettings,
  setupPanelDatabase,
  createAdminUser,
  completeInstallation,
  
  // Helpers
  generateSecurePassword,
  isCommandAllowed,
};