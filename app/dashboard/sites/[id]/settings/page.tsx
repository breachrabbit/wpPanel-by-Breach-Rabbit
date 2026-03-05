'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Site Settings Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Comprehensive site configuration: general, PHP, SSL, redirects, security
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
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';
import {
  Save,
  Globe,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Plus,
  X,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Link as LinkIcon,
  Unlink,
  Database,
  FileText,
  Key,
  Server,
  Clock,
  Activity,
  Eye,
  EyeOff,
  ArrowLeft,
  RotateCcw,
  Upload,
  Download,
  Settings,
  Terminal,
  Layers,
  HardDrive,
  Cpu,
  MemoryStick,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type SiteStatus = 'running' | 'stopped' | 'error' | 'maintenance';
type SiteType = 'wordpress' | 'static' | 'php' | 'nodejs' | 'proxy' | 'docker';
type SslStatus = 'active' | 'expiring' | 'expired' | 'none';

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
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  rootPath: string;
  createdAt: string;
  updatedAt: string;
}

interface Redirect {
  id: string;
  type: '301' | '302';
  from: string;
  to: string;
  enabled: boolean;
}

interface BasicAuth {
  enabled: boolean;
  username: string;
  password?: string;
}

interface EnvVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  database: string;
  isPrimary: boolean;
}

// =============================================================================
// 🏗️ SITE SETTINGS PAGE COMPONENT
// =============================================================================

