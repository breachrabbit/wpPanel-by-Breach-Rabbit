// =============================================================================
// wpPanel by Breach Rabbit — Files API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// File manager operations (CRUD, upload, download, CHMOD, archive, search)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fileManager } from '@/lib/services/file-manager';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface FilesQuery {
  path?: string;
  page?: string;
  limit?: string;
  sortBy?: 'name' | 'size' | 'date' | 'type';
  sortOrder?: 'asc' | 'desc';
  showHidden?: string;
}

interface FilesBody {
  action: 'create' | 'read' | 'write' | 'delete' | 'move' | 'copy' | 'chmod' | 'archive' | 'extract' | 'search';
  path?: string;
  content?: string;
  targetPath?: string;
  permissions?: string;
  recursive?: boolean;
  overwrite?: boolean;
  format?: 'zip' | 'tar' | 'tar.gz';
  paths?: string[];
  pattern?: string;
  type?: 'file' | 'directory' | 'symlink';
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const FilesQuerySchema = z.object({
  path: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.enum(['name', 'size', 'date', 'type']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  showHidden: z.string().optional(),
});

const FilesBodySchema = z.object({
  action: z.enum(['create', 'read', 'write', 'delete', 'move', 'copy', 'chmod', 'archive', 'extract', 'search']),
  path: z.string().optional(),
  content: z.string().optional(),
  targetPath: z.string().optional(),
  permissions: z.string().regex(/^[0-7]{3,4}$/).optional(),
  recursive: z.boolean().optional(),
  overwrite: z.boolean().optional(),
  format: z.enum(['zip', 'tar', 'tar.gz']).optional(),
  paths: z.array(z.string()).optional(),
  pattern: z.string().optional(),
  type: z.enum(['file', 'directory', 'symlink']).optional(),
});

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/files
 * List directory contents or read file
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const query = request.nextUrl.searchParams;
    const validatedQuery = FilesQuerySchema.parse({
      path: query.get('path') || '/',
      page: query.get('page'),
      limit: query.get('limit'),
      sortBy: query.get('sortBy') as any,
      sortOrder: query.get('sortOrder') as any,
      showHidden: query.get('showHidden'),
    });

    const { path, page, limit, sortBy, sortOrder, showHidden } = validatedQuery;

    // Check if it's a file read request (has 'read' action in query)
    const action = query.get('action');
    
    if (action === 'read') {
      // Read file content
      const fileContent = await fileManager.readFile(path!, {
        limit: 10 * 1024 * 1024, // 10MB limit
      });

      return NextResponse.json({
        success: true,
        data: fileContent,
      });
    } else if (action === 'download') {
      // Download file as stream
      const { stream, info } = await fileManager.downloadAsStream(path!);

      // Create streaming response
      return new NextResponse(stream as any, {
        headers: {
          'Content-Type': info.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${info.name}"`,
          'Content-Length': info.size.toString(),
        },
      });
    } else if (action === 'info') {
      // Get file info
      const fileInfo = await fileManager.getFileInfo(path!);
      
      return NextResponse.json({
        success: true,
        data: fileInfo,
      });
    } else if (action === 'usage') {
      // Get disk usage
      const usage = await fileManager.getDiskUsage(path!);
      
      return NextResponse.json({
        success: true,
        data: usage,
      });
    } else {
      // List directory (default)
      const listing = await fileManager.listDirectory(path!, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 100,
        sortBy,
        sortOrder,
        showHidden: showHidden === 'true',
      });

      return NextResponse.json({
        success: true,
        data: listing,
      });
    }
  } catch (error) {
    console.error('[Files API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Permission denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('not found') || error.message.includes('ENOENT')) {
        return NextResponse.json({ error: 'File or directory not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/files
 * File operations (create, write, delete, move, copy, chmod, archive, extract, search)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate request body
    const validatedBody = FilesBodySchema.parse(body);
    const { action, path, content, targetPath, permissions, recursive, overwrite, format, paths, pattern, type } = validatedBody;

    let result: any;

    switch (action) {
      // =======================================================================
      // CREATE FILE/DIRECTORY
      // =======================================================================
      case 'create':
        if (!path) {
          return NextResponse.json({ error: 'Path is required' }, { status: 400 });
        }

        result = await fileManager.create(
          {
            path,
            content,
            type: type || 'file',
            permissions: permissions || '644',
          },
          userId
        );

        await createAuditLog({
          action: 'CREATE',
          resource: 'file',
          userId,
          metadata: {
            path,
            type: type || 'file',
          },
        });

        break;

      // =======================================================================
      // WRITE FILE
      // =======================================================================
      case 'write':
        if (!path || content === undefined) {
          return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
        }

        result = await fileManager.writeFile(path, content, {
          permissions,
          createDirs: true,
          userId,
        });

        await createAuditLog({
          action: 'UPDATE',
          resource: 'file',
          userId,
          metadata: {
            path,
            action: 'write',
            size: content.length,
          },
        });

        break;

      // =======================================================================
      // DELETE FILE/DIRECTORY
      // =======================================================================
      case 'delete':
        if (!path) {
          return NextResponse.json({ error: 'Path is required' }, { status: 400 });
        }

        await fileManager.delete(path, {
          recursive: recursive || false,
          userId,
        });

        await createAuditLog({
          action: 'DELETE',
          resource: 'file',
          userId,
          metadata: {
            path,
            recursive: recursive || false,
          },
        });

        result = { success: true, path };
        break;

      // =======================================================================
      // MOVE/RENAME FILE
      // =======================================================================
      case 'move':
        if (!path || !targetPath) {
          return NextResponse.json({ error: 'Path and targetPath are required' }, { status: 400 });
        }

        result = await fileManager.move(
          {
            sourcePath: path,
            targetPath,
            overwrite: overwrite || false,
          },
          userId
        );

        await createAuditLog({
          action: 'UPDATE',
          resource: 'file',
          userId,
          metadata: {
            action: 'move',
            source: path,
            target: targetPath,
          },
        });

        break;

      // =======================================================================
      // COPY FILE
      // =======================================================================
      case 'copy':
        if (!path || !targetPath) {
          return NextResponse.json({ error: 'Path and targetPath are required' }, { status: 400 });
        }

        result = await fileManager.copy(path, targetPath, {
          recursive: recursive || true,
          overwrite: overwrite || false,
          userId,
        });

        await createAuditLog({
          action: 'CREATE',
          resource: 'file',
          userId,
          metadata: {
            action: 'copy',
            source: path,
            target: targetPath,
          },
        });

        break;

      // =======================================================================
      // CHMOD
      // =======================================================================
      case 'chmod':
        if (!path || !permissions) {
          return NextResponse.json({ error: 'Path and permissions are required' }, { status: 400 });
        }

        result = await fileManager.chmod(
          {
            path,
            permissions,
            recursive: recursive || false,
          },
          userId
        );

        await createAuditLog({
          action: 'UPDATE',
          resource: 'file',
          userId,
          metadata: {
            path,
            action: 'chmod',
            permissions,
            recursive: recursive || false,
          },
        });

        break;

      // =======================================================================
      // ARCHIVE (CREATE ZIP/TAR)
      // =======================================================================
      case 'archive':
        if (!paths || paths.length === 0 || !targetPath) {
          return NextResponse.json({ error: 'Paths and outputPath are required' }, { status: 400 });
        }

        result = await fileManager.archive(
          {
            paths,
            outputPath: targetPath,
            format: format || 'zip',
          },
          userId
        );

        await createAuditLog({
          action: 'CREATE',
          resource: 'file',
          userId,
          metadata: {
            action: 'archive',
            path: targetPath,
            format: format || 'zip',
            files: paths.length,
            size: result.size,
          },
        });

        break;

      // =======================================================================
      // EXTRACT ARCHIVE
      // =======================================================================
      case 'extract':
        if (!path || !targetPath) {
          return NextResponse.json({ error: 'Archive path and targetPath are required' }, { status: 400 });
        }

        result = await fileManager.extract(
          {
            archivePath: path,
            targetPath,
            overwrite: overwrite || false,
          },
          userId
        );

        await createAuditLog({
          action: 'CREATE',
          resource: 'file',
          userId,
          metadata: {
            action: 'extract',
            archive: path,
            target: targetPath,
            files: result.files,
          },
        });

        break;

      // =======================================================================
      // SEARCH FILES
      // =======================================================================
      case 'search':
        if (!path || !pattern) {
          return NextResponse.json({ error: 'Path and pattern are required' }, { status: 400 });
        }

        result = await fileManager.search(
          {
            path,
            pattern,
            type: type as any,
            limit: 100,
          },
          userId
        );

        break;

      // =======================================================================
      // UNKNOWN ACTION
      // =======================================================================
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Files API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('Permission denied')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('not found') || error.message.includes('ENOENT')) {
        return NextResponse.json({ error: 'File or directory not found' }, { status: 404 });
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes('traversal') || error.message.includes('outside allowed')) {
        return NextResponse.json({ error: 'Access denied: invalid path' }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/files
 * Update file content (alias for write)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { path, content, permissions } = body;

    if (!path || content === undefined) {
      return NextResponse.json({ error: 'Path and content are required' }, { status: 400 });
    }

    const result = await fileManager.writeFile(path, content, {
      permissions,
      userId,
    });

    await createAuditLog({
      action: 'UPDATE',
      resource: 'file',
      userId,
      metadata: {
        path,
        action: 'update',
        size: content.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Files API] PUT error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

/**
 * DELETE /api/files
 * Delete file or directory
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const path = query.get('path');
    const recursive = query.get('recursive') === 'true';

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    await fileManager.delete(path, {
      recursive,
      userId,
    });

    await createAuditLog({
      action: 'DELETE',
      resource: 'file',
      userId,
      metadata: {
        path,
        recursive,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('[Files API] DELETE error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * Files API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/files?action=list&path=/var/www&page=1&limit=100
 * - GET  /api/files?action=read&path=/var/www/file.txt
 * - GET  /api/files?action=download&path=/var/www/file.txt
 * - GET  /api/files?action=info&path=/var/www/file.txt
 * - GET  /api/files?action=usage&path=/var/www
 * - POST /api/files (action: create/write/delete/move/copy/chmod/archive/extract/search)
 * - PUT  /api/files (update file content)
 * - DELETE /api/files?path=/var/www/file.txt
 * 
 * Security:
 * - Authentication required (NextAuth session)
 * - Path traversal prevention (sanitizePath)
 * - Allowed directories only (SERVER_ROOT, BACKUP_ROOT, TEMP_DIR)
 * - Audit logging for all operations
 * - File size limits for reading (10MB default)
 * 
 * Request Examples:
 * 
 * // List directory
 * GET /api/files?action=list&path=/var/www&sortBy=name&sortOrder=asc
 * 
 * // Read file
 * GET /api/files?action=read&path=/var/www/index.php
 * 
 * // Download file
 * GET /api/files?action=download&path=/var/www/backup.zip
 * 
 * // Create file
 * POST /api/files
 * { "action": "create", "path": "/var/www/test.txt", "content": "Hello" }
 * 
 * // Write file
 * POST /api/files
 * { "action": "write", "path": "/var/www/test.txt", "content": "Updated" }
 * 
 * // Delete file
 * POST /api/files
 * { "action": "delete", "path": "/var/www/test.txt", "recursive": true }
 * 
 * // Move file
 * POST /api/files
 * { "action": "move", "path": "/var/www/old.txt", "targetPath": "/var/www/new.txt" }
 * 
 * // Copy file
 * POST /api/files
 * { "action": "copy", "path": "/var/www/file.txt", "targetPath": "/var/www/file-copy.txt" }
 * 
 * // CHMOD
 * POST /api/files
 * { "action": "chmod", "path": "/var/www/script.sh", "permissions": "755" }
 * 
 * // Archive
 * POST /api/files
 * { "action": "archive", "paths": ["/var/www/site1", "/var/www/site2"], "targetPath": "/var/backups/sites.zip", "format": "zip" }
 * 
 * // Extract
 * POST /api/files
 * { "action": "extract", "path": "/var/backups/sites.zip", "targetPath": "/var/www/restored" }
 * 
 * // Search
 * POST /api/files
 * { "action": "search", "path": "/var/www", "pattern": "*.php", "type": "file" }
 */