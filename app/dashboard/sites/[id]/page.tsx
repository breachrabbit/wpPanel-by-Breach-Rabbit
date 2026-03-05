'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Site Details Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Comprehensive site management with metrics, logs, files, and settings
// =============================================================================

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { AppShell, PageHeader, PageContent, Section } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UsageBar } from '@/components/ui/UsageBar';
import { MetricCard } from '@/components/ui/MetricCard';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import {
  Play,
  Square,
  RotateCcw,
  Trash2,
  ExternalLink,
  Settings,
  Globe,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  FileText,
  FolderOpen,
  HardDrive,
  Activity,
  RefreshCw,
  Copy,
  Star,
  StarOff,
  ChevronRight,
  Lock,
  Database,
  Wordpress,
  Terminal,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Eye,
  EyeOff,
  Link,
  Unlink,
  Cpu,
  MemoryStick,
  Server,
  Calendar,
  User,
  Mail,
  Key,
  Languages,
  Package,
  Layers,
  Rocket,
  Wrench,
  Save,
  X,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type SiteStatus = 'running' | 'stopped' | 'error' | 'maintenance';
type SiteType = 'wordpress' | 'static' | 'php' | 'nodejs' | 'proxy' | 'docker';
type SslStatus = 'active' | 'expiring' | 'expired' | 'none';
type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

interface Site {
  id: string;
  name: string;
  domain: string;
  domainAliases: string[];
  type: SiteType;
  status: SiteStatus;
  sslStatus: SslStatus;
  sslExpiresAt?: string;
  phpVersion: string;
  autoRestart: boolean;
  healthCheck: boolean;
  healthStatus: HealthStatus;
  requestsDay: number;
  bandwidthDay: number;
  avgResponseTime: number;
  diskUsage: number; // bytes
  diskLimit: number; // bytes
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  rootPath: string;
}

interface SiteMetrics {
  cpu: number;
  ram: number;
  requests: {
    hour: number[];
    day: number[];
  };
  bandwidth: {
    in: number;
    out: number;
  };
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
}

interface WordPressInfo {
  version: string;
  adminUser: string;
  adminEmail: string;
  language: string;
  plugins: Array<{
    name: string;
    version: string;
    latestVersion: string;
    status: 'active' | 'inactive' | 'update_available';
  }>;
  themes: Array<{
    name: string;
    version: string;
    isActive: boolean;
  }>;
  securityScore: number;
  lastScanAt?: string;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const STATUS_COLORS: Record<SiteStatus, 'online' | 'offline' | 'error' | 'warning'> = {
  running: 'online',
  stopped: 'offline',
  error: 'error',
  maintenance: 'warning',
};

const SSL_STATUS_COLORS: Record<SslStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  active: 'success',
  expiring: 'warning',
  expired: 'error',
  none: 'neutral',
};

const SITE_TYPE_LABELS: Record<SiteType, string> = {
  wordpress: 'WordPress',
  static: 'Static',
  php: 'PHP',
  nodejs: 'Node.js',
  proxy: 'Proxy',
  docker: 'Docker',
};

// =============================================================================
// 🏗️ SITE DETAILS PAGE COMPONENT
// =============================================================================

export default function SiteDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;
  
  // State
  const [site, setSite] = useState<Site | null>(null);
  const [metrics, setMetrics] = useState<SiteMetrics | null>(null);
  const [wordpress, setWordpress] = useState<WordPressInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorite, setIsFavorite] = useState(false);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchSiteData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Mock data - replace with real API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockSite: Site = {
        id: siteId,
        name: 'Example Website',
        domain: 'example.com',
        domainAliases: ['www.example.com'],
        type: 'wordpress',
        status: 'running',
        sslStatus: 'active',
        sslExpiresAt: new Date(Date.now() + 86400000 * 60).toISOString(),
        phpVersion: '8.3',
        autoRestart: true,
        healthCheck: true,
        healthStatus: 'healthy',
        requestsDay: 15234,
        bandwidthDay: 1250000000,
        avgResponseTime: 245,
        diskUsage: 2500000000,
        diskLimit: 10000000000,
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date().toISOString(),
        isFavorite: true,
        rootPath: '/var/www/example.com',
      };
      
      const mockMetrics: SiteMetrics = {
        cpu: 35,
        ram: 42,
        requests: {
          hour: Array.from({ length: 24 }, (_, i) => Math.floor(Math.random() * 1000) + 100),
          day: Array.from({ length: 7 }, (_, i) => Math.floor(Math.random() * 10000) + 5000),
        },
        bandwidth: {
          in: 650000000,
          out: 600000000,
        },
        responseTime: {
          avg: 245,
          p95: 450,
          p99: 680,
        },
        statusCodes: {
          '2xx': 14500,
          '3xx': 500,
          '4xx': 200,
          '5xx': 34,
        },
      };
      
      const mockWordpress: WordPressInfo = {
        version: '6.4.2',
        adminUser: 'admin',
        adminEmail: 'admin@example.com',
        language: 'en_US',
        plugins: [
          { name: 'LiteSpeed Cache', version: '6.2', latestVersion: '6.2', status: 'active' },
          { name: 'Wordfence Security', version: '7.11.2', latestVersion: '7.11.3', status: 'update_available' },
          { name: 'Redis Object Cache', version: '2.5.0', latestVersion: '2.5.0', status: 'active' },
          { name: 'Contact Form 7', version: '5.8.4', latestVersion: '5.8.4', status: 'active' },
        ],
        themes: [
          { name: 'Twenty Twenty-Four', version: '1.0', isActive: true },
          { name: 'Twenty Twenty-Three', version: '1.2', isActive: false },
        ],
        securityScore: 85,
        lastScanAt: new Date(Date.now() - 86400000).toISOString(),
      };
      
      setSite(mockSite);
      setMetrics(mockMetrics);
      setWordpress(mockWordpress);
      setIsFavorite(mockSite.isFavorite);
    } catch (error) {
      console.error('Failed to fetch site data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSiteData();
    
    // Auto-refresh metrics every 30 seconds
    const interval = setInterval(() => {
      fetchSiteData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchSiteData]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleStartSite = async () => {
    try {
      await fetch(`/api/sites/${siteId}/start`, { method: 'POST' });
      fetchSiteData();
    } catch (error) {
      console.error('Failed to start site:', error);
    }
  };

  const handleStopSite = async () => {
    try {
      await fetch(`/api/sites/${siteId}/stop`, { method: 'POST' });
      fetchSiteData();
    } catch (error) {
      console.error('Failed to stop site:', error);
    }
  };

  const handleRestartSite = async () => {
    try {
      await fetch(`/api/sites/${siteId}/restart`, { method: 'POST' });
      fetchSiteData();
    } catch (error) {
      console.error('Failed to restart site:', error);
    }
  };

  const handleDeleteSite = async () => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return;
    }
    
    try {
      await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
      router.push('/dashboard/sites');
    } catch (error) {
      console.error('Failed to delete site:', error);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await fetch(`/api/sites/${siteId}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      });
      setIsFavorite(!isFavorite);
      setSite(prev => prev ? { ...prev, isFavorite: !isFavorite } : null);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show toast notification (implement toast system)
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // =============================================================================
  // 🔧 HELPER FUNCTIONS
  // =============================================================================

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (dateString?: string) => {
    if (!dateString) return null;
    const expiry = new Date(dateString);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader title="Site Details" />
        <PageContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </AppShell>
    );
  }

  if (!site) {
    return (
      <AppShell>
        <PageHeader title="Site Not Found" />
        <PageContent>
          <AlertBanner
            variant="error"
            title="Site Not Found"
            message="The site you're looking for doesn't exist or has been deleted."
            action={{
              label: 'Back to Sites',
              onClick: () => router.push('/dashboard/sites'),
            }}
          />
        </PageContent>
      </AppShell>
    );
  }

  const sslDaysUntilExpiry = getDaysUntilExpiry(site.sslExpiresAt);

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title={site.name}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sites', href: '/dashboard/sites' },
          { label: site.name },
        ]}
        description={site.domain}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleFavorite()}
              className="h-9 w-9 p-0"
            >
              {isFavorite ? (
                <Star className="w-4 h-4 fill-warning text-warning" />
              ) : (
                <StarOff className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ExternalLink className="w-4 h-4" />}
              onClick={() => window.open(`https://${site.domain}`, '_blank')}
            >
              Visit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />}
              onClick={fetchSiteData}
              disabled={isRefreshing}
            >
              Refresh
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="sm" leftIcon={<MoreVertical className="w-4 h-4" />}>
                  Actions
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[200px] bg-bg-elevated border border-border rounded-md shadow-elevated p-1"
                  sideOffset={8}
                >
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                    onClick={() => router.push(`/dashboard/sites/${siteId}/files`)}
                  >
                    <FolderOpen className="w-4 h-4" />
                    File Manager
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                    onClick={() => router.push(`/dashboard/sites/${siteId}/logs`)}
                  >
                    <FileText className="w-4 h-4" />
                    View Logs
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                    onClick={() => router.push(`/dashboard/sites/${siteId}/backups`)}
                  >
                    <HardDrive className="w-4 h-4" />
                    Backups
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                    onClick={() => router.push(`/dashboard/sites/${siteId}/settings`)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                    onClick={handleDeleteSite}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Site
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* SSL Expiry Warning */}
          {sslDaysUntilExpiry !== null && sslDaysUntilExpiry <= 30 && (
            <AlertBanner
              variant={sslDaysUntilExpiry <= 7 ? 'error' : 'warning'}
              title={`SSL Certificate ${sslDaysUntilExpiry <= 7 ? 'Expired' : 'Expiring Soon'}`}
              message={`Your SSL certificate for ${site.domain} ${sslDaysUntilExpiry <= 7 ? 'expired' : 'expires'} in ${sslDaysUntilExpiry} days`}
              action={{
                label: 'Renew Certificate',
                onClick: () => router.push(`/dashboard/ssl/${siteId}/renew`),
              }}
              dismissible
            />
          )}

          {/* Health Check Warning */}
          {site.healthStatus === 'unhealthy' && (
            <AlertBanner
              variant="error"
              title="Site Health Check Failed"
              message="Your site is not responding to health checks. It may be down or experiencing issues."
              action={{
                label: 'View Logs',
                onClick: () => router.push(`/dashboard/sites/${siteId}/logs`),
              }}
              dismissible
            />
          )}

          {/* Quick Actions Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={STATUS_COLORS[site.status]}
                    label={site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                    size="md"
                    showDot
                    animated={site.status === 'running'}
                  />
                  <StatusBadge
                    status={SSL_STATUS_COLORS[site.sslStatus]}
                    label={site.sslStatus === 'active' ? 'SSL Active' : site.sslStatus.charAt(0).toUpperCase() + site.sslStatus.slice(1)}
                    size="sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {site.status === 'running' ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Square className="w-4 h-4" />}
                        onClick={handleStopSite}
                      >
                        Stop
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<RotateCcw className="w-4 h-4" />}
                        onClick={handleRestartSite}
                      >
                        Restart
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Play className="w-4 h-4" />}
                      onClick={handleStartSite}
                    >
                      Start
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 bg-transparent h-auto">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="metrics"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Metrics
              </TabsTrigger>
              {site.type === 'wordpress' && (
                <TabsTrigger
                  value="wordpress"
                  className="data-[state=active]:bg-accent data-[state=active]:text-white"
                >
                  WordPress
                </TabsTrigger>
              )}
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Logs
              </TabsTrigger>
              <TabsTrigger
                value="backups"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Backups
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Requests / Day"
                  value={site.requestsDay}
                  icon={Activity}
                  description="Total HTTP requests"
                />
                <MetricCard
                  title="Bandwidth / Day"
                  value={formatBytes(site.bandwidthDay)}
                  icon={Globe}
                  description="Total data transfer"
                />
                <MetricCard
                  title="Avg Response"
                  value={site.avgResponseTime}
                  valueSuffix="ms"
                  icon={Zap}
                  description="Average response time"
                />
                <MetricCard
                  title="Disk Usage"
                  value={Math.round((site.diskUsage / site.diskLimit) * 100)}
                  valueSuffix="%"
                  icon={HardDrive}
                  description={`${formatBytes(site.diskUsage)} / ${formatBytes(site.diskLimit)}`}
                />
              </div>

              {/* Site Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Site Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Domain</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{site.domain}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopyToClipboard(site.domain, 'Domain')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {site.domainAliases.length > 0 && (
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-text-muted">Aliases</span>
                        <span className="text-sm text-text-secondary">
                          {site.domainAliases.join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Type</span>
                      <span className="text-sm text-text-primary">{SITE_TYPE_LABELS[site.type]}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">PHP Version</span>
                      <span className="text-sm text-text-primary">{site.phpVersion}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Root Path</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-secondary truncate max-w-[200px]">
                          {site.rootPath}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopyToClipboard(site.rootPath, 'Root Path')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-text-muted">Created</span>
                      <span className="text-sm text-text-primary">{formatDate(site.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* SSL Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      SSL Certificate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Status</span>
                      <StatusBadge
                        status={SSL_STATUS_COLORS[site.sslStatus]}
                        label={site.sslStatus.charAt(0).toUpperCase() + site.sslStatus.slice(1)}
                        size="sm"
                      />
                    </div>
                    {site.sslExpiresAt && (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-sm text-text-muted">Expires</span>
                          <span className="text-sm text-text-primary">
                            {formatDate(site.sslExpiresAt)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-text-muted">Days Remaining</span>
                          <span
                            className={cn(
                              'text-sm font-medium',
                              sslDaysUntilExpiry !== null && sslDaysUntilExpiry <= 7
                                ? 'text-error'
                                : sslDaysUntilExpiry !== null && sslDaysUntilExpiry <= 30
                                ? 'text-warning'
                                : 'text-success'
                            )}
                          >
                            {sslDaysUntilExpiry} days
                          </span>
                        </div>
                      </>
                    )}
                    <div className="pt-3">
                      <UsageBar
                        value={sslDaysUntilExpiry !== null ? Math.min(100, (sslDaysUntilExpiry / 90) * 100) : 0}
                        variant={
                          sslDaysUntilExpiry !== null && sslDaysUntilExpiry <= 7
                            ? 'error'
                            : sslDaysUntilExpiry !== null && sslDaysUntilExpiry <= 30
                            ? 'warning'
                            : 'success'
                        }
                        size="md"
                        showLabel={false}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resource Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Resource Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">CPU Usage</span>
                      <span className="text-text-primary font-medium">{metrics?.cpu ?? 0}%</span>
                    </div>
                    <UsageBar value={metrics?.cpu ?? 0} variant="cpu" size="md" showLabel={false} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">RAM Usage</span>
                      <span className="text-text-primary font-medium">{metrics?.ram ?? 0}%</span>
                    </div>
                    <UsageBar value={metrics?.ram ?? 0} variant="ram" size="md" showLabel={false} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-secondary">Disk Usage</span>
                      <span className="text-text-primary font-medium">
                        {formatBytes(site.diskUsage)} / {formatBytes(site.diskLimit)}
                      </span>
                    </div>
                    <UsageBar
                      value={(site.diskUsage / site.diskLimit) * 100}
                      variant="disk"
                      size="md"
                      showLabel={false}
                      showWarning
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Traffic Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-text-muted">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Charts will be implemented with Recharts</p>
                      <p className="text-xs mt-1">Requests over time (hourly/daily)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Codes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">HTTP Status Codes (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-success-subtle rounded-md">
                      <div className="text-2xl font-bold text-success">
                        {metrics?.statusCodes['2xx'].toLocaleString()}
                      </div>
                      <div className="text-xs text-text-secondary mt-1">2xx Success</div>
                    </div>
                    <div className="text-center p-4 bg-info-subtle rounded-md">
                      <div className="text-2xl font-bold text-info">
                        {metrics?.statusCodes['3xx'].toLocaleString()}
                      </div>
                      <div className="text-xs text-text-secondary mt-1">3xx Redirect</div>
                    </div>
                    <div className="text-center p-4 bg-warning-subtle rounded-md">
                      <div className="text-2xl font-bold text-warning">
                        {metrics?.statusCodes['4xx'].toLocaleString()}
                      </div>
                      <div className="text-xs text-text-secondary mt-1">4xx Client Error</div>
                    </div>
                    <div className="text-center p-4 bg-error-subtle rounded-md">
                      <div className="text-2xl font-bold text-error">
                        {metrics?.statusCodes['5xx'].toLocaleString()}
                      </div>
                      <div className="text-xs text-text-secondary mt-1">5xx Server Error</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Response Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Response Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-bg-overlay rounded-md">
                      <div className="text-2xl font-bold text-text-primary">
                        {metrics?.responseTime.avg}ms
                      </div>
                      <div className="text-xs text-text-secondary mt-1">Average</div>
                    </div>
                    <div className="text-center p-4 bg-bg-overlay rounded-md">
                      <div className="text-2xl font-bold text-text-primary">
                        {metrics?.responseTime.p95}ms
                      </div>
                      <div className="text-xs text-text-secondary mt-1">95th Percentile</div>
                    </div>
                    <div className="text-center p-4 bg-bg-overlay rounded-md">
                      <div className="text-2xl font-bold text-text-primary">
                        {metrics?.responseTime.p99}ms
                      </div>
                      <div className="text-xs text-text-secondary mt-1">99th Percentile</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WordPress Tab */}
            {site.type === 'wordpress' && wordpress && (
              <TabsContent value="wordpress" className="space-y-6 mt-6">
                {/* WP Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wordpress className="w-4 h-4" />
                      WordPress Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Version</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary">{wordpress.version}</span>
                        <StatusBadge status="success" label="Latest" size="sm" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Admin User</span>
                      <span className="text-sm text-text-primary">{wordpress.adminUser}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Admin Email</span>
                      <span className="text-sm text-text-primary">{wordpress.adminEmail}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Language</span>
                      <span className="text-sm text-text-primary">{wordpress.language}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-text-muted">Security Score</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm font-medium',
                            wordpress.securityScore >= 80
                              ? 'text-success'
                              : wordpress.securityScore >= 60
                              ? 'text-warning'
                              : 'text-error'
                          )}
                        >
                          {wordpress.securityScore}/100
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <Wrench className="w-3 h-3 mr-1" />
                          Harden
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plugins */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Plugins
                      </div>
                      <Button variant="secondary" size="sm">
                        <Upload className="w-3 h-3 mr-1" />
                        Update All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {wordpress.plugins.map((plugin, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-bg-overlay rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                plugin.status === 'active' && 'bg-success',
                                plugin.status === 'inactive' && 'bg-text-muted',
                                plugin.status === 'update_available' && 'bg-warning'
                              )}
                            />
                            <div>
                              <div className="text-sm font-medium text-text-primary">
                                {plugin.name}
                              </div>
                              <div className="text-xs text-text-secondary">
                                v{plugin.version}
                                {plugin.latestVersion !== plugin.version && (
                                  <span className="ml-2 text-warning">
                                    → v{plugin.latestVersion} available
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {plugin.status === 'update_available' && (
                              <Button variant="secondary" size="sm" className="h-8">
                                Update
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Settings className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Themes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Themes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {wordpress.themes.map((theme, index) => (
                        <div
                          key={index}
                          className={cn(
                            'p-4 rounded-md border',
                            theme.isActive
                              ? 'border-accent bg-accent-subtle'
                              : 'border-border bg-bg-overlay'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-text-primary">
                              {theme.name}
                            </span>
                            {theme.isActive && (
                              <StatusBadge status="success" label="Active" size="sm" />
                            )}
                          </div>
                          <div className="text-xs text-text-secondary mb-3">v{theme.version}</div>
                          {!theme.isActive && (
                            <Button variant="secondary" size="sm" className="w-full">
                              Activate
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Site Name</label>
                    <Input value={site.name} onChange={() => {}} className="w-full md:w-96" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Domain</label>
                    <Input value={site.domain} onChange={() => {}} className="w-full md:w-96" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">PHP Version</label>
                    <Select value={site.phpVersion}>
                      <Select.Item value="8.2">PHP 8.2</Select.Item>
                      <Select.Item value="8.3">PHP 8.3</Select.Item>
                      <Select.Item value="8.4">PHP 8.4</Select.Item>
                    </Select>
                  </div>
                  <div className="pt-4">
                    <Button variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Auto-Restart & Health Check
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">Auto-Restart</div>
                      <div className="text-xs text-text-secondary">
                        Automatically restart site if it crashes
                      </div>
                    </div>
                    <Toggle
                      checked={site.autoRestart}
                      onCheckedChange={() => {}}
                      label=""
                      size="md"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-text-primary">Health Check</div>
                      <div className="text-xs text-text-secondary">
                        Monitor site availability every 60 seconds
                      </div>
                    </div>
                    <Toggle
                      checked={site.healthCheck}
                      onCheckedChange={() => {}}
                      label=""
                      size="md"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-error">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-error-subtle border border-error rounded-md">
                    <div className="text-sm font-medium text-error mb-2">Delete Site</div>
                    <div className="text-xs text-text-secondary mb-3">
                      This action cannot be undone. All files, databases, and configurations will be
                      permanently deleted.
                    </div>
                    <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={handleDeleteSite}>
                      Delete Site
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Access Logs
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                        Download
                      </Button>
                      <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
                        Refresh
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 bg-terminal-bg rounded-md p-4 overflow-y-auto font-mono text-xs">
                    <div className="text-terminal-green">
                      [2026-02-27 10:23:45] 192.168.1.100 - - "GET / HTTP/1.1" 200 1234
                    </div>
                    <div className="text-terminal-green">
                      [2026-02-27 10:23:46] 192.168.1.101 - - "GET /wp-admin HTTP/1.1" 200 5678
                    </div>
                    <div className="text-terminal-green">
                      [2026-02-27 10:23:47] 192.168.1.102 - - "GET /api/data HTTP/1.1" 200 890
                    </div>
                    <div className="text-warning">
                      [2026-02-27 10:23:48] 192.168.1.103 - - "GET /nonexistent HTTP/1.1" 404 234
                    </div>
                    <div className="text-terminal-green">
                      [2026-02-27 10:23:49] 192.168.1.104 - - "POST /wp-login.php HTTP/1.1" 200 456
                    </div>
                    <div className="text-error">
                      [2026-02-27 10:23:50] 192.168.1.105 - - "GET /error HTTP/1.1" 500 123
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Backups Tab */}
            <TabsContent value="backups" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Backup History
                    </div>
                    <Button variant="primary" size="sm" leftIcon={<Upload className="w-4 h-4" />}>
                      Create Backup
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      {
                        id: '1',
                        type: 'Full',
                        size: '1.2 GB',
                        date: new Date(Date.now() - 86400000).toISOString(),
                        status: 'completed',
                      },
                      {
                        id: '2',
                        type: 'Incremental',
                        size: '150 MB',
                        date: new Date(Date.now() - 172800000).toISOString(),
                        status: 'completed',
                      },
                      {
                        id: '3',
                        type: 'Database',
                        size: '45 MB',
                        date: new Date(Date.now() - 259200000).toISOString(),
                        status: 'completed',
                      },
                    ].map((backup) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-4 bg-bg-overlay rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              backup.status === 'completed' && 'bg-success'
                            )}
                          />
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {backup.type} Backup
                            </div>
                            <div className="text-xs text-text-secondary">
                              {formatDate(backup.date)} • {backup.size}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" size="sm">
                            <Download className="w-3 h-3 mr-1" />
                            Restore
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageContent>
    </AppShell>
  );
}