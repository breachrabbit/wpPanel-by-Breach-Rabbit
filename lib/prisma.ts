// =============================================================================
// wpPanel by Breach Rabbit — Prisma Client Singleton
// =============================================================================
// Next.js 16.1 — App Router compatible
// Prisma 5.x — PostgreSQL 16
// Features: Singleton pattern, connection pooling, query logging, health checks
// =============================================================================

import { PrismaClient } from '@prisma/client';

// =============================================================================
// 🎯 TYPES
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export interface PrismaQueryEvent {
  timestamp: Date;
  query: string;
  duration: number;
  target: string;
}

// =============================================================================
// ⚙️ CONFIGURATION
// =============================================================================

/**
 * Prisma client configuration
 */
const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  // ✅ Logging configuration (different for dev/prod)
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
  
  // ✅ Error handling
  errorFormat: 'pretty',
  
  // ✅ Datasource override (optional, for testing)
  datasources: process.env.DATABASE_URL 
    ? undefined 
    : { db: { url: 'postgresql://localhost:5432/wppanel' } },
};

// =============================================================================
// 🏗️ PRISMA CLIENT INSTANCE
// =============================================================================

/**
 * Create Prisma client with global singleton pattern
 * 
 * Prevents multiple instances in development (Next.js HMR)
 * while ensuring single instance in production
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient(prismaOptions);
  
  // ---------------------------------------------------------------------------
  // 📊 Query Logging (Development Only)
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e: PrismaQueryEvent) => {
      // Only log slow queries (>100ms) to avoid console spam
      if (e.duration > 100) {
        console.log(
          `[Prisma] Slow Query (${e.duration}ms):`,
          e.query.substring(0, 200) + (e.query.length > 200 ? '...' : '')
        );
      }
    });
    
    client.$on('info', (e) => {
      console.log('[Prisma] Info:', e.message);
    });
    
    client.$on('warn', (e) => {
      console.warn('[Prisma] Warning:', e.message);
    });
    
    client.$on('error', (e) => {
      console.error('[Prisma] Error:', e.message);
    });
  }
  
  // ---------------------------------------------------------------------------
  // 🔌 Connection Error Handling
  // ---------------------------------------------------------------------------
  client.$use(async (params, next) => {
    const before = Date.now();
    
    try {
      const result = await next(params);
      const after = Date.now();
      const duration = after - before;
      
      // Log slow queries in production (>500ms threshold)
      if (process.env.NODE_ENV === 'production' && duration > 500) {
        console.warn(
          `[Prisma] Slow query detected (${duration}ms):`,
          params.model,
          params.action
        );
      }
      
      return result;
    } catch (error) {
      // Enhance error with context
      const enhancedError = error instanceof Error ? error : new Error(String(error));
      
      console.error('[Prisma] Query failed:', {
        model: params.model,
        action: params.action,
        error: enhancedError.message,
      });
      
      throw enhancedError;
    }
  });
  
  return client;
}

// =============================================================================
// 📦 SINGLETON EXPORT
// =============================================================================

/**
 * Global Prisma client instance
 * 
 * Uses globalThis to prevent multiple instances during hot-reload
 * in development while maintaining singleton in production
 */
export const prisma = globalThis.prisma || createPrismaClient();

// Store in global for HMR
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// =============================================================================
// 🔧 UTILITY FUNCTIONS
// =============================================================================

/**
 * Connect to database (explicit connection)
 * 
 * Useful for health checks and ensuring connection before handling requests
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('[Prisma] Database connected successfully');
  } catch (error) {
    console.error('[Prisma] Database connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from database (graceful shutdown)
 * 
 * Call this during application shutdown to close connections properly
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('[Prisma] Database disconnected');
  } catch (error) {
    console.error('[Prisma] Database disconnect failed:', error);
    throw error;
  }
}

/**
 * Check database health
 * 
 * @returns true if database is reachable and responsive
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Run database migrations programmatically
 * 
 * ⚠️ Use with caution — typically handled by CLI
 * 
 * @example
 * await runMigrations();
 */
