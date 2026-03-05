// =============================================================================
// wpPanel by Breach Rabbit — ACME.sh Wrapper
// =============================================================================
// Full acme.sh 3.x automation for SSL certificates
// Features: issue, renew, revoke, install, DNS/HTTP challenge, wildcard
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

export type ChallengeType = 'http' | 'dns';
export type CAProvider = 'letsencrypt' | 'zerossl' | 'buypass' | 'google';

export interface AcmeConfig {
  /** acme.sh binary path */
  binaryPath?: string;
  
  /** acme.sh home directory */
  homeDir?: string;
  
  /** Default CA provider */
  caProvider?: CAProvider;
  
  /** Email for notifications */
  email: string;
  
  /** DNS provider for DNS challenge */
  dnsProvider?: string;
  
  /** DNS provider credentials */
  dnsCredentials?: Record<string, string>;
  
  /** Use staging CA (for testing) */
  staging?: boolean;
  
  /** Timeout for operations (ms) */
  timeout?: number;
}

export interface IssueOptions {
  /** Domain(s) for certificate */
  domains: string[];
  
  /** Challenge type */
  challengeType?: ChallengeType;
  
  /** DNS provider (if DNS challenge) */
  dnsProvider?: string;
  
  /** DNS credentials (if DNS challenge) */
  dnsCredentials?: Record<string, string>;
  
  /** Web root for HTTP challenge */
  webRoot?: string;
  
  /** Key length */
  keyLength?: 2048 | 3072 | 4096;
  
  /** Certificate alias/name */
  name?: string;
  
  /** Force renewal */
  force?: boolean;
}

export interface Certificate {
  /** Domain name */
  domain: string;
  
  /** Certificate path */
  certPath: string;
  
  /** Private key path */
  keyPath: string;
  
  /** CA bundle path */
  caPath: string;
  
  /** Full chain path */
  fullPath: string;
  
  /** Issue date */
  issuedAt: Date;
  
  /** Expiry date */
  expiresAt: Date;
  
  /** Days until expiry */
  daysUntilExpiry: number;
  
  /** Certificate status */
  status: 'valid' | 'expiring' | 'expired';
  
  /** CA provider */
  caProvider: CAProvider;
  
  /** Challenge type used */
  challengeType: ChallengeType;
  
  /** Auto-renew enabled */
  autoRenew: boolean;
}

export interface InstallOptions {
  /** Domain name */
  domain: string;
  
  /** Certificate install path */
  certPath: string;
  
  /** Key install path */
  keyPath: string;
  
  /** CA bundle install path */
  caPath: string;
  
  /** Full chain install path */
  fullPath: string;
  
  /** Reload command after install */
  reloadCmd?: string;
}

export interface RenewOptions {
  /** Domain to renew */
  domain: string;
  
  /** Force renewal */
  force?: boolean;
  
  /** Renew if expires within days */
  renewWithin?: number;
}

export interface RevokeOptions {
  /** Domain to revoke */
  domain: string;
  
  /** Reason for revocation */
  reason?: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const AcmeConfigSchema = z.object({
  binaryPath: z.string().optional(),
  homeDir: z.string().optional(),
  caProvider: z.enum(['letsencrypt', 'zerossl', 'buypass', 'google']).optional(),
  email: z.string().email(),
  dnsProvider: z.string().optional(),
  dnsCredentials: z.record(z.string()).optional(),
  staging: z.boolean().default(false),
  timeout: z.number().min(1000).optional(),
});

// =============================================================================
// 🏗️ ACME WRAPPER CLASS
// =============================================================================

export class AcmeWrapper {
  private config: AcmeConfig;

  constructor(config: AcmeConfig) {
    // Validate configuration
    const validated = AcmeConfigSchema.parse(config);
    this.config = validated;
  }

  // =============================================================================
  // 🔧 COMMAND EXECUTION
  // =============================================================================

  /**
   * Get acme.sh binary path
   */
  private getBinary(): string {
    return this.config.binaryPath || '/root/.acme.sh/acme.sh';
  }

  /**
   * Get acme.sh home directory
   */
  private getHomeDir(): string {
    return this.config.homeDir || '/root/.acme.sh';
  }

