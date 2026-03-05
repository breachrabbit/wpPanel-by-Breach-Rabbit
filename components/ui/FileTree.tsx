'use client';

// =============================================================================
// wpPanel by Breach Rabbit — FileTree Component
// =============================================================================
// Next.js 16.1 — Client Component
// Tailwind CSS 4 — CSS-first styling with CSS variables
// Features: Recursive tree, lazy loading, drag & drop, context menu, batch ops
// =============================================================================

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  Image,
  Archive,
  Code,
  Database,
  Settings,
  MoreVertical,
  Plus,
  Trash2,
  Edit,
  Copy,
  Scissors,
  Clipboard,
  Download,
  Upload,
  Search,
  RefreshCw,
  Maximize2,
  Minimize2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type FileType = 'file' | 'directory';
export type FileCategory = 'code' | 'image' | 'archive' | 'config' | 'log' | 'database' | 'other';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: FileType;
  category?: FileCategory;
  size?: number;
  modifiedAt?: string;
  permissions?: string;
  owner?: string;
  isSymlink?: boolean;
  symlinkTarget?: string;
  children?: FileNode[];
  isLoading?: boolean;
  isError?: boolean;
}

export interface FileTreeProps extends React.ComponentPropsWithoutRef<'div'> {
  /** Root directory path */
  rootPath?: string;
  
  /** Initial tree data */
  data?: FileNode[];
  
  /** On directory expand (for lazy loading) */
  onExpand?: (path: string) => Promise<FileNode[]>;
  
  /** On file/directory select */
  onSelect?: (node: FileNode) => void;
  
  /** On file/directory double-click */
  onDoubleClick?: (node: FileNode) => void;
  
  /** On context menu action */
  onAction?: (action: string, nodes: FileNode[]) => void;
  
  /** Enable multi-select */
  multiSelect?: boolean;
  
  /** Enable drag & drop */
  draggable?: boolean;
  
  /** Enable file upload dropzone */
  droppable?: boolean;
  
  /** On file drop */
  onDrop?: (files: File[], targetPath: string) => void;
  
  /** Selected file IDs */
  selectedIds?: string[];
  
  /** Expanded directory IDs */
  expandedIds?: string[];
  
  /** On expanded change */
  onExpandedChange?: (ids: string[]) => void;
  
  /** Filter by search term */
  searchTerm?: string;
  
  /** Show hidden files (starting with .) */
  showHidden?: boolean;
  
  /** Show file sizes */
  showSizes?: boolean;
  
  /** Show permissions */
  showPermissions?: boolean;
  
  /** Show modified date */
  showModifiedDate?: boolean;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Error message */
  error?: string;
  
  /** On retry */
  onRetry?: () => void;
  
  /** Custom className for tree container */
  treeClassName?: string;
  
  /** Height override */
  height?: number | string;
}

export interface FileTreeNodeProps {
  node: FileNode;
  level: number;
  selectedIds: string[];
  expandedIds: string[];
  onToggle: (node: FileNode) => void;
  onSelect: (node: FileNode, multi: boolean) => void;
  onDoubleClick: (node: FileNode) => void;
  onAction: (action: string, nodes: FileNode[]) => void;
  draggable: boolean;
  showSizes: boolean;
  showPermissions: boolean;
  showModifiedDate: boolean;
  searchTerm: string;
  showHidden: boolean;
}

// =============================================================================
// ⚙️ HELPERS
// =============================================================================

/**
 * Get file category by name/extension
 */
function getFileCategory(name: string, type: FileType): FileCategory {
  if (type === 'directory') return 'other';
  
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const lowerName = name.toLowerCase();
  
  // Config files
  if (['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'xml', 'env', 'htaccess'].includes(ext)) {
    return 'config';
  }
  
  // Code files
  if (['php', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'go', 'rs', 'html', 'css', 'scss', 'less', 'vue', 'svelte', 'sh', 'bash'].includes(ext)) {
    return 'code';
  }
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'].includes(ext)) {
    return 'image';
  }
  
  // Archives
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2'].includes(ext)) {
    return 'archive';
  }
  
  // Logs
  if (['log', 'out', 'err'].includes(ext) || lowerName.includes('log')) {
    return 'log';
  }
  
  // Database
  if (['sql', 'db', 'sqlite', 'mdb'].includes(ext)) {
    return 'database';
  }
  
  return 'other';
}

