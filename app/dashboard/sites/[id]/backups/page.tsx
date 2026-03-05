'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Site Backups Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Restic-based backup management with schedules, restore, and multiple storage
// =============================================================================

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { AppShell, PageHeader, PageContent, Section } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { UsageBar } from '@/components/ui/UsageBar';
import { cn } from '@/lib/utils';
import {
  HardDrive,
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Clock,
  Calendar,
  Settings,
  Database,
  FolderOpen,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  Plus,
  Copy,
  ExternalLink,
  Search,
  Filter,
  MoreVertical,
  RotateCcw,
  Archive,
  Unarchive,
  Server,
  Cloud,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Info,
  BarChart3,
  PieChart,
  History,
  Play,
  Pause,
  Edit,
  Save,
  Zap,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type BackupType = 'full' | 'incremental' | 'database' | 'files';
type BackupStatus = 'completed' | 'running' | 'failed' | 'pending';
type StorageType = 'local' | 's3' | 'sftp' | 'b2';
type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

interface Backup {
  id: string;
  snapshotId: string;
  type: BackupType;
  status: BackupStatus;
  sizeBytes: number;
  sizeUncompressed?: number;
  duration?: number; // seconds
  createdAt: string;
  completedAt?: string;
  storage: StorageType;
  retentionDays: number;
  tags: string[];
  filesCount?: number;
  databasesCount?: number;
}

interface BackupSchedule {
  id: string;
  name: string;
  frequency: ScheduleFrequency;
  cronExpression?: string;
  type: BackupType;
  storage: StorageType;
  retentionDays: number;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  successCount: number;
  failureCount: number;
}

interface StorageConfig {
  type: StorageType;
  name: string;
  isDefault: boolean;
  config: {
    path?: string; // local
    bucket?: string; // s3
    region?: string; // s3
    endpoint?: string; // s3 compatible
    host?: string; // sftp
    port?: number; // sftp
    username?: string; // sftp
    accountId?: string; // b2
    bucketId?: string; // b2
  };
  usedBytes: number;
  totalBytes?: number;
}

interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackupAt?: string;
  nextScheduledAt?: string;
  successRate: number;
  byType: Record<BackupType, number>;
  byStatus: Record<BackupStatus, number>;
  storageUsage: Array<{ storage: string; used: number; total?: number }>;
}

interface RestoreOptions {
  mode: 'full' | 'files' | 'database';
  files?: string[];
  databases?: string[];
  overwriteExisting: boolean;
  createNewSite?: boolean;
  newSiteName?: string;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const BACKUP_TYPE_LABELS: Record<BackupType, string> = {
  full: 'Full Backup',
  incremental: 'Incremental',
  database: 'Database Only',
  files: 'Files Only',
};

const BACKUP_TYPE_ICONS: Record<BackupType, React.ComponentType<{ className?: string }>> = {
  full: Archive,
  incremental: FileText,
  database: Database,
  files: FolderOpen,
};

const STORAGE_TYPE_LABELS: Record<StorageType, string> = {
  local: 'Local Storage',
  s3: 'Amazon S3',
  sftp: 'SFTP Server',
  b2: 'Backblaze B2',
};

const STORAGE_TYPE_ICONS: Record<StorageType, React.ComponentType<{ className?: string }>> = {
  local: Server,
  s3: Cloud,
  sftp: Lock,
  b2: Cloud,
};

const SCHEDULE_FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  hourly: 'Every Hour',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom Cron',
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// =============================================================================
// 🏗️ SITE BACKUPS PAGE COMPONENT
// =============================================================================

export default function SiteBackupsPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'backups' | 'schedules' | 'storage'>('backups');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [storageConfigs, setStorageConfigs] = useState<StorageConfig[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  
  // UI State
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [createProgress, setCreateProgress] = useState<{
    isRunning: boolean;
    progress: number;
    currentStep: string;
    estimatedTime?: number;
  }>({
    isRunning: false,
    progress: 0,
    currentStep: '',
  });
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreOptions, setRestoreOptions] = useState<RestoreOptions>({
    mode: 'full',
    overwriteExisting: false,
  });
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<BackupType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<BackupStatus | 'all'>('all');
  
