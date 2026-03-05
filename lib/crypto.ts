// =============================================================================
// wpPanel by Breach Rabbit — Cryptography Utilities
// =============================================================================
// Secure cryptographic functions for authentication, 2FA, and data protection
// Features: bcrypt password hashing, TOTP (2FA), backup codes, QR generation
// =============================================================================

import bcrypt from 'bcryptjs';
import { TOTP } from 'otpauth';
import QRCode from 'qrcode';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';

// =============================================================================
// 🔐 CONSTANTS & CONFIGURATION
// =============================================================================

/**
 * Bcrypt salt rounds
 * Higher = more secure but slower
 * 12 is recommended balance for 2024+
 */
const BCRYPT_SALT_ROUNDS = 12;

/**
 * TOTP configuration (Google Authenticator compatible)
 */
const TOTP_CONFIG = {
  algorithm: 'SHA1',
  digits: 6,
  period: 30, // seconds
  window: 1, // Allow 1 step before/after for clock skew
} as const;

/**
 * Backup codes configuration
 */
const BACKUP_CODE_CONFIG = {
  count: 8,
  length: 8, // 8 characters per code
  charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // No I, O, 1, 0 (confusing)
} as const;

// =============================================================================
// 🔑 PASSWORD HASHING (bcrypt)
// =============================================================================

/**
 * Hash a password using bcrypt
 * 
 * @param password - Plain text password
 * @returns Hashed password string
 * 
 * @example
 * const hash = await hashPassword('mySecurePassword123');
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  const hash = await bcrypt.hash(password, salt);
  
  return hash;
}

/**
 * Verify a password against a hash
 * 
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param password - Plain text password to verify
 * @param hash - Bcrypt hash to compare against
 * @returns true if password matches, false otherwise
 * 
 * @example
 * const isValid = await verifyPassword('myPassword', hash);
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Check if a password hash needs rehashing
 * 
 * Bcrypt salt rounds may increase over time. This checks if the hash
 * was created with older/less secure settings.
 * 
 * @param hash - Existing bcrypt hash
 * @returns true if hash should be regenerated with current settings
 */
export function needsRehash(hash: string): boolean {
  try {
    const [version, rounds] = hash.split('$').slice(1, 3);
    const currentRounds = parseInt(rounds, 10);
    
    // Check if using old bcrypt version or fewer rounds
    if (version !== '2b' || currentRounds < BCRYPT_SALT_ROUNDS) {
      return true;
    }
    
    return false;
  } catch {
    return true; // If we can't parse, assume it needs rehashing
  }
}

// =============================================================================
// 🔐 TOTP (Two-Factor Authentication)
// =============================================================================

/**
 * Generate a new TOTP secret for a user
 * 
 * @param userEmail - User's email (used as account label)
 * @param issuer - Issuer name (e.g., "wpPanel")
 * @returns Object with secret, QR code URL, and manual entry key
 * 
 * @example
 * const { secret, otpauthUrl, manualEntryKey } = await generateTOTPSecret('admin@example.com');
 */
export async function generateTOTPSecret(
  userEmail: string,
  issuer: string = 'wpPanel'
): Promise<{
  secret: string;
  otpauthUrl: string;
  manualEntryKey: string;
}> {
  // Generate random 32-byte secret (256 bits)
  const secret = randomBytes(32).toString('base32');
  
  // Create OTPAuth URI for QR code
  const account = userEmail.replace(/[^a-zA-Z0-9.@_-]/g, '');
  const issuerEncoded = encodeURIComponent(issuer);
  
  const otpauthUrl = `otpauth://totp/${issuerEncoded}:${account}?secret=${secret}&issuer=${issuerEncoded}&algorithm=${TOTP_CONFIG.algorithm}&digits=${TOTP_CONFIG.digits}&period=${TOTP_CONFIG.period}`;
  
  // Manual entry key (formatted with spaces for readability)
  const manualEntryKey = secret.match(/.{1,4}/g)?.join(' ') || secret;
  
  return {
    secret,
    otpauthUrl,
    manualEntryKey,
  };
}

/**
 * Verify a TOTP code
 * 
 * @param code - 6-digit code from authenticator app
 * @param secret - User's TOTP secret
 * @param window - Number of steps to check before/after current (default: 1)
 * @returns true if code is valid, false otherwise
 * 
 * @example
 * const isValid = await verifyTOTP('123456', userSecret);
 */
