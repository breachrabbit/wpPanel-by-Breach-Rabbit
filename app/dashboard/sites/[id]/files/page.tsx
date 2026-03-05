'use client';

// =============================================================================
// wpPanel by Breach Rabbit — Site File Manager Page
// =============================================================================
// Next.js 16.1 — App Router Page
// Full-featured file manager with tree view, Monaco editor, and batch operations
// =============================================================================

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppShell, PageHeader, PageContent } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  FileText,
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
  ChevronRight,
  ChevronDown,
  Home,
  ArrowUp,
  MoreVertical,
  Zip,
  File,
  Image,
  Code,
  Settings,
  Eye,
  EyeOff,
  X,
  Check,
  AlertTriangle,
  FileCode,
  FileType,
  Archive,
  Unarchive,
  Maximize2,
  Minimize2,
  Folder,
  FolderPlus,
  FilePlus,
  Rename,
  Shield,
  Lock,
  Unlock,
  ExternalLink,
  Terminal,
  History,
  Clock,
  Info,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';

// =============================================================================
// 🎨 TYPES
// =============================================================================

type FileType = 'file' | 'directory';
type FileCategory = 'code' | 'image' | 'archive' | 'config' | 'log' | 'other';

interface FileItem {
  id: string;
  name: string;
  type: FileType;
  size: number; // bytes
  permissions: string; // e.g., "755"
  owner: string;
  group: string;
  modifiedAt: string;
  category: FileCategory;
  isSymlink?: boolean;
  symlinkTarget?: string;
}

interface FileState {
  currentPath: string;
  history: string[];
  historyIndex: number;
  files: FileItem[];
  selectedIds: string[];
  clipboard: {
    action: 'copy' | 'cut' | null;
    items: FileItem[];
  };
  searchQuery: string;
  viewMode: 'list' | 'grid';
  showHidden: boolean;
  sortBy: 'name' | 'size' | 'date' | 'type';
  sortDirection: 'asc' | 'desc';
}

interface EditorState {
  isOpen: boolean;
  file: FileItem | null;
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  language: string;
}

interface ChmodState {
  isOpen: boolean;
  file: FileItem | null;
  permissions: {
    owner: { read: boolean; write: boolean; execute: boolean };
    group: { read: boolean; write: boolean; execute: boolean };
    other: { read: boolean; write: boolean; execute: boolean };
  };
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  currentFile: string;
  totalFiles: number;
  uploadedFiles: number;
  errors: string[];
}

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const FILE_CATEGORIES: Record<string, FileCategory> = {
  // Code
  '.php': 'code',
  '.js': 'code',
  '.ts': 'code',
  '.jsx': 'code',
  '.tsx': 'code',
  '.py': 'code',
  '.rb': 'code',
  '.java': 'code',
  '.go': 'code',
  '.rs': 'code',
  '.html': 'code',
  '.css': 'code',
  '.scss': 'code',
  '.less': 'code',
  '.vue': 'code',
  '.svelte': 'code',
  
  // Config
  '.json': 'config',
  '.yaml': 'config',
  '.yml': 'config',
  '.toml': 'config',
  '.ini': 'config',
  '.conf': 'config',
  '.env': 'config',
  '.xml': 'config',
  
  // Logs
  '.log': 'log',
  '.out': 'log',
  '.err': 'log',
  
  // Images
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.svg': 'image',
  '.webp': 'image',
  '.ico': 'image',
  
  // Archives
  '.zip': 'archive',
  '.tar': 'archive',
  '.gz': 'archive',
  '.tar.gz': 'archive',
  '.rar': 'archive',
  '.7z': 'archive',
};

const LANGUAGE_MAP: Record<string, string> = {
  '.php': 'php',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.jsx': 'javascript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.rb': 'ruby',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.md': 'markdown',
  '.sh': 'shell',
  '.sql': 'sql',
  '.env': 'properties',
};

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

