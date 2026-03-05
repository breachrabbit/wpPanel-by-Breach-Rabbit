'use client';

// =============================================================================
// wpPanel by Breach Rabbit — NextAuth Provider
// =============================================================================
// Next.js 16.1 — Client Component (SessionProvider wrapper)
// NextAuth.js v5 (Auth.js) — JWT-based sessions
// Features: 2FA support, login attempt limiting, session tracking
// =============================================================================

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode, useMemo } from 'react';

// =============================================================================
// 🎯 TYPES
// =============================================================================

export interface SessionProviderProps {
  children: ReactNode;
  session?: any; // NextAuth session (optional, for SSR pre-fetching)
}

// =============================================================================
// 🏗️ PROVIDER COMPONENT
// =============================================================================

/**
 * NextAuth Session Provider Wrapper
 * 
 * Provides session context to all client components.
 * Must be wrapped around components that use useSession() hook.
 * 
 * @param children - React children
 * @param session - Optional pre-fetched session (for SSR)
 */
export function NextAuthProvider({ children, session }: SessionProviderProps) {
  // Memoize provider config to prevent unnecessary re-renders
  const providerConfig = useMemo(
    () => ({
      // ✅ Session management
      refetchInterval: 5 * 60, // Refresh session every 5 minutes
      refetchOnWindowFocus: true,
      refetchWhenOffline: false,
      
      // ✅ Client-side configuration
      basePath: '/api/auth', // API route base path
      signInUrl: '/login', // Redirect after sign out
      signOutUrl: '/login', // Redirect after sign out
    }),
    []
  );

  return (
    <NextAuthSessionProvider session={session} {...providerConfig}>
      {children}
    </NextAuthSessionProvider>
  );
}

// =============================================================================
// 🪝 HOOK WRAPPERS (Convenience)
// =============================================================================

/**
 * Get current session with loading state
 * 
 * Usage:
 * const { data: session, isLoading, isAuthenticated } = useAuth();
 */
export function useAuth() {
  const { data: session, status } = require('next-auth/react') as typeof import('next-auth/react');
  
  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
  };
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * NextAuth.js v5 Architecture:
 * 
 * 1. Server-side (lib/auth.ts):
 *    - Auth configuration (providers, callbacks, adapters)
 *    - Credentials validation (password + 2FA)
 *    - JWT token creation
 *    - Session database operations
 * 
 * 2. Client-side (this file):
 *    - SessionProvider wrapper
 *    - useSession() hook access
 *    - Client-side session refresh
 * 
 * 3. API Routes (app/api/auth/[...nextauth]/route.ts):
 *    - NextAuth handler
 *    - Endpoint for login/logout/refresh
 * 
 * Security Features:
 * - JWT tokens signed with NEXTAUTH_SECRET
 * - Session stored in encrypted cookie
 * - CSRF protection built-in
 * - Login attempt tracking (Redis)
 * - 2FA verification required
 * 
 * Session Flow:
 * 1. User submits credentials → /api/auth/login
 * 2. Server validates password (bcrypt)
 * 3. If 2FA enabled → require TOTP code
 * 4. Create JWT token with user info
 * 5. Set encrypted session cookie
 * 6. Client receives session via SessionProvider
 * 7. Subsequent requests include session cookie
 * 8. Server validates JWT on each API call
 * 
 * Performance:
 * - Session cached in React context (no repeated API calls)
 * - Refetch interval: 5 minutes (configurable)
 * - No session DB lookup on every request (JWT stateless)
 * 
 * Usage in Components:
 * 
 * // Client component:
 * import { useAuth } from '@/lib/providers/next-auth';
 * 
 * function UserProfile() {
 *   const { session, isLoading, isAuthenticated } = useAuth();
 *   
 *   if (isLoading) return <Spinner />;
 *   if (!isAuthenticated) return <LoginPrompt />;
 *   
 *   return <div>Welcome, {session.user.name}</div>;
 * }
 * 
 * // Server component (get session):
 * import { auth } from '@/lib/auth';
 * 
 * async function DashboardPage() {
 *   const session = await auth();
 *   if (!session) redirect('/login');
 *   // ...
 * }
 */