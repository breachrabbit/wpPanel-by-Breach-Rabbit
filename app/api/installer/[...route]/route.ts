// =============================================================================
// wpPanel by Breach Rabbit — Installer API Routes
// =============================================================================
// Next.js 16.1 — App Router Dynamic Route Handler
// Handles all installer endpoints through single file
// Features: Hardware detection, dependency installation, optimal settings, streaming
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { installerService } from '@/lib/services/installer-service';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

// =============================================================================
// 🔐 SECURITY & VALIDATION
// =============================================================================

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
  return (
    request.ip ||
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Validate installer token (for setup access)
 */
function validateInstallerToken(token?: string): boolean {
  if (!token || !process.env.INSTALLER_TOKEN) {
    return false;
  }
  return token === process.env.INSTALLER_TOKEN;
}

/**
 * Rate limiting middleware for installer endpoints
 */
async function withRateLimit<T>(
  ip: string,
  handler: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string; retryAfter?: number }> {
  const rateLimit = await installerService.checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: rateLimit.resetTime,
    };
  }
  
  try {
    const data = await handler();
    return { success: true, data };
  } catch (error) {
    throw error;
  }
}

/**
 * Check if installer is already completed
 */
async function checkInstallerCompletion(): Promise<{
  completed: boolean;
  error?: string;
}> {
  const completed = await installerService.isInstallerCompleted();
  
  if (completed) {
    return {
      completed: true,
      error: 'Installer already completed. Access denied.',
    };
  }
  
  return { completed: false };
}

// =============================================================================
// 🛣️ ROUTE HANDLERS
// =============================================================================

