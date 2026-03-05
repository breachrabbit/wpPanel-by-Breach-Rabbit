// =============================================================================
// wpPanel by Breach Rabbit — General Utilities
// =============================================================================
// Next.js 16.1 — TypeScript 5.3+
// Common helper functions used throughout the application
// Features: className merging, formatters, validators, general helpers
// =============================================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// =============================================================================
// 🎨 CLASSNAME UTILITIES
// =============================================================================

/**
 * Merge class names with Tailwind CSS conflict resolution
 * 
 * Uses clsx for conditional classes + tailwind-merge for conflict resolution
 * 
 * @param inputs - Class values (strings, objects, arrays, falsy values)
 * @returns Merged className string with Tailwind conflicts resolved
 * 
 * @example
 * cn('bg-red-500', 'bg-blue-500') // 'bg-blue-500'
 * cn('px-4', { 'px-6': isActive }) // conditional
 * cn(baseClass, props.className) // component className merging
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Merge class names conditionally
 * 
 * Alternative to cn() for more explicit conditional logic
 * 
 * @param classes - Object with class names as keys and conditions as values
 * @returns Merged className string
 * 
 * @example
 * conditionalClasses({
 *   'bg-red-500': isError,
 *   'bg-green-500': isSuccess,
 *   'bg-gray-500': !isError && !isSuccess,
 * })
 */
export function conditionalClasses(classes: Record<string, boolean>): string {
  return Object.entries(classes)
    .filter(([_, condition]) => condition)
    .map(([className]) => className)
    .join(' ');
}

// =============================================================================
// 📅 DATE & TIME FORMATTERS
// =============================================================================

/**
 * Format date to human-readable string
 * 
 * @param date - Date object, ISO string, or timestamp
 * @param options - Format options
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date()) // 'Dec 25, 2024'
 * formatDate(date, { showTime: true }) // 'Dec 25, 2024 14:30'
 */
export function formatDate(
  date: Date | string | number,
  options?: {
    showTime?: boolean;
    showSeconds?: boolean;
    relative?: boolean;
    timezone?: string;
  }
): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }
  
  // Relative time (e.g., "2 hours ago")
  if (options?.relative) {
    return formatRelativeTime(d);
  }
  
  const intlOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(options?.showTime && {
      hour: '2-digit',
      minute: '2-digit',
      ...(options?.showSeconds && { second: '2-digit' }),
    }),
    timeZone: options?.timezone || 'UTC',
  };
  
  return new Intl.DateTimeFormat('en-US', intlOptions).format(d);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 * 
 * @param date - Date object, ISO string, or timestamp
 * @returns Relative time string
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // '1 hour ago'
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format date to ISO string without milliseconds
 * 
 * @param date - Date object, ISO string, or timestamp
 * @returns ISO string without milliseconds
 */
export function formatISODate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Format duration in seconds to human-readable string
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(3661) // '1h 1m 1s'
 * formatDuration(3661, { verbose: true }) // '1 hour, 1 minute, 1 second'
 */
