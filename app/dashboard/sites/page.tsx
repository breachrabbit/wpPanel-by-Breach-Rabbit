'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Sites List Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Main sites management page with filtering, sorting, and bulk actions
// =============================================================================

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { AppShell, PageHeader, PageContent, Section } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table } from '@/components/ui/Table';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
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
  XCircle,
  Clock,
  BarChart3,
  Download,
  Upload,
  Copy,
  ChevronDown,
  LayoutGrid,
  List,
  Star,
  StarOff,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type SiteStatus = 'running' | 'stopped' | 'error' | 'maintenance';
type SiteType = 'wordpress' | 'static' | 'php' | 'nodejs' | 'proxy' | 'docker';
type SslStatus = 'active' | 'expiring' | 'expired' | 'none';
type ViewMode = 'table' | 'grid';

interface Site {
  id: string;
  name: string;
  domain: string;
  type: SiteType;
  status: SiteStatus;
  sslStatus: SslStatus;
  sslExpiresAt?: string;
  phpVersion: string;
  autoRestart: boolean;
  healthCheck: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  requestsDay: number;
  bandwidthDay: number;
  avgResponseTime: number;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
}

interface FilterState {
  search: string;
  status: SiteStatus | 'all';
  type: SiteType | 'all';
  sslStatus: SslStatus | 'all';
  autoRestart: boolean | 'all';
  favorites: boolean;
}