/**
 * GET /api/installer/[...route]
 * Handle GET requests for installer endpoints
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await params;
    const endpoint = route[0];
    const ip = getClientIP(request);

    // Rate limiting for all endpoints
    const rateLimitResult = await withRateLimit(ip, async () => {
      switch (endpoint) {
        // =======================================================================
        // GET /api/installer/status
        // Check if installer is already completed
        // =======================================================================
        case 'status': {
          const completed = await installerService.isInstallerCompleted();
          const status = await installerService.getInstallerStatus();
          
          return NextResponse.json({
            completed,
            status,
          });
        }

        // =======================================================================
        // GET /api/installer/detect-hardware
        // Detect server hardware specifications
        // =======================================================================
        case 'detect-hardware': {
          // Check completion (can access hardware info even after install)
          const hardware = await installerService.detectHardware();
          const optimalSettings = installerService.calculateOptimalSettings(hardware);
          
          await createAuditLog({
            action: 'SYSTEM_CHANGE',
            resource: 'installer',
            ipAddress: ip,
            metadata: {
              action: 'hardware_detected',
              cpuCores: hardware.cpu.cores,
              ramTotal: hardware.ram.total,
              diskType: hardware.disk.type,
            },
          });
          
          return NextResponse.json({
            ...hardware,
            optimalSettings,
          });
        }

        // =======================================================================
        // GET /api/installer/check-deps
        // Check if required dependencies are installed
        // =======================================================================
        case 'check-deps': {
          const completionCheck = await checkInstallerCompletion();
          if (completionCheck.completed) {
            return NextResponse.json(
              { error: completionCheck.error },
              { status: 403 }
            );
          }
          
          const result = await installerService.checkDependencies();
          
          return NextResponse.json(result);
        }

        // =======================================================================
        // GET /api/installer/config
        // Get saved installer configuration
        // =======================================================================
        case 'config': {
          const completionCheck = await checkInstallerCompletion();
          if (completionCheck.completed) {
            return NextResponse.json(
              { error: completionCheck.error },
              { status: 403 }
            );
          }
          
          const config = await installerService.getInstallerConfig();
          
          return NextResponse.json({
            config,
          });
        }

        default:
          return NextResponse.json(
            { error: 'Endpoint not found' },
            { status: 404 }
          );
      }
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: 429, 
          headers: { 
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60' 
          } 
        }
      );
    }

    return rateLimitResult.data;
  } catch (error) {
    console.error('Installer GET error:', error);
    
    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'installer',
      ipAddress: getClientIP(request),
      metadata: {
        action: 'api_error',
        method: 'GET',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/installer/[...route]
 * Handle POST requests for installer endpoints
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await params;
    const endpoint = route[0];
    const ip = getClientIP(request);

    // Rate limiting for all endpoints
    const rateLimitResult = await withRateLimit(ip, async () => {
      switch (endpoint) {
        // =======================================================================
        // POST /api/installer/configure
        // Save installer configuration
        // =======================================================================
        case 'configure': {
          const completionCheck = await checkInstallerCompletion();
          if (completionCheck.completed) {
            return NextResponse.json(
              { error: completionCheck.error },
              { status: 403 }
            );
          }
          
          const body = await request.json();
          
          // Validate configuration
          const configSchema = z.object({
            adminEmail: z.string().email('Invalid email address'),
            adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
            adminName: z.string().min(1, 'Name is required'),
            panelDomain: z.string().optional(),
            panelPort: z.string().optional(),
            sslEmail: z.string().email().optional(),
            olsUrl: z.string().optional(),
            olsUser: z.string().optional(),
            olsPassword: z.string().optional(),
            enableTelegram: z.boolean().optional(),
            telegramBotToken: z.string().optional(),
            telegramChatId: z.string().optional(),
            enableSmtp: z.boolean().optional(),
            smtpHost: z.string().optional(),
            smtpPort: z.string().optional(),
            smtpUser: z.string().optional(),
            smtpPass: z.string().optional(),
            installWordPress: z.boolean().optional(),
            wpDomain: z.string().optional(),
            wpDbName: z.string().optional(),
            wpDbUser: z.string().optional(),
            wpDbPassword: z.string().optional(),
            wpAdminUser: z.string().optional(),
            wpAdminPassword: z.string().optional(),
            wpAdminEmail: z.string().email().optional(),
            wpLanguage: z.string().optional(),
          });
          
          const parsed = configSchema.safeParse(body);
          if (!parsed.success) {
            return NextResponse.json(
              { 
                error: 'Invalid configuration', 
                details: parsed.error.flatten().fieldErrors 
              },
              { status: 400 }
            );
          }
          
          const result = await installerService.saveInstallerConfig(parsed.data);
          
          if (!result.success) {
            return NextResponse.json(
              { error: result.error },
              { status: 400 }
            );
          }
          
          await createAuditLog({
            action: 'SYSTEM_CHANGE',
            resource: 'installer',
            ipAddress: ip,
            metadata: {
              action: 'config_saved',
              adminEmail: parsed.data.adminEmail,
            },
          });
          
          return NextResponse.json({
            success: true,
            sessionId: result.sessionId,
          });
        }

        // =======================================================================
        // POST /api/installer/stream
        // Stream command output (HTTP streaming for terminal)
        // =======================================================================
        case 'stream': {
          const completionCheck = await checkInstallerCompletion();
          if (completionCheck.completed) {
            return NextResponse.json(
              { error: completionCheck.error },
              { status: 403 }
            );
          }
          
          const body = await request.json();
          const { command } = body;
          
          if (!command) {
            return NextResponse.json(
              { error: 'Command is required' },
              { status: 400 }
            );
          }
          
          // Security: Validate command against whitelist
          const isAllowed = installerService.isCommandAllowed(command);
          if (!isAllowed) {
            await createAuditLog({
              action: 'SYSTEM_CHANGE',
              resource: 'installer',
              ipAddress: ip,
              metadata: {
                action: 'blocked_command',
                command,
              },
            });
            
            return NextResponse.json(
              { error: 'Command not allowed for security reasons' },
              { status: 403 }
            );
          }
          
          // Create streaming response
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                
                // Send command echo
                controller.enqueue(encoder.encode(`▶ ${command}\n`));
                
                const child = exec(command, {
                  maxBuffer: 1024 * 1024 * 10, // 10MB buffer
                });
                
                if (child.stdout) {
                  for await (const chunk of child.stdout) {
                    controller.enqueue(encoder.encode(chunk.toString()));
                    // Small delay to prevent overwhelming the client
                    await new Promise((resolve) => setTimeout(resolve, 50));
                  }
                }
                
                if (child.stderr) {
                  for await (const chunk of child.stderr) {
                    controller.enqueue(encoder.encode(chunk.toString()));
                  }
                }
                
                await new Promise((resolve, reject) => {
                  child.on('close', (code) => {
                    if (code === 0) {
                      controller.enqueue(encoder.encode(`✓ Command completed successfully\n`));
                      resolve(code);
                    } else {
                      reject(new Error(`Command exited with code ${code}`));
                    }
                  });
                  child.on('error', reject);
                });
                
                controller.close();
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                controller.enqueue(encoder.encode(`✗ Error: ${errorMessage}\n`));
                controller.error(error);
              }
            },
          });
          
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Content-Type-Options': 'nosniff',
            },
          });
        }

        // =======================================================================
        // POST /api/installer/apply-settings
        // Apply optimal server settings
        // =======================================================================
        case 'apply-settings': {
          const completionCheck = await checkInstallerCompletion();
          if (completionCheck.completed) {
            return NextResponse.json(
              { error: completionCheck.error },
              { status: 403 }
            );
          }
          
          const body = await request.json();
          const { optimalSettings } = body;
          
          if (!optimalSettings) {
            return NextResponse.json(
              { error: 'Optimal settings required' },
              { status: 400 }
            );
          }
          
          const result = await installerService.applyOptimalSettings(optimalSettings);
          
          await createAuditLog({
            action: 'SYSTEM_CHANGE',
            resource: 'installer',
            ipAddress: ip,
            metadata: {
              action: 'settings_applied',
              results: result.results,
            },
          });
          
          return NextResponse.json(result);
        }

        // =======================================================================
        // POST /api/installer/setup-database
        // Setup PostgreSQL database for panel
        // =======================================================================
        case 'setup-database': {
          const completionCheck = await checkInstallerCompletion();
          if (completionCheck.completed) {
            return NextResponse.json(
              { error: completionCheck.error },
              { status: 403 }
            );
          }
          
          const result = await installerService.setupPanelDatabase();
          
          if (!result.success) {
            return NextResponse.json(
              { error: result.error },
              { status: 500 }
            );
          }
          
          await createAuditLog({
            action: 'SYSTEM_CHANGE',
            resource: 'installer',
            ipAddress: ip,
            metadata: {
              action: 'database_setup',
            },
          });
          
          return NextResponse.json({
            success: true,
          });
        }

        // =======================================================================
        // POST /api/installer/complete
        // Complete installation
        // =======================================================================
        case 'complete': {
          const completionCheck = await checkInstallerCompletion();
          if (completionCheck.completed) {
            return NextResponse.json(
              { error: 'Installation already completed' },
              { status: 403 }
            );
          }
          
          const body = await request.json();
          
          // Validate completion data
          const completionSchema = z.object({
            adminEmail: z.string().email(),
            adminPassword: z.string().min(8),
            adminName: z.string().min(1),
            panelDomain: z.string().optional(),
            panelPort: z.string().optional(),
            sslEmail: z.string().email().optional(),
            hardware: z.object({
              cpu: z.object({ cores: z.number() }),
              ram: z.object({ total: z.number() }),
              disk: z.object({ total: z.number(), type: z.string() }),
            }).optional(),
            optimalSettings: z.object({
              swap: z.object({ create: z.boolean(), size: z.number() }),
              php: z.object({ memoryLimit: z.string(), workers: z.number() }),
              mariadb: z.object({ innodbBufferPool: z.string() }),
              ols: z.object({ maxConnections: z.number() }),
            }).optional(),
            installWordPress: z.boolean().optional(),
            wpDomain: z.string().optional(),
          });
          
          const parsed = completionSchema.safeParse(body);
          if (!parsed.success) {
            return NextResponse.json(
              { 
                error: 'Invalid completion data', 
                details: parsed.error.flatten().fieldErrors 
              },
              { status: 400 }
            );
          }
          
          const result = await installerService.completeInstallation(
            parsed.data,
            body.hardware,
            body.optimalSettings
          );
          
          if (!result.success) {
            return NextResponse.json(
              { error: result.error },
              { status: 500 }
            );
          }
          
          await createAuditLog({
            action: 'SYSTEM_CHANGE',
            resource: 'installer',
            ipAddress: ip,
            metadata: {
              action: 'installation_completed',
              adminEmail: parsed.data.adminEmail,
            },
          });
          
          return NextResponse.json({
            success: true,
            message: 'Installation completed successfully',
            redirectUrl: result.redirectUrl,
          });
        }

        default:
          return NextResponse.json(
            { error: 'Endpoint not found' },
            { status: 404 }
          );
      }
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: 429, 
          headers: { 
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60' 
          } 
        }
      );
    }

    return rateLimitResult.data;
  } catch (error) {
    console.error('Installer POST error:', error);
    
    await createAuditLog({
      action: 'SYSTEM_CHANGE',
      resource: 'installer',
      ipAddress: ip,
      metadata: {
        action: 'api_error',
        method: 'POST',
        endpoint: (await params).route?.[0],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/installer/[...route]
 * Handle DELETE requests (for reset/debug purposes - dev only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await params;
    const endpoint = route[0];
    const ip = getClientIP(request);

    switch (endpoint) {
      // =======================================================================
      // DELETE /api/installer/reset
      // Reset installer state (development only)
      // =======================================================================
      case 'reset': {
        // Only allow in development
        if (process.env.NODE_ENV === 'production') {
          await createAuditLog({
            action: 'SYSTEM_CHANGE',
            resource: 'installer',
            ipAddress: ip,
            metadata: {
              action: 'reset_blocked',
              reason: 'production_environment',
            },
          });
          
          return NextResponse.json(
            { error: 'Not allowed in production environment' },
            { status: 403 }
          );
        }
        
        // Validate installer token for reset
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        
        if (!validateInstallerToken(token)) {
          await createAuditLog({
            action: 'SYSTEM_CHANGE',
            resource: 'installer',
            ipAddress: ip,
            metadata: {
              action: 'reset_unauthorized',
            },
          });
          
          return NextResponse.json(
            { error: 'Invalid or missing installer token' },
            { status: 401 }
          );
        }
        
        const result = await installerService.resetInstaller();
        
        if (!result.success) {
          return NextResponse.json(
            { error: result.error },
            { status: 500 }
          );
        }
        
        await createAuditLog({
          action: 'SYSTEM_CHANGE',
          resource: 'installer',
          ipAddress: ip,
          metadata: {
            action: 'installer_reset',
          },
        });
        
        return NextResponse.json({
          success: true,
          message: 'Installer reset successfully',
        });
      }

      default:
        return NextResponse.json(
          { error: 'Endpoint not found' },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Installer DELETE error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// 📝 API ENDPOINTS REFERENCE
// =============================================================================

/**
 * Installer API Endpoints:
 * 
 * GET /api/installer/status
 *   - Check if installer is completed
 *   - Returns: { completed: boolean, status: InstallerStatus }
 * 
 * GET /api/installer/detect-hardware
 *   - Detect server hardware (CPU, RAM, Disk, OS)
 *   - Calculate optimal settings
 *   - Returns: HardwareInfo + OptimalSettings
 * 
 * GET /api/installer/check-deps
 *   - Check if required packages are installed
 *   - Returns: { allInstalled: boolean, results: [] }
 * 
 * GET /api/installer/config
 *   - Get saved installer configuration
 *   - Returns: { config: InstallerConfig }
 * 
 * POST /api/installer/configure
 *   - Save installer configuration
 *   - Body: InstallerConfig
 *   - Returns: { success: true, sessionId: string }
 * 
 * POST /api/installer/stream
 *   - Stream command output (HTTP streaming)
 *   - Body: { command: string }
 *   - Returns: Streaming text response
 * 
 * POST /api/installer/apply-settings
 *   - Apply optimal server settings (SWAP, sysctl, PHP, MariaDB)
 *   - Body: { optimalSettings: OptimalSettings }
 *   - Returns: { success: boolean, results: [] }
 * 
 * POST /api/installer/setup-database
 *   - Setup PostgreSQL database for panel
 *   - Returns: { success: boolean }
 * 
 * POST /api/installer/complete
 *   - Complete installation
 *   - Body: Full configuration + hardware info
 *   - Creates admin user in database
 *   - Returns: { success: true, redirectUrl: string }
 * 
 * DELETE /api/installer/reset (dev only)
 *   - Reset installer state
 *   - Requires: Authorization: Bearer INSTALLER_TOKEN
 *   - Returns: { success: true }
 * 
 * Security Features:
 * - Rate limiting (10 requests per minute per IP)
 * - Command validation (whitelist only)
 * - Installer completion check (block after complete)
 * - INSTALLER_TOKEN validation (for reset endpoint)
 * - Production lock on reset endpoint
 * - Audit logging for all operations
 * 
 * Performance:
 * - HTTP streaming for long-running commands
 * - Async hardware detection
 * - Redis caching for rate limits
 * - Prisma for persistent state
 * 
 * Error Handling:
 * - All endpoints wrapped in try/catch
 * - Proper HTTP status codes (200, 400, 401, 403, 404, 429, 500)
 * - Detailed error messages with Zod validation
 * - Audit logging for security events
 */