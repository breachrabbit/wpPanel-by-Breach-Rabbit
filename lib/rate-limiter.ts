// =============================================================================
// wpPanel by Breach Rabbit — Rate Limiter Utility
// =============================================================================
// Redis-based rate limiting for API endpoints and authentication
// Features: Sliding window, progressive delays, IP blocking, Fail2ban integration
// =============================================================================

import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';

// =============================================================================
// 🔐 CONFIGURATION
// =============================================================================

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  
  /** Maximum attempts allowed within window */
  maxAttempts: number;
  
  /** Block duration after exceeding limit (ms) */
  blockDurationMs?: number;
  
  /** Progressive delay multipliers (optional) */
  progressiveDelays?: number[];
}

export interface RateLimitResult {
  /** Request is allowed */
  success: boolean;
  
  /** Remaining attempts in current window */
  remaining: number;
  
  /** Total attempts in current window */
  total: number;
  
  /** Time until window resets (ms) */
  resetTime: number;
  
  /** Time until block is lifted (ms), if blocked */
  remainingTime?: number;
  
  /** Retry-After header value (seconds) */
  retryAfter?: number;
}

// =============================================================================
// ⚙️ DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * Login attempts — strictest limits
 */
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,      // 15 minutes
  maxAttempts: 5,                 // 5 attempts
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block
  progressiveDelays: [1000, 2000, 4000, 8000, 16000], // ms delays
};

/**
 * General API requests — more permissive
 */
export const API_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,           // 1 minute
  maxAttempts: 30,                // 30 requests
  blockDurationMs: 5 * 60 * 1000, // 5 minutes block
};

/**
 * File operations — moderate limits
 */
export const FILE_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,           // 1 minute
  maxAttempts: 20,                // 20 operations
  blockDurationMs: 2 * 60 * 1000, // 2 minutes block
};

/**
 * Backup operations — very permissive (long-running)
 */
export const BACKUP_RATE_LIMIT: RateLimitConfig = {
  windowMs: 5 * 60 * 1000,       // 5 minutes
  maxAttempts: 10,                // 10 operations
  blockDurationMs: 10 * 60 * 1000, // 10 minutes block
};

/**
 * Terminal sessions — per-session limits
 */
export const TERMINAL_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,           // 1 minute
  maxAttempts: 100,               // 100 commands
  blockDurationMs: 5 * 60 * 1000, // 5 minutes block
};

// =============================================================================
// 🔑 KEY GENERATION
// =============================================================================

/**
 * Rate limit key prefixes
 */
const KEY_PREFIXES = {
  ATTEMPTS: 'ratelimit:attempts:',
  BLOCKED: 'ratelimit:blocked:',
  DELAY: 'ratelimit:delay:',
} as const;

/**
 * Generate Redis key for attempt tracking
 */
function getAttemptsKey(identifier: string, action: string): string {
  return `${KEY_PREFIXES.ATTEMPTS}${action}:${identifier}`;
}

/**
 * Generate Redis key for block tracking
 */
function getBlockedKey(identifier: string, action: string): string {
  return `${KEY_PREFIXES.BLOCKED}${action}:${identifier}`;
}

/**
 * Generate Redis key for progressive delay tracking
 */
function getDelayKey(identifier: string, action: string): string {
  return `${KEY_PREFIXES.DELAY}${action}:${identifier}`;
}

// =============================================================================
// 🎯 CORE RATE LIMITING
// =============================================================================