export function formatDuration(
  seconds: number,
  options?: {
    verbose?: boolean;
    maxUnits?: number;
  }
): string {
  const verbose = options?.verbose ?? false;
  const maxUnits = options?.maxUnits ?? 3;
  
  const years = Math.floor(seconds / (365 * 24 * 60 * 60));
  const months = Math.floor((seconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60));
  const days = Math.floor((seconds % (30 * 24 * 60 * 60)) / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = Math.floor(seconds % 60);
  
  const units = [
    { value: years, label: 'year', short: 'y' },
    { value: months, label: 'month', short: 'mo' },
    { value: days, label: 'day', short: 'd' },
    { value: hours, label: 'hour', short: 'h' },
    { value: minutes, label: 'minute', short: 'm' },
    { value: secs, label: 'second', short: 's' },
  ];
  
  const result = units
    .filter((unit) => unit.value > 0)
    .slice(0, maxUnits)
    .map((unit) => {
      if (verbose) {
        return `${unit.value} ${unit.label}${unit.value !== 1 ? 's' : ''}`;
      }
      return `${unit.value}${unit.short}`;
    });
  
  return result.join(verbose ? ', ' : ' ') || '0s';
}

/**
 * Format date to time ago with tooltip
 * 
 * @param date - Date object, ISO string, or timestamp
 * @returns Object with relative time and full date
 */
export function formatTimeAgo(date: Date | string | number): {
  relative: string;
  full: string;
  iso: string;
} {
  const d = new Date(date);
  return {
    relative: formatRelativeTime(d),
    full: formatDate(d, { showTime: true }),
    iso: d.toISOString(),
  };
}

// =============================================================================
// 💾 FILE SIZE FORMATTERS
// =============================================================================

/**
 * Format bytes to human-readable file size
 * 
 * @param bytes - Size in bytes
 * @param options - Format options
 * @returns Formatted file size string
 * 
 * @example
 * formatFileSize(1536) // '1.5 KB'
 * formatFileSize(1536, { decimals: 0 }) // '2 KB'
 * formatFileSize(1536, { binary: true }) // '1.5 KiB'
 */
export function formatFileSize(
  bytes: number | bigint,
  options?: {
    decimals?: number;
    binary?: boolean; // Use 1024 vs 1000
    showBytes?: boolean; // Show 'B' suffix
    threshold?: number; // When to show exact bytes
  }
): string {
  const numBytes = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  const decimals = options?.decimals ?? 2;
  const binary = options?.binary ?? true; // Default to binary (KiB, MiB)
  const showBytes = options?.showBytes ?? true;
  const threshold = options?.threshold ?? 1;
  
  if (numBytes < threshold) {
    return showBytes ? `${numBytes} B` : `${numBytes}`;
  }
  
  const base = binary ? 1024 : 1000;
  const units = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const exp = Math.floor(Math.log(numBytes) / Math.log(base));
  const value = numBytes / Math.pow(base, exp);
  
  return `${value.toFixed(decimals)} ${units[exp]}`;
}

/**
 * Parse file size string back to bytes
 * 
 * @param size - File size string (e.g., '1.5 GB', '500 MB')
 * @returns Size in bytes
 */
export function parseFileSize(size: string): number {
  const match = size.match(/^([\d.]+)\s*([KMGTPE]?i?B)?$/i);
  
  if (!match) {
    return 0;
  }
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1000,
    KIB: 1024,
    K: 1024,
    MB: 1000 * 1000,
    MIB: 1024 * 1024,
    M: 1024 * 1024,
    GB: 1000 * 1000 * 1000,
    GIB: 1024 * 1024 * 1024,
    G: 1024 * 1024 * 1024,
    TB: 1000 * 1000 * 1000 * 1000,
    TIB: 1024 * 1024 * 1024 * 1024,
    T: 1024 * 1024 * 1024 * 1024,
    PB: 1000 * 1000 * 1000 * 1000 * 1000,
    PIB: 1024 * 1024 * 1024 * 1024 * 1024,
    P: 1024 * 1024 * 1024 * 1024 * 1024,
  };
  
  return value * (multipliers[unit] || 1);
}

/**
 * Calculate percentage of used space
 * 
 * @param used - Used bytes
 * @param total - Total bytes
 * @returns Percentage (0-100)
 */
export function calculateUsagePercentage(
  used: number | bigint,
  total: number | bigint
): number {
  const numUsed = typeof used === 'bigint' ? Number(used) : used;
  const numTotal = typeof total === 'bigint' ? Number(total) : total;
  
  if (numTotal === 0) {
    return 0;
  }
  
  return Math.round((numUsed / numTotal) * 100);
}

// =============================================================================
// 🔢 NUMBER FORMATTERS
// =============================================================================

/**
 * Format number with thousand separators
 * 
 * @param num - Number to format
 * @param options - Format options
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234567) // '1,234,567'
 * formatNumber(1234.567, { decimals: 2 }) // '1,234.57'
 */
export function formatNumber(
  num: number,
  options?: {
    decimals?: number;
    locale?: string;
    compact?: boolean;
  }
): string {
  const decimals = options?.decimals;
  const locale = options?.locale || 'en-US';
  const compact = options?.compact ?? false;
  
  if (compact) {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: decimals ?? 1,
    }).format(num);
  }
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format number as percentage
 * 
 * @param value - Value (0-1 or 0-100)
 * @param options - Format options
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(0.75) // '75%'
 * formatPercentage(75, { isDecimal: false }) // '75%'
 */
export function formatPercentage(
  value: number,
  options?: {
    decimals?: number;
    isDecimal?: boolean; // If true, multiply by 100
  }
): string {
  const decimals = options?.decimals ?? 0;
  const isDecimal = options?.isDecimal ?? true;
  
  const percent = isDecimal ? value * 100 : value;
  
  return `${percent.toFixed(decimals)}%`;
}

/**
 * Format number with currency symbol
 * 
 * @param amount - Amount in cents/smallest unit
 * @param currency - Currency code (USD, EUR, etc.)
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options?: {
    locale?: string;
    showSymbol?: boolean;
  }
): string {
  const locale = options?.locale || 'en-US';
  const showSymbol = options?.showSymbol ?? true;
  
  return new Intl.NumberFormat(locale, {
    style: showSymbol ? 'currency' : 'decimal',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with abbreviation (K, M, B)
 * 
 * @param num - Number to abbreviate
 * @returns Abbreviated number string
 * 
 * @example
 * formatAbbreviatedNumber(1500) // '1.5K'
 * formatAbbreviatedNumber(1500000) // '1.5M'
 */
