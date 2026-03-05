// =============================================================================
// wpPanel by Breach Rabbit — Root Layout
// =============================================================================
// Next.js 16.1 — App Router Root Layout
// Sets up providers, fonts, theme, and base HTML structure
// =============================================================================

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/lib/providers/theme';
import { QueryProvider } from '@/lib/providers/query';
import { SocketProvider } from '@/lib/providers/socket';
import { ToastProvider } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import './globals.css';

// =============================================================================
// 🎨 FONTS
// =============================================================================

/**
 * Inter Variable — Primary sans-serif font
 * Loaded with display:swap for optimal FCP
 * Single variable font file instead of multiple weights
 * Supports Latin + Cyrillic (for RU language)
 */
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  weight: 'variable',
});

/**
 * JetBrains Mono — Monospace font for code, terminal, logs
 * Loaded lazily for non-critical paths
 * Supports Latin + Cyrillic (for RU language)
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  display: 'swap',
  preload: false, // Lazy load for non-critical paths
  fallback: ['ui-monospace', 'monospace'],
  weight: 'variable',
});

// =============================================================================
// 📋 METADATA
// =============================================================================

export const metadata: Metadata = {
  title: {
    default: 'wpPanel by Breach Rabbit',
    template: '%s | wpPanel',
  },
  description: 'Modern server control panel for WordPress hosting built on OpenLiteSpeed',
  keywords: [
    'hosting panel',
    'WordPress',
    'OpenLiteSpeed',
    'server management',
    'VPS control panel',
    'Breach Rabbit',
  ],
  authors: [{ name: 'Breach Rabbit', url: 'https://github.com/breach-rabbit' }],
  creator: 'Breach Rabbit',
  publisher: 'Breach Rabbit',
  robots: {
    index: false, // Don't index panel pages
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'wpPanel',
  },
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'wpPanel by Breach Rabbit',
    description: 'Modern server control panel for WordPress hosting',
    type: 'website',
    locale: 'en_US',
    siteName: 'wpPanel',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'wpPanel by Breach Rabbit',
    description: 'Modern server control panel for WordPress hosting',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#080808' },
    { media: '(prefers-color-scheme: light)', color: '#f8f8f8' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on mobile for app-like feel
  userScalable: false, // Disable pinch zoom (optional, can be removed)
  viewportFit: 'cover', // For notched devices
};

// =============================================================================
// 🏗️ ROOT LAYOUT COMPONENT
// =============================================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, jetbrainsMono.variable)}
    >
      <head>
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Prevent FOUC (Flash of Unstyled Content) */}
        {/* Inline script runs before React hydrates to set correct theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Check localStorage first
                  const theme = localStorage.getItem('wppanel-theme') || 'system';
                  
                  // If system, check prefers-color-scheme
                  if (theme === 'system') {
                    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch (e) {
                  // Fallback to dark theme
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      
      <body
        className={cn(
          // Base styles
          'min-h-screen',
          'bg-bg-base',
          'text-text-primary',
          'font-sans',
          'antialiased',
          'selection:bg-accent-subtle selection:text-accent',
          
          // Font variables
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        {/* Providers */}
        {/* Order matters: Theme → Session → Query → Socket */}
        <ThemeProvider
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="wppanel-theme"
        >
          <SessionProvider>
            <ToastProvider defaultPosition="bottom-right">
              <QueryProvider>
                <SocketProvider>
                  {/* Main Content */}
                  {children}
                </SocketProvider>
              </QueryProvider>
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Root Layout Architecture — wpPanel by Breach Rabbit
 * 
 * 1. Fonts:
 *    - Inter Variable: Primary sans-serif (loaded with preload)
 *    - JetBrains Mono: Monospace for code/terminal (lazy loaded)
 *    - Both support Latin + Cyrillic (for RU language)
 *    - display:swap prevents FOIT (Flash of Invisible Text)
 * 
 * 2. Theme System:
 *    - SSR-safe theme switching (inline script in <head>)
 *    - Reads from localStorage ('wppanel-theme')
 *    - Falls back to system preference (prefers-color-scheme)
 *    - Sets data-theme attribute on <html>
 *    - CSS variables in globals.css handle color switching
 *    - No flash on load (script runs before render)
 * 
 * 3. Providers (nesting order matters):
 *    - ThemeProvider: Context for theme state + toggle
 *    - SessionProvider: NextAuth session context
 *    - QueryProvider: TanStack Query for data fetching
 *    - SocketProvider: Socket.io for real-time features
 *    - Toaster: Global toast notifications
 * 
 * 4. Performance Optimizations:
 *    - Font preload for Inter (critical path)
 *    - JetBrains Mono lazy loaded (only for code/terminal)
 *    - suppressHydrationWarning on <html> (theme attribute)
 *    - Minimal initial bundle (< 150KB target)
 *    - CSS-first theme switching (no JS for colors)
 * 
 * 5. Accessibility:
 *    - Proper lang attribute
 *    - Semantic HTML structure
 *    - Focus states via CSS (see globals.css)
 *    - Reduced motion support (via CSS media query)
 * 
 * 6. Mobile Optimization:
 *    - viewport-fit: cover for notched devices
 *    - theme-color meta for browser chrome
 *    - maximumScale: 1 for app-like feel
 *    - PWA manifest linked
 * 
 * 7. SEO:
 *    - robots: noindex (panel should not be indexed)
 *    - Proper metadata for social sharing
 *    - Open Graph tags
 *    - Twitter Card tags
 * 
 * 8. Security:
 *    - No external scripts except fonts
 *    - CORS headers on font loading
 *    - Content Security Policy (configure in next.config.ts)
 * 
 * Bundle Strategy:
 * - Initial: React, Next.js, Theme, Query, Socket providers (~60KB)
 * - Lazy: Monaco Editor, xterm.js, Recharts (only when needed)
 * - Target: < 150KB gzip for initial load
 * 
 * Dark/Light Theme:
 * - CSS variables in globals.css
 * - data-theme="dark" | "light" on <html>
 * - Automatic switching via prefers-color-scheme
 * - Manual override via ThemeProvider
 * - Persisted in localStorage
 */