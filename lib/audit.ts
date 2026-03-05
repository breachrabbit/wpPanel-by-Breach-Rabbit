// =============================================================================
// wpPanel by Breach Rabbit — Audit Logging Utility
// =============================================================================
// Centralized audit logging for security, compliance, and debugging
// Features: All auth events, system changes, admin actions logged to PostgreSQL
//           IP tracking, user agent, metadata, async non-blocking writes
// =============================================================================

import { prisma } from '@/lib/prisma';
import { AuditAction, AuditLog } from '@prisma/client';
import { headers } from 'next/headers';

// =============================================================================
// 🎯 TYPES
// =============================================================================

export interface AuditLogInput {
  /** User ID (if authenticated) */
  userId?: string;
  
  /** Action type */
  action: AuditAction;
  
  /** Resource type (e.g., "user", "site", "database", "backup") */
  resource: string;
  
  /** Resource ID (if applicable) */
  resourceId?: string;
  
  /** IP address */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Old value (for UPDATE actions) */
  oldValue?: any;
  
  /** New value (for CREATE/UPDATE actions) */
  newValue?: any;
  
  /** Additional metadata */
  metadata?: any;
}

export interface AuditLogFilters {
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by action type */
  action?: AuditAction;
  
  /** Filter by resource type */
  resource?: string;
  
  /** Filter by resource ID */
  resourceId?: string;
  
  /** Filter by IP address */
  ipAddress?: string;
  
  /** Date range */
  startDate?: Date;
  endDate?: Date;
  
  /** Pagination */
  page?: number;
  limit?: number;
  
  /** Search in metadata */
  search?: string;
}

export interface AuditLogQueryResult {
  /** Audit log entries */
  logs: AuditLog[];
  
  /** Total count (for pagination) */
  total: number;
  
  /** Current page */
  page: number;
  
  /** Total pages */
  totalPages: number;
}

// =============================================================================
// 🔐 CORE FUNCTIONS
// =============================================================================

/**
 * Create an audit log entry
 * 
 * Non-blocking async write — failures are logged but don't throw
 * to avoid disrupting the main operation.
 * 
 * @param input - Audit log data
 * @returns Created audit log or null if failed
 * 
 * @example
 * await createAuditLog({
 *   action: 'LOGIN',
 *   resource: 'user',
 *   userId: user.id,
 *   ipAddress: request.ip,
 *   metadata: { email: user.email },
 * });
 */
export async function createAuditLog(input: AuditLogInput): Promise<AuditLog | null> {
  try {
    // Extract IP and user agent from headers if not provided
    let { ipAddress, userAgent } = input;
    
    if (!ipAddress || !userAgent) {
      try {
        const headersList = await headers();
        
        if (!ipAddress) {
          ipAddress = 
            headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            headersList.get('x-real-ip') ||
            'unknown';
        }
        
        if (!userAgent) {
          userAgent = headersList.get('user-agent') || 'unknown';
        }
      } catch {
        // headers() can only be called in certain contexts
        ipAddress = ipAddress || 'unknown';
        userAgent = userAgent || 'unknown';
      }
    }
    
    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        oldValue: input.oldValue ? sanitizeForStorage(input.oldValue) : null,
        newValue: input.newValue ? sanitizeForStorage(input.newValue) : null,
        metadata: input.metadata ? sanitizeForStorage(input.metadata) : null,
      },
    });
    
    // Log to console in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', input.action, input.resource, {
        userId: input.userId,
        ipAddress,
        metadata: input.metadata,
      });
    }
    
    return auditLog;
  } catch (error) {
    // Don't throw — audit logging should not break main operations
    console.error('Failed to create audit log:', error);
    return null;
  }
}

/**
 * Create multiple audit log entries (batch)
 * 
 * More efficient for operations that generate multiple log entries.
 * 
 * @param inputs - Array of audit log data
 * @returns Array of created audit logs (some may be null if failed)
 */
export async function createAuditLogs(inputs: AuditLogInput[]): Promise<(AuditLog | null)[]> {
  try {
    const results = await Promise.allSettled(
      inputs.map((input) => createAuditLog(input))
    );
    
    return results.map((result) => 
      result.status === 'fulfilled' ? result.value : null
    );
  } catch (error) {
    console.error('Failed to create batch audit logs:', error);
    return inputs.map(() => null);
  }
}

// =============================================================================
// 📊 QUERY FUNCTIONS
// =============================================================================

