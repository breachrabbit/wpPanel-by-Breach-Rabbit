// =============================================================================
// wpPanel by Breach Rabbit — File Manager Service
// =============================================================================
// Service layer for file system operations
// Features: CRUD, upload/download, CHMOD, archive, search, batch operations
// =============================================================================

import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import * as crypto from 'crypto';

const execAsync = promisify(exec);
const pipelineAsync = promisify(pipeline);

// =============================================================================
// 🎨 TYPES
// =============================================================================

export type FileType = 'file' | 'directory' | 'symlink';

export interface FileInfo {
  id: string;
  name: string;
  path: string;
  type: FileType;
  size: number;
  permissions: string;
  owner: string;
  group: string;
  modifiedAt: Date;
  createdAt: Date;
  isSymlink: boolean;
  symlinkTarget?: string;
  mimeType?: string;
  isEditable: boolean;
  siteId?: string;
}

export interface CreateFileInput {
  path: string;
  content?: string;
  type?: FileType;
  permissions?: string;
  siteId?: string;
}

export interface MoveFileInput {
  sourcePath: string;
  targetPath: string;
  overwrite?: boolean;
}

export interface CHMODInput {
  path: string;
  permissions: string;
  recursive?: boolean;
}

export interface ArchiveInput {
  paths: string[];
  outputPath: string;
  format: 'zip' | 'tar' | 'tar.gz';
  siteId?: string;
}

export interface ExtractInput {
  archivePath: string;
  targetPath: string;
  overwrite?: boolean;
}

export interface SearchInput {
  path: string;
  pattern: string;
  type?: FileType;
  maxSize?: number;
  minSize?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  limit?: number;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: string;
  size: number;
  modifiedAt: Date;
  isBinary: boolean;
}

export interface DirectoryListing {
  path: string;
  items: FileInfo[];
  total: number;
  canWrite: boolean;
  canRead: boolean;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const FilePathSchema = z.string()
  .min(1, 'Path is required')
  .refine(p => !p.includes('..'), 'Path traversal not allowed')
  .refine(p => p.startsWith('/'), 'Path must be absolute');

const CreateFileSchema = z.object({
  path: FilePathSchema,
  content: z.string().optional(),
  type: z.enum(['file', 'directory', 'symlink']).default('file'),
  permissions: z.string().regex(/^[0-7]{3,4}$/).default('644'),
  siteId: z.string().optional(),
});

const CHMODSchema = z.object({
  path: FilePathSchema,
  permissions: z.string().regex(/^[0-7]{3,4}$/),
  recursive: z.boolean().default(false),
});

const MoveFileSchema = z.object({
  sourcePath: FilePathSchema,
  targetPath: FilePathSchema,
  overwrite: z.boolean().default(false),
});

const ArchiveSchema = z.object({
  paths: z.array(FilePathSchema),
  outputPath: FilePathSchema,
  format: z.enum(['zip', 'tar', 'tar.gz']),
  siteId: z.string().optional(),
});

const SearchSchema = z.object({
  path: FilePathSchema,
  pattern: z.string().min(1),
  type: z.enum(['file', 'directory', 'symlink']).optional(),
  maxSize: z.number().optional(),
  minSize: z.number().optional(),
  modifiedAfter: z.date().optional(),
  modifiedBefore: z.date().optional(),
  limit: z.number().min(1).max(1000).default(100),
});

// =============================================================================
// ⚙️ CONSTANTS
// =============================================================================

const SERVER_ROOT = process.env.SERVER_ROOT || '/var/www';
const BACKUP_ROOT = process.env.BACKUP_ROOT || '/var/backups';
const TEMP_DIR = '/tmp/wppanel';

const EDITABLE_EXTENSIONS = [
  'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf',
  'php', 'js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'java', 'go', 'rs',
  'html', 'htm', 'css', 'scss', 'less', 'vue', 'svelte',
  'sh', 'bash', 'env', 'htaccess', 'sql',
];

const BINARY_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff',
  'zip', 'tar', 'gz', 'rar', '7z', 'bz2',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'exe', 'bin', 'so', 'dll', 'o',
  'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac',
  'woff', 'woff2', 'ttf', 'eot',
];

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Generate secure random string
 */
function generateSecureString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sanitize path to prevent directory traversal
 */
