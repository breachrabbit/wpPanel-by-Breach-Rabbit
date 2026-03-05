'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Firewall Management Page
// =============================================================================
// Next.js 16.1 — App Router Page
// UFW firewall management with Fail2ban integration
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
import { cn } from '@/lib/utils';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Plus,
  Trash2,
  Edit,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Globe,
  Server,
  Activity,
  BarChart3,
  Download,
  Upload,
  MoreVertical,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
  Copy,
  ExternalLink,
  RotateCcw,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type FirewallStatus = 'active' | 'inactive' | 'error';
type RuleAction = 'allow' | 'deny' | 'reject';
type RuleProtocol = 'tcp' | 'udp' | 'both';
type RuleDirection = 'in' | 'out';

interface FirewallRule {
  id: string;
  number: number;
  action: RuleAction;
  direction: RuleDirection;
  protocol: RuleProtocol;
  port: string;
  portRange?: string;
  sourceIp?: string;
  destIp?: string;
  comment?: string;
  enabled: boolean;
  createdAt: string;
}

interface BannedIP {
  ip: string;
  jail: string;
  bannedAt: string;
  expiresAt?: string;
  attempts: number;
  country?: string;
}

interface FirewallStats {
  totalRules: number;
  activeRules: number;
  bannedIPs: number;
  blockedAttempts24h: number;
  topBlockedCountries: Array<{ country: string; count: number }>;
  topBlockedIPs: Array<{ ip: string; count: number }>;
}