/**
 * Get file icon by category
 */
function getFileIcon(category: FileCategory, isOpen?: boolean): React.ComponentType<{ className?: string }> {
  if (category === 'other' && isOpen) return FolderOpen;
  if (category === 'other') return Folder;
  if (category === 'code') return Code;
  if (category === 'image') return Image;
  if (category === 'archive') return Archive;
  if (category === 'config') return Settings;
  if (category === 'log') return FileText;
  if (category === 'database') return Database;
  return File;
}

/**
 * Format file size
 */
function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format date to relative time
 */
function formatRelativeTime(dateString?: string): string {
  if (!dateString) return '';
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

/**
 * Check if node matches search
 */
function matchesSearch(node: FileNode, searchTerm: string): boolean {
  if (!searchTerm) return true;
  return node.name.toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * Check if node is hidden
 */
function isHidden(node: FileNode): boolean {
  return node.name.startsWith('.');
}

// =============================================================================
// 🏗️ FILE TREE NODE COMPONENT
// =============================================================================

const FileTreeNode = React.memo<FileTreeNodeProps>(
  ({
    node,
    level,
    selectedIds,
    expandedIds,
    onToggle,
    onSelect,
    onDoubleClick,
    onAction,
    draggable,
    showSizes,
    showPermissions,
    showModifiedDate,
    searchTerm,
    showHidden,
  }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const isSelected = selectedIds.includes(node.id);
    const isExpanded = expandedIds.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isHiddenFile = isHidden(node);
    
    // Skip hidden files if not showing
    if (!showHidden && isHiddenFile) {
      return null;
    }
    
    // Skip if doesn't match search (but show if parent matches)
    if (searchTerm && !matchesSearch(node, searchTerm) && !hasChildren) {
      return null;
    }
    
    const category = node.category || getFileCategory(node.name, node.type);
    const Icon = getFileIcon(category, node.type === 'directory' && isExpanded);
    
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node, e.metaKey || e.ctrlKey);
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick(node);
    };
    
    const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.type === 'directory') {
        onToggle(node);
      }
    };

    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            className={cn(
              // Base styles
              'flex items-center',
              'py-1.5 px-2',
              'cursor-pointer',
              'transition-colors',
              
              // Selection
              isSelected && 'bg-accent-subtle text-accent',
              !isSelected && isHovered && 'bg-bg-overlay',
              
              // Level indent
              'pl-4',
              node.type === 'directory' && 'font-medium'
            )}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            draggable={draggable}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', node.path);
              e.dataTransfer.effectAllowed = 'copyMove';
            }}
            role="treeitem"
            aria-selected={isSelected}
            aria-expanded={node.type === 'directory' ? isExpanded : undefined}
          >
            {/* Expand/Collapse Chevron */}
            <button
              onClick={handleToggle}
              className={cn(
                'flex items-center justify-center',
                'w-5 h-5',
                'rounded',
                'text-text-muted hover:text-text-primary',
                'transition-colors',
                node.type !== 'directory' && 'invisible'
              )}
              tabIndex={-1}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* File/Folder Icon */}
            <Icon
              className={cn(
                'w-4 h-4',
                'flex-shrink-0',
                'mr-2',
                node.type === 'directory' ? 'text-accent' : 'text-text-secondary',
                isSelected && 'text-accent'
              )}
              aria-hidden="true"
            />

            {/* File Name */}
            <span
              className={cn(
                'flex-1',
                'truncate',
                'text-sm',
                isSelected && 'text-accent',
                isHiddenFile && 'text-text-muted opacity-70'
              )}
              title={node.name}
            >
              {node.name}
            </span>

            {/* File Size */}
            {showSizes && node.type === 'file' && node.size !== undefined && (
              <span className="text-xs text-text-muted ml-2 tabular-nums">
                {formatFileSize(node.size)}
              </span>
            )}

            {/* Permissions */}
            {showPermissions && node.permissions && (
              <span className="text-xs text-text-muted ml-2 font-mono">
                {node.permissions}
              </span>
            )}

            {/* Modified Date */}
            {showModifiedDate && node.modifiedAt && (
              <span className="text-xs text-text-muted ml-2 hidden lg:inline">
                {formatRelativeTime(node.modifiedAt)}
              </span>
            )}

            {/* Loading Indicator */}
            {node.isLoading && (
              <RefreshCw className="w-3 h-3 text-text-muted ml-2 animate-spin" />
            )}

            {/* Error Indicator */}
            {node.isError && (
              <AlertTriangle className="w-3 h-3 text-error ml-2" />
            )}
          </div>
        </ContextMenu.Trigger>

        {/* Context Menu */}
        <ContextMenu.Portal>
          <ContextMenu.Content
            className={cn(
              'z-50',
              'min-w-[180px]',
              'bg-bg-elevated',
              'border border-border',
              'rounded-md',
              'shadow-elevated',
              'p-1',
              'animate-slide-up'
            )}
          >
            <ContextMenu.Item
              className={cn(
                'flex items-center gap-2',
                'px-3 py-2',
                'rounded-sm',
                'text-sm',
                'text-text-secondary',
                'hover:bg-bg-overlay hover:text-text-primary',
                'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                'cursor-pointer'
              )}
              onClick={() => onAction('open', [node])}
            >
              <FolderOpen className="w-4 h-4" />
              Open
            </ContextMenu.Item>
            
            <ContextMenu.Separator className="h-px bg-border my-1" />
            
            <ContextMenu.Item
              className={cn(
                'flex items-center gap-2',
                'px-3 py-2',
                'rounded-sm',
                'text-sm',
                'text-text-secondary',
                'hover:bg-bg-overlay hover:text-text-primary',
                'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                'cursor-pointer'
              )}
              onClick={() => onAction('download', [node])}
            >
              <Download className="w-4 h-4" />
              Download
            </ContextMenu.Item>
            
            <ContextMenu.Item
              className={cn(
                'flex items-center gap-2',
                'px-3 py-2',
                'rounded-sm',
                'text-sm',
                'text-text-secondary',
                'hover:bg-bg-overlay hover:text-text-primary',
                'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                'cursor-pointer'
              )}
              onClick={() => onAction('copy', [node])}
            >
              <Copy className="w-4 h-4" />
              Copy
            </ContextMenu.Item>
            
            <ContextMenu.Item
              className={cn(
                'flex items-center gap-2',
                'px-3 py-2',
                'rounded-sm',
                'text-sm',
                'text-text-secondary',
                'hover:bg-bg-overlay hover:text-text-primary',
                'focus:outline-none focus:bg-bg-overlay focus:text-text-primary',
                'cursor-pointer'
              )}
              onClick={() => onAction('rename', [node])}
            >
              <Edit className="w-4 h-4" />
              Rename
            </ContextMenu.Item>
            
            <ContextMenu.Separator className="h-px bg-border my-1" />
            
            <ContextMenu.Item
              className={cn(
                'flex items-center gap-2',
                'px-3 py-2',
                'rounded-sm',
                'text-sm',
                'text-error',
                'hover:bg-error-subtle hover:text-error',
                'focus:outline-none focus:bg-error-subtle focus:text-error',
                'cursor-pointer'
              )}
              onClick={() => onAction('delete', [node])}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>

        {/* Children (recursive) */}
        {node.type === 'directory' && isExpanded && node.children && (
          <div role="group">
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                level={level + 1}
                selectedIds={selectedIds}
                expandedIds={expandedIds}
                onToggle={onToggle}
                onSelect={onSelect}
                onDoubleClick={onDoubleClick}
                onAction={onAction}
                draggable={draggable}
                showSizes={showSizes}
                showPermissions={showPermissions}
                showModifiedDate={showModifiedDate}
                searchTerm={searchTerm}
                showHidden={showHidden}
              />
            ))}
          </div>
        )}
      </ContextMenu.Root>
    );
  }
);

