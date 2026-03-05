'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Create New Site Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Multi-step wizard for creating new sites (WordPress, Static, PHP, Node.js, Proxy)
// =============================================================================

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AppShell, PageHeader, PageContent, Section } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import {
  Globe,
  Wordpress,
  FileText,
  Terminal,
  Server,
  Container,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Database,
  Shield,
  Zap,
  Settings,
  User,
  Mail,
  Lock,
  Languages,
  Package,
  Plus,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  ExternalLink,
  Copy,
} from 'lucide-react';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type SiteType = 'wordpress' | 'static' | 'php' | 'nodejs' | 'proxy' | 'docker';
type PHPVersion = '8.2' | '8.3' | '8.4' | '8.5';
type WPVersion = 'latest' | '6.4' | '6.3' | '6.2';
type WPLanguage = 'en_US' | 'ru_RU' | 'es_ES' | 'de_DE' | 'fr_FR' | 'it_IT' | 'pt_BR' | 'zh_CN' | 'ja' | 'ko';

interface SiteFormData {
  // Basic
  name: string;
  domain: string;
  domainAliases: string[];
  type: SiteType;
  phpVersion: PHPVersion;
  
  // WordPress specific
  wpVersion: WPVersion;
  wpLanguage: WPLanguage;
  wpTitle: string;
  wpAdminUser: string;
  wpAdminPassword: string;
  wpAdminEmail: string;
  wpPlugins: string[];
  
  // Database
  createDatabase: boolean;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  existingDbId?: string;
  
  // SSL
  sslEnabled: boolean;
  sslType: 'letsencrypt' | 'zerossl' | 'custom';
  forceHttps: boolean;
  
