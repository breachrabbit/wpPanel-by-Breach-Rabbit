'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Databases Management Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Full database management: MariaDB/PostgreSQL, users, SQL client, import/export
// =============================================================================

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
  Database,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  Settings,
  User,
  Lock,
  Key,
  Table,
  FileText,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  X,
  MoreVertical,
  Eye,
  EyeOff,
  Edit,
  Shield,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  SortAsc,
  SortDesc,
  Play,
  Clock,
  HardDrive,
  Server,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type DatabaseType = 'mariadb' | 'postgresql';
type DatabaseStatus = 'active' | 'inactive' | 'error';

interface Database {
  id: string;
  name: string;
  type: DatabaseType;
  status: DatabaseStatus;
  size: number; // bytes
  tables: number;
  users: DatabaseUser[];
  createdAt: string;
  lastBackupAt?: string;
  siteId?: string;
  siteName?: string;
}

interface DatabaseUser {
  id: string;
  username: string;
  host: string;
  privileges: string[];
  databases: string[];
}

interface SQLQuery {
  id: string;
  query: string;
  executedAt: string;
  duration: number; // ms
  rowsAffected?: number;
  status: 'success' | 'error';
  error?: string;
}

interface TableInfo {
  name: string;
  rows: number;
  size: number;
  engine: string;
  collation: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const DATABASE_TYPE_LABELS: Record<DatabaseType, string> = {
  mariadb: 'MariaDB',
  postgresql: 'PostgreSQL',
};

const DATABASE_TYPE_ICONS: Record<DatabaseType, React.ComponentType<{ className?: string }>> = {
  mariadb: Server,
  postgresql: Database,
};

const PRIVILEGES = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'INDEX',
  'ALTER',
  'CREATE TEMPORARY TABLES',
  'LOCK TABLES',
  'EXECUTE',
  'CREATE VIEW',
  'SHOW VIEW',
  'CREATE ROUTINE',
  'ALTER ROUTINE',
  'TRIGGER',
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
// 🏗️ DATABASES PAGE COMPONENT
// =============================================================================

export default function DatabasesPage() {
  const router = useRouter();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDb, setSelectedDb] = useState<Database | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'sql' | 'users'>('list');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DatabaseType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  
  // Forms
  const [createFormData, setCreateFormData] = useState({
    name: '',
    type: 'mariadb' as DatabaseType,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    linkToSite: false,
    siteId: '',
  });
  
