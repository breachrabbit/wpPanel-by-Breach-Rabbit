'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Server Monitoring Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Real-time server metrics with WebSocket streaming, graphs, and alerts
// =============================================================================

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell, PageHeader, PageContent, Section } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { UsageBar } from '@/components/ui/UsageBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import {
  Activity,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Zap,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Download,
  Settings,
  Bell,
  BellOff,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
} from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface ServerMetrics {
  cpu: {
    usage: number; // percentage
    load: [number, number, number]; // 1m, 5m, 15m
    cores: number;
    model: string;
    temperature?: number;
  };
  ram: {
    total: number; // bytes
    used: number; // bytes
    free: number; // bytes
    cached: number; // bytes
    swapTotal: number; // bytes
    swapUsed: number; // bytes;
  };
  disk: Array<{
    mount: string;
    total: number; // bytes
    used: number; // bytes;
    available: number; // bytes;
    usage: number; // percentage
  }>;
  network: {
    rxBytes: number;
    txBytes: number;
    rxPps: number;
    txPps: number;
  };
  processes: ProcessInfo[];
  uptime: number; // seconds
  timestamp: number;
}

interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number; // percentage
  memory: number; // percentage
  user: string;
  status: string;
  uptime: number; // seconds
}

interface SiteMetrics {
  siteId: string;
  siteName: string;
  domain: string;
  requests: {
    total: number;
    perSecond: number;
    perHour: number[];
  };
  bandwidth: {
    in: number; // bytes
    out: number; // bytes;
  };
  responseTime: {
    avg: number; // ms
    p95: number; // ms
    p99: number; // ms;
  };
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  topUrls: Array<{ url: string; count: number }>;
  topIps: Array<{ ip: string; count: number }>;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metric?: string;
  threshold?: number;
  currentValue?: number;
}

