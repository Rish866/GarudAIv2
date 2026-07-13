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
import { sanitizeForTableSafe, UUID_REGEX } from '../lib/sanitize';
import { showToast } from '../components/ui/Toast';

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

    const createPayload: Record<string, unknown> = {
      ...(record as Record<string, unknown>),
      organization_id: organizationId,
    };

    // Legacy modules generated browser-only text IDs (for example `vnd_...`).
    // Every business-table primary key is UUID, so omit invalid IDs and let
    // PostgreSQL's gen_random_uuid() default create the canonical identifier.
    if (
      'id' in createPayload &&
      (typeof createPayload.id !== 'string' || !UUID_REGEX.test(createPayload.id))
    ) {
      delete createPayload.id;
    }

    // Structured error: sanitizer failures return error rather than rejecting
    const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe(tableName, createPayload);
    if (sanitizeErrors.length > 0) {
      const message = sanitizeErrors.map(e => e.message).join('; ');
      setError(message);
      showToast('error', `Could not save ${tableName}: ${message}`);
      return { data: null, error: message };
    }

    try {
      const { data: created, error: createError } = await supabase
        .from(tableName)
        .insert(sanitized as Record<string, unknown>)
        .select()
        .single();

      if (createError) {
        setError(createError.message);
        showToast('error', `Could not save ${tableName}: ${createError.message}`);
        return { data: null, error: createError.message };
      }

      if (created) setData(prev => [created as T, ...prev]);
      setError(null);
      return { data: created as T | null, error: null };
    } catch (e: any) {
      const message = e?.message || `Failed to save ${tableName}`;
      setError(message);
      showToast('error', message);
      return { data: null, error: message };
    }
  }, [organizationId, tableName]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<{ error: string | null }> => {
    if (!organizationId) return { error: 'No organization' };

    // Primary keys and tenant ownership are immutable from client updates.
    const safeUpdates: Record<string, unknown> = {
      ...(updates as Record<string, unknown>),
    };
    delete safeUpdates.id;
    delete safeUpdates.organization_id;

    // Structured error: sanitizer failures return error rather than rejecting
    const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe(tableName, safeUpdates);
    if (sanitizeErrors.length > 0) {
      const message = sanitizeErrors.map(e => e.message).join('; ');
      setError(message);
      showToast('error', `Could not update ${tableName}: ${message}`);
      return { error: message };
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
      setError(null);
    } else {
      setError(updateError.message);
      showToast('error', `Could not update ${tableName}: ${updateError.message}`);
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
      setError(null);
    } else {
      setError(deleteError.message);
      showToast('error', `Could not delete ${tableName}: ${deleteError.message}`);
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