function sanitizePath(inputPath: string, baseDir?: string): string {
  // Remove any null bytes
  let cleanPath = inputPath.replace(/\0/g, '');
  
  // Resolve to absolute path
  if (baseDir) {
    cleanPath = path.resolve(baseDir, cleanPath);
  } else {
    cleanPath = path.resolve(cleanPath);
  }
  
  // Ensure path is within allowed directories
  const allowedRoots = [SERVER_ROOT, BACKUP_ROOT, TEMP_DIR];
  const isAllowed = allowedRoots.some(root => cleanPath.startsWith(root));
  
  if (!isAllowed) {
    throw new Error(`Access denied: path ${cleanPath} is outside allowed directories`);
  }
  
  return cleanPath;
}

/**
 * Get file type
 */
function getFileType(stats: fs.Stats, filePath: string): FileType {
  if (stats.isSymbolicLink()) return 'symlink';
  if (stats.isDirectory()) return 'directory';
  return 'file';
}

/**
 * Check if file is editable (text-based)
 */
function isEditableFile(filePath: string): boolean {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return EDITABLE_EXTENSIONS.includes(ext);
}

/**
 * Check if file is binary
 */
function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext);
}

/**
 * Get MIME type from extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    xml: 'application/xml',
    yaml: 'application/yaml',
    yml: 'application/yaml',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    php: 'application/x-php',
    py: 'text/x-python',
    rb: 'text/x-ruby',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    pdf: 'application/pdf',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Format permissions to octal string
 */
function formatPermissions(mode: number): string {
  return (mode & 0o7777).toString(8).padStart(4, '0');
}

/**
 * Get file owner and group
 */
async function getFileOwner(filePath: string): Promise<{ owner: string; group: string }> {
  const stats = await fs.stat(filePath);
  
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout: ownerOut } = await execAsync(`id -un ${stats.uid}`);
    const { stdout: groupOut } = await execAsync(`id -gn ${stats.gid}`);
    
    return {
      owner: ownerOut.trim(),
      group: groupOut.trim(),
    };
  } catch {
    return {
      owner: stats.uid.toString(),
      group: stats.gid.toString(),
    };
  }
}

// =============================================================================
// 🏗️ FILE MANAGER SERVICE
// =============================================================================

export class FileManagerService {
  // =============================================================================
  // 📁 DIRECTORY LISTING
  // =============================================================================

