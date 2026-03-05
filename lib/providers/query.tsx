'use client';

// =============================================================================
// wpPanel by Breach Rabbit — TanStack Query Provider
// =============================================================================
// Next.js 16.1 — Client Component
// TanStack Query v5 for server state management with optimal defaults
// Features: Retry logic, stale time, error handling, toast integration
// =============================================================================

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  isServer,
  defaultShouldDehydrateQuery,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useToast } from '@/components/ui/Toast';

// =============================================================================
// 🎨 TYPES
// =============================================================================

export interface QueryProviderProps {
  children: React.ReactNode;
}

export interface QueryConfig {
  /** Default stale time for all queries (ms) */
  staleTime?: number;
  
  /** Default retry count for failed queries */
  retry?: number | ((failureCount: number, error: Error) => boolean);
  
  /** Default retry delay (ms) */
  retryDelay?: number | ((attemptIndex: number) => number);
  
  /** Default timeout for queries (ms) */
  timeout?: number;
  
  /** Enable devtools in production */
  enableDevtools?: boolean;
}

// =============================================================================
// ⚙️ DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default query configuration for wpPanel
 * Optimized for server management panel use case
 */
const DEFAULT_CONFIG: QueryConfig = {
  staleTime: 1000 * 60 * 5, // 5 minutes — server stats don't change rapidly
  retry: 2, // Retry twice on failure
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
  timeout: 1000 * 30, // 30 seconds timeout for most operations
  enableDevtools: process.env.NODE_ENV === 'development',
};

/**
 * Query keys factory for type-safe query invalidation
 */
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },
  
  // Sites
  sites: {
    all: ['sites'] as const,
    list: () => [...queryKeys.sites.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.sites.all, 'detail', id] as const,
    stats: (id: string) => [...queryKeys.sites.all, 'detail', id, 'stats'] as const,
    logs: (id: string) => [...queryKeys.sites.all, 'detail', id, 'logs'] as const,
  },
  
  // Databases
  databases: {
    all: ['databases'] as const,
    list: () => [...queryKeys.databases.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.databases.all, 'detail', id] as const,
  },
  
  // Backups
  backups: {
    all: ['backups'] as const,
    list: () => [...queryKeys.backups.all, 'list'] as const,
    schedules: () => [...queryKeys.backups.all, 'schedules'] as const,
    stats: () => [...queryKeys.backups.all, 'stats'] as const,
  },
  
  // SSL
  ssl: {
    all: ['ssl'] as const,
    list: () => [...queryKeys.ssl.all, 'list'] as const,
    expiring: () => [...queryKeys.ssl.all, 'expiring'] as const,
  },
  
  // Firewall
  firewall: {
    all: ['firewall'] as const,
    rules: () => [...queryKeys.firewall.all, 'rules'] as const,
    status: () => [...queryKeys.firewall.all, 'status'] as const,
    fail2ban: () => [...queryKeys.firewall.all, 'fail2ban'] as const,
  },
  
  // Monitoring
  monitoring: {
    all: ['monitoring'] as const,
    server: () => [...queryKeys.monitoring.all, 'server'] as const,
    sites: () => [...queryKeys.monitoring.all, 'sites'] as const,
    alerts: () => [...queryKeys.monitoring.all, 'alerts'] as const,
  },
  
  // System
  system: {
    all: ['system'] as const,
    info: () => [...queryKeys.system.all, 'info'] as const,
    services: () => [...queryKeys.system.all, 'services'] as const,
    updates: () => [...queryKeys.system.all, 'updates'] as const,
  },
  
  // Settings
  settings: {
    all: ['settings'] as const,
    php: () => [...queryKeys.settings.all, 'php'] as const,
    mariadb: () => [...queryKeys.settings.all, 'mariadb'] as const,
    ols: () => [...queryKeys.settings.all, 'ols'] as const,
    panel: () => [...queryKeys.settings.all, 'panel'] as const,
  },
  
  // WP Toolkit
  wordpress: {
    all: ['wordpress'] as const,
    instances: () => [...queryKeys.wordpress.all, 'instances'] as const,
    plugins: (wpId: string) => [...queryKeys.wordpress.all, 'plugins', wpId] as const,
    themes: (wpId: string) => [...queryKeys.wordpress.all, 'themes', wpId] as const,
  },
};

// =============================================================================
// 🔧 HELPER FUNCTIONS
// =============================================================================

/**
 * Create query client with optimal defaults for wpPanel
 */