/**
 * Get audit logs with filters and pagination
 * 
 * @param filters - Query filters
 * @returns Paginated audit log results
 * 
 * @example
 * const { logs, total, page, totalPages } = await getAuditLogs({
 *   action: 'LOGIN',
 *   page: 1,
 *   limit: 50,
 * });
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogQueryResult> {
  try {
    const {
      userId,
      action,
      resource,
      resourceId,
      ipAddress,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      search,
    } = filters;
    
    // Build where clause
    const where: any = {};
    
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (resourceId) where.resourceId = resourceId;
    if (ipAddress) where.ipAddress = ipAddress;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    // Search in metadata (JSONB)
    if (search) {
      where.OR = [
        { metadata: { path: ['email'], string_contains: search } },
        { metadata: { path: ['reason'], string_contains: search } },
        { metadata: { path: ['action'], string_contains: search } },
      ];
    }
    
    // Get total count
    const total = await prisma.auditLog.count({ where });
    
    // Get paginated results
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
    
    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('Failed to query audit logs:', error);
    return {
      logs: [],
      total: 0,
      page: filters.page || 1,
      totalPages: 0,
    };
  }
}

/**
 * Get audit logs for a specific user
 * 
 * @param userId - User ID
 * @param limit - Max results (default: 100)
 * @returns Array of audit logs
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  try {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    console.error('Failed to get user audit logs:', error);
    return [];
  }
}

/**
 * Get audit logs for a specific resource
 * 
 * @param resource - Resource type (e.g., "site", "database")
 * @param resourceId - Resource ID
 * @param limit - Max results
 * @returns Array of audit logs
 */
