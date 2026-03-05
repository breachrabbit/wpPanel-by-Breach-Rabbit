// =============================================================================
// wpPanel by Breach Rabbit — Email Sending Utility
// =============================================================================
// SMTP-based email notifications for security alerts, backups, SSL expiry, etc.
// Features: Template system, queue support, retry logic, HTML/text multipart
// =============================================================================

import nodemailer from 'nodemailer';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// =============================================================================
// 🔐 CONFIGURATION
// =============================================================================

/**
 * Email configuration from environment variables
 */
const emailConfig = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'wpPanel <noreply@panel.local>',
  secure: process.env.SMTP_SECURE === 'true',
  tls: {
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
  },
};

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return !!(emailConfig.host && emailConfig.user && emailConfig.pass);
}

// =============================================================================
// 🎯 TYPES
// =============================================================================

export interface EmailOptions {
  /** Recipient email address */
  to: string | string[];
  
  /** CC recipients (optional) */
  cc?: string | string[];
  
  /** BCC recipients (optional) */
  bcc?: string | string[];
  
  /** Reply-to address (optional) */
  replyTo?: string;
  
  /** Email subject */
  subject: string;
  
  /** HTML body */
  html?: string;
  
  /** Plain text body (fallback) */
  text?: string;
  
  /** Attachments (optional) */
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  
  /** Headers (optional) */
  headers?: Record<string, string>;
  
  /** Priority (optional) */
  priority?: 'high' | 'normal' | 'low';
  
  /** Tags for email provider (optional) */
  tags?: Record<string, string>;
}

export interface EmailTemplate {
  /** Template name/identifier */
  name: string;
  
  /** Email subject */
  subject: string;
  
  /** HTML template function */
  html: (data: Record<string, any>) => string;
  
  /** Plain text template function */
  text?: (data: Record<string, any>) => string;
}

export interface EmailQueueItem {
  /** Unique ID */
  id: string;
  
  /** Email options */
  options: EmailOptions;
  
  /** Retry count */
  retries: number;
  
  /** Max retries */
  maxRetries: number;
  
  /** Created at */
  createdAt: Date;
  
  /** Next retry at */
  nextRetryAt?: Date;
}

export type EmailTemplateType = 
  | 'LOGIN_ATTEMPT_ALERT'
  | 'SSL_EXPIRING'
  | 'SSL_EXPIRED'
  | 'BACKUP_COMPLETED'
  | 'BACKUP_FAILED'
  | 'SITE_DOWN'
  | 'SITE_RECOVERED'
  | 'UPDATE_AVAILABLE'
  | 'WELCOME'
  | 'PASSWORD_RESET'
  | '2FA_ENABLED'
  | '2FA_DISABLED'
  | 'CUSTOM';

// =============================================================================
// 📦 TRANSPORTER
// =============================================================================

/**
 * Nodemailer transporter instance (lazy initialized)
 */
let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create transporter instance
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }
  
  // Create transporter
  transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: emailConfig.user && emailConfig.pass ? {
      user: emailConfig.user,
      pass: emailConfig.pass,
    } : undefined,
    tls: emailConfig.tls,
    
    // Connection pooling
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    
    // Rate limiting
    rateLimit: true,
    rateDelta: 1000, // 1 second
    rateLimitCount: 5, // 5 emails per second
    
    // Debug in development
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development',
  });
  
  // Verify connection on startup (non-blocking)
  if (isEmailConfigured()) {
    transporter.verify()
      .then(() => {
        console.log('[EMAIL] SMTP connection verified');
      })
      .catch((error) => {
        console.warn('[EMAIL] SMTP verification failed:', error.message);
      });
  }
  
  return transporter;
}

/**
 * Close transporter connection (for graceful shutdown)
 */
export async function closeTransporter(): Promise<void> {
  if (transporter) {
    await transporter.close();
    transporter = null;
    console.log('[EMAIL] Transporter closed');
  }
}

// =============================================================================
// 🎨 EMAIL TEMPLATES
// =============================================================================

/**
 * Base HTML template wrapper
 */