  // Advanced
  autoRestart: boolean;
  healthCheck: boolean;
  rootPath: string;
  nodeVersion?: string;
  proxyUrl?: string;
  dockerImage?: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const SITE_TYPES: Array<{
  type: SiteType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { type: 'wordpress', label: 'WordPress', description: 'Install WordPress with one click', icon: Wordpress, color: 'text-wordpress' },
  { type: 'static', label: 'Static Site', description: 'HTML, CSS, JS files', icon: FileText, color: 'text-info' },
  { type: 'php', label: 'PHP Application', description: 'Custom PHP application', icon: Terminal, color: 'text-text-primary' },
  { type: 'nodejs', label: 'Node.js App', description: 'Node.js application with PM2', icon: Server, color: 'text-success' },
  { type: 'proxy', label: 'Reverse Proxy', description: 'Proxy to external service', icon: Globe, color: 'text-warning' },
  { type: 'docker', label: 'Docker Container', description: 'Docker container proxy', icon: Container, color: 'text-accent' },
];

const PHP_VERSIONS: PHPVersion[] = ['8.2', '8.3', '8.4', '8.5'];
const WP_VERSIONS: Array<{ value: WPVersion; label: string }> = [
  { value: 'latest', label: 'Latest (6.4)' },
  { value: '6.4', label: '6.4' },
  { value: '6.3', label: '6.3' },
  { value: '6.2', label: '6.2' },
];

const WP_LANGUAGES: Array<{ code: WPLanguage; name: string }> = [
  { code: 'en_US', name: 'English (United States)' },
  { code: 'ru_RU', name: 'Русский' },
  { code: 'es_ES', name: 'Español' },
  { code: 'de_DE', name: 'Deutsch' },
  { code: 'fr_FR', name: 'Français' },
  { code: 'it_IT', name: 'Italiano' },
  { code: 'pt_BR', name: 'Português (Brasil)' },
  { code: 'zh_CN', name: '中文 (简体)' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

const RECOMMENDED_PLUGINS = [
  { slug: 'litespeed-cache', name: 'LiteSpeed Cache', required: true, description: 'Required for OLS LSCache integration' },
  { slug: 'redis-object-cache', name: 'Redis Object Cache', required: true, description: 'Fast object cache via Redis' },
  { slug: 'wordfence', name: 'Wordfence Security', required: false, description: 'Firewall and security scanner' },
  { slug: 'wp-super-cache', name: 'WP Super Cache', required: false, description: 'Static cache (if not using LSCache)' },
];

const STEPS: Step[] = [
  { id: 1, title: 'Site Type', description: 'Choose what you want to create', icon: Globe },
  { id: 2, title: 'Domain', description: 'Configure domain and SSL', icon: Globe },
  { id: 3, title: 'Database', description: 'Database configuration', icon: Database },
  { id: 4, title: 'WordPress', description: 'WordPress settings', icon: Wordpress },
  { id: 5, title: 'Advanced', description: 'Additional settings', icon: Settings },
  { id: 6, title: 'Review', description: 'Review and create', icon: Check },
];

const getDefaultFormData = (): SiteFormData => ({
  name: '',
  domain: '',
  domainAliases: [],
  type: 'wordpress',
  phpVersion: '8.3',
  wpVersion: 'latest',
  wpLanguage: 'en_US',
  wpTitle: '',
  wpAdminUser: 'admin',
  wpAdminPassword: '',
  wpAdminEmail: '',
  wpPlugins: ['litespeed-cache', 'redis-object-cache', 'wordfence'],
  createDatabase: true,
  dbName: '',
  dbUser: '',
  dbPassword: '',
  sslEnabled: true,
  sslType: 'letsencrypt',
  forceHttps: true,
  autoRestart: true,
  healthCheck: true,
  rootPath: '',
});

// =============================================================================
// 🏗️ CREATE SITE PAGE COMPONENT
// =============================================================================

export default function CreateSitePage() {
  const router = useRouter();
  
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SiteFormData>(getDefaultFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState<{
    isRunning: boolean;
    progress: number;
    currentStep: string;
  }>({
    isRunning: false,
    progress: 0,
    currentStep: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableDatabases, setAvailableDatabases] = useState<Array<{ id: string; name: string }>>([]);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  useEffect(() => {
    // Fetch available databases for selection
    const fetchDatabases = async () => {
      try {
        // Mock data - replace with real API call
        await new Promise(resolve => setTimeout(resolve, 300));
        setAvailableDatabases([
          { id: '1', name: 'existing_db_1' },
          { id: '2', name: 'existing_db_2' },
        ]);
      } catch (error) {
        console.error('Failed to fetch databases:', error);
      }
    };
    
    fetchDatabases();
  }, []);

  // Auto-generate names from domain
  useEffect(() => {
    if (formData.domain && !formData.name) {
      const name = formData.domain.replace(/^(www\.)?/, '').split('.')[0];
      setFormData(prev => ({ ...prev, name: name.charAt(0).toUpperCase() + name.slice(1) }));
    }
  }, [formData.domain]);

  // Auto-generate database names
  useEffect(() => {
    if (formData.domain && formData.createDatabase) {
      const dbName = 'wp_' + formData.domain.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 20);
      const dbUser = 'wpuser_' + formData.domain.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 15);
      setFormData(prev => ({ ...prev, dbName, dbUser }));
    }
  }, [formData.domain, formData.createDatabase]);

  // =============================================================================
  // 🔧 VALIDATION
  // =============================================================================

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch (step) {
      case 1: // Site Type
        if (!formData.type) {
          newErrors.type = 'Please select a site type';
        }
        break;
      
      case 2: // Domain
        if (!formData.domain) {
          newErrors.domain = 'Domain is required';
        } else if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(formData.domain)) {
          newErrors.domain = 'Invalid domain format';
        }
        if (formData.sslEnabled && formData.sslType === 'letsencrypt' && !formData.domain.includes('.')) {
          newErrors.domain = 'Let\'s Encrypt requires a valid domain';
        }
        break;
      
      case 3: // Database
        if (formData.createDatabase) {
          if (!formData.dbName) {
            newErrors.dbName = 'Database name is required';
          } else if (!/^[a-z0-9_]+$/i.test(formData.dbName)) {
            newErrors.dbName = 'Database name can only contain letters, numbers, and underscores';
          }
          if (!formData.dbUser) {
            newErrors.dbUser = 'Database user is required';
          } else if (!/^[a-z0-9_]+$/i.test(formData.dbUser)) {
            newErrors.dbUser = 'Database user can only contain letters, numbers, and underscores';
          }
          if (!formData.dbPassword || formData.dbPassword.length < 8) {
            newErrors.dbPassword = 'Password must be at least 8 characters';
          }
        }
        break;
      
      case 4: // WordPress
        if (formData.type === 'wordpress') {
          if (!formData.wpAdminUser || formData.wpAdminUser.length < 3) {
            newErrors.wpAdminUser = 'Admin username must be at least 3 characters';
          }
          if (!formData.wpAdminPassword || formData.wpAdminPassword.length < 8) {
            newErrors.wpAdminPassword = 'Password must be at least 8 characters';
          }
          if (!formData.wpAdminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.wpAdminEmail)) {
            newErrors.wpAdminEmail = 'Valid email is required';
          }
        }
        break;
      
      case 5: // Advanced
        if (formData.type === 'nodejs' && !formData.nodeVersion) {
          newErrors.nodeVersion = 'Node.js version is required';
        }
        if (formData.type === 'proxy' && !formData.proxyUrl) {
          newErrors.proxyUrl = 'Proxy URL is required';
        }
        if (formData.type === 'docker' && !formData.dockerImage) {
          newErrors.dockerImage = 'Docker image is required';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCreateSite = async () => {
    if (!validateStep(currentStep)) {
      return;
    }
    
    setIsCreating(true);
    setCreationProgress({
      isRunning: true,
      progress: 0,
      currentStep: 'Initializing...',
    });
    
    try {
      // Mock site creation with progress
      const steps = [
        { progress: 10, step: 'Creating site configuration...' },
        { progress: 30, step: 'Setting up virtual host...' },
        formData.createDatabase ? { progress: 50, step: 'Creating database...' } : { progress: 50, step: 'Configuring database...' },
        formData.type === 'wordpress' ? { progress: 70, step: 'Installing WordPress...' } : { progress: 70, step: 'Setting up application...' },
        formData.sslEnabled ? { progress: 85, step: 'Issuing SSL certificate...' } : { progress: 85, step: 'Finalizing configuration...' },
        { progress: 95, step: 'Starting services...' },
        { progress: 100, step: 'Complete!' },
      ];
      
      for (const step of steps) {
        setCreationProgress(prev => ({
          ...prev,
          progress: step.progress,
          currentStep: step.step,
        }));
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      // Redirect to site details
      setTimeout(() => {
        router.push('/dashboard/sites');
      }, 1000);
    } catch (error) {
      console.error('Failed to create site:', error);
      setCreationProgress(prev => ({
        ...prev,
        isRunning: false,
        currentStep: 'Failed to create site',
      }));
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddAlias = () => {
    const aliasInput = document.getElementById('alias-input') as HTMLInputElement;
    if (aliasInput && aliasInput.value) {
      if (!formData.domainAliases.includes(aliasInput.value)) {
        setFormData(prev => ({
          ...prev,
          domainAliases: [...prev.domainAliases, aliasInput.value],
        }));
      }
      aliasInput.value = '';
    }
  };

  const handleRemoveAlias = (alias: string) => {
    setFormData(prev => ({
      ...prev,
      domainAliases: prev.domainAliases.filter(a => a !== alias),
    }));
  };

  const handleTogglePlugin = (slug: string) => {
    setFormData(prev => ({
      ...prev,
      wpPlugins: prev.wpPlugins.includes(slug)
        ? prev.wpPlugins.filter(p => p !== slug)
        : [...prev.wpPlugins, slug],
    }));
  };

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({
      ...prev,
      wpAdminPassword: password,
      dbPassword: password,
    }));
  };

  // =============================================================================
  // 🏗️ RENDER STEP CONTENT
  // =============================================================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Site Type
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Choose Site Type
              </h2>
              <p className="text-sm text-text-secondary">
                Select the type of site you want to create
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SITE_TYPES.map((siteType) => {
                const Icon = siteType.icon;
                const isSelected = formData.type === siteType.type;
                
                return (
                  <button
                    key={siteType.type}
                    onClick={() => setFormData(prev => ({ ...prev, type: siteType.type }))}
                    className={cn(
                      'flex flex-col items-center p-6 rounded-md border-2 transition-all',
                      isSelected
                        ? 'border-accent bg-accent-subtle'
                        : 'border-border bg-bg-surface hover:border-border-hover'
                    )}
                  >
                    <div className={cn('w-12 h-12 rounded-md flex items-center justify-center mb-3', siteType.color)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-medium text-text-primary mb-1">
                      {siteType.label}
                    </h3>
                    <p className="text-xs text-text-secondary text-center">
                      {siteType.description}
                    </p>
                    {isSelected && (
                      <div className="mt-3">
                        <StatusBadge status="success" label="Selected" size="sm" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {formData.type === 'wordpress' && (
              <AlertBanner
                variant="info"
                title="WordPress Auto-Configuration"
                message="LiteSpeed Cache and Redis Object Cache will be automatically installed and configured for optimal performance with OpenLiteSpeed."
                size="sm"
              />
            )}
          </div>
        );

      case 2: // Domain
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Domain Configuration
              </h2>
              <p className="text-sm text-text-secondary">
                Set up your domain and SSL certificate
              </p>
            </div>
            
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Site Name <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Website"
                  variant={errors.name ? 'error' : 'default'}
                  errorMessage={errors.name}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Primary Domain <span className="text-error">*</span>
                </label>
                <Input
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value.toLowerCase() }))}
                  placeholder="example.com"
                  variant={errors.domain ? 'error' : 'default'}
                  errorMessage={errors.domain}
                  leftIcon={<Globe className="w-4 h-4" />}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">
                  Domain Aliases
                </label>
                <div className="flex gap-2">
                  <Input
                    id="alias-input"
                    placeholder="www.example.com"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAlias())}
                    className="flex-1"
                  />
                  <Button variant="secondary" size="sm" onClick={handleAddAlias} type="button">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.domainAliases.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
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
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Enable SSL</div>
                    <div className="text-xs text-text-secondary">Free Let's Encrypt certificate</div>
                  </div>
                  <Toggle
                    checked={formData.sslEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sslEnabled: checked }))}
                  />
                </div>
                
