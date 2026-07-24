// ============================================================
// TanStack Query Client Configuration
//
// Provides caching, background refetch, and stale-while-revalidate
// for all Supabase data fetching. Replaces the manual re-fetch-on-mount
// pattern in useModuleData for reference data that doesn't change often.
//
// Cache strategy:
// - Reference data (vehicles, drivers, customers): stale after 2 min, refetch in background
// - Transactional data (trips, invoices): stale after 30s
// - Real-time data (notifications): no cache (handled by Supabase Realtime)
// ============================================================

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds
      staleTime: 30 * 1000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Refetch when window regains focus (user tabs back)
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect (Supabase handles this)
      refetchOnReconnect: false,
    },
    mutations: {
      // Don't retry mutations (they might have side effects)
      retry: false,
    },
  },
});

/**
 * Query key factory for consistent cache invalidation.
 * 
 * Usage:
 *   queryKeys.table('vehicles')           → ['table', 'vehicles']
 *   queryKeys.table('vehicles', orgId)    → ['table', 'vehicles', orgId]
 *   queryKeys.record('trips', tripId)     → ['record', 'trips', tripId]
 */
export const queryKeys = {
  /** All data for a table (invalidates when any row changes) */
  table: (tableName: string, orgId?: string) =>
    orgId ? ['table', tableName, orgId] as const : ['table', tableName] as const,

  /** Single record lookup */
  record: (tableName: string, id: string) =>
    ['record', tableName, id] as const,

  /** Paginated list with filters */
  list: (tableName: string, orgId: string, filters?: Record<string, unknown>) =>
    ['list', tableName, orgId, filters] as const,

  /** Dashboard aggregates */
  dashboard: (orgId: string) =>
    ['dashboard', orgId] as const,

  /** Invalidate all data for an organization */
  org: (orgId: string) =>
    ['org', orgId] as const,
};
