'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Login Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Secure login with 2FA support, rate limiting, and audit logging
// =============================================================================

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Toggle } from '@/components/ui/Toggle';
import { Server, Lock, Mail, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface LoginFormData {
  email: string;
  password: string;
  twoFactorCode?: string;
  remember: boolean;
}

interface LoginErrors {
  email?: string;
  password?: string;
  twoFactorCode?: string;
  general?: string;
}

// =============================================================================
// 🏗️ LOGIN PAGE COMPONENT
// =============================================================================

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    twoFactorCode: '',
    remember: false,
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  
  // Get callback URL from query params or default to dashboard
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const errorFromUrl = searchParams.get('error');

  // =============================================================================
  // 🔄 EFFECTS
  // =============================================================================

  // Handle URL errors (from NextAuth)
  useEffect(() => {
    if (errorFromUrl) {
      switch (errorFromUrl) {
        case 'CredentialsSignin':
          setErrors({ general: 'Invalid email or password' });
          break;
        case 'AccessDenied':
          setErrors({ general: 'Access denied. Please contact administrator.' });
          break;
        case 'Verification':
          setErrors({ general: 'Invalid 2FA code. Please try again.' });
          break;
        case 'SessionRequired':
          setErrors({ general: 'Please sign in to access this page.' });
          break;
        default:
          setErrors({ general: 'An error occurred. Please try again.' });
      }
    }
  }, [errorFromUrl]);

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const session = await fetch('/api/auth/session').then(r => r.json());
      if (session?.user) {
        router.push(callbackUrl);
      }
    };
    checkAuth();
  }, [router, callbackUrl]);

  // =============================================================================
  // 🔧 HANDLERS
  // =============================================================================

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // 2FA code validation (if shown)
    if (show2FA && !formData.twoFactorCode) {
      newErrors.twoFactorCode = '2FA code is required';
    } else if (show2FA && !/^\d{6}$/.test(formData.twoFactorCode)) {
      newErrors.twoFactorCode = 'Please enter a valid 6-digit code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    startTransition(async () => {
      try {
        setErrors({});
        
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          twoFactorCode: show2FA ? formData.twoFactorCode : undefined,
          remember: formData.remember,
          redirect: false,
        });

        if (result?.error) {
          // Check if 2FA is required
          if (result.error.includes('2FA required') || result.error.includes('twoFactorRequired')) {
            setShow2FA(true);
            setErrors({ general: 'Please enter your 2FA code' });
            return;
          }

          // Handle rate limiting
          if (result.error.includes('attempts')) {
            const match = result.error.match(/(\d+) attempt/);
            if (match) {
              setRemainingAttempts(parseInt(match[1], 10));
            }
          }

          setErrors({ general: result.error });
          return;
        }

        // Success — redirect
        router.push(callbackUrl);
        router.refresh();
      } catch (error) {
        console.error('Login error:', error);
        setErrors({
          general: 'An unexpected error occurred. Please try again.',
        });
      }
    });
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error on change
    if (errors[field as keyof LoginErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <div
      className={cn(
        // Base
        'min-h-screen',
        'bg-bg-base',
        
        // Center content
        'flex',
        'items-center',
        'justify-center',
        'p-4',
        
        // Background pattern (subtle)
        'relative',
        'overflow-hidden'
      )}
    >
      {/* Background decoration */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-br from-accent-subtle/20 via-transparent to-transparent',
          'pointer-events-none'
        )}
      />
      
      {/* Grid pattern */}
      <div
        className={cn(
          'absolute inset-0',
          'opacity-[0.02]',
          'pointer-events-none',
          'bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)]',
          'bg-[size:40px_40px]'
        )}
      />

      {/* Login Card */}
      <Card
        className={cn(
          'relative',
          'w-full',
          'max-w-md',
          'bg-bg-surface',
          'border border-border',
          'shadow-elevated',
          'animate-slide-up'
        )}
      >
        {/* Logo & Header */}
        <CardHeader className="text-center space-y-4 pb-6">
          {/* Logo */}
          <div
            className={cn(
              'mx-auto',
              'flex items-center justify-center',
              'w-14 h-14',
              'rounded-xl',
              'bg-accent',
              'shadow-glow-accent'
            )}
          >
            <Server className="w-7 h-7 text-white" aria-hidden="true" />
          </div>

          {/* Title */}
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-text-primary">
              Welcome to wpPanel
            </CardTitle>
            <p className="text-sm text-text-secondary">
              by Breach Rabbit
            </p>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* General Error Alert */}
            {errors.general && (
              <AlertBanner
                variant={
                  errors.general.includes('2FA') ? 'info' :
                  errors.general.includes('attempt') ? 'warning' :
                  'error'
                }
                message={errors.general}
                dismissible
                onDismiss={() => setErrors(prev => ({ ...prev, general: undefined }))}
                showIcon
              />
            )}

            {/* Remaining attempts warning */}
            {remainingAttempts !== null && remainingAttempts > 0 && (
              <AlertBanner
                variant="warning"
                message={`${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before temporary lockout`}
                dismissible
                onDismiss={() => setRemainingAttempts(null)}
                showIcon
              />
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className={cn(
                  'block text-sm font-medium',
                  errors.email ? 'text-error' : 'text-text-secondary'
                )}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2',
                    'w-4 h-4',
                    errors.email ? 'text-error' : 'text-text-muted'
                  )}
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  variant={errors.email ? 'error' : 'default'}
                  size="md"
                  leftIcon={<Mail className="w-4 h-4" />}
                  disabled={isPending}
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p
                  id="email-error"
                  className="text-xs text-error"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className={cn(
                  'block text-sm font-medium',
                  errors.password ? 'text-error' : 'text-text-secondary'
                )}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2',
                    'w-4 h-4',
                    errors.password ? 'text-error' : 'text-text-muted'
                  )}
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  variant={errors.password ? 'error' : 'default'}
                  size="md"
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        'flex items-center justify-center',
                        'text-text-muted hover:text-text-primary',
                        'transition-colors',
                        'focus:outline-none'
                      )}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                  disabled={isPending}
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="text-xs text-error"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

            {/* 2FA Code Field (shown when required) */}
            {show2FA && (
              <div
                className={cn(
                  'space-y-2',
                  'p-4',
                  'rounded-md',
                  'bg-accent-subtle',
                  'border border-accent-border',
                  'animate-slide-up'
                )}
              >
                <label
                  htmlFor="twoFactorCode"
                  className={cn(
                    'block text-sm font-medium',
                    errors.twoFactorCode ? 'text-error' : 'text-accent'
                  )}
                >
                  Two-Factor Authentication Code
                </label>
                <div className="relative">
                  <Input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={formData.twoFactorCode}
                    onChange={handleInputChange('twoFactorCode')}
                    variant={errors.twoFactorCode ? 'error' : 'default'}
                    size="md"
                    leftIcon={<Lock className="w-4 h-4" />}
                    disabled={isPending}
                    autoComplete="one-time-code"
                    aria-invalid={!!errors.twoFactorCode}
                    aria-describedby={
                      errors.twoFactorCode ? '2fa-error' : '2fa-help'
                    }
                  />
                </div>
                {errors.twoFactorCode ? (
                  <p
                    id="2fa-error"
                    className="text-xs text-error"
                    role="alert"
                  >
                    {errors.twoFactorCode}
                  </p>
                ) : (
                  <p
                    id="2fa-help"
                    className="text-xs text-text-muted"
                  >
                    Enter the 6-digit code from your authenticator app
                  </p>
                )}
              </div>
            )}

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <Toggle
                label="Remember me"
                checked={formData.remember}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, remember: checked }))
                }
                size="sm"
                disabled={isPending}
              />
              
              {/* Forgot password link (future feature) */}
              <button
                type="button"
                className={cn(
                  'text-sm',
                  'text-accent hover:text-accent-hover',
                  'transition-colors',
                  'focus:outline-none focus:underline'
                )}
                onClick={() => {
                  // TODO: Implement password reset flow
                  alert('Password reset coming soon!');
                }}
              >
                Forgot password?
              </button>
            </div>
          </CardContent>

          {/* Submit Button */}
          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isPending}
              leftIcon={isPending ? undefined : <Lock className="w-4 h-4" />}
              disabled={isPending}
            >
              {isPending ? 'Signing in...' : 'Sign In'}
            </Button>

            {/* Back to home link */}
            <button
              type="button"
              onClick={() => router.push('/')}
              className={cn(
                'flex items-center justify-center gap-2',
                'text-sm',
                'text-text-secondary hover:text-text-primary',
                'transition-colors',
                'focus:outline-none focus:underline'
              )}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              Back to home
            </button>
          </CardFooter>
        </form>

        {/* Footer */}
        <div
          className={cn(
            'px-6 pb-6',
            'pt-2',
            'border-t border-border',
            'text-center'
          )}
        >
          <p className="text-xs text-text-muted">
            Protected by 2FA & Fail2ban
          </p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a
              href="https://github.com/breach-rabbit/wppanel"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'text-xs',
                'text-text-secondary hover:text-accent',
                'transition-colors'
              )}
            >
              GitHub
            </a>
            <span className="text-text-muted">•</span>
            <a
              href="https://docs.wppanel.dev"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'text-xs',
                'text-text-secondary hover:text-accent',
                'transition-colors'
              )}
            >
              Documentation
            </a>
            <span className="text-text-muted">•</span>
            <span className="text-xs text-text-muted">
              v1.0.0
            </span>
          </div>
        </div>
      </Card>

      {/* Security notice */}
      <div
        className={cn(
          'fixed bottom-4 left-4',
          'hidden lg:flex',
          'items-center gap-2',
          'text-xs',
          'text-text-muted'
        )}
      >
        <CheckCircle className="w-3.5 h-3.5 text-success" aria-hidden="true" />
        <span>SSL Encrypted Connection</span>
      </div>
    </div>
  );
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Login Page Features:
 * 
 * 1. Security:
 *    - Email/password authentication via NextAuth.js
 *    - 2FA support (TOTP) — shown when required
 *    - Rate limiting display (remaining attempts)
 *    - Password visibility toggle
 *    - CSRF protection (NextAuth built-in)
 *    - Secure cookies (HttpOnly, Secure, SameSite)
 * 
 * 2. UX:
 *    - Form validation (client-side)
 *    - Error messages per field
 *    - General error alerts (dismissible)
 *    - Loading state on submit
 *    - Remember me option
 *    - Back to home link
 *    - Smooth animations (slide-up)
 * 
 * 3. Accessibility:
 *    - Proper labels (htmlFor)
 *    - aria-invalid for errors
 *    - aria-describedby for error messages
 *    - aria-label for icon buttons
 *    - role="alert" for error messages
 *    - Keyboard navigation
 *    - Focus management
 * 
 * 4. Responsive:
 *    - Mobile-first design
 *    - Card centered on all screens
 *    - Touch-friendly tap targets
 *    - Proper padding on mobile
 * 
 * 5. Theme:
 *    - Dark theme by default
 *    - Light theme support via CSS variables
 *    - No flash on load (SSR safe)
 * 
 * 6. Error Handling:
 *    - URL error params (from NextAuth)
 *    - Form validation errors
 *    - API errors (displayed in alert)
 *    - Rate limit warnings
 * 
 * 7. Future Enhancements:
 *    - Password reset flow
 *    - Social login (GitHub, Google)
 *    - Magic link login
 *    - Captcha after N failed attempts
 *    - IP geolocation display
 *    - Device fingerprinting
 * 
 * Performance:
 * - Client component (only where needed)
 * - useTransition for non-blocking submit
 * - Minimal bundle size
 * - No heavy dependencies
 * 
 * Integration:
 * - NextAuth.js credentials provider
 * - /api/auth/signin endpoint
 * - Redirects to callbackUrl after login
 * - Session check on mount
 */