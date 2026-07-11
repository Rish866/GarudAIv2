// Organization-Scoped Realtime Subscription Hook
// 
// Every Realtime subscription MUST be filtered by organization_id
// to prevent cross-tenant event leaks.
//
// Usage:
//   useRealtimeSubscription('vehicles', (payload) => {
//     console.log('Vehicle changed:', payload);
//     refresh(); // Re-fetch data
//   });

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeOptions {
  event?: ChangeEvent;
  enabled?: boolean;
}

/**
 * Subscribe to Realtime changes on a table, scoped to the current organization.
 * Automatically unsubscribes when organization changes or component unmounts.
 * 
 * SECURITY: Uses organization_id filter to prevent cross-tenant event leaks.
 * RLS also enforces this at the database level for Realtime delivery.
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>(
  tableName: string,
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void,
  options?: RealtimeOptions
) {
  const { organizationId } = useOrganization();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const enabled = options?.enabled !== false;
  const event = options?.event || '*';

  useEffect(() => {
    // Don't subscribe if no organization or disabled
    if (!organizationId || !enabled) return;

    // Create organization-scoped channel
    const channelName = `${tableName}:org:${organizationId}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: tableName,
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          onEvent(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup: unsubscribe when org changes or component unmounts
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, tableName, event, enabled]);
}

/**
 * Subscribe to multiple tables at once (for dashboard/overview pages)
 */
export function useRealtimeMultiTable(
  tables: string[],
  onEvent: (table: string, payload: any) => void,
  options?: RealtimeOptions
) {
  const { organizationId } = useOrganization();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!organizationId || !enabled) return;

    const channelName = `multi:org:${organizationId}`;
    let channel = supabase.channel(channelName);

    // Add listener for each table
    tables.forEach(tableName => {
      channel = channel.on(
        'postgres_changes',
        {
          event: options?.event || '*',
          schema: 'public',
          table: tableName,
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          onEvent(tableName, payload);
        }
      );
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [organizationId, tables.join(','), enabled]);
}