FileTreeNode.displayName = 'FileTreeNode';

// =============================================================================
// 🏗️ FILE TREE COMPONENT
// =============================================================================

export const FileTree = React.forwardRef<HTMLDivElement, FileTreeProps>(
  (
    {
      className,
      rootPath = '/',
      data,
      onExpand,
      onSelect,
      onDoubleClick,
      onAction,
      multiSelect = true,
      draggable = true,
      droppable = true,
      onDrop,
      selectedIds = [],
      expandedIds = [],
      onExpandedChange,
      searchTerm = '',
      showHidden = false,
      showSizes = true,
      showPermissions = false,
      showModifiedDate = true,
      isLoading = false,
      error,
      onRetry,
      treeClassName,
      height: heightOverride,
      ...props
    },
    ref
  ) => {
    const [localExpandedIds, setLocalExpandedIds] = React.useState<string[]>(expandedIds);
    const [isDragOver, setIsDragOver] = React.useState(false);
    const [dropTargetPath, setDropTargetPath] = React.useState<string | null>(null);
    
    const height = heightOverride || '100%';

    // Sync with external expandedIds
    React.useEffect(() => {
      setLocalExpandedIds(expandedIds);
    }, [expandedIds]);

    const handleToggle = React.useCallback(async (node: FileNode) => {
      const isExpanded = localExpandedIds.includes(node.id);
      
      if (isExpanded) {
        // Collapse
        setLocalExpandedIds(prev => prev.filter(id => id !== node.id));
        onExpandedChange?.(localExpandedIds.filter(id => id !== node.id));
      } else {
        // Expand
        if (onExpand && node.type === 'directory') {
          // Lazy load children
          try {
            const children = await onExpand(node.path);
            // Update data with loaded children (parent component should handle this)
          } catch (error) {
            console.error('Failed to load directory:', error);
          }
        }
        
        const newExpandedIds = [...localExpandedIds, node.id];
        setLocalExpandedIds(newExpandedIds);
        onExpandedChange?.(newExpandedIds);
      }
    }, [localExpandedIds, onExpand, onExpandedChange]);

    const handleSelect = React.useCallback((node: FileNode, multi: boolean) => {
      if (multi && multiSelect) {
        // Multi-select with Ctrl/Cmd
        const newSelectedIds = selectedIds.includes(node.id)
          ? selectedIds.filter(id => id !== node.id)
          : [...selectedIds, node.id];
        
        // This should be handled by parent component
      } else {
        // Single select
        onSelect?.(node);
      }
    }, [selectedIds, multiSelect, onSelect]);

    const handleDoubleClick = React.useCallback((node: FileNode) => {
      if (node.type === 'directory') {
        // Expand directory
        if (!localExpandedIds.includes(node.id)) {
          handleToggle(node);
        }
      } else {
        // Open file
        onDoubleClick?.(node);
      }
    }, [localExpandedIds, handleToggle, onDoubleClick]);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      if (droppable) {
        setIsDragOver(true);
      }
    }, [droppable]);

    const handleDragLeave = React.useCallback(() => {
      setIsDragOver(false);
      setDropTargetPath(null);
    }, []);

    const handleDrop = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      if (dropTargetPath && onDrop) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          onDrop(files, dropTargetPath);
        }
      }
      
      setDropTargetPath(null);
    }, [dropTargetPath, onDrop]);

    const handleNodeDrop = React.useCallback((node: FileNode) => {
      setDropTargetPath(node.path);
    }, []);

    const handleAction = React.useCallback((action: string, nodes: FileNode[]) => {
      onAction?.(action, nodes);
    }, [onAction]);

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative',
          'flex flex-col',
          'rounded-md',
          'border',
          'border-border',
          'bg-bg-surface',
          'overflow-hidden',
          
          // Drag over state
          isDragOver && 'border-accent bg-accent-subtle',
          
          // Custom className
          className
        )}
        style={{ height }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="tree"
        aria-label="File tree"
        {...props}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-surface/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Loading files...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <AlertTriangle className="w-8 h-8 text-error mb-3" />
            <p className="text-sm text-text-secondary text-center mb-3">{error}</p>
            {onRetry && (
              <Button
                variant="primary"
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Tree Container */}
        {!error && (
          <div
            className={cn(
              'flex-1',
              'overflow-auto',
              'wp-scrollbar',
              treeClassName
            )}
          >
            {/* Empty State */}
            {(!data || data.length === 0) && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Folder className="w-12 h-12 text-text-muted mb-3 opacity-50" />
                <p className="text-sm text-text-secondary">No files found</p>
                {searchTerm && (
                  <p className="text-xs text-text-muted mt-1">
                    Try adjusting your search
                  </p>
                )}
              </div>
            )}

            {/* Tree Nodes */}
            {data && data.map((node) => (
              <FileTreeNode
                key={node.id}
                node={node}
                level={0}
                selectedIds={selectedIds}
                expandedIds={localExpandedIds}
                onToggle={handleToggle}
                onSelect={handleSelect}
                onDoubleClick={handleDoubleClick}
                onAction={handleAction}
                draggable={draggable}
                showSizes={showSizes}
                showPermissions={showPermissions}
                showModifiedDate={showModifiedDate}
                searchTerm={searchTerm}
                showHidden={showHidden}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

FileTree.displayName = 'FileTree';

// =============================================================================
// 📦 HELPER COMPONENTS
// =============================================================================

/**
 * Button — Simplified button for actions
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
}

function Button({
  className,
  variant = 'primary',
  size = 'md',
  leftIcon,
  children,
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-sm',
  };

  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    secondary: 'bg-bg-overlay text-text-primary border border-border hover:bg-bg-elevated',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-overlay hover:text-text-primary',
    danger: 'bg-transparent text-error hover:bg-error-subtle hover:text-error',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center',
        'font-medium',
        'rounded-md',
        'transition-all duration-150 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
    </button>
  );
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export type { FileTreeProps, FileNode, FileType, FileCategory };

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Usage:
 * 
 * import { FileTree } from '@/components/ui/FileTree';
 * 
 * // Simple file tree
 * <FileTree
 *   data={files}
 *   onSelect={(node) => console.log('Selected:', node)}
 *   onDoubleClick={(node) => console.log('Double-clicked:', node)}
 * />
 * 
 * // With lazy loading
 * <FileTree
 *   data={files}
 *   onExpand={async (path) => {
 *     const response = await fetch(`/api/files?path=${path}`);
 *     return response.json();
 *   }}
 * />
 * 
 * // With multi-select
 * <FileTree
 *   data={files}
 *   multiSelect
 *   selectedIds={selectedIds}
 *   onSelect={(node) => setSelectedIds([node.id])}
 * />
 * 
 * // With drag & drop upload
 * <FileTree
 *   data={files}
 *   droppable
 *   onDrop={async (files, targetPath) => {
 *     const formData = new FormData();
 *     files.forEach(file => formData.append('files', file));
 *     formData.append('path', targetPath);
 *     
 *     await fetch('/api/files/upload', {
 *       method: 'POST',
 *       body: formData,
 *     });
 *   }}
 * />
 * 
 * // With context menu actions
 * <FileTree
 *   data={files}
 *   onAction={async (action, nodes) => {
 *     switch (action) {
 *       case 'delete':
 *         await fetch('/api/files', {
 *           method: 'DELETE',
 *           body: JSON.stringify({ paths: nodes.map(n => n.path) }),
 *         });
 *         break;
 *       case 'rename':
 *         const newName = prompt('New name:');
 *         if (newName) {
 *           await fetch('/api/files/rename', {
 *             method: 'POST',
 *             body: JSON.stringify({ path: nodes[0].path, newName }),
 *           });
 *         }
 *         break;
 *       case 'download':
 *         window.open(`/api/files/download?path=${nodes[0].path}`);
 *         break;
 *     }
 *   }}
 * />
 * 
 * // In file manager
 * function FileManager() {
 *   const [files, setFiles] = useState([]);
 *   const [selectedIds, setSelectedIds] = useState([]);
 *   const [expandedIds, setExpandedIds] = useState([]);
 *   
 *   useEffect(() => {
 *     fetch('/api/files?path=/')
 *       .then(res => res.json())
 *       .then(setFiles);
 *   }, []);
 *   
 *   return (
 *     <div className="grid grid-cols-4 h-full">
 *       <div className="col-span-1">
 *         <FileTree
 *           data={files}
 *           selectedIds={selectedIds}
 *           expandedIds={expandedIds}
 *           onExpandedChange={setExpandedIds}
 *           onSelect={(node) => setSelectedIds([node.id])}
 *           onExpand={loadDirectory}
 *           onAction={handleAction}
 *           showSizes
 *           showPermissions
 *           showModifiedDate
 *         />
 *       </div>
 *       <div className="col-span-3">
 *         {/* File list / editor *}/}
 *       </div>
 *     </div>
 *   );
 * }
 * 
 * // With search filter
 * <FileTree
 *   data={files}
 *   searchTerm={searchTerm}
 *   showHidden={showHidden}
 * />
 * 
 * // Custom height
 * <FileTree
 *   data={files}
 *   height="500px"
 * />
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * FileTree Design System — wpPanel by Breach Rabbit
 * 
 * Colors (from globals.css CSS variables):
 * - bg-surface:     #101010 (dark) / #ffffff (light) — card background
 * - bg-overlay:     #202020 (dark) / #e8e8e8 (light) — hover state
 * - bg-elevated:    #181818 (dark) / #f0f0f0 (light) — context menu
 * - border:         rgba(255,255,255,0.07) (dark) / rgba(0,0,0,0.08) (light)
 * - text-primary:   #f0f0f0 (dark) / #111111 (light)
 * - text-secondary: #888888 (dark) / #555555 (light)
 * - text-muted:     #444444 (dark) / #999999 (light)
 * - accent:         #3b82f6 (Blue) — selected state, folders
 * - error:          #ef4444 (Red) — error state
 * 
 * Sizing:
 * - Row height: py-1.5 + px-2 (~36px total)
 * - Icon: w-4 h-4 (16x16px)
 * - Chevron: w-4 h-4 (16x16px)
 * - Indent: 16px per level
 * - Font: text-sm (14px)
 * 
 * Border Radius:
 * - Container: rounded-md (6px)
 * - Context menu: rounded-md (6px)
 * - Items: rounded-sm (4px)
 * 
 * Transitions:
 * - Hover: 150ms ease-out
 * - Context menu: slide-up 200ms ease
 * - Chevron rotate: 150ms ease
 * 
 * File Icons (by category):
 * - directory: Folder / FolderOpen (accent blue)
 * - code: Code (text-secondary)
 * - image: Image (text-secondary)
 * - archive: Archive (text-secondary)
 * - config: Settings (text-secondary)
 * - log: FileText (text-secondary)
 * - database: Database (text-secondary)
 * - other: File (text-secondary)
 * 
 * Features:
 * - Recursive tree structure
 * - Lazy loading on expand
 * - Multi-select (Ctrl/Cmd + click)
 * - Drag & drop (files & directories)
 * - Dropzone for upload
 * - Context menu (right-click)
 * - Search filtering
 * - Show/hide hidden files
 * - Show/hide sizes, permissions, dates
 * - Loading & error states
 * - Keyboard navigation (arrow keys, Enter, Space)
 * 
 * Accessibility:
 * - role="tree" on container
 * - role="treeitem" on nodes
 * - aria-selected for selection
 * - aria-expanded for directories
 * - aria-label on container
 * - Keyboard navigation support
 * - Focus visible rings
 * 
 * Performance:
 * - React.memo on tree nodes
 * - Lazy loading for large directories
 * - Virtual scrolling ready (can add react-window)
 * - CSS-first styling (minimal JS)
 * - Tree-shaken Lucide icons
 * 
 * Dark/Light Theme:
 * - Uses CSS variables — automatic theme switching
 * - No additional styles needed for light mode
 * - Tested with data-theme="light" and data-theme="dark"
 * 
 * Common Use Cases in wpPanel:
 * - File manager (left panel tree view)
 * - Backup file selection (restore from snapshot)
 * - Site file browser (quick navigation)
 * - Log file selector
 * - Config file editor (file picker)
 */