export async function getResourceAuditLogs(
  resource: string,
  resourceId?: string,
  limit: number = 100
): Promise<AuditLog[]> {
  try {
    const where: any = { resource };
    if (resourceId) where.resourceId = resourceId;
    
    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch (error) {
    console.error('Failed to get resource audit logs:', error);
    return [];
  }
}

/**
 * Get recent security events (login attempts, permission denied, etc.)
 * 
 * @param limit - Max results (default: 50)
 * @returns Array of security-related audit logs
 */
export async function getSecurityEvents(limit: number = 50): Promise<AuditLog[]> {
  try {
    const securityActions: AuditAction[] = [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'PERMISSION_DENIED',
    ];
    
    return await prisma.auditLog.findMany({
      where: {
        action: {
          in: securityActions,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Failed to get security events:', error);
    return [];
  }
}

/**
 * Get failed login attempts by IP
 * 
 * @param limit - Max results (default: 100)
 * @returns Array of failed login audit logs grouped by IP
 */
export async function getFailedLoginsByIP(
  limit: number = 100
): Promise<Array<{ ipAddress: string; count: number; lastAttempt: Date }>> {
  try {
    // Note: This requires raw SQL for proper grouping
    const results = await prisma.$queryRaw`
      SELECT 
        "ipAddress",
        COUNT(*) as count,
        MAX("createdAt") as "lastAttempt"
      FROM "AuditLog"
      WHERE "action" = 'LOGIN_FAILED'
      GROUP BY "ipAddress"
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    
    return results as Array<{ ipAddress: string; count: number; lastAttempt: Date }>;
  } catch (error) {
    console.error('Failed to get failed logins by IP:', error);
    return [];
  }
}

// =============================================================================
// 🧹 MAINTENANCE FUNCTIONS
// =============================================================================

/**
 * Delete old audit logs (retention policy)
 * 
 * @param olderThan - Delete logs older than this date
 * @returns Number of deleted logs
 */
export async function deleteOldAuditLogs(olderThan: Date): Promise<number> {
  try {
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: olderThan,
        },
      },
    });
    
    console.log(`[AUDIT] Deleted ${result.count} audit logs older than ${olderThan}`);
    
    return result.count;
  } catch (error) {
    console.error('Failed to delete old audit logs:', error);
    return 0;
  }
}

/**
 * Export audit logs to JSON/CSV
 * 
 * @param filters - Query filters
 * @param format - Output format (json | csv)
 * @returns Formatted audit log data
 */
export async function exportAuditLogs(
  filters: AuditLogFilters = {},
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  try {
    const { logs } = await getAuditLogs({
      ...filters,
      limit: 10000, // Max export limit
    });
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    // CSV format
    const headers = [
      'ID',
      'Timestamp',
      'User',
      'Action',
      'Resource',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Metadata',
    ];
    
    const rows = logs.map((log) => [
      log.id,
      log.createdAt.toISOString(),
      log.user?.email || 'N/A',
      log.action,
      log.resource,
      log.resourceId || 'N/A',
      log.ipAddress,
      log.userAgent,
      JSON.stringify(log.metadata || {}),
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    
    return csv;
  } catch (error) {
    console.error('Failed to export audit logs:', error);
    return '';
  }
}

// =============================================================================
// 🔒 HELPER FUNCTIONS
// =============================================================================

/**
 * Sanitize data for storage (remove sensitive fields)
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
function sanitizeForStorage(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Create a copy to avoid mutating original
  const sanitized = { ...data };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'passwordHash',
    'secret',
    'token',
    'apiKey',
    'apiSecret',
    'privateKey',
    'twoFactorSecret',
    'backupCodes',
  ];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Get client IP from request
 * 
 * @param request - Request object or headers
 * @returns IP address string
 */
export function getClientIP(request?: Request | Headers): string {
  try {
    if (request instanceof Request) {
      return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
      );
    }
    
    if (request instanceof Headers) {
      return (
        request.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.get('x-real-ip') ||
        'unknown'
      );
    }
    
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

// =============================================================================
// 📝 CONVENIENCE WRAPPERS
// =============================================================================

/**
 * Log authentication event
 */
export async function logAuth(
  action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
  userId: string | undefined,
  metadata?: any
): Promise<AuditLog | null> {
  return createAuditLog({
    action,
    resource: 'auth',
    userId,
    metadata,
  });
}

/**
 * Log resource creation
 */
export async function logCreate(
  resource: string,
  resourceId: string,
  userId: string | undefined,
  newValue?: any
): Promise<AuditLog | null> {
  return createAuditLog({
    action: 'CREATE',
    resource,
    resourceId,
    userId,
    newValue,
  });
}

/**
 * Log resource update
 */
export async function logUpdate(
  resource: string,
  resourceId: string,
  userId: string | undefined,
  oldValue?: any,
  newValue?: any
): Promise<AuditLog | null> {
  return createAuditLog({
    action: 'UPDATE',
    resource,
    resourceId,
    userId,
    oldValue,
    newValue,
  });
}

/**
 * Log resource deletion
 */
export async function logDelete(
  resource: string,
  resourceId: string,
  userId: string | undefined,
  oldValue?: any
): Promise<AuditLog | null> {
  return createAuditLog({
    action: 'DELETE',
    resource,
    resourceId,
    userId,
    oldValue,
  });
}

/**
 * Log permission denied
 */
export async function logPermissionDenied(
  userId: string | undefined,
  reason: string,
  metadata?: any
): Promise<AuditLog | null> {
  return createAuditLog({
    action: 'PERMISSION_DENIED',
    resource: 'auth',
    userId,
    metadata: {
      reason,
      ...metadata,
    },
  });
}

/**
 * Log system change
 */
export async function logSystemChange(
  action: string,
  userId: string | undefined,
  metadata?: any
): Promise<AuditLog | null> {
  return createAuditLog({
    action: 'SYSTEM_CHANGE',
    resource: 'system',
    userId,
    metadata: {
      action,
      ...metadata,
    },
  });
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Audit Logging Architecture:
 * 
 * 1. What Gets Logged:
 *    - All authentication events (login, logout, failed attempts)
 *    - All CRUD operations on resources (sites, databases, backups, etc.)
 *    - Permission denied events
 *    - System configuration changes
 *    - Security-related events (2FA enable/disable, password changes)
 * 
 * 2. Data Stored:
 *    - User ID (if authenticated)
 *    - Action type (enum)
 *    - Resource type and ID
 *    - IP address
 *    - User agent
 *    - Old/new values (for updates)
 *    - Additional metadata (JSON)
 *    - Timestamp
 * 
 * 3. Security:
 *    - Sensitive fields are redacted (passwords, secrets, tokens)
 *    - Non-blocking writes (failures don't break main operations)
 *    - IP address extraction from multiple headers (X-Forwarded-For, X-Real-IP)
 *    - Development logging for debugging
 * 
 * 4. Retention:
 *    - Configurable retention policy (deleteOldAuditLogs)
 *    - Export functionality for compliance (JSON/CSV)
 *    - Pagination for large datasets
 * 
 * 5. Performance:
 *    - Async non-blocking writes
 *    - Batch operations supported
 *    - Indexed queries (userId, action, resource, createdAt)
 *    - Max export limit (10000 records)
 * 
 * Usage Examples:
 * 
 * // Basic logging:
 * await createAuditLog({
 *   action: 'LOGIN',
 *   resource: 'user',
 *   userId: user.id,
 *   ipAddress: '1.2.3.4',
 *   metadata: { email: user.email },
 * });
 * 
 * // Resource creation:
 * await logCreate('site', siteId, userId, { domain: 'example.com' });
 * 
 * // Resource update:
 * await logUpdate('site', siteId, userId, oldValue, newValue);
 * 
 * // Permission denied:
 * await logPermissionDenied(userId, 'ROLE_REQUIRED', { required: 'ADMIN' });
 * 
 * // Query logs:
 * const { logs, total, totalPages } = await getAuditLogs({
 *   action: 'LOGIN_FAILED',
 *   page: 1,
 *   limit: 50,
 * });
 * 
 * // Security events:
 * const securityEvents = await getSecurityEvents(50);
 * 
 * // Failed logins by IP:
 * const failedLogins = await getFailedLoginsByIP(100);
 * 
 * // Export for compliance:
 * const csv = await exportAuditLogs({ startDate, endDate }, 'csv');
 * 
 * // Cleanup old logs (90 days retention):
 * const deleted = await deleteOldAuditLogs(
 *   new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
 * );
 */