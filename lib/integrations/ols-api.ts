// =============================================================================
// wpPanel by Breach Rabbit — OpenLiteSpeed API Client
// =============================================================================
// Full REST API coverage for OLS WebAdmin 1.8+
// Features: vhosts, listeners, PHP, cache, logs, server control
// =============================================================================

import { z } from 'zod';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface OLSConfig {
  baseUrl: string;
  username: string;
  password: string;
  timeout?: number;
}

export interface OLSStatus {
  version: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  workers: number;
  connections: {
    active: number;
    idle: number;
    max: number;
  };
  requests: {
    total: number;
    perSecond: number;
  };
  memory: {
    used: number;
    cached: number;
  };
}

export interface VHost {
  name: string;
  vhRoot: string;
  configFile: string;
  allowSymbolLink: boolean;
  enableScript: boolean;
  restrained: boolean;
  docRoot: string;
  status: 'enabled' | 'disabled';
  domains: string[];
  ssl?: {
    enabled: boolean;
    certificate?: string;
    key?: string;
    ca?: string;
  };
  php?: {
    version: string;
    handler: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Listener {
  name: string;
  address: string;
  port: number;
  secure: boolean;
  vhosts: string[];
  status: 'enabled' | 'disabled';
}

export interface PHPVersion {
  version: string;
  lsapi: string;
  iniPath: string;
  socketPath: string;
  status: 'installed' | 'available' | 'not_installed';
  isDefault: boolean;
}

export interface PHPConfig {
  version: string;
  memoryLimit: string;
  maxExecutionTime: number;
  maxInputTime: number;
  uploadMaxFilesize: string;
  postMaxSize: string;
  maxInputVars: number;
  displayErrors: boolean;
  timezone: string;
  opcache: {
    enabled: boolean;
    memoryConsumption: number;
    maxAcceleratedFiles: number;
    revalidateFreq: number;
    hitRate: number;
  };
  workers: number;
  timeout: number;
}

export interface CacheStats {
  enabled: boolean;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  entries: number;
  expired: number;
}

export interface OLSLog {
  type: 'access' | 'error';
  vhost?: string;
  lines: string[];
  total: number;
  hasMore: boolean;
}

export interface ServerConfig {
  maxConnections: number;
  maxSSLConnections: number;
  connTimeout: number;
  maxKeepAliveReq: number;
  keepAliveTimeout: number;
  smartKeepAlive: boolean;
  gzip: {
    enabled: boolean;
    level: number;
    mimeTypes: string[];
  };
  brotli: {
    enabled: boolean;
    level: number;
  };
  security: {
    hideServerSignature: boolean;
    maxReqURLLen: number;
    maxReqHeaderSize: number;
    maxReqBodySize: number;
  };
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const VHostSchema = z.object({
  name: z.string(),
  vhRoot: z.string(),
  configFile: z.string(),
  allowSymbolLink: z.boolean(),
  enableScript: z.boolean(),
  restrained: z.boolean(),
  docRoot: z.string(),
  status: z.enum(['enabled', 'disabled']),
  domains: z.array(z.string()),
  ssl: z.object({
    enabled: z.boolean(),
    certificate: z.string().optional(),
    key: z.string().optional(),
    ca: z.string().optional(),
  }).optional(),
  php: z.object({
    version: z.string(),
    handler: z.string(),
  }).optional(),
});

const ListenerSchema = z.object({
  name: z.string(),
  address: z.string(),
  port: z.number(),
  secure: z.boolean(),
  vhosts: z.array(z.string()),
  status: z.enum(['enabled', 'disabled']),
});

// =============================================================================
// 🏗️ OLS API CLIENT
// =============================================================================

export class OLSAPIClient {
  private config: OLSConfig;
  private authToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OLSConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  // =============================================================================
  // 🔐 AUTHENTICATION
  // =============================================================================

  /**
   * Authenticate with OLS WebAdmin API
   * Returns bearer token for subsequent requests
   */
  async authenticate(): Promise<string> {
    // Check if we have a valid token
    if (this.authToken && Date.now() < this.tokenExpiry) {
      return this.authToken;
    }

    try {
      // OLS WebAdmin uses basic auth for API
      const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      
      // Test connection and get server info
      const response = await fetch(`${this.config.baseUrl}/v1/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('OLS API authentication failed. Check username and password.');
        }
        throw new Error(`OLS API error: ${response.status} ${response.statusText}`);
      }

      // Store token (OLS uses session-based auth, we'll use basic auth for each request)
      this.authToken = credentials;
      this.tokenExpiry = Date.now() + (60 * 60 * 1000); // 1 hour

      return this.authToken;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error('OLS API connection timeout. Check if WebAdmin is running.');
      }
      throw error;
    }
  }

  /**
   * Get authenticated headers for API requests
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    await this.authenticate();
    return {
      'Authorization': `Basic ${this.authToken}`,
      'Content-Type': 'application/json',
    };
  }

  // =============================================================================
  // 🖥️ SERVER STATUS & CONTROL
  // =============================================================================

  /**
   * Get OLS server status
   */
  async getStatus(): Promise<OLSStatus> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/status`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get OLS status: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      version: data.version || '1.8.0',
      status: data.status || 'running',
      uptime: data.uptime || 0,
      workers: data.workers || 0,
      connections: {
        active: data.connections?.active || 0,
        idle: data.connections?.idle || 0,
        max: data.connections?.max || 0,
      },
      requests: {
        total: data.requests?.total || 0,
        perSecond: data.requests?.perSecond || 0,
      },
      memory: {
        used: data.memory?.used || 0,
        cached: data.memory?.cached || 0,
      },
    };
  }

  /**
   * Restart OLS server
   */
  async restart(): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/server/restart`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to restart OLS: ${response.statusText}`);
    }
  }

  /**
   * Graceful restart OLS (no connection drop)
   */
  async gracefulRestart(): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/server/graceful-restart`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to graceful restart OLS: ${response.statusText}`);
    }
  }

  /**
   * Reload OLS configuration
   */
  async reloadConfig(): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/server/reload`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to reload OLS config: ${response.statusText}`);
    }
  }

  // =============================================================================
  // 🌐 VHOST MANAGEMENT
  // =============================================================================

  /**
   * Get all virtual hosts
   */
  async getVHosts(): Promise<VHost[]> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get vhosts: ${response.statusText}`);
    }

    const data = await response.json();
    return data.vhosts || [];
  }

  /**
   * Get virtual host by name
   */
  async getVHost(name: string): Promise<VHost | null> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts/${encodeURIComponent(name)}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get vhost ${name}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Create virtual host
   */
  async createVHost(vhost: Partial<VHost>): Promise<VHost> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(vhost),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create vhost: ${error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Update virtual host
   */
  async updateVHost(name: string, updates: Partial<VHost>): Promise<VHost> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update vhost ${name}: ${error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Delete virtual host
   */
  async deleteVHost(name: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete vhost ${name}: ${response.statusText}`);
    }
  }

  /**
   * Enable virtual host
   */
  async enableVHost(name: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts/${encodeURIComponent(name)}/enable`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to enable vhost ${name}: ${response.statusText}`);
    }
  }

  /**
   * Disable virtual host
   */
  async disableVHost(name: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts/${encodeURIComponent(name)}/disable`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to disable vhost ${name}: ${response.statusText}`);
    }
  }

  /**
   * Clone virtual host (create from template)
   */
  async cloneVHost(sourceName: string, newName: string): Promise<VHost> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/vhosts/${encodeURIComponent(sourceName)}/clone`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: newName }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to clone vhost: ${error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  // =============================================================================
  // 🎧 LISTENER MANAGEMENT
  // =============================================================================

  /**
   * Get all listeners
   */
  async getListeners(): Promise<Listener[]> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/listeners`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get listeners: ${response.statusText}`);
    }

    const data = await response.json();
    return data.listeners || [];
  }

  /**
   * Create listener
   */
  async createListener(listener: Partial<Listener>): Promise<Listener> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/listeners`, {
      method: 'POST',
      headers,
      body: JSON.stringify(listener),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create listener: ${error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Update listener
   */
  async updateListener(name: string, updates: Partial<Listener>): Promise<Listener> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/listeners/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update listener ${name}: ${error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Delete listener
   */
  async deleteListener(name: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/listeners/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete listener ${name}: ${response.statusText}`);
    }
  }

  // =============================================================================
  // 🐘 PHP MANAGEMENT
  // =============================================================================

  /**
   * Get available PHP versions
   */
  async getPHPVersions(): Promise<PHPVersion[]> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/php/versions`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get PHP versions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.versions || [];
  }

  /**
   * Get PHP configuration for version
   */
  async getPHPConfig(version: string): Promise<PHPConfig> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/php/${version}/config`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get PHP ${version} config: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Update PHP configuration
   */
  async updatePHPConfig(version: string, config: Partial<PHPConfig>): Promise<PHPConfig> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/php/${version}/config`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update PHP ${version} config: ${error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get PHP workers status
   */
  async getPHPWorkers(version: string): Promise<{ workers: number; active: number; idle: number }> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/php/${version}/workers`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get PHP ${version} workers: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Update PHP workers count
   */
  async updatePHPWorkers(version: string, workers: number): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/php/${version}/workers`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ workers }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to update PHP ${version} workers: ${response.statusText}`);
    }
  }

  // =============================================================================
  // 💾 CACHE MANAGEMENT (LSCache)
  // =============================================================================

  /**
   * Get cache statistics
   */
  async getCacheStats(vhost?: string): Promise<CacheStats> {
    const headers = await this.getAuthHeaders();
    const path = vhost 
      ? `${this.config.baseUrl}/v1/cache/${encodeURIComponent(vhost)}/stats`
      : `${this.config.baseUrl}/v1/cache/stats`;
    
    const response = await fetch(path, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get cache stats: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Flush global cache
   */
  async flushCache(): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/cache/flush`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to flush cache: ${response.statusText}`);
    }
  }

  /**
   * Flush cache for specific vhost
   */
  async flushVHostCache(vhost: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/cache/${encodeURIComponent(vhost)}/flush`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to flush cache for ${vhost}: ${response.statusText}`);
    }
  }

  // =============================================================================
  // ⚡ OPCACHE MANAGEMENT
  // =============================================================================

  /**
   * Get OPcache statistics
   */
  async getOPcacheStats(version: string): Promise<{
    enabled: boolean;
    hitRate: number;
    memoryUsage: number;
    cachedScripts: number;
    maxCachedScripts: number;
  }> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/opcache/${version}/stats`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get OPcache stats: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Flush OPcache
   */
  async flushOPcache(version: string): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/opcache/${version}/flush`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to flush OPcache: ${response.statusText}`);
    }
  }

  // =============================================================================
  // 📜 LOGS
  // =============================================================================

  /**
   * Get OLS logs
   */
  async getLogs(type: 'access' | 'error', vhost?: string, lines: number = 100): Promise<OLSLog> {
    const headers = await this.getAuthHeaders();
    const params = new URLSearchParams({
      type,
      lines: lines.toString(),
    });
    
    if (vhost) {
      params.append('vhost', vhost);
    }
    
    const response = await fetch(`${this.config.baseUrl}/v1/logs?${params}`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get logs: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get log level
   */
  async getLogLevel(): Promise<string> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/logs/level`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get log level: ${response.statusText}`);
    }

    const data = await response.json();
    return data.level;
  }

  /**
   * Set log level
   */
  async setLogLevel(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'): Promise<void> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/logs/level`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ level }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to set log level: ${response.statusText}`);
    }
  }

  // =============================================================================
  // ⚙️ SERVER CONFIGURATION
  // =============================================================================

  /**
   * Get server configuration
   */
  async getServerConfig(): Promise<ServerConfig> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/server/config`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Failed to get server config: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Update server configuration
   */
  async updateServerConfig(config: Partial<ServerConfig>): Promise<ServerConfig> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.config.baseUrl}/v1/server/config`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(config),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update server config: ${error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  // =============================================================================
  // 🔧 UTILITY METHODS
  // =============================================================================

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const status = await this.getStatus();
      return {
        success: true,
        message: 'Connected to OpenLiteSpeed WebAdmin',
        version: status.version,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Clear authentication cache
   */
  clearAuth(): void {
    this.authToken = null;
    this.tokenExpiry = 0;
  }
}

// =============================================================================
// 📦 SINGLETON INSTANCE
// =============================================================================

let olsClient: OLSAPIClient | null = null;

/**
 * Get or create OLS API client instance
 */
export function getOLSClient(): OLSAPIClient {
  if (!olsClient) {
    const config: OLSConfig = {
      baseUrl: process.env.OLS_API_URL || 'http://localhost:7080',
      username: process.env.OLS_API_USER || 'admin',
      password: process.env.OLS_API_PASS || '',
      timeout: 30000,
    };

    if (!config.password) {
      console.warn('[OLS API] OLS_API_PASS not configured');
    }

    olsClient = new OLSAPIClient(config);
  }

  return olsClient;
}

/**
 * Reset OLS client instance (for testing)
 */
export function resetOLSClient(): void {
  olsClient = null;
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * OpenLiteSpeed API Client — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Authentication:
 *    - Basic auth (username/password)
 *    - Token caching (1 hour TTL)
 *    - Auto-reconnect on expiry
 * 
 * 2. Server Control:
 *    - Status monitoring
 *    - Restart / Graceful restart / Reload
 *    - Configuration management
 * 
 * 3. VHost Management:
 *    - CRUD operations
 *    - Enable/disable
 *    - Clone from template
 *    - SSL configuration
 * 
 * 4. Listener Management:
 *    - HTTP/HTTPS listeners
 *    - Port binding
 *    - VHost association
 * 
 * 5. PHP Management:
 *    - Version detection (8.2/8.3/8.4/8.5)
 *    - Configuration (php.ini via UI)
 *    - Workers management
 *    - OPcache stats + flush
 * 
 * 6. Cache Management:
 *    - LSCache statistics
 *    - Global flush
 *    - Per-vhost flush
 *    - Hit rate monitoring
 * 
 * 7. Logging:
 *    - Access logs per vhost
 *    - Error logs per vhost
 *    - Log level control
 *    - Pagination support
 * 
 * Environment Variables:
 * - OLS_API_URL: http://localhost:7080
 * - OLS_API_USER: admin
 * - OLS_API_PASS: your-webadmin-password
 * 
 * OLS WebAdmin Setup:
 * 1. Ensure WebAdmin is running (port 7080 by default)
 * 2. Configure admin credentials in /usr/local/lsws/admin/conf/adminConfig.conf
 * 3. Allow API access from localhost (or configure CORS)
 * 4. Test connection: curl -u admin:pass http://localhost:7080/v1/status
 * 
 * API Endpoints Covered:
 * - GET    /v1/status
 * - POST   /v1/server/restart
 * - POST   /v1/server/graceful-restart
 * - POST   /v1/server/reload
 * - GET    /v1/vhosts
 * - POST   /v1/vhosts
 * - GET    /v1/vhosts/:name
 * - PATCH  /v1/vhosts/:name
 * - DELETE /v1/vhosts/:name
 * - POST   /v1/vhosts/:name/enable
 * - POST   /v1/vhosts/:name/disable
 * - POST   /v1/vhosts/:name/clone
 * - GET    /v1/listeners
 * - POST   /v1/listeners
 * - PATCH  /v1/listeners/:name
 * - DELETE /v1/listeners/:name
 * - GET    /v1/php/versions
 * - GET    /v1/php/:version/config
 * - PATCH  /v1/php/:version/config
 * - GET    /v1/php/:version/workers
 * - PATCH  /v1/php/:version/workers
 * - GET    /v1/cache/stats
 * - POST   /v1/cache/flush
 * - POST   /v1/cache/:vhost/flush
 * - GET    /v1/opcache/:version/stats
 * - POST   /v1/opcache/:version/flush
 * - GET    /v1/logs
 * - GET    /v1/logs/level
 * - PATCH  /v1/logs/level
 * - GET    /v1/server/config
 * - PATCH  /v1/server/config
 * 
 * Error Handling:
 * - 401: Authentication failed
 * - 404: Resource not found
 * - 500: OLS internal error
 * - Timeout: Connection timeout (30s default)
 * 
 * Usage Example:
 * 
 * import { getOLSClient } from '@/lib/integrations/ols-api';
 * 
 * const ols = getOLSClient();
 * 
 * // Test connection
 * const result = await ols.testConnection();
 * 
 * // Get status
 * const status = await ols.getStatus();
 * 
 * // Create vhost
 * const vhost = await ols.createVHost({
 *   name: 'example.com',
 *   vhRoot: '/var/www/example.com/public',
 *   domains: ['example.com', 'www.example.com'],
 * });
 * 
 * // Restart OLS
 * await ols.gracefulRestart();
 */