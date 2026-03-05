// =============================================================================
// wpPanel by Breach Rabbit — Firewall API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// UFW firewall management + Fail2ban integration
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { firewallService } from '@/lib/services/firewall-service';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface FirewallQuery {
  action?: 'status' | 'rules' | 'profiles' | 'fail2ban' | 'banned' | 'stats';
  jail?: string;
}

interface FirewallBody {
  action?: 'enable' | 'disable' | 'reset' | 'reload' | 'create_rule' | 'delete_rule' | 'toggle_rule' | 'apply_profile' | 'whitelist' | 'blacklist' | 'remove_ip' | 'fail2ban_unban' | 'fail2ban_ban';
  ruleNumber?: number;
  action_type?: 'allow' | 'deny' | 'reject';
  protocol?: 'tcp' | 'udp' | 'any';
  port?: string;
  sourceIp?: string;
  sourceCidr?: string;
  comment?: string;
  profileName?: string;
  ip?: string;
  jail?: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const FirewallQuerySchema = z.object({
  action: z.enum(['status', 'rules', 'profiles', 'fail2ban', 'banned', 'stats']).optional(),
  jail: z.string().optional(),
});

const FirewallBodySchema = z.object({
  action: z.enum(['enable', 'disable', 'reset', 'reload', 'create_rule', 'delete_rule', 'toggle_rule', 'apply_profile', 'whitelist', 'blacklist', 'remove_ip', 'fail2ban_unban', 'fail2ban_ban']).optional(),
  ruleNumber: z.number().optional(),
  action_type: z.enum(['allow', 'deny', 'reject']).optional(),
  protocol: z.enum(['tcp', 'udp', 'any']).optional(),
  port: z.string().regex(/^\d+(-\d+)?$/).optional(),
  sourceIp: z.string().ip().optional(),
  sourceCidr: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/).optional(),
  comment: z.string().max(255).optional(),
  profileName: z.string().optional(),
  ip: z.string().ip().optional(),
  jail: z.string().optional(),
});

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/firewall
 * Get firewall status, rules, profiles, Fail2ban status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const query = request.nextUrl.searchParams;
    const validatedQuery = FirewallQuerySchema.parse({
      action: query.get('action') || 'status',
      jail: query.get('jail'),
    });

    const { action, jail } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // GET FIREWALL STATUS
      // =======================================================================
      case 'status':
        result = await firewallService.getStatus();
        break;

      // =======================================================================
      // GET RULES
      // =======================================================================
      case 'rules':
        result = await firewallService.listRules();
        break;

      // =======================================================================
      // GET PROFILES
      // =======================================================================
      case 'profiles':
        result = firewallService.getProfiles();
        break;

      // =======================================================================
      // GET FAIL2BAN STATUS
      // =======================================================================
      case 'fail2ban':
        result = await firewallService.getFail2banStatus();
        break;

      // =======================================================================
      // GET BANNED IPS
      // =======================================================================
      case 'banned':
        const status = await firewallService.getFail2banStatus();
        result = status.bannedIPs;
        break;

      // =======================================================================
      // GET STATISTICS
      // =======================================================================
      case 'stats':
        result = await firewallService.getStats();
        break;

      // =======================================================================
      // UNKNOWN ACTION
      // =======================================================================
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Firewall API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to get firewall information' }, { status: 500 });
  }
}

