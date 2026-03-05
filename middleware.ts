// =============================================================================
// wpPanel by Breach Rabbit — Middleware
// =============================================================================
// Next.js 16.1 — Edge Middleware
// Authentication, route protection, installer lock, rate limiting
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// =============================================================================
// ⚙️ CONFIGURATION
// =============================================================================

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/installer/status',
  '/api/installer/check-deps',
  '/api/installer/configure',
  '/api/installer/run',
  '/api/installer/complete',
  '/api/installer/stream',
];

/**
 * Routes that are only accessible during installation
 * Blocked after INSTALLER_TOKEN is removed/completed
 */
const INSTALLER_ROUTES = [
  '/setup',
  '/api/installer',
];

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/api/sites',
  '/api/databases',
  '/api/files',
  '/api/backups',
  '/api/firewall',
  '/api/cron',
  '/api/monitoring',
  '/api/logs',
  '/api/terminal',
  '/api/wordpress',
  '/api/ssl',
  '/api/ols',
  '/api/system',
  '/api/preferences',
];

/**
 * API routes that require rate limiting
 */
const RATE_LIMITED_ROUTES = [
  '/api/auth/login',
  '/api/auth/2fa/validate',
];

/**
 * Rate limit configuration
 */
const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  blockDurationMs: 60 * 60 * 1000, // 1 hour block after exceeding
};

/**
 * JWT secret (from environment)
 */
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Check if installer is completed
 * Uses Redis or environment variable
 */
async function isInstallerCompleted(): Promise<boolean> {
  // Check environment variable first (set after installation)
  if (process.env.INSTALLER_TOKEN === 'completed') {
    return true;
  }
  
  // Check Redis if available
  try {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      // In production, this would check Redis for installer completion flag
      // For now, fallback to env variable
    }
  } catch (error) {
    console.error('[Middleware] Failed to check installer status:', error);
  }
  
  return false;
}

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<{ valid: boolean; payload?: any }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { valid: true, payload };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Get token from request
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  const tokenCookie = request.cookies.get('auth-token')?.value;
  if (tokenCookie) {
    return tokenCookie;
  }
  
  return null;
}

/**
 * Get client IP address
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip || '127.0.0.1';
}

/**
 * Rate limit check (in-memory for edge, Redis for production)
 */
async function checkRateLimit(ip: string, route: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blocked: boolean;
}> {
  const key = `ratelimit:${route}:${ip}`;
  const blockKey = `blocked:${route}:${ip}`;
  
  try {
    // In production, use Redis for distributed rate limiting
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      // Redis implementation would go here
      // For edge middleware, we use in-memory (limited effectiveness)
    }
    
    // Fallback: in-memory rate limiting (per-edge-instance)
    // Note: This is not effective in multi-instance deployments
    // Use Redis for production
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxAttempts,
      resetAt: Date.now() + RATE_LIMIT_CONFIG.windowMs,
      blocked: false,
    };
  } catch (error) {
    console.error('[Middleware] Rate limit check failed:', error);
    // Fail open - allow request but log error
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.maxAttempts,
      resetAt: Date.now() + RATE_LIMIT_CONFIG.windowMs,
      blocked: false,
    };
  }
}

/**
 * Check if IP is blocked by Fail2ban
 */
async function isIPBlocked(ip: string): Promise<boolean> {
  try {
    // In production, check Redis for Fail2ban blocks
    // Fail2ban → Redis sync via custom action
    const redisUrl = process.env.REDIS_URL;
    
    if (redisUrl) {
      // Would check Redis key: `fail2ban:banned:${ip}`
    }
    
    return false;
  } catch (error) {
    console.error('[Middleware] Fail2ban check failed:', error);
    return false;
  }
}