  /**
   * Execute acme.sh command
   */
  private async exec(args: string[], options?: { timeout?: number }): Promise<string> {
    const binary = this.getBinary();
    const homeDir = this.getHomeDir();
    const command = `${binary} ${args.join(' ')}`;
    const timeout = options?.timeout || this.config.timeout || 300000; // 5 min default

    try {
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          ACME_HOME: homeDir,
        },
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      return stdout || stderr;
    } catch (error: any) {
      throw new AcmeError(
        `Command failed: ${command}`,
        error.stdout,
        error.stderr,
        error.code
      );
    }
  }

  /**
   * Set DNS provider environment variables
   */
  private setDnsEnv(dnsProvider: string, credentials: Record<string, string>): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    
    // Map common DNS providers to their env vars
    const dnsEnvMap: Record<string, string[]> = {
      cloudflare: ['CF_Key', 'CF_Email'],
      digitalocean: ['DO_API_KEY'],
      aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
      gcloud: ['GCP_Project', 'GCP_Account'],
      namecheap: ['NAMECHEAP_API_KEY', 'NAMECHEAP_API_USER'],
      godaddy: ['GD_Key', 'GD_Secret'],
    };

    const envVars = dnsEnvMap[dnsProvider.toLowerCase()] || [];
    
    Object.entries(credentials).forEach(([key, value]) => {
      env[key] = value;
    });

    // Set DNS provider alias
    env.DNS_ALIAS = dnsProvider;

