// ============================================================
// useReferenceData — Cached data fetching for reference/lookup tables
//
// Uses TanStack Query for automatic caching, deduplication, and
// background refetch. Ideal for dropdown data that doesn't change
// every second (vehicles, drivers, customers, routes, etc.).
//
// Advantages over useModuleData for lookups:
// - Cached across components (fetch once, use everywhere)
// - Deduplicates concurrent requests (5 components mount = 1 fetch)
// - Background refetch when data becomes stale
// - Instant display from cache on subsequent mounts
// - Automatic retry on network failure
//
// Usage:
//   const { data: vehicles, isLoading } = useReferenceData<Vehicle>('vehicles');
//   // Same cache shared across Trip form, Indent form, Fleet module
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { queryKeys } from '../lib/queryClient';
import { resolveTableName, fromDatabaseRecord } from '../lib/legacyTableAdapter';

interface UseReferenceDataOptions {
  /** Override stale time (default: 2 minutes for reference data) */
  staleTime?: number;
  /** Whether to fetch (default: true) */
  enabled?: boolean;
  /** Filter by status (default: excludes 'inactive') */
  excludeInactive?: boolean;
  /** Order by column (default: 'created_at') */
  orderBy?: string;
  /** Order direction */
  orderDirection?: 'asc' | 'desc';
}

/**
 * Fetch and cache reference data with TanStack Query.
 * Data is cached for 2 minutes, then refetched in background.
 * Shared across all components that request the same table.
 */
export function useReferenceData<T extends { id: string }>(
  tableName: string,
  options?: UseReferenceDataOptions
) {
  const { organizationId, loading: orgLoading } = useOrganization();
  const databaseTableName = resolveTableName(tableName);
  const enabled = (options?.enabled !== false) && !orgLoading && !!organizationId;

  return useQuery<T[]>({
    queryKey: queryKeys.table(tableName, organizationId || ''),
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from(databaseTableName)
        .select('*')
        .eq('organization_id', organizationId)
        .order(options?.orderBy || 'created_at', { ascending: options?.orderDirection === 'asc' });

      // Exclude inactive by default for reference lookups
      if (options?.excludeInactive !== false) {
        query = query.neq('status', 'inactive');
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return ((data || []) as Record<string, unknown>[])
        .filter(Boolean)
        .map(row => fromDatabaseRecord(tableName, row) as T);
    },
    enabled,
    // Reference data is stale after 2 minutes (longer than transactional data)
    staleTime: options?.staleTime ?? 2 * 60 * 1000,
    // Keep in cache for 10 minutes even if unused
    gcTime: 10 * 60 * 1000,
  });
}
