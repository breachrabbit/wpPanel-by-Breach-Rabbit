// =============================================================================
// wpPanel by Breach Rabbit — Auth.js (NextAuth) Configuration
// =============================================================================
// Next.js 16.1 — Auth.js v5 (NextAuth)
// Credentials provider, JWT sessions, 2FA support, rate limiting
// =============================================================================

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import * as OTPAuth from 'otpauth';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT';
  twoFactorEnabled: boolean;
  emailVerified: Date | null;
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CLIENT';
  twoFactorEnabled: boolean;
}

export interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 60 * 60 * 1000, // 1 hour
};

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').optional(),
});

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Check rate limit for login attempts
 */
async function checkRateLimit(ip: string, email: string): Promise<{
  allowed: boolean;
  remaining: number;
  blockedUntil?: number;
}> {
  const key = `login:attempts:${ip}:${email}`;
  
  try {
    const data = await redis.get(key);
    
    if (!data) {
      return { allowed: true, remaining: LOGIN_RATE_LIMIT.maxAttempts };
    }
    
    const attempt: LoginAttempt = JSON.parse(data);
    const now = Date.now();
    
    // Check if block has expired
    if (attempt.blockedUntil && now > attempt.blockedUntil) {
      await redis.del(key);
      return { allowed: true, remaining: LOGIN_RATE_LIMIT.maxAttempts };
    }
    
    // Check if still blocked
    if (attempt.blockedUntil && now < attempt.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        blockedUntil: attempt.blockedUntil,
      };
    }
    
    // Check if window has expired
    if (now - attempt.lastAttempt > LOGIN_RATE_LIMIT.windowMs) {
      await redis.del(key);
      return { allowed: true, remaining: LOGIN_RATE_LIMIT.maxAttempts };
    }
    
    // Check attempts count
    if (attempt.count >= LOGIN_RATE_LIMIT.maxAttempts) {
      const blockedUntil = now + LOGIN_RATE_LIMIT.blockDurationMs;
      await redis.setEx(
        key,
        Math.ceil(LOGIN_RATE_LIMIT.blockDurationMs / 1000),
        JSON.stringify({
          count: attempt.count,
          lastAttempt: now,
          blockedUntil,
        })
      );
      
      return {
        allowed: false,
        remaining: 0,
        blockedUntil,
      };
    }
    
    return {
      allowed: true,
      remaining: LOGIN_RATE_LIMIT.maxAttempts - attempt.count,
    };
  } catch (error) {
    console.error('[Auth] Rate limit check failed:', error);
    // Fail open - allow login but log error
    return { allowed: true, remaining: LOGIN_RATE_LIMIT.maxAttempts };
  }
}

/**
 * Record login attempt
 */
async function recordLoginAttempt(
  ip: string,
  email: string,
  success: boolean
): Promise<void> {
  const key = `login:attempts:${ip}:${email}`;
  
  try {
    if (success) {
      await redis.del(key);
      return;
    }
    
    const data = await redis.get(key);
    const now = Date.now();
    
    if (!data) {
      await redis.setEx(
        key,
        Math.ceil(LOGIN_RATE_LIMIT.windowMs / 1000),
        JSON.stringify({
          count: 1,
          lastAttempt: now,
        })
      );
    } else {
      const attempt: LoginAttempt = JSON.parse(data);
      
      // Reset if window expired
      if (now - attempt.lastAttempt > LOGIN_RATE_LIMIT.windowMs) {
        await redis.setEx(
          key,
          Math.ceil(LOGIN_RATE_LIMIT.windowMs / 1000),
          JSON.stringify({
            count: 1,
            lastAttempt: now,
          })
        );
      } else {
        const newCount = attempt.count + 1;
        let blockedUntil: number | undefined;
        
        // Progressive blocking
        if (newCount >= LOGIN_RATE_LIMIT.maxAttempts) {
          blockedUntil = now + LOGIN_RATE_LIMIT.blockDurationMs;
        }
        
        await redis.setEx(
          key,
          Math.ceil(LOGIN_RATE_LIMIT.windowMs / 1000),
          JSON.stringify({
            count: newCount,
            lastAttempt: now,
            blockedUntil,
          })
        );
      }
    }
  } catch (error) {
    console.error('[Auth] Failed to record login attempt:', error);
  }
}

/**
 * Verify TOTP code
 */
function verifyTOTP(secret: string, code: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      digits: 6,
      period: 30,
    });
    
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch (error) {
    console.error('[Auth] TOTP verification failed:', error);
    return false;
  }
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    codes.push(code);
  }
  
  return codes;
}

/**
 * Verify backup code
 */