interface Fail2banStatus {
  active: boolean;
  jails: Array<{
    name: string;
    enabled: boolean;
    bannedCount: number;
    maxRetry: number;
    bantime: number;
    findtime: number;
  }>;
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const QUICK_PROFILES = [
  {
    id: 'web-only',
    name: 'Web Server Only',
    description: 'Allow HTTP/HTTPS, SSH',
    rules: [
      { port: '22', protocol: 'tcp', action: 'allow' as RuleAction, comment: 'SSH' },
      { port: '80', protocol: 'tcp', action: 'allow' as RuleAction, comment: 'HTTP' },
      { port: '443', protocol: 'tcp', action: 'allow' as RuleAction, comment: 'HTTPS' },
    ],
  },
  {
    id: 'ssh-only',
    name: 'SSH Only',
    description: 'Allow only SSH access',
    rules: [
      { port: '22', protocol: 'tcp', action: 'allow' as RuleAction, comment: 'SSH' },
    ],
  },
  {
    id: 'allow-all',
    name: 'Allow All',
    description: 'Allow all incoming traffic (NOT RECOMMENDED)',
    rules: [],
    defaultPolicy: 'allow',
  },
  {
    id: 'deny-all',
    name: 'Deny All',
    description: 'Block all incoming traffic (emergency)',
    rules: [
      { port: '22', protocol: 'tcp', action: 'allow' as RuleAction, comment: 'SSH' },
    ],
    defaultPolicy: 'deny',
  },
];

const COMMON_PORTS = [
  { port: '22', name: 'SSH', protocol: 'tcp' },
  { port: '80', name: 'HTTP', protocol: 'tcp' },
  { port: '443', name: 'HTTPS', protocol: 'tcp' },
  { port: '21', name: 'FTP', protocol: 'tcp' },
  { port: '25', name: 'SMTP', protocol: 'tcp' },
  { port: '53', name: 'DNS', protocol: 'both' },
  { port: '110', name: 'POP3', protocol: 'tcp' },
  { port: '143', name: 'IMAP', protocol: 'tcp' },
  { port: '3306', name: 'MySQL', protocol: 'tcp' },
  { port: '5432', name: 'PostgreSQL', protocol: 'tcp' },
  { port: '6379', name: 'Redis', protocol: 'tcp' },
  { port: '8080', name: 'HTTP Alt', protocol: 'tcp' },
  { port: '8443', name: 'HTTPS Alt', protocol: 'tcp' },
];

// =============================================================================
// 🏗️ FIREWALL PAGE COMPONENT
// =============================================================================

export default function FirewallPage() {
  const router = useRouter();
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [firewallStatus, setFirewallStatus] = useState<FirewallStatus>('inactive');
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [fail2banStatus, setFail2banStatus] = useState<Fail2banStatus | null>(null);
  const [stats, setStats] = useState<FirewallStats | null>(null);
  
  // UI State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<FirewallRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<RuleAction | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'rules' | 'fail2ban' | 'stats'>('rules');
  
  // Form State
  const [ruleForm, setRuleForm] = useState({
    action: 'allow' as RuleAction,
    direction: 'in' as RuleDirection,
    protocol: 'tcp' as RuleProtocol,
    port: '',
    portRange: '',
    sourceIp: '',
    destIp: '',
    comment: '',
  });

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchFirewallData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API calls
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockRules: FirewallRule[] = [
        { id: '1', number: 1, action: 'allow', direction: 'in', protocol: 'tcp', port: '22', comment: 'SSH', enabled: true, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
        { id: '2', number: 2, action: 'allow', direction: 'in', protocol: 'tcp', port: '80', comment: 'HTTP', enabled: true, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
        { id: '3', number: 3, action: 'allow', direction: 'in', protocol: 'tcp', port: '443', comment: 'HTTPS', enabled: true, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
        { id: '4', number: 4, action: 'deny', direction: 'in', protocol: 'tcp', port: '3306', comment: 'Block MySQL external', enabled: true, createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
        { id: '5', number: 5, action: 'allow', direction: 'in', protocol: 'tcp', port: '8080', sourceIp: '192.168.1.0/24', comment: 'Internal API', enabled: false, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      ];
      
      const mockBannedIPs: BannedIP[] = [
        { ip: '185.220.101.45', jail: 'sshd', bannedAt: new Date(Date.now() - 3600000).toISOString(), attempts: 15, country: 'RU' },
        { ip: '103.75.201.2', jail: 'nginx-http-auth', bannedAt: new Date(Date.now() - 7200000).toISOString(), attempts: 8, country: 'CN' },
        { ip: '45.155.205.233', jail: 'wp-login', bannedAt: new Date(Date.now() - 1800000).toISOString(), attempts: 25, country: 'NL' },
      ];
      
      const mockFail2banStatus: Fail2banStatus = {
        active: true,
        jails: [
          { name: 'sshd', enabled: true, bannedCount: 5, maxRetry: 5, bantime: 3600, findtime: 600 },
          { name: 'nginx-http-auth', enabled: true, bannedCount: 2, maxRetry: 5, bantime: 3600, findtime: 600 },
          { name: 'wp-login', enabled: true, bannedCount: 12, maxRetry: 3, bantime: 7200, findtime: 600 },
        ],
      };
      
      const mockStats: FirewallStats = {
        totalRules: mockRules.length,
        activeRules: mockRules.filter(r => r.enabled).length,
        bannedIPs: mockBannedIPs.length,
        blockedAttempts24h: 1247,
        topBlockedCountries: [
          { country: 'RU', count: 450 },
          { country: 'CN', count: 380 },
          { country: 'US', count: 210 },
        ],
        topBlockedIPs: [
          { ip: '185.220.101.45', count: 85 },
          { ip: '103.75.201.2', count: 62 },
          { ip: '45.155.205.233', count: 45 },
        ],
      };
      
      setRules(mockRules);
      setBannedIPs(mockBannedIPs);
      setFail2banStatus(mockFail2banStatus);
      setStats(mockStats);
      setFirewallStatus('active');
    } catch (error) {
      console.error('Failed to fetch firewall ', error);
      setFirewallStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirewallData();
    
    // Auto-refresh every 30 seconds for real-time status
    const interval = setInterval(fetchFirewallData, 30000);
    return () => clearInterval(interval);
  }, [fetchFirewallData]);

  // =============================================================================
  // 🔧 ACTIONS
  // =============================================================================

  const handleToggleFirewall = async (enabled: boolean) => {
    try {
      // Mock toggle
      setFirewallStatus(enabled ? 'active' : 'inactive');
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to toggle firewall:', error);
    }
  };

  const handleCreateRule = async () => {
    try {
      // Mock create
      const newRule: FirewallRule = {
        id: Date.now().toString(),
        number: rules.length + 1,
        action: ruleForm.action,
        direction: ruleForm.direction,
        protocol: ruleForm.protocol,
        port: ruleForm.port,
        portRange: ruleForm.portRange || undefined,
        sourceIp: ruleForm.sourceIp || undefined,
        destIp: ruleForm.destIp || undefined,
        comment: ruleForm.comment,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      
      setRules(prev => [...prev, newRule]);
      setIsCreateModalOpen(false);
      setRuleForm({
        action: 'allow',
        direction: 'in',
        protocol: 'tcp',
        port: '',
        portRange: '',
        sourceIp: '',
        destIp: '',
        comment: '',
      });
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }
    
    try {
      setRules(prev => prev.filter(r => r.id !== ruleId));
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      setRules(prev =>
        prev.map(r =>
          r.id === ruleId ? { ...r, enabled: !r.enabled } : r
        )
      );
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleApplyProfile = async (profileId: string) => {
    const profile = QUICK_PROFILES.find(p => p.id === profileId);
    if (!profile) return;
    
    if (!confirm(`Apply "${profile.name}" profile? This will replace all current rules.`)) {
      return;
    }
    
    try {
      // Mock apply profile
      const newRules: FirewallRule[] = profile.rules.map((rule, index) => ({
        id: `profile-${profileId}-${index}`,
        number: index + 1,
        action: rule.action,
        direction: 'in' as RuleDirection,
        protocol: rule.protocol as RuleProtocol,
        port: rule.port,
        comment: rule.comment,
        enabled: true,
        createdAt: new Date().toISOString(),
      }));
      
      setRules(newRules);
      setIsProfileModalOpen(false);
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to apply profile:', error);
    }
  };

  const handleEmergencyReset = async () => {
    if (!confirm('EMERGENCY RESET: This will disable UFW and remove ALL rules. Continue?')) {
      return;
    }
    
    const confirmText = prompt('Type "RESET" to confirm emergency reset:');
    if (confirmText !== 'RESET') {
      return;
    }
    
    try {
      setRules([]);
      setFirewallStatus('inactive');
      setIsEmergencyModalOpen(false);
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to reset firewall:', error);
    }
  };

  const handleUnbanIP = async (ip: string) => {
    try {
      setBannedIPs(prev => prev.filter(b => b.ip !== ip));
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to unban IP:', error);
    }
  };

  const handleEditRule = (rule: FirewallRule) => {
    setSelectedRule(rule);
    setRuleForm({
      action: rule.action,
      direction: rule.direction,
      protocol: rule.protocol,
      port: rule.port,
      portRange: rule.portRange || '',
      sourceIp: rule.sourceIp || '',
      destIp: rule.destIp || '',
      comment: rule.comment || '',
    });
    setIsEditing(true);
    setIsCreateModalOpen(true);
  };

  const handleUpdateRule = async () => {
    if (!selectedRule) return;
    
    try {
      setRules(prev =>
        prev.map(r =>
          r.id === selectedRule.id
            ? {
                ...r,
                action: ruleForm.action,
                direction: ruleForm.direction,
                protocol: ruleForm.protocol,
                port: ruleForm.port,
                portRange: ruleForm.portRange || undefined,
                sourceIp: ruleForm.sourceIp || undefined,
                destIp: ruleForm.destIp || undefined,
                comment: ruleForm.comment,
              }
            : r
        )
      );
      
      setIsCreateModalOpen(false);
      setIsEditing(false);
      setSelectedRule(null);
      setRuleForm({
        action: 'allow',
        direction: 'in',
        protocol: 'tcp',
        port: '',
        portRange: '',
        sourceIp: '',
        destIp: '',
        comment: '',
      });
      await fetchFirewallData();
    } catch (error) {
      console.error('Failed to update rule:', error);
    }
  };

  // =============================================================================
  // 🔍 FILTERING
  // =============================================================================

  const filteredRules = React.useMemo(() => {
    return rules.filter(rule => {
      if (filterAction !== 'all' && rule.action !== filterAction) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          rule.port.toLowerCase().includes(query) ||
          rule.comment?.toLowerCase().includes(query) ||
          rule.sourceIp?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [rules, filterAction, searchQuery]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Firewall"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Firewall' },
        ]}
        description="UFW firewall and Fail2ban management"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchFirewallData}
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
              Add Rule
            </Button>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          {/* Firewall Status Banner */}
          <AlertBanner
            variant={firewallStatus === 'active' ? 'success' : firewallStatus === 'inactive' ? 'warning' : 'error'}
            title={
              firewallStatus === 'active' ? 'Firewall Active' :
              firewallStatus === 'inactive' ? 'Firewall Inactive' :
              'Firewall Error'
            }
            message={
              firewallStatus === 'active' ? 'UFW is active and protecting your server' :
              firewallStatus === 'inactive' ? 'UFW is inactive. Your server is not protected by firewall.' :
              'Unable to determine firewall status'
            }
            action={
              firewallStatus === 'inactive' ? {
                label: 'Enable Firewall',
                onClick: () => handleToggleFirewall(true),
              } : firewallStatus === 'active' ? {
                label: 'Disable Firewall',
                onClick: () => handleToggleFirewall(false),
              } : undefined
            }
            dismissible={false}
            showIcon
          />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Total Rules</div>
                    <div className="text-2xl font-bold text-text-primary">{stats?.totalRules || 0}</div>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-accent-subtle text-accent flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Active Rules</div>
                    <div className="text-2xl font-bold text-success">{stats?.activeRules || 0}</div>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-success-subtle text-success flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Banned IPs</div>
                    <div className="text-2xl font-bold text-error">{stats?.bannedIPs || 0}</div>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-error-subtle text-error flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Blocked (24h)</div>
                    <div className="text-2xl font-bold text-text-primary">{stats?.blockedAttempts24h?.toLocaleString() || 0}</div>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-bg-overlay text-text-secondary flex items-center justify-center">
                    <ShieldOff className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Card>
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'rules' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('rules')}
                  leftIcon={<Shield className="w-4 h-4" />}
                >
                  Rules
                </Button>
                <Button
                  variant={activeTab === 'fail2ban' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('fail2ban')}
                  leftIcon={<Lock className="w-4 h-4" />}
                >
                  Fail2ban
                </Button>
                <Button
                  variant={activeTab === 'stats' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('stats')}
                  leftIcon={<BarChart3 className="w-4 h-4" />}
                >
                  Statistics
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              {/* Quick Profiles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Quick Profiles
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsProfileModalOpen(true)}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Apply Profile
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {QUICK_PROFILES.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => handleApplyProfile(profile.id)}
                        className={cn(
                          'flex flex-col items-start p-4 rounded-md border text-left',
                          'transition-all hover:border-border-hover',
                          'border-border bg-bg-surface'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-accent" />
                          <span className="text-sm font-medium text-text-primary">{profile.name}</span>
                        </div>
                        <p className="text-xs text-text-secondary">{profile.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <Input
                        placeholder="Search rules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        size="sm"
                      />
                    </div>
                    
                    <Select
                      value={filterAction}
                      onValueChange={(value) => setFilterAction(value as any)}
                      className="w-[150px]"
                    >
                      <Select.Item value="all">All Actions</Select.Item>
                      <Select.Item value="allow">Allow</Select.Item>
                      <Select.Item value="deny">Deny</Select.Item>
                      <Select.Item value="reject">Reject</Select.Item>
                    </Select>
                    
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setIsEmergencyModalOpen(true)}
                      leftIcon={<AlertTriangle className="w-4 h-4" />}
                    >
                      Emergency Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rules List */}
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-8 h-8 rounded" />
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-48" />
                          <div className="ml-auto flex gap-2">
                            <Skeleton className="w-8 h-8 rounded" />
                            <Skeleton className="w-8 h-8 rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredRules.length === 0 ? (
                <Card>
                  <CardContent className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Shield className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        {searchQuery || filterAction !== 'all' ? 'No rules match your filters' : 'No firewall rules'}
                      </h3>
                      <p className="text-sm text-text-secondary mb-4 max-w-md">
                        {searchQuery || filterAction !== 'all'
                          ? 'Try adjusting your search or filter criteria'
                          : 'Create your first firewall rule to protect your server'}
                      </p>
                      {!searchQuery && filterAction === 'all' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setIsCreateModalOpen(true)}
                          leftIcon={<Plus className="w-4 h-4" />}
                        >
                          Create Rule
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredRules.map((rule) => (
                    <Card
                      key={rule.id}
                      className={cn(
                        'transition-all',
                        !rule.enabled && 'opacity-60'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Status Indicator */}
                          <div
                            className={cn(
                              'w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0',
                              rule.action === 'allow' && 'bg-success-subtle text-success',
                              rule.action === 'deny' && 'bg-error-subtle text-error',
                              rule.action === 'reject' && 'bg-warning-subtle text-warning'
                            )}
                          >
                            {rule.action === 'allow' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : rule.action === 'deny' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                          </div>
                          
                          {/* Rule Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-text-primary">
                                {rule.action.toUpperCase()} {rule.protocol.toUpperCase()}
                              </span>
                              <span className="text-xs text-text-muted">#{rule.number}</span>
                              {!rule.enabled && (
                                <StatusBadge status="neutral" label="Disabled" size="sm" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-text-secondary">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                Port: {rule.port}{rule.portRange ? `-${rule.portRange}` : ''}
                              </span>
                              {rule.sourceIp && (
                                <span className="flex items-center gap-1">
                                  <Server className="w-3 h-3" />
                                  Source: {rule.sourceIp}
                                </span>
                              )}
                              {rule.comment && (
                                <span className="flex items-center gap-1">
                                  <Info className="w-3 h-3" />
                                  {rule.comment}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleToggleRule(rule.id)}
                              title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                            >
                              {rule.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditRule(rule)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
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
                                    onClick={() => handleEditRule(rule)}
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                    onClick={() => handleToggleRule(rule.id)}
                                  >
                                    {rule.enabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    {rule.enabled ? 'Disable' : 'Enable'}
                                  </DropdownMenu.Item>
                                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                                  <DropdownMenu.Item
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                                    onClick={() => handleDeleteRule(rule.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
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

          {/* Fail2ban Tab */}
          {activeTab === 'fail2ban' && (
            <div className="space-y-6">
              {/* Fail2ban Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Fail2ban Status
                    </div>
                    <StatusBadge
                      status={fail2banStatus?.active ? 'success' : 'neutral'}
                      label={fail2banStatus?.active ? 'Active' : 'Inactive'}
                      size="sm"
                      showDot
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fail2banStatus?.jails && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {fail2banStatus.jails.map((jail) => (
                        <div key={jail.name} className="p-4 bg-bg-overlay rounded-md">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-text-primary">{jail.name}</span>
                            <StatusBadge
                              status={jail.enabled ? 'success' : 'neutral'}
                              label={jail.enabled ? 'Enabled' : 'Disabled'}
                              size="sm"
                            />
                          </div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-text-muted">Banned:</span>
                              <span className="text-text-primary">{jail.bannedCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Max Retry:</span>
                              <span className="text-text-primary">{jail.maxRetry}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Ban Time:</span>
                              <span className="text-text-primary">{jail.bantime}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-muted">Find Time:</span>
                              <span className="text-text-primary">{jail.findtime}s</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Banned IPs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Currently Banned IPs</CardTitle>
                </CardHeader>
                <CardContent>
                  {bannedIPs.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <Lock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No IPs currently banned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bannedIPs.map((ban) => (
                        <div
                          key={ban.ip}
                          className="flex items-center justify-between p-4 bg-bg-overlay rounded-md"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-md bg-error-subtle text-error flex items-center justify-center">
                              <Lock className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary">{ban.ip}</span>
                                {ban.country && (
                                  <span className="text-xs text-text-muted">({ban.country})</span>
                                )}
                              </div>
                              <div className="text-xs text-text-secondary mt-1">
                                Jail: {ban.jail} • Attempts: {ban.attempts} • Banned: {getRelativeTime(ban.bannedAt)}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUnbanIP(ban.ip)}
                            leftIcon={<Unlock className="w-3.5 h-3.5" />}
                          >
                            Unban
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Top Blocked Countries */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Top Blocked Countries (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.topBlockedCountries.map((item, index) => (
                      <div key={item.country} className="flex items-center gap-4">
                        <span className="text-sm text-text-muted w-6">{index + 1}</span>
                        <span className="text-sm text-text-primary flex-1">{item.country}</span>
                        <div className="w-48 bg-bg-overlay rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full"
                            style={{
                              width: `${(item.count / (stats.topBlockedCountries[0]?.count || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-text-primary w-16 text-right">
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Blocked IPs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Top Blocked IPs (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.topBlockedIPs.map((item, index) => (
                      <div key={item.ip} className="flex items-center gap-4">
                        <span className="text-sm text-text-muted w-6">{index + 1}</span>
                        <span className="text-sm text-text-primary flex-1 font-mono">{item.ip}</span>
                        <div className="w-48 bg-bg-overlay rounded-full h-2">
                          <div
                            className="bg-error h-2 rounded-full"
                            style={{
                              width: `${(item.count / (stats.topBlockedIPs[0]?.count || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-text-primary w-16 text-right">
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageContent>

      {/* Create/Edit Rule Modal */}
      <Modal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setIsEditing(false);
            setSelectedRule(null);
            setRuleForm({
              action: 'allow',
              direction: 'in',
              protocol: 'tcp',
              port: '',
              portRange: '',
              sourceIp: '',
              destIp: '',
              comment: '',
            });
          }
        }}
        title={isEditing ? 'Edit Rule' : 'Create Firewall Rule'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Action</label>
              <Select
                value={ruleForm.action}
                onValueChange={(value) => setRuleForm(prev => ({ ...prev, action: value as RuleAction }))}
              >
                <Select.Item value="allow">Allow</Select.Item>
                <Select.Item value="deny">Deny</Select.Item>
                <Select.Item value="reject">Reject</Select.Item>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Direction</label>
              <Select
                value={ruleForm.direction}
                onValueChange={(value) => setRuleForm(prev => ({ ...prev, direction: value as RuleDirection }))}
              >
                <Select.Item value="in">Incoming</Select.Item>
                <Select.Item value="out">Outgoing</Select.Item>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Protocol</label>
              <Select
                value={ruleForm.protocol}
                onValueChange={(value) => setRuleForm(prev => ({ ...prev, protocol: value as RuleProtocol }))}
              >
                <Select.Item value="tcp">TCP</Select.Item>
                <Select.Item value="udp">UDP</Select.Item>
                <Select.Item value="both">Both</Select.Item>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Port</label>
              <Input
                value={ruleForm.port}
                onChange={(e) => setRuleForm(prev => ({ ...prev, port: e.target.value }))}
                placeholder="22"
                leftIcon={<Globe className="w-4 h-4" />}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Port Range (optional)</label>
            <Input
              value={ruleForm.portRange}
              onChange={(e) => setRuleForm(prev => ({ ...prev, portRange: e.target.value }))}
              placeholder="8000:9000"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Source IP (optional)</label>
              <Input
                value={ruleForm.sourceIp}
                onChange={(e) => setRuleForm(prev => ({ ...prev, sourceIp: e.target.value }))}
                placeholder="192.168.1.0/24"
                leftIcon={<Server className="w-4 h-4" />}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Dest IP (optional)</label>
              <Input
                value={ruleForm.destIp}
                onChange={(e) => setRuleForm(prev => ({ ...prev, destIp: e.target.value }))}
                placeholder="0.0.0.0/0"
                leftIcon={<Globe className="w-4 h-4" />}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Comment</label>
            <Input
              value={ruleForm.comment}
              onChange={(e) => setRuleForm(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="SSH access"
            />
          </div>
          
          {/* Common Ports Quick Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Common Ports</label>
            <div className="flex flex-wrap gap-2">
              {COMMON_PORTS.map((common) => (
                <button
                  key={common.port}
                  onClick={() => setRuleForm(prev => ({ ...prev, port: common.port, protocol: common.protocol as RuleProtocol }))}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium',
                    'bg-bg-overlay text-text-secondary',
                    'hover:bg-bg-elevated hover:text-text-primary',
                    'transition-colors'
                  )}
                >
                  {common.name} ({common.port})
                </button>
              ))}
            </div>
          </div>
          
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
              onClick={isEditing ? handleUpdateRule : handleCreateRule}
              disabled={!ruleForm.port}
              leftIcon={isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {isEditing ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Profile Modal */}
      <Modal
        open={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
        title="Apply Quick Profile"
        size="md"
      >
        <div className="space-y-4">
          <AlertBanner
            variant="warning"
            message="Applying a profile will replace all current firewall rules. Make sure you understand what each profile does."
            size="sm"
            showIcon
          />
          
          <div className="grid grid-cols-1 gap-3">
            {QUICK_PROFILES.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleApplyProfile(profile.id)}
                className={cn(
                  'flex flex-col items-start p-4 rounded-md border text-left',
                  'transition-all hover:border-border-hover',
                  'border-border bg-bg-surface'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-text-primary">{profile.name}</span>
                </div>
                <p className="text-xs text-text-secondary mb-2">{profile.description}</p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{profile.rules.length} rules</span>
                  {profile.defaultPolicy && (
                    <span>• Default: {profile.defaultPolicy.toUpperCase()}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProfileModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Emergency Reset Modal */}
      <Modal
        open={isEmergencyModalOpen}
        onOpenChange={setIsEmergencyModalOpen}
        title="Emergency Firewall Reset"
        size="md"
      >
        <div className="space-y-4">
          <AlertBanner
            variant="error"
            title="⚠️ DANGER ZONE"
            message="This will DISABLE UFW and remove ALL firewall rules. Your server will be unprotected. Only use in emergency situations."
            size="sm"
            showIcon
          />
          
          <div className="p-4 bg-error-subtle border border-error rounded-md">
            <p className="text-sm text-text-secondary">
              This action will:
            </p>
            <ul className="text-sm text-text-secondary mt-2 space-y-1 list-disc list-inside">
              <li>Disable UFW firewall</li>
              <li>Remove all firewall rules</li>
              <li>Leave all ports open</li>
              <li>Fail2ban will still be active</li>
            </ul>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEmergencyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleEmergencyReset}
              leftIcon={<AlertTriangle className="w-4 h-4" />}
            >
              Confirm Emergency Reset
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

function getRelativeTime(dateString: string): string {
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
}