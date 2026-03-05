// =============================================================================
// wpPanel by Breach Rabbit — SSL Manager Service
// =============================================================================
// Service layer for SSL certificate management (auto + custom)
// Features: acme.sh integration, custom cert upload, renewal, expiry monitoring
// =============================================================================

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { createAcmeWrapper, AcmeWrapper, Certificate as AcmeCertificate } from '@/lib/integrations/acme-wrapper';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type CertType = 'auto' | 'custom';
export type CertStatus = 'active' | 'expiring' | 'expired' | 'pending' | 'failed';
export type CAProvider = 'letsencrypt' | 'zerossl' | 'buypass' | 'google';

export interface SSLCertificate {
  id: string;
  domain: string;
  type: CertType;
  status: CertStatus;
  caProvider?: CAProvider;
  issuer?: string;
  subject?: string;
  validFrom: Date;
  validTo: Date;
  daysUntilExpiry: number;
  autoRenew: boolean;
  certPath: string;
  keyPath: string;
  caPath: string;
  fullPath: string;
  siteId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IssueCertInput {
  domain: string;
  type: CertType;
  caProvider?: CAProvider;
  wildcard?: boolean;
  subdomains?: string[];
  challengeType?: 'http' | 'dns';
  dnsProvider?: string;
  dnsCredentials?: Record<string, string>;
  autoRenew?: boolean;
  siteId?: string;
}

export interface UploadCertInput {
  domain: string;
  certificate: string; // PEM format
  privateKey: string; // PEM format
  caBundle?: string; // PEM format
  autoRenew?: boolean;
  siteId?: string;
}

export interface RenewCertInput {
  certificateId: string;
  force?: boolean;
}

export interface CertValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    issuer?: string;
    subject?: string;
    validFrom?: Date;
    validTo?: Date;
    domains?: string[];
    keyMatch?: boolean;
  };
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const IssueCertSchema = z.object({
  domain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/),
  type: z.enum(['auto', 'custom']),
  caProvider: z.enum(['letsencrypt', 'zerossl', 'buypass', 'google']).optional(),
  wildcard: z.boolean().default(false),
  subdomains: z.array(z.string()).optional(),
  challengeType: z.enum(['http', 'dns']).optional(),
  dnsProvider: z.string().optional(),
  dnsCredentials: z.record(z.string()).optional(),
  autoRenew: z.boolean().default(true),
  siteId: z.string().optional(),
});

const UploadCertSchema = z.object({
  domain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/),
  certificate: z.string().min(100),
  privateKey: z.string().min(100),
  caBundle: z.string().optional(),
  autoRenew: z.boolean().default(false),
  siteId: z.string().optional(),
});

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const SSL_ROOT = process.env.SSL_ROOT || '/etc/ssl/wppanel';
const CERTS_DIR = path.join(SSL_ROOT, 'certs');
const KEYS_DIR = path.join(SSL_ROOT, 'keys');
const CHAIN_DIR = path.join(SSL_ROOT, 'chain');

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate secure random string
 */
function generateSecureString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sanitize domain for filesystem use
 */
function sanitizeDomain(domain: string): string {
  return domain.replace(/[^a-zA-Z0-9]/g, '_');
}

/**
 * Get certificate paths for domain
 */
function getCertPaths(domain: string): {
  certPath: string;
  keyPath: string;
  caPath: string;
  fullPath: string;
} {
  const safeDomain = sanitizeDomain(domain);
  return {
    certPath: path.join(CERTS_DIR, `${safeDomain}.crt`),
    keyPath: path.join(KEYS_DIR, `${safeDomain}.key`),
    caPath: path.join(CHAIN_DIR, `${safeDomain}.ca`),
    fullPath: path.join(CERTS_DIR, `${safeDomain}.fullchain.crt`),
  };
}

/**
 * Validate PEM format
 */
function validatePEM(pem: string, type: 'cert' | 'key' | 'ca'): boolean {
  const beginMarker = `-----BEGIN ${type === 'key' ? 'PRIVATE' : 'CERTIFICATE'}-----`;
  const endMarker = `-----END ${type === 'key' ? 'PRIVATE' : 'CERTIFICATE'}-----`;
  
  return pem.includes(beginMarker) && pem.includes(endMarker);
}

/**
 * Verify certificate and key match
 */