export async function runMigrations(): Promise<void> {
  try {
    // Note: This requires @prisma/client to be installed with migrations support
    // In production, prefer: npx prisma migrate deploy
    console.log('[Prisma] Migrations should be run via CLI: npx prisma migrate deploy');
  } catch (error) {
    console.error('[Prisma] Migration check failed:', error);
    throw error;
  }
}

/**
 * Transaction helper with retry logic
 * 
 * @param fn - Transaction function to execute
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Transaction result
 */
export async function withTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain errors
      if (
        lastError.message.includes('P2024') || // Connection timeout
        lastError.message.includes('P2028')    // Transaction timeout
      ) {
        console.warn(`[Prisma] Transaction failed (attempt ${attempt}/${maxRetries}):`, lastError.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
          continue;
        }
      }
      
      // Throw immediately for other errors
      throw lastError;
    }
  }
  
  throw lastError;
}

/**
 * Batch operations with chunking
 * 
 * Prevents memory issues with large datasets
 * 
 * @param items - Array of items to process
 * @param fn - Function to execute per chunk
 * @param chunkSize - Items per chunk (default: 100)
 */
export async function batchProcess<T, R>(
  items: T[],
  fn: (chunk: T[]) => Promise<R[]>,
  chunkSize: number = 100
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await fn(chunk);
    results.push(...chunkResults);
    
    // Small delay to prevent connection pool exhaustion
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return results;
}

// =============================================================================
// 🔄 GRACEFUL SHUTDOWN
// =============================================================================

/**
 * Register graceful shutdown handlers
 * 
 * Ensures database connections are properly closed on process exit
 */
export function registerGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`[Prisma] Received ${signal}, closing database connections...`);
    
    try {
      await disconnectDatabase();
      console.log('[Prisma] Database connections closed');
      process.exit(0);
    } catch (error) {
      console.error('[Prisma] Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  // Handle various shutdown signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGQUIT', () => shutdown('SIGQUIT'));
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('[Prisma] Uncaught exception:', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Prisma] Unhandled rejection at:', promise, 'reason:', reason);
  });
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Prisma Client Architecture:
 * 
 * 1. Singleton Pattern:
 *    - Prevents multiple instances during Next.js HMR (dev)
 *    - Single instance in production for connection pooling
 *    - Uses globalThis for cross-module consistency
 * 
 * 2. Connection Pooling:
 *    - Default: 10 connections (configured via DATABASE_URL)
 *    - Can be tuned: ?connection_limit=20
 *    - Monitor with checkDatabaseHealth()
 * 
 * 3. Query Logging:
 *    - Development: query, info, warn, error
 *    - Production: error only
 *    - Slow query detection (>100ms dev, >500ms prod)
 * 
 * 4. Error Handling:
 *    - $use middleware for query interception
 *    - Enhanced error messages with context
 *    - Retry logic for transactions
 * 
 * 5. Graceful Shutdown:
 *    - SIGINT, SIGTERM, SIGQUIT handlers
 *    - Proper $disconnect() on exit
 *    - Prevents connection leaks
 * 
 * Usage Examples:
 * 
 * // Basic query:
 * import { prisma } from '@/lib/prisma';
 * const users = await prisma.user.findMany();
 * 
 * // Transaction:
 * import { withTransaction } from '@/lib/prisma';
 * const result = await withTransaction(async (tx) => {
 *   const user = await tx.user.create({ data: {...} });
 *   const session = await tx.session.create({ data: {...} });
 *   return user;
 * });
 * 
 * // Health check:
 * import { checkDatabaseHealth } from '@/lib/prisma';
 * const { healthy, responseTime } = await checkDatabaseHealth();
 * 
 * // Graceful shutdown (in server entry point):
 * import { registerGracefulShutdown } from '@/lib/prisma';
 * registerGracefulShutdown();
 * 
 * Performance Tips:
 * - Use select to limit returned fields
 * - Use pagination (skip/take) for large datasets
 * - Use indexes on frequently queried fields
 * - Batch operations with batchProcess() for large arrays
 * - Monitor slow queries in development logs
 */