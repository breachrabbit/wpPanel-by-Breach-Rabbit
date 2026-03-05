'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Site Logs Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Comprehensive log viewer with live tail, filtering, search, and download
// =============================================================================

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell, PageHeader, PageContent } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  Play,
  Square,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Terminal,
  ExternalLink,
  Maximize2,
  Minimize2,
  WrapText,
  FontSize,
  Trash2,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type LogType = 'access' | 'error' | 'php' | 'system' | 'wp';
type LogLevel = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL';
type ViewMode = 'live' | 'history';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source: string;
  context?: Record<string, any>;
  raw: string;
}

interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byHour: Array<{ hour: string; count: number }>;
  topErrors: Array<{ message: string; count: number }>;
  topIPs: Array<{ ip: string; count: number }>;
  topURLs: Array<{ url: string; count: number }>;
}

interface FilterState {
  level: LogLevel | 'all';
  search: string;
  dateFrom: string;
  dateTo: string;
  source: string;
}

interface LogConfig {
  type: LogType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  available: boolean;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const LOG_TYPES: LogConfig[] = [
  { type: 'access', label: 'Access Log', icon: FileText, path: '/var/www/site/access.log', available: true },
  { type: 'error', label: 'Error Log', icon: AlertCircle, path: '/var/www/site/error.log', available: true },
  { type: 'php', label: 'PHP Log', icon: Terminal, path: '/var/log/php8.3-fpm.log', available: true },
  { type: 'system', label: 'System Log', icon: Settings, path: '/var/log/syslog', available: true },
  { type: 'wp', label: 'WordPress Log', icon: Activity, path: '/var/www/site/wp-content/debug.log', available: false },
];

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: 'text-text-muted',
  INFO: 'text-info',
  NOTICE: 'text-text-secondary',
  WARNING: 'text-warning',
  ERROR: 'text-error',
  CRITICAL: 'text-error font-bold',
};

const LOG_LEVEL_BG: Record<LogLevel, string> = {
  DEBUG: 'bg-text-muted/10',
  INFO: 'bg-info-subtle',
  NOTICE: 'bg-bg-overlay',
  WARNING: 'bg-warning-subtle',
  ERROR: 'bg-error-subtle',
  CRITICAL: 'bg-error-subtle',
};

const parseLogLevel = (line: string): LogLevel => {
  const upper = line.toUpperCase();
  if (upper.includes('CRITICAL') || upper.includes('FATAL') || upper.includes('EMERG')) return 'CRITICAL';
  if (upper.includes('ERROR') || upper.includes('ERR')) return 'ERROR';
  if (upper.includes('WARNING') || upper.includes('WARN')) return 'WARNING';
  if (upper.includes('NOTICE')) return 'NOTICE';
  if (upper.includes('INFO')) return 'INFO';
  return 'DEBUG';
};

const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// =============================================================================
// 🏗️ SITE LOGS PAGE COMPONENT
// =============================================================================