  const [userFormData, setUserFormData] = useState({
    username: '',
    host: 'localhost',
    password: '',
    privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as string[],
    databaseId: '',
  });
  
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM `table` LIMIT 100;');
  const [queryHistory, setQueryHistory] = useState<SQLQuery[]>([]);
  const [queryResults, setQueryResults] = useState<any[]>([]);
  const [tableStructure, setTableStructure] = useState<TableInfo[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Stats
  const [totalSize, setTotalSize] = useState(0);
  const [totalDatabases, setTotalDatabases] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchDatabases = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockDatabases: Database[] = [
        {
          id: '1',
          name: 'wp_example',
          type: 'mariadb',
          status: 'active',
          size: 125000000,
          tables: 12,
          users: [{ id: '1', username: 'wp_user', host: 'localhost', privileges: ['ALL'], databases: ['wp_example'] }],
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          lastBackupAt: new Date(Date.now() - 86400000).toISOString(),
          siteId: '1',
          siteName: 'Example Site',
        },
        {
          id: '2',
          name: 'app_production',
          type: 'postgresql',
          status: 'active',
          size: 450000000,
          tables: 45,
          users: [{ id: '2', username: 'app_user', host: 'localhost', privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], databases: ['app_production'] }],
          createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
          siteId: '2',
          siteName: 'App Site',
        },
        {
          id: '3',
          name: 'test_db',
          type: 'mariadb',
          status: 'inactive',
          size: 5000000,
          tables: 3,
          users: [],
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
      ];
      
      setDatabases(mockDatabases);
      setTotalSize(mockDatabases.reduce((acc, db) => acc + db.size, 0));
      setTotalDatabases(mockDatabases.length);
      setTotalUsers(mockDatabases.reduce((acc, db) => acc + db.users.length, 0));
    } catch (error) {
      console.error('Failed to fetch databases:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleCreateDatabase = async () => {
    try {
      // Mock create
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchDatabases();
      setIsCreateModalOpen(false);
      setCreateFormData({
        name: '',
        type: 'mariadb',
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        linkToSite: false,
        siteId: '',
      });
    } catch (error) {
      console.error('Failed to create database:', error);
    }
  };

  const handleDeleteDatabase = async (dbId: string) => {
    if (!confirm('Are you sure you want to delete this database? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Mock delete
      setDatabases(prev => prev.filter(db => db.id !== dbId));
      await fetchDatabases();
    } catch (error) {
      console.error('Failed to delete database:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Mock create user
      await new Promise(resolve => setTimeout(resolve, 500));
      await fetchDatabases();
      setIsUserModalOpen(false);
      setUserFormData({
        username: '',
        host: 'localhost',
        password: '',
        privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
        databaseId: '',
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleExecuteQuery = async () => {
    setIsExecuting(true);
    try {
      // Mock query execution
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newQuery: SQLQuery = {
        id: Date.now().toString(),
        query: sqlQuery,
        executedAt: new Date().toISOString(),
        duration: Math.floor(Math.random() * 100),
        rowsAffected: Math.floor(Math.random() * 1000),
        status: 'success',
      };
      
      setQueryHistory(prev => [newQuery, ...prev.slice(0, 49)]);
      
      // Mock results
      setQueryResults([
        { id: 1, name: 'John', email: 'john@example.com', created_at: new Date().toISOString() },
        { id: 2, name: 'Jane', email: 'jane@example.com', created_at: new Date().toISOString() },
      ]);
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportDatabase = async (dbId: string, format: 'sql' | 'csv' | 'json') => {
    try {
      // Mock export
      console.log('Exporting database:', dbId, format);
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleImportDatabase = async (dbId: string, file: File) => {
    try {
      // Mock import
      console.log('Importing to database:', dbId, file.name);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Failed to import:', error);
    }
  };

  // =============================================================================
  // 🔍 FILTERING & SORTING
  // =============================================================================

  const filteredAndSortedDatabases = React.useMemo(() => {
    let result = [...databases];
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(db => 
        db.name.toLowerCase().includes(query) ||
        db.siteName?.toLowerCase().includes(query)
      );
    }
    
    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(db => db.type === filterType);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [databases, searchQuery, filterType, sortBy, sortDirection]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Databases"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Databases' },
        ]}
        description="Manage MariaDB and PostgreSQL databases"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDatabases}
              leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Database
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-text-muted mb-1">Total Databases</div>
                <div className="text-2xl font-bold text-text-primary">{totalDatabases}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-text-muted mb-1">Total Size</div>
                <div className="text-2xl font-bold text-text-primary">{formatBytes(totalSize)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-text-muted mb-1">Database Users</div>
                <div className="text-2xl font-bold text-text-primary">{totalUsers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-text-muted mb-1">Active</div>
                <div className="text-2xl font-bold text-success">
                  {databases.filter(db => db.status === 'active').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Card>
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('list')}
                  leftIcon={<Database className="w-4 h-4" />}
                >
                  Databases
                </Button>
                <Button
                  variant={activeTab === 'sql' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('sql')}
                  leftIcon={<Terminal className="w-4 h-4" />}
                >
                  SQL Client
                </Button>
                <Button
                  variant={activeTab === 'users' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('users')}
                  leftIcon={<User className="w-4 h-4" />}
                >
                  Users
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Databases List Tab */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <Input
                        placeholder="Search databases..."
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
                      <Select.Item value="mariadb">MariaDB</Select.Item>
                      <Select.Item value="postgresql">PostgreSQL</Select.Item>
                    </Select>
                    
                    <div className="flex items-center gap-1 border border-border rounded-md p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setSortBy('name')}
                      >
                        Name
                        {sortBy === 'name' && (
                          sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setSortBy('size')}
                      >
                        Size
                        {sortBy === 'size' && (
                          sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setSortBy('date')}
                      >
                        Date
                        {sortBy === 'date' && (
                          sortDirection === 'asc' ? <SortAsc className="w-3 h-3 ml-1" /> : <SortDesc className="w-3 h-3 ml-1" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Databases Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24 mb-4" />
                        <Skeleton className="h-2 w-full mb-2" />
                        <Skeleton className="h-2 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredAndSortedDatabases.length === 0 ? (
                <Card>
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Database className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        {searchQuery || filterType !== 'all' ? 'No databases match your filters' : 'No databases yet'}
                      </h3>
                      <p className="text-sm text-text-secondary mb-4 max-w-md">
                        {searchQuery || filterType !== 'all'
                          ? 'Try adjusting your search or filter criteria'
                          : 'Create your first database to get started'}
                      </p>
                      {!searchQuery && filterType === 'all' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setIsCreateModalOpen(true)}
                          leftIcon={<Plus className="w-4 h-4" />}
                        >
                          Create Database
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAndSortedDatabases.map((db) => {
                    const DbIcon = DATABASE_TYPE_ICONS[db.type];
                    
                    return (
                      <Card key={db.id} className="group hover:border-border-hover transition-all">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-10 h-10 rounded-md flex items-center justify-center',
                                db.type === 'mariadb' ? 'bg-accent-subtle text-accent' : 'bg-info-subtle text-info'
                              )}>
                                <DbIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <CardTitle className="text-sm">{db.name}</CardTitle>
                                <div className="text-xs text-text-secondary">{DATABASE_TYPE_LABELS[db.type]}</div>
                              </div>
                            </div>
                            <StatusBadge
                              status={db.status === 'active' ? 'success' : db.status === 'inactive' ? 'neutral' : 'error'}
                              size="sm"
                              showDot
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-text-muted">Size</span>
                              <span className="text-text-primary font-medium">{formatBytes(db.size)}</span>
                            </div>
                            <UsageBar
                              value={(db.size / (1024 * 1024 * 1024)) * 100}
                              variant="disk"
                              size="sm"
                              showLabel={false}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-text-muted">Tables</div>
                              <div className="text-text-primary font-medium">{db.tables}</div>
                            </div>
                            <div>
                              <div className="text-text-muted">Users</div>
                              <div className="text-text-primary font-medium">{db.users.length}</div>
                            </div>
                          </div>
                          
                          {db.siteName && (
                            <div className="pt-2 border-t border-border">
                              <div className="text-xs text-text-muted">Linked to</div>
                              <div className="text-xs text-accent">{db.siteName}</div>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="pt-3 border-t border-border flex items-center justify-between">
                          <div className="text-xs text-text-muted">
                            Created {getRelativeTime(db.createdAt)}
                          </div>
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
                                    setSelectedDb(db);
                                    setActiveTab('sql');
                                  }}
                                >
                                  <Terminal className="w-4 h-4" />
                                  Open SQL Client
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                  onClick={() => setIsExportModalOpen(true)}
                                >
                                  <Download className="w-4 h-4" />
                                  Export
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                  onClick={() => setIsImportModalOpen(true)}
                                >
                                  <Upload className="w-4 h-4" />
                                  Import
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                  onClick={() => setIsUserModalOpen(true)}
                                >
                                  <User className="w-4 h-4" />
                                  Manage Users
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="h-px bg-border my-1" />
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                                  onClick={() => handleDeleteDatabase(db.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SQL Client Tab */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              {/* Database Selection */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-text-secondary mb-2 block">
                        Select Database
                      </label>
                      <Select
                        value={selectedDb?.id || ''}
                        onValueChange={(value) => setSelectedDb(databases.find(db => db.id === value) || null)}
                        className="w-full"
                      >
                        <Select.Item value="" disabled>Select a database...</Select.Item>
                        {databases.map((db) => (
                          <Select.Item key={db.id} value={db.id}>
                            {db.name} ({DATABASE_TYPE_LABELS[db.type]})
                          </Select.Item>
                        ))}
                      </Select>
                    </div>
                    {selectedDb && (
                      <div className="text-right">
                        <div className="text-xs text-text-muted">Type</div>
                        <div className="text-sm text-text-primary">{DATABASE_TYPE_LABELS[selectedDb.type]}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* SQL Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    SQL Query Editor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      className={cn(
                        'w-full h-48 p-4',
                        'bg-bg-base border border-border rounded-md',
                        'text-text-primary font-mono text-sm',
                        'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-subtle',
                        'resize-none'
                      )}
                      placeholder="Enter your SQL query..."
                    />
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSqlQuery('SELECT * FROM `table` LIMIT 100;')}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleExecuteQuery}
                        disabled={!selectedDb || isExecuting}
                        leftIcon={isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      >
                        {isExecuting ? 'Executing...' : 'Execute'}
                      </Button>
                    </div>
                  </div>

                  {/* Query Results */}
                  {queryResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">
                          {queryResults.length} rows returned
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                            CSV
                          </Button>
                          <Button variant="ghost" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                            JSON
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              {Object.keys(queryResults[0]).map((key) => (
                                <th key={key} className="text-left py-2 px-3 font-medium text-text-muted">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResults.map((row, index) => (
                              <tr key={index} className="border-b border-border hover:bg-bg-overlay">
                                {Object.values(row).map((value, i) => (
                                  <td key={i} className="py-2 px-3 text-text-primary">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Query History */}
                  {queryHistory.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-border">
                      <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent Queries
                      </h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {queryHistory.map((query) => (
                          <div
                            key={query.id}
                            className="flex items-center justify-between p-2 bg-bg-overlay rounded text-xs cursor-pointer hover:bg-bg-elevated"
                            onClick={() => setSqlQuery(query.query)}
                          >
                            <span className="text-text-secondary truncate flex-1 font-mono">
                              {query.query}
                            </span>
                            <span className={cn(
                              'ml-2 px-1.5 py-0.5 rounded',
                              query.status === 'success' ? 'bg-success-subtle text-success' : 'bg-error-subtle text-error'
                            )}>
                              {query.duration}ms
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Database users and their privileges
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsUserModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add User
                </Button>
              </div>

              <div className="space-y-3">
                {databases.flatMap(db => db.users.map(user => (
                  <Card key={user.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-text-primary">{user.username}</span>
                              <span className="text-xs text-text-muted">@{user.host}</span>
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                              Databases: {user.databases.join(', ')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right hidden md:block">
                            <div className="text-xs text-text-muted">Privileges</div>
                            <div className="text-xs text-text-primary">
                              {user.privileges.includes('ALL') ? 'ALL PRIVILEGES' : user.privileges.length} grants
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
                                  Edit Privileges
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                  onClick={() => {}}
                                >
                                  <Lock className="w-4 h-4" />
                                  Change Password
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator className="h-px bg-border my-1" />
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                                  onClick={() => {}}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete User
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )))}
                
                {databases.flatMap(db => db.users).length === 0 && (
                  <Card>
                    <CardContent className="p-12">
                      <div className="flex flex-col items-center justify-center text-center">
                        <User className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                          No database users
                        </h3>
                        <p className="text-sm text-text-secondary mb-4">
                          Create your first database user to get started
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setIsUserModalOpen(true)}
                          leftIcon={<Plus className="w-4 h-4" />}
                        >
                          Add User
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </PageContent>

      {/* Create Database Modal */}
      <Modal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        title="Create Database"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Database Name</label>
            <Input
              value={createFormData.name}
              onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="my_database"
              leftIcon={<Database className="w-4 h-4" />}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Database Type</label>
              <Select
                value={createFormData.type}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, type: value as DatabaseType }))}
              >
                <Select.Item value="mariadb">MariaDB</Select.Item>
                <Select.Item value="postgresql">PostgreSQL</Select.Item>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Charset</label>
              <Select
                value={createFormData.charset}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, charset: value }))}
              >
                <Select.Item value="utf8mb4">utf8mb4</Select.Item>
                <Select.Item value="utf8">utf8</Select.Item>
                <Select.Item value="latin1">latin1</Select.Item>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Collation</label>
            <Select
              value={createFormData.collation}
              onValueChange={(value) => setCreateFormData(prev => ({ ...prev, collation: value }))}
            >
              <Select.Item value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</Select.Item>
              <Select.Item value="utf8mb4_general_ci">utf8mb4_general_ci</Select.Item>
              <Select.Item value="utf8_unicode_ci">utf8_unicode_ci</Select.Item>
            </Select>
          </div>
          
          <Toggle
            label="Link to existing site"
            checked={createFormData.linkToSite}
            onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, linkToSite: checked }))}
          />
          
          {createFormData.linkToSite && (
            <div className="space-y-2 pl-4 border-l-2 border-accent-subtle">
              <label className="text-sm font-medium text-text-secondary">Select Site</label>
              <Select
                value={createFormData.siteId}
                onValueChange={(value) => setCreateFormData(prev => ({ ...prev, siteId: value }))}
              >
                <Select.Item value="" disabled>Select a site...</Select.Item>
                <Select.Item value="1">Example Site</Select.Item>
                <Select.Item value="2">App Site</Select.Item>
              </Select>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateDatabase}
              disabled={!createFormData.name}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Database
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manage Users Modal */}
      <Modal
        open={isUserModalOpen}
        onOpenChange={setIsUserModalOpen}
        title="Create Database User"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Username</label>
              <Input
                value={userFormData.username}
                onChange={(e) => setUserFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="db_user"
                leftIcon={<User className="w-4 h-4" />}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Host</label>
              <Input
                value={userFormData.host}
                onChange={(e) => setUserFormData(prev => ({ ...prev, host: e.target.value }))}
                placeholder="localhost"
                leftIcon={<Server className="w-4 h-4" />}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Password</label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                className="flex-1"
                leftIcon={<Lock className="w-4 h-4" />}
              />
              <Button variant="secondary" size="sm">
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Database</label>
            <Select
              value={userFormData.databaseId}
              onValueChange={(value) => setUserFormData(prev => ({ ...prev, databaseId: value }))}
            >
              <Select.Item value="" disabled>Select a database...</Select.Item>
              {databases.map((db) => (
                <Select.Item key={db.id} value={db.id}>
                  {db.name}
                </Select.Item>
              ))}
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Privileges</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-bg-overlay rounded-md">
              {PRIVILEGES.map((privilege) => (
                <label key={privilege} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={userFormData.privileges.includes(privilege)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUserFormData(prev => ({ ...prev, privileges: [...prev.privileges, privilege] }));
                      } else {
                        setUserFormData(prev => ({ ...prev, privileges: prev.privileges.filter(p => p !== privilege) }));
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-border bg-bg-base text-accent focus:ring-accent"
                  />
                  <span className="text-text-secondary">{privilege}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateUser}
              disabled={!userFormData.username || !userFormData.password || !userFormData.databaseId}
              leftIcon={<User className="w-4 h-4" />}
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}