/**
 * Check rate limit for an identifier (IP, user ID, etc.)
 * 
 * Uses sliding window counter algorithm with Redis.
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param action - Action type (login, api, file, etc.)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  action: string = 'default',
  config: RateLimitConfig = API_RATE_LIMIT
): Promise<RateLimitResult> {
  const attemptsKey = getAttemptsKey(identifier, action);
  const blockedKey = getBlockedKey(identifier, action);
  
  // ---------------------------------------------------------------------------
  // 1. Check if identifier is currently blocked
  // ---------------------------------------------------------------------------
  const blockedTTL = await redis.ttl(blockedKey);
  
  if (blockedTTL > 0) {
    // Currently blocked
    return {
      success: false,
      remaining: 0,
      total: config.maxAttempts,
      resetTime: config.windowMs,
      remainingTime: blockedTTL * 1000,
      retryAfter: Math.ceil(blockedTTL),
    };
  }
  
  // ---------------------------------------------------------------------------
  // 2. Get current attempt count
  // ---------------------------------------------------------------------------
  const currentAttempts = await redis.get(attemptsKey);
  const attemptCount = currentAttempts ? parseInt(currentAttempts, 10) : 0;
  
  // ---------------------------------------------------------------------------
  // 3. Check if limit exceeded
  // ---------------------------------------------------------------------------
  if (attemptCount >= config.maxAttempts) {
    // Apply block
    if (config.blockDurationMs) {
      await redis.setex(
        blockedKey,
        Math.floor(config.blockDurationMs / 1000),
        '1'
      );
      
      // Log the block event
      await createAuditLog({
        action: 'PERMISSION_DENIED',
        resource: 'rate_limit',
        ipAddress: identifier !== 'unknown' ? identifier : undefined,
        metadata: {
          action,
          reason: 'RATE_LIMIT_EXCEEDED',
          attempts: attemptCount,
          blockDuration: config.blockDurationMs,
        },
      });
    }
    
    return {
      success: false,
      remaining: 0,
      total: config.maxAttempts,
      resetTime: config.windowMs,
      remainingTime: config.blockDurationMs,
      retryAfter: Math.floor((config.blockDurationMs || 60000) / 1000),
    };
  }
  
  // ---------------------------------------------------------------------------
  // 4. Increment attempt counter
  // ---------------------------------------------------------------------------
  const newCount = await redis.incr(attemptsKey);
  
  // Set TTL on first attempt
  if (newCount === 1) {
    await redis.expire(attemptsKey, Math.floor(config.windowMs / 1000));
  }
  
  // ---------------------------------------------------------------------------
  // 5. Calculate remaining time until reset
  // ---------------------------------------------------------------------------
  const attemptsTTL = await redis.ttl(attemptsKey);
  const resetTime = attemptsTTL > 0 ? attemptsTTL * 1000 : config.windowMs;
  
  // ---------------------------------------------------------------------------
  // 6. Return result
  // ---------------------------------------------------------------------------
  return {
    success: true,
    remaining: Math.max(0, config.maxAttempts - newCount),
    total: newCount,
    resetTime,
    retryAfter: Math.ceil(resetTime / 1000),
  };
}

/**
 * Reset rate limit for an identifier
 * 
 * Use after successful authentication or action.
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 */
export async function resetRateLimit(
  identifier: string,
  action: string = 'default'
): Promise<void> {
  const attemptsKey = getAttemptsKey(identifier, action);
  const blockedKey = getBlockedKey(identifier, action);
  const delayKey = getDelayKey(identifier, action);
  
  await Promise.all([
    redis.del(attemptsKey),
    redis.del(blockedKey),
    redis.del(delayKey),
  ]);
}

/**
 * Get current attempt count for an identifier
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 * @returns Current attempt count
 */
