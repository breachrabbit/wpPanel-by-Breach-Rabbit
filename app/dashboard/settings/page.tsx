'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Settings Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Centralized settings for PHP, MariaDB, OLS, System, and Panel configuration
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
import { UsageBar } from '@/components/ui/UsageBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import {
  Settings,
  Server,
  Database,
  Globe,
  Shield,
  User,
  Bell,
  Palette,
  Key,
  Save,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  Cpu,
  MemoryStick,
  HardDrive,
  Zap,
  Clock,
  Moon,
  Sun,
  Monitor,
  Languages,
  Mail,
  Lock,
  Smartphone,
  LogOut,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Upload,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Terminal,
  Package,
  Layers,
  Activity,
} from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type TabType = 'php' | 'mariadb' | 'ols' | 'swap' | 'system' | 'panel' | 'profile' | 'security';

interface PHPSettings {
  defaultVersion: string;
  availableVersions: string[];
  memoryLimit: string;
  maxExecutionTime: number;
  maxInputTime: number;
  uploadMaxFilesize: string;
  postMaxSize: string;
  maxInputVars: number;
  displayErrors: boolean;
  errorReporting: string;
  timezone: string;
  opcache: {
    enabled: boolean;
    memoryConsumption: number;
    maxAcceleratedFiles: number;
    revalidateFreq: number;
    hitRate: number;
  };
  extensions: Array<{ name: string; enabled: boolean; version?: string }>;
  workers: number;
  timeout: number;
}

interface MariaDBSettings {
  version: string;
  innodbBufferPoolSize: string;
  innodbBufferPoolInstances: number;
  innodbLogFilesize: string;
  innodbFlushLogAtTrxCommit: number;
  maxConnections: number;
  waitTimeout: number;
  interactiveTimeout: number;
  connectTimeout: number;
  queryCacheType: number;
  queryCacheSize: string;
  tmpTableSize: string;
  maxHeapTableSize: string;
  slowQueryLog: boolean;
  longQueryTime: number;
  errorLogLevel: string;
  status: {
    uptime: number;
    connections: number;
    queriesPerSec: number;
    threadsRunning: number;
  };
}

interface OLSSettings {
  version: string;
  maxConnections: number;
  maxSSLConnections: number;
  connTimeout: number;
  maxKeepAliveReq: number;
  keepAliveTimeout: number;
  smartKeepAlive: boolean;
  sndBufSize: number;
  rcvBufSize: number;
  gzip: {
    enabled: boolean;
    level: number;
    mimeTypes: string[];
  };
  brotli: {
    enabled: boolean;
    level: number;
  };
  lscache: {
    enabled: boolean;
    defaultTTL: number;
    staleCache: boolean;
  };
  security: {
    hideServerSignature: boolean;
    maxReqURLLen: number;
    maxReqHeaderSize: number;
    maxReqBodySize: number;
  };
  logging: {
    level: string;
    rollingSize: number;
  };
}

interface SwapSettings {
  exists: boolean;
  size: number; // GB
  used: number; // GB
  swappiness: number;
  recommendation: string;
}

interface SystemLimits {
  openFiles: number;
  maxProcesses: number;
  coreFileSize: number;
  sysctl: {
    'net.core.somaxconn': number;
    'vm.overcommit_memory': number;
    'net.ipv4.tcp_max_syn_backlog': number;
  };
}

interface PanelSettings {
  theme: 'dark' | 'light' | 'system';
  language: 'en' | 'ru' | 'es';
  timezone: string;
  emailNotifications: boolean;
  telegramNotifications: boolean;
  updateCheck: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENT';
  createdAt: string;
  lastLoginAt: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorSetup: boolean;
  backupCodes?: string[];
  sessions: Array<{
    id: string;
    ip: string;
    browser: string;
    os: string;
    country?: string;
    lastActive: string;
    current: boolean;
  }>;
  loginAttempts: {
    count: number;
    lastAttempt?: string;
    blockedUntil?: string;
  };
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const PHP_VERSIONS = ['8.2', '8.3', '8.4', '8.5'];
const PHP_EXTENSIONS = [
  { name: 'imagick', defaultEnabled: false },
  { name: 'redis', defaultEnabled: true },
  { name: 'memcached', defaultEnabled: false },
  { name: 'gd', defaultEnabled: true },
  { name: 'intl', defaultEnabled: true },
  { name: 'mbstring', defaultEnabled: true },
  { name: 'curl', defaultEnabled: true },
  { name: 'zip', defaultEnabled: true },
  { name: 'xml', defaultEnabled: true },
  { name: 'mysql', defaultEnabled: true },
  { name: 'pdo', defaultEnabled: true },
  { name: 'soap', defaultEnabled: false },
  { name: 'bcmath', defaultEnabled: false },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'es', name: 'Español' },
];

const RECOMMENDED_INNODB = (ramGB: number) => `${Math.floor(ramGB * 0.5)}G`;
const RECOMMENDED_MAX_CONN = (ramGB: number) => Math.floor(ramGB * 20);