export async function verifyTOTP(
  code: string,
  secret: string,
  window: number = TOTP_CONFIG.window
): Promise<boolean> {
  try {
    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return false;
    }
    
    const totp = new TOTP({
      secret: TOTP.Secret.fromBase32(secret),
      algorithm: TOTP_CONFIG.algorithm,
      digits: TOTP_CONFIG.digits,
      period: TOTP_CONFIG.period,
    });
    
    // Verify with window for clock skew tolerance
    const delta = totp.validate({ token: code, window });
    
    return delta !== null;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Generate a TOTP code (for testing/debugging)
 * 
 * ⚠️ NEVER expose this in production code
 * 
 * @param secret - TOTP secret
 * @returns Current valid 6-digit code
 */
export function generateTOTPCode(secret: string): string {
  const totp = new TOTP({
    secret: TOTP.Secret.fromBase32(secret),
    algorithm: TOTP_CONFIG.algorithm,
    digits: TOTP_CONFIG.digits,
    period: TOTP_CONFIG.period,
  });
  
  return totp.generate();
}

/**
 * Get remaining seconds until next TOTP code
 * 
 * @returns Seconds until code changes (0-30)
 */
export function getTOTPRemainingSeconds(): number {
  const now = Date.now();
  const period = TOTP_CONFIG.period * 1000;
  return Math.floor((period - (now % period)) / 1000);
}

// =============================================================================
// 🎫 BACKUP CODES
// =============================================================================

/**
 * Generate secure backup codes
 * 
 * @param count - Number of codes to generate (default: 8)
 * @returns Array of backup codes (plain text - show to user once!)
 * 
 * @example
 * const codes = await generateBackupCodes();
 * // ['A7K9M2P4', 'B3N8Q1R5', ...]
 */
export async function generateBackupCodes(
  count: number = BACKUP_CODE_CONFIG.count
): Promise<string[]> {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = generateRandomCode(BACKUP_CODE_CONFIG.length);
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hash a backup code for storage
 * 
 * @param code - Plain text backup code
 * @returns Hashed code for database storage
 */
export async function hashBackupCode(code: string): Promise<string> {
  // Normalize code (uppercase, remove spaces)
  const normalized = code.toUpperCase().replace(/\s/g, '');
  
  // Use SHA-256 with salt for backup codes (faster than bcrypt, one-time use)
  const salt = process.env.NEXTAUTH_SECRET || 'fallback-salt';
  const hash = createHash('sha256')
    .update(salt + normalized)
    .digest('hex');
  
  return hash;
}

/**
 * Verify a backup code against stored hashes
 * 
 * @param code - Plain text backup code from user
 * @param storedHashes - Array of hashed backup codes from database
 * @returns true if code matches any stored hash
 */
export async function verifyBackupCode(
  code: string,
  storedHashes: string[]
): Promise<boolean> {
  try {
    const normalized = code.toUpperCase().replace(/\s/g, '');
    const hash = await hashBackupCode(normalized);
    
    // Timing-safe comparison
    for (const storedHash of storedHashes) {
      if (timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash))) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Backup code verification error:', error);
    return false;
  }
}

/**
 * Generate a single random backup code
 */
function generateRandomCode(length: number): string {
  const bytes = randomBytes(length);
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const index = bytes[i] % BACKUP_CODE_CONFIG.charset.length;
    code += BACKUP_CODE_CONFIG.charset[index];
  }
  
  return code;
}

// =============================================================================
// 📱 QR CODE GENERATION
// =============================================================================

/**
 * Generate QR code as data URI for TOTP setup
 * 
 * @param otpauthUrl - otpauth:// URI from generateTOTPSecret
 * @param options - QR code options
 * @returns Data URI (data:image/png;base64,...) for display in img tag
 * 
 * @example
 * const qrCode = await generateQRCode(otpauthUrl);
 * <img src={qrCode} alt="Scan QR code" />
 */
