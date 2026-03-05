// =============================================================================
// wpPanel by Breach Rabbit — WP-CLI Wrapper
// =============================================================================
// Full WP-CLI 2.x orchestration layer
// Features: install, plugins, themes, updates, security, database
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

export interface WPConfig {
  /** Path to WordPress installation */
  wpPath: string;
  
  /** WP-CLI binary path */
  binaryPath?: string;
  
  /** PHP binary path */
  phpPath?: string;
  
  /** Allow running as root */
  allowRoot?: boolean;
  
  /** Timeout for commands (ms) */
  timeout?: number;
}

export interface WPInstallOptions {
  /** Site URL */
  url: string;
  
  /** Site title */
  title: string;
  
  /** Admin username */
  adminUser: string;
  
  /** Admin password */
  adminPassword: string;
  
  /** Admin email */
  adminEmail: string;
  
  /** Language */
  language?: string;
  
  /** Skip email confirmation */
  skipEmail?: boolean;
}

export interface WPPlugin {
  name: string;
  status: 'active' | 'inactive' | 'update_available';
  version: string;
  updateVersion?: string;
  author: string;
}

export interface WPTheme {
  name: string;
  status: 'active' | 'inactive' | 'update_available';
  version: string;
  updateVersion?: string;
  isParent?: boolean;
}

export interface WPSecurityScan {
  score: number;
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    recommendation: string;
  }>;
  passed: string[];
}

export interface WPUpdateResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  message?: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const WPInstallSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1).max(100),
  adminUser: z.string().min(4).max(50),
  adminPassword: z.string().min(8),
  adminEmail: z.string().email(),
  language: z.string().default('en_US'),
  skipEmail: z.boolean().default(true),
});

// =============================================================================
// 🏗️ WP-CLI WRAPPER CLASS
// =============================================================================

export class WPCLIWrapper {
  private config: WPConfig;

  constructor(config: WPConfig) {
    this.config = {
      allowRoot: true,
      timeout: 300000, // 5 minutes
      ...config,
    };
  }

  // =============================================================================
  // 🔧 COMMAND EXECUTION
  // =============================================================================

  /**
   * Get WP-CLI binary path
   */
  private getBinary(): string {
    return this.config.binaryPath || 'wp';
  }

  /**
   * Get PHP binary path
   */
  private getPhpPath(): string {
    return this.config.phpPath || 'php';
  }

