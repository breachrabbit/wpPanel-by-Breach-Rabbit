'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Browser Installer Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Beautiful 11-step wizard with live terminal, hardware detection, and optimal settings
// =============================================================================

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { HardwareCard } from '@/components/ui/HardwareCard';
import { InstallerStep } from '@/components/ui/InstallerStep';
import { TerminalWindow } from '@/components/ui/TerminalWindow';
import {
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Shield,
  Database,
  User,
  Settings,
  Bell,
  Zap,
  Wordpress,
  CheckCircle,
  AlertTriangle,
  Terminal,
  ChevronRight,
  ChevronLeft,
  Lock,
  Globe,
  Mail,
  Activity,
} from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type InstallerStepId =
  | 'welcome'
  | 'hardware'
  | 'dependencies'
  | 'database'
  | 'admin'
  | 'server'
  | 'ols'
  | 'optional'
  | 'optimize'
  | 'wordpress'
  | 'complete';

interface StepConfig {
  id: InstallerStepId;
  number: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface HardwareInfo {
  cpu: {
    cores: number;
    model: string;
  };
  ram: {
    total: number;
    available: number;
  };
  disk: {
    total: number;
    available: number;
    type: 'NVMe' | 'SSD' | 'HDD' | 'Unknown';
  };
  os: {
    name: string;
    version: string;
  };
  recommendedProfile: 'WordPress Optimized' | 'General Purpose' | 'High Performance';
}

interface OptimalSettings {
  swap: {
    create: boolean;
    size: number;
  };
  php: {
    memoryLimit: string;
    workers: number;
    opcache: number;
  };
  mariadb: {
    innodbBufferPool: string;
    maxConnections: number;
  };
  ols: {
    maxConnections: number;
    keepAlive: boolean;
  };
}

interface InstallerFormData {
  // Database
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  
  // Admin
  adminEmail: string;
  adminPassword: string;
  adminName: string;
  
  // Server
  panelDomain: string;
  panelPort: string;
  sslEmail: string;
  
  // OLS
  olsUrl: string;
  olsUser: string;
  olsPassword: string;
  
  // Optional
  telegramBot: string;
  telegramChatId: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  
  // WordPress
  installWordPress: boolean;
  wpDomain: string;
  wpTitle: string;
  wpAdminUser: string;
  wpAdminPassword: string;
  wpAdminEmail: string;
  wpLanguage: string;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const STEPS: StepConfig[] = [
  { id: 'welcome', number: 1, title: 'Welcome', description: 'Introduction', icon: Server },
  { id: 'hardware', number: 2, title: 'Hardware', description: 'Server analysis', icon: Cpu },
  { id: 'dependencies', number: 3, title: 'Dependencies', description: 'Install packages', icon: Shield },
  { id: 'database', number: 4, title: 'Database', description: 'PostgreSQL setup', icon: Database },
  { id: 'admin', number: 5, title: 'Admin', description: 'Create account', icon: User },
  { id: 'server', number: 6, title: 'Server', description: 'Server settings', icon: Settings },
  { id: 'ols', number: 7, title: 'OpenLiteSpeed', description: 'OLS integration', icon: Zap },
  { id: 'optional', number: 8, title: 'Optional', description: 'Additional services', icon: Bell },
  { id: 'optimize', number: 9, title: 'Optimize', description: 'Apply settings', icon: Zap },
  { id: 'wordpress', number: 10, title: 'WordPress', description: 'Optional install', icon: Wordpress },
  { id: 'complete', number: 11, title: 'Complete', description: 'Installation done', icon: CheckCircle },
];

const DEFAULT_FORM_DATA: InstallerFormData = {
  dbHost: 'localhost',
  dbPort: '5432',
  dbName: 'wppanel',
  dbUser: 'wppanel',
  dbPassword: '',
  adminEmail: '',
  adminPassword: '',
  adminName: 'Admin',
  panelDomain: '',
  panelPort: '3000',
  sslEmail: '',
  olsUrl: 'http://localhost:7080',
  olsUser: 'admin',
  olsPassword: '',
  telegramBot: '',
  telegramChatId: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  installWordPress: false,
  wpDomain: '',
  wpTitle: 'My WordPress Site',
  wpAdminUser: 'admin',
  wpAdminPassword: '',
  wpAdminEmail: '',
  wpLanguage: 'en_US',
};

const WP_LANGUAGES = [
  { code: 'en_US', name: 'English (United States)' },
  { code: 'ru_RU', name: 'Русский' },
  { code: 'es_ES', name: 'Español' },
  { code: 'de_DE', name: 'Deutsch' },
  { code: 'fr_FR', name: 'Français' },
  { code: 'it_IT', name: 'Italiano' },
  { code: 'pt_BR', name: 'Português (Brasil)' },
  { code: 'zh_CN', name: '中文 (简体)' },
  { code: 'ja', name: '日本語' },
];

// =============================================================================
// 🏗️ INSTALLER PAGE COMPONENT
// =============================================================================

export default function InstallerPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<InstallerStepId>('welcome');
  const [formData, setFormData] = useState<InstallerFormData>(DEFAULT_FORM_DATA);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [optimalSettings, setOptimalSettings] = useState<OptimalSettings | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installStatus, setInstallStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [installError, setInstallError] = useState<string | null>(null);
  const [terminalSessionId, setTerminalSessionId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  // =============================================================================
  // 🔄 INITIALIZATION
  // =============================================================================

  // Detect hardware on mount
  useEffect(() => {
    const detectHardware = async () => {
      try {
        // Mock hardware detection - replace with real API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockHardware: HardwareInfo = {
          cpu: { cores: 4, model: 'Intel Xeon E5-2680' },
          ram: { total: 16, available: 14 },
          disk: { total: 100, available: 85, type: 'NVMe' },
          os: { name: 'Ubuntu', version: '22.04 LTS' },
          recommendedProfile: 'WordPress Optimized',
        };
        
        setHardware(mockHardware);
        
        // Calculate optimal settings based on hardware
        const settings = calculateOptimalSettings(mockHardware);
        setOptimalSettings(settings);
      } catch (error) {
        console.error('Failed to detect hardware:', error);
      }
    };
    
    detectHardware();
  }, []);