export function formatAbbreviatedNumber(num: number): string {
  if (num >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  }
  if (num >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  }
  if (num >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }
  return num.toString();
}

// =============================================================================
// 🌐 URL & STRING UTILITIES
// =============================================================================

/**
 * Sanitize URL for display
 * 
 * @param url - URL to sanitize
 * @returns Sanitized URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}

/**
 * Get domain from URL
 * 
 * @param url - Full URL
 * @returns Domain name
 */
export function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/**
 * Truncate string with ellipsis
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Truncate string in the middle (for hashes, emails, etc.)
 * 
 * @param str - String to truncate
 * @param startLength - Characters to show at start
 * @param endLength - Characters to show at end
 * @returns Truncated string
 * 
 * @example
 * truncateMiddle('abcdefghijklmnopqrstuvwxyz', 5, 5) // 'abcde...vwxyz'
 */
export function truncateMiddle(
  str: string,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (str.length <= startLength + endLength) {
    return str;
  }
  return `${str.slice(0, startLength)}...${str.slice(-endLength)}`;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Convert string to slug (URL-friendly)
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Generate random string
 */
export function generateRandomString(
  length: number = 16,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  return Array.from(array)
    .map((byte) => charset[byte % charset.length])
    .join('');
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// ✅ VALIDATION UTILITIES
// =============================================================================

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate domain name format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  return domainRegex.test(domain);
}

/**
 * Validate IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Validate port number
 */
export function isValidPort(port: number | string): boolean {
  const num = typeof port === 'string' ? parseInt(port, 10) : port;
  return !isNaN(num) && num >= 1 && num <= 65535;
}

/**
 * Validate cron expression (basic validation)
 */
export function isValidCron(expression: string): boolean {
  const cronRegex = /^(\*|([0-9]|10-59)\/[0-9]+|([0-9]|10-59)(,([0-9]|10-59))*|([0-9]|10-59)-([0-9]|10-59)|\?)(\s+(\*|([0-9]|10-59)\/[0-9]+|([0-9]|10-59)(,([0-9]|10-59))*|([0-9]|10-59)-([0-9]|10-59)|\?)){4}$/;
  return cronRegex.test(expression.trim());
}

// =============================================================================
// 🎯 STATUS & STATE UTILITIES
// =============================================================================

/**
 * Get status color based on status string
 */
export function getStatusColor(
  status: string
): {
  bg: string;
  text: string;
  border: string;
} {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'online':
    case 'active':
    case 'running':
    case 'healthy':
    case 'completed':
    case 'success':
      return {
        bg: 'var(--color-success-subtle)',
        text: 'var(--color-success)',
        border: 'var(--color-success)',
      };
    
    case 'offline':
    case 'inactive':
    case 'stopped':
    case 'error':
    case 'failed':
      return {
        bg: 'var(--color-error-subtle)',
        text: 'var(--color-error)',
        border: 'var(--color-error)',
      };
    
    case 'warning':
    case 'expiring':
    case 'degraded':
      return {
        bg: 'var(--color-warning-subtle)',
        text: 'var(--color-warning)',
        border: 'var(--color-warning)',
      };
    
    case 'pending':
    case 'processing':
    case 'running':
      return {
        bg: 'var(--color-info-subtle)',
        text: 'var(--color-info)',
        border: 'var(--color-info)',
      };
    
    default:
      return {
        bg: 'var(--color-bg-overlay)',
        text: 'var(--color-text-secondary)',
        border: 'var(--color-border)',
      };
  }
}

/**
 * Get status icon based on status string
 */
export function getStatusIcon(status: string): string {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'online':
    case 'active':
    case 'running':
    case 'healthy':
      return '✓';
    case 'offline':
    case 'inactive':
    case 'stopped':
      return '✗';
    case 'warning':
    case 'expiring':
      return '⚠';
    case 'pending':
    case 'processing':
      return '⟳';
    default:
      return '•';
  }
}

/**
 * Calculate health score based on metrics
 */
export function calculateHealthScore(metrics: {
  cpuUsage: number;
  ramUsage: number;
  diskUsage: number;
}): number {
  const weights = {
    cpu: 0.3,
    ram: 0.3,
    disk: 0.4,
  };
  
  const cpuScore = Math.max(0, 100 - metrics.cpuUsage);
  const ramScore = Math.max(0, 100 - metrics.ramUsage);
  const diskScore = Math.max(0, 100 - metrics.diskUsage);
  
  const score =
    cpuScore * weights.cpu + ramScore * weights.ram + diskScore * weights.disk;
  
  return Math.round(score);
}