export default function SiteLogsPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // State
  const [activeLogType, setActiveLogType] = useState<LogType>('error');
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    level: 'all',
    search: '',
    dateFrom: '',
    dateTo: '',
    source: '',
  });
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [showFilters, setShowFilters] = useState(false);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchLogs = useCallback(async (type: LogType = activeLogType) => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockLogs: LogEntry[] = Array.from({ length: 100 }).map((_, i) => {
        const levels: LogLevel[] = ['INFO', 'INFO', 'INFO', 'WARNING', 'ERROR', 'DEBUG', 'NOTICE'];
        const level = levels[Math.floor(Math.random() * levels.length)];
        const messages = [
          'Request processed successfully',
          'Database query executed in 45ms',
          'Cache hit for key: user_123',
          'Slow query detected (>1000ms)',
          'Failed login attempt from 192.168.1.100',
          'PHP warning: undefined variable',
          'SSL certificate verified',
          'Connection timeout after 30s',
          'File uploaded: image.jpg (2.5MB)',
          'Cron job completed: cleanup_temp',
        ];
        
        return {
          id: `log-${i}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString(),
          level,
          message: messages[Math.floor(Math.random() * messages.length)],
          source: type === 'access' ? '192.168.1.' + Math.floor(Math.random() * 255) : 'php-fpm',
          raw: `[${new Date().toISOString()}] [${level}] ${messages[Math.floor(Math.random() * messages.length)]}`,
        };
      });
      
      const mockStats: LogStats = {
        total: mockLogs.length,
        byLevel: {
          DEBUG: 15,
          INFO: 50,
          NOTICE: 10,
          WARNING: 15,
          ERROR: 8,
          CRITICAL: 2,
        },
        byHour: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i.toString().padStart(2, '0')}:00`,
          count: Math.floor(Math.random() * 100),
        })),
        topErrors: [
          { message: 'Connection timeout', count: 5 },
          { message: 'Failed login attempt', count: 3 },
          { message: 'PHP warning', count: 2 },
        ],
        topIPs: [
          { ip: '192.168.1.100', count: 45 },
          { ip: '192.168.1.101', count: 32 },
          { ip: '192.168.1.102', count: 28 },
        ],
        topURLs: [
          { url: '/wp-admin', count: 120 },
          { url: '/wp-login.php', count: 85 },
          { url: '/api/data', count: 67 },
        ],
      };
      
      setLogs(mockLogs);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeLogType]);

  const fetchLiveLogs = useCallback(async () => {
    // Mock live log streaming - replace with WebSocket
    const interval = setInterval(() => {
      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: ['INFO', 'WARNING', 'ERROR'][Math.floor(Math.random() * 3)] as LogLevel,
        message: `Live log entry ${Date.now()}`,
        source: 'live-stream',
        raw: `[${new Date().toISOString()}] [INFO] Live log entry`,
      };
      
      setLogs(prev => {
        const updated = [...prev, newLog];
        return updated.slice(-500); // Keep last 500 entries
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, activeLogType]);

  useEffect(() => {
    if (isLive && viewMode === 'live') {
      const cleanup = fetchLiveLogs();
      return cleanup;
    }
  }, [isLive, viewMode, fetchLiveLogs]);

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleRefresh = () => {
    fetchLogs();
  };

  const handleToggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      setViewMode('live');
    }
  };

  const handleDownload = async () => {
    try {
      // Mock download
      console.log('Downloading logs:', activeLogType);
      // In real implementation: trigger download from API
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }
    
    try {
      console.log('Clearing logs:', activeLogType);
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear:', error);
    }
  };

  const handleCopyLog = async (log: LogEntry) => {
    try {
      await navigator.clipboard.writeText(log.raw);
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCopyAll = async () => {
    try {
      const allLogs = logs.map(l => l.raw).join('\n');
      await navigator.clipboard.writeText(allLogs);
      // Show toast
    } catch (error) {
      console.error('Failed to copy all:', error);
    }
  };

  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      if (filters.level !== 'all' && log.level !== filters.level) {
        return false;
      }
      if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.dateFrom && new Date(log.timestamp) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(log.timestamp) > new Date(filters.dateTo)) {
        return false;
      }
      return true;
    });
  }, [logs, filters]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  const activeLogConfig = LOG_TYPES.find(l => l.type === activeLogType)!;

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Logs"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sites', href: '/dashboard/sites' },
          { label: 'Site', href: `/dashboard/sites/${siteId}` },
          { label: 'Logs' },
        ]}
        description={`View and analyze logs for ${activeLogConfig.label}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={isLive ? 'primary' : 'secondary'}
              size="sm"
              onClick={handleToggleLive}
              leftIcon={isLive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            >
              {isLive ? 'Stop Live' : 'Live Tail'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
              disabled={isLoading || isLive}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
                  Settings
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[180px] bg-bg-elevated border border-border rounded-md shadow-elevated p-1"
                  sideOffset={8}
                >
                  <DropdownMenu.Item
                    className="flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                    onClick={() => setWrapLines(!wrapLines)}
                  >
                    <span className="flex items-center gap-2">
                      <WrapText className="w-4 h-4" />
                      Wrap Lines
                    </span>
                    {wrapLines && <Check className="w-4 h-4 text-accent" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                    onClick={() => setAutoScroll(!autoScroll)}
                  >
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Auto Scroll
                    </span>
                    {autoScroll && <Check className="w-4 h-4 text-accent" />}
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <div className="px-3 py-2 text-xs text-text-muted">Font Size</div>
                  {(['sm', 'md', 'lg'] as const).map(size => (
                    <DropdownMenu.Item
                      key={size}
                      className="flex items-center justify-between px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                      onClick={() => setFontSize(size)}
                    >
                      <span>{size === 'sm' ? 'Small' : size === 'md' ? 'Medium' : 'Large'}</span>
                      {fontSize === size && <Check className="w-4 h-4 text-accent" />}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item
                    className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                    onClick={handleClearLogs}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Logs
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-4">
          {/* Log Type Tabs */}
          <Card>
            <CardContent className="p-2">
              <Tabs value={activeLogType} onValueChange={(v) => setActiveLogType(v as LogType)}>
                <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1 bg-transparent h-auto">
                  {LOG_TYPES.filter(l => l.available).map(log => {
                    const Icon = log.icon;
                    return (
                      <TabsTrigger
                        key={log.type}
                        value={log.type}
                        className="data-[state=active]:bg-accent data-[state=active]:text-white flex items-center gap-2"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{log.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'history' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('history')}
                leftIcon={<Clock className="w-4 h-4" />}
              >
                History
              </Button>
              <Button
                variant={viewMode === 'live' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('live')}
                leftIcon={<Activity className="w-4 h-4" />}
              >
                Live
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="w-4 h-4" />}
              >
                Filters
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 p-0"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Log Level</label>
                    <Select
                      value={filters.level}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, level: value as any }))}
                      className="w-full"
                    >
                      <Select.Item value="all">All Levels</Select.Item>
                      <Select.Item value="DEBUG">DEBUG</Select.Item>
                      <Select.Item value="INFO">INFO</Select.Item>
                      <Select.Item value="NOTICE">NOTICE</Select.Item>
                      <Select.Item value="WARNING">WARNING</Select.Item>
                      <Select.Item value="ERROR">ERROR</Select.Item>
                      <Select.Item value="CRITICAL">CRITICAL</Select.Item>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <Input
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        placeholder="Search logs..."
                        className="pl-9"
                      />
                      {filters.search && (
                        <button
                          onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">From Date</label>
                    <Input
                      type="datetime-local"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">To Date</label>
                    <Input
                      type="datetime-local"
                      value={filters.dateTo}
                      onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ level: 'all', search: '', dateFrom: '', dateTo: '', source: '' })}
                  >
                    Clear Filters
                  </Button>
                  <span className="text-sm text-text-muted">
                    Showing {filteredLogs.length} of {logs.length} logs
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Log Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Total Logs</div>
                  <div className="text-2xl font-bold text-text-primary">{stats.total.toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Errors</div>
                  <div className="text-2xl font-bold text-error">{stats.byLevel.ERROR}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Warnings</div>
                  <div className="text-2xl font-bold text-warning">{stats.byLevel.WARNING}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Info</div>
                  <div className="text-2xl font-bold text-info">{stats.byLevel.INFO}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Top IP</div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {stats.topIPs[0]?.ip || 'N/A'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Top URL</div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {stats.topURLs[0]?.url || 'N/A'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Logs Container */}
          <Card className={cn(isFullscreen && 'fixed inset-4 z-50')}>
            <CardHeader className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <activeLogConfig.icon className="w-4 h-4" />
                  {activeLogConfig.label}
                  {isLive && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      Live
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleCopyAll}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                  >
                    Copy All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                // Loading Skeleton
                <div className="space-y-2 p-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {filters.search || filters.level !== 'all' ? 'No logs match your filters' : 'No logs available'}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    {filters.search || filters.level !== 'all'
                      ? 'Try adjusting your search or filter criteria'
                      : 'Logs will appear here as they are generated'}
                  </p>
                  {(filters.search || filters.level !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters({ level: 'all', search: '', dateFrom: '', dateTo: '', source: '' })}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                // Logs List
                <div
                  ref={logsContainerRef}
                  className={cn(
                    'h-[600px] overflow-y-auto wp-scrollbar',
                    fontSize === 'sm' && 'text-xs',
                    fontSize === 'md' && 'text-sm',
                    fontSize === 'lg' && 'text-base'
                  )}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        'flex items-start gap-3 px-4 py-2 border-b border-border hover:bg-bg-overlay transition-colors',
                        LOG_LEVEL_BG[log.level],
                        selectedLog?.id === log.id && 'ring-2 ring-accent ring-inset'
                      )}
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <div className="flex-shrink-0 w-32 text-text-muted">
                        {formatTimestamp(log.timestamp)}
                      </div>
                      
                      {/* Level Badge */}
                      <div className="flex-shrink-0">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            LOG_LEVEL_COLORS[log.level]
                          )}
                        >
                          {log.level}
                        </span>
                      </div>
                      
                      {/* Message */}
                      <div className={cn('flex-1 text-text-primary', wrapLines && 'whitespace-pre-wrap', !wrapLines && 'truncate')}>
                        {log.message}
                      </div>
                      
                      {/* Source */}
                      <div className="flex-shrink-0 w-24 text-xs text-text-secondary truncate">
                        {log.source}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLog(log);
                          }}
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Log Details Panel */}
          {selectedLog && (
            <Card>
              <CardHeader className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Log Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedLog(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Timestamp</div>
                    <div className="text-sm text-text-primary">{formatTimestamp(selectedLog.timestamp)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-1">Level</div>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        LOG_LEVEL_COLORS[selectedLog.level]
                      )}
                    >
                      {selectedLog.level}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-1">Source</div>
                    <div className="text-sm text-text-primary">{selectedLog.source}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-1">Log Type</div>
                    <div className="text-sm text-text-primary">{activeLogConfig.label}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-text-muted mb-1">Message</div>
                  <div className="text-sm text-text-primary p-3 bg-bg-overlay rounded-md font-mono">
                    {selectedLog.message}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-text-muted mb-1">Raw Log</div>
                  <div className="text-xs text-text-secondary p-3 bg-bg-base rounded-md font-mono overflow-x-auto">
                    {selectedLog.raw}
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLog(selectedLog)}
                    leftIcon={<Copy className="w-3.5 h-3.5" />}
                  >
                    Copy Raw
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Level Distribution Chart Placeholder */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Log Level Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chart will be implemented with Recharts</p>
                    <p className="text-xs mt-1">Log levels breakdown by count</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Errors Table */}
          {stats && stats.topErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Top Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stats.topErrors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted w-6">{index + 1}</span>
                        <span className="text-sm text-text-primary">{error.message}</span>
                      </div>
                      <span className="text-sm font-medium text-error">{error.count} occurrences</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContent>
    </AppShell>
  );
}