  // Prevent navigation during installation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isInstalling && !isCompleted) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isInstalling, isCompleted]);

  // Block back navigation during installation
  useEffect(() => {
    if (isInstalling && !isCompleted) {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = () => {
        window.history.pushState(null, '', window.location.href);
      };
    }
  }, [isInstalling, isCompleted]);

  // =============================================================================
  // 🔧 HELPERS
  // =============================================================================

  const calculateOptimalSettings = (hw: HardwareInfo): OptimalSettings => {
    const ram = hw.ram.total;
    const cpuCores = hw.cpu.cores;
    
    // Logic from MASTER_PLAN.md
    if (ram <= 2) {
      return {
        swap: { create: true, size: 2 },
        php: { memoryLimit: '128M', workers: 2, opcache: 64 },
        mariadb: { innodbBufferPool: '256M', maxConnections: 50 },
        ols: { maxConnections: 50, keepAlive: true },
      };
    } else if (ram <= 4) {
      return {
        swap: { create: true, size: 4 },
        php: { memoryLimit: '256M', workers: 4, opcache: 128 },
        mariadb: { innodbBufferPool: '512M', maxConnections: 100 },
        ols: { maxConnections: 100, keepAlive: true },
      };
    } else if (ram <= 8) {
      return {
        swap: { create: true, size: 4 },
        php: { memoryLimit: '256M', workers: 8, opcache: 256 },
        mariadb: { innodbBufferPool: '1G', maxConnections: 150 },
        ols: { maxConnections: 150, keepAlive: true },
      };
    } else if (ram <= 16) {
      return {
        swap: { create: false, size: 0 },
        php: { memoryLimit: '512M', workers: cpuCores * 3, opcache: 512 },
        mariadb: { innodbBufferPool: `${Math.floor(ram * 0.5)}G`, maxConnections: 200 },
        ols: { maxConnections: 200, keepAlive: true },
      };
    } else {
      return {
        swap: { create: false, size: 0 },
        php: { memoryLimit: '512M', workers: cpuCores * 4, opcache: 1024 },
        mariadb: { innodbBufferPool: `${Math.floor(ram * 0.6)}G`, maxConnections: 300 },
        ols: { maxConnections: 300, keepAlive: true },
      };
    }
  };