  /**
   * Execute WP-CLI command
   */
  private async exec(args: string[], options?: { parseJson?: boolean; cwd?: string }): Promise<any> {
    const binary = this.getBinary();
    const command = `${binary} ${args.join(' ')}`;
    const cwd = options?.cwd || this.config.wpPath;
    const timeout = this.config.timeout;

    // Add --allow-root if configured
    if (this.config.allowRoot && !args.includes('--allow-root')) {
      args.push('--allow-root');
    }

    // Add --path if not in args
    if (!args.some(a => a.startsWith('--path='))) {
      args.unshift(`--path=${cwd}`);
    }

    // Add --format=json for JSON output
    if (options?.parseJson && !args.includes('--format=json')) {
      args.push('--format=json');
    }

    const fullCommand = `${binary} ${args.join(' ')}`;

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd,
        timeout,
        maxBuffer: 1024 * 1024 * 50, // 50MB buffer
        env: {
          ...process.env,
          WP_CLI_ALLOW_ROOT: this.config.allowRoot ? '1' : '0',
        },
      });

      if (options?.parseJson) {
        try {
          return JSON.parse(stdout);
        } catch {
          return stdout;
        }
      }

      return stdout || stderr;
    } catch (error: any) {
      throw new WPCLIError(
        `WP-CLI command failed: ${fullCommand}`,
        error.stdout,
        error.stderr,
        error.code
      );
    }
  }

  // =============================================================================
  // 📦 INSTALLATION
  // =============================================================================

  /**
   * Check if WordPress is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      await this.exec(['core', 'is-installed']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download WordPress core
   */
  async download(version?: string): Promise<void> {
    const args = ['core', 'download'];
    
    if (version) {
      args.push('--version', version);
    }

    await this.exec(args);
  }

  /**
   * Install WordPress
   */
  async install(options: WPInstallOptions): Promise<{ success: boolean; url: string }> {
    const validatedOptions = WPInstallSchema.parse(options);

    const args = [
      'core',
      'install',
      `--url=${validatedOptions.url}`,
      `--title="${validatedOptions.title}"`,
      `--admin_user=${validatedOptions.adminUser}`,
      `--admin_password=${validatedOptions.adminPassword}`,
      `--admin_email=${validatedOptions.adminEmail}`,
      `--locale=${validatedOptions.language}`,
    ];

    if (validatedOptions.skipEmail) {
      args.push('--skip-email');
    }

    await this.exec(args);

    return {
      success: true,
      url: validatedOptions.url,
    };
  }

  /**
   * Full WordPress installation (download + install)
   */
  async fullInstall(options: WPInstallOptions, version?: string): Promise<{ success: boolean; url: string }> {
    // Download core
    await this.download(version);

    // Install
    return this.install(options);
  }

  // =============================================================================
  // 🔌 PLUGIN MANAGEMENT
  // =============================================================================

  /**
   * List plugins
   */
  async listPlugins(): Promise<WPPlugin[]> {
    const result = await this.exec(['plugin', 'list', '--format=json'], { parseJson: true });
    
    return (result || []).map((p: any) => ({
      name: p.name,
      status: p.status,
      version: p.version,
      updateVersion: p.update_version,
      author: p.author,
    }));
  }

  /**
   * Install plugin
   */
  async installPlugin(slug: string, activate?: boolean): Promise<void> {
    const args = ['plugin', 'install', slug];
    
    if (activate) {
      args.push('--activate');
    }

    await this.exec(args);
  }

  /**
   * Activate plugin
   */
  async activatePlugin(slug: string): Promise<void> {
    await this.exec(['plugin', 'activate', slug]);
  }

  /**
   * Deactivate plugin
   */
  async deactivatePlugin(slug: string): Promise<void> {
    await this.exec(['plugin', 'deactivate', slug]);
  }

  /**
   * Delete plugin
   */
  async deletePlugin(slug: string): Promise<void> {
    await this.exec(['plugin', 'delete', slug, '--force']);
  }

  /**
   * Update plugin
   */
  async updatePlugin(slug: string): Promise<{ previousVersion: string; newVersion: string }> {
    const result = await this.exec(['plugin', 'update', slug, '--format=json'], { parseJson: true });
    
    return {
      previousVersion: result[0]?.previous_version || '',
      newVersion: result[0]?.version || '',
    };
  }

  /**
   * Update all plugins
   */
  async updateAllPlugins(): Promise<Array<{ name: string; previousVersion: string; newVersion: string }>> {
    const result = await this.exec(['plugin', 'update', '--all', '--format=json'], { parseJson: true });
    
    return (result || []).map((p: any) => ({
      name: p.name,
      previousVersion: p.previous_version,
      newVersion: p.version,
    }));
  }

  /**
   * Get plugin status
   */
  async getPluginStatus(slug: string): Promise<WPPlugin | null> {
    const plugins = await this.listPlugins();
    return plugins.find(p => p.name === slug) || null;
  }

  // =============================================================================
  // 🎨 THEME MANAGEMENT
  // =============================================================================

  /**
   * List themes
   */
  async listThemes(): Promise<WPTheme[]> {
    const result = await this.exec(['theme', 'list', '--format=json'], { parseJson: true });
    
    return (result || []).map((t: any) => ({
      name: t.name,
      status: t.status,
      version: t.version,
      updateVersion: t.update_version,
      isParent: t.parent === '',
    }));
  }

  /**
   * Install theme
   */
  async installTheme(slug: string, activate?: boolean): Promise<void> {
    const args = ['theme', 'install', slug];
    
    if (activate) {
      args.push('--activate');
    }

    await this.exec(args);
  }

  /**
   * Activate theme
   */
  async activateTheme(slug: string): Promise<void> {
    await this.exec(['theme', 'activate', slug]);
  }

  /**
   * Delete theme
   */
  async deleteTheme(slug: string): Promise<void> {
    await this.exec(['theme', 'delete', slug, '--force']);
  }

  /**
   * Update theme
   */
  async updateTheme(slug: string): Promise<{ previousVersion: string; newVersion: string }> {
    const result = await this.exec(['theme', 'update', slug, '--format=json'], { parseJson: true });
    
    return {
      previousVersion: result[0]?.previous_version || '',
      newVersion: result[0]?.version || '',
    };
  }

  /**
   * Update all themes
   */
  async updateAllThemes(): Promise<Array<{ name: string; previousVersion: string; newVersion: string }>> {
    const result = await this.exec(['theme', 'update', '--all', '--format=json'], { parseJson: true });
    
    return (result || []).map((t: any) => ({
      name: t.name,
      previousVersion: t.previous_version,
      newVersion: t.version,
    }));
  }

  // =============================================================================
  // 🔄 CORE UPDATES
  // =============================================================================

  /**
   * Check for core updates
   */
  async checkCoreUpdate(): Promise<{ hasUpdate: boolean; currentVersion: string; latestVersion: string }> {
    const version = await this.exec(['core', 'version']);
    const updates = await this.exec(['core', 'check-update', '--format=json'], { parseJson: true });

    const hasUpdate = Array.isArray(updates) && updates.length > 0;
    const latestVersion = hasUpdate ? updates[0].version : version.trim();

    return {
      hasUpdate,
      currentVersion: version.trim(),
      latestVersion,
    };
  }

  /**
   * Update WordPress core
   */
  async updateCore(): Promise<WPUpdateResult> {
    const before = await this.checkCoreUpdate();

    if (!before.hasUpdate) {
      return {
        success: true,
        previousVersion: before.currentVersion,
        newVersion: before.currentVersion,
        message: 'Already up to date',
      };
    }

    await this.exec(['core', 'update']);

    const after = await this.checkCoreUpdate();

    return {
      success: true,
      previousVersion: before.currentVersion,
      newVersion: after.latestVersion,
    };
  }

  // =============================================================================
  // 🔐 SECURITY
  // =============================================================================

  /**
   * Run security scan (requires wp-cli-security package)
   */
  async securityScan(): Promise<WPSecurityScan> {
    try {
      // Check if security package is installed
      await this.exec(['package', 'install', 'wp-cli/security-cli']);
      
      const result = await this.exec(['security', 'check', '--format=json'], { parseJson: true });
      
      return {
        score: result.score || 0,
        issues: result.issues || [],
        passed: result.passed || [],
      };
    } catch {
      // Fallback: manual checks
      const issues: WPSecurityScan['issues'] = [];
      const passed: string[] = [];

      // Check wp-config.php permissions
      try {
        const stats = await fs.stat(path.join(this.config.wpPath, 'wp-config.php'));
        const mode = stats.mode & 0o777;
        if (mode <= 0o640) {
          passed.push('wp-config.php permissions');
        } else {
          issues.push({
            severity: 'high',
            title: 'wp-config.php has weak permissions',
            description: `Current permissions: ${mode.toString(8)}`,
            recommendation: 'Set permissions to 640 or 600',
          });
        }
      } catch {
        issues.push({
          severity: 'critical',
          title: 'wp-config.php not found',
          description: 'WordPress configuration file is missing',
          recommendation: 'Reinstall WordPress',
        });
      }

      // Check for XML-RPC
      try {
        await fs.access(path.join(this.config.wpPath, 'xmlrpc.php'));
        issues.push({
          severity: 'medium',
          title: 'XML-RPC is enabled',
          description: 'XML-RPC can be used for brute force attacks',
          recommendation: 'Disable XML-RPC if not needed',
        });
      } catch {
        passed.push('XML-RPC disabled');
      }

      return {
        score: 100 - (issues.length * 20),
        issues,
        passed,
      };
    }
  }

  /**
   * Harden WordPress security
   */
  async hardenSecurity(): Promise<Array<{ action: string; success: boolean }>> {
    const results: Array<{ action: string; success: boolean }> = [];

    // Disable file editing in admin
    try {
      await this.exec(['config', 'set', 'DISALLOW_FILE_EDIT', 'true', '--raw']);
      results.push({ action: 'Disable file editing', success: true });
    } catch {
      results.push({ action: 'Disable file editing', success: false });
    }

    // Disable XML-RPC
    try {
      const xmlrpcPath = path.join(this.config.wpPath, 'xmlrpc.php');
      await fs.rename(xmlrpcPath, `${xmlrpcPath}.disabled`);
      results.push({ action: 'Disable XML-RPC', success: true });
    } catch {
      results.push({ action: 'Disable XML-RPC', success: false });
    }

    // Regenerate salts
    try {
      await this.exec(['config', 'shuffle-salts']);
      results.push({ action: 'Regenerate salts', success: true });
    } catch {
      results.push({ action: 'Regenerate salts', success: false });
    }

    return results;
  }

  /**
   * Change admin URL
   */
  async changeAdminUrl(newUrl: string): Promise<void> {
    await this.exec(['config', 'set', 'WP_ADMIN_DIR', `"${newUrl}"`]);
  }

  // =============================================================================
  // 💾 DATABASE
  // =============================================================================

  /**
   * Export database
   */
  async exportDb(outputPath: string): Promise<void> {
    await this.exec(['db', 'export', outputPath]);
  }

  /**
   * Import database
   */
  async importDb(inputPath: string): Promise<void> {
    await this.exec(['db', 'import', inputPath]);
  }

  /**
   * Search and replace
   */
  async searchReplace(search: string, replace: string, options?: { dryRun?: boolean; tables?: string[] }): Promise<void> {
    const args = ['search-replace', search, replace];

    if (options?.dryRun) {
      args.push('--dry-run');
    }

    if (options?.tables && options.tables.length > 0) {
      args.push(...options.tables);
    }

    await this.exec(args);
  }

  /**
   * Get database size
   */
  async getDbSize(): Promise<number> {
    const result = await this.exec(['db', 'size', '--format=json'], { parseJson: true });
    return result.bytes || 0;
  }

  // =============================================================================
  // 🔧 MAINTENANCE
  // =============================================================================

  /**
   * Enable maintenance mode
   */
  async enableMaintenance(): Promise<void> {
    await this.exec(['maintenance-mode', 'activate']);
  }

  /**
   * Disable maintenance mode
   */
  async disableMaintenance(): Promise<void> {
    await this.exec(['maintenance-mode', 'deactivate']);
  }

  /**
   * Get maintenance mode status
   */
  async getMaintenanceStatus(): Promise<boolean> {
    try {
      const result = await this.exec(['maintenance-mode', 'is-active']);
      return result.includes('active');
    } catch {
      return false;
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await this.exec(['cache', 'flush']);
    await this.exec(['transient', 'clean', '--all']);
  }

  /**
   * Regenerate thumbnails
   */
  async regenerateThumbnails(options?: { onlyMissing?: boolean }): Promise<void> {
    const args = ['media', 'regenerate', '--yes'];

    if (options?.onlyMissing) {
      args.push('--only-missing');
    }

    await this.exec(args);
  }

  // =============================================================================
  // 📊 INFO
  // =============================================================================

  /**
   * Get WordPress info
   */
  async getWpInfo(): Promise<{
    version: string;
    language: string;
    url: string;
    multisite: boolean;
    dbHost: string;
    dbName: string;
  }> {
    const result = await this.exec(['core', 'version', '--extra', '--format=json'], { parseJson: true });
    
    return {
      version: result.version || '',
      language: result.language || 'en_US',
      url: result['wp-url'] || '',
      multisite: result.multisite || false,
      dbHost: result['database-host'] || 'localhost',
      dbName: result['database-name'] || '',
    };
  }

  /**
   * Get PHP info
   */
  async getPhpInfo(): Promise<{
    version: string;
    memoryLimit: string;
    maxExecutionTime: number;
  }> {
    const result = await this.exec(['core', 'verify-checksums', '--format=json'], { parseJson: true });
    
    const phpVersion = await this.exec(['eval', 'echo phpversion();']);
    const memoryLimit = await this.exec(['eval', 'echo ini_get("memory_limit");']);
    const maxExecutionTime = await this.exec(['eval', 'echo ini_get("max_execution_time");']);

    return {
      version: phpVersion.trim(),
      memoryLimit: memoryLimit.trim(),
      maxExecutionTime: parseInt(maxExecutionTime.trim()) || 30,
    };
  }

  /**
   * Get site health status
   */
  async getSiteHealth(): Promise<{
    status: 'good' | 'recommended' | 'critical';
    tests: Array<{ test: string; status: string; label: string }>;
  }> {
    try {
      const result = await this.exec(['site', 'health', 'check-status', '--format=json'], { parseJson: true });
      return result;
    } catch {
      return {
        status: 'unknown',
        tests: [],
      };
    }
  }
}