const getFileIcon = (file: FileItem) => {
  if (file.type === 'directory') {
    return Folder;
  }
  
  switch (file.category) {
    case 'code':
      return FileCode;
    case 'image':
      return Image;
    case 'archive':
      return Archive;
    case 'config':
      return Settings;
    case 'log':
      return FileText;
    default:
      return File;
  }
};

const getFileColor = (file: FileItem) => {
  if (file.type === 'directory') {
    return 'text-accent';
  }
  
  switch (file.category) {
    case 'code':
      return 'text-info';
    case 'image':
      return 'text-warning';
    case 'archive':
      return 'text-success';
    case 'config':
      return 'text-text-secondary';
    case 'log':
      return 'text-text-muted';
    default:
      return 'text-text-primary';
  }
};

// =============================================================================
// 🏗️ FILE MANAGER PAGE COMPONENT
// =============================================================================

export default function SiteFilesPage() {
  const router = useRouter();
  const params = useParams();
  const siteId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [fileState, setFileState] = useState<FileState>({
    currentPath: '/var/www/site',
    history: ['/var/www/site'],
    historyIndex: 0,
    files: [],
    selectedIds: [],
    clipboard: { action: null, items: [] },
    searchQuery: '',
    viewMode: 'list',
    showHidden: false,
    sortBy: 'name',
    sortDirection: 'asc',
  });
  
  const [editorState, setEditorState] = useState<EditorState>({
    isOpen: false,
    file: null,
    content: '',
    isDirty: false,
    isSaving: false,
    language: 'plaintext',
  });
  
  const [chmodState, setChmodState] = useState<ChmodState>({
    isOpen: false,
    file: null,
    permissions: {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      other: { read: true, write: false, execute: true },
    },
  });
  
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    currentFile: '',
    totalFiles: 0,
    uploadedFiles: 0,
    errors: [],
  });
  
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    file: FileItem | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    file: null,
  });
  
  const [isDragging, setIsDragging] = useState(false);

  // =============================================================================
  // 🔄 DATA FETCHING
  // =============================================================================

  const fetchFiles = useCallback(async (path: string = fileState.currentPath) => {
    setIsLoading(true);
    try {
      // Mock data - replace with real API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const mockFiles: FileItem[] = [
        { id: '1', name: 'wp-admin', type: 'directory', size: 0, permissions: '755', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'other' },
        { id: '2', name: 'wp-content', type: 'directory', size: 0, permissions: '755', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'other' },
        { id: '3', name: 'wp-includes', type: 'directory', size: 0, permissions: '755', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'other' },
        { id: '4', name: 'index.php', type: 'file', size: 4567, permissions: '644', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'code' },
        { id: '5', name: 'wp-config.php', type: 'file', size: 3456, permissions: '640', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'config' },
        { id: '6', name: '.htaccess', type: 'file', size: 1234, permissions: '644', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'config' },
        { id: '7', name: 'error.log', type: 'file', size: 56789, permissions: '644', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'log' },
        { id: '8', name: 'screenshot.png', type: 'file', size: 234567, permissions: '644', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'image' },
        { id: '9', name: 'backup.zip', type: 'file', size: 12345678, permissions: '644', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'archive' },
        { id: '10', name: '.env', type: 'file', size: 567, permissions: '600', owner: 'www-data', group: 'www-data', modifiedAt: new Date().toISOString(), category: 'config' },
      ];
      
      setFileState(prev => ({
        ...prev,
        files: mockFiles,
        currentPath: path,
      }));
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fileState.currentPath]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // =============================================================================
  // 🔧 NAVIGATION ACTIONS
  // =============================================================================

  const navigateTo = (path: string) => {
    setFileState(prev => ({
      ...prev,
      currentPath: path,
      history: [...prev.history.slice(0, prev.historyIndex + 1), path],
      historyIndex: prev.historyIndex + 1,
      selectedIds: [],
    }));
    fetchFiles(path);
  };

  const navigateUp = () => {
    const parentPath = fileState.currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateTo(parentPath);
  };

  const navigateBack = () => {
    if (fileState.historyIndex > 0) {
      const newIndex = fileState.historyIndex - 1;
      const path = fileState.history[newIndex];
      setFileState(prev => ({
        ...prev,
        currentPath: path,
        historyIndex: newIndex,
        selectedIds: [],
      }));
      fetchFiles(path);
    }
  };

  const navigateForward = () => {
    if (fileState.historyIndex < fileState.history.length - 1) {
      const newIndex = fileState.historyIndex + 1;
      const path = fileState.history[newIndex];
      setFileState(prev => ({
        ...prev,
        currentPath: path,
        historyIndex: newIndex,
        selectedIds: [],
      }));
      fetchFiles(path);
    }
  };

  const navigateHome = () => {
    navigateTo(fileState.history[0]);
  };

  // =============================================================================
  // 🔧 FILE ACTIONS
  // =============================================================================

  const handleSelectFile = (fileId: string, multiSelect: boolean = false) => {
    setFileState(prev => {
      if (multiSelect) {
        const isSelected = prev.selectedIds.includes(fileId);
        return {
          ...prev,
          selectedIds: isSelected
            ? prev.selectedIds.filter(id => id !== fileId)
            : [...prev.selectedIds, fileId],
        };
      } else {
        return {
          ...prev,
          selectedIds: [fileId],
        };
      }
    });
  };

  const handleSelectAll = () => {
    setFileState(prev => ({
      ...prev,
      selectedIds: prev.files.map(f => f.id),
    }));
  };

  const handleClearSelection = () => {
    setFileState(prev => ({
      ...prev,
      selectedIds: [],
    }));
  };

  const handleOpenFile = (file: FileItem) => {
    if (file.type === 'directory') {
      navigateTo(`${fileState.currentPath}/${file.name}`);
    } else if (file.category === 'code' || file.category === 'config' || file.category === 'log') {
      openEditor(file);
    } else if (file.category === 'image') {
      // Open image preview modal
      console.log('Preview image:', file.name);
    } else {
      // Download file
      handleDownload([file]);
    }
  };

  const handleDownload = async (files: FileItem[]) => {
    try {
      // Mock download
      console.log('Downloading files:', files.map(f => f.name));
      // In real implementation: trigger download from API
    } catch (error) {
      console.error('Failed to download:', error);
    }
  };

  const handleDelete = async (files: FileItem[]) => {
    if (!confirm(`Are you sure you want to delete ${files.length} item(s)?`)) {
      return;
    }
    
    try {
      // Mock delete
      console.log('Deleting files:', files.map(f => f.name));
      setFileState(prev => ({
        ...prev,
        files: prev.files.filter(f => !files.find(d => d.id === f.id)),
        selectedIds: [],
      }));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCopy = (files: FileItem[]) => {
    setFileState(prev => ({
      ...prev,
      clipboard: { action: 'copy', items: files },
    }));
  };

  const handleCut = (files: FileItem[]) => {
    setFileState(prev => ({
      ...prev,
      clipboard: { action: 'cut', items: files },
    }));
  };

  const handlePaste = async () => {
    if (!fileState.clipboard.action || fileState.clipboard.items.length === 0) {
      return;
    }
    
    try {
      console.log('Pasting:', fileState.clipboard.action, fileState.clipboard.items.map(f => f.name));
      // Mock paste
      setFileState(prev => ({
        ...prev,
        clipboard: { action: null, items: [] },
      }));
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  };

  const handleRename = (file: FileItem) => {
    const newName = prompt('Enter new name:', file.name);
    if (newName && newName !== file.name) {
      console.log('Renaming:', file.name, 'to', newName);
      // Mock rename
    }
  };

  const handleChmod = (file: FileItem) => {
    const permissions = file.permissions.split('').map(Number);
    setChmodState({
      isOpen: true,
      file,
      permissions: {
        owner: {
          read: (permissions[0] & 4) !== 0,
          write: (permissions[0] & 2) !== 0,
          execute: (permissions[0] & 1) !== 0,
        },
        group: {
          read: (permissions[1] & 4) !== 0,
          write: (permissions[1] & 2) !== 0,
          execute: (permissions[1] & 1) !== 0,
        },
        other: {
          read: (permissions[2] & 4) !== 0,
          write: (permissions[2] & 2) !== 0,
          execute: (permissions[2] & 1) !== 0,
        },
      },
    });
  };

  const handleSaveChmod = async () => {
    if (!chmodState.file) return;
    
    const { owner, group, other } = chmodState.permissions;
    const ownerNum = (owner.read ? 4 : 0) + (owner.write ? 2 : 0) + (owner.execute ? 1 : 0);
    const groupNum = (group.read ? 4 : 0) + (group.write ? 2 : 0) + (group.execute ? 1 : 0);
    const otherNum = (other.read ? 4 : 0) + (other.write ? 2 : 0) + (other.execute ? 1 : 0);
    const newPermissions = `${ownerNum}${groupNum}${otherNum}`;
    
    try {
      console.log('Setting permissions:', chmodState.file.name, 'to', newPermissions);
      // Mock chmod
      setChmodState(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error('Failed to set permissions:', error);
    }
  };

  // =============================================================================
  // 📝 EDITOR ACTIONS
  // =============================================================================

  const openEditor = (file: FileItem) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const language = LANGUAGE_MAP[ext] || 'plaintext';
    
    setEditorState({
      isOpen: true,
      file,
      content: '', // Would load from API
      isDirty: false,
      isSaving: false,
      language,
    });
  };

  const handleSaveFile = async () => {
    if (!editorState.file) return;
    
    setEditorState(prev => ({ ...prev, isSaving: true }));
    try {
      // Mock save
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Saving file:', editorState.file.name);
      setEditorState(prev => ({ ...prev, isDirty: false, isSaving: false }));
    } catch (error) {
      console.error('Failed to save:', error);
      setEditorState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const handleCloseEditor = () => {
    if (editorState.isDirty) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }
    setEditorState(prev => ({ ...prev, isOpen: false, file: null, content: '', isDirty: false }));
  };

  // =============================================================================
  // 📤 UPLOAD ACTIONS
  // =============================================================================

  const handleUpload = async (files: FileList) => {
    setUploadState({
      isUploading: true,
      progress: 0,
      currentFile: '',
      totalFiles: files.length,
      uploadedFiles: 0,
      errors: [],
    });
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadState(prev => ({ ...prev, currentFile: file.name }));
        
        // Mock upload
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setUploadState(prev => ({
          ...prev,
          uploadedFiles: prev.uploadedFiles + 1,
          progress: ((i + 1) / files.length) * 100,
        }));
      }
      
      // Refresh file list
      fetchFiles();
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState(prev => ({
        ...prev,
        errors: [...prev.errors, 'Upload failed'],
      }));
    } finally {
      setUploadState(prev => ({ ...prev, isUploading: false }));
    }
  };

  // =============================================================================
  // 🎯 DRAG & DROP
  // =============================================================================

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // =============================================================================
  // 🔍 FILTERING & SORTING
  // =============================================================================

  const filteredAndSortedFiles = React.useMemo(() => {
    let result = [...fileState.files];
    
    // Filter hidden files
    if (!fileState.showHidden) {
      result = result.filter(f => !f.name.startsWith('.'));
    }
    
    // Filter by search
    if (fileState.searchQuery) {
      const query = fileState.searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(query));
    }
    
    // Sort
    result.sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      
      let comparison = 0;
      switch (fileState.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
          break;
        case 'type':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return fileState.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [fileState.files, fileState.showHidden, fileState.searchQuery, fileState.sortBy, fileState.sortDirection]);

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
          { label: 'Sites', href: '/dashboard/sites' },
          { label: 'Site', href: `/dashboard/sites/${siteId}` },
          { label: 'Files' },
        ]}
        description={fileState.currentPath}
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
              onChange={(e) => e.target.files && handleUpload(e.target.files)}
            />
          </div>
        }
      />

      <PageContent>
        <div
          ref={dropZoneRef}
          className={cn(
            'space-y-4',
            isDragging && 'ring-2 ring-accent ring-offset-2 ring-offset-bg-base'
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Upload Progress */}
          {uploadState.isUploading && (
            <AlertBanner
              variant="info"
              title="Uploading Files"
              message={`${uploadState.currentFile} (${uploadState.uploadedFiles}/${uploadState.totalFiles})`}
              dismissible={false}
            >
              <div className="mt-2">
                <div className="h-2 bg-bg-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-200"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            </AlertBanner>
          )}

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
                    onClick={navigateBack}
                    disabled={fileState.historyIndex === 0}
                  >
                    <ArrowUp className="w-4 h-4 rotate-[-90deg]" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={navigateForward}
                    disabled={fileState.historyIndex === fileState.history.length - 1}
                  >
                    <ArrowUp className="w-4 h-4 rotate-90deg" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={navigateUp}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={navigateHome}
                  >
                    <Home className="w-4 h-4" />
                  </Button>
                  
                  {/* Path Breadcrumb */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-bg-overlay rounded-md text-sm text-text-secondary">
                    {fileState.currentPath.split('/').filter(Boolean).map((segment, index, arr) => (
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
                  {fileState.selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-accent-subtle rounded-md">
                      <span className="text-sm text-accent">
                        {fileState.selectedIds.length} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCopy(fileState.files.filter(f => fileState.selectedIds.includes(f.id)))}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCut(fileState.files.filter(f => fileState.selectedIds.includes(f.id)))}
                      >
                        <Scissors className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-error hover:text-error"
                        onClick={() => handleDelete(fileState.files.filter(f => fileState.selectedIds.includes(f.id)))}
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
                  {fileState.clipboard.action && fileState.clipboard.items.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handlePaste}
                      leftIcon={<Clipboard className="w-4 h-4" />}
                    >
                      Paste ({fileState.clipboard.items.length})
                    </Button>
                  )}

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 border border-border rounded-md p-1">
                    <Button
                      variant={fileState.viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setFileState(prev => ({ ...prev, viewMode: 'list' }))}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={fileState.viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setFileState(prev => ({ ...prev, viewMode: 'grid' }))}
                    >
                      <Folder className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Show Hidden Toggle */}
                  <Toggle
                    label="Hidden"
                    checked={fileState.showHidden}
                    onCheckedChange={(checked) => setFileState(prev => ({ ...prev, showHidden: checked }))}
                    size="sm"
                  />
                </div>

                {/* Search & Sort */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      placeholder="Search files..."
                      value={fileState.searchQuery}
                      onChange={(e) => setFileState(prev => ({ ...prev, searchQuery: e.target.value }))}
                      className="pl-9 w-48"
                      size="sm"
                    />
                  </div>
                  
                  <Select
                    value={fileState.sortBy}
                    onValueChange={(value) => setFileState(prev => ({ ...prev, sortBy: value as any }))}
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
                    onClick={() => setFileState(prev => ({
                      ...prev,
                      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
                    }))}
                  >
                    {fileState.sortDirection === 'asc' ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4 rotate-180" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File List/Grid */}
          {isLoading ? (
            // Loading Skeleton
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
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
                    {fileState.searchQuery ? 'No files match your search' : 'This folder is empty'}
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">
                    {fileState.searchQuery
                      ? 'Try adjusting your search query'
                      : 'Upload files or create a new folder to get started'}
                  </p>
                  {!fileState.searchQuery && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      leftIcon={<Upload className="w-4 h-4" />}
                    >
                      Upload Files
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : fileState.viewMode === 'list' ? (
            // List View
            <div className="space-y-1">
              {/* Header */}
              <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-text-muted border-b border-border">
                <div className="w-8 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={fileState.selectedIds.length === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0}
                    onChange={(e) => e.target.checked ? handleSelectAll() : handleClearSelection()}
                    className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                  />
                </div>
                <div className="flex-1">Name</div>
                <div className="w-24">Size</div>
                <div className="w-20">Permissions</div>
                <div className="w-40">Modified</div>
                <div className="w-20"></div>
              </div>
              
              {/* Files */}
              {filteredAndSortedFiles.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors',
                    fileState.selectedIds.includes(file.id) && 'bg-accent-subtle',
                    !fileState.selectedIds.includes(file.id) && 'hover:bg-bg-overlay'
                  )}
                  onClick={(e) => handleSelectFile(file.id, e.metaKey || e.ctrlKey)}
                  onDoubleClick={() => handleOpenFile(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      isOpen: true,
                      x: e.clientX,
                      y: e.clientY,
                      file,
                    });
                  }}
                >
                  <div className="w-8 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={fileState.selectedIds.includes(file.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectFile(file.id, true);
                      }}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {React.createElement(getFileIcon(file), {
                      className: cn('w-5 h-5 flex-shrink-0', getFileColor(file)),
                    })}
                    <span className={cn(
                      'text-sm truncate',
                      file.type === 'directory' && 'font-medium text-text-primary',
                      file.type === 'file' && 'text-text-secondary'
                    )}>
                      {file.name}
                    </span>
                    {file.isSymlink && (
                      <LinkIcon className="w-3 h-3 text-text-muted" />
                    )}
                  </div>
                  
                  <div className="w-24 text-xs text-text-secondary">
                    {file.type === 'directory' ? '-' : formatBytes(file.size)}
                  </div>
                  
                  <div className="w-20">
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
                  
                  <div className="w-40 text-xs text-text-secondary">
                    {formatDate(file.modifiedAt)}
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
                          {file.type === 'directory' ? (
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                              onClick={() => handleOpenFile(file)}
                            >
                              <FolderOpen className="w-4 h-4" />
                              Open
                            </DropdownMenu.Item>
                          ) : (
                            <>
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                onClick={() => openEditor(file)}
                              >
                                <Edit className="w-4 h-4" />
                                Edit
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                                onClick={() => handleDownload([file])}
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </DropdownMenu.Item>
                            </>
                          )}
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy([file]);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                            Copy
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(file);
                            }}
                          >
                            <Rename className="w-4 h-4" />
                            Rename
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-bg-overlay hover:text-text-primary rounded-sm cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChmod(file);
                            }}
                          >
                            <Shield className="w-4 h-4" />
                            Permissions
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-px bg-border my-1" />
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-subtle hover:text-error rounded-sm cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete([file]);
                            }}
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
          ) : (
            // Grid View
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {filteredAndSortedFiles.map((file) => (
                <Card
                  key={file.id}
                  className={cn(
                    'group cursor-pointer transition-all',
                    fileState.selectedIds.includes(file.id) && 'border-accent bg-accent-subtle/30',
                    !fileState.selectedIds.includes(file.id) && 'hover:border-border-hover'
                  )}
                  onClick={() => handleSelectFile(file.id, false)}
                  onDoubleClick={() => handleOpenFile(file)}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col items-center text-center">
                      {React.createElement(getFileIcon(file), {
                        className: cn('w-10 h-10 mb-2', getFileColor(file)),
                      })}
                      <div className="text-sm font-medium text-text-primary truncate w-full">
                        {file.name}
                      </div>
                      <div className="text-xs text-text-secondary mt-1">
                        {file.type === 'directory' ? 'Folder' : formatBytes(file.size)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Footer Info */}
          <div className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-border">
            <span>
              {filteredAndSortedFiles.length} item{filteredAndSortedFiles.length !== 1 ? 's' : ''}
              {fileState.selectedIds.length > 0 && ` • ${fileState.selectedIds.length} selected`}
            </span>
            <span>
              {formatBytes(filteredAndSortedFiles.reduce((acc, f) => acc + f.size, 0))} total
            </span>
          </div>
        </div>
      </PageContent>

      {/* File Editor Modal */}
      {editorState.isOpen && (
        <Modal
          open={editorState.isOpen}
          onOpenChange={(open) => {
            if (!open) handleCloseEditor();
          }}
          size="xl"
        >
          <div className="flex flex-col h-[70vh]">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                {React.createElement(getFileIcon(editorState.file!), {
                  className: cn('w-5 h-5', getFileColor(editorState.file!)),
                })}
                <span className="font-medium text-text-primary">{editorState.file?.name}</span>
                {editorState.isDirty && (
                  <span className="text-xs text-warning">• Unsaved</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveFile}
                  disabled={!editorState.isDirty || editorState.isSaving}
                  leftIcon={
                    editorState.isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )
                  }
                >
                  {editorState.isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseEditor}
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Close
                </Button>
              </div>
            </div>
            
            {/* Editor Content */}
            <div className="flex-1 overflow-auto bg-bg-base p-4">
              {/* Monaco Editor would be lazy-loaded here */}
              <textarea
                value={editorState.content}
                onChange={(e) => setEditorState(prev => ({ ...prev, content: e.target.value, isDirty: true }))}
                className="w-full h-full bg-bg-base text-text-primary font-mono text-sm resize-none focus:outline-none"
                placeholder="File content..."
              />
            </div>
            
            {/* Editor Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
              <span>{editorState.language.toUpperCase()}</span>
              <span>
                {editorState.content.split('\n').length} lines • {editorState.content.length} characters
              </span>
            </div>
          </div>
        </Modal>
      )}

      {/* CHMOD Modal */}
      {chmodState.isOpen && chmodState.file && (
        <Modal
          open={chmodState.isOpen}
          onOpenChange={(open) => setChmodState(prev => ({ ...prev, isOpen: open }))}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-semibold text-text-primary">
                Permissions: {chmodState.file.name}
              </h3>
            </div>
            
            <div className="space-y-4">
              {/* Owner */}
              <div className="flex items-center justify-between p-3 bg-bg-overlay rounded-md">
                <span className="text-sm font-medium text-text-primary">Owner</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.owner.read}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, owner: { ...prev.permissions.owner, read: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Read
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.owner.write}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, owner: { ...prev.permissions.owner, write: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Write
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.owner.execute}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, owner: { ...prev.permissions.owner, execute: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Execute
                  </label>
                </div>
              </div>
              
              {/* Group */}
              <div className="flex items-center justify-between p-3 bg-bg-overlay rounded-md">
                <span className="text-sm font-medium text-text-primary">Group</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.group.read}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, group: { ...prev.permissions.group, read: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Read
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.group.write}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, group: { ...prev.permissions.group, write: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Write
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.group.execute}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, group: { ...prev.permissions.group, execute: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Execute
                  </label>
                </div>
              </div>
              
              {/* Other */}
              <div className="flex items-center justify-between p-3 bg-bg-overlay rounded-md">
                <span className="text-sm font-medium text-text-primary">Other</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.other.read}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, other: { ...prev.permissions.other, read: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Read
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.other.write}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, other: { ...prev.permissions.other, write: e.target.checked } }
                      }))}
                      className="w-4 h-4 rounded border-border bg-bg-base text-accent focus:ring-accent"
                    />
                    Write
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-secondary">
                    <input
                      type="checkbox"
                      checked={chmodState.permissions.other.execute}
                      onChange={(e) => setChmodState(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, other: { ...prev.permissions.other, execute: e.target.checked } }
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
                      const { owner, group, other } = chmodState.permissions;
                      const o = (owner.read ? 4 : 0) + (owner.write ? 2 : 0) + (owner.execute ? 1 : 0);
                      const g = (group.read ? 4 : 0) + (group.write ? 2 : 0) + (group.execute ? 1 : 0);
                      const t = (other.read ? 4 : 0) + (other.write ? 2 : 0) + (other.execute ? 1 : 0);
                      return `${o}${g}${t}`;
                    })()}
                  </code>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChmodState(prev => ({ ...prev, isOpen: false }))}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveChmod}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div
          className="fixed z-[1000] bg-bg-elevated border border-border rounded-md shadow-elevated p-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        >
          {/* Context menu items would go here */}
        </div>
      )}
    </AppShell>
  );
}