interface MetricsHistory {
  timestamp: number;
  cpu: number;
  ram: number;
  disk: number;
  networkRx: number;
  networkTx: number;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const METRICS_INTERVAL = 5000; // 5 seconds
const HISTORY_POINTS = 60; // 5 minutes of data at 5s interval

const ALERT_THRESHOLDS = {
  cpuWarning: 70,
  cpuError: 90,
  ramWarning: 70,
  ramError: 85,
  diskWarning: 80,
  diskError: 90,
  loadWarning: 2.0,
  loadError: 5.0,
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const getMetricColor = (value: number, warning: number, error: number): string => {
  if (value >= error) return 'text-error';
  if (value >= warning) return 'text-warning';
  return 'text-success';
};

// =============================================================================
// 🏗️ MONITORING PAGE COMPONENT
// =============================================================================

export default function MonitoringPage() {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null);
  const [siteMetrics, setSiteMetrics] = useState<SiteMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'server' | 'sites' | 'alerts'>('server');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  
  const socketRef = useRef<WebSocket | null>(null);
  const metricsContainerRef = useRef<HTMLDivElement>(null);

  // =============================================================================
  // 🔄 DATA FETCHING & WEBSOCKET
  // =============================================================================

  const fetchInitialMetrics = useCallback(async () => {
    try {
      // Mock data - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockMetrics: ServerMetrics = {
        cpu: {
          usage: 35,
          load: [1.2, 1.5, 1.8],
          cores: 4,
          model: 'Intel Xeon E5-2680',
          temperature: 55,
        },
        ram: {
          total: 16 * 1024 * 1024 * 1024,
          used: 6.2 * 1024 * 1024 * 1024,
          free: 9.8 * 1024 * 1024 * 1024,
          cached: 2.1 * 1024 * 1024 * 1024,
          swapTotal: 4 * 1024 * 1024 * 1024,
          swapUsed: 0.5 * 1024 * 1024 * 1024,
        },
        disk: [
          { mount: '/', total: 100 * 1024 * 1024 * 1024, used: 45 * 1024 * 1024 * 1024, available: 55 * 1024 * 1024 * 1024, usage: 45 },
          { mount: '/var', total: 50 * 1024 * 1024 * 1024, used: 35 * 1024 * 1024 * 1024, available: 15 * 1024 * 1024 * 1024, usage: 70 },
        ],
        network: {
          rxBytes: 1250000000,
          txBytes: 890000000,
          rxPps: 1250,
          txPps: 890,
        },
        processes: [
          { pid: 1234, name: 'litespeed', cpu: 15.2, memory: 8.5, user: 'www-data', status: 'S', uptime: 86400 },
          { pid: 2345, name: 'mysqld', cpu: 8.5, memory: 12.3, user: 'mysql', status: 'S', uptime: 86400 },
          { pid: 3456, name: 'redis-server', cpu: 2.1, memory: 3.2, user: 'redis', status: 'S', uptime: 86400 },
          { pid: 4567, name: 'node', cpu: 5.3, memory: 4.1, user: 'root', status: 'S', uptime: 43200 },
          { pid: 5678, name: 'php-fpm', cpu: 12.8, memory: 6.7, user: 'www-data', status: 'S', uptime: 86400 },
        ],
        uptime: 86400 * 15,
        timestamp: Date.now(),
      };
      
      const mockAlerts: Alert[] = [
        { id: '1', type: 'warning', title: 'Disk Usage High', message: '/var partition is at 70% capacity', timestamp: new Date(Date.now() - 3600000).toISOString(), acknowledged: false, metric: 'disk', threshold: 70, currentValue: 70 },
        { id: '2', type: 'info', title: 'SSL Certificate Expiring', message: 'example.com certificate expires in 14 days', timestamp: new Date(Date.now() - 7200000).toISOString(), acknowledged: false, metric: 'ssl', threshold: 30, currentValue: 14 },
      ];
      
      const mockSiteMetrics: SiteMetrics[] = [
        {
          siteId: '1',
          siteName: 'Example Site',
          domain: 'example.com',
          requests: { total: 15234, perSecond: 12, perHour: Array.from({ length: 24 }, (_, i) => Math.floor(Math.random() * 1000) + 500) },
          bandwidth: { in: 650000000, out: 600000000 },
          responseTime: { avg: 245, p95: 450, p99: 680 },
          statusCodes: { '2xx': 14500, '3xx': 500, '4xx': 200, '5xx': 34 },
          topUrls: [{ url: '/wp-admin', count: 120 }, { url: '/', count: 85 }],
          topIps: [{ ip: '192.168.1.100', count: 45 }, { ip: '192.168.1.101', count: 32 }],
        },
      ];
      
      setServerMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setSiteMetrics(mockSiteMetrics);
      
      // Initialize history
      const history: MetricsHistory[] = Array.from({ length: HISTORY_POINTS }, (_, i) => ({
        timestamp: Date.now() - (HISTORY_POINTS - i) * METRICS_INTERVAL,
        cpu: 30 + Math.random() * 20,
        ram: 35 + Math.random() * 15,
        disk: 45,
        networkRx: 1000 + Math.random() * 500,
        networkTx: 800 + Math.random() * 400,
      }));
      setMetricsHistory(history);
      
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // WebSocket connection for real-time metrics
  useEffect(() => {
    if (!autoRefresh) return;
    
    const connectWebSocket = () => {
      try {
        const wsUrl = `ws://${window.location.host}/api/socket`;
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          setIsConnected(true);
          console.log('[Monitoring] WebSocket connected');
          
          // Subscribe to metrics
          ws.send(JSON.stringify({
            type: 'metrics:subscribe',
             { type: 'server' },
          }));
        };
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
          if (message.type === 'metrics:data') {
            const metrics = message.data as ServerMetrics;
            setServerMetrics(metrics);
            
            // Update history
            setMetricsHistory(prev => {
              const newHistory = [...prev, {
                timestamp: Date.now(),
                cpu: metrics.cpu.usage,
                ram: (metrics.ram.used / metrics.ram.total) * 100,
                disk: metrics.disk[0]?.usage || 0,
                networkRx: metrics.network.rxPps,
                networkTx: metrics.network.txPps,
              }];
              
              // Keep only last HISTORY_POINTS
              return newHistory.slice(-HISTORY_POINTS);
            });
            
            // Check for alerts
            checkAlerts(metrics);
          }
        };
        
        ws.onclose = () => {
          setIsConnected(false);
          console.log('[Monitoring] WebSocket disconnected');
          
          // Reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = () => {
          console.error('[Monitoring] WebSocket error');
          ws.close();
        };
        
        socketRef.current = ws;
      } catch (error) {
        console.error('[Monitoring] Failed to connect WebSocket:', error);
      }
    };
    
    connectWebSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: 'metrics:unsubscribe',
        }));
        socketRef.current.close();
      }
    };
  }, [autoRefresh]);

  // Initial fetch
  useEffect(() => {
    fetchInitialMetrics();
  }, [fetchInitialMetrics]);

  // =============================================================================
  // 🔧 ALERT CHECKING
  // =============================================================================

  const checkAlerts = useCallback((metrics: ServerMetrics) => {
    const newAlerts: Alert[] = [];
    
    // CPU alerts
    if (metrics.cpu.usage >= ALERT_THRESHOLDS.cpuError) {
      newAlerts.push({
        id: `cpu-error-${Date.now()}`,
        type: 'error',
        title: 'CPU Usage Critical',
        message: `CPU usage is at ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metric: 'cpu',
        threshold: ALERT_THRESHOLDS.cpuError,
        currentValue: metrics.cpu.usage,
      });
    } else if (metrics.cpu.usage >= ALERT_THRESHOLDS.cpuWarning) {
      newAlerts.push({
        id: `cpu-warning-${Date.now()}`,
        type: 'warning',
        title: 'CPU Usage High',
        message: `CPU usage is at ${metrics.cpu.usage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metric: 'cpu',
        threshold: ALERT_THRESHOLDS.cpuWarning,
        currentValue: metrics.cpu.usage,
      });
    }
    
    // RAM alerts
    const ramUsage = (metrics.ram.used / metrics.ram.total) * 100;
    if (ramUsage >= ALERT_THRESHOLDS.ramError) {
      newAlerts.push({
        id: `ram-error-${Date.now()}`,
        type: 'error',
        title: 'RAM Usage Critical',
        message: `RAM usage is at ${ramUsage.toFixed(1)}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
        metric: 'ram',
        threshold: ALERT_THRESHOLDS.ramError,
        currentValue: ramUsage,
      });
    }
    
    // Disk alerts
    metrics.disk.forEach(disk => {
      if (disk.usage >= ALERT_THRESHOLDS.diskError) {
        newAlerts.push({
          id: `disk-error-${disk.mount}-${Date.now()}`,
          type: 'error',
          title: `Disk Critical: ${disk.mount}`,
          message: `Disk usage is at ${disk.usage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metric: 'disk',
          threshold: ALERT_THRESHOLDS.diskError,
          currentValue: disk.usage,
        });
      } else if (disk.usage >= ALERT_THRESHOLDS.diskWarning) {
        newAlerts.push({
          id: `disk-warning-${disk.mount}-${Date.now()}`,
          type: 'warning',
          title: `Disk Usage High: ${disk.mount}`,
          message: `Disk usage is at ${disk.usage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          acknowledged: false,
          metric: 'disk',
          threshold: ALERT_THRESHOLDS.diskWarning,
          currentValue: disk.usage,
        });
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
    }
  }, []);

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
    );
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Monitoring"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Monitoring' },
        ]}
        description="Real-time server and site metrics"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={autoRefresh ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              leftIcon={autoRefresh ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            >
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchInitialMetrics}
              leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className={cn('space-y-6', isFullscreen && 'fixed inset-4 z-50 bg-bg-base overflow-auto p-6')}>
          {/* Connection Status */}
          {!isConnected && autoRefresh && (
            <AlertBanner
              variant="warning"
              title="Live Updates Paused"
              message="WebSocket connection lost. Metrics will update on manual refresh."
              dismissible={false}
              size="sm"
            />
          )}

          {/* Unacknowledged Alerts */}
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <div className="space-y-2">
              {alerts.filter(a => !a.acknowledged).slice(0, 3).map((alert) => (
                <AlertBanner
                  key={alert.id}
                  variant={alert.type}
                  title={alert.title}
                  message={alert.message}
                  action={{
                    label: 'Acknowledge',
                    onClick: () => handleAcknowledgeAlert(alert.id),
                  }}
                  onDismiss={() => handleDismissAlert(alert.id)}
                  dismissible
                  size="sm"
                />
              ))}
              {alerts.filter(a => !a.acknowledged).length > 3 && (
                <p className="text-xs text-text-secondary text-center">
                  +{alerts.filter(a => !a.acknowledged).length - 3} more alerts
                </p>
              )}
            </div>
          )}

          {/* Tabs */}
          <Card>
            <CardContent className="p-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid grid-cols-3 gap-1 bg-transparent h-auto">
                  <TabsTrigger
                    value="server"
                    className="data-[state=active]:bg-accent data-[state=active]:text-white"
                    leftIcon={<Server className="w-4 h-4" />}
                  >
                    Server
                  </TabsTrigger>
                  <TabsTrigger
                    value="sites"
                    className="data-[state=active]:bg-accent data-[state=active]:text-white"
                    leftIcon={<Activity className="w-4 h-4" />}
                  >
                    Sites
                  </TabsTrigger>
                  <TabsTrigger
                    value="alerts"
                    className="data-[state=active]:bg-accent data-[state=active]:text-white"
                    leftIcon={<AlertCircle className="w-4 h-4" />}
                  >
                    Alerts
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Server Tab */}
          {activeTab === 'server' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs text-text-muted">CPU Usage</div>
                          <div className={cn(
                            'text-xl font-bold',
                            serverMetrics && getMetricColor(
                              serverMetrics.cpu.usage,
                              ALERT_THRESHOLDS.cpuWarning,
                              ALERT_THRESHOLDS.cpuError
                            )
                          )}>
                            {serverMetrics?.cpu.usage.toFixed(1) || '--'}%
                          </div>
                        </div>
                      </div>
                      <StatusBadge
                        status={
                          serverMetrics && serverMetrics.cpu.usage >= ALERT_THRESHOLDS.cpuError ? 'error' :
                          serverMetrics && serverMetrics.cpu.usage >= ALERT_THRESHOLDS.cpuWarning ? 'warning' : 'success'
                        }
                        size="sm"
                        showDot
                      />
                    </div>
                    {serverMetrics && (
                      <UsageBar
                        value={serverMetrics.cpu.usage}
                        variant="cpu"
                        size="sm"
                        showLabel={false}
                      />
                    )}
                    {serverMetrics && (
                      <div className="mt-2 text-xs text-text-secondary">
                        Load: {serverMetrics.cpu.load.map(l => l.toFixed(2)).join(' / ')}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* RAM */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-info-subtle text-info flex items-center justify-center">
                          <MemoryStick className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs text-text-muted">RAM Usage</div>
                          <div className={cn(
                            'text-xl font-bold',
                            serverMetrics && getMetricColor(
                              (serverMetrics.ram.used / serverMetrics.ram.total) * 100,
                              ALERT_THRESHOLDS.ramWarning,
                              ALERT_THRESHOLDS.ramError
                            )
                          )}>
                            {serverMetrics ? ((serverMetrics.ram.used / serverMetrics.ram.total) * 100).toFixed(1) : '--'}%
                          </div>
                        </div>
                      </div>
                      <StatusBadge
                        status={
                          serverMetrics && (serverMetrics.ram.used / serverMetrics.ram.total) * 100 >= ALERT_THRESHOLDS.ramError ? 'error' :
                          serverMetrics && (serverMetrics.ram.used / serverMetrics.ram.total) * 100 >= ALERT_THRESHOLDS.ramWarning ? 'warning' : 'success'
                        }
                        size="sm"
                        showDot
                      />
                    </div>
                    {serverMetrics && (
                      <UsageBar
                        value={(serverMetrics.ram.used / serverMetrics.ram.total) * 100}
                        variant="ram"
                        size="sm"
                        showLabel={false}
                      />
                    )}
                    {serverMetrics && (
                      <div className="mt-2 text-xs text-text-secondary">
                        {formatBytes(serverMetrics.ram.used)} / {formatBytes(serverMetrics.ram.total)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Disk */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-warning-subtle text-warning flex items-center justify-center">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs text-text-muted">Disk Usage</div>
                          <div className={cn(
                            'text-xl font-bold',
                            serverMetrics && getMetricColor(
                              serverMetrics.disk[0]?.usage || 0,
                              ALERT_THRESHOLDS.diskWarning,
                              ALERT_THRESHOLDS.diskError
                            )
                          )}>
                            {serverMetrics?.disk[0]?.usage.toFixed(1) || '--'}%
                          </div>
                        </div>
                      </div>
                      <StatusBadge
                        status={
                          serverMetrics && serverMetrics.disk[0]?.usage >= ALERT_THRESHOLDS.diskError ? 'error' :
                          serverMetrics && serverMetrics.disk[0]?.usage >= ALERT_THRESHOLDS.diskWarning ? 'warning' : 'success'
                        }
                        size="sm"
                        showDot
                      />
                    </div>
                    {serverMetrics?.disk[0] && (
                      <UsageBar
                        value={serverMetrics.disk[0].usage}
                        variant="disk"
                        size="sm"
                        showLabel={false}
                        showWarning
                      />
                    )}
                    {serverMetrics && serverMetrics.disk[0] && (
                      <div className="mt-2 text-xs text-text-secondary">
                        {formatBytes(serverMetrics.disk[0].used)} / {formatBytes(serverMetrics.disk[0].total)}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Uptime */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-md bg-success-subtle text-success flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs text-text-muted">Uptime</div>
                        <div className="text-xl font-bold text-text-primary">
                          {serverMetrics ? formatDuration(serverMetrics.uptime) : '--'}
                        </div>
                      </div>
                    </div>
                    {serverMetrics && (
                      <div className="text-xs text-text-secondary">
                        {serverMetrics.cpu.cores} cores • {serverMetrics.cpu.model}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Network & Processes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Network */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Network className="w-4 h-4" />
                      Network Traffic
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {serverMetrics && (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-success" />
                            <span className="text-sm text-text-secondary">Incoming</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-text-primary">
                              {formatBytes(serverMetrics.network.rxBytes)}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {serverMetrics.network.rxPps} pps
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-info" />
                            <span className="text-sm text-text-secondary">Outgoing</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-text-primary">
                              {formatBytes(serverMetrics.network.txBytes)}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {serverMetrics.network.txPps} pps
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Mini chart placeholder */}
                    <div className="h-32 bg-bg-overlay rounded-md flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-text-muted opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                {/* Top Processes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Top Processes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {serverMetrics?.processes && serverMetrics.processes.length > 0 ? (
                      <div className="space-y-3">
                        {serverMetrics.processes.slice(0, 5).map((process) => (
                          <div
                            key={process.pid}
                            className="flex items-center justify-between py-2 border-b border-border last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-md bg-bg-overlay flex items-center justify-center text-xs font-mono text-text-secondary">
                                {process.pid}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-text-primary">{process.name}</div>
                                <div className="text-xs text-text-secondary">{process.user}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <div className="text-right">
                                <div className="text-text-muted">CPU</div>
                                <div className="text-text-primary font-medium">{process.cpu.toFixed(1)}%</div>
                              </div>
                              <div className="text-right">
                                <div className="text-text-muted">RAM</div>
                                <div className="text-text-primary font-medium">{process.memory.toFixed(1)}%</div>
                              </div>
                              <div className="text-right w-16">
                                <div className="text-text-muted">Uptime</div>
                                <div className="text-text-primary font-medium">{formatDuration(process.uptime)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-text-muted">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No process data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Disk Partitions */}
              {serverMetrics && serverMetrics.disk.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Disk Partitions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {serverMetrics.disk.map((disk, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-text-primary font-mono">{disk.mount}</span>
                            <span className={cn(
                              'font-medium',
                              getMetricColor(disk.usage, ALERT_THRESHOLDS.diskWarning, ALERT_THRESHOLDS.diskError)
                            )}>
                              {disk.usage.toFixed(1)}%
                            </span>
                          </div>
                          <UsageBar
                            value={disk.usage}
                            variant="disk"
                            size="md"
                            showLabel={false}
                            showWarning
                          />
                          <div className="text-xs text-text-secondary">
                            {formatBytes(disk.used)} used • {formatBytes(disk.available)} available • {formatBytes(disk.total)} total
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metrics History Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Metrics History
                    </div>
                    <div className="flex items-center gap-2">
                      {(['1h', '6h', '24h', '7d'] as const).map((range) => (
                        <Button
                          key={range}
                          variant={timeRange === range ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setTimeRange(range)}
                          className="h-7 px-2"
                        >
                          {range}
                        </Button>
                      ))}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-bg-overlay rounded-md flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 text-text-muted mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-text-secondary">Chart will be implemented with Recharts</p>
                      <p className="text-xs text-text-muted mt-1">CPU, RAM, Disk over time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sites Tab */}
          {activeTab === 'sites' && (
            <div className="space-y-6">
              {/* Site Selector */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-text-secondary">Select Site:</span>
                    <Select
                      value={selectedSite || 'all'}
                      onValueChange={(value) => setSelectedSite(value === 'all' ? null : value)}
                      className="w-[250px]"
                    >
                      <Select.Item value="all">All Sites</Select.Item>
                      {siteMetrics.map((site) => (
                        <Select.Item key={site.siteId} value={site.siteId}>
                          {site.siteName} ({site.domain})
                        </Select.Item>
                      ))}
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Site Metrics */}
              {siteMetrics
                .filter(site => !selectedSite || site.siteId === selectedSite)
                .map((site) => (
                  <div key={site.siteId} className="space-y-6">
                    {/* Site Header */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                              <Globe className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-base font-semibold text-text-primary">{site.siteName}</div>
                              <div className="text-sm text-text-secondary">{site.domain}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-xs text-text-muted">Requests/sec</div>
                              <div className="text-lg font-bold text-text-primary">{site.requests.perSecond}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-text-muted">Avg Response</div>
                              <div className="text-lg font-bold text-text-primary">{site.responseTime.avg}ms</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Site Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-text-muted mb-1">Total Requests (24h)</div>
                          <div className="text-2xl font-bold text-text-primary">
                            {site.requests.total.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-text-muted mb-1">Bandwidth In</div>
                          <div className="text-2xl font-bold text-success">
                            {formatBytes(site.bandwidth.in)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-text-muted mb-1">Bandwidth Out</div>
                          <div className="text-2xl font-bold text-info">
                            {formatBytes(site.bandwidth.out)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-xs text-text-muted mb-1">P95 Response</div>
                          <div className="text-2xl font-bold text-text-primary">
                            {site.responseTime.p95}ms
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Status Codes */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">HTTP Status Codes (24h)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-success-subtle rounded-md">
                            <div className="text-2xl font-bold text-success">
                              {site.statusCodes['2xx'].toLocaleString()}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">2xx Success</div>
                          </div>
                          <div className="text-center p-4 bg-info-subtle rounded-md">
                            <div className="text-2xl font-bold text-info">
                              {site.statusCodes['3xx'].toLocaleString()}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">3xx Redirect</div>
                          </div>
                          <div className="text-center p-4 bg-warning-subtle rounded-md">
                            <div className="text-2xl font-bold text-warning">
                              {site.statusCodes['4xx'].toLocaleString()}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">4xx Client Error</div>
                          </div>
                          <div className="text-center p-4 bg-error-subtle rounded-md">
                            <div className="text-2xl font-bold text-error">
                              {site.statusCodes['5xx'].toLocaleString()}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">5xx Server Error</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Top URLs & IPs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Top URLs</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {site.topUrls.map((item, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <span className="text-sm text-text-primary font-mono">{item.url}</span>
                                <span className="text-sm text-text-secondary">{item.count.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Top IPs</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {site.topIps.map((item, index) => (
                              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <span className="text-sm text-text-primary font-mono">{item.ip}</span>
                                <span className="text-sm text-text-secondary">{item.count.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  {alerts.length} alert{alerts.length !== 1 ? 's' : ''} total •{' '}
                  {alerts.filter(a => !a.acknowledged).length} unacknowledged
                </p>
                {alerts.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAlerts([])}
                    leftIcon={<Trash2 className="w-4 h-4" />}
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {alerts.length === 0 ? (
                <Card>
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <CheckCircle className="w-12 h-12 text-success mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        No Alerts
                      </h3>
                      <p className="text-sm text-text-secondary">
                        All systems are operating normally
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Card
                      key={alert.id}
                      className={cn(
                        alert.acknowledged && 'opacity-60'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0',
                              alert.type === 'error' && 'bg-error-subtle text-error',
                              alert.type === 'warning' && 'bg-warning-subtle text-warning',
                              alert.type === 'info' && 'bg-info-subtle text-info'
                            )}
                          >
                            {alert.type === 'error' ? (
                              <AlertCircle className="w-5 h-5" />
                            ) : alert.type === 'warning' ? (
                              <AlertTriangle className="w-5 h-5" />
                            ) : (
                              <Info className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-text-primary">{alert.title}</span>
                              {!alert.acknowledged && (
                                <StatusBadge status={alert.type === 'error' ? 'error' : 'warning'} label="New" size="sm" />
                              )}
                              {alert.acknowledged && (
                                <StatusBadge status="neutral" label="Acknowledged" size="sm" />
                              )}
                            </div>
                            <p className="text-sm text-text-secondary mb-2">{alert.message}</p>
                            <div className="flex items-center gap-4 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(alert.timestamp).toLocaleString()}
                              </span>
                              {alert.metric && (
                                <span>
                                  Metric: {alert.metric} • Threshold: {alert.threshold}% • Current: {alert.currentValue?.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!alert.acknowledged && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleAcknowledgeAlert(alert.id)}
                                leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                              >
                                Acknowledge
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDismissAlert(alert.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}