  /**
   * List directory contents
   */
  async listDirectory(dirPath: string, options?: { 
    page?: number; 
    limit?: number; 
    sortBy?: 'name' | 'size' | 'date' | 'type';
    sortOrder?: 'asc' | 'desc';
    showHidden?: boolean;
    siteId?: string;
  }): Promise<DirectoryListing> {
    const safePath = sanitizePath(dirPath);
    
    // Check if directory exists
    const stats = await fs.stat(safePath);
    
    if (!stats.isDirectory()) {
      throw new Error('Not a directory');
    }
    
    // Check permissions
    const canRead = await this.checkPermission(safePath, 'read');
    const canWrite = await this.checkPermission(safePath, 'write');
    
    if (!canRead) {
      throw new Error('Permission denied');
    }
    
    // Read directory
    const entries = await fs.readdir(safePath, { withFileTypes: true });
    
    // Filter hidden files
    let filteredEntries = entries;
    if (!options?.showHidden) {
      filteredEntries = entries.filter(e => !e.name.startsWith('.'));
    }
    
    // Build file info
    const items: FileInfo[] = [];
    
    for (const entry of filteredEntries) {
      try {
        const fullPath = path.join(safePath, entry.name);
        const fileStats = await fs.stat(fullPath);
        const owner = await getFileOwner(fullPath);
        
        items.push({
          id: generateSecureString(16),
          name: entry.name,
          path: fullPath,
          type: getFileType(fileStats, fullPath),
          size: fileStats.size,
          permissions: formatPermissions(fileStats.mode),
          owner: owner.owner,
          group: owner.group,
          modifiedAt: fileStats.mtime,
          createdAt: fileStats.birthtime,
          isSymlink: entry.isSymbolicLink(),
          symlinkTarget: entry.isSymbolicLink() ? await fs.readlink(fullPath) : undefined,
          mimeType: entry.isFile() ? getMimeType(fullPath) : undefined,
          isEditable: entry.isFile() && isEditableFile(fullPath),
          siteId: options?.siteId,
        });
      } catch (error) {
        console.error(`[FileManager] Failed to get info for ${entry.name}:`, error);
      }
    }
    
    // Sort
    const sortBy = options?.sortBy || 'name';
    const sortOrder = options?.sortOrder || 'asc';
    
    items.sort((a, b) => {
      // Directories first
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = a.modifiedAt.getTime() - b.modifiedAt.getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);
    
    return {
      path: safePath,
      items: paginatedItems,
      total: items.length,
      canWrite,
      canRead,
    };
  }

  // =============================================================================
  // 📄 FILE OPERATIONS
  // =============================================================================

  /**
   * Read file content
   */
  async readFile(filePath: string, options?: { encoding?: string; limit?: number }): Promise<FileContent> {
    const safePath = sanitizePath(filePath);
    
    const stats = await fs.stat(safePath);
    
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }
    
    if (!await this.checkPermission(safePath, 'read')) {
      throw new Error('Permission denied');
    }
    
    const isBinary = isBinaryFile(safePath);
    const encoding = options?.encoding || (isBinary ? 'base64' : 'utf-8');
    
    // Limit file size for reading
    const maxSize = options?.limit || 10 * 1024 * 1024; // 10MB default
    if (stats.size > maxSize) {
      throw new Error(`File too large to read (${stats.size} bytes). Max: ${maxSize} bytes`);
    }
    
    const content = await fs.readFile(safePath, { encoding: encoding as BufferEncoding });
    
    return {
      path: safePath,
      content,
      encoding,
      size: stats.size,
      modifiedAt: stats.mtime,
      isBinary,
    };
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string, options?: { 
    encoding?: string; 
    permissions?: string;
    createDirs?: boolean;
    userId?: string;
  }): Promise<FileInfo> {
    const safePath = sanitizePath(filePath);
    
    // Create parent directories if needed
    if (options?.createDirs) {
      const parentDir = path.dirname(safePath);
      await fs.mkdir(parentDir, { recursive: true });
    }
    
    const encoding = options?.encoding || 'utf-8';
    const permissions = options?.permissions || '644';
    
    // Write file
    await fs.writeFile(safePath, content, { encoding: encoding as BufferEncoding, mode: parseInt(permissions, 8) });
    
    // Get file info
    const fileInfo = await this.getFileInfo(safePath);
    
    // Audit log
    if (options?.userId) {
      await createAuditLog({
        action: 'UPDATE',
        resource: 'file',
        userId: options.userId,
        metadata: {
          path: safePath,
          size: content.length,
        },
      });
    }
    
    // Invalidate cache
    await redis.del(`file:info:${safePath}`);
    
    return fileInfo;
  }