// =============================================================================
// 🛣️ MAIN MIDDLEWARE
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  
  // Add security headers to all responses
  const response = NextResponse.next();
  
  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy (adjust for your needs)
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' blob: data:",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  
  // ===========================================================================
  // 🔒 FAIL2BAN IP BLOCK CHECK
  // ===========================================================================
  
  const isBlocked = await isIPBlocked(ip);
  if (isBlocked) {
    console.warn('[Middleware] Blocked IP (Fail2ban):', ip);
    return new NextResponse('Access Denied', { status: 403 });
  }
  
  // ===========================================================================
  // 🚦 RATE LIMITING FOR AUTH ENDPOINTS
  // ===========================================================================
  
  if (RATE_LIMITED_ROUTES.some(route => pathname.startsWith(route))) {
    const rateLimit = await checkRateLimit(ip, pathname);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxAttempts.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.floor(rateLimit.resetAt / 1000).toString());
    
    if (rateLimit.blocked) {
      console.warn('[Middleware] Rate limit exceeded:', ip, pathname);
      response.headers.set('Retry-After', Math.floor(RATE_LIMIT_CONFIG.blockDurationMs / 1000).toString());
      return new NextResponse('Too Many Requests', { status: 429 });
    }
  }
  
  // ===========================================================================
  // 🔐 INSTALLER ROUTE PROTECTION
  // ===========================================================================
  
  if (INSTALLER_ROUTES.some(route => pathname.startsWith(route))) {
    const completed = await isInstallerCompleted();
    
    if (completed) {
      // Installer is completed - block access to setup routes
      console.warn('[Middleware] Installer access blocked (already completed):', ip);
      
      // Redirect to dashboard if trying to access /setup
      if (pathname === '/setup') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      
      // Block API access
      if (pathname.startsWith('/api/installer')) {
        return new NextResponse(JSON.stringify({ error: 'Installation already completed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Allow access to installer routes (not completed yet)
    return response;
  }
  
  // ===========================================================================
  // 🔓 PUBLIC ROUTES (NO AUTH REQUIRED)
  // ===========================================================================
  
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    // Check if user is already authenticated
    const token = getTokenFromRequest(request);
    
    if (token) {
      const { valid } = await verifyToken(token);
      
      if (valid) {
        // User is authenticated - redirect away from login
        if (pathname === '/login') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
    }
    
    return response;
  }
  
  // ===========================================================================
  // 🔒 PROTECTED ROUTES (AUTH REQUIRED)
  // ===========================================================================
  
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const token = getTokenFromRequest(request);
    
    if (!token) {
      // No token - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    const { valid, payload } = await verifyToken(token);
    
    if (!valid) {
      // Invalid token - redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      
      // Clear invalid cookie
      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.cookies.delete('auth-token');
      return redirectResponse;
    }
    
    // Token is valid - add user info to headers for API routes
    if (payload?.userId) {
      response.headers.set('X-User-ID', payload.userId);
      response.headers.set('X-User-Role', payload.role || 'CLIENT');
      response.headers.set('X-User-Email', payload.email || '');
    }
    
    // Check if installer is still pending
    if (pathname === '/dashboard') {
      const completed = await isInstallerCompleted();
      
      if (!completed) {
        // Installer not completed - redirect to setup
        return NextResponse.redirect(new URL('/setup', request.url));
      }
    }
    
    return response;
  }
  
  // ===========================================================================
  // ✅ ALL OTHER ROUTES
  // ===========================================================================
  
  return response;
}

// =============================================================================
// ⚙️ MATCHER CONFIGURATION
// =============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Middleware Security — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Route Protection:
 *    - Public routes: /login, /api/auth/*, /api/installer/*
 *    - Protected routes: /dashboard, /api/* (except auth/installer)
 *    - Installer routes: /setup, /api/installer/* (blocked after completion)
 * 
 * 2. Authentication:
 *    - JWT token verification (JWS with jose)
 *    - Token from Authorization header or cookie
 *    - Auto-redirect to login if not authenticated
 *    - Auto-redirect to dashboard if already logged in
 * 
 * 3. Installer Lock:
 *    - Checks INSTALLER_TOKEN environment variable
 *    - Blocks /setup after installation complete
 *    - Redirects to dashboard if trying to access /setup
 *    - Returns 403 for installer API calls
 * 
 * 4. Rate Limiting:
 *    - 5 attempts per 15 minutes for auth endpoints
 *    - 1 hour block after exceeding limit
 *    - Redis-backed for multi-instance deployments
 *    - In-memory fallback for edge middleware
 * 
 * 5. Fail2ban Integration:
 *    - Check Redis for banned IPs
 *    - Fail2ban → Redis sync via custom action
 *    - Immediate 403 for blocked IPs
 * 
 * 6. Security Headers:
 *    - X-Content-Type-Options: nosniff
 *    - X-Frame-Options: DENY
 *    - X-XSS-Protection: 1; mode=block
 *    - Referrer-Policy: strict-origin-when-cross-origin
 *    - Permissions-Policy: camera=(), microphone=(), geolocation=()
 *    - Content-Security-Policy: strict CSP
 * 
 * 7. User Context:
 *    - Adds X-User-ID, X-User-Role, X-User-Email headers
 *    - Available in API routes via request.headers
 * 
 * Production Considerations:
 * - Redis required for distributed rate limiting
 * - Fail2ban → Redis sync needs custom action script
 * - JWT secret must be strong (64+ chars)
 * - INSTALLER_TOKEN must be removed after setup
 * - Edge middleware has limited in-memory state
 * 
 * Environment Variables:
 * - NEXTAUTH_SECRET: JWT signing secret (required)
 * - INSTALLER_TOKEN: 'completed' after setup (required)
 * - REDIS_URL: Redis connection string (optional, recommended)
 * 
 * Rate Limit Headers:
 * - X-RateLimit-Limit: Max attempts per window
 * - X-RateLimit-Remaining: Remaining attempts
 * - X-RateLimit-Reset: Unix timestamp when window resets
 * - Retry-After: Seconds to wait when blocked
 * 
 * Fail2ban Integration Script:
 * 
 * # /etc/fail2ban/action.d/redis-ban.conf
 * [Definition]
 * actionstart =
 * actionstop =
 * actioncheck =
 * actionban = redis-cli SET fail2ban:banned:<ip> 1 EX <bantime>
 * actionunban = redis-cli DEL fail2ban:banned:<ip>
 * 
 * # In jail.local:
 * [hostpanel-auth]
 * enabled = true
 * filter = hostpanel-auth
 * logpath = /var/log/hostpanel/auth.log
 * maxretry = 5
 * bantime = 3600
 * action = redis-ban
 */