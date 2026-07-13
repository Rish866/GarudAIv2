// useModuleData — Bridge hook for migrating modules from Zustand to Supabase
// 
// This hook provides a consistent interface for all modules to access data.
// When an organization is available (user logged in with Supabase Auth):
//   → Reads from Supabase repositories (org-scoped, RLS enforced)
// When no organization (legacy/demo mode):
//   → Returns empty arrays (no demo data fallback)
//
// Modules can progressively migrate to this hook without breaking the app.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { sanitizeForTable, sanitizeForTableSafe } from '../lib/sanitize';

export interface ModuleDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  organizationId: string | null;
  isOrgReady: boolean;
  refresh: () => Promise<void>;
  create: (record: Partial<T>) => Promise<{ data: T | null; error: string | null }>;
  update: (id: string, updates: Partial<T>) => Promise<{ error: string | null }>;
  remove: (id: string) => Promise<{ error: string | null }>;
}

/**
 * Universal hook for any module to read/write org-scoped data from Supabase
 * 
 * Usage:
 * const { data: vehicles, loading, create, update, remove } = useModuleData<Vehicle>('vehicles');
 */
export function useModuleData<T extends { id: string }>(
  tableName: string,
  options?: {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, string | number | boolean>;
    enabled?: boolean;
  }
): ModuleDataResult<T> {
  const { organizationId, loading: orgLoading } = useOrganization();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const enabled = options?.enabled !== false;
  const isOrgReady = !orgLoading && !!organizationId;

  const refresh = useCallback(async () => {
    if (!organizationId || !enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .order(options?.orderBy || 'created_at', { ascending: options?.orderDirection === 'asc' });

      // Apply filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        setData([]);
      } else {
        setData((result as T[]) || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, tableName, enabled, options?.orderBy, options?.orderDirection]);

  useEffect(() => {
    if (!orgLoading) refresh();
  }, [orgLoading, refresh]);

  const create = useCallback(async (record: Partial<T>): Promise<{ data: T | null; error: string | null }> => {
    if (!organizationId) return { data: null, error: 'No organization' };

    // Structured error: sanitizer failures return error rather than rejecting
    const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe(tableName, { ...record, organization_id: organizationId });
    if (sanitizeErrors.length > 0) {
      return { data: null, error: sanitizeErrors.map(e => e.message).join('; ') };
    }

    const { data: created, error: createError } = await supabase
      .from(tableName)
      .insert(sanitized as Record<string, unknown>)
      .select()
      .single();

    if (!createError && created) {
      setData(prev => [created as T, ...prev]);
    }

    return { data: created as T | null, error: createError?.message || null };
  }, [organizationId, tableName]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<{ error: string | null }> => {
    if (!organizationId) return { error: 'No organization' };

    // Structured error: sanitizer failures return error rather than rejecting
    const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe(tableName, { ...updates });
    if (sanitizeErrors.length > 0) {
      return { error: sanitizeErrors.map(e => e.message).join('; ') };
    }

    const patch = sanitized as Record<string, unknown>;
    const { error: updateError } = await supabase
      .from(tableName)
      .update(patch)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (!updateError) {
      // Use the SANITIZED patch for local state so DB and UI agree
      setData(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
    }

    return { error: updateError?.message || null };
  }, [organizationId, tableName]);

  const remove = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (!organizationId) return { error: 'No organization' };

    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (!deleteError) {
      setData(prev => prev.filter(item => item.id !== id));
    }

    return { error: deleteError?.message || null };
  }, [organizationId, tableName]);

  return {
    data,
    loading: loading || orgLoading,
    error,
    organizationId,
    isOrgReady,
    refresh,
    create,
    update,
    remove,
  };
}