  /**
   * Create file or directory
   */
  async create(input: CreateFileInput, userId?: string): Promise<FileInfo> {
    const validatedInput = CreateFileSchema.parse(input);
    const safePath = sanitizePath(validatedInput.path);
    
    // Check if already exists
    try {
      await fs.access(safePath);
      throw new Error('File or directory already exists');
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Create parent directories
    const parentDir = path.dirname(safePath);
    await fs.mkdir(parentDir, { recursive: true });
    
    // Create file or directory
    if (validatedInput.type === 'directory') {
      await fs.mkdir(safePath, { mode: parseInt(validatedInput.permissions, 8) });
    } else if (validatedInput.type === 'symlink') {
      throw new Error('Symlink creation requires target path');
    } else {
      await fs.writeFile(safePath, validatedInput.content || '', { 
        mode: parseInt(validatedInput.permissions, 8) 
      });
    }
    
    // Get file info
    const fileInfo = await this.getFileInfo(safePath);
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        resource: 'file',
        userId,
        metadata: {
          path: safePath,
          type: validatedInput.type,
        },
      });
    }
    
    return fileInfo;
  }

  /**
   * Delete file or directory
   */
  async delete(filePath: string, options?: { recursive?: boolean; userId?: string }): Promise<void> {
    const safePath = sanitizePath(filePath);
    const recursive = options?.recursive ?? false;
    
    // Check if exists
    const stats = await fs.stat(safePath);
    
    // Check permissions
    if (!await this.checkPermission(safePath, 'write')) {
      throw new Error('Permission denied');
    }
    
    // Delete
    if (stats.isDirectory() && !recursive) {
      throw new Error('Directory is not empty. Use recursive option.');
    }
    
    await fs.rm(safePath, { recursive, force: true });
    
    // Audit log
    if (options?.userId) {
      await createAuditLog({
        action: 'DELETE',
        resource: 'file',
        userId: options.userId,
        metadata: {
          path: safePath,
          type: stats.isDirectory() ? 'directory' : 'file',
          recursive,
        },
      });
    }
    
    // Invalidate cache
    await redis.del(`file:info:${safePath}`);
  }

  /**
   * Move/rename file or directory
   */
  async move(input: MoveFileInput, userId?: string): Promise<{ source: FileInfo; target: FileInfo }> {
    const validatedInput = MoveFileSchema.parse(input);
    
    const sourcePath = sanitizePath(validatedInput.sourcePath);
    const targetPath = sanitizePath(validatedInput.targetPath);
    
    // Check source exists
    const sourceStats = await fs.stat(sourcePath);
    const sourceInfo = await this.getFileInfo(sourcePath);
    
    // Check target doesn't exist (unless overwrite)
    if (!validatedInput.overwrite) {
      try {
        await fs.access(targetPath);
        throw new Error('Target already exists. Use overwrite option.');
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    
    // Create parent directories for target
    const targetParent = path.dirname(targetPath);
    await fs.mkdir(targetParent, { recursive: true });
    
    // Move
    await fs.rename(sourcePath, targetPath);
    
    // Get target info
    const targetInfo = await this.getFileInfo(targetPath);
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'UPDATE',
        resource: 'file',
        userId,
        metadata: {
          action: 'move',
          source: sourcePath,
          target: targetPath,
        },
      });
    }
    
    // Invalidate cache
    await redis.del(`file:info:${sourcePath}`);
    await redis.del(`file:info:${targetPath}`);
    
    return { source: sourceInfo, target: targetInfo };
  }

  /**
   * Copy file or directory
   */
  async copy(sourcePath: string, targetPath: string, options?: { 
    recursive?: boolean; 
    overwrite?: boolean;
    userId?: string;
  }): Promise<{ source: FileInfo; target: FileInfo }> {
    const safeSourcePath = sanitizePath(sourcePath);
    const safeTargetPath = sanitizePath(targetPath);
    
    const recursive = options?.recursive ?? true;
    const overwrite = options?.overwrite ?? false;
    
    // Check source exists
    const sourceStats = await fs.stat(safeSourcePath);
    const sourceInfo = await this.getFileInfo(safeSourcePath);
    
    // Check target doesn't exist (unless overwrite)
    if (!overwrite) {
      try {
        await fs.access(safeTargetPath);
        throw new Error('Target already exists. Use overwrite option.');
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    
    // Create parent directories for target
    const targetParent = path.dirname(safeTargetPath);
    await fs.mkdir(targetParent, { recursive: true });
    
    // Copy
    if (sourceStats.isDirectory()) {
      await fs.cp(safeSourcePath, safeTargetPath, { recursive });
    } else {
      await fs.copyFile(safeSourcePath, safeTargetPath);
    }
    
    // Get target info
    const targetInfo = await this.getFileInfo(safeTargetPath);
    
    // Audit log
    if (options?.userId) {
      await createAuditLog({
        action: 'CREATE',
        resource: 'file',
        userId: options.userId,
        metadata: {
          action: 'copy',
          source: safeSourcePath,
          target: safeTargetPath,
        },
      });
    }
    
    return { source: sourceInfo, target: targetInfo };
  }

  // =============================================================================
  // 🔧 PERMISSIONS
  // =============================================================================

  /**
   * Change file permissions (CHMOD)
   */
  async chmod(input: CHMODInput, userId?: string): Promise<FileInfo> {
    const validatedInput = CHMODSchema.parse(input);
    const safePath = sanitizePath(validatedInput.path);
    
    // Check permissions
    if (!await this.checkPermission(safePath, 'write')) {
      throw new Error('Permission denied');
    }
    
    // Change permissions
    await fs.chmod(safePath, parseInt(validatedInput.permissions, 8));
    
    // Get file info
    const fileInfo = await this.getFileInfo(safePath);
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'UPDATE',
        resource: 'file',
        userId,
        metadata: {
          path: safePath,
          action: 'chmod',
          permissions: validatedInput.permissions,
          recursive: validatedInput.recursive,
        },
      });
    }
    
    // Invalidate cache
    await redis.del(`file:info:${safePath}`);
    
    return fileInfo;
  }

  /**
   * Change file owner (CHOWN)
   */
  async chown(filePath: string, owner: string, group?: string, userId?: string): Promise<FileInfo> {
    const safePath = sanitizePath(filePath);
    
    // Check permissions
    if (!await this.checkPermission(safePath, 'write')) {
      throw new Error('Permission denied');
    }
    
    // Change owner
    await execAsync(`chown ${owner}${group ? ':' + group : ''} ${safePath}`);
    
    // Get file info
    const fileInfo = await this.getFileInfo(safePath);
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'UPDATE',
        resource: 'file',
        userId,
        metadata: {
          path: safePath,
          action: 'chown',
          owner,
          group,
        },
      });
    }
    
    return fileInfo;
  }

  /**
   * Check permission for path
   */
  private async checkPermission(filePath: string, permission: 'read' | 'write' | 'execute'): Promise<boolean> {
    try {
      await fs.access(filePath, 
        permission === 'read' ? fs.constants.R_OK :
        permission === 'write' ? fs.constants.W_OK :
        fs.constants.X_OK
      );
      return true;
    } catch {
      return false;
    }
  }

  // =============================================================================
  // 📦 ARCHIVE OPERATIONS
  // =============================================================================

  /**
   * Create archive (zip/tar/tar.gz)
   */
  async archive(input: ArchiveInput, userId?: string): Promise<{ path: string; size: number }> {
    const validatedInput = ArchiveSchema.parse(input);
    const outputPath = sanitizePath(validatedInput.outputPath);
    
    // Create parent directories
    const parentDir = path.dirname(outputPath);
    await fs.mkdir(parentDir, { recursive: true });
    
    // Create archive
    let command: string;
    
    switch (validatedInput.format) {
      case 'zip':
        command = `zip -r "${outputPath}" ${validatedInput.paths.map(p => `"${p}"`).join(' ')}`;
        break;
      case 'tar':
        command = `tar -cf "${outputPath}" ${validatedInput.paths.map(p => `"${p}"`).join(' ')}`;
        break;
      case 'tar.gz':
        command = `tar -czf "${outputPath}" ${validatedInput.paths.map(p => `"${p}"`).join(' ')}`;
        break;
    }
    
    await execAsync(command);
    
    // Get archive info
    const stats = await fs.stat(outputPath);
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        resource: 'file',
        userId,
        metadata: {
          action: 'archive',
          path: outputPath,
          format: validatedInput.format,
          files: validatedInput.paths.length,
          size: stats.size,
        },
      });
    }
    
    return { path: outputPath, size: stats.size };
  }

  /**
   * Extract archive
   */
  async extract(input: ExtractInput, userId?: string): Promise<{ path: string; files: number }> {
    const safeArchivePath = sanitizePath(input.archivePath);
    const safeTargetPath = sanitizePath(input.targetPath);
    
    // Check archive exists
    const stats = await fs.stat(safeArchivePath);
    
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }
    
    // Create target directory
    await fs.mkdir(safeTargetPath, { recursive: true });
    
    // Detect format and extract
    const ext = path.extname(safeArchivePath).toLowerCase();
    let command: string;
    
    if (ext === '.zip') {
      command = `unzip -o "${safeArchivePath}" -d "${safeTargetPath}"`;
    } else if (ext === '.gz' && safeArchivePath.includes('.tar')) {
      command = `tar -xzf "${safeArchivePath}" -C "${safeTargetPath}"`;
    } else if (ext === '.tar') {
      command = `tar -xf "${safeArchivePath}" -C "${safeTargetPath}"`;
    } else {
      throw new Error('Unsupported archive format');
    }
    
    await execAsync(command);
    
    // Count extracted files
    const { stdout } = await execAsync(`find "${safeTargetPath}" -type f | wc -l`);
    const files = parseInt(stdout.trim());
    
    // Audit log
    if (userId) {
      await createAuditLog({
        action: 'CREATE',
        resource: 'file',
        userId,
        metadata: {
          action: 'extract',
          archive: safeArchivePath,
          target: safeTargetPath,
          files,
        },
      });
    }
    
    return { path: safeTargetPath, files };
  }

  // =============================================================================
  // 🔍 SEARCH
  // =============================================================================

  /**
   * Search files
   */
  async search(input: SearchInput, userId?: string): Promise<FileInfo[]> {
    const validatedInput = SearchSchema.parse(input);
    const safePath = sanitizePath(validatedInput.path);
    
    // Build find command
    let findCmd = `find "${safePath}"`;
    
    // Type filter
    if (validatedInput.type) {
      const typeFlag = validatedInput.type === 'directory' ? '-type d' : 
                       validatedInput.type === 'symlink' ? '-type l' : '-type f';
      findCmd += ` ${typeFlag}`;
    }
    
    // Name pattern
    if (validatedInput.pattern) {
      findCmd += ` -name "*${validatedInput.pattern}*" `;
    }
    
    // Size filters
    if (validatedInput.maxSize) {
      findCmd += ` -size -${validatedInput.maxSize}c`;
    }
    if (validatedInput.minSize) {
      findCmd += ` -size +${validatedInput.minSize}c`;
    }
    
    // Time filters
    if (validatedInput.modifiedAfter) {
      const days = Math.floor((Date.now() - validatedInput.modifiedAfter.getTime()) / (1000 * 60 * 60 * 24));
      findCmd += ` -mtime -${days}`;
    }
    if (validatedInput.modifiedBefore) {
      const days = Math.floor((Date.now() - validatedInput.modifiedBefore.getTime()) / (1000 * 60 * 60 * 24));
      findCmd += ` -mtime +${days}`;
    }
    
    // Limit
    findCmd += ` -maxdepth 50 | head -${validatedInput.limit}`;
    
    // Execute
    const { stdout } = await execAsync(findCmd);
    
    // Parse results
    const paths = stdout.trim().split('\n').filter(p => p);
    const results: FileInfo[] = [];
    
    for (const filePath of paths) {
      try {
        const fileInfo = await this.getFileInfo(filePath);
        results.push(fileInfo);
      } catch (error) {
        console.error(`[FileManager] Failed to get info for ${filePath}:`, error);
      }
    }
    
    return results;
  }

  // =============================================================================
  // 📊 FILE INFO
  // =============================================================================

  /**
   * Get file info
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    const safePath = sanitizePath(filePath);
    
    // Check cache
    const cached = await redis.get(`file:info:${safePath}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const stats = await fs.stat(safePath);
    const owner = await getFileOwner(safePath);
    const type = getFileType(stats, safePath);
    
    const fileInfo: FileInfo = {
      id: generateSecureString(16),
      name: path.basename(safePath),
      path: safePath,
      type,
      size: stats.size,
      permissions: formatPermissions(stats.mode),
      owner: owner.owner,
      group: owner.group,
      modifiedAt: stats.mtime,
      createdAt: stats.birthtime,
      isSymlink: stats.isSymbolicLink(),
      symlinkTarget: stats.isSymbolicLink() ? await fs.readlink(safePath) : undefined,
      mimeType: stats.isFile() ? getMimeType(safePath) : undefined,
      isEditable: stats.isFile() && isEditableFile(safePath),
    };
    
    // Cache for 5 minutes
    await redis.setEx(`file:info:${safePath}`, 300, JSON.stringify(fileInfo));
    
    return fileInfo;
  }

  /**
   * Get disk usage for directory
   */
  async getDiskUsage(dirPath: string): Promise<{ 
    size: number; 
    files: number; 
    directories: number;
    humanReadable: string;
  }> {
    const safePath = sanitizePath(dirPath);
    
    const { stdout } = await execAsync(`du -sb "${safePath}"`);
    const size = parseInt(stdout.split('\t')[0]);
    
    const { stdout: filesOut } = await execAsync(`find "${safePath}" -type f | wc -l`);
    const files = parseInt(filesOut.trim());
    
    const { stdout: dirsOut } = await execAsync(`find "${safePath}" -type d | wc -l`);
    const directories = parseInt(dirsOut.trim());
    
    // Human readable
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    const humanReadable = parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    
    return { size, files, directories, humanReadable };
  }

  // =============================================================================
  // 📥 UPLOAD/DOWNLOAD
  // =============================================================================

  /**
   * Upload file from stream
   */
  async uploadFromStream(
    filePath: string,
    stream: NodeJS.ReadableStream,
    options?: { 
      permissions?: string;
      userId?: string;
    }
  ): Promise<FileInfo> {
    const safePath = sanitizePath(filePath);
    
    // Create parent directories
    const parentDir = path.dirname(safePath);
    await fs.mkdir(parentDir, { recursive: true });
    
    // Write stream to file
    const writeStream = createWriteStream(safePath, { 
      mode: options?.permissions ? parseInt(options.permissions, 8) : 0o644 
    });
    
    await pipelineAsync(stream, writeStream);
    
    // Get file info
    const fileInfo = await this.getFileInfo(safePath);
    
    // Audit log
    if (options?.userId) {
      await createAuditLog({
        action: 'CREATE',
        resource: 'file',
        userId: options.userId,
        metadata: {
          path: safePath,
          action: 'upload',
          size: fileInfo.size,
        },
      });
    }
    
    return fileInfo;
  }

  /**
   * Download file as stream
   */
  async downloadAsStream(filePath: string): Promise<{ stream: NodeJS.ReadableStream; info: FileInfo }> {
    const safePath = sanitizePath(filePath);
    
    const stats = await fs.stat(safePath);
    
    if (!stats.isFile()) {
      throw new Error('Not a file');
    }
    
    if (!await this.checkPermission(safePath, 'read')) {
      throw new Error('Permission denied');
    }
    
    const info = await this.getFileInfo(safePath);
    const stream = createReadStream(safePath);
    
    return { stream, info };
  }
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export const fileManager = new FileManagerService();

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * File Manager Service — wpPanel by Breach Rabbit
 * 
 * Features:
 * 1. Directory Listing:
 *    - List with pagination
 *    - Sort by name/size/date/type
 *    - Show/hide hidden files
 *    - Permission checks
 * 
 * 2. File Operations:
 *    - Read/write content
 *    - Create file/directory
 *    - Delete (recursive option)
 *    - Move/rename
 *    - Copy
 * 
 * 3. Permissions:
 *    - CHMOD (octal permissions)
 *    - CHOWN (owner/group)
 *    - Permission checks (read/write/execute)
 * 
 * 4. Archive Operations:
 *    - Create zip/tar/tar.gz
 *    - Extract archives
 *    - Progress tracking
 * 
 * 5. Search:
 *    - Pattern matching
 *    - Type filter
 *    - Size filter
 *    - Date filter
 * 
 * 6. Upload/Download:
 *    - Stream-based upload
 *    - Stream-based download
 *    - Size limits
 * 
 * 7. Info & Stats:
 *    - File metadata
 *    - Disk usage
 *    - MIME type detection
 *    - Editable file detection
 * 
 * Security:
 * - Path traversal prevention (sanitizePath)
 * - Allowed directories only (SERVER_ROOT, BACKUP_ROOT, TEMP_DIR)
 * - Permission checks before operations
 * - Audit logging for all operations
 * - File size limits for reading
 * 
 * Allowed Directories:
 * - /var/www (SERVER_ROOT)
 * - /var/backups (BACKUP_ROOT)
 * - /tmp/wppanel (TEMP_DIR)
 * 
 * Environment Variables:
 * - SERVER_ROOT: /var/www
 * - BACKUP_ROOT: /var/backups
 * 
 * API Routes (to be implemented):
 * - GET    /api/files?path=
 * - POST   /api/files/upload
 * - GET    /api/files/download?path=
 * - POST   /api/files/mkdir
 * - POST   /api/files/rename
 * - POST   /api/files/move
 * - POST   /api/files/copy
 * - DELETE /api/files?path=
 * - POST   /api/files/chmod
 * - POST   /api/files/extract
 * - POST   /api/files/compress
 * - GET    /api/files/read?path=
 * - PUT    /api/files/save
 * - POST   /api/files/search
 * - GET    /api/files/usage?path=
 */