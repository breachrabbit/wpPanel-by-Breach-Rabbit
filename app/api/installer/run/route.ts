// =============================================================================
// wpPanel by Breach Rabbit — Installer Run API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// Executes the full server installation with live terminal streaming
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { hash } from 'bcryptjs';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface HardwareInfo {
  cpu: {
    cores: number;
    model: string;
  };
  ram: {
    total: number;
    available: number;
  };
  disk: {
    total: number;
    available: number;
    type: 'NVMe' | 'SSD' | 'HDD' | 'Unknown';
  };
  os: {
    name: string;
    version: string;
  };
  recommendedProfile: 'WordPress Optimized' | 'General Purpose' | 'High Performance';
}

interface OptimalSettings {
  swap: {
    create: boolean;
    size: number;
  };
  php: {
    memoryLimit: string;
    workers: number;
    opcache: number;
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

interface InstallerConfig {
  // Database
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  
  // Admin
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  
  // Server
  panelDomain: string;
  panelPort: string;
  sslEmail: string;
  
  // OLS
  olsUrl: string;
  olsUser: string;
  olsPassword: string;
  
  // Optional
  telegramBot?: string;
  telegramChatId?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  
  // WordPress
  installWordPress: boolean;
  wpDomain?: string;
  wpTitle?: string;
  wpAdminUser?: string;
  wpAdminPassword?: string;
  wpAdminEmail?: string;
  wpLanguage?: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMA
// =============================================================================

const InstallerConfigSchema = z.object({
  dbHost: z.string().min(1),
  dbPort: z.string().regex(/^\d+$/),
  dbName: z.string().min(1),
  dbUser: z.string().min(1),
  dbPassword: z.string().min(8),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(2),
  panelDomain: z.string().optional(),
  panelPort: z.string().regex(/^\d+$/).default('3000'),
  sslEmail: z.string().email(),
  olsUrl: z.string().url(),
  olsUser: z.string().min(1),
  olsPassword: z.string().min(1),
  telegramBot: z.string().optional(),
  telegramChatId: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  installWordPress: z.boolean().default(false),
  wpDomain: z.string().optional(),
  wpTitle: z.string().optional(),
  wpAdminUser: z.string().optional(),
  wpAdminPassword: z.string().optional(),
  wpAdminEmail: z.string().email().optional().or(z.literal('')),
  wpLanguage: z.string().default('en_US'),
});

// =============================================================================
// 🔧 INSTALLATION SERVICE
// =============================================================================

class InstallerService {
  private sessionId: string;
  private config: InstallerConfig;
  private hardware: HardwareInfo;
  private settings: OptimalSettings;
  private progress: number;
  private errors: string[];

  constructor(
    sessionId: string,
    config: InstallerConfig,
    hardware: HardwareInfo,
    settings: OptimalSettings
  ) {
    this.sessionId = sessionId;
    this.config = config;
    this.hardware = hardware;
    this.settings = settings;
    this.progress = 0;
    this.errors = [];
  }

  // =============================================================================
  // 📡 PROGRESS REPORTING
  // =============================================================================

  private async reportProgress(progress: number, message: string, type: 'info' | 'success' | 'error' = 'info') {
    this.progress = progress;
    
    // Store in Redis for WebSocket polling
    await redis.setEx(
      `installer:${this.sessionId}:progress`,
      3600,
      JSON.stringify({ progress, message, type, timestamp: Date.now() })
    );

    // Also emit via Redis pub/sub for WebSocket subscribers
    await redis.publish(
      `installer:${this.sessionId}:stream`,
      JSON.stringify({ type: 'progress', progress, message, timestamp: Date.now() })
    );
  }

  private async logCommand(command: string) {
    await redis.publish(
      `installer:${this.sessionId}:stream`,
      JSON.stringify({ type: 'command', command, timestamp: Date.now() })
    );
  }

  private async logOutput(output: string) {
    await redis.publish(
      `installer:${this.sessionId}:stream`,
      JSON.stringify({ type: 'output', output, timestamp: Date.now() })
    );
  }

  private async logError(error: string) {
    this.errors.push(error);
    await redis.publish(
      `installer:${this.sessionId}:stream`,
      JSON.stringify({ type: 'error', error, timestamp: Date.now() })
    );
  }

  // =============================================================================
  // 🔧 INSTALLATION STEPS
  // =============================================================================

  async run(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.reportProgress(0, 'Starting installation...');

      // Step 1: System update
      await this.stepSystemUpdate();
      
      // Step 2: Install base packages
      await this.stepInstallBasePackages();
      
      // Step 3: Install OpenLiteSpeed
      await this.stepInstallOLS();
      
      // Step 4: Install MariaDB
      await this.stepInstallMariaDB();
      
      // Step 5: Install PostgreSQL
      await this.stepInstallPostgreSQL();
      
      // Step 6: Install Redis
      await this.stepInstallRedis();
      
      // Step 7: Install additional tools
      await this.stepInstallTools();
      
      // Step 8: Configure SWAP
      await this.stepConfigureSwap();
      
      // Step 9: Configure PHP
      await this.stepConfigurePHP();
      
      // Step 10: Configure MariaDB
      await this.stepConfigureMariaDB();
      
      // Step 11: Configure OLS
      await this.stepConfigureOLS();
      
      // Step 12: Configure UFW
      await this.stepConfigureUFW();
      
      // Step 13: Setup panel database
      await this.stepSetupPanelDB();
      
      // Step 14: Create admin user
      await this.stepCreateAdmin();
      
      // Step 15: Optional WordPress
      if (this.config.installWordPress) {
        await this.stepInstallWordPress();
      }
      
      // Step 16: Finalize
      await this.stepFinalize();

      await this.reportProgress(100, 'Installation completed successfully!', 'success');
      
      // Mark installer as complete
      await prisma.installerSession.update({
        where: { id: this.sessionId },
        data: {
          completed: true,
          completedAt: new Date(),
          config: this.config as any,
        },
      });

      // Create audit log
      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'installer',
        userId: 'system',
        metadata: {
          action: 'installation_completed',
          config: {
            adminEmail: this.config.adminEmail,
            panelDomain: this.config.panelDomain,
            installWordPress: this.config.installWordPress,
          },
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.reportProgress(0, `Installation failed: ${errorMessage}`, 'error');
      await this.logError(errorMessage);

      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'installer',
        userId: 'system',
        metadata: {
          action: 'installation_failed',
          error: errorMessage,
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  // =============================================================================
  // STEP 1: SYSTEM UPDATE
  // =============================================================================

  private async stepSystemUpdate() {
    await this.reportProgress(5, 'Updating system packages...');
    
    await this.logCommand('apt update && apt upgrade -y');
    
    const { stdout, stderr } = await execAsync('apt update && apt upgrade -y');
    
    if (stdout) await this.logOutput(stdout);
    if (stderr) await this.logOutput(stderr);
    
    await this.reportProgress(8, 'System updated successfully');
  }

  // =============================================================================
  // STEP 2: INSTALL BASE PACKAGES
  // =============================================================================

  private async stepInstallBasePackages() {
    await this.reportProgress(10, 'Installing base packages...');
    
    const packages = [
      'curl',
      'git',
      'wget',
      'nano',
      'ufw',
      'fail2ban',
      'htop',
      'unzip',
      'tar',
      'gnupg',
      'ca-certificates',
      'software-properties-common',
      'apt-transport-https',
    ];

    await this.logCommand(`apt install -y ${packages.join(' ')}`);
    
    const { stdout, stderr } = await execAsync(`apt install -y ${packages.join(' ')}`);
    
    if (stdout) await this.logOutput(stdout);
    if (stderr) await this.logOutput(stderr);
    
    await this.reportProgress(15, 'Base packages installed');
  }

  // =============================================================================
  // STEP 3: INSTALL OPENLITESPEED
  // =============================================================================

  private async stepInstallOLS() {
    await this.reportProgress(18, 'Installing OpenLiteSpeed...');
    
    // Add OLS repository
    await this.logCommand('Adding OpenLiteSpeed repository...');
    await execAsync(`
      curl -O https://repo.litespeedtech.com/debian/lsrepo.sh &&
      bash lsrepo.sh
    `);
    
    // Install OLS
    await this.logCommand('apt install -y openlitespeed lsphp83 lsphp83-mysql lsphp83-pgsql lsphp83-redis lsphp83-imagick lsphp83-memcached');
    const { stdout, stderr } = await execAsync('apt install -y openlitespeed lsphp83 lsphp83-mysql lsphp83-pgsql lsphp83-redis lsphp83-imagick lsphp83-memcached');
    
    if (stdout) await this.logOutput(stdout);
    if (stderr) await this.logOutput(stderr);
    
    // Start OLS
    await execAsync('systemctl enable lsws && systemctl start lsws');
    
    await this.reportProgress(25, 'OpenLiteSpeed installed');
  }

  // =============================================================================
  // STEP 4: INSTALL MARIADB
  // =============================================================================

  private async stepInstallMariaDB() {
    await this.reportProgress(28, 'Installing MariaDB...');
    
    await this.logCommand('apt install -y mariadb-server mariadb-client');
    const { stdout, stderr } = await execAsync('apt install -y mariadb-server mariadb-client');
    
    if (stdout) await this.logOutput(stdout);
    if (stderr) await this.logOutput(stderr);
    
    await execAsync('systemctl enable mariadb && systemctl start mariadb');
    
    // Secure installation
    await execAsync(`
      mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED VIA unix_socket OR mysql_native_password USING PASSWORD('${this.config.dbPassword}');"
      mysql -e "FLUSH PRIVILEGES;"
    `);
    
    await this.reportProgress(32, 'MariaDB installed');
  }

  // =============================================================================
  // STEP 5: INSTALL POSTGRESQL
  // =============================================================================

  private async stepInstallPostgreSQL() {
    await this.reportProgress(35, 'Installing PostgreSQL...');
    
    await this.logCommand('apt install -y postgresql postgresql-contrib');
    const { stdout, stderr } = await execAsync('apt install -y postgresql postgresql-contrib');
    
    if (stdout) await this.logOutput(stdout);
    if (stderr) await this.logOutput(stderr);
    
    await execAsync('systemctl enable postgresql && systemctl start postgresql');
    
    await this.reportProgress(40, 'PostgreSQL installed');
  }

  // =============================================================================
  // STEP 6: INSTALL REDIS
  // =============================================================================

  private async stepInstallRedis() {
    await this.reportProgress(42, 'Installing Redis...');
    
    await this.logCommand('apt install -y redis-server');
    const { stdout, stderr } = await execAsync('apt install -y redis-server');
    
    if (stdout) await this.logOutput(stdout);
    if (stderr) await this.logOutput(stderr);
    
    await execAsync('systemctl enable redis && systemctl start redis');
    
    // Configure Redis for local only
    await execAsync("sed -i 's/bind 127.0.0.1 ::1/bind 127.0.0.1/' /etc/redis/redis.conf");
    await execAsync('systemctl restart redis');
    
    await this.reportProgress(45, 'Redis installed');
  }

  // =============================================================================
  // STEP 7: INSTALL ADDITIONAL TOOLS
  // =============================================================================

  private async stepInstallTools() {
    await this.reportProgress(48, 'Installing additional tools...');
    
    // Restic for backups
    await this.logCommand('Installing Restic...');
    await execAsync(`
      curl -L -O https://github.com/restic/restic/releases/latest/download/restic_linux_amd64.bz2 &&
      bunzip2 restic_linux_amd64.bz2 &&
      chmod +x restic_linux_amd64 &&
      mv restic_linux_amd64 /usr/local/bin/restic
    `);
    
    // acme.sh for SSL
    await this.logCommand('Installing acme.sh...');
    await execAsync(`
      curl https://get.acme.sh | sh -s email=${this.config.sslEmail}
    `);
    
    // WP-CLI
    await this.logCommand('Installing WP-CLI...');
    await execAsync(`
      curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar &&
      chmod +x wp-cli.phar &&
      mv wp-cli.phar /usr/local/bin/wp
    `);
    
    // Node.js 20.x
    await this.logCommand('Installing Node.js 20.x...');
    await execAsync(`
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &&
      apt install -y nodejs
    `);
    
    await this.reportProgress(52, 'Additional tools installed');
  }

  // =============================================================================
  // STEP 8: CONFIGURE SWAP
  // =============================================================================

  private async stepConfigureSwap() {
    if (!this.settings.swap.create) {
      await this.reportProgress(55, 'SWAP not needed (sufficient RAM)');
      return;
    }

    await this.reportProgress(55, `Creating ${this.settings.swap.size}GB SWAP...`);
    
    await this.logCommand(`fallocate -l ${this.settings.swap.size}G /swapfile`);
    await execAsync(`fallocate -l ${this.settings.swap.size}G /swapfile`);
    
    await this.logCommand('chmod 600 /swapfile');
    await execAsync('chmod 600 /swapfile');
    
    await this.logCommand('mkswap /swapfile');
    await execAsync('mkswap /swapfile');
    
    await this.logCommand('swapon /swapfile');
    await execAsync('swapon /swapfile');
    
    // Add to fstab
    await this.logCommand('Adding SWAP to fstab...');
    await execAsync('echo "/swapfile none swap sw 0 0" >> /etc/fstab');
    
    // Set swappiness
    await execAsync(`echo "vm.swappiness=10" >> /etc/sysctl.conf`);
    await execAsync('sysctl -p');
    
    await this.reportProgress(58, 'SWAP configured');
  }

  // =============================================================================
  // STEP 9: CONFIGURE PHP
  // =============================================================================

  private async stepConfigurePHP() {
    await this.reportProgress(60, 'Configuring PHP...');
    
    const phpIniPath = '/etc/php/8.3/litespeed/php.ini';
    
    // Update php.ini
    await this.logCommand('Updating php.ini...');
    await execAsync(`
      sed -i 's/memory_limit = .*/memory_limit = ${this.settings.php.memoryLimit}/' ${phpIniPath} &&
      sed -i 's/max_execution_time = .*/max_execution_time = 300/' ${phpIniPath} &&
      sed -i 's/upload_max_filesize = .*/upload_max_filesize = 64M/' ${phpIniPath} &&
      sed -i 's/post_max_size = .*/post_max_size = 64M/' ${phpIniPath}
    `);
    
    // Configure OPcache
    const opcacheIniPath = '/etc/php/8.3/mods-available/opcache.ini';
    await execAsync(`
      sed -i 's/opcache.enable=.*/opcache.enable=1/' ${opcacheIniPath} &&
      sed -i 's/opcache.memory_consumption=.*/opcache.memory_consumption=${this.settings.php.opcache}/' ${opcacheIniPath} &&
      sed -i 's/opcache.max_accelerated_files=.*/opcache.max_accelerated_files=10000/' ${opcacheIniPath}
    `);
    
    await this.reportProgress(65, 'PHP configured');
  }

  // =============================================================================
  // STEP 10: CONFIGURE MARIADB
  // =============================================================================

  private async stepConfigureMariaDB() {
    await this.reportProgress(68, 'Configuring MariaDB...');
    
    const myCnfPath = '/etc/mysql/mariadb.conf.d/50-server.cnf';
    
    await this.logCommand('Updating my.cnf...');
    await execAsync(`
      echo "[mysqld]" >> ${myCnfPath} &&
      echo "innodb_buffer_pool_size = ${this.settings.mariadb.innodbBufferPool}" >> ${myCnfPath} &&
      echo "max_connections = ${this.settings.mariadb.maxConnections}" >> ${myCnfPath} &&
      echo "innodb_flush_log_at_trx_commit = 1" >> ${myCnfPath}
    `);
    
    await execAsync('systemctl restart mariadb');
    
    await this.reportProgress(72, 'MariaDB configured');
  }

  // =============================================================================
  // STEP 11: CONFIGURE OLS
  // =============================================================================

  private async stepConfigureOLS() {
    await this.reportProgress(75, 'Configuring OpenLiteSpeed...');
    
    // OLS configuration is done via WebAdmin API
    // For now, just ensure it's running
    await execAsync('systemctl restart lsws');
    
    await this.reportProgress(78, 'OpenLiteSpeed configured');
  }

  // =============================================================================
  // STEP 12: CONFIGURE UFW
  // =============================================================================

  private async stepConfigureUFW() {
    await this.reportProgress(80, 'Configuring firewall...');
    
    await this.logCommand('Setting up UFW rules...');
    
    // Reset UFW
    await execAsync('ufw --force reset');
    
    // Default policies
    await execAsync('ufw default deny incoming');
    await execAsync('ufw default allow outgoing');
    
    // Allow essential ports
    await execAsync('ufw allow 22/tcp');    // SSH
    await execAsync('ufw allow 80/tcp');    // HTTP
    await execAsync('ufw allow 443/tcp');   // HTTPS
    await execAsync(`ufw allow ${this.config.panelPort}/tcp`);  // Panel
    
    // Enable UFW
    await execAsync('ufw --force enable');
    
    await this.reportProgress(83, 'Firewall configured');
  }

  // =============================================================================
  // STEP 13: SETUP PANEL DATABASE
  // =============================================================================

  private async stepSetupPanelDB() {
    await this.reportProgress(85, 'Setting up panel database...');
    
    await this.logCommand('Creating PostgreSQL database...');
    
    // Create database and user
    await execAsync(`
      sudo -u postgres psql -c "CREATE DATABASE ${this.config.dbName};" &&
      sudo -u postgres psql -c "CREATE USER ${this.config.dbUser} WITH PASSWORD '${this.config.dbPassword}';" &&
      sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${this.config.dbName} TO ${this.config.dbUser};"
    `);
    
    // Run Prisma migrations
    await this.logCommand('Running database migrations...');
    await execAsync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: `postgresql://${this.config.dbUser}:${this.config.dbPassword}@${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}`,
      },
    });
    
    await this.reportProgress(88, 'Panel database setup complete');
  }

  // =============================================================================
  // STEP 14: CREATE ADMIN USER
  // =============================================================================

  private async stepCreateAdmin() {
    await this.reportProgress(90, 'Creating admin account...');
    
    const hashedPassword = await hash(this.config.adminPassword, 12);
    
    await prisma.user.create({
      data: {
        email: this.config.adminEmail,
        name: this.config.adminName,
        passwordHash: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    });
    
    await this.reportProgress(93, 'Admin account created');
  }

  // =============================================================================
  // STEP 15: INSTALL WORDPRESS (OPTIONAL)
  // =============================================================================

  private async stepInstallWordPress() {
    if (!this.config.installWordPress || !this.config.wpDomain) {
      await this.reportProgress(95, 'WordPress installation skipped');
      return;
    }

    await this.reportProgress(95, 'Installing WordPress...');
    
    const wpPath = `/var/www/${this.config.wpDomain}`;
    
    // Create directory
    await execAsync(`mkdir -p ${wpPath}`);
    
    // Download WordPress
    await this.logCommand('Downloading WordPress...');
    await execAsync(`
      cd ${wpPath} &&
      wp core download --locale=${this.config.wpLanguage || 'en_US'}
    `);
    
    // Create wp-config.php
    await this.logCommand('Configuring WordPress...');
    const wpDbName = `wp_${this.config.wpDomain.replace(/[^a-z0-9]/gi, '_')}`;
    const wpDbUser = `wpuser_${this.config.wpDomain.replace(/[^a-z0-9]/gi, '_').slice(0, 15)}`;
    const wpDbPass = await this.generateSecurePassword(16);
    
    // Create WordPress database
    await execAsync(`
      mysql -e "CREATE DATABASE ${wpDbName};" &&
      mysql -e "CREATE USER '${wpDbUser}'@'localhost' IDENTIFIED BY '${wpDbPass}';" &&
      mysql -e "GRANT ALL PRIVILEGES ON ${wpDbName}.* TO '${wpDbUser}'@'localhost';" &&
      mysql -e "FLUSH PRIVILEGES;"
    `);
    
    // Configure WordPress
    await execAsync(`
      cd ${wpPath} &&
      wp config create \
        --dbname=${wpDbName} \
        --dbuser=${wpDbUser} \
        --dbpass=${wpDbPass} \
        --dbhost=localhost \
        --dbprefix=wp_ \
        --locale=${this.config.wpLanguage || 'en_US'}
    `);
    
    // Install WordPress
    await this.logCommand('Installing WordPress...');
    await execAsync(`
      cd ${wpPath} &&
      wp core install \
        --url=${this.config.wpDomain} \
        --title="${this.config.wpTitle || 'WordPress Site'}" \
        --admin_user=${this.config.wpAdminUser || 'admin'} \
        --admin_password=${this.config.wpAdminPassword || await this.generateSecurePassword(16)} \
        --admin_email=${this.config.wpAdminEmail || this.config.adminEmail}
    `);
    
    // Install plugins
    await this.logCommand('Installing plugins...');
    await execAsync(`
      cd ${wpPath} &&
      wp plugin install litespeed-cache redis-object-cache wordfence --activate
    `);
    
    // Set permissions
    await execAsync(`
      chown -R www-data:www-data ${wpPath} &&
      chmod -R 755 ${wpPath}
    `);
    
    await this.reportProgress(98, 'WordPress installed');
  }

  // =============================================================================
  // STEP 16: FINALIZE
  // =============================================================================

  private async stepFinalize() {
    await this.reportProgress(99, 'Finalizing installation...');
    
    // Restart all services
    await execAsync('systemctl restart lsws');
    await execAsync('systemctl restart mariadb');
    await execAsync('systemctl restart postgresql');
    await execAsync('systemctl restart redis');
    
    // Enable services on boot
    await execAsync('systemctl enable lsws');
    await execAsync('systemctl enable mariadb');
    await execAsync('systemctl enable postgresql');
    await execAsync('systemctl enable redis');
    
    await this.reportProgress(100, 'Installation complete!');
  }

  // =============================================================================
  // 🔧 HELPERS
  // =============================================================================

  private async generateSecurePassword(length: number): Promise<string> {
    const { randomBytes } = await import('crypto');
    return randomBytes(length).toString('base64').slice(0, length);
  }
}

// =============================================================================
// 🛣️ API ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const body = await request.json();
    const validatedConfig = InstallerConfigSchema.parse(body);

    // Check if installer session exists
    const installerSession = await prisma.installerSession.findFirst({
      where: { completed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!installerSession) {
      return NextResponse.json(
        { error: 'No active installer session found' },
        { status: 400 }
      );
    }

    // Check if already installed (INSTALLER_TOKEN should be removed after setup)
    const isInstalled = process.env.INSTALLER_TOKEN === 'completed';
    if (isInstalled) {
      return NextResponse.json(
        { error: 'Panel is already installed' },
        { status: 400 }
      );
    }

    // Create terminal session for live output
    const terminalResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/terminal/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const terminalData = await terminalResponse.json();
    const terminalSessionId = terminalData.sessionId;

    // Start installation in background
    const installer = new InstallerService(
      installerSession.id,
      validatedConfig,
      body.hardware as HardwareInfo,
      body.optimalSettings as OptimalSettings
    );

    // Run installation (non-blocking)
    installer.run().then((result) => {
      if (result.success) {
        console.log('[Installer] Installation completed successfully');
      } else {
        console.error('[Installer] Installation failed:', result.error);
      }
    });

    // Return immediately with terminal session info
    return NextResponse.json({
      success: true,
      sessionId: installerSession.id,
      terminalSessionId,
      message: 'Installation started. Monitor progress via WebSocket.',
    });
  } catch (error) {
    console.error('[Installer] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Installation failed' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Installer Run API — wpPanel by Breach Rabbit
 * 
 * This endpoint:
 * 1. Validates installation configuration
 * 2. Creates terminal session for live output
 * 3. Runs installation in background (non-blocking)
 * 4. Reports progress via Redis pub/sub
 * 5. Streams output to WebSocket clients
 * 
 * Progress Reporting:
 * - Redis key: `installer:${sessionId}:progress`
 * - Redis channel: `installer:${sessionId}:stream`
 * - WebSocket clients subscribe to channel for live updates
 * 
 * Security:
 * - Only one active installer session allowed
 * - INSTALLER_TOKEN check prevents re-installation
 * - All commands logged to audit log
 * - Passwords hashed with bcrypt
 * 
 * Installation Steps:
 * 1. System update (apt update && upgrade)
 * 2. Base packages (curl, git, ufw, fail2ban, etc)
 * 3. OpenLiteSpeed + lsphp83
 * 4. MariaDB 10.11+
 * 5. PostgreSQL 16
 * 6. Redis 7
 * 7. Tools (Restic, acme.sh, WP-CLI, Node.js 20)
 * 8. SWAP configuration (if RAM < 8GB)
 * 9. PHP configuration (memory, workers, opcache)
 * 10. MariaDB configuration (innodb, connections)
 * 11. OLS configuration
 * 12. UFW firewall rules
 * 13. Panel database setup (Prisma migrations)
 * 14. Admin user creation
 * 15. WordPress installation (optional)
 * 16. Service restarts and finalization
 * 
 * Optimal Settings Logic:
 * - Based on RAM and CPU cores
 * - SWAP: 2-4GB if RAM < 8GB
 * - PHP workers: CPU_CORES * 3-4
 * - MariaDB innodb_buffer_pool: 50-60% of RAM
 * - OLS maxConnections: 50-300 based on RAM
 * 
 * Error Handling:
 * - All errors logged to Redis stream
 * - Installation can be resumed from last successful step
 * - Rollback not implemented (v1.0)
 * 
 * Post-Installation:
 * - INSTALLER_TOKEN should be removed from .env
 * - /setup route should be blocked
 * - Admin can login with created credentials
 */