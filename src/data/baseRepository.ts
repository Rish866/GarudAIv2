import { supabase } from '../lib/supabase';
import { sanitizeForTable, sanitizeForTableSafe } from '../lib/sanitize';

export interface RepositoryResult<T> {
  data: T | null;
  error: string | null;
}

export interface ListResult<T> {
  data: T[];
  error: string | null;
}

/**
 * Base repository for Supabase operations with organization scoping.
 * All methods require an organizationId — never trust browser state alone.
 * RLS provides the final security layer; these checks are defense-in-depth.
 * 
 * UUID sanitization: Only the 22 approved nullable UUID reference columns
 * are sanitized (empty string → null). All other TEXT fields pass unchanged.
 */
export function createRepository<T extends { id: string }>(tableName: string) {
  return {
    async list(organizationId: string): Promise<ListResult<T>> {
      if (!organizationId) return { data: [], error: 'No organization ID provided' };

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) return { data: [], error: error.message };
      return { data: (data as T[]) || [], error: null };
    },

    async getById(organizationId: string, id: string): Promise<RepositoryResult<T>> {
      if (!organizationId) return { data: null, error: 'No organization ID provided' };
      if (!id) return { data: null, error: 'No ID provided' };

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', id)
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    },

    async create(organizationId: string, input: Omit<T, 'id' | 'organization_id' | 'created_at' | 'updated_at'>): Promise<RepositoryResult<T>> {
      if (!organizationId) return { data: null, error: 'No organization ID provided' };

      // Structured error: sanitizer failures return error (not throw)
      const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe(tableName, {
        ...input,
        organization_id: organizationId,
      });
      if (sanitizeErrors.length > 0) {
        return { data: null, error: sanitizeErrors.map(e => e.message).join('; ') };
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(sanitized as Record<string, unknown>)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    },

    async update(organizationId: string, id: string, input: Partial<T>): Promise<RepositoryResult<T>> {
      if (!organizationId) return { data: null, error: 'No organization ID provided' };
      if (!id) return { data: null, error: 'No ID provided' };

      // Never allow organization_id to be changed
      const { organization_id, ...safeInput } = input as any;

      // Structured error: sanitizer failures return error (not throw)
      const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe(tableName, { ...safeInput, updated_at: new Date().toISOString() });
      if (sanitizeErrors.length > 0) {
        return { data: null, error: sanitizeErrors.map(e => e.message).join('; ') };
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(sanitized as Record<string, unknown>)
        .eq('organization_id', organizationId)
        .eq('id', id)
        .select()
        .single();

      if (error) return { data: null, error: error.message };
      return { data: data as T, error: null };
    },

    async remove(organizationId: string, id: string): Promise<{ error: string | null }> {
      if (!organizationId) return { error: 'No organization ID provided' };
      if (!id) return { error: 'No ID provided' };

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', id);

      if (error) return { error: error.message };
      return { error: null };
    },
  };
}