interface SortState {
  column: keyof Site;
  direction: 'asc' | 'desc';
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
// 🏗️ SITES PAGE COMPONENT
// =============================================================================

export default function SitesPage() {
  const router = useRouter();
  
  // State
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    type: 'all',
    sslStatus: 'all',
    autoRestart: 'all',
    favorites: false,
  });
  const [sort, setSort] = useState<SortState>({
    column: 'createdAt',
    direction: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
  });

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchSites = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockSites: Site[] = [
        {
          id: '1',
          name: 'Example Website',
          domain: 'example.com',
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
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: true,
        },
        {
          id: '2',
          name: 'Blog Site',
          domain: 'blog.example.com',
          type: 'wordpress',
          status: 'running',
          sslStatus: 'active',
          sslExpiresAt: new Date(Date.now() + 86400000 * 45).toISOString(),
          phpVersion: '8.3',
          autoRestart: true,
          healthCheck: true,
          healthStatus: 'healthy',
          requestsDay: 8456,
          bandwidthDay: 650000000,
          avgResponseTime: 189,
          createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
        },
        {
          id: '3',
          name: 'E-commerce Shop',
          domain: 'shop.example.com',
          type: 'wordpress',
          status: 'running',
          sslStatus: 'expiring',
          sslExpiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
          phpVersion: '8.2',
          autoRestart: true,
          healthCheck: true,
          healthStatus: 'healthy',
          requestsDay: 23456,
          bandwidthDay: 2100000000,
          avgResponseTime: 312,
          createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: true,
        },
        {
          id: '4',
          name: 'Dev Environment',
          domain: 'dev.example.com',
          type: 'nodejs',
          status: 'stopped',
          sslStatus: 'none',
          phpVersion: 'N/A',
          autoRestart: false,
          healthCheck: false,
          healthStatus: 'unknown',
          requestsDay: 0,
          bandwidthDay: 0,
          avgResponseTime: 0,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
        },
        {
          id: '5',
          name: 'API Service',
          domain: 'api.example.com',
          type: 'proxy',
          status: 'error',
          sslStatus: 'active',
          sslExpiresAt: new Date(Date.now() + 86400000 * 90).toISOString(),
          phpVersion: 'N/A',
          autoRestart: true,
          healthCheck: true,
          healthStatus: 'unhealthy',
          requestsDay: 45678,
          bandwidthDay: 890000000,
          avgResponseTime: 567,
          createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
        },
      ];
      
      setSites(mockSites);
      setPagination(prev => ({
        ...prev,
        totalItems: mockSites.length,
      }));
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSites, 30000);
    return () => clearInterval(interval);
  }, [fetchSites]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleStartSite = async (siteId: string) => {
    try {
      await fetch(`/api/sites/${siteId}/start`, { method: 'POST' });
      fetchSites();
    } catch (error) {
      console.error('Failed to start site:', error);
    }
  };

  const handleStopSite = async (siteId: string) => {
    try {
      await fetch(`/api/sites/${siteId}/stop`, { method: 'POST' });
      fetchSites();
    } catch (error) {
      console.error('Failed to stop site:', error);
    }
  };

  const handleRestartSite = async (siteId: string) => {
    try {
      await fetch(`/api/sites/${siteId}/restart`, { method: 'POST' });
      fetchSites();
    } catch (error) {
      console.error('Failed to restart site:', error);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site? This action cannot be undone.')) {
      return;
    }
    
    try {
      await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
      fetchSites();
      setSelectedIds(prev => prev.filter(id => id !== siteId));
    } catch (error) {
      console.error('Failed to delete site:', error);
    }
  };

  const handleBulkAction = async (action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (selectedIds.length === 0) return;
    
    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedIds.length} site(s)?`)) {
      return;
    }
    
    try {
      await fetch('/api/sites/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, siteIds: selectedIds }),
      });
      fetchSites();
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const handleToggleFavorite = async (siteId: string) => {
    try {
      await fetch(`/api/sites/${siteId}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !sites.find(s => s.id === siteId)?.isFavorite }),
      });
      fetchSites();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // =============================================================================
  // 🔍 FILTERING & SORTING
  // =============================================================================

  const filteredAndSortedSites = React.useMemo(() => {
    let result = [...sites];
    
    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        site =>
          site.name.toLowerCase().includes(searchLower) ||
          site.domain.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.status !== 'all') {
      result = result.filter(site => site.status === filters.status);
    }
    
    if (filters.type !== 'all') {
      result = result.filter(site => site.type === filters.type);
    }
    
    if (filters.sslStatus !== 'all') {
      result = result.filter(site => site.sslStatus === filters.sslStatus);
    }
    
    if (filters.autoRestart !== 'all') {
      result = result.filter(site => site.autoRestart === filters.autoRestart);
    }
    
    if (filters.favorites) {
      result = result.filter(site => site.isFavorite);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aVal = a[sort.column];
      const bVal = b[sort.column];
      
      if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [sites, filters, sort]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  const hasActiveFilters =
    filters.search ||
    filters.status !== 'all' ||
    filters.type !== 'all' ||
    filters.sslStatus !== 'all' ||
    filters.autoRestart !== 'all' ||
    filters.favorites;

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Sites"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sites' },
        ]}
        description="Manage your websites and applications"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
              onClick={fetchSites}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => router.push('/dashboard/sites/new')}
            >
              Add Site
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* SSL Expiry Warning */}
          {sites.some(s => s.sslStatus === 'expiring' || s.sslStatus === 'expired') && (
            <AlertBanner
              variant="warning"
              title="SSL Certificates Expiring"
              message={`${sites.filter(s => s.sslStatus === 'expiring').length} certificate(s) expiring soon, ${sites.filter(s => s.sslStatus === 'expired').length} expired`}
              action={{
                label: 'View SSL',
                onClick: () => router.push('/dashboard/ssl'),
              }}
              dismissible
            />
          )}

          {/* Site Health Warning */}
          {sites.some(s => s.healthStatus === 'unhealthy') && (
            <AlertBanner
              variant="error"
              title="Unhealthy Sites Detected"
              message={`${sites.filter(s => s.healthStatus === 'unhealthy').length} site(s) failed health checks`}
              action={{
                label: 'View Logs',
                onClick: () => router.push('/dashboard/logs'),
              }}
              dismissible
            />
          )}

          {/* Filters Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <Input
                    placeholder="Search sites..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    leftIcon={<Search className="w-4 h-4" />}
                    size="md"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
                    placeholder="All Status"
                    className="w-[140px]"
                  >
                    <Select.Item value="all">All Status</Select.Item>
                    <Select.Item value="running">Running</Select.Item>
                    <Select.Item value="stopped">Stopped</Select.Item>
                    <Select.Item value="error">Error</Select.Item>
                    <Select.Item value="maintenance">Maintenance</Select.Item>
                  </Select>

                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
                    placeholder="All Types"
                    className="w-[140px]"
                  >
                    <Select.Item value="all">All Types</Select.Item>
                    <Select.Item value="wordpress">WordPress</Select.Item>
                    <Select.Item value="static">Static</Select.Item>
                    <Select.Item value="php">PHP</Select.Item>
                    <Select.Item value="nodejs">Node.js</Select.Item>
                    <Select.Item value="proxy">Proxy</Select.Item>
                    <Select.Item value="docker">Docker</Select.Item>
                  </Select>

                  <Select
                    value={filters.sslStatus}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sslStatus: value as any }))}
                    placeholder="SSL Status"
                    className="w-[140px]"
                  >
                    <Select.Item value="all">All SSL</Select.Item>
                    <Select.Item value="active">Active</Select.Item>
                    <Select.Item value="expiring">Expiring</Select.Item>
                    <Select.Item value="expired">Expired</Select.Item>
                    <Select.Item value="none">None</Select.Item>
                  </Select>

                  <Toggle
                    label="Favorites"
                    checked={filters.favorites}
                    onCheckedChange={(checked) => setFilters(prev => ({ ...prev, favorites: checked }))}
                    size="sm"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border border-border rounded-md p-1">
                  <Button
                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Active Filters & Clear */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Filter className="w-4 h-4" />
                    <span>Active filters:</span>
                    {filters.search && (
                      <span className="px-2 py-0.5 bg-bg-overlay rounded text-text-primary">
                        Search: {filters.search}
                      </span>
                    )}
                    {filters.status !== 'all' && (
                      <span className="px-2 py-0.5 bg-bg-overlay rounded text-text-primary capitalize">
                        {filters.status}
                      </span>
                    )}
                    {filters.favorites && (
                      <span className="px-2 py-0.5 bg-bg-overlay rounded text-text-primary">
                        ⭐ Favorites
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({
                      search: '',
                      status: 'all',
                      type: 'all',
                      sslStatus: 'all',
                      autoRestart: 'all',
                      favorites: false,
                    })}
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <Card className="bg-accent-subtle border-accent-border">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-accent">
                    {selectedIds.length} site{selectedIds.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBulkAction('start')}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                    >
                      Start
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBulkAction('stop')}
                      leftIcon={<Square className="w-3.5 h-3.5" />}
                    >
                      Stop
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBulkAction('restart')}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Restart
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleBulkAction('delete')}
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIds([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sites Content */}
          {isLoading ? (
            // Loading Skeleton
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-4 h-4 rounded" />
                      <Skeleton className="w-48 h-4" />
                      <Skeleton className="w-24 h-4" />
                      <Skeleton className="w-20 h-4" />
                      <Skeleton className="w-16 h-4" />
                      <Skeleton className="w-24 h-4" />
                      <div className="ml-auto flex gap-2">
                        <Skeleton className="w-8 h-8 rounded" />
                        <Skeleton className="w-8 h-8 rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedSites.length === 0 ? (
            // Empty State
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-bg-overlay flex items-center justify-center mb-4">
                    <Globe className="w-8 h-8 text-text-muted" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {hasActiveFilters ? 'No sites match your filters' : 'No sites yet'}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4 max-w-md">
                    {hasActiveFilters
                      ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
                      : 'Create your first site to get started. You can host WordPress, static sites, PHP apps, and more.'}
                  </p>
                  {hasActiveFilters ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({
                        search: '',
                        status: 'all',
                        type: 'all',
                        sslStatus: 'all',
                        autoRestart: 'all',
                        favorites: false,
                      })}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => router.push('/dashboard/sites/new')}
                    >
                      Create Site
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : viewMode === 'table' ? (
            // Table View
            <Table
              data={filteredAndSortedSites}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              getRowId={(site) => site.id}
              columns={[
                {
                  key: 'name',
                  label: 'Site',
                  sortable: true,
                  width: '280px',
                  render: (site) => (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleFavorite(site.id)}
                        className="text-text-muted hover:text-warning transition-colors"
                      >
                        {site.isFavorite ? (
                          <Star className="w-4 h-4 fill-warning text-warning" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-text-primary">{site.name}</div>
                        <div className="text-xs text-text-secondary">{site.domain}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  sortable: true,
                  width: '120px',
                  render: (site) => (
                    <StatusBadge
                      status={STATUS_COLORS[site.status]}
                      label={site.status.charAt(0).toUpperCase() + site.status.slice(1)}
                      size="sm"
                      showDot
                      animated={site.status === 'running'}
                    />
                  ),
                },
                {
                  key: 'type',
                  label: 'Type',
                  sortable: true,
                  width: '100px',
                  render: (site) => (
                    <span className="text-sm text-text-secondary">
                      {SITE_TYPE_LABELS[site.type]}
                    </span>
                  ),
                },
                {
                  key: 'sslStatus',
                  label: 'SSL',
                  sortable: true,
                  width: '100px',
                  render: (site) => (
                    <StatusBadge
                      status={SSL_STATUS_COLORS[site.sslStatus]}
                      label={site.sslStatus.charAt(0).toUpperCase() + site.sslStatus.slice(1)}
                      size="sm"
                    />
                  ),
                },
                {
                  key: 'phpVersion',
                  label: 'PHP',
                  sortable: true,
                  width: '80px',
                  align: 'center',
                },
                {
                  key: 'requestsDay',
                  label: 'Requests/Day',
                  sortable: true,
                  width: '120px',
                  align: 'right',
                  render: (site) => (
                    <span className="text-sm text-text-primary font-medium">
                      {new Intl.NumberFormat().format(site.requestsDay)}
                    </span>
                  ),
                },
                {
                  key: 'avgResponseTime',
                  label: 'Response',
                  sortable: true,
                  width: '100px',
                  align: 'right',
                  render: (site) => (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        site.avgResponseTime < 200 ? 'text-success' :
                        site.avgResponseTime < 500 ? 'text-warning' : 'text-error'
                      )}
                    >
                      {site.avgResponseTime}ms
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  label: '',
                  width: '120px',
                  align: 'right',
                  render: (site) => (
                    <div className="flex items-center justify-end gap-1">
                      {site.status === 'running' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleStopSite(site.id)}
                          title="Stop site"
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleStartSite(site.id)}
                          title="Start site"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleRestartSite(site.id)}
                        title="Restart site"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="z-50 min-w-[180px] bg-bg-elevated border border-border rounded-md shadow-elevated p-1"
                            sideOffset={8}
                          >
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                              onClick={() => router.push(`/dashboard/sites/${site.id}`)}
                            >
                              <Settings className="w-4 h-4" />
                              Settings
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                              onClick={() => window.open(`https://${site.domain}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4" />
                              Visit Site
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                              onClick={() => router.push(`/dashboard/sites/${site.id}/logs`)}
                            >
                              <BarChart3 className="w-4 h-4" />
                              View Logs
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="h-px bg-border my-1" />
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                              onClick={() => handleDeleteSite(site.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  ),
                },
              ]}
              size="md"
              hoverable
              onSortChange={(column, direction) => {
                setSort({ column: column as keyof Site, direction: direction || 'asc' });
              }}
              sortColumn={sort.column}
              sortDirection={sort.direction}
            />
          ) : (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedSites.map((site) => (
                <Card
                  key={site.id}
                  className={cn(
                    'group',
                    'hover:border-border-hover',
                    'transition-all duration-150',
                    selectedIds.includes(site.id) && 'border-accent bg-accent-subtle/30'
                  )}
                >
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(site.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, site.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== site.id));
                            }
                          }}
                          className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                        />
                        <button
                          onClick={() => handleToggleFavorite(site.id)}
                          className="text-text-muted hover:text-warning transition-colors"
                        >
                          {site.isFavorite ? (
                            <Star className="w-4 h-4 fill-warning text-warning" />
                          ) : (
                            <StarOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <StatusBadge
                        status={STATUS_COLORS[site.status]}
                        size="sm"
                        showDot
                        animated={site.status === 'running'}
                      />
                    </div>

                    {/* Site Info */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-text-primary mb-1">{site.name}</h3>
                      <p className="text-sm text-text-secondary">{site.domain}</p>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div>
                        <span className="text-text-muted">Type:</span>
                        <span className="ml-1 text-text-primary">{SITE_TYPE_LABELS[site.type]}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">PHP:</span>
                        <span className="ml-1 text-text-primary">{site.phpVersion}</span>
                      </div>
                      <div>
                        <span className="text-text-muted">SSL:</span>
                        <StatusBadge
                          status={SSL_STATUS_COLORS[site.sslStatus]}
                          label={site.sslStatus}
                          size="sm"
                        />
                      </div>
                      <div>
                        <span className="text-text-muted">Requests:</span>
                        <span className="ml-1 text-text-primary">
                          {new Intl.NumberFormat('en', { notation: 'compact' }).format(site.requestsDay)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-border">
                      {site.status === 'running' ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                          leftIcon={<Square className="w-3.5 h-3.5" />}
                          onClick={() => handleStopSite(site.id)}
                        >
                          Stop
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                          onClick={() => handleStartSite(site.id)}
                        >
                          Start
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => router.push(`/dashboard/sites/${site.id}`)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filteredAndSortedSites.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <p className="text-sm text-text-secondary">
                Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, filteredAndSortedSites.length)} to{' '}
                {Math.min(pagination.page * pagination.pageSize, filteredAndSortedSites.length)} of{' '}
                {filteredAndSortedSites.length} sites
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={pagination.page * pagination.pageSize >= filteredAndSortedSites.length}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}