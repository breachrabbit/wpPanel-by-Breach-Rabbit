// =============================================================================
// wpPanel by Breach Rabbit — WP Toolkit API Endpoint
// =============================================================================
// Next.js 16.1 — App Router API Route
// WordPress management (install, plugins, themes, updates, security)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createWPCLIWrapper } from '@/lib/integrations/wp-cli-wrapper';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// =============================================================================
// 🎨 TYPES
// =============================================================================

interface WPQuery {
  action?: 'list' | 'info' | 'plugins' | 'themes' | 'security';
  siteId?: string;
}

interface WPBody {
  action?: 'install' | 'update' | 'plugin_install' | 'plugin_activate' | 'plugin_deactivate' | 'plugin_delete' | 'plugin_update_all' | 'theme_activate' | 'theme_delete' | 'reset_password' | 'maintenance' | 'security_harden' | 'security_scan' | 'clone';
  siteId?: string;
  // Install
  url?: string;
  title?: string;
  adminUser?: string;
  adminPassword?: string;
  adminEmail?: string;
  language?: string;
  // Plugins
  pluginSlug?: string;
  // Themes
  themeSlug?: string;
  // Maintenance
  enable?: boolean;
  // Security
  changeAdminUrl?: string;
  disableXmlrpc?: boolean;
}

// =============================================================================
// ⚙️ VALIDATION SCHEMAS
// =============================================================================

const WPQuerySchema = z.object({
  action: z.enum(['list', 'info', 'plugins', 'themes', 'security']).optional(),
  siteId: z.string().optional(),
});

const WPInstallSchema = z.object({
  url: z.string().url(),
  title: z.string().min(2).max(100),
  adminUser: z.string().min(4).max(50),
  adminPassword: z.string().min(8),
  adminEmail: z.string().email(),
  language: z.string().default('en_US'),
  autoPlugins: z.array(z.string()).default(['litespeed-cache', 'redis-object-cache', 'wordfence']),
});

const WPPluginSchema = z.object({
  slug: z.string(),
  activate: z.boolean().optional(),
});

const WPSecuritySchema = z.object({
  changeAdminUrl: z.string().optional(),
  disableXmlrpc: z.boolean().optional(),
  hideVersion: z.boolean().optional(),
  forceHttps: z.boolean().optional(),
});

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Get WP-CLI wrapper for site
 */
function getWPCLI(wpPath: string) {
  return createWPCLIWrapper({
    wpPath,
    allowRoot: true,
    timeout: 300000, // 5 minutes
  });
}

/**
 * Get default plugins for new WordPress install
 */
function getDefaultPlugins(): string[] {
  return ['litespeed-cache', 'redis-object-cache', 'wordfence'];
}

