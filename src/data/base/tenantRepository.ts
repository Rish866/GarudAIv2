// Base Tenant Repository — All org-scoped CRUD operations go through here
// Ensures organization_id is ALWAYS included in queries
// RLS provides database-level enforcement; this provides app-level safety

import { supabase } from '../../lib/supabase';
import { sanitizeForTable } from '../../lib/sanitize';

export interface TenantQueryOptions {
  organizationId: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface TenantRecord {
  id: string;
  organization_id: string;
  [key: string]: any;
}

/**
 * Base class for all tenant-scoped data access
 * Every business table repository should extend or use this
 */
export class TenantRepository<T extends TenantRecord> {
  constructor(private tableName: string) {}

  /**
   * Get all records for the organization
   */
  async getAll(options: TenantQueryOptions): Promise<{ data: T[] | null; error: string | null }> {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('organization_id', options.organizationId)
      .order(options.orderBy || 'created_at', { ascending: options.orderDirection === 'asc' });

    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

    const { data, error } = await query;
    return { data: data as T[] | null, error: error?.message || null };
  }

  /**
   * Get a single record by ID (RLS ensures org scoping)
   */
  async getById(id: string, organizationId: string): Promise<{ data: T | null; error: string | null }> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();
    return { data: data as T | null, error: error?.message || null };
  }

  /**
   * Create a new record (organization_id is mandatory)
   */
  async create(record: Omit<T, 'id'>, organizationId: string): Promise<{ data: T | null; error: string | null }> {
    const row: Record<string, unknown> = sanitizeForTable(this.tableName, { ...record, organization_id: organizationId });
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(row)
      .select()
      .single();
    return { data: data as T | null, error: error?.message || null };
  }

  /**
   * Update a record (RLS ensures you can only update your org's records)
   */
  async update(id: string, updates: Partial<T>, organizationId: string): Promise<{ data: T | null; error: string | null }> {
    const patch: Record<string, unknown> = sanitizeForTable(this.tableName, { ...updates });
    const { data, error } = await supabase
      .from(this.tableName)
      .update(patch)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();
    return { data: data as T | null, error: error?.message || null };
  }

  /**
   * Delete a record (RLS ensures you can only delete your org's records)
   */
  async delete(id: string, organizationId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);
    return { error: error?.message || null };
  }

  /**
   * Count records for the organization
   */
  async count(organizationId: string, filters?: Record<string, unknown>): Promise<{ count: number; error: string | null }> {
    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value as string);
      });
    }

    const { count, error } = await query;
    return { count: count ?? 0, error: error?.message || null };
  }
}