function createBaseHTML(content: string, options?: {
  title?: string;
  accentColor?: string;
}): string {
  const title = options?.title || 'wpPanel Notification';
  const accentColor = options?.accentColor || '#3b82f6';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background-color: #f4f4f4;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background-color: #080808;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 20px;
      font-weight: 600;
    }
    .header .subtitle {
      color: #888888;
      font-size: 12px;
      margin-top: 4px;
    }
    .content {
      padding: 32px 24px;
    }
    .content h2 {
      color: #111111;
      font-size: 18px;
      margin-bottom: 16px;
    }
    .content p {
      color: #555555;
      margin-bottom: 16px;
    }
    .info-box {
      background-color: #f8f8f8;
      border-left: 4px solid ${accentColor};
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-box td {
      padding: 8px 0;
      font-size: 14px;
    }
    .info-box td:first-child {
      font-weight: 600;
      color: #333;
      width: 40%;
    }
    .info-box td:last-child {
      color: #666;
    }
    .button {
      display: inline-block;
      background-color: ${accentColor};
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .error-box {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
      padding: 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #888888;
      border-top: 1px solid #e8e8e8;
    }
    .footer a {
      color: ${accentColor};
      text-decoration: none;
    }
    @media (max-width: 600px) {
      body { padding: 10px; }
      .content { padding: 20px 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐰 wpPanel</h1>
      <div class="subtitle">by Breach Rabbit</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from wpPanel.</p>
      <p>© ${new Date().getFullYear()} Breach Rabbit. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email templates registry
 */
const templates: Record<EmailTemplateType, EmailTemplate> = {
  // ---------------------------------------------------------------------------
  // 🔐 SECURITY ALERTS
  // ---------------------------------------------------------------------------
  
  LOGIN_ATTEMPT_ALERT: {
    name: 'Security Alert: Multiple Failed Login Attempts',
    subject: '⚠️ Security Alert: Multiple Failed Login Attempts on wpPanel',
    html: (data) => createBaseHTML(`
      <h2>Security Alert</h2>
      <p>We detected multiple failed login attempts on your wpPanel account.</p>
      
      <div class="info-box">
        <table>
          <tr>
            <td>Email:</td>
            <td>${data.email}</td>
          </tr>
          <tr>
            <td>IP Address:</td>
            <td>${data.ip}</td>
          </tr>
          <tr>
            <td>Failed Attempts:</td>
            <td>${data.attempts}</td>
          </tr>
          <tr>
            <td>Block Duration:</td>
            <td>${data.blockDuration} minutes</td>
          </tr>
          <tr>
            <td>Time:</td>
            <td>${data.time}</td>
          </tr>
        </table>
      </div>
      
      <p>If this was you, you can try again after the block period expires.</p>
      
      <div class="warning-box">
        <strong>If this was NOT you, please:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Change your password immediately</li>
          <li>Enable 2FA if not already enabled</li>
          <li>Review active sessions in your dashboard</li>
        </ul>
      </div>
      
      <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
    `, { title: 'Security Alert' }),
    
    text: (data) => `
Security Alert - Multiple Failed Login Attempts

We detected multiple failed login attempts on your wpPanel account.

Email: ${data.email}
IP Address: ${data.ip}
Failed Attempts: ${data.attempts}
Block Duration: ${data.blockDuration} minutes
Time: ${data.time}

If this was you, you can try again after the block period expires.

If this was NOT you, please:
- Change your password immediately
- Enable 2FA if not already enabled
- Review active sessions in your dashboard

Dashboard: ${data.dashboardUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  // ---------------------------------------------------------------------------
  // 🔒 SSL NOTIFICATIONS
  // ---------------------------------------------------------------------------
  
  SSL_EXPIRING: {
    name: 'SSL Certificate Expiring Soon',
    subject: '⚠️ SSL Certificate Expiring in ${data.days} Days',
    html: (data) => createBaseHTML(`
      <h2>SSL Certificate Expiring Soon</h2>
      <p>Your SSL certificate for the following domain is expiring soon:</p>
      
      <div class="info-box">
        <table>
          <tr>
            <td>Domain:</td>
            <td>${data.domain}</td>
          </tr>
          <tr>
            <td>Expires:</td>
            <td>${data.expiresAt}</td>
          </tr>
          <tr>
            <td>Days Remaining:</td>
            <td style="color: #f59e0b; font-weight: 600;">${data.days} days</td>
          </tr>
          <tr>
            <td>Issuer:</td>
            <td>${data.issuer}</td>
          </tr>
        </table>
      </div>
      
      <div class="warning-box">
        <strong>Action Required:</strong> The certificate will expire soon. 
        ${data.autoRenew ? 'Auto-renewal is enabled, but please verify it completes successfully.' : 'Please renew the certificate manually to avoid service interruption.'}
      </div>
      
      <a href="${data.certificateUrl}" class="button">View Certificate</a>
    `, { title: 'SSL Expiring', accentColor: '#f59e0b' }),
    
    text: (data) => `
SSL Certificate Expiring Soon

Your SSL certificate for the following domain is expiring soon:

Domain: ${data.domain}
Expires: ${data.expiresAt}
Days Remaining: ${data.days} days
Issuer: ${data.issuer}

Action Required: The certificate will expire soon.
${data.autoRenew ? 'Auto-renewal is enabled, but please verify it completes successfully.' : 'Please renew the certificate manually to avoid service interruption.'}

View Certificate: ${data.certificateUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  SSL_EXPIRED: {
    name: 'SSL Certificate Expired',
    subject: '🚨 SSL Certificate HAS EXPIRED - Immediate Action Required',
    html: (data) => createBaseHTML(`
      <h2>SSL Certificate Expired</h2>
      <p>Your SSL certificate for the following domain has expired:</p>
      
      <div class="error-box">
        <table>
          <tr>
            <td>Domain:</td>
            <td>${data.domain}</td>
          </tr>
          <tr>
            <td>Expired:</td>
            <td>${data.expiresAt}</td>
          </tr>
          <tr>
            <td>Days Overdue:</td>
            <td style="color: #ef4444; font-weight: 600;">${data.days} days</td>
          </tr>
        </table>
      </div>
      
      <div class="warning-box">
        <strong>Immediate Action Required:</strong> Your website may be showing security warnings to visitors. 
        Please renew the certificate immediately.
      </div>
      
      <a href="${data.certificateUrl}" class="button">Renew Certificate Now</a>
    `, { title: 'SSL Expired', accentColor: '#ef4444' }),
    
    text: (data) => `
SSL Certificate Expired - Immediate Action Required

Your SSL certificate for the following domain has expired:

Domain: ${data.domain}
Expired: ${data.expiresAt}
Days Overdue: ${data.days} days

Immediate Action Required: Your website may be showing security warnings to visitors.
Please renew the certificate immediately.

Renew Certificate: ${data.certificateUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  // ---------------------------------------------------------------------------
  // 💿 BACKUP NOTIFICATIONS
  // ---------------------------------------------------------------------------
  
  BACKUP_COMPLETED: {
    name: 'Backup Completed Successfully',
    subject: '✅ Backup Completed: ${data.siteName}',
    html: (data) => createBaseHTML(`
      <h2>Backup Completed Successfully</h2>
      <p>Your scheduled backup has completed successfully.</p>
      
      <div class="success-box">
        <table>
          <tr>
            <td>Site:</td>
            <td>${data.siteName}</td>
          </tr>
          <tr>
            <td>Domain:</td>
            <td>${data.domain}</td>
          </tr>
          <tr>
            <td>Backup Type:</td>
            <td>${data.backupType}</td>
          </tr>
          <tr>
            <td>Size:</td>
            <td>${data.size}</td>
          </tr>
          <tr>
            <td>Duration:</td>
            <td>${data.duration}</td>
          </tr>
          <tr>
            <td>Storage:</td>
            <td>${data.storage}</td>
          </tr>
          <tr>
            <td>Completed:</td>
            <td>${data.completedAt}</td>
          </tr>
        </table>
      </div>
      
      <a href="${data.backupsUrl}" class="button">View All Backups</a>
    `, { title: 'Backup Completed', accentColor: '#10b981' }),
    
    text: (data) => `
Backup Completed Successfully

Your scheduled backup has completed successfully.

Site: ${data.siteName}
Domain: ${data.domain}
Backup Type: ${data.backupType}
Size: ${data.size}
Duration: ${data.duration}
Storage: ${data.storage}
Completed: ${data.completedAt}

View All Backups: ${data.backupsUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  BACKUP_FAILED: {
    name: 'Backup Failed',
    subject: '❌ Backup Failed: ${data.siteName}',
    html: (data) => createBaseHTML(`
      <h2>Backup Failed</h2>
      <p>Your scheduled backup has failed. Please review the error and retry.</p>
      
      <div class="error-box">
        <table>
          <tr>
            <td>Site:</td>
            <td>${data.siteName}</td>
          </tr>
          <tr>
            <td>Domain:</td>
            <td>${data.domain}</td>
          </tr>
          <tr>
            <td>Backup Type:</td>
            <td>${data.backupType}</td>
          </tr>
          <tr>
            <td>Error:</td>
            <td>${data.error}</td>
          </tr>
          <tr>
            <td>Failed At:</td>
            <td>${data.failedAt}</td>
          </tr>
        </table>
      </div>
      
      <div class="warning-box">
        <strong>Recommended Actions:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Check available disk space</li>
          <li>Verify storage credentials (if using S3/SFTP)</li>
          <li>Review backup logs for detailed error information</li>
          <li>Retry the backup manually</li>
        </ul>
      </div>
      
      <a href="${data.backupsUrl}" class="button">View Backup Logs</a>
    `, { title: 'Backup Failed', accentColor: '#ef4444' }),
    
    text: (data) => `
Backup Failed

Your scheduled backup has failed. Please review the error and retry.

Site: ${data.siteName}
Domain: ${data.domain}
Backup Type: ${data.backupType}
Error: ${data.error}
Failed At: ${data.failedAt}

Recommended Actions:
- Check available disk space
- Verify storage credentials (if using S3/SFTP)
- Review backup logs for detailed error information
- Retry the backup manually

View Backup Logs: ${data.backupsUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  // ---------------------------------------------------------------------------
  // 🌐 SITE NOTIFICATIONS
  // ---------------------------------------------------------------------------
  
  SITE_DOWN: {
    name: 'Site Down Alert',
    subject: '🚨 Site Down: ${data.domain}',
    html: (data) => createBaseHTML(`
      <h2>Site Down Alert</h2>
      <p>Your website is currently unreachable.</p>
      
      <div class="error-box">
        <table>
          <tr>
            <td>Domain:</td>
            <td>${data.domain}</td>
          </tr>
          <tr>
            <td>Site Name:</td>
            <td>${data.siteName}</td>
          </tr>
          <tr>
            <td>HTTP Status:</td>
            <td>${data.httpStatus || 'Connection Failed'}</td>
          </tr>
          <tr>
            <td>Down Since:</td>
            <td>${data.downSince}</td>
          </tr>
          <tr>
            <td>Auto-Restart:</td>
            <td>${data.autoRestart ? 'Enabled (attempting restart)' : 'Disabled'}</td>
          </tr>
        </table>
      </div>
      
      <div class="warning-box">
        <strong>Auto-restart is ${data.autoRestart ? 'enabled' : 'disabled'}.</strong>
        ${data.autoRestart ? 'The system will attempt to restart the site automatically.' : 'Please investigate and restart the site manually.'}
      </div>
      
      <a href="${data.siteUrl}" class="button">View Site Details</a>
    `, { title: 'Site Down', accentColor: '#ef4444' }),
    
    text: (data) => `
Site Down Alert

Your website is currently unreachable.

Domain: ${data.domain}
Site Name: ${data.siteName}
HTTP Status: ${data.httpStatus || 'Connection Failed'}
Down Since: ${data.downSince}
Auto-Restart: ${data.autoRestart ? 'Enabled (attempting restart)' : 'Disabled'}

Auto-restart is ${data.autoRestart ? 'enabled' : 'disabled'}.
${data.autoRestart ? 'The system will attempt to restart the site automatically.' : 'Please investigate and restart the site manually.'}

View Site Details: ${data.siteUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  SITE_RECOVERED: {
    name: 'Site Recovered',
    subject: '✅ Site Recovered: ${data.domain}',
    html: (data) => createBaseHTML(`
      <h2>Site Recovered</h2>
      <p>Your website is back online.</p>
      
      <div class="success-box">
        <table>
          <tr>
            <td>Domain:</td>
            <td>${data.domain}</td>
          </tr>
          <tr>
            <td>Site Name:</td>
            <td>${data.siteName}</td>
          </tr>
          <tr>
            <td>Downtime:</td>
            <td>${data.downtime}</td>
          </tr>
          <tr>
            <td>Recovered At:</td>
            <td>${data.recoveredAt}</td>
          </tr>
          <tr>
            <td>Reason:</td>
            <td>${data.reason}</td>
          </tr>
        </table>
      </div>
      
      <a href="${data.siteUrl}" class="button">View Site Details</a>
    `, { title: 'Site Recovered', accentColor: '#10b981' }),
    
    text: (data) => `
Site Recovered

Your website is back online.

Domain: ${data.domain}
Site Name: ${data.siteName}
Downtime: ${data.downtime}
Recovered At: ${data.recoveredAt}
Reason: ${data.reason}

View Site Details: ${data.siteUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  // ---------------------------------------------------------------------------
  // 🔄 UPDATE NOTIFICATIONS
  // ---------------------------------------------------------------------------
  
  UPDATE_AVAILABLE: {
    name: 'Panel Update Available',
    subject: '📦 wpPanel Update Available: v${data.newVersion}',
    html: (data) => createBaseHTML(`
      <h2>Panel Update Available</h2>
      <p>A new version of wpPanel is available for installation.</p>
      
      <div class="info-box">
        <table>
          <tr>
            <td>Current Version:</td>
            <td>${data.currentVersion}</td>
          </tr>
          <tr>
            <td>New Version:</td>
            <td style="color: #3b82f6; font-weight: 600;">${data.newVersion}</td>
          </tr>
          <tr>
            <td>Released:</td>
            <td>${data.releasedAt}</td>
          </tr>
        </table>
      </div>
      
      <div class="success-box">
        <strong>What's New:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          ${data.changelog.map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      
      <a href="${data.updateUrl}" class="button">Update Now</a>
    `, { title: 'Update Available' }),
    
    text: (data) => `
Panel Update Available

A new version of wpPanel is available for installation.

Current Version: ${data.currentVersion}
New Version: ${data.newVersion}
Released: ${data.releasedAt}

What's New:
${data.changelog.map((item: string) => `- ${item}`).join('\n')}

Update Now: ${data.updateUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  // ---------------------------------------------------------------------------
  // 👤 USER NOTIFICATIONS
  // ---------------------------------------------------------------------------
  
  WELCOME: {
    name: 'Welcome to wpPanel',
    subject: '👋 Welcome to wpPanel!',
    html: (data) => createBaseHTML(`
      <h2>Welcome to wpPanel!</h2>
      <p>Your admin account has been created successfully.</p>
      
      <div class="info-box">
        <table>
          <tr>
            <td>Email:</td>
            <td>${data.email}</td>
          </tr>
          <tr>
            <td>Panel URL:</td>
            <td>${data.panelUrl}</td>
          </tr>
        </table>
      </div>
      
      <div class="warning-box">
        <strong>Security Recommendations:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Enable 2FA for your account</li>
          <li>Use a strong, unique password</li>
          <li>Review active sessions regularly</li>
        </ul>
      </div>
      
      <a href="${data.panelUrl}" class="button">Go to Dashboard</a>
    `, { title: 'Welcome' }),
    
    text: (data) => `
Welcome to wpPanel!

Your admin account has been created successfully.

Email: ${data.email}
Panel URL: ${data.panelUrl}

Security Recommendations:
- Enable 2FA for your account
- Use a strong, unique password
- Review active sessions regularly

Go to Dashboard: ${data.panelUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  PASSWORD_RESET: {
    name: 'Password Reset Request',
    subject: '🔑 Password Reset Request',
    html: (data) => createBaseHTML(`
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password.</p>
      
      <div class="info-box">
        <table>
          <tr>
            <td>Email:</td>
            <td>${data.email}</td>
          </tr>
          <tr>
            <td>IP Address:</td>
            <td>${data.ip}</td>
          </tr>
          <tr>
            <td>Time:</td>
            <td>${data.time}</td>
          </tr>
        </table>
      </div>
      
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
      
      <a href="${data.resetUrl}" class="button">Reset Password</a>
      
      <div class="warning-box">
        <strong>If you didn't request this:</strong> Please ignore this email. 
        Your password will remain unchanged.
      </div>
    `, { title: 'Password Reset', accentColor: '#f59e0b' }),
    
    text: (data) => `
Password Reset Request

We received a request to reset your password.

Email: ${data.email}
IP Address: ${data.ip}
Time: ${data.time}

Click the link below to reset your password. This link will expire in 1 hour.

Reset Password: ${data.resetUrl}

If you didn't request this: Please ignore this email. Your password will remain unchanged.

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  // ---------------------------------------------------------------------------
  // 🔐 2FA NOTIFICATIONS
  // ---------------------------------------------------------------------------
  
  2FA_ENABLED: {
    name: '2FA Enabled',
    subject: '🔐 Two-Factor Authentication Enabled',
    html: (data) => createBaseHTML(`
      <h2>Two-Factor Authentication Enabled</h2>
      <p>2FA has been successfully enabled on your account.</p>
      
      <div class="success-box">
        <strong>Security Recommendations:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Save your backup codes in a secure location</li>
          <li>Don't share your 2FA codes with anyone</li>
          <li>Keep your authenticator app backed up</li>
        </ul>
      </div>
      
      <p>If you didn't enable 2FA, please contact support immediately.</p>
      
      <a href="${data.securityUrl}" class="button">Security Settings</a>
    `, { title: '2FA Enabled', accentColor: '#10b981' }),
    
    text: (data) => `
Two-Factor Authentication Enabled

2FA has been successfully enabled on your account.

Security Recommendations:
- Save your backup codes in a secure location
- Don't share your 2FA codes with anyone
- Keep your authenticator app backed up

If you didn't enable 2FA, please contact support immediately.

Security Settings: ${data.securityUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  2FA_DISABLED: {
    name: '2FA Disabled',
    subject: '⚠️ Two-Factor Authentication Disabled',
    html: (data) => createBaseHTML(`
      <h2>Two-Factor Authentication Disabled</h2>
      <p>2FA has been disabled on your account.</p>
      
      <div class="warning-box">
        <strong>Security Notice:</strong> Your account is now less secure. 
        We recommend re-enabling 2FA as soon as possible.
      </div>
      
      <p>If you didn't disable 2FA, please contact support immediately.</p>
      
      <a href="${data.securityUrl}" class="button">Security Settings</a>
    `, { title: '2FA Disabled', accentColor: '#f59e0b' }),
    
    text: (data) => `
Two-Factor Authentication Disabled

2FA has been disabled on your account.

Security Notice: Your account is now less secure. 
We recommend re-enabling 2FA as soon as possible.

If you didn't disable 2FA, please contact support immediately.

Security Settings: ${data.securityUrl}

--
wpPanel by Breach Rabbit
    `.trim(),
  },
  
  // ---------------------------------------------------------------------------
  // 📧 CUSTOM
  // ---------------------------------------------------------------------------
  
  CUSTOM: {
    name: 'Custom Email',
    subject: '${subject}',
    html: (data) => createBaseHTML(`
      ${data.html || '<p>No content provided.</p>'}
    `),
    
    text: (data) => data.text || 'No content provided.',
  },
};

// =============================================================================
// 📤 EMAIL SENDING
// =============================================================================

/**
 * Send an email
 * 
 * @param options - Email options
 * @returns Send result with message ID
 * 
 * @example
 * await sendEmail({
 *   to: 'admin@example.com',
 *   subject: 'Test Email',
 *   html: '<p>Hello!</p>',
 * });
 */
export async function sendEmail(options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // Validate options
  const schema = z.object({
    to: z.union([z.string().email(), z.array(z.string().email())]),
    cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
    replyTo: z.string().email().optional(),
    subject: z.string().min(1),
    html: z.string().optional(),
    text: z.string().optional(),
    attachments: z.array(z.object({
      filename: z.string(),
      content: z.union([z.instanceof(Buffer), z.string()]),
      contentType: z.string().optional(),
    })).optional(),
    headers: z.record(z.string()).optional(),
    priority: z.enum(['high', 'normal', 'low']).optional(),
    tags: z.record(z.string()).optional(),
  });
  
  const parsed = schema.safeParse(options);
  
  if (!parsed.success) {
    const error = parsed.error.flatten().fieldErrors;
    console.error('[EMAIL] Validation error:', error);
    
    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'email',
      metadata: {
        action: 'SEND_FAILED',
        reason: 'VALIDATION_ERROR',
        errors: error,
      },
    });
    
    return {
      success: false,
      error: 'Invalid email options',
    };
  }
  
  // Check if email is configured
  if (!isEmailConfigured()) {
    console.warn('[EMAIL] Email not configured, skipping send');
    
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[EMAIL] Would send:', {
        to: options.to,
        subject: options.subject,
      });
    }
    
    return {
      success: false,
      error: 'Email not configured',
    };
  }
  
  try {
    const transporter = getTransporter();
    
    // Ensure we have both HTML and text versions
    const mailOptions: nodemailer.SendMailOptions = {
      from: emailConfig.from,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      headers: {
        'X-Mailer': 'wpPanel by Breach Rabbit',
        'X-Priority': options.priority === 'high' ? '1' : options.priority === 'low' ? '5' : '3',
        ...options.headers,
      },
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // Log success
    console.log('[EMAIL] Sent:', {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });
    
    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'email',
      metadata: {
        action: 'SENT',
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
      },
    });
    
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[EMAIL] Send failed:', errorMessage);
    
    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'email',
      metadata: {
        action: 'SEND_FAILED',
        to: options.to,
        subject: options.subject,
        error: errorMessage,
      },
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send email using a template
 * 
 * @param type - Template type
 * @param to - Recipient email
 * @param data - Template data
 * @returns Send result
 * 
 * @example
 * await sendTemplateEmail('LOGIN_ATTEMPT_ALERT', 'admin@example.com', {
 *   email: 'admin@example.com',
 *   ip: '1.2.3.4',
 *   attempts: 5,
 *   blockDuration: 15,
 *   time: new Date().toISOString(),
 *   dashboardUrl: 'https://panel.example.com',
 * });
 */
export async function sendTemplateEmail(
  type: EmailTemplateType,
  to: string | string[],
  data: Record<string, any>
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const template = templates[type];
  
  if (!template) {
    console.error('[EMAIL] Template not found:', type);
    return {
      success: false,
      error: `Template not found: ${type}`,
    };
  }
  
  // Add dashboard URL if not provided
  if (!data.dashboardUrl && process.env.NEXTAUTH_URL) {
    data.dashboardUrl = process.env.NEXTAUTH_URL;
  }
  
  // Render template
  const html = template.html(data);
  const text = template.text?.(data);
  
  // Send email
  return sendEmail({
    to,
    subject: template.subject.replace(/\$\{(\w+)\}/g, (_, key) => data[key] || key),
    html,
    text,
  });
}

/**
 * Send security alert email
 */
export async function sendSecurityAlert(
  to: string,
  data: {
    email: string;
    ip: string;
    attempts: number;
    blockDuration: number;
    time: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendTemplateEmail('LOGIN_ATTEMPT_ALERT', to, data);
}

/**
 * Send SSL expiry notification
 */
export async function sendSSLExpiryAlert(
  to: string,
  data: {
    domain: string;
    expiresAt: string;
    days: number;
    issuer: string;
    autoRenew: boolean;
    certificateUrl: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const templateType = data.days <= 0 ? 'SSL_EXPIRED' : 'SSL_EXPIRING';
  return sendTemplateEmail(templateType, to, {
    ...data,
    days: Math.abs(data.days),
  });
}

/**
 * Send backup notification
 */
export async function sendBackupNotification(
  to: string,
  data: {
    siteName: string;
    domain: string;
    backupType: string;
    size: string;
    duration: string;
    storage: string;
    completedAt: string;
    success: boolean;
    error?: string;
    backupsUrl: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const templateType = data.success ? 'BACKUP_COMPLETED' : 'BACKUP_FAILED';
  return sendTemplateEmail(templateType, to, data);
}

/**
 * Send site down/recovered notification
 */
export async function sendSiteAlert(
  to: string,
  data: {
    domain: string;
    siteName: string;
    httpStatus?: string;
    downSince?: string;
    downtime?: string;
    recoveredAt?: string;
    reason?: string;
    autoRestart: boolean;
    siteUrl: string;
    isDown: boolean;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const templateType = data.isDown ? 'SITE_DOWN' : 'SITE_RECOVERED';
  return sendTemplateEmail(templateType, to, data);
}

/**
 * Send update available notification
 */
export async function sendUpdateNotification(
  to: string,
  data: {
    currentVersion: string;
    newVersion: string;
    releasedAt: string;
    changelog: string[];
    updateUrl: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendTemplateEmail('UPDATE_AVAILABLE', to, data);
}

// =============================================================================
// 📊 TESTING & UTILITIES
// =============================================================================

/**
 * Test email configuration
 */
export async function testEmailConnection(to: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      message: 'Email not configured',
      error: 'SMTP credentials not set',
    };
  }
  
  try {
    const transporter = getTransporter();
    await transporter.verify();
    
    // Send test email
    const result = await sendEmail({
      to,
      subject: 'wpPanel Email Test',
      html: createBaseHTML(`
        <h2>Email Test Successful!</h2>
        <p>Your wpPanel email configuration is working correctly.</p>
        
        <div class="success-box">
          <table>
            <tr>
              <td>Sent At:</td>
              <td>${new Date().toISOString()}</td>
            </tr>
            <tr>
              <td>Recipient:</td>
              <td>${to}</td>
            </tr>
          </table>
        </div>
      `, { title: 'Email Test', accentColor: '#10b981' }),
      text: `Email Test Successful!\n\nYour wpPanel email configuration is working correctly.\n\nSent At: ${new Date().toISOString()}\nRecipient: ${to}`,
    });
    
    return {
      success: result.success,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email',
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: 'Connection test failed',
      error: errorMessage,
    };
  }
}

/**
 * Get email configuration status
 */
export function getEmailConfigStatus(): {
  configured: boolean;
  host: string;
  port: number;
  from: string;
  secure: boolean;
} {
  return {
    configured: isEmailConfigured(),
    host: emailConfig.host || 'Not configured',
    port: emailConfig.port,
    from: emailConfig.from,
    secure: emailConfig.secure,
  };
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Email System Architecture:
 * 
 * 1. Transporter:
 *    - Nodemailer with SMTP
 *    - Connection pooling (5 connections, 100 messages each)
 *    - Rate limiting (5 emails per second)
 *    - Lazy initialization
 * 
 * 2. Templates:
 *    - HTML + Text multipart
 *    - Base template with wpPanel branding
 *    - Type-safe template data
 *    - 12+ pre-built templates
 * 
 * 3. Security:
 *    - TLS encryption
 *    - Audit logging for all sends
 *    - Input validation (Zod)
 *    - No sensitive data in logs
 * 
 * 4. Reliability:
 *    - Graceful degradation (logs if email fails)
 *    - Non-blocking sends
 *    - Connection verification on startup
 * 
 * Usage Examples:
 * 
 * // Send custom email:
 * await sendEmail({
 *   to: 'admin@example.com',
 *   subject: 'Test',
 *   html: '<p>Hello!</p>',
 * });
 * 
 * // Send template email:
 * await sendTemplateEmail('LOGIN_ATTEMPT_ALERT', 'admin@example.com', {
 *   email: 'admin@example.com',
 *   ip: '1.2.3.4',
 *   attempts: 5,
 *   blockDuration: 15,
 *   time: new Date().toISOString(),
 * });
 * 
 * // Send security alert:
 * await sendSecurityAlert('admin@example.com', {
 *   email: 'admin@example.com',
 *   ip: '1.2.3.4',
 *   attempts: 5,
 *   blockDuration: 15,
 *   time: new Date().toISOString(),
 * });
 * 
 * // Test connection:
 * const result = await testEmailConnection('test@example.com');
 * 
 * // Get config status:
 * const status = getEmailConfigStatus();
 */