export async function verifyBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { backupCodes: true },
    });
    
    if (!user?.backupCodes || !Array.isArray(user.backupCodes)) {
      return false;
    }
    
    const normalizedCode = code.toUpperCase().trim();
    const index = user.backupCodes.indexOf(normalizedCode);
    
    if (index === -1) {
      return false;
    }
    
    // Remove used code
    const newCodes = user.backupCodes.filter((_, i) => i !== index);
    await prisma.user.update({
      where: { id: userId },
      data: { backupCodes: newCodes },
    });
    
    return true;
  } catch (error) {
    console.error('[Auth] Backup code verification failed:', error);
    return false;
  }
}

// =============================================================================
// 🛣️ AUTH OPTIONS
// =============================================================================

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: '2FA Code', type: 'text' },
        backupCode: { label: 'Backup Code', type: 'text' },
      },
      
      async authorize(credentials, req) {
        const ip = req?.ip || 'unknown';
        
        // Validate input
        const validation = LoginSchema.safeParse(credentials);
        
        if (!validation.success) {
          const error = validation.error.errors[0]?.message || 'Invalid credentials';
          throw new Error(error);
        }
        
        const { email, password, totpCode, backupCode } = validation.data;
        
        // Check rate limit
        const rateLimit = await checkRateLimit(ip, email);
        
        if (!rateLimit.allowed) {
          const minutes = Math.ceil(
            (rateLimit.blockedUntil! - Date.now()) / 60000
          );
          throw new Error(
            `Too many login attempts. Please try again in ${minutes} minutes.`
          );
        }
        
        // Find user
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            backupCodes: true,
            emailVerified: true,
          },
        });
        
        if (!user) {
          await recordLoginAttempt(ip, email, false);
          throw new Error('Invalid email or password');
        }
        
        // Verify password
        const isValidPassword = await compare(password, user.passwordHash);
        
        if (!isValidPassword) {
          await recordLoginAttempt(ip, email, false);
          throw new Error('Invalid email or password');
        }
        
        // Check 2FA
        if (user.twoFactorEnabled) {
          // Try TOTP code first
          if (totpCode && user.twoFactorSecret) {
            const isValidTOTP = verifyTOTP(user.twoFactorSecret, totpCode);
            
            if (!isValidTOTP) {
              await recordLoginAttempt(ip, email, false);
              throw new Error('Invalid 2FA code');
            }
          }
          // Try backup code
          else if (backupCode && user.backupCodes) {
            const isValidBackup = await verifyBackupCode(user.id, backupCode);
            
            if (!isValidBackup) {
              await recordLoginAttempt(ip, email, false);
              throw new Error('Invalid backup code');
            }
          }
          // No 2FA code provided
          else {
            await recordLoginAttempt(ip, email, false);
            throw new Error('2FA code required');
          }
        }
        
        // Success - clear rate limit
        await recordLoginAttempt(ip, email, true);
        
        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        
        // Create session
        const session: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          twoFactorEnabled: user.twoFactorEnabled,
          emailVerified: user.emailVerified,
        };
        
        return session;
      },
    }),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update session every 24h
  },
  
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.twoFactorEnabled = user.twoFactorEnabled;
      }
      
      // Session update (e.g., profile change)
      if (trigger === 'update' && session) {
        return { ...token, ...session };
      }
      
      return token;
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'ADMIN' | 'CLIENT';
        session.user.twoFactorEnabled = token.twoFactorEnabled as boolean;
      }
      
      return session;
    },
  },
  
  events: {
    async signIn({ user }) {
      // Log successful sign in
      console.log('[Auth] User signed in:', user.email);
      
      // Create audit log
      try {
        const { createAuditLog } = await import('@/lib/audit');
        await createAuditLog({
          action: 'AUTH',
          resource: 'user_session',
          userId: user.id as string,
          metadata: {
            action: 'login_success',
            email: user.email,
          },
        });
      } catch (error) {
        console.error('[Auth] Failed to create audit log:', error);
      }
    },
    
    async signOut({ token }) {
      // Log sign out
      console.log('[Auth] User signed out:', token.email);
      
      // Create audit log
      try {
        const { createAuditLog } = await import('@/lib/audit');
        await createAuditLog({
          action: 'AUTH',
          resource: 'user_session',
          userId: token.id as string,
          metadata: {
            action: 'logout',
            email: token.email,
          },
        });
      } catch (error) {
        console.error('[Auth] Failed to create audit log:', error);
      }
    },
  },
  
  // Security settings
  secret: process.env.NEXTAUTH_SECRET,
  
  // Cookie settings
  cookies: {
    sessionToken: {
      name: 'auth-token',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  
  // Theme
  theme: {
    colorScheme: 'dark',
    logo: '/logo.svg',
  },
};

// =============================================================================
// 📦 NEXTAUTH v5 HANDLER
// =============================================================================

import NextAuth from 'next-auth';

const nextAuth = NextAuth(authOptions as any);

export const { GET, POST } = nextAuth.handlers;
export const auth = nextAuth.auth;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;