                {formData.sslEnabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-accent-subtle">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">SSL Provider</label>
                      <Select
                        value={formData.sslType}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, sslType: value as any }))}
                        className="w-full"
                      >
                        <Select.Item value="letsencrypt">Let's Encrypt (Free)</Select.Item>
                        <Select.Item value="zerossl">ZeroSSL (Free)</Select.Item>
                        <Select.Item value="custom">Custom Certificate</Select.Item>
                      </Select>
                    </div>
                    
                    <Toggle
                      label="Force HTTPS redirect"
                      checked={formData.forceHttps}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, forceHttps: checked }))}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 3: // Database
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Database Configuration
              </h2>
              <p className="text-sm text-text-secondary">
                Set up database for your site
              </p>
            </div>
            
            <div className="space-y-4 max-w-lg mx-auto">
              <Toggle
                label="Create new database"
                checked={formData.createDatabase}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, createDatabase: checked }))}
                description={formData.createDatabase ? 'A new database will be created automatically' : 'Select an existing database'}
              />
              
              {formData.createDatabase ? (
                <div className="space-y-3 pl-4 border-l-2 border-accent-subtle">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Database Name</label>
                    <Input
                      value={formData.dbName}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbName: e.target.value }))}
                      placeholder="wp_example"
                      variant={errors.dbName ? 'error' : 'default'}
                      errorMessage={errors.dbName}
                      leftIcon={<Database className="w-4 h-4" />}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Database User</label>
                    <Input
                      value={formData.dbUser}
                      onChange={(e) => setFormData(prev => ({ ...prev, dbUser: e.target.value }))}
                      placeholder="wpuser_example"
                      variant={errors.dbUser ? 'error' : 'default'}
                      errorMessage={errors.dbUser}
                      leftIcon={<User className="w-4 h-4" />}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Database Password</label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={formData.dbPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, dbPassword: e.target.value }))}
                        placeholder="••••••••"
                        variant={errors.dbPassword ? 'error' : 'default'}
                        errorMessage={errors.dbPassword}
                        className="flex-1"
                        leftIcon={<Lock className="w-4 h-4" />}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={generateSecurePassword}
                        type="button"
                        title="Generate secure password"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pl-4 border-l-2 border-accent-subtle">
                  <label className="text-sm font-medium text-text-secondary">Select Existing Database</label>
                  <Select
                    value={formData.existingDbId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, existingDbId: value }))}
                    className="w-full"
                  >
                    {availableDatabases.map((db) => (
                      <Select.Item key={db.id} value={db.id}>
                        {db.name}
                      </Select.Item>
                    ))}
                  </Select>
                  {availableDatabases.length === 0 && (
                    <p className="text-xs text-text-muted">No existing databases available</p>
                  )}
                </div>
              )}
              
              <AlertBanner
                variant="info"
                title="Database Security"
                message="Database credentials are stored securely and only accessible by this site."
                size="sm"
              />
            </div>
          </div>
        );

      case 4: // WordPress
        return formData.type === 'wordpress' ? (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                WordPress Configuration
              </h2>
              <p className="text-sm text-text-secondary">
                Set up your WordPress installation
              </p>
            </div>
            
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">WordPress Version</label>
                  <Select
                    value={formData.wpVersion}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, wpVersion: value as WPVersion }))}
                    className="w-full"
                  >
                    {WP_VERSIONS.map((version) => (
                      <Select.Item key={version.value} value={version.value}>
                        {version.label}
                      </Select.Item>
                    ))}
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Language</label>
                  <Select
                    value={formData.wpLanguage}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, wpLanguage: value as WPLanguage }))}
                    className="w-full"
                  >
                    {WP_LANGUAGES.map((lang) => (
                      <Select.Item key={lang.code} value={lang.code}>
                        {lang.name}
                      </Select.Item>
                    ))}
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Site Title</label>
                <Input
                  value={formData.wpTitle || formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, wpTitle: e.target.value }))}
                  placeholder={formData.name || 'My WordPress Site'}
                  leftIcon={<Globe className="w-4 h-4" />}
                />
              </div>
              
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text-primary mb-3">Admin Account</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Admin Username</label>
                    <Input
                      value={formData.wpAdminUser}
                      onChange={(e) => setFormData(prev => ({ ...prev, wpAdminUser: e.target.value }))}
                      placeholder="admin"
                      variant={errors.wpAdminUser ? 'error' : 'default'}
                      errorMessage={errors.wpAdminUser}
                      leftIcon={<User className="w-4 h-4" />}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Admin Email</label>
                    <Input
                      type="email"
                      value={formData.wpAdminEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, wpAdminEmail: e.target.value }))}
                      placeholder="admin@example.com"
                      variant={errors.wpAdminEmail ? 'error' : 'default'}
                      errorMessage={errors.wpAdminEmail}
                      leftIcon={<Mail className="w-4 h-4" />}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Admin Password</label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={formData.wpAdminPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, wpAdminPassword: e.target.value }))}
                        placeholder="••••••••"
                        variant={errors.wpAdminPassword ? 'error' : 'default'}
                        errorMessage={errors.wpAdminPassword}
                        className="flex-1"
                        leftIcon={<Lock className="w-4 h-4" />}
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={generateSecurePassword}
                        type="button"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text-primary mb-3">Plugins</h3>
                <div className="space-y-2">
                  {RECOMMENDED_PLUGINS.map((plugin) => (
                    <div
                      key={plugin.slug}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-md border',
                        plugin.required ? 'bg-accent-subtle border-accent-border' : 'bg-bg-overlay border-border'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.wpPlugins.includes(plugin.slug)}
                          onChange={() => !plugin.required && handleTogglePlugin(plugin.slug)}
                          disabled={plugin.required}
                          className={cn(
                            'w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent mt-0.5',
                            plugin.required && 'opacity-50 cursor-not-allowed'
                          )}
                        />
                        <div>
                          <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                            {plugin.name}
                            {plugin.required && (
                              <StatusBadge status="info" label="Required" size="sm" />
                            )}
                          </div>
                          <div className="text-xs text-text-secondary">{plugin.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Info className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Not Applicable
            </h3>
            <p className="text-sm text-text-secondary">
              WordPress configuration is only available for WordPress sites
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              className="mt-4"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Skip to Advanced Settings
            </Button>
          </div>
        );

      case 5: // Advanced
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Advanced Settings
              </h2>
              <p className="text-sm text-text-secondary">
                Configure additional options for your site
              </p>
            </div>
            
            <div className="space-y-4 max-w-lg mx-auto">
              {/* PHP Version */}
              {formData.type !== 'static' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">PHP Version</label>
                  <Select
                    value={formData.phpVersion}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, phpVersion: value as PHPVersion }))}
                    className="w-full"
                  >
                    {PHP_VERSIONS.map((version) => (
                      <Select.Item key={version} value={version}>
                        PHP {version}
                      </Select.Item>
                    ))}
                  </Select>
                </div>
              )}
              
              {/* Type-specific settings */}
              {formData.type === 'nodejs' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Node.js Version</label>
                  <Select
                    value={formData.nodeVersion || '18'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, nodeVersion: value }))}
                    className="w-full"
                  >
                    <Select.Item value="18">Node.js 18 LTS</Select.Item>
                    <Select.Item value="20">Node.js 20 LTS</Select.Item>
                    <Select.Item value="21">Node.js 21</Select.Item>
                  </Select>
                  {errors.nodeVersion && (
                    <p className="text-xs text-error">{errors.nodeVersion}</p>
                  )}
                </div>
              )}
              
              {formData.type === 'proxy' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Proxy URL</label>
                  <Input
                    value={formData.proxyUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, proxyUrl: e.target.value }))}
                    placeholder="http://localhost:3000"
                    variant={errors.proxyUrl ? 'error' : 'default'}
                    errorMessage={errors.proxyUrl}
                    leftIcon={<ExternalLink className="w-4 h-4" />}
                  />
                </div>
              )}
              
              {formData.type === 'docker' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Docker Image</label>
                  <Input
                    value={formData.dockerImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, dockerImage: e.target.value }))}
                    placeholder="nginx:latest"
                    variant={errors.dockerImage ? 'error' : 'default'}
                    errorMessage={errors.dockerImage}
                    leftIcon={<Container className="w-4 h-4" />}
                  />
                </div>
              )}
              
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text-primary mb-3">Site Management</h3>
                <div className="space-y-3">
                  <Toggle
                    label="Auto-Restart"
                    checked={formData.autoRestart}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoRestart: checked }))}
                    description="Automatically restart site if it crashes"
                  />
                  
                  <Toggle
                    label="Health Check"
                    checked={formData.healthCheck}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, healthCheck: checked }))}
                    description="Monitor site availability every 60 seconds"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  rightIcon={showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  className="w-full justify-between"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                </Button>
                
                {showAdvanced && (
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-accent-subtle">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-text-secondary">Root Path</label>
                      <Input
                        value={formData.rootPath}
                        onChange={(e) => setFormData(prev => ({ ...prev, rootPath: e.target.value }))}
                        placeholder="/var/www/example.com"
                        leftIcon={<FolderOpen className="w-4 h-4" />}
                      />
                      <p className="text-xs text-text-muted">Leave empty for automatic path</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 6: // Review
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                Review & Create
              </h2>
              <p className="text-sm text-text-secondary">
                Review your configuration before creating the site
              </p>
            </div>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              {/* Summary Cards */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-text-muted">Site Name</span>
                    <span className="text-sm text-text-primary font-medium">{formData.name || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-text-muted">Domain</span>
                    <span className="text-sm text-text-primary font-medium">{formData.domain || '—'}</span>
                  </div>
                  {formData.domainAliases.length > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Aliases</span>
                      <span className="text-sm text-text-secondary">{formData.domainAliases.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-text-muted">Type</span>
                    <div className="flex items-center gap-2">
                      {React.createElement(
                        SITE_TYPES.find(t => t.type === formData.type)?.icon || Globe,
                        { className: 'w-4 h-4' }
                      )}
                      <span className="text-sm text-text-primary font-medium">
                        {SITE_TYPES.find(t => t.type === formData.type)?.label}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Security & SSL
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-text-muted">SSL Enabled</span>
                    <StatusBadge
                      status={formData.sslEnabled ? 'success' : 'neutral'}
                      label={formData.sslEnabled ? 'Yes' : 'No'}
                      size="sm"
                    />
                  </div>
                  {formData.sslEnabled && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-text-muted">Provider</span>
                        <span className="text-sm text-text-primary capitalize">{formData.sslType}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-text-muted">Force HTTPS</span>
                        <StatusBadge
                          status={formData.forceHttps ? 'success' : 'neutral'}
                          label={formData.forceHttps ? 'Yes' : 'No'}
                          size="sm"
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {formData.type === 'wordpress' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wordpress className="w-4 h-4" />
                      WordPress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Version</span>
                      <span className="text-sm text-text-primary">
                        {WP_VERSIONS.find(v => v.value === formData.wpVersion)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Language</span>
                      <span className="text-sm text-text-primary">
                        {WP_LANGUAGES.find(l => l.code === formData.wpLanguage)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border">
                      <span className="text-sm text-text-muted">Admin User</span>
                      <span className="text-sm text-text-primary">{formData.wpAdminUser}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-text-muted">Plugins</span>
                      <span className="text-sm text-text-secondary">{formData.wpPlugins.length} selected</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-text-muted">Create New</span>
                    <StatusBadge
                      status={formData.createDatabase ? 'success' : 'neutral'}
                      label={formData.createDatabase ? 'Yes' : 'No'}
                      size="sm"
                    />
                  </div>
                  {formData.createDatabase ? (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-sm text-text-muted">Database Name</span>
                        <span className="text-sm text-text-primary font-mono">{formData.dbName}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-text-muted">Database User</span>
                        <span className="text-sm text-text-primary font-mono">{formData.dbUser}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-text-muted">Existing Database</span>
                      <span className="text-sm text-text-primary">
                        {availableDatabases.find(db => db.id === formData.existingDbId)?.name || '—'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <AlertBanner
                variant="warning"
                title="Ready to Create"
                message="Once created, some settings like domain and site type cannot be changed. Make sure everything is correct."
                size="sm"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  if (creationProgress.isRunning) {
    return (
      <AppShell>
        <PageHeader title="Creating Site" />
        <PageContent>
          <Card>
            <CardContent className="p-12">
              <div className="max-w-md mx-auto text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-accent-subtle flex items-center justify-center mx-auto">
                  <RefreshCw className="w-8 h-8 text-accent animate-spin" />
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-text-primary mb-2">
                    Creating Your Site
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {creationProgress.currentStep}
                  </p>
                </div>
                
                <ProgressBar
                  value={creationProgress.progress}
                  variant="info"
                  showLabel
                  animated
                />
                
                <AlertBanner
                  variant="info"
                  message="This process may take a few minutes. Please don't close this window."
                  size="sm"
                  dismissible={false}
                />
              </div>
            </CardContent>
          </Card>
        </PageContent>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Create New Site"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sites', href: '/dashboard/sites' },
          { label: 'Create' },
        ]}
        description="Set up a new website or application"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/sites')}
            leftIcon={<X className="w-4 h-4" />}
          >
            Cancel
          </Button>
        }
      />

      <PageContent>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Steps */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  
                  return (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div
                          className={cn(
                            'flex items-center justify-center',
                            'w-10 h-10',
                            'rounded-full',
                            'transition-all duration-200',
                            isCompleted && 'bg-success text-white',
                            isCurrent && 'bg-accent text-white ring-4 ring-accent-subtle',
                            !isCompleted && !isCurrent && 'bg-bg-overlay text-text-muted'
                          )}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5" aria-hidden="true" />
                          ) : (
                            <Icon className="w-5 h-5" aria-hidden="true" />
                          )}
                        </div>
                        <div className="text-center hidden md:block">
                          <div className={cn(
                            'text-xs font-medium',
                            isCompleted && 'text-success',
                            isCurrent && 'text-accent',
                            !isCompleted && !isCurrent && 'text-text-muted'
                          )}>
                            {step.title}
                          </div>
                          <div className="text-xs text-text-muted">{step.description}</div>
                        </div>
                      </div>
                      
                      {index < STEPS.length - 1 && (
                        <div
                          className={cn(
                            'flex-1 h-0.5 mx-2',
                            'transition-colors duration-200',
                            isCompleted ? 'bg-success' : 'bg-bg-overlay'
                          )}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          <Card>
            <CardContent className="p-6">
              {renderStepContent()}
            </CardContent>
            
            {/* Footer Navigation */}
            <CardFooter className="px-6 py-4 border-t border-border flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={currentStep === 1}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">
                  Step {currentStep} of {STEPS.length}
                </span>
                {currentStep === STEPS.length ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateSite}
                    disabled={isCreating}
                    leftIcon={isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  >
                    {isCreating ? 'Creating...' : 'Create Site'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleNext}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          {/* Help Section */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-1">
                    Need Help?
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Check our documentation for detailed guides on creating different types of sites.
                    Most sites can be created in under 2 minutes.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 px-2"
                    leftIcon={<ExternalLink className="w-3 h-3" />}
                  >
                    View Documentation
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </AppShell>
  );
}