// =============================================================================
// 🏗️ SETTINGS PAGE COMPONENT
// =============================================================================

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('php');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Settings State
  const [phpSettings, setPhpSettings] = useState<PHPSettings | null>(null);
  const [mariadbSettings, setMariadbSettings] = useState<MariaDBSettings | null>(null);
  const [olsSettings, setOlsSettings] = useState<OLSSettings | null>(null);
  const [swapSettings, setSwapSettings] = useState<SwapSettings | null>(null);
  const [systemLimits, setSystemLimits] = useState<SystemLimits | null>(null);
  const [panelSettings, setPanelSettings] = useState<PanelSettings | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  
  // UI State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [is2FASetup, setIs2FASetup] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [serverRAM, setServerRAM] = useState(16); // GB, for recommendations

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockPHP: PHPSettings = {
        defaultVersion: '8.3',
        availableVersions: PHP_VERSIONS,
        memoryLimit: '256M',
        maxExecutionTime: 300,
        maxInputTime: 300,
        uploadMaxFilesize: '64M',
        postMaxSize: '64M',
        maxInputVars: 3000,
        displayErrors: false,
        errorReporting: 'E_ALL & ~E_DEPRECATED & ~E_STRICT',
        timezone: 'UTC',
        opcache: {
          enabled: true,
          memoryConsumption: 256,
          maxAcceleratedFiles: 10000,
          revalidateFreq: 60,
          hitRate: 95.5,
        },
        extensions: PHP_EXTENSIONS.map(ext => ({
          name: ext.name,
          enabled: ext.defaultEnabled,
          version: '8.3',
        })),
        workers: 12,
        timeout: 300,
      };
      
      const mockMariaDB: MariaDBSettings = {
        version: '10.11.6',
        innodbBufferPoolSize: '8G',
        innodbBufferPoolInstances: 8,
        innodbLogFilesize: '2G',
        innodbFlushLogAtTrxCommit: 1,
        maxConnections: 300,
        waitTimeout: 28800,
        interactiveTimeout: 28800,
        connectTimeout: 10,
        queryCacheType: 0,
        queryCacheSize: '0',
        tmpTableSize: '256M',
        maxHeapTableSize: '256M',
        slowQueryLog: true,
        longQueryTime: 2,
        errorLogLevel: 'WARN',
        status: {
          uptime: 1296000,
          connections: 125000,
          queriesPerSec: 450,
          threadsRunning: 5,
        },
      };
      
      const mockOLS: OLSSettings = {
        version: '1.8.2',
        maxConnections: 500,
        maxSSLConnections: 500,
        connTimeout: 30,
        maxKeepAliveReq: 100,
        keepAliveTimeout: 5,
        smartKeepAlive: true,
        sndBufSize: 256,
        rcvBufSize: 256,
        gzip: {
          enabled: true,
          level: 6,
          mimeTypes: ['text/plain', 'text/html', 'text/css', 'application/javascript', 'application/json'],
        },
        brotli: {
          enabled: true,
          level: 4,
        },
        lscache: {
          enabled: true,
          defaultTTL: 3600,
          staleCache: true,
        },
        security: {
          hideServerSignature: true,
          maxReqURLLen: 8192,
          maxReqHeaderSize: 16384,
          maxReqBodySize: 52428800,
        },
        logging: {
          level: 'ERROR',
          rollingSize: 100,
        },
      };
      
      const mockSwap: SwapSettings = {
        exists: true,
        size: 4,
        used: 0.5,
        swappiness: 10,
        recommendation: serverRAM < 8 ? 'Recommended: Create 4GB swap' : 'Swap not needed for 16GB+ RAM',
      };
      
      const mockSystem: SystemLimits = {
        openFiles: 65535,
        maxProcesses: 4096,
        coreFileSize: 0,
        sysctl: {
          'net.core.somaxconn': 65535,
          'vm.overcommit_memory': 1,
          'net.ipv4.tcp_max_syn_backlog': 65535,
        },
      };
      
      const mockPanel: PanelSettings = {
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        emailNotifications: true,
        telegramNotifications: false,
        updateCheck: true,
      };
      
      const mockProfile: UserProfile = {
        name: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      
      const mockSecurity: SecuritySettings = {
        twoFactorEnabled: false,
        twoFactorSetup: false,
        sessions: [
          { id: '1', ip: '192.168.1.100', browser: 'Chrome 120', os: 'Windows 11', country: 'US', lastActive: new Date().toISOString(), current: true },
          { id: '2', ip: '192.168.1.101', browser: 'Firefox 121', os: 'macOS 14', country: 'US', lastActive: new Date(Date.now() - 3600000).toISOString(), current: false },
        ],
        loginAttempts: {
          count: 0,
        },
      };
      
      setPhpSettings(mockPHP);
      setMariadbSettings(mockMariaDB);
      setOlsSettings(mockOLS);
      setSwapSettings(mockSwap);
      setSystemLimits(mockSystem);
      setPanelSettings(mockPanel);
      setUserProfile(mockProfile);
      setSecuritySettings(mockSecurity);
      
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [serverRAM]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleSavePHP = async () => {
    setIsSaving(true);
    try {
      // Mock save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save PHP settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMariaDB = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save MariaDB settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOLS = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save OLS settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePanel = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Apply theme immediately
      if (panelSettings?.theme) {
        document.documentElement.setAttribute('data-theme', panelSettings.theme);
        localStorage.setItem('wppanel-theme', panelSettings.theme);
      }
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save panel settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Failed to change password:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnable2FA = async () => {
    setIs2FASetup(true);
    // Generate mock backup codes
    const codes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
    setBackupCodes(codes);
    setShowBackupCodes(true);
  };

  const handleDisable2FA = async () => {
    setSecuritySettings(prev => prev ? { ...prev, twoFactorEnabled: false, twoFactorSetup: false } : null);
    setIs2FAModalOpen(false);
  };

  const handleTerminateSession = async (sessionId: string) => {
    setSecuritySettings(prev => prev ? {
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== sessionId),
    } : null);
  };

  const handleTerminateAllOtherSessions = async () => {
    setSecuritySettings(prev => prev ? {
      ...prev,
      sessions: prev.sessions.filter(s => s.current),
    } : null);
  };

  const handleApplyRecommended = (service: 'mariadb' | 'ols') => {
    if (service === 'mariadb' && mariadbSettings) {
      setMariadbSettings({
        ...mariadbSettings,
        innodbBufferPoolSize: RECOMMENDED_INNODB(serverRAM),
        maxConnections: RECOMMENDED_MAX_CONN(serverRAM),
      });
      setHasChanges(true);
    }
  };

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader title="Settings" />
        <PageContent>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageContent>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Settings"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
        description="Configure PHP, MariaDB, OpenLiteSpeed, and panel settings"
        actions={
          hasChanges && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (activeTab === 'php') handleSavePHP();
                else if (activeTab === 'mariadb') handleSaveMariaDB();
                else if (activeTab === 'ols') handleSaveOLS();
                else if (activeTab === 'panel') handleSavePanel();
                else if (activeTab === 'profile') handleSaveProfile();
              }}
              disabled={isSaving}
              leftIcon={isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Settings Tabs */}
          <Card>
            <CardContent className="p-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
                <TabsList className="grid grid-cols-4 md:grid-cols-8 gap-1 bg-transparent h-auto">
                  <TabsTrigger value="php" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    PHP
                  </TabsTrigger>
                  <TabsTrigger value="mariadb" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    MariaDB
                  </TabsTrigger>
                  <TabsTrigger value="ols" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    OLS
                  </TabsTrigger>
                  <TabsTrigger value="swap" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    SWAP
                  </TabsTrigger>
                  <TabsTrigger value="system" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    System
                  </TabsTrigger>
                  <TabsTrigger value="panel" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    Panel
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="security" className="data-[state=active]:bg-accent data-[state=active]:text-white text-xs">
                    Security
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* PHP Settings Tab */}
          {activeTab === 'php' && phpSettings && (
            <div className="space-y-6">
              {/* PHP Version */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    PHP Version
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Default PHP Version</label>
                      <Select
                        value={phpSettings.defaultVersion}
                        onValueChange={(value) => {
                          setPhpSettings({ ...phpSettings, defaultVersion: value });
                          setHasChanges(true);
                        }}
                      >
                        {phpSettings.availableVersions.map((version) => (
                          <Select.Item key={version} value={version}>
                            PHP {version}
                          </Select.Item>
                        ))}
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">PHP Workers (LSAPI)</label>
                      <Input
                        type="number"
                        value={phpSettings.workers}
                        onChange={(e) => {
                          setPhpSettings({ ...phpSettings, workers: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                      <p className="text-xs text-text-muted">Recommended: CPU cores × 3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* PHP Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    PHP Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">memory_limit</label>
                      <Input
                        value={phpSettings.memoryLimit}
                        onChange={(e) => {
                          setPhpSettings({ ...phpSettings, memoryLimit: e.target.value });
                          setHasChanges(true);
                        }}
                        placeholder="256M"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">max_execution_time</label>
                      <Input
                        type="number"
                        value={phpSettings.maxExecutionTime}
                        onChange={(e) => {
                          setPhpSettings({ ...phpSettings, maxExecutionTime: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                        placeholder="300"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">upload_max_filesize</label>
                      <Input
                        value={phpSettings.uploadMaxFilesize}
                        onChange={(e) => {
                          setPhpSettings({ ...phpSettings, uploadMaxFilesize: e.target.value });
                          setHasChanges(true);
                        }}
                        placeholder="64M"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">post_max_size</label>
                      <Input
                        value={phpSettings.postMaxSize}
                        onChange={(e) => {
                          setPhpSettings({ ...phpSettings, postMaxSize: e.target.value });
                          setHasChanges(true);
                        }}
                        placeholder="64M"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">max_input_vars</label>
                      <Input
                        type="number"
                        value={phpSettings.maxInputVars}
                        onChange={(e) => {
                          setPhpSettings({ ...phpSettings, maxInputVars: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                        placeholder="3000"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">timezone</label>
                      <Select
                        value={phpSettings.timezone}
                        onValueChange={(value) => {
                          setPhpSettings({ ...phpSettings, timezone: value });
                          setHasChanges(true);
                        }}
                      >
                        {TIMEZONES.map((tz) => (
                          <Select.Item key={tz} value={tz}>
                            {tz}
                          </Select.Item>
                        ))}
                      </Select>
                    </div>
                  </div>
                  
                  <Toggle
                    label="display_errors (Production should be off)"
                    checked={phpSettings.displayErrors}
                    onCheckedChange={(checked) => {
                      setPhpSettings({ ...phpSettings, displayErrors: checked });
                      setHasChanges(true);
                    }}
                  />
                </CardContent>
              </Card>

              {/* OPcache */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      OPcache
                    </div>
                    <StatusBadge
                      status={phpSettings.opcache.enabled ? 'success' : 'neutral'}
                      label={phpSettings.opcache.enabled ? 'Enabled' : 'Disabled'}
                      size="sm"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">opcache.memory_consumption (MB)</label>
                      <Input
                        type="number"
                        value={phpSettings.opcache.memoryConsumption}
                        onChange={(e) => {
                          setPhpSettings({
                            ...phpSettings,
                            opcache: { ...phpSettings.opcache, memoryConsumption: parseInt(e.target.value) },
                          });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">opcache.max_accelerated_files</label>
                      <Input
                        type="number"
                        value={phpSettings.opcache.maxAcceleratedFiles}
                        onChange={(e) => {
                          setPhpSettings({
                            ...phpSettings,
                            opcache: { ...phpSettings.opcache, maxAcceleratedFiles: parseInt(e.target.value) },
                          });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">opcache.revalidate_freq (sec)</label>
                      <Input
                        type="number"
                        value={phpSettings.opcache.revalidateFreq}
                        onChange={(e) => {
                          setPhpSettings({
                            ...phpSettings,
                            opcache: { ...phpSettings.opcache, revalidateFreq: parseInt(e.target.value) },
                          });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-bg-overlay rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Hit Rate</span>
                      <span className="text-sm font-bold text-success">{phpSettings.opcache.hitRate}%</span>
                    </div>
                    <UsageBar value={phpSettings.opcache.hitRate} variant="success" size="sm" showLabel={false} />
                  </div>
                  
                  <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                    Flush OPcache
                  </Button>
                </CardContent>
              </Card>

              {/* PHP Extensions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    PHP Extensions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {phpSettings.extensions.map((ext) => (
                      <label
                        key={ext.name}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-md border cursor-pointer',
                          'transition-colors hover:border-border-hover',
                          ext.enabled ? 'border-accent bg-accent-subtle' : 'border-border bg-bg-surface'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={ext.enabled}
                          onChange={(e) => {
                            setPhpSettings({
                              ...phpSettings,
                              extensions: phpSettings.extensions.map(ex =>
                                ex.name === ext.name ? { ...ex, enabled: e.target.checked } : ex
                              ),
                            });
                            setHasChanges(true);
                          }}
                          className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-text-primary">{ext.name}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* MariaDB Settings Tab */}
          {activeTab === 'mariadb' && mariadbSettings && (
            <div className="space-y-6">
              {/* Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      MariaDB Status
                    </div>
                    <StatusBadge status="success" label="Running" size="sm" showDot />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-text-muted mb-1">Version</div>
                      <div className="text-lg font-bold text-text-primary">{mariadbSettings.version}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Uptime</div>
                      <div className="text-lg font-bold text-text-primary">
                        {Math.floor(mariadbSettings.status.uptime / 86400)}d {Math.floor((mariadbSettings.status.uptime % 86400) / 3600)}h
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Queries/sec</div>
                      <div className="text-lg font-bold text-text-primary">{mariadbSettings.status.queriesPerSec}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Threads Running</div>
                      <div className="text-lg font-bold text-text-primary">{mariadbSettings.status.threadsRunning}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* InnoDB */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      InnoDB Settings
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleApplyRecommended('mariadb')}
                      leftIcon={<Zap className="w-3.5 h-3.5" />}
                    >
                      Apply Recommended
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">
                        innodb_buffer_pool_size
                        <span className="text-xs text-text-muted ml-2">(Recommended: {RECOMMENDED_INNODB(serverRAM)})</span>
                      </label>
                      <Input
                        value={mariadbSettings.innodbBufferPoolSize}
                        onChange={(e) => {
                          setMariadbSettings({ ...mariadbSettings, innodbBufferPoolSize: e.target.value });
                          setHasChanges(true);
                        }}
                        placeholder="8G"
                      />
                      <p className="text-xs text-text-muted">50-70% of total RAM for dedicated DB server</p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">innodb_buffer_pool_instances</label>
                      <Input
                        type="number"
                        value={mariadbSettings.innodbBufferPoolInstances}
                        onChange={(e) => {
                          setMariadbSettings({ ...mariadbSettings, innodbBufferPoolInstances: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">innodb_log_file_size</label>
                      <Input
                        value={mariadbSettings.innodbLogFilesize}
                        onChange={(e) => {
                          setMariadbSettings({ ...mariadbSettings, innodbLogFilesize: e.target.value });
                          setHasChanges(true);
                        }}
                        placeholder="2G"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">innodb_flush_log_at_trx_commit</label>
                      <Select
                        value={mariadbSettings.innodbFlushLogAtTrxCommit.toString()}
                        onValueChange={(value) => {
                          setMariadbSettings({ ...mariadbSettings, innodbFlushLogAtTrxCommit: parseInt(value) });
                          setHasChanges(true);
                        }}
                      >
                        <Select.Item value="0">0 (Fastest, least safe)</Select.Item>
                        <Select.Item value="1">1 (Safest, slowest)</Select.Item>
                        <Select.Item value="2">2 (Balanced)</Select.Item>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Connections */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Connection Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">
                        max_connections
                        <span className="text-xs text-text-muted ml-2">(Recommended: {RECOMMENDED_MAX_CONN(serverRAM)})</span>
                      </label>
                      <Input
                        type="number"
                        value={mariadbSettings.maxConnections}
                        onChange={(e) => {
                          setMariadbSettings({ ...mariadbSettings, maxConnections: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">wait_timeout (seconds)</label>
                      <Input
                        type="number"
                        value={mariadbSettings.waitTimeout}
                        onChange={(e) => {
                          setMariadbSettings({ ...mariadbSettings, waitTimeout: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">connect_timeout (seconds)</label>
                      <Input
                        type="number"
                        value={mariadbSettings.connectTimeout}
                        onChange={(e) => {
                          setMariadbSettings({ ...mariadbSettings, connectTimeout: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Slow Query Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Slow Query Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Toggle
                    label="Enable slow query log"
                    checked={mariadbSettings.slowQueryLog}
                    onCheckedChange={(checked) => {
                      setMariadbSettings({ ...mariadbSettings, slowQueryLog: checked });
                      setHasChanges(true);
                    }}
                  />
                  
                  {mariadbSettings.slowQueryLog && (
                    <div className="space-y-2 pl-4 border-l-2 border-accent-subtle">
                      <label className="text-sm font-medium text-text-secondary">long_query_time (seconds)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={mariadbSettings.longQueryTime}
                        onChange={(e) => {
                          setMariadbSettings({ ...mariadbSettings, longQueryTime: parseFloat(e.target.value) });
                          setHasChanges(true);
                        }}
                        className="w-32"
                      />
                      <Button variant="secondary" size="sm" leftIcon={<Search className="w-3.5 h-3.5" />}>
                        View Slow Queries
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* OLS Settings Tab */}
          {activeTab === 'ols' && olsSettings && (
            <div className="space-y-6">
              {/* Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4" />
                      OpenLiteSpeed Status
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status="success" label={olsSettings.version} size="sm" />
                      <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                        Graceful Restart
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Performance Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">maxConnections</label>
                      <Input
                        type="number"
                        value={olsSettings.maxConnections}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, maxConnections: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">maxSSLConnections</label>
                      <Input
                        type="number"
                        value={olsSettings.maxSSLConnections}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, maxSSLConnections: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">connTimeout (seconds)</label>
                      <Input
                        type="number"
                        value={olsSettings.connTimeout}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, connTimeout: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">maxKeepAliveReq</label>
                      <Input
                        type="number"
                        value={olsSettings.maxKeepAliveReq}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, maxKeepAliveReq: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">keepAliveTimeout (seconds)</label>
                      <Input
                        type="number"
                        value={olsSettings.keepAliveTimeout}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, keepAliveTimeout: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <Toggle
                        label="smartKeepAlive"
                        checked={olsSettings.smartKeepAlive}
                        onCheckedChange={(checked) => {
                          setOlsSettings({ ...olsSettings, smartKeepAlive: checked });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* GZIP / Brotli */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Compression
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GZIP */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">GZIP</span>
                        <Toggle
                          checked={olsSettings.gzip.enabled}
                          onCheckedChange={(checked) => {
                            setOlsSettings({ ...olsSettings, gzip: { ...olsSettings.gzip, enabled: checked } });
                            setHasChanges(true);
                          }}
                          size="sm"
                        />
                      </div>
                      {olsSettings.gzip.enabled && (
                        <div className="space-y-2 pl-4 border-l-2 border-accent-subtle">
                          <label className="text-xs text-text-secondary">Compression Level (1-9)</label>
                          <Input
                            type="number"
                            min="1"
                            max="9"
                            value={olsSettings.gzip.level}
                            onChange={(e) => {
                              setOlsSettings({ ...olsSettings, gzip: { ...olsSettings.gzip, level: parseInt(e.target.value) } });
                              setHasChanges(true);
                            }}
                            className="w-20"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Brotli */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">Brotli</span>
                        <Toggle
                          checked={olsSettings.brotli.enabled}
                          onCheckedChange={(checked) => {
                            setOlsSettings({ ...olsSettings, brotli: { ...olsSettings.brotli, enabled: checked } });
                            setHasChanges(true);
                          }}
                          size="sm"
                        />
                      </div>
                      {olsSettings.brotli.enabled && (
                        <div className="space-y-2 pl-4 border-l-2 border-accent-subtle">
                          <label className="text-xs text-text-secondary">Compression Level (1-11)</label>
                          <Input
                            type="number"
                            min="1"
                            max="11"
                            value={olsSettings.brotli.level}
                            onChange={(e) => {
                              setOlsSettings({ ...olsSettings, brotli: { ...olsSettings.brotli, level: parseInt(e.target.value) } });
                              setHasChanges(true);
                            }}
                            className="w-20"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* LSCache */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    LSCache Global Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Toggle
                    label="Enable LSCache"
                    checked={olsSettings.lscache.enabled}
                    onCheckedChange={(checked) => {
                      setOlsSettings({ ...olsSettings, lscache: { ...olsSettings.lscache, enabled: checked } });
                      setHasChanges(true);
                    }}
                  />
                  
                  {olsSettings.lscache.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-accent-subtle">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Default TTL (seconds)</label>
                        <Input
                          type="number"
                          value={olsSettings.lscache.defaultTTL}
                          onChange={(e) => {
                            setOlsSettings({ ...olsSettings, lscache: { ...olsSettings.lscache, defaultTTL: parseInt(e.target.value) } });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <Toggle
                          label="Serve stale cache"
                          checked={olsSettings.lscache.staleCache}
                          onCheckedChange={(checked) => {
                            setOlsSettings({ ...olsSettings, lscache: { ...olsSettings.lscache, staleCache: checked } });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                    Flush Global Cache
                  </Button>
                </CardContent>
              </Card>

              {/* Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Toggle
                    label="Hide server signature"
                    checked={olsSettings.security.hideServerSignature}
                    onCheckedChange={(checked) => {
                      setOlsSettings({ ...olsSettings, security: { ...olsSettings.security, hideServerSignature: checked } });
                      setHasChanges(true);
                    }}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">maxReqURLLen</label>
                      <Input
                        type="number"
                        value={olsSettings.security.maxReqURLLen}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, security: { ...olsSettings.security, maxReqURLLen: parseInt(e.target.value) } });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">maxReqHeaderSize</label>
                      <Input
                        type="number"
                        value={olsSettings.security.maxReqHeaderSize}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, security: { ...olsSettings.security, maxReqHeaderSize: parseInt(e.target.value) } });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">maxReqBodySize (bytes)</label>
                      <Input
                        type="number"
                        value={olsSettings.security.maxReqBodySize}
                        onChange={(e) => {
                          setOlsSettings({ ...olsSettings, security: { ...olsSettings.security, maxReqBodySize: parseInt(e.target.value) } });
                          setHasChanges(true);
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SWAP Settings Tab */}
          {activeTab === 'swap' && swapSettings && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MemoryStick className="w-4 h-4" />
                    SWAP Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-text-muted mb-1">SWAP Status</div>
                      <StatusBadge
                        status={swapSettings.exists ? 'success' : 'neutral'}
                        label={swapSettings.exists ? 'Active' : 'Not Configured'}
                        size="md"
                        showDot
                      />
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">SWAP Size</div>
                      <div className="text-xl font-bold text-text-primary">{swapSettings.size} GB</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">SWAP Used</div>
                      <div className="text-xl font-bold text-text-primary">{swapSettings.used} GB</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-bg-overlay rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">SWAP Usage</span>
                      <span className="text-sm font-medium text-text-primary">
                        {((swapSettings.used / swapSettings.size) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <UsageBar
                      value={(swapSettings.used / swapSettings.size) * 100}
                      variant="disk"
                      size="md"
                      showLabel={false}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">vm.swappiness</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={swapSettings.swappiness}
                        onChange={(e) => {
                          setSwapSettings({ ...swapSettings, swappiness: parseInt(e.target.value) });
                          setHasChanges(true);
                        }}
                        className="w-32"
                      />
                      <p className="text-xs text-text-muted">Lower = prefer RAM, Higher = prefer SWAP (recommended: 10)</p>
                    </div>
                    
                    <div className="flex items-end">
                      <AlertBanner
                        variant={serverRAM < 8 ? 'info' : 'success'}
                        message={swapSettings.recommendation}
                        size="sm"
                        showIcon={false}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    {!swapSettings.exists ? (
                      <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                        Create SWAP ({serverRAM}GB recommended)
                      </Button>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                          Resize SWAP
                        </Button>
                        <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                          Remove SWAP
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Limits Tab */}
          {activeTab === 'system' && systemLimits && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    System Limits (ulimit)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">open files (-n)</label>
                      <Input
                        type="number"
                        value={systemLimits.openFiles}
                        readOnly
                        className="bg-bg-overlay"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">max processes (-u)</label>
                      <Input
                        type="number"
                        value={systemLimits.maxProcesses}
                        readOnly
                        className="bg-bg-overlay"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">core file size (-c)</label>
                      <Input
                        type="number"
                        value={systemLimits.coreFileSize}
                        readOnly
                        className="bg-bg-overlay"
                      />
                    </div>
                  </div>
                  
                  <AlertBanner
                    variant="info"
                    message="To change ulimit settings, edit /etc/security/limits.conf"
                    size="sm"
                    showIcon
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Sysctl Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(systemLimits.sysctl).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary font-mono text-xs">{key}</label>
                        <Input
                          type="number"
                          value={value}
                          onChange={(e) => {
                            setSystemLimits({
                              ...systemLimits,
                              sysctl: { ...systemLimits.sysctl, [key]: parseInt(e.target.value) },
                            });
                            setHasChanges(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="primary" size="sm" leftIcon={<Save className="w-4 h-4" />}>
                    Apply & Save to /etc/sysctl.conf
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Panel Settings Tab */}
          {activeTab === 'panel' && panelSettings && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          setPanelSettings({ ...panelSettings, theme: 'dark' });
                          setHasChanges(true);
                        }}
                        className={cn(
                          'flex flex-col items-center p-4 rounded-md border-2 transition-all',
                          panelSettings.theme === 'dark'
                            ? 'border-accent bg-accent-subtle'
                            : 'border-border bg-bg-surface hover:border-border-hover'
                        )}
                      >
                        <Moon className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Dark</span>
                      </button>
                      <button
                        onClick={() => {
                          setPanelSettings({ ...panelSettings, theme: 'light' });
                          setHasChanges(true);
                        }}
                        className={cn(
                          'flex flex-col items-center p-4 rounded-md border-2 transition-all',
                          panelSettings.theme === 'light'
                            ? 'border-accent bg-accent-subtle'
                            : 'border-border bg-bg-surface hover:border-border-hover'
                        )}
                      >
                        <Sun className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">Light</span>
                      </button>
                      <button
                        onClick={() => {
                          setPanelSettings({ ...panelSettings, theme: 'system' });
                          setHasChanges(true);
                        }}
                        className={cn(
                          'flex flex-col items-center p-4 rounded-md border-2 transition-all',
                          panelSettings.theme === 'system'
                            ? 'border-accent bg-accent-subtle'
                            : 'border-border bg-bg-surface hover:border-border-hover'
                        )}
                      >
                        <Monitor className="w-6 h-6 mb-2" />
                        <span className="text-sm font-medium">System</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Language</label>
                    <Select
                      value={panelSettings.language}
                      onValueChange={(value) => {
                        setPanelSettings({ ...panelSettings, language: value as any });
                        setHasChanges(true);
                      }}
                      className="w-full md:w-48"
                    >
                      {LANGUAGES.map((lang) => (
                        <Select.Item key={lang.code} value={lang.code}>
                          {lang.name}
                        </Select.Item>
                      ))}
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Timezone</label>
                    <Select
                      value={panelSettings.timezone}
                      onValueChange={(value) => {
                        setPanelSettings({ ...panelSettings, timezone: value });
                        setHasChanges(true);
                      }}
                      className="w-full md:w-64"
                    >
                      {TIMEZONES.map((tz) => (
                        <Select.Item key={tz} value={tz}>
                          {tz}
                        </Select.Item>
                      ))}
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Toggle
                    label="Email notifications"
                    checked={panelSettings.emailNotifications}
                    onCheckedChange={(checked) => {
                      setPanelSettings({ ...panelSettings, emailNotifications: checked });
                      setHasChanges(true);
                    }}
                  />
                  <Toggle
                    label="Telegram notifications"
                    checked={panelSettings.telegramNotifications}
                    onCheckedChange={(checked) => {
                      setPanelSettings({ ...panelSettings, telegramNotifications: checked });
                      setHasChanges(true);
                    }}
                  />
                  <Toggle
                    label="Check for panel updates automatically"
                    checked={panelSettings.updateCheck}
                    onCheckedChange={(checked) => {
                      setPanelSettings({ ...panelSettings, updateCheck: checked });
                      setHasChanges(true);
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && userProfile && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Name</label>
                    <Input
                      value={userProfile.name}
                      onChange={(e) => {
                        setUserProfile({ ...userProfile, name: e.target.value });
                        setHasChanges(true);
                      }}
                      className="w-full md:w-96"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Email</label>
                    <Input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => {
                        setUserProfile({ ...userProfile, email: e.target.value });
                        setHasChanges(true);
                      }}
                      className="w-full md:w-96"
                      leftIcon={<Mail className="w-4 h-4" />}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <div className="text-xs text-text-muted mb-1">Role</div>
                      <div className="text-sm font-medium text-text-primary">{userProfile.role}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Member Since</div>
                      <div className="text-sm font-medium text-text-primary">
                        {new Date(userProfile.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Last Login</div>
                      <div className="text-sm font-medium text-text-primary">
                        {new Date(userProfile.lastLoginAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Current Password</label>
                    <div className="flex gap-2">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="flex-1"
                        leftIcon={<Lock className="w-4 h-4" />}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">New Password</label>
                    <div className="flex gap-2">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="flex-1"
                        leftIcon={<Lock className="w-4 h-4" />}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Confirm New Password</label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full md:w-96"
                      leftIcon={<Lock className="w-4 h-4" />}
                    />
                  </div>
                  
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleChangePassword}
                    disabled={isSaving || !passwordForm.newPassword}
                    leftIcon={isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  >
                    {isSaving ? 'Changing...' : 'Change Password'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && securitySettings && (
            <div className="space-y-6">
              {/* 2FA */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Two-Factor Authentication
                    </div>
                    <StatusBadge
                      status={securitySettings.twoFactorEnabled ? 'success' : 'neutral'}
                      label={securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      size="sm"
                      showDot
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-text-secondary">
                    Add an extra layer of security to your account by enabling 2FA. You'll need to enter a code from your authenticator app when logging in.
                  </p>
                  
                  <div className="flex items-center gap-2">
                    {!securitySettings.twoFactorEnabled ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIs2FAModalOpen(true)}
                        leftIcon={<Smartphone className="w-4 h-4" />}
                      >
                        Enable 2FA
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setIs2FAModalOpen(true)}
                        leftIcon={<Lock className="w-4 h-4" />}
                      >
                        Disable 2FA
                      </Button>
                    )}
                  </div>
                  
                  {securitySettings.twoFactorEnabled && showBackupCodes && (
                    <AlertBanner
                      variant="warning"
                      title="Backup Codes"
                      message="Save these codes in a safe place. Each code can only be used once."
                      size="sm"
                      showIcon
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                        {backupCodes.map((code, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-bg-base rounded border border-border font-mono text-xs"
                          >
                            <span>{code}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => navigator.clipboard.writeText(code)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </AlertBanner>
                  )}
                </CardContent>
              </Card>

              {/* Active Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Active Sessions
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTerminateAllOtherSessions}
                      leftIcon={<LogOut className="w-3.5 h-3.5" />}
                    >
                      End All Other Sessions
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {securitySettings.sessions.map((session) => (
                      <div
                        key={session.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-md border',
                          session.current ? 'border-accent bg-accent-subtle' : 'border-border bg-bg-surface'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-md bg-bg-overlay flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-text-secondary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">
                                {session.browser}
                              </span>
                              {session.current && (
                                <StatusBadge status="success" label="Current" size="sm" />
                              )}
                            </div>
                            <div className="text-xs text-text-secondary mt-1">
                              {session.ip} {session.country && `(${session.country})`} • {session.os}
                            </div>
                            <div className="text-xs text-text-muted mt-1">
                              Last active: {new Date(session.lastActive).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        {!session.current && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTerminateSession(session.id)}
                            leftIcon={<LogOut className="w-3.5 h-3.5" />}
                          >
                            End Session
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Login Attempts */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Login Attempts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-text-muted mb-1">Failed Attempts</div>
                      <div className="text-xl font-bold text-text-primary">
                        {securitySettings.loginAttempts.count}
                      </div>
                    </div>
                    {securitySettings.loginAttempts.lastAttempt && (
                      <div>
                        <div className="text-xs text-text-muted mb-1">Last Attempt</div>
                        <div className="text-sm font-medium text-text-primary">
                          {new Date(securitySettings.loginAttempts.lastAttempt).toLocaleString()}
                        </div>
                      </div>
                    )}
                    {securitySettings.loginAttempts.blockedUntil && (
                      <div>
                        <div className="text-xs text-text-muted mb-1">Blocked Until</div>
                        <div className="text-sm font-medium text-error">
                          {new Date(securitySettings.loginAttempts.blockedUntil).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageContent>

      {/* 2FA Modal */}
      <Modal
        open={is2FAModalOpen}
        onOpenChange={setIs2FAModalOpen}
        title={securitySettings?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        size="md"
      >
        <div className="space-y-4">
          {!securitySettings?.twoFactorEnabled ? (
            <>
              <AlertBanner
                variant="info"
                title="Setup Two-Factor Authentication"
                message="Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)"
                size="sm"
                showIcon
              />
              
              <div className="flex justify-center py-6">
                <div className="w-48 h-48 bg-white rounded-md flex items-center justify-center">
                  {/* QR Code placeholder - would be generated dynamically */}
                  <div className="text-center text-text-muted">
                    <Smartphone className="w-16 h-16 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">QR Code</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Or enter this secret manually
                </label>
                <div className="flex items-center gap-2 p-3 bg-bg-base rounded-md border border-border font-mono">
                  <code className="text-sm text-text-primary">JBSWY3DPEHPK3PXP</code>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Enter verification code from your app
                </label>
                <Input
                  placeholder="000000"
                  maxLength={6}
                  className="w-48 text-center text-lg tracking-widest"
                />
              </div>
              
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setIs2FAModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleEnable2FA} leftIcon={<Check className="w-4 h-4" />}>
                  Enable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <AlertBanner
                variant="warning"
                title="Disable 2FA"
                message="Are you sure you want to disable 2FA? Your account will be less secure."
                size="sm"
                showIcon
              />
              
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="ghost" size="sm" onClick={() => setIs2FAModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleDisable2FA} leftIcon={<Lock className="w-4 h-4" />}>
                  Disable 2FA
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </AppShell>
  );
}