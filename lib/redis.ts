// =============================================================================
// wpPanel by Breach Rabbit — Redis Client Singleton
// =============================================================================
// Next.js 16.1 — App Router compatible
// Redis 7 + ioredis 5.x
// Features: Singleton pattern, connection pooling, health checks, key prefixes,
//           graceful shutdown, rate limiting support, BullMQ integration
// =============================================================================

import Redis, { RedisOptions } from 'ioredis';

// =============================================================================
// 🎯 TYPES
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

export interface RedisHealthCheck {
  healthy: boolean;
  responseTime?: number;
  version?: string;
  connectedClients?: number;
  usedMemory?: string;
  error?: string;
}

export interface RedisKeyPrefixes {
  session: string;
  cache: string;
  rateLimit: string;
  job: string;
  lock: string;
  temp: string;
}

// =============================================================================
// ⚙️ CONFIGURATION
// =============================================================================

/**
 * Redis configuration from environment variables
 */
const redisConfig: RedisOptions = {
  // ✅ Connection
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // ✅ Connection string override (takes precedence)
  ...(process.env.REDIS_URL ? { url: process.env.REDIS_URL } : {}),
  
  // ✅ Connection pooling
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    // Exponential backoff: 100ms → 200ms → 400ms → max 2s
    const delay = Math.min(times * 100, 2000);
    console.log(`[Redis] Retry attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  
  // ✅ Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // ✅ Keep-alive
  keepAlive: 30000,
  
  // ✅ Connection name (for monitoring)
  connectionName: 'wppanel:main',
  
  // ✅ Lazy connect (don't connect until first command)
  lazyConnect: true,
  
  // ✅ Auto-reconnect
  enableAutoPipelining: false,
  enableOfflineQueue: true,
  
  // ✅ TLS (for Redis Cloud / managed Redis)
  tls: process.env.REDIS_TLS === 'true' ? {
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
  } : undefined,
};

/**
 * Key prefixes for namespacing
 */
export const KEY_PREFIXES: RedisKeyPrefixes = {
  session: 'wppanel:session:',
  cache: 'wppanel:cache:',
  rateLimit: 'wppanel:ratelimit:',
  job: 'wppanel:job:',
  lock: 'wppanel:lock:',
  temp: 'wppanel:temp:',
};

/**
 * Default TTL values (seconds)
 */
export const TTL = {
  session: 7 * 24 * 60 * 60,        // 7 days
  cache: 60 * 60,                   // 1 hour
  rateLimit: 15 * 60,               // 15 minutes
  lock: 30,                         // 30 seconds
  temp: 10 * 60,                    // 10 minutes
  api: 5 * 60,                      // 5 minutes
  metrics: 60,                      // 1 minute
} as const;

// =============================================================================
// 🏗️ REDIS CLIENT INSTANCE
// =============================================================================

/**
 * Create Redis client with configuration
 */
function createRedisClient(): Redis {
  const client = new Redis(redisConfig);
  
  // ---------------------------------------------------------------------------
  // 📊 Connection Event Handlers
  // ---------------------------------------------------------------------------
  client.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });
  
  client.on('ready', () => {
    console.log('[Redis] Client ready');
  });
  
  client.on('close', () => {
    console.log('[Redis] Connection closed');
  });
  
  client.on('reconnecting', (delay: number) => {
    console.log(`[Redis] Reconnecting in ${delay}ms`);
  });
  
  client.on('error', (error) => {
    console.error('[Redis] Error:', error.message);
  });
  
  client.on('end', () => {
    console.log('[Redis] Connection ended');
  });
  
  // ---------------------------------------------------------------------------
  // 🔌 Connection Verification (non-blocking)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'development') {
    client.ping()
      .then(() => {
        console.log('[Redis] Ping successful');
      })
      .catch((error) => {
        console.warn('[Redis] Ping failed:', error.message);
      });
  }
  
  return client;
}

// =============================================================================
// 📦 SINGLETON EXPORT
// =============================================================================

/**
 * Global Redis client instance
 * 
 * Uses globalThis to prevent multiple instances during hot-reload
 * in development while maintaining singleton in production
 */
export const redis = globalThis.redis || createRedisClient();

// Store in global for HMR
if (process.env.NODE_ENV !== 'production') {
  globalThis.redis = redis;
}

// =============================================================================
// 🔧 UTILITY FUNCTIONS
// =============================================================================

/**
 * Connect to Redis (explicit connection)
 * 
 * Useful for health checks and ensuring connection before handling requests
 */
export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('[Redis] Explicit connection established');
  } catch (error) {
    console.error('[Redis] Explicit connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from Redis (graceful shutdown)
 * 
 * Call this during application shutdown to close connections properly
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    console.log('[Redis] Disconnected gracefully');
  } catch (error) {
    console.error('[Redis] Disconnect failed:', error);
    throw error;
  }
}

/**
 * Check Redis health
 * 
 * @returns Health check result with metrics
 */
export async function checkRedisHealth(): Promise<RedisHealthCheck> {
  const startTime = Date.now();
  
  try {
    // Ping test
    await redis.ping();
    
    // Get INFO for metrics
    const info = await redis.info('server');
    const clients = await redis.info('clients');
    const memory = await redis.info('memory');
    
    // Parse version
    const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    
    // Parse connected clients
    const clientsMatch = clients.match(/connected_clients:(\d+)/);
    const connectedClients = clientsMatch ? parseInt(clientsMatch[1], 10) : 0;
    
    // Parse used memory
    const memoryMatch = memory.match(/used_memory_human:([^\r\n]+)/);
    const usedMemory = memoryMatch ? memoryMatch[1] : 'unknown';
    
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime,
      version,
      connectedClients,
      usedMemory,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// 🔑 KEY MANAGEMENT
// =============================================================================

/**
 * Generate a prefixed cache key
 * 
 * @param type - Key type (session, cache, rateLimit, etc.)
 * @param identifier - Unique identifier
 * @returns Prefixed key string
 * 
 * @example
 * const key = generateKey('cache', 'user:123');
 * // Returns: 'wppanel:cache:user:123'
 */
export function generateKey(
  type: keyof RedisKeyPrefixes,
  identifier: string
): string {
  return `${KEY_PREFIXES[type]}${identifier}`;
}

/**
 * Delete keys by pattern
 * 
 * ⚠️ Use with caution — can be slow on large datasets
 * 
 * @param pattern - Key pattern (e.g., 'wppanel:cache:*')
 * @returns Number of deleted keys
 */
export async function deleteKeysByPattern(pattern: string): Promise<number> {
  const keys = await redis.keys(pattern);
  
  if (keys.length === 0) {
    return 0;
  }
  
  return await redis.del(...keys);
}

/**
 * Clear all wpPanel keys
 * 
 * ⚠️ DANGEROUS — only use in development or emergency
 */
export async function clearAllWpPanelKeys(): Promise<number> {
  return await deleteKeysByPattern('wppanel:*');
}

// =============================================================================
// 💾 CACHE HELPERS
// =============================================================================

/**
 * Get cached value with automatic deserialization
 * 
 * @param key - Cache key
 * @returns Deserialized value or null
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  
  if (!value) {
    return null;
  }
  
  try {
    return JSON.parse(value) as T;
  } catch {
    // Return as string if not JSON
    return value as unknown as T;
  }
}

/**
 * Set cached value with automatic serialization and TTL
 * 
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttlSeconds - Time to live in seconds (default: 1 hour)
 * @returns 'OK' if successful
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = TTL.cache
): Promise<'OK' | null> {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    return await redis.setex(key, ttlSeconds, serialized);
  } catch (error) {
    console.error('[Redis] setCache error:', error);
    return null;
  }
}

/**
 * Get or set cache (with fallback function)
 * 
 * @param key - Cache key
 * @param fallback - Function to fetch value if not cached
 * @param ttlSeconds - Time to live in seconds
 * @returns Cached or fetched value
 * 
 * @example
 * const user = await getOrSetCache(
 *   'user:123',
 *   async () => await prisma.user.findUnique({ where: { id: '123' } }),
 *   TTL.cache
 * );
 */
export async function getOrSetCache<T>(
  key: string,
  fallback: () => Promise<T>,
  ttlSeconds: number = TTL.cache
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key);
  
  if (cached !== null) {
    return cached;
  }
  
  // Fetch from fallback
  const value = await fallback();
  
  // Cache the result
  await setCache(key, value, ttlSeconds);
  
  return value;
}

/**
 * Delete cache key
 * 
 * @param key - Cache key
 * @returns Number of deleted keys (0 or 1)
 */
export async function deleteCache(key: string): Promise<number> {
  return await redis.del(key);
}

/**
 * Invalidate cache by pattern
 * 
 * @param pattern - Key pattern (e.g., 'wppanel:cache:user:*')
 * @returns Number of deleted keys
 */
export async function invalidateCache(pattern: string): Promise<number> {
  return await deleteKeysByPattern(pattern);
}

// =============================================================================
// 🔒 DISTRIBUTED LOCKS
// =============================================================================

/**
 * Acquire a distributed lock
 * 
 * @param key - Lock key
 * @param ttlSeconds - Lock TTL (default: 30 seconds)
 * @returns true if lock acquired, false otherwise
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = TTL.lock
): Promise<boolean> {
  const lockKey = generateKey('lock', key);
  const lockValue = `${process.pid}:${Date.now()}`;
  
  // SET with NX (only if not exists) and EX (expiry)
  const result = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
  
  return result === 'OK';
}

/**
 * Release a distributed lock
 * 
 * @param key - Lock key
 * @param lockValue - Lock value (to ensure we own the lock)
 * @returns true if lock released, false otherwise
 */
export async function releaseLock(
  key: string,
  lockValue: string
): Promise<boolean> {
  const lockKey = generateKey('lock', key);
  
  // Lua script to safely delete only if we own the lock
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  
  const result = await redis.eval(script, 1, lockKey, lockValue);
  
  return result === 1;
}

/**
 * Execute with distributed lock
 * 
 * @param key - Lock key
 * @param fn - Function to execute while holding lock
 * @param ttlSeconds - Lock TTL
 * @returns Function result
 * 
 * @example
 * await withLock('backup:site:123', async () => {
 *   await runBackup();
 * });
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = TTL.lock
): Promise<T> {
  const lockValue = `${process.pid}:${Date.now()}`;
  const lockKey = generateKey('lock', key);
  
  // Try to acquire lock
  const acquired = await redis.set(lockKey, lockValue, 'EX', ttlSeconds, 'NX');
  
  if (acquired !== 'OK') {
    throw new Error(`Failed to acquire lock: ${key}`);
  }
  
  try {
    return await fn();
  } finally {
    // Release lock (only if we still own it)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(script, 1, lockKey, lockValue);
  }
}

// =============================================================================
// 📊 RATE LIMITING HELPERS
// =============================================================================

/**
 * Increment rate limit counter
 * 
 * @param identifier - Unique identifier (IP, user ID, etc.)
 * @param action - Action type
 * @param ttlSeconds - TTL for the counter
 * @returns New count
 */
export async function incrementRateLimit(
  identifier: string,
  action: string = 'default',
  ttlSeconds: number = TTL.rateLimit
): Promise<number> {
  const key = generateKey('rateLimit', `${action}:${identifier}`);
  
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, ttlSeconds);
  }
  
  return count;
}

/**
 * Get rate limit counter
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 * @returns Current count
 */
export async function getRateLimitCount(
  identifier: string,
  action: string = 'default'
): Promise<number> {
  const key = generateKey('rateLimit', `${action}:${identifier}`);
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Reset rate limit counter
 * 
 * @param identifier - Unique identifier
 * @param action - Action type
 */
export async function resetRateLimit(
  identifier: string,
  action: string = 'default'
): Promise<void> {
  const key = generateKey('rateLimit', `${action}:${identifier}`);
  await redis.del(key);
}

// =============================================================================
// 🔄 GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Register graceful shutdown handlers
 * 
 * Ensures Redis connections are properly closed on process exit
 */
export function registerGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`[Redis] Received ${signal}, closing connections...`);
    
    try {
      await disconnectRedis();
      console.log('[Redis] Connections closed');
    } catch (error) {
      console.error('[Redis] Error during shutdown:', error);
    }
  };
  
  // Handle various shutdown signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
}

// =============================================================================
// 📈 MONITORING & METRICS
// =============================================================================

/**
 * Get Redis server statistics
 */
export async function getRedisStats(): Promise<{
  version: string;
  uptime: number;
  connectedClients: number;
  usedMemory: string;
  usedMemoryPeak: string;
  totalCommandsProcessed: number;
  keyspaceHits: number;
  keyspaceMisses: number;
  hitRate: number;
}> {
  const info = await redis.info();
  
  const parseInfo = (section: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    let inSection = false;
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        inSection = line === `# ${section}`;
        continue;
      }
      
      if (inSection && line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  };
  
  const server = parseInfo('Server');
  const clients = parseInfo('Clients');
  const memory = parseInfo('Memory');
  const stats = parseInfo('Stats');
  
  const keyspaceHits = parseInt(stats.keyspace_hits || '0', 10);
  const keyspaceMisses = parseInt(stats.keyspace_misses || '0', 10);
  const hitRate = keyspaceHits + keyspaceMisses > 0
    ? (keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100
    : 0;
  
  return {
    version: server.redis_version || 'unknown',
    uptime: parseInt(server.uptime_in_seconds || '0', 10),
    connectedClients: parseInt(clients.connected_clients || '0', 10),
    usedMemory: memory.used_memory_human || 'unknown',
    usedMemoryPeak: memory.used_memory_peak_human || 'unknown',
    totalCommandsProcessed: parseInt(stats.total_commands_processed || '0', 10),
    keyspaceHits,
    keyspaceMisses,
    hitRate,
  };
}

/**
 * Get keyspace information (database sizes)
 */
export async function getKeyspaceInfo(): Promise<Array<{
  db: number;
  keys: number;
  expires: number;
  avgTTL: number;
}>> {
  const info = await redis.info('keyspace');
  const lines = info.split('\r\n').filter(line => line.startsWith('db'));
  
  return lines.map((line) => {
    const [db, values] = line.split(':');
    const dbNum = parseInt(db.replace('db', ''), 10);
    const pairs = values.split(',');
    
    const result: Record<string, number> = {};
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      result[key] = parseInt(value, 10);
    }
    
    return {
      db: dbNum,
      keys: result.keys || 0,
      expires: result.expires || 0,
      avgTTL: result.avg_ttl || 0,
    };
  });
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Redis Client Architecture:
 * 
 * 1. Singleton Pattern:
 *    - Prevents multiple instances during Next.js HMR (dev)
 *    - Single instance in production for connection pooling
 *    - Uses globalThis for cross-module consistency
 * 
 * 2. Connection Configuration:
 *    - Host/port from environment variables
 *    - Password authentication (optional)
 *    - TLS support for managed Redis
 *    - Automatic reconnection with exponential backoff
 * 
 * 3. Key Namespacing:
 *    - All keys prefixed with 'wppanel:'
 *    - Sub-prefixes for different types (session, cache, rateLimit, etc.)
 *    - Prevents collisions with other applications
 * 
 * 4. Cache Helpers:
 *    - Automatic JSON serialization/deserialization
 *    - TTL management
 *    - getOrSetCache pattern for common use case
 * 
 * 5. Distributed Locks:
 *    - Redis SET with NX + EX for atomic lock acquisition
 *    - Lua script for safe lock release
 *    - withLock helper for automatic cleanup
 * 
 * 6. Rate Limiting:
 *    - INCR + EXPIRE for sliding window counters
 *    - Integration with rate-limiter.ts
 * 
 * 7. Monitoring:
 *    - Health check with ping
 *    - Server stats (memory, clients, commands)
 *    - Keyspace info (key counts per DB)
 * 
 * Usage Examples:
 * 
 * // Basic operations:
 * import { redis } from '@/lib/redis';
 * await redis.set('key', 'value');
 * const value = await redis.get('key');
 * 
 * // Cache helpers:
 * import { getCache, setCache, getOrSetCache } from '@/lib/redis';
 * await setCache('user:123', userData, TTL.cache);
 * const user = await getCache<User>('user:123');
 * const user = await getOrSetCache('user:123', () => fetchUser(), TTL.cache);
 * 
 * // Distributed locks:
 * import { acquireLock, releaseLock, withLock } from '@/lib/redis';
 * const acquired = await acquireLock('backup:site:123');
 * if (acquired) {
 *   try { await runBackup(); } finally { await releaseLock('backup:site:123', lockValue); }
 * }
 * 
 * // Or use withLock helper:
 * await withLock('backup:site:123', async () => { await runBackup(); });
 * 
 * // Rate limiting:
 * import { incrementRateLimit, getRateLimitCount } from '@/lib/redis';
 * const count = await incrementRateLimit(ip, 'login');
 * if (count > 5) { // block }
 * 
 * // Health check:
 * import { checkRedisHealth, getRedisStats } from '@/lib/redis';
 * const health = await checkRedisHealth();
 * const stats = await getRedisStats();
 * 
 * // Graceful shutdown:
 * import { registerGracefulShutdown } from '@/lib/redis';
 * registerGracefulShutdown();
 */