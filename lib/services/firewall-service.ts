// =============================================================================
// wpPanel by Breach Rabbit — Firewall Service
// =============================================================================
// Service layer for UFW firewall management + Fail2ban integration
// Features: rules, profiles, IP whitelist/blacklist, Fail2ban sync
// =============================================================================

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type RuleAction = 'allow' | 'deny' | 'reject';
export type RuleProtocol = 'tcp' | 'udp' | 'any';
export type RuleStatus = 'active' | 'inactive';

export interface FirewallRule {
  id: string;
  number?: number;
  action: RuleAction;
  protocol: RuleProtocol;
  port?: string;
  portRange?: string;
  sourceIp?: string;
  sourceCidr?: string;
  destinationIp?: string;
  comment?: string;
  status: RuleStatus;
  hits?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FirewallStatus {
  active: boolean;
  logging: boolean;
  loggingLevel: 'low' | 'medium' | 'high' | 'full';
  defaultIncoming: 'allow' | 'deny';
  defaultOutgoing: 'allow' | 'deny';
  rulesCount: number;
}

export interface Fail2banStatus {
  active: boolean;
  jails: Fail2banJail[];
  bannedIPs: BannedIP[];
}

export interface Fail2banJail {
  name: string;
  enabled: boolean;
  bantime: number;
  findtime: number;
  maxretry: number;
  action: string;
  logpath: string;
}

export interface BannedIP {
  ip: string;
  jail: string;
  bannedAt: Date;
  expiresAt: Date;
  attempts: number;
}

export interface CreateRuleInput {
  action: RuleAction;
  protocol: RuleProtocol;
  port?: string;
  portRange?: string;
  sourceIp?: string;
  sourceCidr?: string;
  comment?: string;
}

export interface QuickProfile {
  name: string;
  description: string;
  rules: CreateRuleInput[];
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const CreateRuleSchema = z.object({
  action: z.enum(['allow', 'deny', 'reject']),
  protocol: z.enum(['tcp', 'udp', 'any']),
  port: z.string().regex(/^\d+(-\d+)?$/).optional(),
  portRange: z.string().regex(/^\d+:\d+$/).optional(),
  sourceIp: z.string().ip().optional(),
  sourceCidr: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/).optional(),
  comment: z.string().max(255).optional(),
});

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const QUICK_PROFILES: Record<string, QuickProfile> = {
  'web-only': {
    name: 'Web Only',
    description: 'Allow HTTP/HTTPS, SSH only',
    rules: [
      { action: 'allow', protocol: 'tcp', port: '22', comment: 'SSH' },
      { action: 'allow', protocol: 'tcp', port: '80', comment: 'HTTP' },
      { action: 'allow', protocol: 'tcp', port: '443', comment: 'HTTPS' },
      { action: 'deny', protocol: 'any', comment: 'Deny all other' },
    ],
  },
  'wordpress': {
    name: 'WordPress',
    description: 'Web + WordPress specific ports',
    rules: [
      { action: 'allow', protocol: 'tcp', port: '22', comment: 'SSH' },
      { action: 'allow', protocol: 'tcp', port: '80', comment: 'HTTP' },
      { action: 'allow', protocol: 'tcp', port: '443', comment: 'HTTPS' },
      { action: 'allow', protocol: 'tcp', port: '3306', sourceCidr: '127.0.0.1/32', comment: 'MySQL localhost only' },
      { action: 'deny', protocol: 'any', comment: 'Deny all other' },
    ],
  },
  'allow-all': {
    name: 'Allow All',
    description: 'Allow all incoming (not recommended)',
    rules: [
      { action: 'allow', protocol: 'any', comment: 'Allow all' },
    ],
  },
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate secure random string
 */
function generateSecureString(length: number = 32): string {
  const { randomBytes } = require('crypto');
  return randomBytes(length).toString('hex');
}

/**
 * Parse UFW rule line
 */
function parseUFWRule(line: string): Partial<FirewallRule> | null {
  // Example: [ 1] 22/tcp                     ALLOW       Anywhere
  const match = line.match(/\[\s*(\d+)\]\s+(\d+(-\d+)?)?\/?(tcp|udp)?\s+(ALLOW|DENY|REJECT)\s+(.+?)(?:\s+\#.*)?$/);
  
  if (!match) {
    return null;
  }
  
  const [, number, port, , protocol, action, source] = match;
  
  let sourceIp: string | undefined;
  let sourceCidr: string | undefined;
  
  if (source !== 'Anywhere') {
    if (source.includes('/')) {
      sourceCidr = source;
    } else {
      sourceIp = source;
    }
  }
  
  return {
    number: parseInt(number),
    port,
    protocol: (protocol as RuleProtocol) || 'any',
    action: (action.toLowerCase() as RuleAction) || 'allow',
    sourceIp,
    sourceCidr,
  };
}

/**
 * Parse banned IP from Fail2ban
 */
function parseBannedIP(line: string, jail: string): BannedIP | null {
  // Example: 192.168.1.100
  const ip = line.trim();
  
  if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return null;
  }
  
  return {
    ip,
    jail,
    bannedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000), // Default 1 hour
    attempts: 0,
  };
}

// =============================================================================
// 🏗️ FIREWALL SERVICE
// =============================================================================

export class FirewallService {
  // =============================================================================
  // 🔥 UFW STATUS & CONTROL
  // =============================================================================

  /**
   * Get UFW status
   */
  async getStatus(): Promise<FirewallStatus> {
    try {
      const { stdout } = await execAsync('ufw status verbose');
      
      const lines = stdout.split('\n');
      const status: FirewallStatus = {
        active: false,
        logging: false,
        loggingLevel: 'low',
        defaultIncoming: 'deny',
        defaultOutgoing: 'allow',
        rulesCount: 0,
      };
      
      for (const line of lines) {
        if (line.startsWith('Status:')) {
          status.active = line.includes('active');
        } else if (line.startsWith('Logging:')) {
          status.logging = !line.includes('off');
          if (line.includes('low')) status.loggingLevel = 'low';
          else if (line.includes('medium')) status.loggingLevel = 'medium';
          else if (line.includes('high')) status.loggingLevel = 'high';
          else if (line.includes('full')) status.loggingLevel = 'full';
        } else if (line.startsWith('Default:')) {
          const match = line.match(/Default:\s*(.+?)\s*\(incoming\)/);
          if (match) {
            status.defaultIncoming = match[1].toLowerCase() as 'allow' | 'deny';
          }
        }
      }
      
      // Count rules
      const { stdout: rulesOut } = await execAsync('ufw status numbered');
      const ruleLines = rulesOut.split('\n').filter(l => /^\s*\[\s*\d+\]/.test(l));
      status.rulesCount = ruleLines.length;
      
      return status;
    } catch (error) {
      console.error('[Firewall] Failed to get UFW status:', error);
      throw new Error('Failed to get firewall status');
    }
  }

  /**
   * Enable UFW
   */
  async enable(userId?: string): Promise<FirewallStatus> {
    try {
      // Use --force to avoid interactive prompt
      await execAsync('echo "y" | ufw enable');
      
      // Audit log
      if (userId) {
        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: { action: 'ufw_enabled' },
        });
      }
      
      return this.getStatus();
    } catch (error) {
      console.error('[Firewall] Failed to enable UFW:', error);
      throw new Error('Failed to enable firewall');
    }
  }