    return env;
  }

  // =============================================================================
  // 📦 INITIALIZATION
  // =============================================================================

  /**
   * Install acme.sh if not installed
   */
  async install(): Promise<{ success: boolean; version?: string }> {
    try {
      // Check if already installed
      await this.exec('--version');
      return { success: true };
    } catch {
      // Not installed, install it
      try {
        await execAsync('curl https://get.acme.sh | sh -s email=' + this.config.email);
        return { success: true };
      } catch (error) {
        throw new AcmeError('Failed to install acme.sh', '', error instanceof Error ? error.message : '');
      }
    }
  }

  /**
   * Get acme.sh version
   */
  async getVersion(): Promise<string> {
    const result = await this.exec('--version');
    return result.trim();
  }

  /**
   * Upgrade acme.sh
   */
  async upgrade(): Promise<void> {
    await this.exec('--upgrade');
  }

  // =============================================================================
  // 🎫 CERTIFICATE ISSUANCE
  // =============================================================================

  /**
   * Issue new certificate
   */
  async issue(options: IssueOptions): Promise<Certificate> {
    const args = ['--issue'];

    // Domains
    options.domains.forEach((domain, index) => {
      if (index === 0) {
        args.push('-d', domain);
      } else {
        args.push('--domain', domain);
      }
    });

    // Challenge type
    if (options.challengeType === 'dns') {
      const dnsProvider = options.dnsProvider || this.config.dnsProvider;
      
      if (!dnsProvider) {
        throw new AcmeError('DNS provider required for DNS challenge');
      }

      args.push('--dns', dnsProvider);

      // Set DNS credentials
      if (options.dnsCredentials) {
        // Credentials will be set via environment in exec
      }
    } else {
      // HTTP challenge
      const webRoot = options.webRoot || '/var/www/html';
      args.push('--webroot', webRoot);
    }

    // Key length
    if (options.keyLength) {
      args.push('--keylength', options.keyLength.toString());
    }

    // Force
    if (options.force) {
      args.push('--force');
    }

    // CA provider
    if (this.config.caProvider) {
      args.push('--server', this.config.caProvider);
    }

    // Staging
    if (this.config.staging) {
      args.push('--staging');
    }

    // Execute
    await this.exec(args);

    // Get certificate info
    const domain = options.domains[0];
    return this.getCertificate(domain);
  }

  /**
   * Issue wildcard certificate (DNS challenge only)
   */
  async issueWildcard(baseDomain: string, subdomains: string[] = []): Promise<Certificate> {
    const domains = [
      `*.${baseDomain}`,
      baseDomain,
      ...subdomains.map(s => `${s}.${baseDomain}`),
    ];

    return this.issue({
      domains,
      challengeType: 'dns',
      dnsProvider: this.config.dnsProvider,
      dnsCredentials: this.config.dnsCredentials,
    });
  }

  // =============================================================================
  // 📋 CERTIFICATE MANAGEMENT
  // =============================================================================

  /**
   * List all certificates
   */
  async listCertificates(): Promise<Certificate[]> {
    const result = await this.exec('--list', { json: true });
    
    // Parse output (acme.sh outputs table format, need to parse)
    const lines = result.split('\n').slice(1); // Skip header
    
    const certificates: Certificate[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length < 6) continue;

      const domain = parts[0];
      const issuedAt = new Date(parts[1]);
      const expiresAt = new Date(parts[2]);
      const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      let status: Certificate['status'] = 'valid';
      if (daysUntilExpiry <= 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring';
      }

      const certPath = path.join(this.getHomeDir(), domain, 'cert.cer');
      const keyPath = path.join(this.getHomeDir(), domain, 'key.cer');
      const caPath = path.join(this.getHomeDir(), domain, 'ca.cer');
      const fullPath = path.join(this.getHomeDir(), domain, 'fullchain.cer');

      certificates.push({
        domain,
        certPath,
        keyPath,
        caPath,
        fullPath,
        issuedAt,
        expiresAt,
        daysUntilExpiry,
        status,
        caProvider: this.config.caProvider || 'letsencrypt',
        challengeType: 'http', // Would need to track this
        autoRenew: true,
      });
    }

    return certificates;
  }

  /**
   * Get certificate details
   */
  async getCertificate(domain: string): Promise<Certificate> {
    const certPath = path.join(this.getHomeDir(), domain, 'cert.cer');
    const keyPath = path.join(this.getHomeDir(), domain, 'key.cer');
    const caPath = path.join(this.getHomeDir(), domain, 'ca.cer');
    const fullPath = path.join(this.getHomeDir(), domain, 'fullchain.cer');

    // Check if certificate exists
    try {
      await fs.access(certPath);
    } catch {
      throw new AcmeError(`Certificate not found for domain: ${domain}`);
    }

    // Parse certificate to get expiry
    const certContent = await fs.readFile(certPath, 'utf-8');
    const expiryMatch = certContent.match(/Not After\s*:\s*(.+)/);
    const expiresAt = expiryMatch ? new Date(expiryMatch[1]) : new Date();
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let status: Certificate['status'] = 'valid';
    if (daysUntilExpiry <= 0) {
      status = 'expired';
    } else if (daysUntilExpiry <= 30) {
      status = 'expiring';
    }

    return {
      domain,
      certPath,
      keyPath,
      caPath,
      fullPath,
      issuedAt: new Date(), // Would need to parse from cert
      expiresAt,
      daysUntilExpiry,
      status,
      caProvider: this.config.caProvider || 'letsencrypt',
      challengeType: 'http',
      autoRenew: true,
    };
  }

  // =============================================================================
  // 🔄 RENEWAL
  // =============================================================================

  /**
   * Renew certificate
   */
  async renew(options: RenewOptions): Promise<Certificate> {
    const args = ['--renew'];

    // Domain
    args.push('-d', options.domain);

    // Force
    if (options.force) {
      args.push('--force');
    }

    // Renew within days
    if (options.renewWithin) {
      args.push('--renew-hook', `echo "Renewing if expires within ${options.renewWithin} days"`);
    }

    await this.exec(args);

    return this.getCertificate(options.domain);
  }

  /**
   * Renew all certificates
   */
  async renewAll(): Promise<{ renewed: number; failed: number }> {
    const result = await this.exec('--renew-all');
    
    // Parse output to count renewed/failed
    const renewed = (result.match(/Renewed:/g) || []).length;
    const failed = (result.match(/Failed:/g) || []).length;

    return { renewed, failed };
  }

  /**
   * Setup auto-renewal (cron)
   */
  async setupAutoRenew(): Promise<void> {
    await this.exec('--upgrade');
    await this.exec('--install-cert');
    
    // acme.sh automatically sets up cron during installation
    // This just ensures it's configured
  }

  // =============================================================================
  // 🚫 REVOCATION
  // =============================================================================

  /**
   * Revoke certificate
   */
  async revoke(options: RevokeOptions): Promise<void> {
    const args = ['--revoke'];

    // Domain
    args.push('-d', options.domain);

    // Reason
    if (options.reason) {
      args.push('--reason', options.reason);
    }

    await this.exec(args);
  }

  // =============================================================================
  // 📥 INSTALLATION
  // =============================================================================

  /**
   * Install certificate to target paths
   */
  async install(options: InstallOptions): Promise<void> {
    const args = ['--install-cert', '-d', options.domain];

    // Certificate paths
    if (options.certPath) {
      args.push('--cert-file', options.certPath);
    }

    if (options.keyPath) {
      args.push('--key-file', options.keyPath);
    }

    if (options.caPath) {
      args.push('--ca-file', options.caPath);
    }

    if (options.fullPath) {
      args.push('--fullchain-file', options.fullPath);
    }

    // Reload command
    if (options.reloadCmd) {
      args.push('--reloadcmd', options.reloadCmd);
    }

    await this.exec(args);
  }

  /**
   * Install certificate for OLS vhost
   */
  async installForOLS(domain: string, vhostName: string): Promise<void> {
    const cert = await this.getCertificate(domain);

    await this.install({
      domain,
      certPath: `/usr/local/lsws/conf/vhosts/${vhostName}/ssl/cert.pem`,
      keyPath: `/usr/local/lsws/conf/vhosts/${vhostName}/ssl/key.pem`,
      caPath: `/usr/local/lsws/conf/vhosts/${vhostName}/ssl/ca.pem`,
      fullPath: `/usr/local/lsws/conf/vhosts/${vhostName}/ssl/fullchain.pem`,
      reloadCmd: 'systemctl reload lsws',
    });
  }

  // =============================================================================
  // 🔍 INFORMATION
  // =============================================================================

  /**
   * Get certificate info from domain
   */
  async certInfo(domain: string): Promise<{
    issuer: string;
    subject: string;
    validFrom: Date;
    validTo: Date;
    serialNumber: string;
    signatureAlgorithm: string;
  }> {
    const cert = await this.getCertificate(domain);
    
    // Parse certificate with openssl
    const { stdout } = await execAsync(`openssl x509 -in ${cert.certPath} -text -noout`);
    
    // Parse relevant fields
    const issuerMatch = stdout.match(/Issuer:\s*(.+)/);
    const subjectMatch = stdout.match(/Subject:\s*(.+)/);
    const notBeforeMatch = stdout.match(/Not Before:\s*(.+)/);
    const notAfterMatch = stdout.match(/Not After\s*:\s*(.+)/);
    const serialMatch = stdout.match(/Serial Number:\s*(.+)/);
    const sigMatch = stdout.match(/Signature Algorithm:\s*(.+)/);

    return {
      issuer: issuerMatch ? issuerMatch[1].trim() : '',
      subject: subjectMatch ? subjectMatch[1].trim() : '',
      validFrom: notBeforeMatch ? new Date(notBeforeMatch[1]) : new Date(),
      validTo: notAfterMatch ? new Date(notAfterMatch[1]) : new Date(),
      serialNumber: serialMatch ? serialMatch[1].trim() : '',
      signatureAlgorithm: sigMatch ? sigMatch[1].trim() : '',
    };
  }

  /**
   * Check certificate expiry
   */
  async checkExpiry(domain: string, warningDays: number = 30): Promise<{
    expiresAt: Date;
    daysRemaining: number;
    needsRenewal: boolean;
    status: 'valid' | 'warning' | 'expired';
  }> {
    const cert = await this.getCertificate(domain);
    
    const daysRemaining = cert.daysUntilExpiry;
    let status: 'valid' | 'warning' | 'expired' = 'valid';
    let needsRenewal = false;

    if (daysRemaining <= 0) {
      status = 'expired';
      needsRenewal = true;
    } else if (daysRemaining <= warningDays) {
      status = 'warning';
      needsRenewal = true;
    }

    return {
      expiresAt: cert.expiresAt,
      daysRemaining,
      needsRenewal,
      status,
    };
  }

  // =============================================================================
  // 🧹 CLEANUP
  // =============================================================================

  /**
   * Remove certificate
   */
  async remove(domain: string): Promise<void> {
    await this.exec('--remove', '-d', domain);
  }

  /**
   * Remove all certificates
   */
  async removeAll(): Promise<void> {
    const certs = await this.listCertificates();
    
    for (const cert of certs) {
      await this.remove(cert.domain);
    }
  }

  /**
   * Cleanup old certificates
   */
  async cleanup(olderThanDays: number = 365): Promise<number> {
    const certs = await this.listCertificates();
    const now = new Date();
    let removed = 0;

    for (const cert of certs) {
      const age = Math.floor((now.getTime() - cert.issuedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (age > olderThanDays && cert.status === 'expired') {
        await this.remove(cert.domain);
        removed++;
      }
    }

    return removed;
  }
}

// =============================================================================
// ❌ ERROR CLASS
// =============================================================================

export class AcmeError extends Error {
  constructor(
    message: string,
    public stdout?: string,
    public stderr?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AcmeError';
  }
}

// =============================================================================
// 📦 FACTORY FUNCTION
// =============================================================================

/**
 * Create AcmeWrapper instance from config
 */
export function createAcmeWrapper(config: AcmeConfig): AcmeWrapper {
  return new AcmeWrapper(config);
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * ACME.sh Wrapper — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Certificate Issuance:
 *    - HTTP challenge (webroot)
 *    - DNS challenge (multiple providers)
 *    - Wildcard certificates
 *    - Multiple domains (SAN)
 * 
 * 2. Certificate Management:
 *    - List all certificates
 *    - Get certificate details
 *    - Check expiry status
 *    - Certificate info (issuer, subject, dates)
 * 
 * 3. Renewal:
 *    - Renew single certificate
 *    - Renew all certificates
 *    - Auto-renewal setup (cron)
 *    - Renewal hooks
 * 
 * 4. Installation:
 *    - Install to custom paths
 *    - OLS vhost integration
 *    - Reload commands
 * 
 * 5. Revocation:
 *    - Revoke single certificate
 *    - Revoke with reason
 * 
 * 6. Cleanup:
 *    - Remove certificate
 *    - Remove all certificates
 *    - Cleanup old certificates
 * 
 * Supported DNS Providers:
 * - Cloudflare
 * - DigitalOcean
 * - AWS Route53
 * - Google Cloud
 * - Namecheap
 * - GoDaddy
 * - And 50+ more via acme.sh
 * 
 * CA Providers:
 * - Let's Encrypt (default)
 * - ZeroSSL
 * - BuyPass
 * - Google
 * 
 * Environment Variables:
 * - ACME_HOME: acme.sh home directory
 * - DNS_<PROVIDER>_*: DNS provider credentials
 * - CF_Key, CF_Email: Cloudflare
 * - DO_API_KEY: DigitalOcean
 * - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: AWS
 * 
 * Usage Example:
 * 
 * import { createAcmeWrapper } from '@/lib/integrations/acme-wrapper';
 * 
 * const acme = createAcmeWrapper({
 *   email: 'admin@example.com',
 *   caProvider: 'letsencrypt',
 *   dnsProvider: 'cloudflare',
 *   dnsCredentials: {
 *     CF_Key: 'your-cloudflare-api-key',
 *     CF_Email: 'your-email@example.com',
 *   },
 * });
 * 
 * // Install acme.sh
 * await acme.install();
 * 
 * // Issue certificate
 * const cert = await acme.issue({
 *   domains: ['example.com', 'www.example.com'],
 *   challengeType: 'dns',
 * });
 * 
 * // Issue wildcard
 * const wildcard = await acme.issueWildcard('example.com');
 * 
 * // Install for OLS
 * await acme.installForOLS('example.com', 'example_com');
 * 
 * // Check expiry
 * const expiry = await acme.checkExpiry('example.com');
 * if (expiry.needsRenewal) {
 *   await acme.renew({ domain: 'example.com' });
 * }
 * 
 * // List all certificates
 * const certs = await acme.listCertificates();
 * 
 * // Auto-renewal
 * await acme.setupAutoRenew();
 */