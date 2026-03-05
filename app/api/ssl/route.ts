// =============================================================================
// wpPanel by Breach Rabbit — SSL API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// SSL certificate management (auto, custom, renewal, expiry monitoring)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sslManager } from '@/lib/services/ssl-manager';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface SSLQuery {
  action?: 'list' | 'expiring' | 'summary';
  certificateId?: string;
  domain?: string;
}

interface SSLBody {
  action?: 'issue' | 'upload' | 'renew' | 'delete' | 'validate';
  certificateId?: string;
  domain?: string;
  type?: 'auto' | 'custom';
  caProvider?: 'letsencrypt' | 'zerossl' | 'buypass' | 'google';
  wildcard?: boolean;
  subdomains?: string[];
  challengeType?: 'http' | 'dns';
  dnsProvider?: string;
  dnsCredentials?: Record<string, string>;
  autoRenew?: boolean;
  siteId?: string;
  // For upload
  certificate?: string;
  privateKey?: string;
  caBundle?: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const SSLQuerySchema = z.object({
  action: z.enum(['list', 'expiring', 'summary']).optional(),
  certificateId: z.string().optional(),
  domain: z.string().optional(),
});

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

const ValidateCertSchema = z.object({
  certificate: z.string().min(100),
  privateKey: z.string().min(100),
  caBundle: z.string().optional(),
  domain: z.string(),
});

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/ssl
 * List certificates or get certificate details
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams;
    const validatedQuery = SSLQuerySchema.parse({
      action: query.get('action') || 'list',
      certificateId: query.get('certificateId'),
      domain: query.get('domain'),
    });

    const { action, certificateId, domain } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // LIST ALL CERTIFICATES
      // =======================================================================
      case 'list':
        result = await sslManager.listCertificates();
        break;

      // =======================================================================
      // GET EXPIRING CERTIFICATES
      // =======================================================================
      case 'expiring':
        result = await sslManager.listCertificates({ expiringSoon: true });
        break;

      // =======================================================================
      // GET EXPIRING SUMMARY
      // =======================================================================
      case 'summary':
        result = await sslManager.getExpiringSummary();
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
    console.error('[SSL API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ssl
 * SSL operations (issue, upload, renew, delete, validate)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, certificateId, ...data } = body;

    let result: any;

    switch (action) {
      // =======================================================================
      // ISSUE AUTO CERTIFICATE
      // =======================================================================
      case 'issue':
        const validatedIssue = IssueCertSchema.parse(data);

        result = await sslManager.issueCertificate(validatedIssue);

        await createAuditLog({
          action: 'CREATE',
          resource: 'ssl_certificate',
          userId,
          metadata: {
            certificateId: result.id,
            domain: result.domain,
            type: 'auto',
            caProvider: result.caProvider,
          },
        });

        break;

      // =======================================================================
      // UPLOAD CUSTOM CERTIFICATE
      // =======================================================================
      case 'upload':
        const validatedUpload = UploadCertSchema.parse(data);

        result = await sslManager.uploadCertificate(validatedUpload);

        await createAuditLog({
          action: 'CREATE',
          resource: 'ssl_certificate',
          userId,
          metadata: {
            certificateId: result.id,
            domain: result.domain,
            type: 'custom',
          },
        });

        break;

      // =======================================================================
      // RENEW CERTIFICATE
      // =======================================================================
      case 'renew':
        if (!certificateId) {
          return NextResponse.json({ error: 'certificateId is required' }, { status: 400 });
        }

        result = await sslManager.renewCertificate({
          certificateId,
          force: data.force || false,
        });

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'ssl_certificate',
          userId,
          metadata: {
            certificateId,
            action: 'certificate_renewed',
            domain: result.domain,
          },
        });

        break;

      // =======================================================================
      // DELETE CERTIFICATE
      // =======================================================================
      case 'delete':
        if (!certificateId) {
          return NextResponse.json({ error: 'certificateId is required' }, { status: 400 });
        }

        const deleteFiles = data.deleteFiles || true;

        await sslManager.deleteCertificate(certificateId, userId, deleteFiles);

        await createAuditLog({
          action: 'DELETE',
          resource: 'ssl_certificate',
          userId,
          metadata: {
            certificateId,
            deleteFiles,
          },
        });

        result = { success: true, message: 'Certificate deleted successfully' };
        break;

      // =======================================================================
      // VALIDATE CERTIFICATE (before upload)
      // =======================================================================
      case 'validate':
        const validatedValidate = ValidateCertSchema.parse(data);

        result = await sslManager.validateCertificate({
          domain: validatedValidate.domain,
          certificate: validatedValidate.certificate,
          privateKey: validatedValidate.privateKey,
          caBundle: validatedValidate.caBundle,
        });

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
    console.error('[SSL API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('does not match') || error.message.includes('Invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('expired')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * SSL API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/ssl?action=list
 * - GET  /api/ssl?action=expiring
 * - GET  /api/ssl?action=summary
 * - POST /api/ssl (action: issue/upload/renew/delete/validate)
 * 
 * Request Examples:
 * 
 * // List all certificates
 * GET /api/ssl?action=list
 * 
 * // Get expiring certificates
 * GET /api/ssl?action=expiring
 * 
 * // Get expiring summary
 * GET /api/ssl?action=summary
 * 
 * // Issue auto certificate
 * POST /api/ssl
 * {
 *   "action": "issue",
 *   "domain": "example.com",
 *   "type": "auto",
 *   "caProvider": "letsencrypt",
 *   "wildcard": false,
 *   "challengeType": "http",
 *   "autoRenew": true,
 *   "siteId": "abc123"
 * }
 * 
 * // Issue wildcard certificate
 * POST /api/ssl
 * {
 *   "action": "issue",
 *   "domain": "example.com",
 *   "type": "auto",
 *   "wildcard": true,
 *   "subdomains": ["www", "blog", "shop"],
 *   "challengeType": "dns",
 *   "dnsProvider": "cloudflare",
 *   "dnsCredentials": {
 *     "CF_Key": "your-api-key",
 *     "CF_Email": "your-email@example.com"
 *   },
 *   "autoRenew": true
 * }
 * 
 * // Upload custom certificate
 * POST /api/ssl
 * {
 *   "action": "upload",
 *   "domain": "example.com",
 *   "certificate": "-----BEGIN CERTIFICATE-----...",
 *   "privateKey": "-----BEGIN PRIVATE KEY-----...",
 *   "caBundle": "-----BEGIN CERTIFICATE-----...",
 *   "autoRenew": false,
 *   "siteId": "abc123"
 * }
 * 
 * // Renew certificate
 * POST /api/ssl
 * { "action": "renew", "certificateId": "cert123", "force": false }
 * 
 * // Delete certificate
 * POST /api/ssl
 * { "action": "delete", "certificateId": "cert123", "deleteFiles": true }
 * 
 * // Validate certificate before upload
 * POST /api/ssl
 * {
 *   "action": "validate",
 *   "domain": "example.com",
 *   "certificate": "-----BEGIN CERTIFICATE-----...",
 *   "privateKey": "-----BEGIN PRIVATE KEY-----...",
 *   "caBundle": "-----BEGIN CERTIFICATE-----..."
 * }
 * 
 * Security:
 * - Authentication required (NextAuth session)
 * - Certificate validation before upload
 * - Key/cert match verification
 * - Domain ownership verification
 * - Audit logging for all operations
 * - Rate limiting via middleware
 */