/**
 * Get health status based on score
 */
export function getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

// =============================================================================
// 📊 DATA UTILITIES
// =============================================================================

/**
 * Group array by key
 */
export function groupBy<T>(
  array: T[],
  key: keyof T | ((item: T) => string)
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by key
 */
export function sortBy<T>(
  array: T[],
  key: keyof T | ((item: T) => number | string),
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const output = { ...target };
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceVal = source[key];
      const targetVal = output[key];
      
      if (
        sourceVal &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal) &&
        targetVal &&
        typeof targetVal === 'object' &&
        !Array.isArray(targetVal)
      ) {
        output[key] = deepMerge(targetVal, sourceVal as T[Extract<keyof T, string>]);
      } else {
        output[key] = sourceVal as T[Extract<keyof T, string>];
      }
    }
  }
  
  return output;
}

/**
 * Pick keys from object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((acc, key) => {
    if (key in obj) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Pick<T, K>);
}

/**
 * Omit keys from object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result as Omit<T, K>;
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Utility Functions Overview:
 * 
 * 1. ClassName Utilities:
 *    - cn() — Merge Tailwind classes with conflict resolution
 *    - conditionalClasses() — Explicit conditional class merging
 * 
 * 2. Date/Time Formatters:
 *    - formatDate() — Human-readable dates
 *    - formatRelativeTime() — "2 hours ago" format
 *    - formatDuration() — Seconds to "1h 2m 3s"
 *    - formatTimeAgo() — Combined relative + full date
 * 
 * 3. File Size Formatters:
 *    - formatFileSize() — Bytes to "1.5 GB"
 *    - parseFileSize() — "1.5 GB" back to bytes
 *    - calculateUsagePercentage() — Used/total percentage
 * 
 * 4. Number Formatters:
 *    - formatNumber() — Thousand separators
 *    - formatPercentage() — Value to "75%"
 *    - formatCurrency() — Amount with currency symbol
 *    - formatAbbreviatedNumber() — "1.5K", "2.3M"
 * 
 * 5. String Utilities:
 *    - truncate() — Ellipsis truncation
 *    - truncateMiddle() — "abc...xyz" format
 *    - capitalize(), toTitleCase(), toSlug()
 *    - escapeHtml() — XSS prevention
 *    - generateRandomString(), generateUUID()
 * 
 * 6. Validation:
 *    - isValidEmail(), isValidUrl(), isValidDomain()
 *    - isValidIP(), isValidPort(), isValidCron()
 * 
 * 7. Status Helpers:
 *    - getStatusColor() — Color scheme for status badges
 *    - getStatusIcon() — Icon for status
 *    - calculateHealthScore() — Overall health metric
 *    - getHealthStatus() — healthy/warning/critical
 * 
 * 8. Data Utilities:
 *    - groupBy(), sortBy() — Array operations
 *    - debounce(), throttle() — Performance
 *    - deepClone(), deepMerge() — Object operations
 *    - pick(), omit() — Object key filtering
 * 
 * Usage Examples:
 * 
 * // ClassName merging:
 * cn('bg-red-500', props.className)
 * cn('px-4', { 'px-6': isActive })
 * 
 * // Date formatting:
 * formatDate(new Date(), { showTime: true })
 * formatRelativeTime(timestamp)
 * formatDuration(3661) // '1h 1m 1s'
 * 
 * // File sizes:
 * formatFileSize(1536000000) // '1.5 GiB'
 * parseFileSize('1.5 GB') // 1500000000
 * 
 * // Numbers:
 * formatNumber(1234567) // '1,234,567'
 * formatPercentage(0.75) // '75%'
 * formatAbbreviatedNumber(1500000) // '1.5M'
 * 
 * // Strings:
 * truncate('long text...', 50)
 * truncateMiddle('hash123456789', 4, 4)
 * toSlug('Hello World!') // 'hello-world'
 * 
 * // Validation:
 * isValidEmail('user@example.com')
 * isValidDomain('example.com')
 * isValidCron('0 * * * *')
 * 
 * // Status:
 * const { bg, text, border } = getStatusColor('online')
 * const score = calculateHealthScore({ cpu: 50, ram: 60, disk: 70 })
 * 
 * // Data:
 * groupBy(users, 'role')
 * sortBy(items, 'createdAt', 'desc')
 * debounce(handleSearch, 300)
 */