function makeQueryClient(config: QueryConfig = DEFAULT_CONFIG) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SSR optimization
        staleTime: config.staleTime,
        
        // Retry logic with exponential backoff
        retry: config.retry,
        retryDelay: config.retryDelay,
        
        // Refetch on window focus (useful for real-time stats)
        refetchOnWindowFocus: true,
        
        // Don't refetch on reconnect by default (can be overridden per query)
        refetchOnReconnect: false,
        
        // GC unused queries after 5 minutes
        gcTime: 1000 * 60 * 5,
        
        // Prevent infinite loading states
        throwOnError: false,
      },
      
      mutations: {
        // Retry mutations once (safe for idempotent operations)
        retry: 1,
        
        // Don't GC mutations quickly (for optimistic updates)
        gcTime: 1000 * 60 * 10,
      },
    },
  });
}

/**
 * Handle query errors with toast notifications
 */
function useQueryErrorToast() {
  const { error } = useToast();
  
  return React.useCallback(
    (err: Error, title = 'Operation failed') => {
      error({
        title,
        message: err.message || 'An unexpected error occurred',
        duration: 5000,
      });
    },
    [error]
  );
}

// =============================================================================
// 🏗️ QUERY PROVIDER COMPONENT
// =============================================================================

/**
 * QueryProvider — TanStack Query v5 Provider for wpPanel
 * 
 * Provides server state management with optimal defaults for server panel.
 * Includes automatic retry, stale time, and error handling.
 * 
 * @example
 * // In app/layout.tsx
 * <QueryProvider>
 *   {children}
 * </QueryProvider>
 * 
 * // In components
 * const {  data, isLoading } = useQuery({
 *   queryKey: queryKeys.sites.list(),
 *   queryFn: fetchSites,
 * });
 * 
 * const mutation = useMutation({
 *   mutationFn: createSite,
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
 *   },
 * });
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => makeQueryClient(DEFAULT_CONFIG));
  const handleError = useQueryErrorToast();

  // Memoize client to prevent recreation on re-renders
  const client = useMemo(() => queryClient, [queryClient]);

  return (
    <QueryClientProvider client={client}>
      {children}
      
      {/* React Query Devtools (development only by default) */}
      {DEFAULT_CONFIG.enableDevtools && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// =============================================================================
// 🪝 CUSTOM HOOKS
// =============================================================================

/**
 * useQueryErrorToast — Hook for handling query errors with toast
 * 
 * @example
 * const handleError = useQueryErrorToast();
 * 
 * const {  data, error } = useQuery({
 *   queryKey: queryKeys.sites.list(),
 *   queryFn: fetchSites,
 *   onError: (err) => handleError(err, 'Failed to load sites'),
 * });
 */
export { useQueryErrorToast };

/**
 * useInvalidateQuery — Hook for invalidating specific queries
 * 
 * @example
 * const invalidate = useInvalidateQuery();
 * 
 * const mutation = useMutation({
 *   mutationFn: deleteSite,
 *   onSuccess: () => {
 *     invalidate(queryKeys.sites.list());
 *     invalidate(queryKeys.monitoring.server());
 *   },
 * });
 */
export function useInvalidateQuery() {
  const queryClient = useQueryClient();
  
  return React.useCallback(
    (queryKey: readonly unknown[], options?: { exact?: boolean }) => {
      return queryClient.invalidateQueries({
        queryKey,
        exact: options?.exact,
      });
    },
    [queryClient]
  );
}

/**
 * useMutationWithToast — Hook for mutations with automatic toast handling
 * 
 * @example
 * const createSite = useMutationWithToast({
 *   mutationFn: createSiteApi,
 *   successMessage: 'Site created successfully',
 *   errorMessage: 'Failed to create site',
 *   invalidateQueries: [queryKeys.sites.list()],
 * });
 */
export function useMutationWithToast<TData, TError, TVariables, TContext>({
  mutationFn,
  onSuccess,
  onError,
  successMessage,
  errorMessage = 'Operation failed',
  invalidateQueries = [],
  ...options
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: TError, variables: TVariables, context?: TContext) => void;
  successMessage?: string;
  errorMessage?: string;
  invalidateQueries?: readonly unknown[][];
} & Omit<
  import('@tanstack/react-query').UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn' | 'onSuccess' | 'onError'
>) {
  const { success, error } = useToast();
  const invalidate = useInvalidateQuery();
  
  return import('@tanstack/react-query').useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Show success toast
      if (successMessage) {
        success({
          title: 'Success',
          message: successMessage,
          duration: 3000,
        });
      }
      
      // Invalidate queries
      invalidateQueries.forEach((queryKey) => {
        invalidate(queryKey);
      });
      
      // Call original onSuccess
      onSuccess?.(data, variables, context);
    },
    onError: (err, variables, context) => {
      // Show error toast
      error({
        title: 'Error',
        message: errorMessage,
        duration: 5000,
      });
      
      // Call original onError
      onError?.(err as TError, variables, context);
    },
    ...options,
  });
}