  // Modals
  const [isCreateBackupModalOpen, setIsCreateBackupModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [selectedBackupFiles, setSelectedBackupFiles] = useState<string[]>([]);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchBackups = useCallback(async () => {
    try {
      // Mock data - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockBackups: Backup[] = [
        {
          id: '1',
          snapshotId: 'snap-abc123',
          type: 'full',
          status: 'completed',
          sizeBytes: 1250000000,
          sizeUncompressed: 2500000000,
          duration: 245,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          completedAt: new Date(Date.now() - 86400000 + 245000).toISOString(),
          storage: 'local',
          retentionDays: 30,
          tags: ['manual', 'pre-update'],
          filesCount: 15234,
          databasesCount: 3,
        },
        {
          id: '2',
          snapshotId: 'snap-def456',
          type: 'incremental',
          status: 'completed',
          sizeBytes: 150000000,
          duration: 45,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          completedAt: new Date(Date.now() - 172800000 + 45000).toISOString(),
          storage: 's3',
          retentionDays: 7,
          tags: ['scheduled', 'daily'],
          filesCount: 234,
          databasesCount: 1,
        },
        {
          id: '3',
          snapshotId: 'snap-ghi789',
          type: 'database',
          status: 'completed',
          sizeBytes: 45000000,
          duration: 12,
          createdAt: new Date(Date.now() - 259200000).toISOString(),
          completedAt: new Date(Date.now() - 259200000 + 12000).toISOString(),
          storage: 'local',
          retentionDays: 14,
          tags: ['scheduled'],
          databasesCount: 3,
        },
        {
          id: '4',
          snapshotId: 'snap-jkl012',
          type: 'full',
          status: 'failed',
          sizeBytes: 0,
          createdAt: new Date(Date.now() - 345600000).toISOString(),
          storage: 's3',
          retentionDays: 30,
          tags: ['manual'],
        },
        {
          id: '5',
          snapshotId: 'snap-mno345',
          type: 'incremental',
          status: 'running',
          sizeBytes: 0,
          createdAt: new Date().toISOString(),
          storage: 'local',
          retentionDays: 7,
          tags: ['scheduled'],
        },
      ];
      
      const mockSchedules: BackupSchedule[] = [
        {
          id: '1',
          name: 'Daily Full Backup',
          frequency: 'daily',
          type: 'full',
          storage: 'local',
          retentionDays: 30,
          enabled: true,
          lastRunAt: new Date(Date.now() - 86400000).toISOString(),
          nextRunAt: new Date(Date.now() + 43200000).toISOString(),
          successCount: 45,
          failureCount: 2,
        },
        {
          id: '2',
          name: 'Hourly Incremental',
          frequency: 'hourly',
          type: 'incremental',
          storage: 's3',
          retentionDays: 7,
          enabled: true,
          lastRunAt: new Date(Date.now() - 3600000).toISOString(),
          nextRunAt: new Date(Date.now() + 1800000).toISOString(),
          successCount: 720,
          failureCount: 15,
        },
        {
          id: '3',
          name: 'Weekly Database Backup',
          frequency: 'weekly',
          type: 'database',
          storage: 'b2',
          retentionDays: 90,
          enabled: false,
          lastRunAt: new Date(Date.now() - 604800000).toISOString(),
          successCount: 52,
          failureCount: 1,
        },
      ];
      
      const mockStorageConfigs: StorageConfig[] = [
        {
          type: 'local',
          name: 'Local Storage',
          isDefault: true,
          config: { path: '/var/backups/site-' + siteId },
          usedBytes: 15000000000,
          totalBytes: 100000000000,
        },
        {
          type: 's3',
          name: 'AWS S3',
          isDefault: false,
          config: { bucket: 'my-backups', region: 'us-east-1' },
          usedBytes: 5000000000,
        },
        {
          type: 'b2',
          name: 'Backblaze B2',
          isDefault: false,
          config: { bucketId: 'abc123', accountId: 'xyz789' },
          usedBytes: 2000000000,
        },
      ];
      
      const mockStats: BackupStats = {
        totalBackups: mockBackups.length,
        totalSize: mockBackups.reduce((acc, b) => acc + b.sizeBytes, 0),
        lastBackupAt: mockBackups.find(b => b.status === 'completed')?.createdAt,
        nextScheduledAt: mockSchedules.find(s => s.enabled)?.nextRunAt,
        successRate: 95,
        byType: { full: 2, incremental: 2, database: 1, files: 0 },
        byStatus: { completed: 3, running: 1, failed: 1, pending: 0 },
        storageUsage: [
          { storage: 'local', used: 15000000000, total: 100000000000 },
          { storage: 's3', used: 5000000000 },
          { storage: 'b2', used: 2000000000 },
        ],
      };
      
      setBackups(mockBackups);
      setSchedules(mockSchedules);
      setStorageConfigs(mockStorageConfigs);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchBackups();
    
    // Poll for running backups
    const interval = setInterval(() => {
      const runningBackups = backups.filter(b => b.status === 'running');
      if (runningBackups.length > 0) {
        fetchBackups();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [fetchBackups, backups]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleCreateBackup = async (type: BackupType, storage: StorageType) => {
    setIsCreatingBackup(true);
    setCreateProgress({
      isRunning: true,
      progress: 0,
      currentStep: 'Initializing backup...',
      estimatedTime: 300,
    });
    
    try {
      // Mock backup creation with progress
      const steps = [
        { progress: 10, step: 'Creating snapshot...' },
        { progress: 30, step: 'Backing up files...' },
        { progress: 60, step: 'Backing up databases...' },
        { progress: 80, step: 'Compressing data...' },
        { progress: 90, step: 'Uploading to storage...' },
        { progress: 100, step: 'Finalizing backup...' },
      ];
      
      for (const step of steps) {
        setCreateProgress(prev => ({
          ...prev,
          progress: step.progress,
          currentStep: step.step,
        }));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      await fetchBackups();
      setIsCreateBackupModalOpen(false);
    } catch (error) {
      console.error('Failed to create backup:', error);
    } finally {
      setIsCreatingBackup(false);
      setCreateProgress({ isRunning: false, progress: 0, currentStep: '' });
    }
  };

  const handleRestoreBackup = async (backup: Backup, options: RestoreOptions) => {
    setIsRestoring(true);
    try {
      // Mock restore
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Restoring backup:', backup.id, options);
      setIsRestoreModalOpen(false);
      setSelectedBackup(null);
    } catch (error) {
      console.error('Failed to restore backup:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Mock delete
      setBackups(prev => prev.filter(b => b.id !== backupId));
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  };

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      // Mock download
      console.log('Downloading backup:', backup.id);
    } catch (error) {
      console.error('Failed to download backup:', error);
    }
  };

  const handleViewFiles = async (backup: Backup) => {
    setSelectedBackup(backup);
    setIsFilesModalOpen(true);
    // Mock files list
    setSelectedBackupFiles([
      '/var/www/site/wp-config.php',
      '/var/www/site/wp-content/uploads/2024/01/image.jpg',
      '/var/www/site/wp-content/plugins/',
      '/var/www/site/wp-content/themes/',
    ]);
  };

  // =============================================================================
  // 🔍 FILTERING
  // =============================================================================

  const filteredBackups = React.useMemo(() => {
    return backups.filter(backup => {
      if (filterType !== 'all' && backup.type !== filterType) return false;
      if (filterStatus !== 'all' && backup.status !== filterStatus) return false;
      if (searchQuery && !backup.snapshotId.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [backups, filterType, filterStatus, searchQuery]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Backups"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sites', href: '/dashboard/sites' },
          { label: 'Site', href: `/dashboard/sites/${siteId}` },
          { label: 'Backups' },
        ]}
        description="Manage backups and restore points"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchBackups}
              leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateBackupModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Backup
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Backup in Progress Alert */}
          {createProgress.isRunning && (
            <AlertBanner
              variant="info"
              title="Backup in Progress"
              message={createProgress.currentStep}
              dismissible={false}
            >
              <div className="mt-3 space-y-2">
                <ProgressBar
                  value={createProgress.progress}
                  variant="info"
                  showLabel
                  animated
                />
                {createProgress.estimatedTime && (
                  <div className="text-xs text-text-secondary">
                    Estimated time remaining: {Math.ceil(createProgress.estimatedTime * (1 - createProgress.progress / 100))}s
                  </div>
                )}
              </div>
            </AlertBanner>
          )}

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Total Backups</div>
                  <div className="text-2xl font-bold text-text-primary">{stats.totalBackups}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Total Size</div>
                  <div className="text-2xl font-bold text-text-primary">{formatBytes(stats.totalSize)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Last Backup</div>
                  <div className="text-sm font-bold text-text-primary">
                    {stats.lastBackupAt ? getRelativeTime(stats.lastBackupAt) : 'Never'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Next Scheduled</div>
                  <div className="text-sm font-bold text-text-primary">
                    {stats.nextScheduledAt ? getRelativeTime(stats.nextScheduledAt) : 'None'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Success Rate</div>
                  <div className={cn(
                    'text-2xl font-bold',
                    stats.successRate >= 90 ? 'text-success' :
                    stats.successRate >= 70 ? 'text-warning' : 'text-error'
                  )}>
                    {stats.successRate}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-xs text-text-muted mb-1">Running</div>
                  <div className="text-2xl font-bold text-info">
                    {stats.byStatus.running || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Card>
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'backups' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('backups')}
                  leftIcon={<HardDrive className="w-4 h-4" />}
                >
                  Backups
                </Button>
                <Button
                  variant={activeTab === 'schedules' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('schedules')}
                  leftIcon={<Clock className="w-4 h-4" />}
                >
                  Schedules
                </Button>
                <Button
                  variant={activeTab === 'storage' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('storage')}
                  leftIcon={<Server className="w-4 h-4" />}
                >
                  Storage
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Backups Tab */}
          {activeTab === 'backups' && (
            <div className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <Input
                        placeholder="Search snapshots..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        size="sm"
                      />
                    </div>
                    
                    <Select
                      value={filterType}
                      onValueChange={(value) => setFilterType(value as any)}
                      className="w-[150px]"
                    >
                      <Select.Item value="all">All Types</Select.Item>
                      <Select.Item value="full">Full</Select.Item>
                      <Select.Item value="incremental">Incremental</Select.Item>
                      <Select.Item value="database">Database</Select.Item>
                      <Select.Item value="files">Files</Select.Item>
                    </Select>
                    
                    <Select
                      value={filterStatus}
                      onValueChange={(value) => setFilterStatus(value as any)}
                      className="w-[150px]"
                    >
                      <Select.Item value="all">All Status</Select.Item>
                      <Select.Item value="completed">Completed</Select.Item>
                      <Select.Item value="running">Running</Select.Item>
                      <Select.Item value="failed">Failed</Select.Item>
                      <Select.Item value="pending">Pending</Select.Item>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Backups List */}
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-10 h-10 rounded" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-20" />
                          <div className="ml-auto flex gap-2">
                            <Skeleton className="w-8 h-8 rounded" />
                            <Skeleton className="w-8 h-8 rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredBackups.length === 0 ? (
                <Card>
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <HardDrive className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                          ? 'No backups match your filters'
                          : 'No backups yet'}
                      </h3>
                      <p className="text-sm text-text-secondary mb-4 max-w-md">
                        {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                          ? 'Try adjusting your search or filter criteria'
                          : 'Create your first backup to protect your site data'}
                      </p>
                      {!searchQuery && filterType === 'all' && filterStatus === 'all' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setIsCreateBackupModalOpen(true)}
                          leftIcon={<Plus className="w-4 h-4" />}
                        >
                          Create Backup
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredBackups.map((backup) => {
                    const TypeIcon = BACKUP_TYPE_ICONS[backup.type];
                    const StorageIcon = STORAGE_TYPE_ICONS[backup.storage];
                    
                    return (
                      <Card
                        key={backup.id}
                        className={cn(
                          'transition-all',
                          backup.status === 'running' && 'border-info bg-info-subtle/10'
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {/* Icon */}
                            <div
                              className={cn(
                                'w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0',
                                backup.type === 'full' && 'bg-accent-subtle text-accent',
                                backup.type === 'incremental' && 'bg-info-subtle text-info',
                                backup.type === 'database' && 'bg-success-subtle text-success',
                                backup.type === 'files' && 'bg-warning-subtle text-warning'
                              )}
                            >
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-text-primary">
                                  {BACKUP_TYPE_LABELS[backup.type]}
                                </span>
                                <StatusBadge
                                  status={
                                    backup.status === 'completed' ? 'success' :
                                    backup.status === 'running' ? 'info' :
                                    backup.status === 'failed' ? 'error' : 'neutral'
                                  }
                                  size="sm"
                                  showDot
                                  animated={backup.status === 'running'}
                                />
                              </div>
                              <div className="flex items-center gap-4 text-xs text-text-secondary">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {getRelativeTime(backup.createdAt)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <StorageIcon className="w-3 h-3" />
                                  {STORAGE_TYPE_LABELS[backup.storage]}
                                </span>
                                {backup.duration && (
                                  <span className="flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {formatDuration(backup.duration)}
                                  </span>
                                )}
                                <span>{formatBytes(backup.sizeBytes)}</span>
                              </div>
                            </div>
                            
                            {/* Compression Ratio */}
                            {backup.sizeUncompressed && backup.sizeUncompressed > backup.sizeBytes && (
                              <div className="hidden lg:block text-xs text-text-secondary">
                                <div className="text-text-muted mb-1">Compression</div>
                                <div className="font-medium text-text-primary">
                                  {Math.round((1 - backup.sizeBytes / backup.sizeUncompressed) * 100)}%
                                </div>
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                                      onClick={() => {
                                        setSelectedBackup(backup);
                                        setIsRestoreModalOpen(true);
                                      }}
                                      disabled={backup.status !== 'completed'}
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                      Restore
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                      onClick={() => handleViewFiles(backup)}
                                      disabled={backup.status !== 'completed'}
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Files
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                      onClick={() => handleDownloadBackup(backup)}
                                      disabled={backup.status !== 'completed'}
                                    >
                                      <Download className="w-4 h-4" />
                                      Download
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Separator className="h-px bg-border my-1" />
                                    <DropdownMenu.Item
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                                      onClick={() => handleDeleteBackup(backup.id)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete
                                    </DropdownMenu.Item>
                                  </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                              </DropdownMenu.Root>
                            </div>
                          </div>
                          
                          {/* Running Backup Progress */}
                          {backup.status === 'running' && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
                                <span>Backing up files...</span>
                                <span>45%</span>
                              </div>
                              <ProgressBar value={45} variant="info" size="sm" showLabel={false} animated />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Schedules Tab */}
          {activeTab === 'schedules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Automated backup schedules for this site
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsScheduleModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Schedule
                </Button>
              </div>
              
              {schedules.length === 0 ? (
                <Card>
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Clock className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        No backup schedules
                      </h3>
                      <p className="text-sm text-text-secondary mb-4">
                        Set up automated backups to protect your site regularly
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsScheduleModalOpen(true)}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Create Schedule
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={cn(
                                'w-10 h-10 rounded-md flex items-center justify-center',
                                schedule.enabled ? 'bg-success-subtle text-success' : 'bg-bg-overlay text-text-muted'
                              )}
                            >
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-text-primary">{schedule.name}</span>
                                <StatusBadge
                                  status={schedule.enabled ? 'success' : 'neutral'}
                                  label={schedule.enabled ? 'Active' : 'Disabled'}
                                  size="sm"
                                />
                              </div>
                              <div className="flex items-center gap-4 text-xs text-text-secondary">
                                <span>{SCHEDULE_FREQUENCY_LABELS[schedule.frequency]}</span>
                                <span>{BACKUP_TYPE_LABELS[schedule.type]}</span>
                                <span>{STORAGE_TYPE_LABELS[schedule.storage]}</span>
                                <span>Retention: {schedule.retentionDays} days</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                              <div className="text-xs text-text-muted mb-1">Last Run</div>
                              <div className="text-sm text-text-primary">
                                {schedule.lastRunAt ? getRelativeTime(schedule.lastRunAt) : 'Never'}
                              </div>
                            </div>
                            <div className="text-right hidden md:block">
                              <div className="text-xs text-text-muted mb-1">Next Run</div>
                              <div className="text-sm text-text-primary">
                                {schedule.nextRunAt ? getRelativeTime(schedule.nextRunAt) : '—'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-text-muted mb-1">Success Rate</div>
                              <div className={cn(
                                'text-sm font-medium',
                                schedule.successCount + schedule.failureCount > 0
                                  ? schedule.successCount / (schedule.successCount + schedule.failureCount) >= 0.9
                                    ? 'text-success'
                                    : 'text-warning'
                                  : 'text-text-secondary'
                              )}>
                                {schedule.successCount}/{schedule.successCount + schedule.failureCount}
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
                                  className="z-50 min-w-[180px] bg-bg-elevated border border-border rounded-md shadow-elevated p-1"
                                  sideOffset={8}
                                >
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                    onClick={() => {}}
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit Schedule
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                    onClick={() => {}}
                                  >
                                    <Play className="w-4 h-4" />
                                    Run Now
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                                    onClick={() => {}}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Schedule
                                  </DropdownMenu.Item>
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Storage Tab */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Configure backup storage destinations
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsStorageModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Storage
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storageConfigs.map((storage) => {
                  const StorageIcon = STORAGE_TYPE_ICONS[storage.type];
                  
                  return (
                    <Card key={storage.type}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-md flex items-center justify-center',
                                storage.isDefault ? 'bg-accent-subtle text-accent' : 'bg-bg-overlay text-text-secondary'
                              )}
                            >
                              <StorageIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <CardTitle className="text-sm">{storage.name}</CardTitle>
                              {storage.isDefault && (
                                <span className="text-xs text-accent">Default</span>
                              )}
                            </div>
                          </div>
                          <StatusBadge
                            status="success"
                            label="Connected"
                            size="sm"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="text-xs text-text-muted mb-1">Storage Used</div>
                          <div className="text-sm font-medium text-text-primary">
                            {formatBytes(storage.usedBytes)}
                            {storage.totalBytes && (
                              <span className="text-text-secondary ml-1">
                                / {formatBytes(storage.totalBytes)}
                              </span>
                            )}
                          </div>
                          {storage.totalBytes && (
                            <UsageBar
                              value={(storage.usedBytes / storage.totalBytes) * 100}
                              variant="disk"
                              size="sm"
                              showLabel={false}
                              className="mt-2"
                            />
                          )}
                        </div>
                        
                        <div className="pt-3 border-t border-border">
                          <div className="text-xs text-text-muted mb-2">Configuration</div>
                          <div className="text-xs text-text-secondary space-y-1 font-mono">
                            {Object.entries(storage.config).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span>{key}:</span>
                                <span className="text-text-primary">
                                  {key.includes('password') || key.includes('secret') || key.includes('key')
                                    ? '••••••'
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-3 border-t border-border">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            leftIcon={<Settings className="w-3.5 h-3.5" />}
                          >
                            Configure
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </PageContent>

      {/* Create Backup Modal */}
      <Modal
        open={isCreateBackupModalOpen}
        onOpenChange={setIsCreateBackupModalOpen}
        title="Create Backup"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Backup Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['full', 'incremental', 'database', 'files'] as BackupType[]).map((type) => {
                const TypeIcon = BACKUP_TYPE_ICONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => {}}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-md border transition-all',
                      'hover:border-border-hover',
                      'border-border bg-bg-overlay'
                    )}
                  >
                    <TypeIcon className={cn(
                      'w-6 h-6',
                      type === 'full' && 'text-accent',
                      type === 'incremental' && 'text-info',
                      type === 'database' && 'text-success',
                      type === 'files' && 'text-warning'
                    )} />
                    <span className="text-sm font-medium text-text-primary">
                      {BACKUP_TYPE_LABELS[type]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Storage Destination</label>
            <Select defaultValue="local">
              {storageConfigs.map((storage) => (
                <Select.Item key={storage.type} value={storage.type}>
                  {storage.name} {storage.isDefault && '(Default)'}
                </Select.Item>
              ))}
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Retention Period</label>
            <Select defaultValue="30">
              <Select.Item value="7">7 days</Select.Item>
              <Select.Item value="14">14 days</Select.Item>
              <Select.Item value="30">30 days</Select.Item>
              <Select.Item value="90">90 days</Select.Item>
              <Select.Item value="365">1 year</Select.Item>
              <Select.Item value="forever">Forever</Select.Item>
            </Select>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateBackupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleCreateBackup('full', 'local')}
              disabled={isCreatingBackup}
              leftIcon={isCreatingBackup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            >
              {isCreatingBackup ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore Modal */}
      <Modal
        open={isRestoreModalOpen}
        onOpenChange={setIsRestoreModalOpen}
        title="Restore Backup"
        size="lg"
      >
        <div className="space-y-4">
          {selectedBackup && (
            <AlertBanner
              variant="warning"
              title="Restore Warning"
              message="Restoring a backup will overwrite current site data. Make sure you have a current backup before proceeding."
              size="sm"
            />
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Restore Mode</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setRestoreOptions(prev => ({ ...prev, mode: 'full' }))}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-md border transition-all',
                  restoreOptions.mode === 'full'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border bg-bg-overlay hover:border-border-hover'
                )}
              >
                <Archive className="w-6 h-6 text-accent" />
                <span className="text-sm font-medium text-text-primary">Full Site</span>
                <span className="text-xs text-text-secondary">Files + Database</span>
              </button>
              <button
                onClick={() => setRestoreOptions(prev => ({ ...prev, mode: 'files' }))}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-md border transition-all',
                  restoreOptions.mode === 'files'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border bg-bg-overlay hover:border-border-hover'
                )}
              >
                <FolderOpen className="w-6 h-6 text-warning" />
                <span className="text-sm font-medium text-text-primary">Files Only</span>
                <span className="text-xs text-text-secondary">Website files</span>
              </button>
              <button
                onClick={() => setRestoreOptions(prev => ({ ...prev, mode: 'database' }))}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-md border transition-all',
                  restoreOptions.mode === 'database'
                    ? 'border-accent bg-accent-subtle'
                    : 'border-border bg-bg-overlay hover:border-border-hover'
                )}
              >
                <Database className="w-6 h-6 text-success" />
                <span className="text-sm font-medium text-text-primary">Database</span>
                <span className="text-xs text-text-secondary">MySQL/PostgreSQL</span>
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Restore Options</label>
            <div className="space-y-2">
              <Toggle
                label="Overwrite existing data"
                checked={restoreOptions.overwriteExisting}
                onCheckedChange={(checked) => setRestoreOptions(prev => ({ ...prev, overwriteExisting: checked }))}
              />
              <Toggle
                label="Create as new site (don't overwrite)"
                checked={restoreOptions.createNewSite}
                onCheckedChange={(checked) => setRestoreOptions(prev => ({ ...prev, createNewSite: checked }))}
              />
            </div>
          </div>
          
          {restoreOptions.createNewSite && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">New Site Name</label>
              <Input
                placeholder="restored-site"
                value={restoreOptions.newSiteName || ''}
                onChange={(e) => setRestoreOptions(prev => ({ ...prev, newSiteName: e.target.value }))}
              />
            </div>
          )}
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRestoreModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => selectedBackup && handleRestoreBackup(selectedBackup, restoreOptions)}
              disabled={isRestoring}
              leftIcon={isRestoring ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            >
              {isRestoring ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Backup Files Modal */}
      <Modal
        open={isFilesModalOpen}
        onOpenChange={setIsFilesModalOpen}
        title="Backup Files"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">
              Browse and restore individual files from this backup
            </p>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download Selected
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {selectedBackupFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-4 py-3 hover:bg-bg-overlay"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                      />
                      {file.endsWith('/') ? (
                        <FolderOpen className="w-4 h-4 text-warning" />
                      ) : (
                        <FileText className="w-4 h-4 text-text-secondary" />
                      )}
                      <span className="text-sm text-text-primary font-mono">{file}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilesModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}