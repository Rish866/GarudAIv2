import { supabase } from '../../lib/supabase';

export interface AuditEntry {
  organization_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit log service — writes entries to Supabase.
 * Entries survive page refresh and browser changes.
 * organization_id is always verified server-side by RLS.
 */
export const auditService = {
  async log(entry: AuditEntry): Promise<{ error: string | null }> {
    if (!entry.organization_id) return { error: 'No organization ID for audit' };
    if (!entry.user_id) return { error: 'No user ID for audit' };

    const { error } = await supabase
      .from('activity_log')
      .insert({
        organization_id: entry.organization_id,
        user_id: entry.user_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        metadata: entry.metadata || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Audit] Failed to write audit log:', error.message);
      return { error: error.message };
    }
    return { error: null };
  },

  async list(organizationId: string, options?: {
    entity_type?: string;
    entity_id?: string;
    limit?: number;
  }) {
    if (!organizationId) return { data: [], error: 'No organization ID' };

    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(options?.limit || 100);

    if (options?.entity_type) query = query.eq('entity_type', options.entity_type);
    if (options?.entity_id) query = query.eq('entity_id', options.entity_id);

    const { data, error } = await query;
    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  },
};