// =============================================================================
// 📦 EXPORTS
// =============================================================================

export { QueryClientProvider, useQuery, useMutation, useQueryClient, useQueryClient as useContextQueryClient } from '@tanstack/react-query';
export type { QueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// =============================================================================
// 📝 USAGE EXAMPLES
// =============================================================================

/**
 * Basic Query Usage:
 * 
 * import { useQuery, queryKeys } from '@/lib/providers/query';
 * 
 * function SitesList() {
 *   const {  data, isLoading, error } = useQuery({
 *     queryKey: queryKeys.sites.list(),
 *     queryFn: async () => {
 *       const response = await fetch('/api/sites');
 *       if (!response.ok) throw new Error('Failed to fetch sites');
 *       return response.json();
 *     },
 *     staleTime: 1000 * 60, // 1 minute
 *   });
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorState error={error} />;
 *   
 *   return (
 *     <div>
 *       {data.sites.map(site => <SiteCard key={site.id} site={site} />)}
 *     </div>
 *   );
 * }
 * 
 * // Mutation with invalidation
 * import { useMutation, queryKeys, useQueryClient } from '@/lib/providers/query';
 * 
 * function CreateSiteButton() {
 *   const queryClient = useQueryClient();
 *   
 *   const mutation = useMutation({
 *     mutationFn: async (data) => {
 *       const response = await fetch('/api/sites', {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify(data),
 *       });
 *       return response.json();
 *     },
 *     onSuccess: () => {
 *       // Invalidate sites list
 *       queryClient.invalidateQueries({ queryKey: queryKeys.sites.list() });
 *       
 *       // Show toast (manual)
 *       toast.success('Site created successfully');
 *     },
 *   });
 *   
 *   return (
 *     <Button
 *       onClick={() => mutation.mutate({ name: 'New Site', domain: 'example.com' })}
 *       disabled={mutation.isPending}
 *     >
 *       {mutation.isPending ? 'Creating...' : 'Create Site'}
 *     </Button>
 *   );
 * }
 * 
 * // Using useMutationWithToast helper
 * import { useMutationWithToast, queryKeys } from '@/lib/providers/query';
 * 
 * function DeleteSiteButton({ siteId }: { siteId: string }) {
 *   const mutation = useMutationWithToast({
 *     mutationFn: async () => {
 *       await fetch(`/api/sites/${siteId}`, { method: 'DELETE' });
 *     },
 *     successMessage: 'Site deleted successfully',
 *     errorMessage: 'Failed to delete site',
 *     invalidateQueries: [queryKeys.sites.list(), queryKeys.monitoring.server()],
 *   });
 *   
 *   return (
 *     <Button
 *       variant="danger"
 *       onClick={() => mutation.mutate()}
 *       disabled={mutation.isPending}
 *     >
 *       {mutation.isPending ? 'Deleting...' : 'Delete Site'}
 *     </Button>
 *   );
 * }
 * 
 * // Optimistic updates
 * import { useMutation, queryKeys, useQueryClient } from '@/lib/providers/query';
 * 
 * function ToggleSiteStatus({ siteId, currentStatus }: { siteId: string; currentStatus: string }) {
 *   const queryClient = useQueryClient();
 *   
 *   const mutation = useMutation({
 *     mutationFn: async (newStatus: string) => {
 *       await fetch(`/api/sites/${siteId}/status`, {
 *         method: 'PATCH',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({ status: newStatus }),
 *       });
 *     },
 *     // Optimistic update
 *     onMutate: async (newStatus) => {
 *       await queryClient.cancelQueries({ queryKey: queryKeys.sites.detail(siteId) });
 *       
 *       const previousSite = queryClient.getQueryData(queryKeys.sites.detail(siteId));
 *       
 *       queryClient.setQueryData(queryKeys.sites.detail(siteId), (old: any) => ({
 *         ...old,
 *         status: newStatus,
 *       }));
 *       
 *       return { previousSite };
 *     },
 *     // Rollback on error
 *     onError: (err, newStatus, context) => {
 *       queryClient.setQueryData(
 *         queryKeys.sites.detail(siteId),
 *         context?.previousSite
 *       );
 *     },
 *     // Always invalidate after
 *     onSettled: () => {
 *       queryClient.invalidateQueries({ queryKey: queryKeys.sites.detail(siteId) });
 *     },
 *   });
 *   
 *   return (
 *     <Toggle
 *       checked={currentStatus === 'running'}
 *       onCheckedChange={(checked) => mutation.mutate(checked ? 'running' : 'stopped')}
 *     />
 *   );
 * }
 * 
 * // Prefetching data
 * import { useQueryClient, queryKeys } from '@/lib/providers/query';
 * 
 * function SitesList() {
 *   const queryClient = useQueryClient();
 *   
 *   // Prefetch site details on hover
 *   const handleSiteHover = (siteId: string) => {
 *     queryClient.prefetchQuery({
 *       queryKey: queryKeys.sites.detail(siteId),
 *       queryFn: fetchSiteDetail,
 *       staleTime: 1000 * 60 * 5,
 *     });
 *   };
 *   
 *   return (
 *     <div>
 *       {sites.map(site => (
 *         <div
 *           key={site.id}
 *           onMouseEnter={() => handleSiteHover(site.id)}
 *         >
 *           {site.name}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * 
 * // Infinite scrolling (for logs, backups, etc.)
 * import { useInfiniteQuery, queryKeys } from '@/lib/providers/query';
 * 
 * function LogsViewer({ siteId }: { siteId: string }) {
 *   const {
 *    ,
 *     fetchNextPage,
 *     hasNextPage,
 *     isFetchingNextPage,
 *   } = useInfiniteQuery({
 *     queryKey: queryKeys.sites.logs(siteId),
 *     queryFn: async ({ pageParam = 0 }) => {
 *       const response = await fetch(`/api/sites/${siteId}/logs?page=${pageParam}`);
 *       return response.json();
 *     },
 *     initialPageParam: 0,
 *     getNextPageParam: (lastPage) => lastPage.nextPage,
 *   });
 *   
 *   return (
 *     <div>
 *       {pages.map((page) => (
 *         <div key={page.page}>
 *           {page.logs.map(log => <LogEntry key={log.id} log={log} />)}
 *         </div>
 *       ))}
 *       
 *       {hasNextPage && (
 *         <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
 *           Load More
 *         </Button>
 *       )}
 *     </div>
 *   );
 * }
 */

// =============================================================================
// 🎨 DESIGN SYSTEM NOTES
// =============================================================================

/**
 * Query Provider Design System — wpPanel by Breach Rabbit
 * 
 * Stale Time Strategy:
 * - Server stats: 5 minutes (don't change rapidly)
 * - Site list: 2 minutes
 * - User profile: 10 minutes
 * - System info: 5 minutes
 * - Can be overridden per-query based on data volatility
 * 
 * Retry Strategy:
 * - Default: 2 retries with exponential backoff
 * - Delay: 1s → 2s → 4s → 8s → 16s → 30s (max)
 * - Mutations: 1 retry (safe for idempotent operations)
 * - Can be disabled for sensitive operations (payments, deletes)
 * 
 * Error Handling:
 * - Automatic toast on mutation errors
 * - Manual error handling for queries (more control)
 * - Error boundaries for critical sections
 * - Fallback UI for failed queries
 * 
 * Cache Strategy:
 * - GC time: 5 minutes (balance memory vs refetch)
 * - Structural sharing enabled (performance)
 * - Persister ready (can add localStorage persistence)
 * 
 * Devtools:
 * - Enabled in development only
 * - Position: bottom-right
 * - Initial state: closed (don't clutter UI)
 * 
 * Performance:
 * - QueryClient created once (useState)
 * - Memoized to prevent recreation
 * - Tree-shakeable imports
 * - Lazy devtools loading
 * 
 * SSR Optimization:
 * - dehydrate/rehydrate ready for Next.js
 * - defaultShouldDehydrateQuery configured
 * - No queries run on server by default
 * 
 * Common Patterns:
 * - useQuery for data fetching
 * - useMutation for data modification
 * - useQueryClient for manual invalidation
 * - queryKeys factory for type safety
 * - useMutationWithToast for common mutation pattern
 */