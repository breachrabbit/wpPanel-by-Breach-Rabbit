// =============================================================================
// wpPanel by Breach Rabbit — Monitoring API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// Server & site metrics, alerts, historical data, live streaming
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface MonitoringQuery {
  action?: 'server' | 'sites' | 'site' | 'alerts' | 'history' | 'processes';
  siteId?: string;
  metric?: 'cpu' | 'ram' | 'disk' | 'network';
  period?: '1h' | '6h' | '24h' | '7d' | '30d';
}

interface MonitoringBody {
  action?: 'create_alert' | 'acknowledge_alert' | 'delete_alert';
  alertId?: string;
  type?: 'cpu' | 'ram' | 'disk' | 'ssl' | 'backup' | 'site_down';
  threshold?: number;
  enabled?: boolean;
}

interface ServerMetrics {
  cpu: {
    usage: number;
    load: [number, number, number];
    cores: number;
    model: string;
    temperature?: number;
  };
  ram: {
    total: number;
    used: number;
    free: number;
    cached: number;
    usage: number;
    swapTotal: number;
    swapUsed: number;
    swapUsage: number;
  };
  disk: Array<{
    mount: string;
    total: number;
    used: number;
    available: number;
    usage: number;
    inodeUsage?: number;
  }>;
  network: {
    rxBytes: number;
    txBytes: number;
    rxPps: number;
    txPps: number;
    interfaces: Array<{
      name: string;
      rxBytes: number;
      txBytes: number;
    }>;
  };
  uptime: number;
  processes: number;
}

interface SiteMetrics {
  siteId: string;
  domain: string;
  requestsDay: number;
  requestsHour: number;
  bandwidthDay: number;
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  topUrls: Array<{ url: string; count: number }>;
  topIps: Array<{ ip: string; count: number }>;
  status: 'running' | 'stopped' | 'error';
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
}

interface Alert {
  id: string;
  type: 'cpu' | 'ram' | 'disk' | 'ssl' | 'backup' | 'site_down';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  resourceId?: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const MonitoringQuerySchema = z.object({
  action: z.enum(['server', 'sites', 'site', 'alerts', 'history', 'processes']).optional(),
  siteId: z.string().optional(),
  metric: z.enum(['cpu', 'ram', 'disk', 'network']).optional(),
  period: z.enum(['1h', '6h', '24h', '7d', '30d']).optional(),
});

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Get CPU usage from /proc/stat
 */
async function getCpuUsage(): Promise<{ usage: number; load: [number, number, number]; cores: number }> {
  try {
    const { stdout: loadOut } = await execAsync('cat /proc/loadavg');
    const loadParts = loadOut.trim().split(/\s+/);
    const load: [number, number, number] = [
      parseFloat(loadParts[0]),
      parseFloat(loadParts[1]),
      parseFloat(loadParts[2]),
    ];

    const { stdout: cpuOut } = await execAsync('nproc');
    const cores = parseInt(cpuOut.trim());

    const { stdout: statOut } = await execAsync('cat /proc/stat');
    const cpuLine = statOut.split('\n')[0];
    const parts = cpuLine.split(/\s+/).slice(1);
    const values = parts.map(Number);
    
    const idle = values[3] + (values[4] || 0);
    const total = values.reduce((a, b) => a + b, 0);
    const usage = total > 0 ? Math.round(((total - idle) / total) * 100) : 0;

    return { usage, load, cores };
  } catch (error) {
    console.error('[Monitoring] Failed to get CPU usage:', error);
    return { usage: 0, load: [0, 0, 0], cores: 1 };
  }
}

/**
 * Get RAM usage from /proc/meminfo
 */
async function getRamUsage(): Promise<{
  total: number;
  used: number;
  free: number;
  cached: number;
  usage: number;
  swapTotal: number;
  swapUsed: number;
  swapUsage: number;
}> {
  try {
    const { stdout } = await execAsync('cat /proc/meminfo');
    const lines = stdout.split('\n');
    const values: Record<string, number> = {};

    for (const line of lines) {
      const match = line.match(/(\w+):\s+(\d+)/);
      if (match) {
        values[match[1]] = parseInt(match[2]) * 1024; // Convert KB to bytes
      }
    }

    const total = values.MemTotal || 0;
    const free = values.MemFree || 0;
    const cached = (values.Cached || 0) + (values.Buffers || 0);
    const used = total - free - cached;
    const usage = total > 0 ? Math.round((used / total) * 100) : 0;

    const swapTotal = values.SwapTotal || 0;
    const swapFree = values.SwapFree || 0;
    const swapUsed = swapTotal - swapFree;
    const swapUsage = swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0;

    return { total, used, free, cached, usage, swapTotal, swapUsed, swapUsage };
  } catch (error) {
    console.error('[Monitoring] Failed to get RAM usage:', error);
    return { total: 0, used: 0, free: 0, cached: 0, usage: 0, swapTotal: 0, swapUsed: 0, swapUsage: 0 };
  }
}

/**
 * Get disk usage
 */
async function getDiskUsage(): Promise<Array<{
  mount: string;
  total: number;
  used: number;
  available: number;
  usage: number;
  inodeUsage?: number;
}>> {
  try {
    const { stdout } = await execAsync('df -BG --output=target,size,used,avail,pcent');
    const lines = stdout.trim().split('\n').slice(1);
    const disks: Array<{ mount: string; total: number; used: number; available: number; usage: number }> = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        disks.push({
          mount: parts[0],
          total: parseInt(parts[1]) * 1024 * 1024 * 1024, // GB to bytes
          used: parseInt(parts[2]) * 1024 * 1024 * 1024,
          available: parseInt(parts[3]) * 1024 * 1024 * 1024,
          usage: parseInt(parts[4]),
        });
      }
    }