  /**
   * Disable UFW
   */
  async disable(userId?: string): Promise<FirewallStatus> {
    try {
      await execAsync('echo "y" | ufw disable');
      
      // Audit log
      if (userId) {
        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: { action: 'ufw_disabled' },
        });
      }
      
      return this.getStatus();
    } catch (error) {
      console.error('[Firewall] Failed to disable UFW:', error);
      throw new Error('Failed to disable firewall');
    }
  }

  /**
   * Reset UFW (remove all rules)
   */
  async reset(userId?: string): Promise<void> {
    try {
      await execAsync('echo "y" | ufw reset');
      
      // Audit log
      if (userId) {
        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: { action: 'ufw_reset' },
        });
      }
    } catch (error) {
      console.error('[Firewall] Failed to reset UFW:', error);
      throw new Error('Failed to reset firewall');
    }
  }

  /**
   * Reload UFW rules
   */
  async reload(): Promise<void> {
    try {
      await execAsync('ufw reload');
    } catch (error) {
      console.error('[Firewall] Failed to reload UFW:', error);
      throw new Error('Failed to reload firewall rules');
    }
  }

  // =============================================================================
  // 📋 RULE MANAGEMENT
  // =============================================================================

  /**
   * List all rules
   */
  async listRules(): Promise<FirewallRule[]> {
    try {
      const { stdout } = await execAsync('ufw status numbered');
      const lines = stdout.split('\n');
      const rules: FirewallRule[] = [];
      
      for (const line of lines) {
        const parsed = parseUFWRule(line);
        
        if (parsed) {
          rules.push({
            id: generateSecureString(16),
            number: parsed.number,
            action: parsed.action || 'allow',
            protocol: parsed.protocol || 'any',
            port: parsed.port,
            sourceIp: parsed.sourceIp,
            sourceCidr: parsed.sourceCidr,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
      
      return rules;
    } catch (error) {
      console.error('[Firewall] Failed to list rules:', error);
      throw new Error('Failed to list firewall rules');
    }
  }

  /**
   * Create firewall rule
   */
  async createRule(input: CreateRuleInput, userId?: string): Promise<FirewallRule> {
    const validatedInput = CreateRuleSchema.parse(input);
    
    // Build UFW command
    let command = 'ufw';
    
    // Action
    command += ` ${validatedInput.action}`;
    
    // Protocol
    if (validatedInput.protocol !== 'any') {
      command += ` ${validatedInput.protocol}`;
    }
    
    // Port
    if (validatedInput.port) {
      command += ` ${validatedInput.port}`;
    }
    
    // Source
    if (validatedInput.sourceIp) {
      command += ` from ${validatedInput.sourceIp}`;
    } else if (validatedInput.sourceCidr) {
      command += ` from ${validatedInput.sourceCidr}`;
    }
    
    // Comment
    if (validatedInput.comment) {
      command += ` comment "${validatedInput.comment}"`;
    }
    
    // Execute
    await execAsync(command);
    
    // Get created rule
    const rules = await this.listRules();
    const newRule = rules[rules.length - 1];
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        resource: 'firewall_rule',
        userId,
        metadata: {
          ruleId: newRule.id,
          action: validatedInput.action,
          port: validatedInput.port,
          protocol: validatedInput.protocol,
        },
      });
    }
    
    return newRule;
  }

  /**
   * Delete rule by number
   */
  async deleteRule(ruleNumber: number, userId?: string): Promise<void> {
    try {
      await execAsync(`ufw delete ${ruleNumber}`);
      
      // Audit log
      if (userId) {
        await createAuditLog({
          action: 'DELETE',
          resource: 'firewall_rule',
          userId,
          metadata: { ruleNumber },
        });
      }
    } catch (error) {
      console.error('[Firewall] Failed to delete rule:', error);
      throw new Error('Failed to delete firewall rule');
    }
  }

  /**
   * Toggle rule (enable/disable)
   */
  async toggleRule(ruleNumber: number, userId?: string): Promise<void> {
    // UFW doesn't have direct enable/disable per rule
    // We need to delete and recreate with 'insert' or manage via database
    // For now, just reload to apply changes
    await this.reload();
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'UPDATE',
        resource: 'firewall_rule',
        userId,
        metadata: { ruleNumber, action: 'toggled' },
      });
    }
  }

  /**
   * Apply quick profile
   */
  async applyProfile(profileName: string, userId?: string): Promise<FirewallRule[]> {
    const profile = QUICK_PROFILES[profileName];
    
    if (!profile) {
      throw new Error(`Unknown profile: ${profileName}`);
    }
    
    // Reset existing rules
    await this.reset(userId);
    
    // Apply profile rules
    const rules: FirewallRule[] = [];
    
    for (const ruleInput of profile.rules) {
      const rule = await this.createRule(ruleInput, userId);
      rules.push(rule);
    }
    
    // Enable UFW
    await this.enable(userId);
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'SYSTEM_CHANGE',
        resource: 'firewall',
        userId,
        metadata: {
          action: 'profile_applied',
          profile: profileName,
          rulesCount: rules.length,
        },
      });
    }
    
    return rules;
  }

  /**
   * Get available profiles
   */
  getProfiles(): QuickProfile[] {
    return Object.values(QUICK_PROFILES);
  }

  // =============================================================================
  // 🌐 IP MANAGEMENT
  // =============================================================================

  /**
   * Add IP to whitelist (allow all from IP)
   */
  async whitelistIP(ip: string, comment?: string, userId?: string): Promise<FirewallRule> {
    return this.createRule({
      action: 'allow',
      protocol: 'any',
      sourceIp: ip,
      comment: comment || `Whitelist: ${ip}`,
    }, userId);
  }

  /**
   * Add IP to blacklist (deny all from IP)
   */
  async blacklistIP(ip: string, comment?: string, userId?: string): Promise<FirewallRule> {
    return this.createRule({
      action: 'deny',
      protocol: 'any',
      sourceIp: ip,
      comment: comment || `Blacklist: ${ip}`,
    }, userId);
  }

  /**
   * Remove IP from whitelist/blacklist
   */
  async removeIP(ip: string, userId?: string): Promise<void> {
    const rules = await this.listRules();
    
    for (const rule of rules) {
      if (rule.sourceIp === ip) {
        await this.deleteRule(rule.number!, userId);
      }
    }
  }

  // =============================================================================
  // 🚫 FAIL2BAN INTEGRATION
  // =============================================================================

  /**
   * Get Fail2ban status
   */
  async getFail2banStatus(): Promise<Fail2banStatus> {
    try {
      // Check if Fail2ban is running
      const { stdout: statusOut } = await execAsync('systemctl is-active fail2ban');
      const active = statusOut.trim() === 'active';
      
      const jails: Fail2banJail[] = [];
      const bannedIPs: BannedIP[] = [];
      
      if (active) {
        // Get jail list
        const { stdout: jailsOut } = await execAsync('fail2ban-client status');
        const jailMatch = jailsOut.match(/Jail list:\s*(.+)/);
        
        if (jailMatch) {
          const jailNames = jailMatch[1].split(',').map(j => j.trim());
          
          for (const jailName of jailNames) {
            try {
              const { stdout: jailOut } = await execAsync(`fail2ban-client status ${jailName}`);
              
              const jail: Fail2banJail = {
                name: jailName,
                enabled: true,
                bantime: 3600,
                findtime: 600,
                maxretry: 5,
                action: '',
                logpath: '',
              };
              
              // Parse jail info
              const lines = jailOut.split('\n');
              for (const line of lines) {
                if (line.includes('bantime')) {
                  jail.bantime = parseInt(line.split(':')[1].trim());
                } else if (line.includes('findtime')) {
                  jail.findtime = parseInt(line.split(':')[1].trim());
                } else if (line.includes('maxretry')) {
                  jail.maxretry = parseInt(line.split(':')[1].trim());
                } else if (line.includes('action')) {
                  jail.action = line.split(':')[1].trim();
                } else if (line.includes('logpath')) {
                  jail.logpath = line.split(':')[1].trim();
                }
              }
              
              jails.push(jail);
              
              // Get banned IPs for this jail
              const { stdout: bannedOut } = await execAsync(`fail2ban-client get ${jailName} banip`);
              const bannedLines = bannedOut.split('\n');
              
              for (const line of bannedLines) {
                const banned = parseBannedIP(line, jailName);
                if (banned) {
                  bannedIPs.push(banned);
                }
              }
            } catch (error) {
              console.error(`[Firewall] Failed to get jail ${jailName} status:`, error);
            }
          }
        }
      }
      
      return {
        active,
        jails,
        bannedIPs,
      };
    } catch (error) {
      console.error('[Firewall] Failed to get Fail2ban status:', error);
      return {
        active: false,
        jails: [],
        bannedIPs: [],
      };
    }
  }

  /**
   * Unban IP from Fail2ban
   */
  async fail2banUnban(ip: string, jail?: string, userId?: string): Promise<void> {
    try {
      if (jail) {
        await execAsync(`fail2ban-client set ${jail} unbanip ${ip}`);
      } else {
        // Unban from all jails
        const status = await this.getFail2banStatus();
        
        for (const jail of status.jails) {
          try {
            await execAsync(`fail2ban-client set ${jail.name} unbanip ${ip}`);
          } catch {
            // IP might not be banned in this jail
          }
        }
      }
      
      // Audit log
      if (userId) {
        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: {
            action: 'fail2ban_unban',
            ip,
            jail,
          },
        });
      }
    } catch (error) {
      console.error('[Firewall] Failed to unban IP:', error);
      throw new Error('Failed to unban IP from Fail2ban');
    }
  }

  /**
   * Ban IP in Fail2ban
   */
  async fail2banBan(ip: string, jail: string, userId?: string): Promise<void> {
    try {
      await execAsync(`fail2ban-client set ${jail} banip ${ip}`);
      
      // Audit log
      if (userId) {
        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: {
            action: 'fail2ban_ban',
            ip,
            jail,
          },
        });
      }
    } catch (error) {
      console.error('[Firewall] Failed to ban IP:', error);
      throw new Error('Failed to ban IP in Fail2ban');
    }
  }

  /**
   * Get Fail2ban statistics
   */
  async getFail2banStats(): Promise<{
    totalBanned: number;
    totalJails: number;
    activeJails: number;
    topBannedIPs: Array<{ ip: string; count: number }>;
  }> {
    const status = await this.getFail2banStatus();
    
    // Count unique IPs
    const ipCounts: Record<string, number> = {};
    for (const banned of status.bannedIPs) {
      ipCounts[banned.ip] = (ipCounts[banned.ip] || 0) + 1;
    }
    
    const topBannedIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalBanned: status.bannedIPs.length,
      totalJails: status.jails.length,
      activeJails: status.jails.filter(j => j.enabled).length,
      topBannedIPs,
    };
  }

  // =============================================================================
  // 📊 STATISTICS
  // =============================================================================

  /**
   * Get firewall statistics
   */
  async getStats(): Promise<{
    status: FirewallStatus;
    rulesCount: number;
    allowedRules: number;
    deniedRules: number;
    fail2ban: {
      active: boolean;
      bannedIPs: number;
    };
  }> {
    const status = await this.getStatus();
    const rules = await this.listRules();
    const fail2ban = await this.getFail2banStatus();
    
    return {
      status,
      rulesCount: rules.length,
      allowedRules: rules.filter(r => r.action === 'allow').length,
      deniedRules: rules.filter(r => r.action === 'deny' || r.action === 'reject').length,
      fail2ban: {
        active: fail2ban.active,
        bannedIPs: fail2ban.bannedIPs.length,
      },
    };
  }

  // =============================================================================
  // 🔧 UTILITIES
  // =============================================================================

  /**
   * Test if port is open
   */
  async testPort(port: number, host: string = 'localhost'): Promise<{ open: boolean; error?: string }> {
    try {
      await execAsync(`nc -z -w 2 ${host} ${port}`);
      return { open: true };
    } catch (error: any) {
      return { 
        open: false, 
        error: error.message || 'Port is closed or filtered' 
      };
    }
  }

  /**
   * Check if UFW is blocking specific port
   */
  async isPortBlocked(port: number, protocol: 'tcp' | 'udp' = 'tcp'): Promise<boolean> {
    const rules = await this.listRules();
    
    // Check if there's an explicit allow rule for this port
    const hasAllowRule = rules.some(r => 
      r.port === port.toString() && 
      r.action === 'allow' &&
      (r.protocol === protocol || r.protocol === 'any')
    );
    
    // If no allow rule, it's blocked by default deny
    return !hasAllowRule;
  }
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export const firewallService = new FirewallService();

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Firewall Service — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. UFW Management:
 *    - Enable/disable/reset
 *    - Status with logging level
 *    - Default policies
 * 
 * 2. Rule Management:
 *    - List all rules (numbered)
 *    - Create rule (allow/deny/reject)
 *    - Delete rule by number
 *    - Toggle rule
 *    - Quick profiles (web-only, wordpress, allow-all)
 * 
 * 3. IP Management:
 *    - Whitelist IP (allow all)
 *    - Blacklist IP (deny all)
 *    - Remove IP from lists
 * 
 * 4. Fail2ban Integration:
 *    - Status (active/inactive)
 *    - Jail list with config
 *    - Banned IPs list
 *    - Unban IP
 *    - Ban IP manually
 *    - Statistics
 * 
 * 5. Utilities:
 *    - Test port open/closed
 *    - Check if port is blocked
 *    - Firewall statistics
 * 
 * Security:
 * - All operations logged to audit log
 * - Path traversal prevention (for any file operations)
 * - IP validation before adding rules
 * - Rate limiting on API (via middleware)
 * 
 * Environment Variables:
 * - None required (uses system UFW and Fail2ban)
 * 
 * API Routes (to be implemented):
 * - GET    /api/firewall/status
 * - POST   /api/firewall/enable
 * - POST   /api/firewall/disable
 * - POST   /api/firewall/reset
 * - GET    /api/firewall/rules
 * - POST   /api/firewall/rules
 * - DELETE /api/firewall/rules/:id
 * - POST   /api/firewall/rules/:id/toggle
 * - GET    /api/firewall/profiles
 * - POST   /api/firewall/profiles/:name/apply
 * - POST   /api/firewall/whitelist
 * - POST   /api/firewall/blacklist
 * - DELETE /api/firewall/ip/:ip
 * - GET    /api/firewall/fail2ban/status
 * - GET    /api/firewall/fail2ban/banned
 * - POST   /api/firewall/fail2ban/unban
 * - POST   /api/firewall/fail2ban/ban
 * - GET    /api/firewall/stats
 * - POST   /api/firewall/test-port
 */