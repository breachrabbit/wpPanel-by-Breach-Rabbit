'use client';

// =============================================================================
// wpPanel by Breach Rabbit — File Manager Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Full-featured file manager with tree view, Monaco editor, and batch operations
// =============================================================================

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell, PageHeader, PageContent } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { FileTree, FileNode } from '@/components/ui/FileTree';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  File,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit,
  Copy,
  Scissors,
  Clipboard,
  Search,
  RefreshCw,
  Maximize2,
  Minimize2,
  Archive,
  FileText,
  Image,
  MoreVertical,
  ChevronRight,
  Home,
  ArrowUp,
  Grid,
  List,
  Settings,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Eye,
  Save,
  Undo,
  Redo,
  Folder,
  FileCode,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type ViewMode = 'list' | 'grid';
type SortBy = 'name' | 'size' | 'date' | 'type';
type SortOrder = 'asc' | 'desc';

interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  permissions?: string;
  owner?: string;
  isSymlink?: boolean;
  symlinkTarget?: string;
  category?: 'code' | 'image' | 'archive' | 'config' | 'log' | 'database' | 'other';
}

interface ClipboardState {
  action: 'copy' | 'cut' | null;
  items: FileItem[];
}

interface ChmodState {
  owner: { read: boolean; write: boolean; execute: boolean };
  group: { read: boolean; write: boolean; execute: boolean };
  other: { read: boolean; write: boolean; execute: boolean };
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const FILE_CATEGORIES: Record<string, 'code' | 'image' | 'archive' | 'config' | 'log' | 'database' | 'other'> = {
  // Code
  php: 'code',
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  py: 'code',
  rb: 'code',
  java: 'code',
  go: 'code',
  rs: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',
  less: 'code',
  vue: 'code',
  svelte: 'code',
  sh: 'code',
  bash: 'code',
  
  // Config
  json: 'config',
  yaml: 'config',
  yml: 'config',
  toml: 'config',
  ini: 'config',
  conf: 'config',
  env: 'config',
  xml: 'config',
  htaccess: 'config',
  
  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  webp: 'image',
  ico: 'image',
  
  // Archives
  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  rar: 'archive',
  '7z': 'archive',
  
  // Logs
  log: 'log',
  out: 'log',
  err: 'log',
  
  // Database
  sql: 'database',
  db: 'database',
  sqlite: 'database',
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

function getFileCategory(name: string): FileItem['category'] {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return FILE_CATEGORIES[ext] || 'other';
}

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '-';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '-';
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

function getFileIcon(category: FileItem['category'], isDirectory?: boolean): React.ReactNode {
  if (isDirectory) return <Folder className="w-4 h-4 text-accent" />;
  switch (category) {
    case 'code': return <FileCode className="w-4 h-4 text-info" />;
    case 'image': return <Image className="w-4 h-4 text-warning" />;
    case 'archive': return <Archive className="w-4 h-4 text-success" />;
    case 'config': return <Settings className="w-4 h-4 text-text-secondary" />;
    case 'log': return <FileText className="w-4 h-4 text-text-muted" />;
    case 'database': return <FileText className="w-4 h-4 text-success" />;
    default: return <File className="w-4 h-4 text-text-secondary" />;
  }
}

// =============================================================================
// 🏗️ FILE MANAGER PAGE COMPONENT
// =============================================================================

export default function FileManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/var/www');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [clipboard, setClipboard] = useState<ClipboardState>({ action: null, items: [] });
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isChmodModalOpen, setIsChmodModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Editor state
  const [editingFile, setEditingFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Chmod state
  const [chmodFile, setChmodFile] = useState<FileItem | null>(null);
  const [chmodPermissions, setChmodPermissions] = useState<ChmodState>({
    owner: { read: true, write: true, execute: true },
    group: { read: true, write: false, execute: true },
    other: { read: true, write: false, execute: true },
  });
  
  // New file/folder name
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'directory'>('file');

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchFiles = useCallback(async (path: string = currentPath) => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockFiles: FileItem[] = [
        { id: '1', name: 'wp-admin', path: `${path}/wp-admin`, type: 'directory', modifiedAt: new Date().toISOString(), permissions: '755', owner: 'www-data' },
        { id: '2', name: 'wp-content', path: `${path}/wp-content`, type: 'directory', modifiedAt: new Date().toISOString(), permissions: '755', owner: 'www-data' },
        { id: '3', name: 'wp-includes', path: `${path}/wp-includes`, type: 'directory', modifiedAt: new Date().toISOString(), permissions: '755', owner: 'www-data' },
        { id: '4', name: 'index.php', path: `${path}/index.php`, type: 'file', size: 4567, modifiedAt: new Date().toISOString(), permissions: '644', owner: 'www-data', category: 'code' },
        { id: '5', name: 'wp-config.php', path: `${path}/wp-config.php`, type: 'file', size: 3456, modifiedAt: new Date().toISOString(), permissions: '640', owner: 'www-data', category: 'config' },
        { id: '6', name: '.htaccess', path: `${path}/.htaccess`, type: 'file', size: 1234, modifiedAt: new Date().toISOString(), permissions: '644', owner: 'www-data', category: 'config' },
        { id: '7', name: 'error.log', path: `${path}/error.log`, type: 'file', size: 56789, modifiedAt: new Date().toISOString(), permissions: '644', owner: 'www-data', category: 'log' },
        { id: '8', name: 'screenshot.png', path: `${path}/screenshot.png`, type: 'file', size: 234567, modifiedAt: new Date().toISOString(), permissions: '644', owner: 'www-data', category: 'image' },
        { id: '9', name: 'backup.zip', path: `${path}/backup.zip`, type: 'file', size: 12345678, modifiedAt: new Date().toISOString(), permissions: '644', owner: 'www-data', category: 'archive' },
        { id: '10', name: '.env', path: `${path}/.env`, type: 'file', size: 567, modifiedAt: new Date().toISOString(), permissions: '600', owner: 'www-data', category: 'config' },
      ];
      
      setFiles(mockFiles);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // =============================================================================
  // 🔧 NAVIGATION
  // =============================================================================

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    setSelectedIds([]);
  };

  const navigateUp = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateTo(parentPath);
  };

  const navigateHome = () => {
    navigateTo('/var/www');
  };

  // =============================================================================
  // 🔧 FILE ACTIONS
  // =============================================================================

  const handleSelectFile = (fileId: string, multi: boolean = false) => {
    if (multi) {
      setSelectedIds(prev =>
        prev.includes(fileId)
          ? prev.filter(id => id !== fileId)
          : [...prev, fileId]
      );
    } else {
      setSelectedIds([fileId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(files.map(f => f.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleOpenFile = (file: FileItem) => {
    if (file.type === 'directory') {
      navigateTo(file.path);
    } else if (file.category === 'code' || file.category === 'config') {
      openEditor(file);
    } else if (file.category === 'image') {
      openPreview(file);
    } else {
      handleDownload([file]);
    }
  };

  const handleDownload = async (files: FileItem[]) => {
    try {
      // Mock download
      console.log('Downloading files:', files.map(f => f.path));
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleDelete = async (files: FileItem[]) => {
    if (!confirm(`Are you sure you want to delete ${files.length} item(s)?`)) {
      return;
    }
    
    try {
      setFiles(prev => prev.filter(f => !files.find(d => d.id === f.id)));
      setSelectedIds([]);
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCopy = (files: FileItem[]) => {
    setClipboard({ action: 'copy', items: files });
  };

  const handleCut = (files: FileItem[]) => {
    setClipboard({ action: 'cut', items: files });
  };

  const handlePaste = async () => {
    if (!clipboard.action || clipboard.items.length === 0) {
      return;
    }
    
    try {
      console.log('Pasting:', clipboard.action, clipboard.items.map(f => f.path));
      setClipboard({ action: null, items: [] });
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  };

  const handleRename = (file: FileItem) => {
    setNewItemName(file.name);
    setNewItemType(file.type);
    setEditingFile(file);
    setIsRenameModalOpen(true);
  };

  const handleChmod = (file: FileItem) => {
    const permissions = file.permissions || '644';
    const digits = permissions.split('').map(Number);
    
    setChmodFile(file);
    setChmodPermissions({
      owner: {
        read: (digits[0] & 4) !== 0,
        write: (digits[0] & 2) !== 0,
        execute: (digits[0] & 1) !== 0,
      },
      group: {
        read: (digits[1] & 4) !== 0,
        write: (digits[1] & 2) !== 0,
        execute: (digits[1] & 1) !== 0,
      },
      other: {
        read: (digits[2] & 4) !== 0,
        write: (digits[2] & 2) !== 0,
        execute: (digits[2] & 1) !== 0,
      },
    });
    setIsChmodModalOpen(true);
  };

  const handleSaveChmod = async () => {
    if (!chmodFile) return;
    
    const { owner, group, other } = chmodPermissions;
    const ownerNum = (owner.read ? 4 : 0) + (owner.write ? 2 : 0) + (owner.execute ? 1 : 0);
    const groupNum = (group.read ? 4 : 0) + (group.write ? 2 : 0) + (group.execute ? 1 : 0);
    const otherNum = (other.read ? 4 : 0) + (other.write ? 2 : 0) + (other.execute ? 1 : 0);
    const newPermissions = `${ownerNum}${groupNum}${otherNum}`;
    
    try {
      console.log('Setting permissions:', chmodFile.path, 'to', newPermissions);
      setFiles(prev => prev.map(f =>
        f.id === chmodFile.id ? { ...f, permissions: newPermissions } : f
      ));
      setIsChmodModalOpen(false);
    } catch (error) {
      console.error('Failed to set permissions:', error);
    }
  };

  const handleCreate = async () => {
    if (!newItemName) return;
    
    try {
      const newFile: FileItem = {
        id: Date.now().toString(),
        name: newItemName,
        path: `${currentPath}/${newItemName}`,
        type: newItemType,
        modifiedAt: new Date().toISOString(),
        permissions: newItemType === 'directory' ? '755' : '644',
        owner: 'www-data',
        category: newItemType === 'file' ? getFileCategory(newItemName) : undefined,
      };
      
      setFiles(prev => [...prev, newFile]);
      setIsCreateModalOpen(false);
      setNewItemName('');
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  const handleRenameSave = async () => {
    if (!editingFile || !newItemName) return;
    
    try {
      setFiles(prev => prev.map(f =>
        f.id === editingFile.id
          ? { ...f, name: newItemName, path: `${currentPath}/${newItemName}` }
          : f
      ));
      setIsRenameModalOpen(false);
      setEditingFile(null);
      setNewItemName('');
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  };

  // =============================================================================
  // 📝 EDITOR
  // =============================================================================

  const openEditor = (file: FileItem) => {
    setEditingFile(file);
    setIsEditorOpen(true);
    // In real implementation, fetch file content here
    setFileContent(`// Content of ${file.name}\n// This is a mock file content`);
    setIsDirty(false);
  };

  const openPreview = (file: FileItem) => {
    setEditingFile(file);
    setIsPreviewOpen(true);
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    
    setIsSaving(true);
    try {
      // Mock save
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseEditor = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }
    setIsEditorOpen(false);
    setEditingFile(null);
    setFileContent('');
    setIsDirty(false);
  };

  // =============================================================================
  // 📤 UPLOAD
  // =============================================================================

  const handleUpload = async (files: File[]) => {
    try {
      console.log('Uploading files:', files.map(f => f.name));
      // In real implementation, upload to API
    } catch (error) {
      console.error('Failed to upload:', error);
    }
  };

  // =============================================================================
  // 🔍 FILTERING & SORTING
  // =============================================================================

  const filteredAndSortedFiles = React.useMemo(() => {
    let result = [...files];
    
    // Filter hidden files
    if (!showHidden) {
      result = result.filter(f => !f.name.startsWith('.'));
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(query));
    }
    
    // Sort
    result.sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'date':
          comparison = new Date(a.modifiedAt || 0).getTime() - new Date(b.modifiedAt || 0).getTime();
          break;
        case 'type':
          comparison = (a.category || 'other').localeCompare(b.category || 'other');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [files, showHidden, searchQuery, sortBy, sortOrder]);

  // =============================================================================
  // 🏗️ RENDER
  // =============================================================================

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="File Manager"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Files' },
        ]}
        description={currentPath}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchFiles()}
              leftIcon={<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
            />
          </div>
        }
      />

      <PageContent>
        <div className="space-y-4">
          {/* Toolbar */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={navigateHome}
                  >
                    <Home className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={navigateUp}
                    disabled={currentPath === '/'}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  
                  {/* Path Breadcrumb */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-bg-overlay rounded-md text-sm text-text-secondary">
                    {currentPath.split('/').filter(Boolean).map((segment, index, arr) => (
                      <React.Fragment key={index}>
                        {index > 0 && <ChevronRight className="w-3 h-3 text-text-muted" />}
                        <button
                          onClick={() => navigateTo('/' + arr.slice(0, index + 1).join('/'))}
                          className="hover:text-text-primary transition-colors"
                        >
                          {segment}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Bulk Actions */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-accent-subtle rounded-md">
                      <span className="text-sm text-accent">
                        {selectedIds.length} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCopy(files.filter(f => selectedIds.includes(f.id)))}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCut(files.filter(f => selectedIds.includes(f.id)))}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-error hover:text-error"
                        onClick={() => handleDelete(files.filter(f => selectedIds.includes(f.id)))}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleClearSelection}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Clipboard Actions */}
                  {clipboard.action && clipboard.items.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handlePaste}
                      leftIcon={<Clipboard className="w-4 h-4" />}
                    >
                      Paste ({clipboard.items.length})
                    </Button>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 border border-border rounded-md p-1">
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Show Hidden Toggle */}
                  <Toggle
                    label="Hidden"
                    checked={showHidden}
                    onCheckedChange={(checked) => setShowHidden(checked)}
                    size="sm"
                  />
                </div>

                {/* Search & Sort */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                      size="sm"
                    />
                  </div>
                  
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as SortBy)}
                    className="w-32"
                  >
                    <Select.Item value="name">Name</Select.Item>
                    <Select.Item value="size">Size</Select.Item>
                    <Select.Item value="date">Date</Select.Item>
                    <Select.Item value="type">Type</Select.Item>
                  </Select>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? (
                      <ChevronRight className="w-4 h-4 rotate-90" />
                    ) : (
                      <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Grid/List */}
          {isLoading ? (
            // Loading Skeleton
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="w-10 h-10 rounded-md mb-3" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAndSortedFiles.length === 0 ? (
            // Empty State
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <FolderOpen className="w-12 h-12 text-text-muted mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    {searchQuery ? 'No files match your search' : 'This folder is empty'}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4 max-w-md">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Upload files or create a new folder to get started'}
                  </p>
                  {!searchQuery && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={<Upload className="w-4 h-4" />}
                      >
                        Upload Files
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        New Folder
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            // List View
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-text-muted border-b border-border">
                    <div className="w-8 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                        onChange={(e) => e.target.checked ? handleSelectAll() : handleClearSelection()}
                        className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                      />
                    </div>
                    <div className="flex-1">Name</div>
                    <div className="w-24">Size</div>
                    <div className="w-24 hidden md:block">Permissions</div>
                    <div className="w-32 hidden lg:block">Modified</div>
                    <div className="w-20"></div>
                  </div>
                  
                  {/* Files */}
                  {filteredAndSortedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        selectedIds.includes(file.id) && 'bg-accent-subtle',
                        !selectedIds.includes(file.id) && 'hover:bg-bg-overlay'
                      )}
                      onClick={(e) => handleSelectFile(file.id, e.metaKey || e.ctrlKey)}
                      onDoubleClick={() => handleOpenFile(file)}
                    >
                      <div className="w-8 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(file.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectFile(file.id, true);
                          }}
                          className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(file.category, file.type === 'directory')}
                        <span className={cn(
                          'text-sm truncate',
                          file.type === 'directory' && 'font-medium text-text-primary',
                          file.type === 'file' && 'text-text-secondary'
                        )}>
                          {file.name}
                        </span>
                        {file.isSymlink && (
                          <ExternalLink className="w-3 h-3 text-text-muted flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="w-24 text-xs text-text-secondary">
                        {file.type === 'directory' ? '-' : formatFileSize(file.size)}
                      </div>
                      
                      <div className="w-24 hidden md:block">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChmod(file);
                          }}
                          className="text-xs text-text-secondary hover:text-text-primary font-mono"
                        >
                          {file.permissions}
                        </button>
                      </div>
                      
                      <div className="w-32 hidden lg:block text-xs text-text-secondary">
                        {formatRelativeTime(file.modifiedAt)}
                      </div>
                      
                      <div className="w-20 flex-shrink-0">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => e.stopPropagation()}
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
                                onClick={() => handleOpenFile(file)}
                              >
                                <FolderOpen className="w-4 h-4" />
                                Open
                              </DropdownMenu.Item>
                              {(file.category === 'code' || file.category === 'config') && (
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                  onClick={() => openEditor(file)}
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </DropdownMenu.Item>
                              )}
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                onClick={() => handleRename(file)}
                              >
                                <Edit className="w-4 h-4" />
                                Rename
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                onClick={() => handleChmod(file)}
                              >
                                <Settings className="w-4 h-4" />
                                Permissions
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                onClick={() => handleDownload([file])}
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </DropdownMenu.Item>
                              <DropdownMenu.Separator className="h-px bg-border my-1" />
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                                onClick={() => handleDelete([file])}
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            // Grid View
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredAndSortedFiles.map((file) => (
                <Card
                  key={file.id}
                  className={cn(
                    'group cursor-pointer transition-all',
                    selectedIds.includes(file.id) && 'border-accent bg-accent-subtle/30',
                    !selectedIds.includes(file.id) && 'hover:border-border-hover'
                  )}
                  onClick={() => handleSelectFile(file.id, false)}
                  onDoubleClick={() => handleOpenFile(file)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3">
                        {getFileIcon(file.category, file.type === 'directory')}
                      </div>
                      <div className="text-sm font-medium text-text-primary truncate w-full mb-1">
                        {file.name}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {file.type === 'directory' ? 'Folder' : formatFileSize(file.size)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Footer Info */}
          {!isLoading && filteredAndSortedFiles.length > 0 && (
            <div className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-border">
              <span>
                {filteredAndSortedFiles.length} item{filteredAndSortedFiles.length !== 1 ? 's' : ''}
                {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
              </span>
              <span>
                {formatFileSize(filteredAndSortedFiles.reduce((acc, f) => acc + (f.size || 0), 0))} total
              </span>
            </div>
          )}
        </div>
      </PageContent>

      {/* Create Modal */}
      <Modal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        title="Create New"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Type</label>
            <div className="flex gap-2">
              <Button
                variant={newItemType === 'file' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setNewItemType('file')}
                className="flex-1"
                leftIcon={<File className="w-4 h-4" />}
              >
                File
              </Button>
              <Button
                variant={newItemType === 'directory' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setNewItemType('directory')}
                className="flex-1"
                leftIcon={<Folder className="w-4 h-4" />}
              >
                Folder
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Name</label>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={newItemType === 'file' ? 'filename.txt' : 'folder-name'}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              disabled={!newItemName}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        open={isRenameModalOpen}
        onOpenChange={setIsRenameModalOpen}
        title="Rename"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">New Name</label>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="New name"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
            />
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setIsRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRenameSave}
              disabled={!newItemName}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Chmod Modal */}
      <Modal
        open={isChmodModalOpen}
        onOpenChange={setIsChmodModalOpen}
        title="Permissions"
        size="md"
      >
        <div className="space-y-4">
          {chmodFile && (
            <div className="p-3 bg-bg-overlay rounded-md">
              <div className="text-sm font-medium text-text-primary">{chmodFile.name}</div>
              <div className="text-xs text-text-secondary">{chmodFile.path}</div>
            </div>
          )}
          
          {/* Owner */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Owner</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.owner.read}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    owner: { ...prev.owner, read: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Read
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.owner.write}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    owner: { ...prev.owner, write: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Write
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.owner.execute}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    owner: { ...prev.owner, execute: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Execute
              </label>
            </div>
          </div>
          
          {/* Group */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Group</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.group.read}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    group: { ...prev.group, read: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Read
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.group.write}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    group: { ...prev.group, write: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Write
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.group.execute}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    group: { ...prev.group, execute: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Execute
              </label>
            </div>
          </div>
          
          {/* Other */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Other</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.other.read}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    other: { ...prev.other, read: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Read
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.other.write}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    other: { ...prev.other, write: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Write
              </label>
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={chmodPermissions.other.execute}
                  onChange={(e) => setChmodPermissions(prev => ({
                    ...prev,
                    other: { ...prev.other, execute: e.target.checked }
                  }))}
                  className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                />
                Execute
              </label>
            </div>
          </div>
          
          {/* Numeric Preview */}
          <div className="p-3 bg-bg-overlay rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Numeric:</span>
              <code className="text-sm font-mono text-accent">
                {(() => {
                  const { owner, group, other } = chmodPermissions;
                  const o = (owner.read ? 4 : 0) + (owner.write ? 2 : 0) + (owner.execute ? 1 : 0);
                  const g = (group.read ? 4 : 0) + (group.write ? 2 : 0) + (group.execute ? 1 : 0);
                  const t = (other.read ? 4 : 0) + (other.write ? 2 : 0) + (other.execute ? 1 : 0);
                  return `${o}${g}${t}`;
                })()}
              </code>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => setIsChmodModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveChmod}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Code Editor Modal */}
      {isEditorOpen && editingFile && (
        <Modal
          open={isEditorOpen}
          onOpenChange={(open) => !open && handleCloseEditor()}
          title={`Edit: ${editingFile.name}`}
          size="full"
          showCloseButton={false}
        >
          <div className="h-[calc(100vh-200px)]">
            <CodeEditor
              value={fileContent}
              onChange={(value) => {
                setFileContent(value);
                setIsDirty(true);
              }}
              language={editingFile.category === 'code' ? 'php' : 'plaintext'}
              filePath={editingFile.path}
              isDirty={isDirty}
              isSaving={isSaving}
              onSave={handleSaveFile}
              showSaveButton
              showDownloadButton
              showFormatButton
              showSearchButton
              showFullscreenButton
              onFullscreenToggle={() => {}}
            />
          </div>
        </Modal>
      )}

      {/* Image Preview Modal */}
      {isPreviewOpen && editingFile && editingFile.category === 'image' && (
        <Modal
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          title={editingFile.name}
          size="lg"
        >
          <div className="flex items-center justify-center p-8">
            <img
              src={`/api/files/preview?path=${encodeURIComponent(editingFile.path)}`}
              alt={editingFile.name}
              className="max-w-full max-h-[60vh] object-contain rounded-md"
            />
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

// =============================================================================
// 📦 HELPER COMPONENTS
// =============================================================================

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-md border border-border bg-bg-surface', className)}>
      {children}
    </div>
  );
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-bg-overlay rounded-md', className)} />;
}