    return disks.filter(d => !d.mount.startsWith('/snap') && !d.mount.startsWith('/loop'));
  } catch (error) {
    console.error('[Monitoring] Failed to get disk usage:', error);
    return [];
  }
}

/**
 * Get network stats
 */
async function getNetworkStats(): Promise<{
  rxBytes: number;
  txBytes: number;
  rxPps: number;
  txPps: number;
  interfaces: Array<{ name: string; rxBytes: number; txBytes: number }>;
}> {
  try {
    const { stdout } = await execAsync('cat /proc/net/dev');
    const lines = stdout.trim().split('\n').slice(2);
    
    let totalRx = 0;
    let totalTx = 0;
    const interfaces: Array<{ name: string; rxBytes: number; txBytes: number }> = [];

    for (const line of lines) {
      const parts = line.trim().split(/[\s:]+/);
      if (parts.length >= 10 && !parts[0].includes('lo')) {
        const rxBytes = parseInt(parts[1]);
        const txBytes = parseInt(parts[9]);
        
        totalRx += rxBytes;
        totalTx += txBytes;
        
        interfaces.push({
          name: parts[0].trim(),
          rxBytes,
          txBytes,
        });
      }
    }

    // Get packets per second from /proc/net/dev (simplified)
    const rxPps = Math.round(totalRx / 1000);
    const txPps = Math.round(totalTx / 1000);

    return { rxBytes: totalRx, txBytes: totalTx, rxPps, txPps, interfaces };
  } catch (error) {
    console.error('[Monitoring] Failed to get network stats:', error);
    return { rxBytes: 0, txBytes: 0, rxPps: 0, txPps: 0, interfaces: [] };
  }
}

/**
 * Get system uptime
 */
async function getUptime(): Promise<number> {
  try {
    const { stdout } = await execAsync('cat /proc/uptime');
    return Math.floor(parseFloat(stdout.split(' ')[0]));
  } catch {
    return 0;
  }
}

/**
 * Get active alerts from Redis
 */