export async function getAttemptCount(
  identifier: string,
  action: string = 'default'
): Promise<number> {
  const attemptsKey = getAttemptsKey(identifier, action);
  const count = await redis.get(attemptsKey);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Check if identifier is currently blocked
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 * @returns Block status and remaining time
 */
export async function isBlocked(
  identifier: string,
  action: string = 'default'
): Promise<{ blocked: boolean; remainingTime?: number }> {
  const blockedKey = getBlockedKey(identifier, action);
  const ttl = await redis.ttl(blockedKey);
  
  if (ttl > 0) {
    return {
      blocked: true,
      remainingTime: ttl * 1000,
    };
  }
  
  return { blocked: false };
}

/**
 * Manually block an identifier
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 * @param durationMs - Block duration in milliseconds
 */
export async function blockIdentifier(
  identifier: string,
  action: string = 'default',
  durationMs: number = 15 * 60 * 1000
): Promise<void> {
  const blockedKey = getBlockedKey(identifier, action);
  await redis.setex(blockedKey, Math.floor(durationMs / 1000), '1');
  
  await createAuditLog({
    action: 'PERMISSION_DENIED',
    resource: 'rate_limit',
    ipAddress: identifier !== 'unknown' ? identifier : undefined,
    metadata: {
      action,
      reason: 'MANUAL_BLOCK',
      duration: durationMs,
    },
  });
}

/**
 * Manually unblock an identifier
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 */
export async function unblockIdentifier(
  identifier: string,
  action: string = 'default'
): Promise<void> {
  const blockedKey = getBlockedKey(identifier, action);
  await redis.del(blockedKey);
  
  await createAuditLog({
    action: 'SYSTEM_CHANGE',
    resource: 'rate_limit',
    ipAddress: identifier !== 'unknown' ? identifier : undefined,
    metadata: {
      action,
      reason: 'MANUAL_UNBLOCK',
    },
  });
}

// =============================================================================
// ⏱️ PROGRESSIVE DELAYS
// =============================================================================

/**
 * Get progressive delay based on attempt count
 * 
 * Implements exponential backoff: 1s → 2s → 4s → 8s → 16s
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 * @param config - Rate limit config with progressiveDelays
 * @returns Delay in milliseconds
 */
export async function getProgressiveDelay(
  identifier: string,
  action: string = 'login',
  config: RateLimitConfig = LOGIN_RATE_LIMIT
): Promise<number> {
  const attemptCount = await getAttemptCount(identifier, action);
  
  if (!config.progressiveDelays || config.progressiveDelays.length === 0) {
    return 0;
  }
  
  // Get index based on attempt count (cap at max delay)
  const index = Math.min(attemptCount - 1, config.progressiveDelays.length - 1);
  
  return config.progressiveDelays[index] || 0;
}

/**
 * Apply progressive delay before allowing next attempt
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 * @param config - Rate limit config
 * @returns Applied delay in milliseconds
 */
export async function applyProgressiveDelay(
  identifier: string,
  action: string = 'login',
  config: RateLimitConfig = LOGIN_RATE_LIMIT
): Promise<number> {
  const delay = await getProgressiveDelay(identifier, action, config);
  
  if (delay > 0) {
    // Store delay info for logging/debugging
    const delayKey = getDelayKey(identifier, action);
    await redis.setex(delayKey, 60, delay.toString());
  }
  
  return delay;
}

// =============================================================================
// 📊 ADMIN FUNCTIONS
// =============================================================================

/**
 * Get all blocked identifiers for an action
 * 
 * @param action - Action type
 * @returns Array of blocked identifiers with TTL
 */
export async function getBlockedIdentifiers(
  action: string = 'login'
): Promise<Array<{ identifier: string; remainingTime: number }>> {
  const pattern = `${KEY_PREFIXES.BLOCKED}${action}:*`;
  const keys = await redis.keys(pattern);
  
  const results = await Promise.all(
    keys.map(async (key) => {
      const ttl = await redis.ttl(key);
      const identifier = key.replace(`${KEY_PREFIXES.BLOCKED}${action}:`, '');
      return {
        identifier,
        remainingTime: ttl > 0 ? ttl * 1000 : 0,
      };
    })
  );
  
  return results.filter((r) => r.remainingTime > 0);
}

/**
 * Get rate limit statistics
 * 
 * @param action - Action type
 * @returns Statistics object
 */
export async function getRateLimitStats(
  action: string = 'login'
): Promise<{
  totalBlocked: number;
  totalAttempts: number;
  topIdentifiers: Array<{ identifier: string; attempts: number }>;
}> {
  const blockedPattern = `${KEY_PREFIXES.BLOCKED}${action}:*`;
  const attemptsPattern = `${KEY_PREFIXES.ATTEMPTS}${action}:*`;
  
  const [blockedKeys, attemptsKeys] = await Promise.all([
    redis.keys(blockedPattern),
    redis.keys(attemptsPattern),
  ]);
  
  // Get attempt counts for top identifiers
  const attemptsWithCounts = await Promise.all(
    attemptsKeys.map(async (key) => {
      const count = await redis.get(key);
      const identifier = key.replace(`${KEY_PREFIXES.ATTEMPTS}${action}:`, '');
      return {
        identifier,
        attempts: count ? parseInt(count, 10) : 0,
      };
    })
  );
  
  // Sort by attempts and get top 10
  const topIdentifiers = attemptsWithCounts
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 10);
  
  return {
    totalBlocked: blockedKeys.length,
    totalAttempts: attemptsKeys.length,
    topIdentifiers,
  };
}

/**
 * Clear all rate limit data for an action
 * 
 * ⚠️ Use with caution — removes all blocks and counters
 * 
 * @param action - Action type
 */
export async function clearRateLimitData(
  action: string = 'default'
): Promise<void> {
  const patterns = [
    `${KEY_PREFIXES.ATTEMPTS}${action}:*`,
    `${KEY_PREFIXES.BLOCKED}${action}:*`,
    `${KEY_PREFIXES.DELAY}${action}:*`,
  ];
  
  for (const pattern of patterns) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
  
  await createAuditLog({
    action: 'SYSTEM_CHANGE',
    resource: 'rate_limit',
    metadata: {
      action,
      reason: 'ADMIN_CLEAR',
    },
  });
}

