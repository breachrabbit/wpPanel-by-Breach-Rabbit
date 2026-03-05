'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Dashboard Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Main dashboard with server metrics, sites overview, SSL status, and alerts
// =============================================================================

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { AppShell, PageHeader, PageContent, Section } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MetricCard } from '@/components/ui/MetricCard';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import { SiteCard } from '@/components/ui/SiteCard';
import { cn } from '@/lib/utils';
import {
  Plus,
  RefreshCw,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  BarChart3,
  ExternalLink,
  MoreVertical,
  ChevronRight,
  Wifi,
  WifiOff,
  Activity,
  Globe,
  Lock,
  Unlock,
  Archive,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface ServerMetrics {
  cpu: {
    usage: number;
    load: [number, number, number];
    cores: number;
    temperature?: number;
  };
  ram: {
    total: number;
    used: number;
    free: number;
    cached: number;
    swapTotal: number;
    swapUsed: number;
  };
  disk: Array<{
    mount: string;
    total: number;
    used: number;
    available: number;
    usage: number;
  }>;
  network: {
    rxBytes: number;
    txBytes: number;
    rxPps: number;
    txPps: number;
  };
  uptime: number;
}

interface Site {
  id: string;
  name: string;
  domain: string;
  status: 'running' | 'stopped' | 'error' | 'maintenance';
  sslStatus: 'active' | 'expiring' | 'expired' | 'none';
  phpVersion: string;
  type: 'wordpress' | 'static' | 'php' | 'nodejs' | 'proxy' | 'docker';
  requestsDay?: number;
  bandwidthDay?: number;
  responseTime?: number;
  diskUsage?: number;
  diskLimit?: number;
  isFavorite?: boolean;
  lastBackupAt?: string;
}

interface SSLCertificate {
  id: string;
  domain: string;
  issuer: string;
  status: 'active' | 'expiring' | 'expired';
  expiresAt: string;
  autoRenew: boolean;
  siteId?: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface Activity {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: string;
  status: 'success' | 'error';
}

// =============================================================================
// 🏗️ DASHBOARD PAGE COMPONENT
// =============================================================================

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [sslCerts, setSslCerts] = useState<SSLCertificate[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockMetrics: ServerMetrics = {
        cpu: {
          usage: 35,
          load: [1.2, 1.5, 1.8],
          cores: 4,
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
        uptime: 86400 * 15,
      };
      
      const mockSites: Site[] = [
        {
          id: '1',
          name: 'Example Site',
          domain: 'example.com',
          status: 'running',
          sslStatus: 'active',
          phpVersion: '8.3',
          type: 'wordpress',
          requestsDay: 15234,
          bandwidthDay: 1250000000,
          responseTime: 245,
          diskUsage: 2500000000,
          diskLimit: 10000000000,
          isFavorite: true,
          lastBackupAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '2',
          name: 'Blog Site',
          domain: 'blog.example.com',
          status: 'running',
          sslStatus: 'expiring',
          phpVersion: '8.3',
          type: 'wordpress',
          requestsDay: 8456,
          bandwidthDay: 650000000,
          responseTime: 189,
          diskUsage: 1200000000,
          diskLimit: 5000000000,
          isFavorite: false,
          lastBackupAt: new Date(Date.now() - 172800000).toISOString(),
        },
        {
          id: '3',
          name: 'API Service',
          domain: 'api.example.com',
          status: 'error',
          sslStatus: 'active',
          phpVersion: '8.3',
          type: 'nodejs',
          requestsDay: 45678,
          bandwidthDay: 890000000,
          responseTime: 567,
          diskUsage: 800000000,
          diskLimit: 3000000000,
          isFavorite: false,
          lastBackupAt: new Date(Date.now() - 259200000).toISOString(),
        },
      ];
      
      const mockSSLCerts: SSLCertificate[] = [
        {
          id: '1',
          domain: 'example.com',
          issuer: "Let's Encrypt",
          status: 'active',
          expiresAt: new Date(Date.now() + 86400000 * 60).toISOString(),
          autoRenew: true,
          siteId: '1',
        },
        {
          id: '2',
          domain: 'blog.example.com',
          issuer: "Let's Encrypt",
          status: 'expiring',
          expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
          autoRenew: true,
          siteId: '2',
        },
      ];
      
      const mockAlerts: Alert[] = [
        {
          id: '1',
          type: 'warning',
          title: 'SSL Certificate Expiring',
          message: 'blog.example.com certificate expires in 5 days',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          acknowledged: false,
        },
        {
          id: '2',
          type: 'error',
          title: 'Site Down',
          message: 'api.example.com is not responding to health checks',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          acknowledged: false,
        },
        {
          id: '3',
          type: 'info',
          title: 'Backup Completed',
          message: 'Daily backup completed successfully',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          acknowledged: true,
        },
      ];
      
      const mockActivity: Activity[] = [
        { id: '1', action: 'Site created', resource: 'example.com', user: 'admin', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success' },
        { id: '2', action: 'SSL renewed', resource: 'example.com', user: 'system', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'success' },
        { id: '3', action: 'Backup failed', resource: 'api.example.com', user: 'system', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'error' },
        { id: '4', action: 'File uploaded', resource: '/var/www/example.com', user: 'admin', timestamp: new Date(Date.now() - 28800000).toISOString(), status: 'success' },
      ];
      
      setServerMetrics(mockMetrics);
      setSites(mockSites);
      setSslCerts(mockSSLCerts);
      setAlerts(mockAlerts);
      setRecentActivity(mockActivity);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds for real-time metrics
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // =============================================================================
  // 🔧 HELPERS
  // =============================================================================

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
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
        title="Dashboard"
        breadcrumb={[{ label: 'Dashboard' }]}
        description="Server overview and quick actions"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDashboardData}
            leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Unacknowledged Alerts */}
          {alerts.filter(a => !a.acknowledged).length > 0 && (
            <Section title="Alerts" icon={<AlertTriangle className="w-4 h-4" />}>
              <div className="space-y-2">
                {alerts.filter(a => !a.acknowledged).map((alert) => (
                  <AlertBanner
                    key={alert.id}
                    variant={alert.type}
                    title={alert.title}
                    message={alert.message}
                    onDismiss={() => handleDismissAlert(alert.id)}
                    action={
                      !alert.acknowledged
                        ? {
                            label: 'Acknowledge',
                            onClick: () => handleAcknowledgeAlert(alert.id),
                          }
                        : undefined
                    }
                    dismissible
                    size="sm"
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Server Metrics */}
          <Section title="Server Metrics" icon={<Server className="w-4 h-4" />}>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-8 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : serverMetrics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* CPU */}
                <MetricCard
                  title="CPU Usage"
                  value={serverMetrics.cpu.usage}
                  valueSuffix="%"
                  icon={Cpu}
                  description={`${serverMetrics.cpu.cores} cores • Load: ${serverMetrics.cpu.load.map(l => l.toFixed(2)).join(' / ')}`}
                  trend={serverMetrics.cpu.usage > 80 ? 'down' : serverMetrics.cpu.usage < 30 ? 'up' : 'neutral'}
                  trendValue={serverMetrics.cpu.usage > 80 ? 'High' : serverMetrics.cpu.usage < 30 ? 'Low' : undefined}
                  variant={serverMetrics.cpu.usage > 80 ? 'error' : serverMetrics.cpu.usage > 60 ? 'warning' : 'success'}
                />

                {/* RAM */}
                <MetricCard
                  title="RAM Usage"
                  value={Math.round((serverMetrics.ram.used / serverMetrics.ram.total) * 100)}
                  valueSuffix="%"
                  icon={MemoryStick}
                  description={`${formatBytes(serverMetrics.ram.used)} / ${formatBytes(serverMetrics.ram.total)}`}
                  trend={serverMetrics.ram.used / serverMetrics.ram.total > 0.8 ? 'down' : 'neutral'}
                  variant={serverMetrics.ram.used / serverMetrics.ram.total > 0.8 ? 'error' : serverMetrics.ram.used / serverMetrics.ram.total > 0.6 ? 'warning' : 'success'}
                />

                {/* Disk */}
                <MetricCard
                  title="Disk Usage"
                  value={serverMetrics.disk[0]?.usage || 0}
                  valueSuffix="%"
                  icon={HardDrive}
                  description={`${formatBytes(serverMetrics.disk[0]?.used || 0)} / ${formatBytes(serverMetrics.disk[0]?.total || 0)}`}
                  trend={serverMetrics.disk[0]?.usage && serverMetrics.disk[0].usage > 80 ? 'down' : 'neutral'}
                  variant={serverMetrics.disk[0]?.usage && serverMetrics.disk[0].usage > 80 ? 'error' : serverMetrics.disk[0]?.usage && serverMetrics.disk[0].usage > 60 ? 'warning' : 'success'}
                />

                {/* Uptime */}
                <MetricCard
                  title="Uptime"
                  value={formatUptime(serverMetrics.uptime)}
                  icon={Zap}
                  description={`Since ${new Date(Date.now() - serverMetrics.uptime * 1000).toLocaleDateString()}`}
                  variant="info"
                />
              </div>
            ) : (
              <AlertBanner
                variant="error"
                title="Failed to Load Metrics"
                message="Unable to fetch server metrics. Please try again."
                action={{
                  label: 'Retry',
                  onClick: fetchDashboardData,
                }}
              />
            )}
          </Section>

          {/* Network & Disk Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Network */}
            <Section title="Network Traffic" icon={<Network className="w-4 h-4" />}>
              {isLoading ? (
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ) : serverMetrics ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-success-subtle text-success flex items-center justify-center">
                            <TrendingDown className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs text-text-muted">Incoming</div>
                            <div className="text-sm font-medium text-text-primary">
                              {formatBytes(serverMetrics.network.rxBytes)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-text-muted">Packets/sec</div>
                          <div className="text-sm font-medium text-text-primary">
                            {serverMetrics.network.rxPps.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-info-subtle text-info flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs text-text-muted">Outgoing</div>
                            <div className="text-sm font-medium text-text-primary">
                              {formatBytes(serverMetrics.network.txBytes)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-text-muted">Packets/sec</div>
                          <div className="text-sm font-medium text-text-primary">
                            {serverMetrics.network.txPps.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </Section>

            {/* Disk Partitions */}
            <Section title="Disk Partitions" icon={<HardDrive className="w-4 h-4" />}>
              {isLoading ? (
                <Card>
                  <CardContent className="p-4">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ) : serverMetrics ? (
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {serverMetrics.disk.map((disk, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-primary font-mono">{disk.mount}</span>
                          <span
                            className={cn(
                              'font-medium',
                              disk.usage > 80 ? 'text-error' :
                              disk.usage > 60 ? 'text-warning' :
                              'text-success'
                            )}
                          >
                            {disk.usage}%
                          </span>
                        </div>
                        <div className="h-2 bg-bg-overlay rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-300',
                              disk.usage > 80 ? 'bg-error' :
                              disk.usage > 60 ? 'bg-warning' :
                              'bg-success'
                            )}
                            style={{ width: `${disk.usage}%` }}
                          />
                        </div>
                        <div className="text-xs text-text-secondary">
                          {formatBytes(disk.used)} used • {formatBytes(disk.available)} available
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </Section>
          </div>

          {/* Sites Overview */}
          <Section
            title="Sites"
            icon={<Globe className="w-4 h-4" />}
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/dashboard/sites/new')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Site
              </Button>
            }
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-10 w-10 rounded-md mb-3" />
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24 mb-4" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sites.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Globe className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      No sites yet
                    </h3>
                    <p className="text-sm text-text-secondary mb-4 max-w-md">
                      Create your first site to get started. You can host WordPress, static sites, PHP apps, and more.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => router.push('/dashboard/sites/new')}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create Site
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sites.slice(0, 6).map((site) => (
                  <SiteCard
                    key={site.id}
                    siteId={site.id}
                    name={site.name}
                    domain={site.domain}
                    status={site.status}
                    sslStatus={site.sslStatus}
                    phpVersion={site.phpVersion}
                    type={site.type}
                    requestsDay={site.requestsDay}
                    bandwidthDay={site.bandwidthDay}
                    responseTime={site.responseTime}
                    diskUsage={site.diskUsage}
                    diskLimit={site.diskLimit}
                    isFavorite={site.isFavorite}
                    lastBackupAt={site.lastBackupAt}
                    onNavigate={(id) => router.push(`/dashboard/sites/${id}`)}
                    onSettings={(id) => router.push(`/dashboard/sites/${id}/settings`)}
                    onVisit={(domain) => window.open(`https://${domain}`, '_blank')}
                    onStart={(id) => console.log('Start site:', id)}
                    onStop={(id) => console.log('Stop site:', id)}
                    onRestart={(id) => console.log('Restart site:', id)}
                    onToggleFavorite={(id) => console.log('Toggle favorite:', id)}
                    onDelete={(id) => console.log('Delete site:', id)}
                  />
                ))}
              </div>
            )}

            {sites.length > 6 && (
              <div className="flex justify-center mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard/sites')}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  View All Sites ({sites.length})
                </Button>
              </div>
            )}
          </Section>

          {/* SSL Certificates */}
          <Section title="SSL Certificates" icon={<Shield className="w-4 h-4" />}>
            {isLoading ? (
              <Card>
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ) : sslCerts.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Lock className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      No SSL certificates
                    </h3>
                    <p className="text-sm text-text-secondary">
                      SSL certificates will appear here once issued or uploaded
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {sslCerts.map((cert) => {
                      const daysUntilExpiry = Math.ceil(
                        (new Date(cert.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      
                      return (
                        <div
                          key={cert.id}
                          className="flex items-center justify-between p-4 hover:bg-bg-overlay transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-md flex items-center justify-center',
                                cert.status === 'active' && 'bg-success-subtle text-success',
                                cert.status === 'expiring' && 'bg-warning-subtle text-warning',
                                cert.status === 'expired' && 'bg-error-subtle text-error'
                              )}
                            >
                              {cert.status === 'active' ? (
                                <Lock className="w-5 h-5" />
                              ) : cert.status === 'expiring' ? (
                                <AlertTriangle className="w-5 h-5" />
                              ) : (
                                <Unlock className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-text-primary">
                                {cert.domain}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {cert.issuer} • {cert.autoRenew ? 'Auto-renew enabled' : 'Manual renewal'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div
                                className={cn(
                                  'text-sm font-medium',
                                  cert.status === 'active' && 'text-success',
                                  cert.status === 'expiring' && 'text-warning',
                                  cert.status === 'expired' && 'text-error'
                                )}
                              >
                                {cert.status === 'active' && 'Active'}
                                {cert.status === 'expiring' && `Expiring in ${daysUntilExpiry}d`}
                                {cert.status === 'expired' && 'Expired'}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {new Date(cert.expiresAt).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  className="z-50 min-w-[150px] bg-bg-elevated border border-border rounded-md shadow-elevated p-1"
                                  sideOffset={8}
                                >
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                    onClick={() => router.push(`/dashboard/ssl/${cert.id}`)}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    View Details
                                  </DropdownMenu.Item>
                                  {cert.autoRenew && (
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                      onClick={() => console.log('Renew SSL:', cert.id)}
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Renew Now
                                    </DropdownMenu.Item>
                                  )}
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </Section>

          {/* Recent Activity */}
          <Section title="Recent Activity" icon={<Activity className="w-4 h-4" />}>
            {isLoading ? (
              <Card>
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            ) : recentActivity.length === 0 ? (
              <Card>
                <CardContent className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Clock className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      No recent activity
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Recent actions will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 hover:bg-bg-overlay transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center',
                              activity.status === 'success' && 'bg-success-subtle text-success',
                              activity.status === 'error' && 'bg-error-subtle text-error'
                            )}
                          >
                            {activity.status === 'success' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm text-text-primary">
                              <span className="font-medium">{activity.action}</span>
                              <span className="text-text-secondary"> on </span>
                              <span className="font-mono">{activity.resource}</span>
                            </div>
                            <div className="text-xs text-text-secondary">
                              by {activity.user}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-text-muted">
                          {getRelativeTime(activity.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </Section>

          {/* Quick Actions */}
          <Section title="Quick Actions" icon={<Zap className="w-4 h-4" />}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/sites/new')}
                className="h-auto py-4 flex flex-col items-center gap-2"
              >
                <Plus className="w-6 h-6" />
                <span>New Site</span>
              </Button>
              
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/backups')}
                className="h-auto py-4 flex flex-col items-center gap-2"
              >
                <Archive className="w-6 h-6" />
                <span>Backup Now</span>
              </Button>
              
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/terminal')}
                className="h-auto py-4 flex flex-col items-center gap-2"
              >
                <Activity className="w-6 h-6" />
                <span>Terminal</span>
              </Button>
              
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/dashboard/settings')}
                className="h-auto py-4 flex flex-col items-center gap-2"
              >
                <Server className="w-6 h-6" />
                <span>Settings</span>
              </Button>
            </div>
          </Section>
        </div>
      </PageContent>
    </AppShell>
  );
}