  const getCurrentStepIndex = () => STEPS.findIndex(s => s.id === currentStep);
  
  const getStepStatus = (stepId: InstallerStepId): 'completed' | 'active' | 'pending' => {
    const currentIndex = getCurrentStepIndex();
    const stepIndex = STEPS.findIndex(s => s.id === stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'hardware':
        return hardware !== null;
      case 'dependencies':
        return installStatus === 'success';
      case 'database':
        return formData.dbPassword.length >= 8;
      case 'admin':
        return formData.adminEmail.includes('@') && formData.adminPassword.length >= 8;
      case 'server':
        return formData.panelDomain.length > 0 && formData.sslEmail.includes('@');
      case 'ols':
        return formData.olsPassword.length > 0;
      case 'optional':
        return true; // Optional step
      case 'optimize':
        return optimalSettings !== null;
      case 'wordpress':
        return !formData.installWordPress || (formData.wpDomain.length > 0 && formData.wpAdminPassword.length >= 8);
      case 'complete':
        return true;
    }
  };

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const handleStartInstallation = async () => {
    setIsInstalling(true);
    setInstallStatus('running');
    setInstallProgress(0);
    
    try {
      // Create terminal session for live output
      const terminalResponse = await fetch('/api/terminal/create', { method: 'POST' });
      const terminalData = await terminalResponse.json();
      setTerminalSessionId(terminalData.sessionId);
      
      // Run installation via API
      const installResponse = await fetch('/api/installer/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          hardware,
          optimalSettings,
        }),
      });
      
      if (!installResponse.ok) {
        throw new Error('Installation failed');
      }
      