// =============================================================================
// 🛡️ MIDDLEWARE HELPER
// =============================================================================

/**
 * Create Next.js middleware rate limit handler
 * 
 * Usage in API route:
 * const result = await rateLimiter.check(ip, 'api');
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, {
 *     status: 429,
 *     headers: {
 *       'X-RateLimit-Limit': config.maxAttempts.toString(),
 *       'X-RateLimit-Remaining': result.remaining.toString(),
 *       'X-RateLimit-Reset': result.resetTime.toString(),
 *       'Retry-After': result.retryAfter?.toString() || '60',
 *     },
 *   });
 * }
 */
export const rateLimiter = {
  check: checkRateLimit,
  reset: resetRateLimit,
  getAttemptCount,
  isBlocked,
  block: blockIdentifier,
  unblock: unblockIdentifier,
  getProgressiveDelay,
  applyProgressiveDelay,
  getBlockedIdentifiers,
  getStats: getRateLimitStats,
  clear: clearRateLimitData,
  
  // Pre-configured checkers
  checkLogin: (ip: string) => checkRateLimit(ip, 'login', LOGIN_RATE_LIMIT),
  checkAPI: (ip: string) => checkRateLimit(ip, 'api', API_RATE_LIMIT),
  checkFile: (ip: string) => checkRateLimit(ip, 'file', FILE_RATE_LIMIT),
  checkBackup: (ip: string) => checkRateLimit(ip, 'backup', BACKUP_RATE_LIMIT),
  checkTerminal: (ip: string) => checkRateLimit(ip, 'terminal', TERMINAL_RATE_LIMIT),
};

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Rate Limiting Architecture:
 * 
 * 1. Sliding Window Counter:
 *    - Redis INCR with TTL for automatic expiration
 *    - Accurate count within time window
 *    - Memory efficient (single key per identifier)
 * 
 * 2. Progressive Delays:
 *    - Exponential backoff: 1s → 2s → 4s → 8s → 16s
 *    - Makes brute-force attacks impractical
 *    - Applied before authentication check
 * 
 * 3. IP Blocking:
 *    - Automatic after max attempts exceeded
 *    - Configurable block duration
 *    - Manual block/unblock via admin panel
 * 
 * 4. Redis Keys:
 *    - ratelimit:attempts:{action}:{identifier} — attempt counter
 *    - ratelimit:blocked:{action}:{identifier} — block flag
 *    - ratelimit:delay:{action}:{identifier} — current delay
 * 
 * 5. Audit Logging:
 *    - All blocks logged to database
 *    - Manual unblocks tracked
 *    - Stats available for monitoring
 * 
 * Usage Examples:
 * 
 * // In API route:
 * import { rateLimiter, LOGIN_RATE_LIMIT } from '@/lib/rate-limiter';
 * 
 * export async function POST(request: Request) {
 *   const ip = request.ip || 'unknown';
 *   
 *   // Check rate limit
 *   const result = await rateLimiter.checkLogin(ip);
 *   
 *   if (!result.success) {
 *     return NextResponse.json(
 *       { error: 'Too many attempts', retryAfter: result.retryAfter },
 *       { 
 *         status: 429,
 *         headers: {
 *           'X-RateLimit-Limit': LOGIN_RATE_LIMIT.maxAttempts.toString(),
 *           'X-RateLimit-Remaining': result.remaining.toString(),
 *           'Retry-After': result.retryAfter?.toString() || '60',
 *         }
 *       }
 *     );
 *   }
 *   
 *   // Apply progressive delay
 *   const delay = await rateLimiter.applyProgressiveDelay(ip);
 *   if (delay > 0) {
 *     await new Promise(resolve => setTimeout(resolve, delay));
 *   }
 *   
 *   // ... proceed with authentication
 *   
 *   // On success, reset counter
 *   await rateLimiter.reset(ip, 'login');
 * }
 * 
 * // Admin panel — view blocked IPs:
 * const blocked = await rateLimiter.getBlockedIdentifiers('login');
 * const stats = await rateLimiter.getStats('login');
 * 
 * // Admin panel — unblock IP:
 * await rateLimiter.unblock('1.2.3.4', 'login');
 */