// =============================================================================
// 🛣️ API ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/wp
 * List WordPress installations or get WP info
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const query = request.nextUrl.searchParams;
    const validatedQuery = WPQuerySchema.parse({
      action: query.get('action') || 'list',
      siteId: query.get('siteId'),
    });

    const { action, siteId } = validatedQuery;

    let result: any;

    switch (action) {
      // =======================================================================
      // LIST ALL WORDPRESS INSTALLATIONS
      // =======================================================================
      case 'list':
        const wpInstances = await prisma.wordPressInstance.findMany({
          where: {
            site: {
              userId,
            },
          },
          include: {
            site: {
              select: {
                id: true,
                name: true,
                domain: true,
              },
            },
            plugins: true,
            themes: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        result = wpInstances;
        break;

      // =======================================================================
      // GET WP INSTANCE INFO
      // =======================================================================
      case 'info':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const wpInstance = await prisma.wordPressInstance.findFirst({
          where: { siteId },
          include: {
            site: true,
            plugins: true,
            themes: true,
          },
        });

        if (!wpInstance) {
          return NextResponse.json({ error: 'WordPress instance not found' }, { status: 404 });
        }

        // Get live info from WP-CLI
        const site = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (site) {
          const wp = getWPCLI(site.rootPath);
          
          try {
            const wpInfo = await wp.getWpInfo();
            const phpInfo = await wp.getPhpInfo();
            const healthStatus = await wp.getSiteHealth();

            result = {
              ...wpInstance,
              liveInfo: {
                ...wpInfo,
                php: phpInfo,
                health: healthStatus,
              },
            };
          } catch {
            result = wpInstance;
          }
        } else {
          result = wpInstance;
        }
        break;

      // =======================================================================
      // GET PLUGINS LIST
      // =======================================================================
      case 'plugins':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const sitePlugins = await prisma.site.findUnique({
          where: { id: siteId },
          include: {
            wordpressInstance: {
              include: {
                plugins: true,
              },
            },
          },
        });

        if (!sitePlugins?.wordpressInstance) {
          return NextResponse.json({ error: 'WordPress instance not found' }, { status: 404 });
        }

        // Get live plugins list from WP-CLI
        const wpPlugins = getWPCLI(sitePlugins.rootPath);
        
        try {
          const livePlugins = await wpPlugins.listPlugins();
          result = {
            instanceId: sitePlugins.wordpressInstance.id,
            plugins: livePlugins,
          };
        } catch {
          result = {
            instanceId: sitePlugins.wordpressInstance.id,
            plugins: sitePlugins.wordpressInstance.plugins,
          };
        }
        break;

      // =======================================================================
      // GET THEMES LIST
      // =======================================================================
      case 'themes':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const siteThemes = await prisma.site.findUnique({
          where: { id: siteId },
          include: {
            wordpressInstance: {
              include: {
                themes: true,
              },
            },
          },
        });

        if (!siteThemes?.wordpressInstance) {
          return NextResponse.json({ error: 'WordPress instance not found' }, { status: 404 });
        }

        // Get live themes list from WP-CLI
        const wpThemes = getWPCLI(siteThemes.rootPath);
        
        try {
          const liveThemes = await wpThemes.listThemes();
          result = {
            instanceId: siteThemes.wordpressInstance.id,
            themes: liveThemes,
          };
        } catch {
          result = {
            instanceId: siteThemes.wordpressInstance.id,
            themes: siteThemes.wordpressInstance.themes,
          };
        }
        break;

      // =======================================================================
      // GET SECURITY SCAN
      // =======================================================================
      case 'security':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const siteSecurity = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!siteSecurity) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpSecurity = getWPCLI(siteSecurity.rootPath);
        const scan = await wpSecurity.securityScan();

        // Update instance security score
        await prisma.wordPressInstance.updateMany({
          where: { siteId },
          data: {
            securityScore: scan.score,
            lastScanAt: new Date(),
          },
        });

        result = scan;
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
    console.error('[WP API] GET error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wp
 * WordPress operations (install, plugins, themes, updates, security)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, siteId, ...data } = body;

    let result: any;

    switch (action) {
      // =======================================================================
      // INSTALL WORDPRESS
      // =======================================================================
      case 'install':
        const validatedInstall = WPInstallSchema.parse(data);

        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const site = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!site) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wp = getWPCLI(site.rootPath);

        // Full installation
        const installResult = await wp.fullInstall({
          url: validatedInstall.url,
          title: validatedInstall.title,
          adminUser: validatedInstall.adminUser,
          adminPassword: validatedInstall.adminPassword,
          adminEmail: validatedInstall.adminEmail,
          language: validatedInstall.language,
        });

        // Install default plugins
        const installedPlugins: string[] = [];
        for (const plugin of validatedInstall.autoPlugins) {
          try {
            await wp.installPlugin(plugin, true);
            installedPlugins.push(plugin);
          } catch {
            console.error(`Failed to install plugin: ${plugin}`);
          }
        }

        // Create database record
        const wpInstance = await prisma.wordPressInstance.create({
          data: {
            id: `wp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            siteId,
            version: 'latest',
            adminUser: validatedInstall.adminUser,
            adminEmail: validatedInstall.adminEmail,
            language: validatedInstall.language,
            autoUpdateCore: true,
            autoUpdatePlugins: false,
            autoUpdateThemes: false,
            plugins: {
              create: installedPlugins.map(slug => ({
                slug,
                name: slug,
                version: 'latest',
                status: 'active',
              })),
            },
          },
        });

        await createAuditLog({
          action: 'CREATE',
          resource: 'wordpress_instance',
          userId,
          metadata: {
            wpId: wpInstance.id,
            siteId,
            domain: site.domain,
            plugins: installedPlugins,
          },
        });

        result = {
          success: true,
          ...installResult,
          wpId: wpInstance.id,
          installedPlugins,
        };
        break;

      // =======================================================================
      // UPDATE WORDPRESS CORE
      // =======================================================================
      case 'update':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const updateSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!updateSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpUpdate = getWPCLI(updateSite.rootPath);
        const updateResult = await wpUpdate.updateCore();

        await prisma.wordPressInstance.updateMany({
          where: { siteId },
          data: {
            version: updateResult.newVersion,
            updatedAt: new Date(),
          },
        });

        await createAuditLog({
          action: 'UPDATE',
          resource: 'wordpress_instance',
          userId,
          metadata: {
            siteId,
            action: 'core_updated',
            previousVersion: updateResult.previousVersion,
            newVersion: updateResult.newVersion,
          },
        });

        result = updateResult;
        break;

      // =======================================================================
      // INSTALL PLUGIN
      // =======================================================================
      case 'plugin_install':
        if (!siteId || !data.pluginSlug) {
          return NextResponse.json({ error: 'siteId and pluginSlug are required' }, { status: 400 });
        }

        const pluginSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!pluginSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpPlugin = getWPCLI(pluginSite.rootPath);
        await wpPlugin.installPlugin(data.pluginSlug, data.activate ?? true);

        // Update database
        const wpInst = await prisma.wordPressInstance.findFirst({
          where: { siteId },
        });

        if (wpInst) {
          await prisma.wPPlugin.upsert({
            where: {
              wpId_slug: {
                wpId: wpInst.id,
                slug: data.pluginSlug,
              },
            },
            update: {
              status: data.activate ? 'active' : 'inactive',
            },
            create: {
              wpId: wpInst.id,
              slug: data.pluginSlug,
              name: data.pluginSlug,
              version: 'latest',
              status: data.activate ? 'active' : 'inactive',
            },
          });
        }

        await createAuditLog({
          action: 'CREATE',
          resource: 'wordpress_plugin',
          userId,
          metadata: {
            siteId,
            plugin: data.pluginSlug,
          },
        });

        result = { success: true, plugin: data.pluginSlug };
        break;

      // =======================================================================
      // ACTIVATE PLUGIN
      // =======================================================================
      case 'plugin_activate':
        if (!siteId || !data.pluginSlug) {
          return NextResponse.json({ error: 'siteId and pluginSlug are required' }, { status: 400 });
        }

        const activateSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!activateSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpActivate = getWPCLI(activateSite.rootPath);
        await wpActivate.activatePlugin(data.pluginSlug);

        await prisma.wPPlugin.updateMany({
          where: {
            wp: { siteId },
            slug: data.pluginSlug,
          },
          data: { status: 'active' },
        });

        result = { success: true, plugin: data.pluginSlug };
        break;

      // =======================================================================
      // DEACTIVATE PLUGIN
      // =======================================================================
      case 'plugin_deactivate':
        if (!siteId || !data.pluginSlug) {
          return NextResponse.json({ error: 'siteId and pluginSlug are required' }, { status: 400 });
        }

        const deactivateSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!deactivateSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpDeactivate = getWPCLI(deactivateSite.rootPath);
        await wpDeactivate.deactivatePlugin(data.pluginSlug);

        await prisma.wPPlugin.updateMany({
          where: {
            wp: { siteId },
            slug: data.pluginSlug,
          },
          data: { status: 'inactive' },
        });

        result = { success: true, plugin: data.pluginSlug };
        break;

      // =======================================================================
      // DELETE PLUGIN
      // =======================================================================
      case 'plugin_delete':
        if (!siteId || !data.pluginSlug) {
          return NextResponse.json({ error: 'siteId and pluginSlug are required' }, { status: 400 });
        }

        const deleteSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!deleteSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpDelete = getWPCLI(deleteSite.rootPath);
        await wpDelete.deletePlugin(data.pluginSlug);

        await prisma.wPPlugin.deleteMany({
          where: {
            wp: { siteId },
            slug: data.pluginSlug,
          },
        });

        await createAuditLog({
          action: 'DELETE',
          resource: 'wordpress_plugin',
          userId,
          metadata: {
            siteId,
            plugin: data.pluginSlug,
          },
        });

        result = { success: true, plugin: data.pluginSlug };
        break;

      // =======================================================================
      // UPDATE ALL PLUGINS
      // =======================================================================
      case 'plugin_update_all':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const updateAllSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!updateAllSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpUpdateAll = getWPCLI(updateAllSite.rootPath);
        const updatedPlugins = await wpUpdateAll.updateAllPlugins();

        await createAuditLog({
          action: 'UPDATE',
          resource: 'wordpress_plugins',
          userId,
          metadata: {
            siteId,
            action: 'bulk_update',
            count: updatedPlugins.length,
          },
        });

        result = { success: true, updated: updatedPlugins };
        break;

      // =======================================================================
      // ACTIVATE THEME
      // =======================================================================
      case 'theme_activate':
        if (!siteId || !data.themeSlug) {
          return NextResponse.json({ error: 'siteId and themeSlug are required' }, { status: 400 });
        }

        const themeSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!themeSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpTheme = getWPCLI(themeSite.rootPath);
        await wpTheme.activateTheme(data.themeSlug);

        await prisma.wPTheme.updateMany({
          where: {
            wp: { siteId },
          },
          data: { isActive: false },
        });

        await prisma.wPTheme.updateMany({
          where: {
            wp: { siteId },
            slug: data.themeSlug,
          },
          data: { isActive: true },
        });

        result = { success: true, theme: data.themeSlug };
        break;

      // =======================================================================
      // DELETE THEME
      // =======================================================================
      case 'theme_delete':
        if (!siteId || !data.themeSlug) {
          return NextResponse.json({ error: 'siteId and themeSlug are required' }, { status: 400 });
        }

        const deleteThemeSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!deleteThemeSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpDeleteTheme = getWPCLI(deleteThemeSite.rootPath);
        await wpDeleteTheme.deleteTheme(data.themeSlug);

        await prisma.wPTheme.deleteMany({
          where: {
            wp: { siteId },
            slug: data.themeSlug,
          },
        });

        result = { success: true, theme: data.themeSlug };
        break;

      // =======================================================================
      // RESET ADMIN PASSWORD
      // =======================================================================
      case 'reset_password':
        if (!siteId || !data.newPassword) {
          return NextResponse.json({ error: 'siteId and newPassword are required' }, { status: 400 });
        }

        const resetSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!resetSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpReset = getWPCLI(resetSite.rootPath);
        const adminUser = data.adminUser || 'admin';
        
        await wpReset.exec([
          'user',
          'update',
          adminUser,
          `--user_pass=${data.newPassword}`,
        ]);

        await createAuditLog({
          action: 'UPDATE',
          resource: 'wordpress_instance',
          userId,
          metadata: {
            siteId,
            action: 'password_reset',
            adminUser,
          },
        });

        result = { success: true, message: 'Password reset successfully' };
        break;

      // =======================================================================
      // MAINTENANCE MODE
      // =======================================================================
      case 'maintenance':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const maintSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!maintSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpMaint = getWPCLI(maintSite.rootPath);
        
        if (data.enable) {
          await wpMaint.enableMaintenance();
        } else {
          await wpMaint.disableMaintenance();
        }

        const isMaint = await wpMaint.getMaintenanceStatus();

        result = { success: true, enabled: isMaint };
        break;

      // =======================================================================
      // SECURITY HARDEN
      // =======================================================================
      case 'security_harden':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const hardenSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!hardenSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpHarden = getWPCLI(hardenSite.rootPath);
        const hardenResults = await wpHarden.hardenSecurity();

        // Optional: change admin URL
        if (data.changeAdminUrl) {
          try {
            await wpHarden.changeAdminUrl(data.changeAdminUrl);
            hardenResults.push({ action: 'Change admin URL', success: true });
          } catch {
            hardenResults.push({ action: 'Change admin URL', success: false });
          }
        }

        await createAuditLog({
          action: 'UPDATE',
          resource: 'wordpress_instance',
          userId,
          metadata: {
            siteId,
            action: 'security_hardened',
            results: hardenResults,
          },
        });

        result = { success: true, actions: hardenResults };
        break;

      // =======================================================================
      // SECURITY SCAN
      // =======================================================================
      case 'security_scan':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
        }

        const scanSite = await prisma.site.findUnique({
          where: { id: siteId },
        });

        if (!scanSite) {
          return NextResponse.json({ error: 'Site not found' }, { status: 404 });
        }

        const wpScan = getWPCLI(scanSite.rootPath);
        const scan = await wpScan.securityScan();

        await prisma.wordPressInstance.updateMany({
          where: { siteId },
          data: {
            securityScore: scan.score,
            lastScanAt: new Date(),
          },
        });

        result = scan;
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
    console.error('[WP API] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 📝 NOTES
// =============================================================================

/**
 * WP Toolkit API — wpPanel by Breach Rabbit
 * 
 * Endpoints:
 * - GET  /api/wp?action=list
 * - GET  /api/wp?action=info&siteId=:id
 * - GET  /api/wp?action=plugins&siteId=:id
 * - GET  /api/wp?action=themes&siteId=:id
 * - GET  /api/wp?action=security&siteId=:id
 * - POST /api/wp (action: install/update/plugin_*/theme_*/reset_password/maintenance/security_*)
 * 
 * Request Examples:
 * 
 * // List all WordPress installations
 * GET /api/wp?action=list
 * 
 * // Get WP instance info
 * GET /api/wp?action=info&siteId=abc123
 * 
 * // Get plugins list
 * GET /api/wp?action=plugins&siteId=abc123
 * 
 * // Get themes list
 * GET /api/wp?action=themes&siteId=abc123
 * 
 * // Get security scan
 * GET /api/wp?action=security&siteId=abc123
 * 
 * // Install WordPress
 * POST /api/wp
 * {
 *   "action": "install",
 *   "siteId": "abc123",
 *   "url": "https://example.com",
 *   "title": "My Site",
 *   "adminUser": "admin",
 *   "adminPassword": "secure-password",
 *   "adminEmail": "admin@example.com",
 *   "language": "en_US",
 *   "autoPlugins": ["litespeed-cache", "redis-object-cache", "wordfence"]
 * }
 * 
 * // Update WordPress core
 * POST /api/wp
 * { "action": "update", "siteId": "abc123" }
 * 
 * // Install plugin
 * POST /api/wp
 * { "action": "plugin_install", "siteId": "abc123", "pluginSlug": "contact-form-7" }
 * 
 * // Activate plugin
 * POST /api/wp
 * { "action": "plugin_activate", "siteId": "abc123", "pluginSlug": "contact-form-7" }
 * 
 * // Update all plugins
 * POST /api/wp
 * { "action": "plugin_update_all", "siteId": "abc123" }
 * 
 * // Activate theme
 * POST /api/wp
 * { "action": "theme_activate", "siteId": "abc123", "themeSlug": "astra" }
 * 
 * // Reset admin password
 * POST /api/wp
 * { "action": "reset_password", "siteId": "abc123", "newPassword": "new-secure-password" }
 * 
 * // Enable maintenance mode
 * POST /api/wp
 * { "action": "maintenance", "siteId": "abc123", "enable": true }
 * 
 * // Security hardening
 * POST /api/wp
 * {
 *   "action": "security_harden",
 *   "siteId": "abc123",
 *   "changeAdminUrl": "my-secret-admin",
 *   "disableXmlrpc": true,
 *   "hideVersion": true
 * }
 * 
 * Default plugins installed with WordPress:
 * - litespeed-cache (pre-configured for OLS LSCache)
 * - redis-object-cache (pre-configured for Redis)
 * - wordfence (basic firewall enabled)
 */