// =============================================================================
// ❌ ERROR CLASS
// =============================================================================

export class WPCLIError extends Error {
  constructor(
    message: string,
    public stdout?: string,
    public stderr?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'WPCLIError';
  }
}

// =============================================================================
// 📦 FACTORY FUNCTION
// =============================================================================

/**
 * Create WPCLIWrapper instance from config
 */
export function createWPCLIWrapper(config: WPConfig): WPCLIWrapper {
  return new WPCLIWrapper(config);
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * WP-CLI Wrapper — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Installation:
 *    - Download WordPress core
 *    - Full install (download + configure)
 *    - Check if installed
 * 
 * 2. Plugin Management:
 *    - List plugins
 *    - Install/activate/deactivate/delete
 *    - Update single or all
 *    - Get status
 * 
 * 3. Theme Management:
 *    - List themes
 *    - Install/activate/delete
 *    - Update single or all
 * 
 * 4. Core Updates:
 *    - Check for updates
 *    - Update core
 *    - Get version info
 * 
 * 5. Security:
 *    - Security scan
 *    - Hardening (disable file edit, XML-RPC, regenerate salts)
 *    - Change admin URL
 * 
 * 6. Database:
 *    - Export/import
 *    - Search/replace
 *    - Get size
 * 
 * 7. Maintenance:
 *    - Enable/disable maintenance mode
 *    - Clear cache
 *    - Regenerate thumbnails
 * 
 * 8. Info:
 *    - WordPress info
 *    - PHP info
 *    - Site health status
 * 
 * Requirements:
 * - WP-CLI 2.x installed globally
 * - PHP 8.2+
 * - WordPress installed at wpPath
 * 
 * Usage Example:
 * 
 * import { createWPCLIWrapper } from '@/lib/integrations/wp-cli-wrapper';
 * 
 * const wp = createWPCLIWrapper({
 *   wpPath: '/var/www/example.com',
 *   allowRoot: true,
 * });
 * 
 * // Check if installed
 * const isInstalled = await wp.isInstalled();
 * 
 * // Full installation
 * await wp.fullInstall({
 *   url: 'https://example.com',
 *   title: 'My Site',
 *   adminUser: 'admin',
 *   adminPassword: 'secure-password',
 *   adminEmail: 'admin@example.com',
 *   language: 'en_US',
 * });
 * 
 * // Install plugins
 * await wp.installPlugin('litespeed-cache', true);
 * await wp.installPlugin('redis-object-cache', true);
 * await wp.installPlugin('wordfence', true);
 * 
 * // List plugins
 * const plugins = await wp.listPlugins();
 * 
 * // Update all plugins
 * await wp.updateAllPlugins();
 * 
 * // Security scan
 * const scan = await wp.securityScan();
 * 
 * // Harden security
 * await wp.hardenSecurity();
 * 
 * // Update core
 * await wp.updateCore();
 * 
 * // Maintenance mode
 * await wp.enableMaintenance();
 * // ... do maintenance ...
 * await wp.disableMaintenance();
 * 
 * // Database export
 * await wp.exportDb('/var/backups/example.com.sql');
 */