async function verifyCertKeyMatch(certPEM: string, keyPEM: string): Promise<boolean> {
  try {
    // Extract modulus from certificate
    const { stdout: certModulus } = await execAsync(
      `echo "${certPEM}" | openssl x509 -noout -modulus | md5sum`
    );
    
    // Extract modulus from private key
    const { stdout: keyModulus } = await execAsync(
      `echo "${keyPEM}" | openssl rsa -noout -modulus | md5sum`
    );
    
    return certModulus.trim() === keyModulus.trim();
  } catch (error) {
    console.error('[SSL] Failed to verify cert/key match:', error);
    return false;
  }
}

/**
 * Get certificate info from PEM
 */
async function getCertInfo(certPEM: string): Promise<{
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  domains: string[];
  serialNumber: string;
}> {
  try {
    const { stdout } = await execAsync(
      `echo "${certPEM}" | openssl x509 -noout -text`
    );
    
    // Parse issuer
    const issuerMatch = stdout.match(/Issuer:\s*(.+)/);
    const subjectMatch = stdout.match(/Subject:\s*(.+)/);
    const notBeforeMatch = stdout.match(/Not Before:\s*(.+)/);
    const notAfterMatch = stdout.match(/Not After\s*:\s*(.+)/);
    const serialMatch = stdout.match(/Serial Number:\s*(.+)/);
    
    // Parse SANs (Subject Alternative Names)
    const sanMatch = stdout.match(/X509v3 Subject Alternative Name:.*?\n\s*(.+)/);
    const domains: string[] = [];
    
    if (sanMatch) {
      const sanLine = sanMatch[1];
      const dnsMatches = sanLine.match(/DNS:([^,\s]+)/g);
      if (dnsMatches) {
        domains.push(...dnsMatches.map(d => d.replace('DNS:', '')));
      }
    }
    
    return {
      issuer: issuerMatch ? issuerMatch[1].trim() : '',
      subject: subjectMatch ? subjectMatch[1].trim() : '',
      validFrom: notBeforeMatch ? new Date(notBeforeMatch[1]) : new Date(),
      validTo: notAfterMatch ? new Date(notAfterMatch[1]) : new Date(),
      domains,
      serialNumber: serialMatch ? serialMatch[1].trim() : '',
    };
  } catch (error) {
    throw new Error(`Failed to parse certificate: ${error}`);
  }
}

/**
 * Calculate days until expiry
 */