export default function SiteSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;
  
  // State
  const [site, setSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    domainAliases: [] as string[],
    phpVersion: '8.3',
    autoRestart: true,
    healthCheck: true,
    rootPath: '',
  });
  
  // Additional settings
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [basicAuth, setBasicAuth] = useState<BasicAuth>({
    enabled: false,
    username: '',
    password: '',
  });
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [dbConnections, setDbConnections] = useState<DatabaseConnection[]>([]);
  
  // UI state
  const [newAlias, setNewAlias] = useState('');
  const [newRedirect, setNewRedirect] = useState<Partial<Redirect>>({
    type: '301',
    from: '',
    to: '',
    enabled: true,
  });
  const [newEnvVar, setNewEnvVar] = useState<Partial<EnvVariable>>({
    key: '',
    value: '',
    isSecret: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchSiteSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API call
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
        rootPath: '/var/www/example.com',
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const mockRedirects: Redirect[] = [
        { id: '1', type: '301', from: '/old-page', to: '/new-page', enabled: true },
        { id: '2', type: '302', from: '/temp', to: '/temporary', enabled: false },
      ];
      
      const mockEnvVars: EnvVariable[] = [
        { id: '1', key: 'APP_ENV', value: 'production', isSecret: false },
        { id: '2', key: 'API_KEY', value: 'sk-***', isSecret: true },
      ];
      
      setSite(mockSite);
      setRedirects(mockRedirects);
      setEnvVars(mockEnvVars);
      
      // Initialize form data
      setFormData({
        name: mockSite.name,
        domain: mockSite.domain,
        domainAliases: mockSite.domainAliases,
        phpVersion: mockSite.phpVersion,
        autoRestart: mockSite.autoRestart,
        healthCheck: mockSite.healthCheck,
        rootPath: mockSite.rootPath,
      });
    } catch (error) {
      console.error('Failed to fetch site settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchSiteSettings();
  }, [fetchSiteSettings]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/sites/${siteId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          redirects,
          basicAuth,
          envVars,
        }),
      });
      setHasChanges(false);
      // Show success toast
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!confirm('Are you absolutely sure? This action cannot be undone. All files, databases, and configurations will be permanently deleted.')) {
      return;
    }
    
    // Double confirmation
    const confirmText = prompt(`Type "${site?.domain}" to confirm deletion:`);
    if (confirmText !== site?.domain) {
      return;
    }
    
    try {
      await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
      router.push('/dashboard/sites');
    } catch (error) {
      console.error('Failed to delete site:', error);
    }
  };

  const handleAddAlias = () => {
    if (!newAlias || formData.domainAliases.includes(newAlias)) return;
    setFormData(prev => ({
      ...prev,
      domainAliases: [...prev.domainAliases, newAlias],
    }));
    setNewAlias('');
    setHasChanges(true);
  };

  const handleRemoveAlias = (alias: string) => {
    setFormData(prev => ({
      ...prev,
      domainAliases: prev.domainAliases.filter(a => a !== alias),
    }));
    setHasChanges(true);
  };

  const handleAddRedirect = () => {
    if (!newRedirect.from || !newRedirect.to) return;
    const redirect: Redirect = {
      id: Date.now().toString(),
      type: newRedirect.type as '301' | '302',
      from: newRedirect.from,
      to: newRedirect.to,
      enabled: newRedirect.enabled ?? true,
    };
    setRedirects(prev => [...prev, redirect]);
    setNewRedirect({ type: '301', from: '', to: '', enabled: true });
    setHasChanges(true);
  };

  const handleRemoveRedirect = (id: string) => {
    setRedirects(prev => prev.filter(r => r.id !== id));
    setHasChanges(true);
  };

  const handleToggleRedirect = (id: string) => {
    setRedirects(prev =>
      prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    setHasChanges(true);
  };

  const handleAddEnvVar = () => {
    if (!newEnvVar.key || !newEnvVar.value) return;
    const envVar: EnvVariable = {
      id: Date.now().toString(),
      key: newEnvVar.key,
      value: newEnvVar.value,
      isSecret: newEnvVar.isSecret ?? false,
    };
    setEnvVars(prev => [...prev, envVar]);
    setNewEnvVar({ key: '', value: '', isSecret: false });
    setHasChanges(true);
  };

  const handleRemoveEnvVar = (id: string) => {
    setEnvVars(prev => prev.filter(e => e.id !== id));
    setHasChanges(true);
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show toast notification
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Check for changes
  useEffect(() => {
    if (!site) return;
    
    const hasChanges =
      formData.name !== site.name ||
      formData.domain !== site.domain ||
      JSON.stringify(formData.domainAliases) !== JSON.stringify(site.domainAliases) ||
      formData.phpVersion !== site.phpVersion ||
      formData.autoRestart !== site.autoRestart ||
      formData.healthCheck !== site.healthCheck;
    
    setHasChanges(hasChanges);
  }, [formData, site]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader title="Site Settings" />
        <PageContent>
          <div className="space-y-6">
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

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Site Settings"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sites', href: '/dashboard/sites' },
          { label: site.name, href: `/dashboard/sites/${siteId}` },
          { label: 'Settings' },
        ]}
        description={`Configure ${site.domain}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/sites/${siteId}`)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Site
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              leftIcon={
                isSaving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )
              }
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Unsaved Changes Warning */}
          {hasChanges && (
            <AlertBanner
              variant="warning"
              title="Unsaved Changes"
              message="You have unsaved changes. Don't forget to save before leaving."
              action={{
                label: 'Save Now',
                onClick: handleSave,
              }}
              dismissible={false}
            />
          )}

          {/* Settings Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 bg-transparent h-auto">
              <TabsTrigger
                value="general"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="php"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                PHP
              </TabsTrigger>
              <TabsTrigger
                value="redirects"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Redirects
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Security
              </TabsTrigger>
              <TabsTrigger
                value="env"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                Env Vars
              </TabsTrigger>
              <TabsTrigger
                value="danger"
                className="data-[state=active]:bg-error data-[state=active]:text-white"
              >
                Danger
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      Site Name
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        setHasChanges(true);
                      }}
                      className="w-full md:w-96"
                      placeholder="My Website"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      Primary Domain
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.domain}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, domain: e.target.value }));
                          setHasChanges(true);
                        }}
                        className="flex-1 md:w-96"
                        placeholder="example.com"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyToClipboard(formData.domain, 'Domain')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(`https://${formData.domain}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Domain Aliases */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      Domain Aliases
                    </label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newAlias}
                        onChange={(e) => setNewAlias(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                        className="flex-1 md:w-64"
                        placeholder="www.example.com"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAddAlias}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.domainAliases.map((alias) => (
                        <div
                          key={alias}
                          className="flex items-center gap-2 px-3 py-1.5 bg-bg-overlay rounded-md"
                        >
                          <span className="text-sm text-text-primary">{alias}</span>
                          <button
                            onClick={() => handleRemoveAlias(alias)}
                            className="text-text-muted hover:text-error transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {formData.domainAliases.length === 0 && (
                        <span className="text-sm text-text-muted">No aliases configured</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      Root Path
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.rootPath}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, rootPath: e.target.value }));
                          setHasChanges(true);
                        }}
                        className="flex-1 md:w-96"
                        placeholder="/var/www/example.com"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyToClipboard(formData.rootPath, 'Root Path')}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      Site Type
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary capitalize">{site.type}</span>
                      <StatusBadge status="info" label="Read-only" size="sm" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      Created
                    </label>
                    <div className="text-sm text-text-primary">
                      {new Date(site.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Auto-Restart & Health Check */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Auto-Restart & Health Check
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-bg-overlay rounded-md">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-accent-subtle flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          Auto-Restart
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          Automatically restart site if it crashes or becomes unresponsive
                        </div>
                      </div>
                    </div>
                    <Toggle
                      checked={formData.autoRestart}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, autoRestart: checked }));
                        setHasChanges(true);
                      }}
                      size="md"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-bg-overlay rounded-md">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-md bg-info-subtle flex items-center justify-center flex-shrink-0">
                        <Activity className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">
                          Health Check
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          Monitor site availability every 60 seconds via HTTP request
                        </div>
                      </div>
                    </div>
                    <Toggle
                      checked={formData.healthCheck}
                      onCheckedChange={(checked) => {
                        setFormData(prev => ({ ...prev, healthCheck: checked }));
                        setHasChanges(true);
                      }}
                      size="md"
                    />
                  </div>

                  {/* Health Status */}
                  {formData.healthCheck && (
                    <div className="p-4 bg-bg-overlay rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text-secondary">
                          Current Health Status
                        </span>
                        <StatusBadge
                          status={
                            site.healthStatus === 'healthy'
                              ? 'success'
                              : site.healthStatus === 'unhealthy'
                              ? 'error'
                              : 'neutral'
                          }
                          label={site.healthStatus.charAt(0).toUpperCase() + site.healthStatus.slice(1)}
                          size="sm"
                          showDot
                          animated={site.healthStatus === 'healthy'}
                        />
                      </div>
                      <div className="text-xs text-text-secondary">
                        Last check: {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* PHP Settings Tab */}
            <TabsContent value="php" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    PHP Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">
                      PHP Version
                    </label>
                    <Select
                      value={formData.phpVersion}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, phpVersion: value }));
                        setHasChanges(true);
                      }}
                      className="w-full md:w-48"
                    >
                      <Select.Item value="8.2">PHP 8.2</Select.Item>
                      <Select.Item value="8.3">PHP 8.3</Select.Item>
                      <Select.Item value="8.4">PHP 8.4</Select.Item>
                      <Select.Item value="8.5">PHP 8.5</Select.Item>
                    </Select>
                    <p className="text-xs text-text-muted">
                      Changing PHP version will restart the site automatically
                    </p>
                  </div>

                  <AlertBanner
                    variant="info"
                    title="PHP Settings"
                    message="For advanced PHP configuration (php.ini, extensions, OPcache), visit the Server Settings page."
                    action={{
                      label: 'Go to Server Settings',
                      onClick: () => router.push('/dashboard/settings/php'),
                    }}
                    size="sm"
                  />

                  {/* Current PHP Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div className="p-4 bg-bg-overlay rounded-md">
                      <div className="text-xs text-text-muted mb-1">Version</div>
                      <div className="text-sm font-medium text-text-primary">
                        {formData.phpVersion}
                      </div>
                    </div>
                    <div className="p-4 bg-bg-overlay rounded-md">
                      <div className="text-xs text-text-muted mb-1">Handler</div>
                      <div className="text-sm font-medium text-text-primary">
                        LSAPI
                      </div>
                    </div>
                    <div className="p-4 bg-bg-overlay rounded-md">
                      <div className="text-xs text-text-muted mb-1">Memory Limit</div>
                      <div className="text-sm font-medium text-text-primary">
                        256M
                      </div>
                    </div>
                    <div className="p-4 bg-bg-overlay rounded-md">
                      <div className="text-xs text-text-muted mb-1">Max Upload</div>
                      <div className="text-sm font-medium text-text-primary">
                        64M
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Redirects Tab */}
            <TabsContent value="redirects" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    URL Redirects
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Redirect Form */}
                  <div className="p-4 bg-bg-overlay rounded-md space-y-3">
                    <div className="text-sm font-medium text-text-primary">
                      Add New Redirect
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <Select
                        value={newRedirect.type}
                        onValueChange={(value: '301' | '302') =>
                          setNewRedirect(prev => ({ ...prev, type: value }))
                        }
                        className="w-full"
                      >
                        <Select.Item value="301">301 Permanent</Select.Item>
                        <Select.Item value="302">302 Temporary</Select.Item>
                      </Select>
                      <Input
                        value={newRedirect.from}
                        onChange={(e) =>
                          setNewRedirect(prev => ({ ...prev, from: e.target.value }))
                        }
                        placeholder="/old-path"
                        className="w-full"
                      />
                      <Input
                        value={newRedirect.to}
                        onChange={(e) =>
                          setNewRedirect(prev => ({ ...prev, to: e.target.value }))
                        }
                        placeholder="/new-path"
                        className="w-full"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAddRedirect}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="w-full"
                      >
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Redirects List */}
                  <div className="space-y-2">
                    {redirects.length === 0 ? (
                      <div className="text-center py-8 text-text-muted">
                        <LinkIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No redirects configured</p>
                      </div>
                    ) : (
                      redirects.map((redirect) => (
                        <div
                          key={redirect.id}
                          className="flex items-center justify-between p-4 bg-bg-overlay rounded-md"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                redirect.enabled ? 'bg-success' : 'bg-text-muted'
                              )}
                            />
                            <div className="flex items-center gap-2 flex-1">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-xs font-medium',
                                  redirect.type === '301'
                                    ? 'bg-info-subtle text-info'
                                    : 'bg-warning-subtle text-warning'
                                )}
                              >
                                {redirect.type}
                              </span>
                              <span className="text-sm text-text-primary font-mono">
                                {redirect.from}
                              </span>
                              <ArrowLeft className="w-4 h-4 text-text-muted rotate-180" />
                              <span className="text-sm text-text-primary font-mono">
                                {redirect.to}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleToggleRedirect(redirect.id)}
                            >
                              {redirect.enabled ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-error hover:text-error"
                              onClick={() => handleRemoveRedirect(redirect.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6 mt-6">
              {/* Basic Auth */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Basic Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-bg-overlay rounded-md">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        Enable Basic Auth
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        Require username and password to access the site
                      </div>
                    </div>
                    <Toggle
                      checked={basicAuth.enabled}
                      onCheckedChange={(checked) => {
                        setBasicAuth(prev => ({ ...prev, enabled: checked }));
                        setHasChanges(true);
                      }}
                      size="md"
                    />
                  </div>

                  {basicAuth.enabled && (
                    <div className="space-y-3 p-4 bg-bg-overlay rounded-md">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">
                          Username
                        </label>
                        <Input
                          value={basicAuth.username}
                          onChange={(e) => {
                            setBasicAuth(prev => ({ ...prev, username: e.target.value }));
                            setHasChanges(true);
                          }}
                          className="w-full md:w-64"
                          placeholder="admin"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-text-secondary">
                          Password
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={basicAuth.password}
                            onChange={(e) => {
                              setBasicAuth(prev => ({ ...prev, password: e.target.value }));
                              setHasChanges(true);
                            }}
                            className="flex-1 md:w-64"
                            placeholder="••••••••"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SSL Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    SSL Certificate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-bg-overlay rounded-md">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        SSL Status
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {site.sslStatus === 'active'
                          ? 'Certificate is active and valid'
                          : site.sslStatus === 'expiring'
                          ? 'Certificate expires soon'
                          : site.sslStatus === 'expired'
                          ? 'Certificate has expired'
                          : 'No SSL certificate'}
                      </div>
                    </div>
                    <StatusBadge
                      status={
                        site.sslStatus === 'active'
                          ? 'success'
                          : site.sslStatus === 'expiring'
                          ? 'warning'
                          : site.sslStatus === 'expired'
                          ? 'error'
                          : 'neutral'
                      }
                      label={site.sslStatus.charAt(0).toUpperCase() + site.sslStatus.slice(1)}
                      size="md"
                    />
                  </div>

                  {site.sslExpiresAt && (
                    <div className="p-4 bg-bg-overlay rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-text-secondary">
                          Expires On
                        </span>
                        <span className="text-sm text-text-primary">
                          {new Date(site.sslExpiresAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-text-secondary">
                          Days Remaining
                        </span>
                        <span className="text-sm font-medium text-text-primary">
                          {Math.ceil(
                            (new Date(site.sslExpiresAt).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24)
                          )}{' '}
                          days
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/dashboard/ssl/${siteId}`)}
                    leftIcon={<Shield className="w-4 h-4" />}
                  >
                    Manage SSL
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Environment Variables Tab */}
            <TabsContent value="env" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Environment Variables
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add Env Var Form */}
                  <div className="p-4 bg-bg-overlay rounded-md space-y-3">
                    <div className="text-sm font-medium text-text-primary">
                      Add New Variable
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        value={newEnvVar.key}
                        onChange={(e) =>
                          setNewEnvVar(prev => ({ ...prev, key: e.target.value }))
                        }
                        placeholder="API_KEY"
                        className="w-full"
                      />
                      <Input
                        value={newEnvVar.value}
                        onChange={(e) =>
                          setNewEnvVar(prev => ({ ...prev, value: e.target.value }))
                        }
                        placeholder="value"
                        className="w-full"
                      />
                      <div className="flex gap-2">
                        <Toggle
                          label="Secret"
                          checked={newEnvVar.isSecret}
                          onCheckedChange={(checked) =>
                            setNewEnvVar(prev => ({ ...prev, isSecret: checked as boolean }))
                          }
                          size="sm"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleAddEnvVar}
                          leftIcon={<Plus className="w-4 h-4" />}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Env Vars List */}
                  <div className="space-y-2">
                    {envVars.length === 0 ? (
                      <div className="text-center py-8 text-text-muted">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No environment variables configured</p>
                      </div>
                    ) : (
                      envVars.map((envVar) => (
                        <div
                          key={envVar.id}
                          className="flex items-center justify-between p-4 bg-bg-overlay rounded-md"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                envVar.isSecret ? 'bg-error' : 'bg-info'
                              )}
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-text-primary font-mono">
                                {envVar.key}
                              </div>
                              <div className="text-xs text-text-secondary font-mono">
                                {envVar.isSecret ? '••••••••' : envVar.value}
                              </div>
                            </div>
                            {envVar.isSecret && (
                              <StatusBadge status="error" label="Secret" size="sm" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                handleCopyToClipboard(envVar.value, envVar.key)
                              }
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-error hover:text-error"
                              onClick={() => handleRemoveEnvVar(envVar.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <AlertBanner
                    variant="info"
                    title="Environment Variables"
                    message="These variables are available to your application at runtime. Secret values are masked in the UI."
                    size="sm"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Danger Zone Tab */}
            <TabsContent value="danger" className="space-y-6 mt-6">
              <Card className="border-error">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-error">
                    <Trash2 className="w-4 h-4" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-error-subtle border border-error rounded-md">
                    <div className="text-sm font-medium text-error mb-2">
                      Delete Site
                    </div>
                    <div className="text-xs text-text-secondary mb-4">
                      This action cannot be undone. All files, databases, configurations, and
                      backups associated with this site will be permanently deleted.
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-xs text-text-secondary">
                        <strong>Domain:</strong> {site.domain}
                      </div>
                      <div className="text-xs text-text-secondary">
                        <strong>Created:</strong>{' '}
                        {new Date(site.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                      onClick={handleDeleteSite}
                    >
                      Delete Site Permanently
                    </Button>
                  </div>

                  <AlertBanner
                    variant="warning"
                    title="Warning"
                    message="Make sure you have backups of all important data before deleting this site."
                    size="sm"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageContent>
    </AppShell>
  );
}