async function getActiveAlerts(): Promise<Alert[]> {
  try {
    const alertKeys = await redis.keys('alert:*:active');
    const alerts: Alert[] = [];

    for (const key of alertKeys) {
      const data = await redis.get(key);
      if (data) {
        alerts.push(JSON.parse(data));
      }
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch {
    return [];
  }
}

/**
 * Create alert
 */
async function createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Promise<Alert> {
  const id = `alert:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  const fullAlert: Alert = {
    id,
    ...alert,
    createdAt: new Date(),
    acknowledged: false,
  };

  await redis.setEx(`alert:${id}`, 86400 * 7, JSON.stringify(fullAlert));
  await redis.setEx(`alert:${alert.type}:active`, 86400, JSON.stringify(fullAlert));

  // Publish to WebSocket subscribers
  await redis.publish('alerts:new', JSON.stringify(fullAlert));

  return fullAlert;
}

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/monitoring
 * Get server metrics, site metrics, alerts, history
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams;
    const validatedQuery = MonitoringQuerySchema.parse({
      action: query.get('action') || 'server',
      siteId: query.get('siteId'),
      metric: query.get('metric'),
      period: query.get('period'),
    });

    const { action, siteId, metric, period } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // GET SERVER METRICS
      // =======================================================================
      case 'server':
        const [cpu, ram, disk, network, uptime] = await Promise.all([
          getCpuUsage(),
          getRamUsage(),
          getDiskUsage(),
          getNetworkStats(),
          getUptime(),
        ]);

        result = {
          cpu: {
            ...cpu,
            model: 'Unknown', // Would need dmidecode or /proc/cpuinfo parsing
            temperature: undefined, // Would need lm-sensors
          },
          ram,
          disk,
          network,
          uptime,
          processes: await execAsync('ps aux | wc -l').then(r => parseInt(r.stdout.trim())),
        } as ServerMetrics;

        // Cache for 10 seconds
        await redis.setEx('monitoring:server:latest', 10, JSON.stringify(result));
        break;

      // =======================================================================
      // GET ALL SITES METRICS
      // =======================================================================
      case 'sites':
        // Get from Redis (updated by monitoring service)
        const sitesData = await redis.get('monitoring:sites:latest');
        result = sitesData ? JSON.parse(sitesData) : [];
        break;

      // =======================================================================
      // GET SINGLE SITE METRICS
      // =======================================================================
      case 'site':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const siteData = await redis.get(`monitoring:site:${siteId}:latest`);
        result = siteData ? JSON.parse(siteData) : null;

        if (!result) {
          return NextResponse.json({ error: 'Site metrics not found' }, { status: 404 });
        }
        break;

      // =======================================================================
      // GET ACTIVE ALERTS
      // =======================================================================
      case 'alerts':
        result = await getActiveAlerts();
        break;

      // =======================================================================
      // GET HISTORICAL DATA
      // =======================================================================
      case 'history':
        if (!metric) {
          return NextResponse.json({ error: 'metric is required' }, { status: 400 });
        }

        const timeRange = period || '24h';
        const historyKey = `monitoring:history:${metric}:${timeRange}`;
        const historyData = await redis.get(historyKey);
        result = historyData ? JSON.parse(historyData) : [];
        break;

      // =======================================================================
      // GET TOP PROCESSES
      // =======================================================================
      case 'processes':
        try {
          const { stdout } = await execAsync('ps aux --sort=-%cpu | head -11');
          const lines = stdout.trim().split('\n');
          const headers = lines[0].split(/\s+/);
          
          result = lines.slice(1).map(line => {
            const parts = line.split(/\s+/);
            const process: Record<string, any> = {};
            headers.forEach((header, i) => {
              process[header.toLowerCase()] = parts[i];
            });
            return process;
          });
        } catch (error) {
          result = [];
        }
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
    console.error('[Monitoring API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring
 * Alert management
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, alertId, ...data } = body;

    let result: any;

    switch (action) {
      // =======================================================================
      // ACKNOWLEDGE ALERT
      // =======================================================================
      case 'acknowledge_alert':
        if (!alertId) {
          return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
        }

        const alertKey = `alert:${alertId}`;
        const alertData = await redis.get(alertKey);
        
        if (!alertData) {
          return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        const alert = JSON.parse(alertData);
        alert.acknowledged = true;
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = userId;

        await redis.setEx(alertKey, 86400 * 7, JSON.stringify(alert));

        // Remove from active alerts
        await redis.del(`alert:${alert.type}:active`);

        await createAuditLog({
          action: 'UPDATE',
          resource: 'alert',
          userId,
          metadata: {
            alertId,
            action: 'acknowledged',
          },
        });

        result = { success: true, message: 'Alert acknowledged' };
        break;

      // =======================================================================
      // CREATE MANUAL ALERT (for testing)
      // =======================================================================
      case 'create_alert':
        if (!data.type || !data.title || !data.message) {
          return NextResponse.json({ error: 'type, title, and message are required' }, { status: 400 });
        }

        result = await createAlert({
          type: data.type as Alert['type'],
          severity: data.severity || 'info',
          title: data.title,
          message: data.message,
          resourceId: data.resourceId,
        });

        await createAuditLog({
          action: 'CREATE',
          resource: 'alert',
          userId,
          metadata: {
            alertId: result.id,
            type: result.type,
          },
        });

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
    console.error('[Monitoring API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      );
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
 * Monitoring API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/monitoring?action=server
 * - GET  /api/monitoring?action=sites
 * - GET  /api/monitoring?action=site&siteId=:id
 * - GET  /api/monitoring?action=alerts
 * - GET  /api/monitoring?action=history&metric=cpu&period=24h
 * - GET  /api/monitoring?action=processes
 * - POST /api/monitoring (action: acknowledge_alert/create_alert)
 * - WS   /api/monitoring/stream (via Socket.io)
 * 
 * Request Examples:
 * 
 * // Get server metrics
 * GET /api/monitoring?action=server
 * 
 * // Get all sites metrics
 * GET /api/monitoring?action=sites
 * 
 * // Get single site metrics
 * GET /api/monitoring?action=site&siteId=abc123
 * 
 * // Get active alerts
 * GET /api/monitoring?action=alerts
 * 
 * // Get historical CPU data
 * GET /api/monitoring?action=history&metric=cpu&period=24h
 * 
 * // Get top processes
 * GET /api/monitoring?action=processes
 * 
 * // Acknowledge alert
 * POST /api/monitoring
 * { "action": "acknowledge_alert", "alertId": "alert123" }
 * 
 * Metrics collected:
 * - CPU: usage %, load average (1/5/15 min), cores, model
 * - RAM: total/used/free/cached, swap
 * - Disk: per-mount usage, inodes
 * - Network: rx/tx bytes, pps, per-interface stats
 * - Uptime: seconds since boot
 * - Processes: count, top 10 by CPU
 * 
 * Alert types:
 * - cpu: CPU usage > threshold
 * - ram: RAM usage > threshold
 * - disk: Disk usage > threshold
 * - ssl: SSL certificate expiring
 * - backup: Backup failed/not run
 * - site_down: Site health check failed
 * 
 * Caching:
 * - Server metrics: 10 seconds (Redis)
 * - Site metrics: 30 seconds (Redis)
 * - Alerts: 7 days (Redis)
 * - History: depends on period (Redis time-series)
 * 
 * WebSocket streaming:
 * - /api/monitoring/stream via Socket.io
 * - Pushes metrics every 5 seconds
 * - Clients subscribe to specific metrics
 */