export async function generateQRCode(
  otpauthUrl: string,
  options: {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  } = {}
): Promise<string> {
  const {
    width = 256,
    margin = 2,
    errorCorrectionLevel = 'M',
  } = options;
  
  try {
    const dataUri = await QRCode.toDataURL(otpauthUrl, {
      width,
      margin,
      errorCorrectionLevel,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    return dataUri;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as SVG string
 * 
 * Better for responsive designs and dark mode
 * 
 * @param otpauthUrl - otpauth:// URI
 * @returns SVG string
 */
export async function generateQRCodeSVG(
  otpauthUrl: string,
  options: {
    width?: number;
    margin?: number;
  } = {}
): Promise<string> {
  const { width = 256, margin = 2 } = options;
  
  try {
    const svg = await QRCode.toString(otpauthUrl, {
      type: 'svg',
      width,
      margin,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    
    return svg;
  } catch (error) {
    console.error('QR code SVG generation error:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

// =============================================================================
// 🔒 UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a secure random token
 * 
 * @param bytes - Number of random bytes (default: 32)
 * @returns Hex-encoded random string
 * 
 * @example
 * const token = generateSecureToken(); // 64 character hex string
 */
export function generateSecureToken(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Generate a secure random string (alphanumeric)
 * 
 * @param length - Length of string to generate
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Hash sensitive data for storage
 * 
 * @param data - Data to hash
 * @param salt - Optional salt (uses NEXTAUTH_SECRET if not provided)
 * @returns SHA-256 hash
 */
export function hashData(data: string, salt?: string): string {
  const secret = salt || process.env.NEXTAUTH_SECRET || 'fallback-salt';
  return createHash('sha256').update(secret + data).digest('hex');
}

/**
 * Timing-safe string comparison
 * 
 * Prevents timing attacks when comparing sensitive values
 * 
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    
    if (aBuffer.length !== bBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

/**
 * Mask a sensitive value for display
 * 
 * @param value - Value to mask (email, password, etc.)
 * @param visibleChars - Number of characters to show at start/end
 * @returns Masked string
 * 
 * @example
 * maskSensitiveValue('admin@example.com') // 'ad***@example.com'
 * maskSensitiveValue('mySecretPassword') // 'my***ord'
 */
export function maskSensitiveValue(
  value: string,
  visibleChars: number = 2
): string {
  if (!value || value.length <= visibleChars * 2) {
    return '*'.repeat(value.length);
  }
  
  const start = value.slice(0, visibleChars);
  const end = value.slice(-visibleChars);
  const middle = '*'.repeat(value.length - visibleChars * 2);
  
  return `${start}${middle}${end}`;
}

/**
 * Validate password strength
 * 
 * @param password - Password to validate
 * @returns Object with validation results
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number; // 0-4
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
  errors: string[];
} {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  
  const errors: string[] = [];
  
  if (!requirements.minLength) {
    errors.push('At least 8 characters');
  }
  if (!requirements.hasUppercase) {
    errors.push('One uppercase letter');
  }
  if (!requirements.hasLowercase) {
    errors.push('One lowercase letter');
  }
  if (!requirements.hasNumber) {
    errors.push('One number');
  }
  if (!requirements.hasSpecial) {
    errors.push('One special character');
  }
  
  const score = Object.values(requirements).filter(Boolean).length;
  
  return {
    valid: score >= 4 && password.length >= 8,
    score,
    requirements,
    errors,
  };
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Security Best Practices Implemented:
 * 
 * ✅ Password hashing — bcrypt with 12 salt rounds
 * ✅ Timing-safe comparisons — Prevents timing attacks
 * ✅ TOTP standard — RFC 6238 compliant (Google Authenticator)
 * ✅ Backup codes — Cryptographically random, hashed for storage
 * ✅ QR codes — Generated server-side, never exposed in logs
 * ✅ Secure tokens — crypto.randomBytes for all random generation
 * ✅ Password validation — Strength requirements enforced
 * ✅ Clock skew tolerance — ±1 period for TOTP verification
 * ✅ No sensitive data in errors — Generic error messages
 * ✅ Environment-based salting — Uses NEXTAUTH_SECRET
 * 
 * Dependencies:
 * - bcryptjs — Pure JS bcrypt (no native bindings)
 * - otpauth — TOTP/HOTP implementation
 * - qrcode — QR code generation
 * - crypto — Node.js built-in
 * 
 * Usage Examples:
 * 
 * // Password hashing:
 * const hash = await hashPassword('userPassword123');
 * const isValid = await verifyPassword('userPassword123', hash);
 * 
 * // 2FA setup:
 * const { secret, otpauthUrl } = await generateTOTPSecret('user@example.com');
 * const qrCode = await generateQRCode(otpauthUrl);
 * 
 * // 2FA verification:
 * const isValid = await verifyTOTP('123456', userSecret);
 * 
 * // Backup codes:
 * const codes = await generateBackupCodes(8);
 * const hashed = await Promise.all(codes.map(hashBackupCode));
 * const isValid = await verifyBackupCode('A7K9M2P4', storedHashes);
 * 
 * // Secure tokens:
 * const apiToken = generateSecureToken(32);
 * const resetToken = generateRandomString(64);
 */