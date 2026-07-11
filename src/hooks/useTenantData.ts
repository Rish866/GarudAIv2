// Hook for fetching tenant-scoped data from Supabase repositories
// Replaces the old Zustand store reads for business data

import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import type { TenantRepository, TenantRecord, TenantQueryOptions } from '../data/base/tenantRepository';

interface UseTenantDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  total: number;
}

/**
 * Generic hook for fetching all records from a tenant repository
 * Automatically scopes to the current organization
 */
export function useTenantData<T extends TenantRecord>(
  repository: TenantRepository<T>,
  options?: { orderBy?: string; limit?: number }
): UseTenantDataResult<T> {
  const { organizationId, loading: orgLoading } = useOrganization();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!organizationId) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const queryOptions: TenantQueryOptions = {
      organizationId,
      orderBy: options?.orderBy || 'created_at',
      orderDirection: 'desc',
      limit: options?.limit,
    };

    const result = await repository.getAll(queryOptions);

    if (result.error) {
      setError(result.error);
      setData([]);
    } else {
      setData(result.data || []);
    }
    setLoading(false);
  }, [organizationId, repository, options?.orderBy, options?.limit]);

  useEffect(() => {
    if (!orgLoading) {
      refresh();
    }
  }, [orgLoading, refresh]);

  return { data, loading: loading || orgLoading, error, refresh, total: data.length };
}