/**
 * POST /api/firewall
 * Firewall operations (enable/disable/reset/reload, rules, profiles, IP management, Fail2ban)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate request body
    const validatedBody = FirewallBodySchema.parse(body);
    const { action, ruleNumber, action_type, protocol, port, sourceIp, sourceCidr, comment, profileName, ip, jail } = validatedBody;

    let result: any;

    switch (action) {
      // =======================================================================
      // ENABLE FIREWALL
      // =======================================================================
      case 'enable':
        result = await firewallService.enable(userId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: { action: 'ufw_enabled' },
        });

        break;

      // =======================================================================
      // DISABLE FIREWALL
      // =======================================================================
      case 'disable':
        result = await firewallService.disable(userId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: { action: 'ufw_disabled' },
        });

        break;

      // =======================================================================
      // RESET FIREWALL
      // =======================================================================
      case 'reset':
        await firewallService.reset(userId);
        result = { success: true, message: 'Firewall reset successfully' };
        break;

      // =======================================================================
      // RELOAD FIREWALL
      // =======================================================================
      case 'reload':
        await firewallService.reload();
        result = { success: true, message: 'Firewall reloaded successfully' };
        break;

      // =======================================================================
      // CREATE RULE
      // =======================================================================
      case 'create_rule':
        if (!action_type || !protocol) {
          return NextResponse.json({ error: 'action_type and protocol are required' }, { status: 400 });
        }

        result = await firewallService.createRule(
          {
            action: action_type,
            protocol,
            port,
            sourceIp,
            sourceCidr,
            comment,
          },
          userId
        );

        await createAuditLog({
          action: 'CREATE',
          resource: 'firewall_rule',
          userId,
          metadata: {
            ruleId: result.id,
            action: action_type,
            port,
            protocol,
          },
        });

        break;

      // =======================================================================
      // DELETE RULE
      // =======================================================================
      case 'delete_rule':
        if (!ruleNumber) {
          return NextResponse.json({ error: 'ruleNumber is required' }, { status: 400 });
        }

        await firewallService.deleteRule(ruleNumber, userId);
        result = { success: true, message: `Rule ${ruleNumber} deleted successfully` };
        break;

      // =======================================================================
      // TOGGLE RULE
      // =======================================================================
      case 'toggle_rule':
        if (!ruleNumber) {
          return NextResponse.json({ error: 'ruleNumber is required' }, { status: 400 });
        }

        await firewallService.toggleRule(ruleNumber, userId);
        result = { success: true, message: `Rule ${ruleNumber} toggled successfully` };
        break;

      // =======================================================================
      // APPLY PROFILE
      // =======================================================================
      case 'apply_profile':
        if (!profileName) {
          return NextResponse.json({ error: 'profileName is required' }, { status: 400 });
        }

        result = await firewallService.applyProfile(profileName, userId);

        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'firewall',
          userId,
          metadata: {
            action: 'profile_applied',
            profile: profileName,
            rulesCount: result.length,
          },
        });

        break;

      // =======================================================================
      // WHITELIST IP
      // =======================================================================
      case 'whitelist':
        if (!ip) {
          return NextResponse.json({ error: 'ip is required' }, { status: 400 });
        }

        result = await firewallService.whitelistIP(ip, comment, userId);
        break;

      // =======================================================================
      // BLACKLIST IP
      // =======================================================================
      case 'blacklist':
        if (!ip) {
          return NextResponse.json({ error: 'ip is required' }, { status: 400 });
        }

        result = await firewallService.blacklistIP(ip, comment, userId);
        break;

      // =======================================================================
      // REMOVE IP
      // =======================================================================
      case 'remove_ip':
        if (!ip) {
          return NextResponse.json({ error: 'ip is required' }, { status: 400 });
        }

        await firewallService.removeIP(ip, userId);
        result = { success: true, message: `IP ${ip} removed from whitelist/blacklist` };
        break;

      // =======================================================================
      // FAIL2BAN UNBAN
      // =======================================================================
      case 'fail2ban_unban':
        if (!ip) {
          return NextResponse.json({ error: 'ip is required' }, { status: 400 });
        }

        await firewallService.fail2banUnban(ip, jail, userId);
        result = { success: true, message: `IP ${ip} unbanned from Fail2ban` };
        break;

      // =======================================================================
      // FAIL2BAN BAN
      // =======================================================================
      case 'fail2ban_ban':
        if (!ip || !jail) {
          return NextResponse.json({ error: 'ip and jail are required' }, { status: 400 });
        }

        await firewallService.fail2banBan(ip, jail, userId);
        result = { success: true, message: `IP ${ip} banned in Fail2ban jail ${jail}` };
        break;

      // =======================================================================
      // UNKNOWN ACTION
      // =======================================================================
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Firewall API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Permission denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('Unknown profile')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Invalid IP')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Firewall API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/firewall?action=status
 * - GET  /api/firewall?action=rules
 * - GET  /api/firewall?action=profiles
 * - GET  /api/firewall?action=fail2ban
 * - GET  /api/firewall?action=banned
 * - GET  /api/firewall?action=stats
 * - POST /api/firewall (various actions)
 * 
 * POST Actions:
 * - enable: Enable UFW
 * - disable: Disable UFW
 * - reset: Reset UFW (remove all rules)
 * - reload: Reload UFW rules
 * - create_rule: Create new firewall rule
 * - delete_rule: Delete rule by number
 * - toggle_rule: Toggle rule enable/disable
 * - apply_profile: Apply quick profile (web-only, wordpress, allow-all)
 * - whitelist: Add IP to whitelist
 * - blacklist: Add IP to blacklist
 * - remove_ip: Remove IP from whitelist/blacklist
 * - fail2ban_unban: Unban IP from Fail2ban
 * - fail2ban_ban: Ban IP in Fail2ban
 * 
 * Request Examples:
 * 
 * // Get status
 * GET /api/firewall?action=status
 * 
 * // Get rules
 * GET /api/firewall?action=rules
 * 
 * // Get profiles
 * GET /api/firewall?action=profiles
 * 
 * // Get Fail2ban status
 * GET /api/firewall?action=fail2ban
 * 
 * // Get banned IPs
 * GET /api/firewall?action=banned
 * 
 * // Get statistics
 * GET /api/firewall?action=stats
 * 
 * // Enable firewall
 * POST /api/firewall
 * { "action": "enable" }
 * 
 * // Create rule
 * POST /api/firewall
 * { "action": "create_rule", "action_type": "allow", "protocol": "tcp", "port": "443", "comment": "HTTPS" }
 * 
 * // Delete rule
 * POST /api/firewall
 * { "action": "delete_rule", "ruleNumber": 5 }
 * 
 * // Apply profile
 * POST /api/firewall
 * { "action": "apply_profile", "profileName": "wordpress" }
 * 
 * // Whitelist IP
 * POST /api/firewall
 * { "action": "whitelist", "ip": "192.168.1.100", "comment": "Office IP" }
 * 
 * // Blacklist IP
 * POST /api/firewall
 * { "action": "blacklist", "ip": "10.0.0.50", "comment": "Attacker" }
 * 
 * // Fail2ban unban
 * POST /api/firewall
 * { "action": "fail2ban_unban", "ip": "192.168.1.200", "jail": "sshd" }
 * 
 * // Fail2ban ban
 * POST /api/firewall
 * { "action": "fail2ban_ban", "ip": "192.168.1.200", "jail": "sshd" }
 * 
 * Security:
 * - Authentication required (NextAuth session)
 * - IP validation before adding rules
 * - Audit logging for all operations
 * - Rate limiting via middleware
 * - Only admin users can modify firewall
 */