function calculateDaysUntilExpiry(validTo: Date): number {
  const now = new Date();
  const diff = validTo.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determine certificate status
 */
function determineStatus(daysUntilExpiry: number): CertStatus {
  if (daysUntilExpiry <= 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'active';
}

// =============================================================================
// 🏗️ SSL MANAGER SERVICE
// =============================================================================

export class SSLManager {
  private acme: AcmeWrapper;

  constructor() {
    this.acme = createAcmeWrapper({
      email: process.env.ACME_EMAIL || 'admin@localhost',
      caProvider: (process.env.ACME_CA_PROVIDER as CAProvider) || 'letsencrypt',
      dnsProvider: process.env.DNS_PROVIDER,
      dnsCredentials: process.env.DNS_CREDENTIALS ? JSON.parse(process.env.DNS_CREDENTIALS) : undefined,
      staging: process.env.NODE_ENV === 'development',
    });
  }

  // =============================================================================
  // 📦 CERTIFICATE CRUD
  // =============================================================================

  /**
   * Issue new auto certificate via acme.sh
   */
  async issueCertificate(input: IssueCertInput): Promise<SSLCertificate> {
    // Validate input
    const validatedInput = IssueCertSchema.parse(input);

    // Check if certificate already exists
    const existingCert = await prisma.sSLCertificate.findUnique({
      where: { domain: validatedInput.domain },
    });

    if (existingCert) {
      throw new Error(`Certificate for domain ${validatedInput.domain} already exists`);
    }

    // Ensure SSL directories exist
    await this.ensureDirectories();

    // Get certificate paths
    const paths = getCertPaths(validatedInput.domain);

    try {
      // Issue certificate via acme.sh
      let acmeCert: AcmeCertificate;

      if (validatedInput.wildcard) {
        acmeCert = await this.acme.issueWildcard(
          validatedInput.domain,
          validatedInput.subdomains
        );
      } else {
        const domains = [
          validatedInput.domain,
          ...(validatedInput.subdomains || []).map(s => `${s}.${validatedInput.domain}`),
        ];

        acmeCert = await this.acme.issue({
          domains,
          challengeType: validatedInput.challengeType || 'http',
          dnsProvider: validatedInput.dnsProvider,
          dnsCredentials: validatedInput.dnsCredentials,
        });
      }

      // Copy certificate files to our managed paths
      await fs.copyFile(acmeCert.certPath, paths.certPath);
      await fs.copyFile(acmeCert.keyPath, paths.keyPath);
      await fs.copyFile(acmeCert.caPath, paths.caPath);
      await fs.copyFile(acmeCert.fullPath, paths.fullPath);

      // Set secure permissions
      await fs.chmod(paths.keyPath, 0o600);
      await fs.chmod(paths.certPath, 0o644);
      await fs.chmod(paths.caPath, 0o644);
      await fs.chmod(paths.fullPath, 0o644);

      // Get certificate info
      const certContent = await fs.readFile(paths.certPath, 'utf-8');
      const certInfo = await getCertInfo(certContent);
      const daysUntilExpiry = calculateDaysUntilExpiry(certInfo.validTo);

      // Create database record
      const certificate = await prisma.sSLCertificate.create({
        data: {
          id: generateSecureString(16),
          domain: validatedInput.domain,
          type: 'auto',
          status: determineStatus(daysUntilExpiry),
          caProvider: validatedInput.caProvider || 'letsencrypt',
          issuer: certInfo.issuer,
          subject: certInfo.subject,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          daysUntilExpiry,
          autoRenew: validatedInput.autoRenew ?? true,
          certPath: paths.certPath,
          keyPath: paths.keyPath,
          caPath: paths.caPath,
          fullPath: paths.fullPath,
          siteId: validatedInput.siteId,
          metadata: {
            challengeType: validatedInput.challengeType,
            dnsProvider: validatedInput.dnsProvider,
            wildcard: validatedInput.wildcard,
            subdomains: validatedInput.subdomains,
          },
        },
      });

      // Install certificate for OLS vhost
      if (validatedInput.siteId) {
        await this.installForVhost(certificate);
      }

      // Create audit log
      await createAuditLog({
        action: 'CREATE',
        resource: 'ssl_certificate',
        userId: 'system',
        metadata: {
          certificateId: certificate.id,
          domain: certificate.domain,
          type: 'auto',
          caProvider: certificate.caProvider,
        },
      });

      // Cache certificate
      await this.cacheCertificate(certificate);

      return certificate;
    } catch (error) {
      // Cleanup on error
      await this.cleanupCertificatePaths(validatedInput.domain);
      throw error;
    }
  }

  /**
   * Upload custom certificate
   */
  async uploadCertificate(input: UploadCertInput): Promise<SSLCertificate> {
    // Validate input
    const validatedInput = UploadCertSchema.parse(input);

    // Check if certificate already exists
    const existingCert = await prisma.sSLCertificate.findUnique({
      where: { domain: validatedInput.domain },
    });

    if (existingCert) {
      throw new Error(`Certificate for domain ${validatedInput.domain} already exists`);
    }

    // Validate PEM format
    if (!validatePEM(validatedInput.certificate, 'cert')) {
      throw new Error('Invalid certificate format (must be PEM)');
    }

    if (!validatePEM(validatedInput.privateKey, 'key')) {
      throw new Error('Invalid private key format (must be PEM)');
    }

    if (validatedInput.caBundle && !validatePEM(validatedInput.caBundle, 'ca')) {
      throw new Error('Invalid CA bundle format (must be PEM)');
    }

    // Verify cert/key match
    const keyMatch = await verifyCertKeyMatch(
      validatedInput.certificate,
      validatedInput.privateKey
    );

    if (!keyMatch) {
      throw new Error('Certificate and private key do not match');
    }

    // Get certificate info and validate
    const certInfo = await getCertInfo(validatedInput.certificate);
    const daysUntilExpiry = calculateDaysUntilExpiry(certInfo.validTo);

    // Check if domain matches
    const domainMatches = 
      certInfo.domains.includes(validatedInput.domain) ||
      certInfo.domains.includes(`*.${validatedInput.domain.split('.').slice(-2).join('.')}`);

    if (!domainMatches) {
      throw new Error(`Certificate does not cover domain ${validatedInput.domain}`);
    }

    // Ensure SSL directories exist
    await this.ensureDirectories();

    // Get certificate paths
    const paths = getCertPaths(validatedInput.domain);

    try {
      // Write certificate files
      await fs.writeFile(paths.certPath, validatedInput.certificate, { mode: 0o644 });
      await fs.writeFile(paths.keyPath, validatedInput.privateKey, { mode: 0o600 });
      
      if (validatedInput.caBundle) {
        await fs.writeFile(paths.caPath, validatedInput.caBundle, { mode: 0o644 });
        // Create fullchain
        const fullchain = validatedInput.certificate + '\n' + validatedInput.caBundle;
        await fs.writeFile(paths.fullPath, fullchain, { mode: 0o644 });
      } else {
        await fs.copyFile(paths.certPath, paths.fullPath);
      }

      // Create database record
      const certificate = await prisma.sSLCertificate.create({
        data: {
          id: generateSecureString(16),
          domain: validatedInput.domain,
          type: 'custom',
          status: determineStatus(daysUntilExpiry),
          issuer: certInfo.issuer,
          subject: certInfo.subject,
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          daysUntilExpiry,
          autoRenew: validatedInput.autoRenew ?? false,
          certPath: paths.certPath,
          keyPath: paths.keyPath,
          caPath: paths.caPath,
          fullPath: paths.fullPath,
          siteId: validatedInput.siteId,
          metadata: {
            uploaded: true,
            serialNumber: certInfo.serialNumber,
          },
        },
      });

      // Install certificate for OLS vhost
      if (validatedInput.siteId) {
        await this.installForVhost(certificate);
      }

      // Create audit log
      await createAuditLog({
        action: 'CREATE',
        resource: 'ssl_certificate',
        userId: 'system',
        metadata: {
          certificateId: certificate.id,
          domain: certificate.domain,
          type: 'custom',
        },
      });

      // Cache certificate
      await this.cacheCertificate(certificate);

      return certificate;
    } catch (error) {
      // Cleanup on error
      await this.cleanupCertificatePaths(validatedInput.domain);
      throw error;
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId: string): Promise<SSLCertificate | null> {
    // Check cache first
    const cached = await redis.get(`ssl:cert:${certificateId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const certificate = await prisma.sSLCertificate.findUnique({
      where: { id: certificateId },
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

    if (certificate) {
      await this.cacheCertificate(certificate);
    }

    return certificate;
  }

  /**
   * Get certificate by domain
   */
  async getCertificateByDomain(domain: string): Promise<SSLCertificate | null> {
    return prisma.sSLCertificate.findUnique({
      where: { domain },
    });
  }

  /**
   * List all certificates
   */
  async listCertificates(options?: {
    type?: CertType;
    status?: CertStatus;
    siteId?: string;
    expiringSoon?: boolean;
  }): Promise<SSLCertificate[]> {
    const where: any = {};

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.siteId) {
      where.siteId = options.siteId;
    }

    if (options?.expiringSoon) {
      where.daysUntilExpiry = { lte: 30 };
    }

    const certificates = await prisma.sSLCertificate.findMany({
      where,
      orderBy: { validTo: 'asc' },
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

    return certificates;
  }

  /**
   * Update certificate
   */
  async updateCertificate(
    certificateId: string,
    updates: Partial<SSLCertificate>,
    userId: string
  ): Promise<SSLCertificate> {
    const certificate = await this.getCertificate(certificateId);

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    const updatedCertificate = await prisma.sSLCertificate.update({
      where: { id: certificateId },
      data: updates,
    });

    // Update cache
    await this.cacheCertificate(updatedCertificate);

    // Create audit log
    await createAuditLog({
      action: 'UPDATE',
      resource: 'ssl_certificate',
      userId,
      metadata: {
        certificateId: certificate.id,
        changes: Object.keys(updates),
      },
    });

    return updatedCertificate;
  }

  /**
   * Delete certificate
   */
  async deleteCertificate(certificateId: string, userId: string, deleteFiles: boolean = true): Promise<void> {
    const certificate = await this.getCertificate(certificateId);

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    try {
      // Delete files if requested
      if (deleteFiles) {
        await this.cleanupCertificatePaths(certificate.domain);
      }

      // Delete database record
      await prisma.sSLCertificate.delete({
        where: { id: certificateId },
      });

      // Remove from cache
      await redis.del(`ssl:cert:${certificateId}`);

      // Create audit log
      await createAuditLog({
        action: 'DELETE',
        resource: 'ssl_certificate',
        userId,
        metadata: {
          certificateId: certificate.id,
          domain: certificate.domain,
          deleteFiles,
        },
      });
    } catch (error) {
      console.error('[SSL] Failed to delete certificate:', error);
      throw error;
    }
  }

  // =============================================================================
  // 🔄 RENEWAL
  // =============================================================================

  /**
   * Renew certificate
   */
  async renewCertificate(input: RenewCertInput): Promise<SSLCertificate> {
    const certificate = await this.getCertificate(input.certificateId);

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    if (certificate.type === 'custom') {
      throw new Error('Custom certificates cannot be auto-renewed. Please upload a new certificate.');
    }

    try {
      // Renew via acme.sh
      const renewedCert = await this.acme.renew({
        domain: certificate.domain,
        force: input.force,
      });

      // Copy new certificate files
      const paths = getCertPaths(certificate.domain);
      await fs.copyFile(renewedCert.certPath, paths.certPath);
      await fs.copyFile(renewedCert.keyPath, paths.keyPath);
      await fs.copyFile(renewedCert.caPath, paths.caPath);
      await fs.copyFile(renewedCert.fullPath, paths.fullPath);

      // Set secure permissions
      await fs.chmod(paths.keyPath, 0o600);

      // Get new certificate info
      const certContent = await fs.readFile(paths.certPath, 'utf-8');
      const certInfo = await getCertInfo(certContent);
      const daysUntilExpiry = calculateDaysUntilExpiry(certInfo.validTo);

      // Update database
      const updatedCertificate = await prisma.sSLCertificate.update({
        where: { id: certificate.id },
        data: {
          status: determineStatus(daysUntilExpiry),
          validFrom: certInfo.validFrom,
          validTo: certInfo.validTo,
          daysUntilExpiry,
          issuer: certInfo.issuer,
          subject: certInfo.subject,
          updatedAt: new Date(),
        },
      });

      // Install for OLS vhost
      if (certificate.siteId) {
        await this.installForVhost(updatedCertificate);
      }

      // Update cache
      await this.cacheCertificate(updatedCertificate);

      // Create audit log
      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'ssl_certificate',
        userId: 'system',
        metadata: {
          certificateId: certificate.id,
          action: 'certificate_renewed',
          domain: certificate.domain,
        },
      });

      return updatedCertificate;
    } catch (error) {
      console.error('[SSL] Failed to renew certificate:', error);
      throw error;
    }
  }

  /**
   * Renew all expiring certificates
   */
  async renewExpiringCertificates(daysThreshold: number = 30): Promise<{
    renewed: number;
    failed: number;
    results: Array<{ domain: string; success: boolean; error?: string }>;
  }> {
    const expiringCerts = await this.listCertificates({ expiringSoon: true });
    
    const results: Array<{ domain: string; success: boolean; error?: string }> = [];
    let renewed = 0;
    let failed = 0;

    for (const cert of expiringCerts) {
      if (cert.type !== 'auto' || !cert.autoRenew) {
        continue; // Skip custom certs and auto-renew disabled
      }

      try {
        await this.renewCertificate({ certificateId: cert.id });
        renewed++;
        results.push({ domain: cert.domain, success: true });
      } catch (error) {
        failed++;
        results.push({
          domain: cert.domain,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { renewed, failed, results };
  }

  // =============================================================================
  // 🔍 VALIDATION
  // =============================================================================

  /**
   * Validate certificate upload
   */
  async validateCertificate(input: UploadCertInput): Promise<CertValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate PEM format
    if (!validatePEM(input.certificate, 'cert')) {
      errors.push('Invalid certificate format (must be PEM)');
    }

    if (!validatePEM(input.privateKey, 'key')) {
      errors.push('Invalid private key format (must be PEM)');
    }

    if (input.caBundle && !validatePEM(input.caBundle, 'ca')) {
      errors.push('Invalid CA bundle format (must be PEM)');
    }

    if (errors.length > 0) {
      return {
        valid: false,
        errors,
        warnings,
        info: {},
      };
    }

    // Verify cert/key match
    const keyMatch = await verifyCertKeyMatch(input.certificate, input.privateKey);
    if (!keyMatch) {
      errors.push('Certificate and private key do not match');
    }

    // Get certificate info
    let certInfo;
    try {
      certInfo = await getCertInfo(input.certificate);
    } catch (error) {
      errors.push(`Failed to parse certificate: ${error}`);
      return { valid: false, errors, warnings, info: {} };
    }

    // Check expiry
    const daysUntilExpiry = calculateDaysUntilExpiry(certInfo.validTo);
    if (daysUntilExpiry <= 0) {
      errors.push('Certificate has expired');
    } else if (daysUntilExpiry <= 30) {
      warnings.push(`Certificate expires in ${daysUntilExpiry} days`);
    }

    // Check domain match
    const domainMatches = 
      certInfo.domains.includes(input.domain) ||
      certInfo.domains.includes(`*.${input.domain.split('.').slice(-2).join('.')}`);

    if (!domainMatches) {
      errors.push(`Certificate does not cover domain ${input.domain}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info: {
        issuer: certInfo.issuer,
        subject: certInfo.subject,
        validFrom: certInfo.validFrom,
        validTo: certInfo.validTo,
        domains: certInfo.domains,
        keyMatch,
      },
    };
  }

  // =============================================================================
  // 📥 INSTALLATION
  // =============================================================================

  /**
   * Install certificate for OLS vhost
   */
  async installForVhost(certificate: SSLCertificate): Promise<void> {
    if (!certificate.siteId) {
      return;
    }

    const site = await prisma.site.findUnique({
      where: { id: certificate.siteId },
    });

    if (!site) {
      return;
    }

    // OLS vhost SSL path
    const vhostSslPath = `/usr/local/lsws/conf/vhosts/${sanitizeDomain(site.domain)}/ssl`;

    try {
      // Ensure SSL directory exists
      await fs.mkdir(vhostSslPath, { recursive: true, mode: 0o755 });

      // Copy certificate files
      await fs.copyFile(certificate.certPath, path.join(vhostSslPath, 'cert.pem'));
      await fs.copyFile(certificate.keyPath, path.join(vhostSslPath, 'key.pem'));
      await fs.copyFile(certificate.caPath, path.join(vhostSslPath, 'ca.pem'));
      await fs.copyFile(certificate.fullPath, path.join(vhostSslPath, 'fullchain.pem'));

      // Set secure permissions
      await fs.chmod(path.join(vhostSslPath, 'key.pem'), 0o600);
      await fs.chmod(path.join(vhostSslPath, 'cert.pem'), 0o644);
      await fs.chmod(path.join(vhostSslPath, 'ca.pem'), 0o644);
      await fs.chmod(path.join(vhostSslPath, 'fullchain.pem'), 0o644);

      // Set ownership to lsadm
      await execAsync(`chown lsadm:lsadm ${vhostSslPath}/*`);

      // Reload OLS configuration
      await execAsync('systemctl reload lsws');
    } catch (error) {
      console.error('[SSL] Failed to install certificate for OLS:', error);
      throw error;
    }
  }

  // =============================================================================
  // 📊 MONITORING
  // =============================================================================

  /**
   * Check all certificates for expiry
   */
  async checkExpiry(): Promise<Array<{
    certificateId: string;
    domain: string;
    daysUntilExpiry: number;
    status: CertStatus;
    autoRenew: boolean;
    action: 'none' | 'renew' | 'alert' | 'critical';
  }>> {
    const certificates = await this.listCertificates();
    const results: Array<{
      certificateId: string;
      domain: string;
      daysUntilExpiry: number;
      status: CertStatus;
      autoRenew: boolean;
      action: 'none' | 'renew' | 'alert' | 'critical';
    }> = [];

    for (const cert of certificates) {
      let action: 'none' | 'renew' | 'alert' | 'critical' = 'none';

      if (cert.daysUntilExpiry <= 0) {
        action = 'critical';
      } else if (cert.daysUntilExpiry <= 7) {
        action = cert.autoRenew ? 'renew' : 'critical';
      } else if (cert.daysUntilExpiry <= 30) {
        action = cert.autoRenew ? 'renew' : 'alert';
      }

      results.push({
        certificateId: cert.id,
        domain: cert.domain,
        daysUntilExpiry: cert.daysUntilExpiry,
        status: cert.status,
        autoRenew: cert.autoRenew,
        action,
      });
    }

    return results;
  }

  /**
   * Get expiring certificates summary
   */
  async getExpiringSummary(): Promise<{
    total: number;
    expired: number;
    expiring7days: number;
    expiring30days: number;
    autoRenewEnabled: number;
  }> {
    const certificates = await this.listCertificates();

    return {
      total: certificates.length,
      expired: certificates.filter(c => c.daysUntilExpiry <= 0).length,
      expiring7days: certificates.filter(c => c.daysUntilExpiry > 0 && c.daysUntilExpiry <= 7).length,
      expiring30days: certificates.filter(c => c.daysUntilExpiry > 7 && c.daysUntilExpiry <= 30).length,
      autoRenewEnabled: certificates.filter(c => c.autoRenew).length,
    };
  }

  // =============================================================================
  // 🔧 UTILITIES
  // =============================================================================

  /**
   * Ensure SSL directories exist
   */
  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(SSL_ROOT, { recursive: true, mode: 0o755 });
    await fs.mkdir(CERTS_DIR, { recursive: true, mode: 0o755 });
    await fs.mkdir(KEYS_DIR, { recursive: true, mode: 0o700 });
    await fs.mkdir(CHAIN_DIR, { recursive: true, mode: 0o755 });
  }

  /**
   * Cleanup certificate files
   */
  private async cleanupCertificatePaths(domain: string): Promise<void> {
    const paths = getCertPaths(domain);

    try {
      await Promise.all([
        fs.unlink(paths.certPath).catch(() => {}),
        fs.unlink(paths.keyPath).catch(() => {}),
        fs.unlink(paths.caPath).catch(() => {}),
        fs.unlink(paths.fullPath).catch(() => {}),
      ]);
    } catch (error) {
      console.error('[SSL] Failed to cleanup certificate files:', error);
    }
  }

  /**
   * Cache certificate
   */
  private async cacheCertificate(certificate: SSLCertificate): Promise<void> {
    await redis.setEx(
      `ssl:cert:${certificate.id}`,
      3600, // 1 hour TTL
      JSON.stringify(certificate)
    );
  }

  /**
   * Invalidate certificate cache
   */
  async invalidateCertificateCache(certificateId: string): Promise<void> {
    await redis.del(`ssl:cert:${certificateId}`);
  }
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export const sslManager = new SSLManager();

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * SSL Manager Service — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Auto Certificates (acme.sh):
 *    - Let's Encrypt / ZeroSSL / BuyPass / Google
 *    - HTTP challenge (webroot)
 *    - DNS challenge (50+ providers)
 *    - Wildcard certificates
 *    - Auto-renewal
 * 
 * 2. Custom Certificates:
 *    - Upload .crt/.key/.ca (PEM format)
 *    - Validation (key match, expiry, domain)
 *    - No auto-renewal (manual upload)
 *    - Expiry reminders
 * 
 * 3. Certificate Management:
 *    - CRUD operations
 *    - List with filters (type, status, site)
 *    - Expiry monitoring
 *    - Bulk renewal
 * 
 * 4. OLS Integration:
 *    - Install to vhost SSL paths
 *    - Secure permissions (600 for keys)
 *    - Auto reload on install
 * 
 * 5. Monitoring:
 *    - Expiry check (30/14/7 days)
 *    - Status: active/expiring/expired
 *    - Auto-renew tracking
 *    - Alert actions
 * 
 * File Structure:
 * /etc/ssl/wppanel/
 *   ├── certs/     # Certificate files
 *   ├── keys/      # Private keys (0600)
 *   └── chain/     # CA bundles
 * 
 * Environment Variables:
 * - SSL_ROOT: /etc/ssl/wppanel
 * - ACME_EMAIL: admin@example.com
 * - ACME_CA_PROVIDER: letsencrypt
 * - DNS_PROVIDER: cloudflare
 * - DNS_CREDENTIALS: JSON string
 * 
 * API Routes (to be implemented):
 * - GET    /api/ssl
 * - POST   /api/ssl/issue
 * - POST   /api/ssl/upload
 * - POST   /api/ssl/:id/renew
 * - DELETE /api/ssl/:id
 * - GET    /api/ssl/expiring
 * - POST   /api/ssl/validate
 * - GET    /api/ssl/:id/download
 */