      // Simulate progress (real implementation would use WebSocket)
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 200);
      
      // Wait for installation to complete
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      clearInterval(progressInterval);
      setInstallProgress(100);
      setInstallStatus('success');
      setIsCompleted(true);
      
      // Complete installation
      await fetch('/api/installer/complete', { method: 'POST' });
      
    } catch (error) {
      console.error('Installation error:', error);
      setInstallStatus('error');
      setInstallError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  // =============================================================================
  // 🏗️ RENDER STEP CONTENT
  // =============================================================================

  const renderStepContent = () => {
    switch (currentStep) {
      // =======================================================================
      // STEP 1: WELCOME
      // =======================================================================
      case 'welcome':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center mb-6">
              <Server className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-3">
              Welcome to wpPanel
            </h1>
            <p className="text-lg text-text-secondary mb-8 max-w-md">
              Modern server control panel for WordPress hosting built on OpenLiteSpeed.
              Let's set up your server in a few minutes.
            </p>
            <AlertBanner
              variant="info"
              title="Before You Start"
              message="This installer will configure OpenLiteSpeed, MariaDB, PostgreSQL, Redis, and other services. The process takes about 5-10 minutes."
              size="md"
            />
          </div>
        );

      // =======================================================================
      // STEP 2: HARDWARE
      // =======================================================================
      case 'hardware':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Server Hardware Analysis
              </h2>
              <p className="text-sm text-text-secondary">
                We've detected your server specifications and calculated optimal settings
              </p>
            </div>
            
            {hardware ? (
              <>
                <HardwareCard
                  hardware={hardware}
                  optimalSettings={optimalSettings || undefined}
                  showSettings
                />
                
                <AlertBanner
                  variant="success"
                  title="Recommended Profile"
                  message={`Optimized for WordPress hosting based on ${hardware.ram.total}GB RAM and ${hardware.cpu.cores} CPU cores`}
                  size="sm"
                />
              </>
            ) : (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center">
                    <Activity className="w-8 h-8 text-text-muted mb-3 animate-pulse" />
                    <p className="text-sm text-text-secondary">Detecting hardware...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      // =======================================================================
      // STEP 3: DEPENDENCIES
      // =======================================================================
      case 'dependencies':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Installing System Dependencies
              </h2>
              <p className="text-sm text-text-secondary">
                OpenLiteSpeed, MariaDB, PostgreSQL, Redis, and other required packages
              </p>
            </div>
            
            {installStatus === 'idle' && (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center">
                    <Shield className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                    <p className="text-sm text-text-secondary mb-4">
                      Ready to install dependencies
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={handleStartInstallation}
                      leftIcon={<Shield className="w-4 h-4" />}
                    >
                      Start Installation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {installStatus === 'running' && (
              <Card>
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-accent animate-spin" />
                      <span className="text-sm text-text-primary">Installing packages...</span>
                    </div>
                    <ProgressBar value={installProgress} variant="info" showLabel animated />
                    <div className="text-xs text-text-muted">
                      This may take a few minutes. Do not close this window.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {installStatus === 'success' && (
              <AlertBanner
                variant="success"
                title="Dependencies Installed"
                message="All required packages have been installed successfully"
                size="md"
                showIcon
              />
            )}
            
            {installStatus === 'error' && (
              <AlertBanner
                variant="error"
                title="Installation Failed"
                message={installError || 'Unknown error occurred'}
                size="md"
                action={{
                  label: 'Retry',
                  onClick: handleStartInstallation,
                }}
              />
            )}
            
            {/* Live Terminal */}
            {terminalSessionId && installStatus === 'running' && (
              <div className="h-64">
                <TerminalWindow
                  sessionId={terminalSessionId}
                  wsUrl={`ws://${window.location.host}/api/terminal/${terminalSessionId}`}
                  showToolbar={false}
                  height="100%"
                />
              </div>
            )}
          </div>
        );

      // =======================================================================
      // STEP 4: DATABASE
      // =======================================================================
      case 'database':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Panel Database Setup
              </h2>
              <p className="text-sm text-text-secondary">
                PostgreSQL credentials for wpPanel internal database
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Host</label>
                    <Input
                      value={formData.dbHost}
                      onChange={(e) => setFormData({ ...formData, dbHost: e.target.value })}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Port</label>
                    <Input
                      value={formData.dbPort}
                      onChange={(e) => setFormData({ ...formData, dbPort: e.target.value })}
                      placeholder="5432"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Database Name</label>
                  <Input
                    value={formData.dbName}
                    onChange={(e) => setFormData({ ...formData, dbName: e.target.value })}
                    placeholder="wppanel"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Username</label>
                  <Input
                    value={formData.dbUser}
                    onChange={(e) => setFormData({ ...formData, dbUser: e.target.value })}
                    placeholder="wppanel"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Password</label>
                  <Input
                    type="password"
                    value={formData.dbPassword}
                    onChange={(e) => setFormData({ ...formData, dbPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    // Test connection
                    const response = await fetch('/api/installer/test-db', {
                      method: 'POST',
                      body: JSON.stringify({
                        host: formData.dbHost,
                        port: formData.dbPort,
                        database: formData.dbName,
                        user: formData.dbUser,
                        password: formData.dbPassword,
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert('Connection successful!');
                    } else {
                      alert('Connection failed: ' + result.error);
                    }
                  }}
                  leftIcon={<Database className="w-4 h-4" />}
                >
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      // =======================================================================
      // STEP 5: ADMIN
      // =======================================================================
      case 'admin':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Admin Account
              </h2>
              <p className="text-sm text-text-secondary">
                Create your administrator account for wpPanel
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Name</label>
                  <Input
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    placeholder="Admin"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Email</label>
                  <Input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@example.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Password</label>
                  <Input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                </div>
                
                <AlertBanner
                  variant="info"
                  message="Two-factor authentication (2FA) can be enabled after setup"
                  size="sm"
                  showIcon={false}
                />
              </CardContent>
            </Card>
          </div>
        );

      // =======================================================================
      // STEP 6: SERVER
      // =======================================================================
      case 'server':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Server Settings
              </h2>
              <p className="text-sm text-text-secondary">
                Panel domain, ports, and SSL configuration
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Panel Domain</label>
                  <Input
                    value={formData.panelDomain}
                    onChange={(e) => setFormData({ ...formData, panelDomain: e.target.value })}
                    placeholder="panel.example.com"
                    leftIcon={<Globe className="w-4 h-4" />}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Panel Port</label>
                  <Input
                    value={formData.panelPort}
                    onChange={(e) => setFormData({ ...formData, panelPort: e.target.value })}
                    placeholder="3000"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">SSL Certificate Email</label>
                  <Input
                    type="email"
                    value={formData.sslEmail}
                    onChange={(e) => setFormData({ ...formData, sslEmail: e.target.value })}
                    placeholder="ssl@example.com"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                  <p className="text-xs text-text-muted">
                    Used for Let's Encrypt SSL certificates
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      // =======================================================================
      // STEP 7: OLS INTEGRATION
      // =======================================================================
      case 'ols':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                OpenLiteSpeed Integration
              </h2>
              <p className="text-sm text-text-secondary">
                OLS WebAdmin credentials for server management
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">WebAdmin URL</label>
                  <Input
                    value={formData.olsUrl}
                    onChange={(e) => setFormData({ ...formData, olsUrl: e.target.value })}
                    placeholder="http://localhost:7080"
                    leftIcon={<Globe className="w-4 h-4" />}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Username</label>
                  <Input
                    value={formData.olsUser}
                    onChange={(e) => setFormData({ ...formData, olsUser: e.target.value })}
                    placeholder="admin"
                    leftIcon={<User className="w-4 h-4" />}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Password</label>
                  <Input
                    type="password"
                    value={formData.olsPassword}
                    onChange={(e) => setFormData({ ...formData, olsPassword: e.target.value })}
                    placeholder="••••••••"
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      // =======================================================================
      // STEP 8: OPTIONAL
      // =======================================================================
      case 'optional':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Optional Services
              </h2>
              <p className="text-sm text-text-secondary">
                Configure notifications and additional services (can be skipped)
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Telegram Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Bot Token</label>
                  <Input
                    value={formData.telegramBot}
                    onChange={(e) => setFormData({ ...formData, telegramBot: e.target.value })}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Chat ID</label>
                  <Input
                    value={formData.telegramChatId}
                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                    placeholder="-1001234567890"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  SMTP (Email Notifications)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">SMTP Host</label>
                    <Input
                      value={formData.smtpHost}
                      onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Port</label>
                    <Input
                      value={formData.smtpPort}
                      onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Username</label>
                  <Input
                    value={formData.smtpUser}
                    onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                    placeholder="your@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Password</label>
                  <Input
                    type="password"
                    value={formData.smtpPass}
                    onChange={(e) => setFormData({ ...formData, smtpPass: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </CardContent>
            </Card>
            
            <AlertBanner
              variant="info"
              message="You can configure these services later in Settings"
              size="sm"
              showIcon={false}
            />
          </div>
        );

      // =======================================================================
      // STEP 9: OPTIMIZE
      // =======================================================================
      case 'optimize':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Apply Optimal Settings
              </h2>
              <p className="text-sm text-text-secondary">
                System configuration optimized for your server hardware
              </p>
            </div>
            
            {optimalSettings && hardware && (
              <div className="space-y-4">
                <HardwareCard
                  hardware={hardware}
                  optimalSettings={optimalSettings}
                  showSettings
                  compact
                />
                
                <AlertBanner
                  variant="success"
                  title="Settings Ready to Apply"
                  message={`Based on ${hardware.ram.total}GB RAM and ${hardware.cpu.cores} CPU cores`}
                  size="md"
                />
              </div>
            )}
          </div>
        );

      // =======================================================================
      // STEP 10: WORDPRESS
      // =======================================================================
      case 'wordpress':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                WordPress Installation (Optional)
              </h2>
              <p className="text-sm text-text-secondary">
                Install WordPress directly from the installer
              </p>
            </div>
            
            <Card>
              <CardContent className="p-6 space-y-4">
                <Toggle
                  label="Install WordPress now"
                  checked={formData.installWordPress}
                  onCheckedChange={(checked) => setFormData({ ...formData, installWordPress: checked })}
                />
                
                {formData.installWordPress && (
                  <div className="space-y-4 pl-4 border-l-2 border-accent-subtle">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Domain</label>
                      <Input
                        value={formData.wpDomain}
                        onChange={(e) => setFormData({ ...formData, wpDomain: e.target.value })}
                        placeholder="example.com"
                        leftIcon={<Globe className="w-4 h-4" />}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Site Title</label>
                      <Input
                        value={formData.wpTitle}
                        onChange={(e) => setFormData({ ...formData, wpTitle: e.target.value })}
                        placeholder="My WordPress Site"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Admin Username</label>
                        <Input
                          value={formData.wpAdminUser}
                          onChange={(e) => setFormData({ ...formData, wpAdminUser: e.target.value })}
                          placeholder="admin"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">Language</label>
                        <select
                          value={formData.wpLanguage}
                          onChange={(e) => setFormData({ ...formData, wpLanguage: e.target.value })}
                          className="w-full h-9 px-3 py-2 bg-bg-base border border-border rounded-md text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          {WP_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                              {lang.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Admin Password</label>
                      <Input
                        type="password"
                        value={formData.wpAdminPassword}
                        onChange={(e) => setFormData({ ...formData, wpAdminPassword: e.target.value })}
                        placeholder="••••••••"
                        leftIcon={<Lock className="w-4 h-4" />}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Admin Email</label>
                      <Input
                        type="email"
                        value={formData.wpAdminEmail}
                        onChange={(e) => setFormData({ ...formData, wpAdminEmail: e.target.value })}
                        placeholder="admin@example.com"
                        leftIcon={<Mail className="w-4 h-4" />}
                      />
                    </div>
                    
                    <AlertBanner
                      variant="info"
                      title="Auto-installed Plugins"
                      message="LiteSpeed Cache, Redis Object Cache, and Wordfence Security will be pre-configured"
                      size="sm"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      // =======================================================================
      // STEP 11: COMPLETE
      // =======================================================================
      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-success-subtle flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-3xl font-bold text-text-primary mb-3">
              Installation Complete!
            </h1>
            <p className="text-lg text-text-secondary mb-8 max-w-md">
              wpPanel has been successfully installed and configured on your server.
            </p>
            
            <Card className="w-full max-w-md mb-8">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Panel URL:</span>
                  <span className="text-text-primary font-mono">
                    {formData.panelDomain ? `https://${formData.panelDomain}` : `http://localhost:${formData.panelPort}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Admin Email:</span>
                  <span className="text-text-primary">{formData.adminEmail}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">WordPress:</span>
                  <span className={formData.installWordPress ? 'text-success' : 'text-text-muted'}>
                    {formData.installWordPress ? 'Installed' : 'Not installed'}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <AlertBanner
              variant="warning"
              title="Security Reminder"
              message="Make sure to enable 2FA in your profile settings after first login"
              size="sm"
            />
          </div>
        );

      default:
        return null;
    }
  };

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <header className="h-14 border-b border-border bg-bg-base flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-bold text-text-primary">wpPanel Installer</span>
        </div>
        <div className="text-xs text-text-muted">
          v1.0.0
        </div>
      </header>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-56px)]">
        {/* Left Sidebar - Progress */}
        <div className="w-80 border-r border-border bg-bg-surface p-6 overflow-y-auto hidden lg:block">
          <div className="space-y-1">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const status = getStepStatus(step.id);
              
              return (
                <InstallerStep
                  key={step.id}
                  step={{
                    ...step,
                    status: status === 'completed' ? 'completed' : status === 'active' ? 'active' : 'pending',
                  }}
                  collapsed={false}
                />
              );
            })}
          </div>
          
          {/* Overall Progress */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-text-secondary">
                Step {getCurrentStepIndex() + 1} of {STEPS.length}
              </span>
              <span className="text-text-primary font-medium">
                {Math.round(((getCurrentStepIndex() + 1) / STEPS.length) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-bg-overlay rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${((getCurrentStepIndex() + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 p-6 lg:p-12 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {/* Step Content */}
            <div className="mb-8">
              {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <Button
                variant="ghost"
                size="md"
                onClick={handleBack}
                disabled={getCurrentStepIndex() === 0 || isInstalling}
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              
              {currentStep === 'complete' ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleFinish}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Go to Dashboard
                </Button>
              ) : currentStep === 'dependencies' && installStatus === 'idle' ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartInstallation}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Start Installation
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleNext}
                  disabled={!canGoNext() || isInstalling}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  {currentStep === 'optimize' ? 'Apply Settings' : 'Continue'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}