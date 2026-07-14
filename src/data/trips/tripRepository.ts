import { createRepository } from '../baseRepository';
import { supabase } from '../../lib/supabase';
import type { Trip } from '../../types';

const base = createRepository<Trip>('trips');

export interface RpcResult<T = any> {
  data: T | null;
  error: string | null;
}

/**
 * Parse RPC response: Supabase .rpc() returns { data, error }.
 * Our RPCs return JSON with { success, error?, ... }.
 */
function parseRpcResponse(data: any, rpcError: any): RpcResult {
  if (rpcError) return { data: null, error: rpcError.message };
  if (!data) return { data: null, error: 'No response from server' };
  const result = data as { success: boolean; error?: string };
  if (!result.success) return { data: null, error: result.error || 'Operation failed' };
  return { data, error: null };
}

export const tripRepository = {
  ...base,

  // ──────────────────────────────────────────────────────────
  // LEGACY: kept for backward compatibility with assign flows
  // ──────────────────────────────────────────────────────────

  async assignVehicle(organizationId: string, tripId: string, vehicleId: string) {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', vehicleId)
      .single();
    if (!vehicle) return { data: null, error: 'Vehicle not found in this organization' };
    return base.update(organizationId, tripId, { vehicle_id: vehicleId } as any);
  },

  async assignDriver(organizationId: string, tripId: string, driverId: string) {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', driverId)
      .single();
    if (!driver) return { data: null, error: 'Driver not found in this organization' };
    return base.update(organizationId, tripId, { driver_id: driverId } as any);
  },


  async updatePOD(organizationId: string, tripId: string, pod: {
    received_by: string;
    condition: string;
    received_date: string;
    remarks?: string;
  }) {
    return base.update(organizationId, tripId, {
      pod_status: 'received',
      pod_received_by: pod.received_by,
      pod_condition: pod.condition,
      pod_received_date: pod.received_date,
      pod_remarks: pod.remarks || '',
    } as any);
  },

  // ──────────────────────────────────────────────────────────
  // SECURE RPCs — All trip state mutations go through these
  // ──────────────────────────────────────────────────────────

  /**
   * Transition trip status via secure RPC.
   * Enforces allowed transition map at DB level.
   * Replaces the old `updateStatus` method.
   */
  async transitionStatus(
    organizationId: string,
    tripId: string,
    newStatus: string,
    reason?: string
  ): Promise<RpcResult> {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };
    if (!tripId) return { data: null, error: 'No trip ID provided' };
    if (!newStatus) return { data: null, error: 'New status is required' };

    const { data, error } = await supabase.rpc('transition_trip_status', {
      p_organization_id: organizationId,
      p_trip_id: tripId,
      p_new_status: newStatus,
      p_reason: reason || null,
    });

    return parseRpcResponse(data, error);
  },


  /**
   * Cancel a trip via transaction-safe RPC.
   * Validates role, org ownership, status, paid invoices.
   * Releases vehicle/driver, writes history + audit.
   */
  async cancel(
    organizationId: string,
    tripId: string,
    reason: string
  ): Promise<RpcResult> {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };
    if (!tripId) return { data: null, error: 'No trip ID provided' };
    if (!reason || reason.trim() === '') return { data: null, error: 'Cancellation reason is required' };

    const { data, error } = await supabase.rpc('cancel_trip', {
      p_organization_id: organizationId,
      p_trip_id: tripId,
      p_reason: reason.trim(),
    });

    return parseRpcResponse(data, error);
  },

  /**
   * Reopen a cancelled trip via transaction-safe RPC.
   * Validates role, org, vehicle/driver availability, invoice safety.
   * Requires a reason. Writes history + audit.
   */
  async reopen(
    organizationId: string,
    tripId: string,
    reason: string
  ): Promise<RpcResult> {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };
    if (!tripId) return { data: null, error: 'No trip ID provided' };
    if (!reason || reason.trim() === '') return { data: null, error: 'Reopen reason is required' };

    const { data, error } = await supabase.rpc('reopen_trip', {
      p_organization_id: organizationId,
      p_trip_id: tripId,
      p_reason: reason.trim(),
    });

    return parseRpcResponse(data, error);
  },


  /**
   * Edit trip details via transaction-safe RPC.
   * Validates role, editable status, vehicle/driver/customer ownership.
   * Prevents editing completed/billed/settled/cancelled trips.
   * Writes history + audit.
   */
  async editDetails(
    organizationId: string,
    tripId: string,
    updates: Record<string, any>
  ): Promise<RpcResult> {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };
    if (!tripId) return { data: null, error: 'No trip ID provided' };
    if (!updates || Object.keys(updates).length === 0) return { data: null, error: 'No updates provided' };

    // Remove undefined/null keys to avoid sending noise
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        // Convert null-equivalent empty strings to null for optional fields
        cleanUpdates[key] = value === '' ? null : value;
      }
    }

    const { data, error } = await supabase.rpc('update_trip_details', {
      p_organization_id: organizationId,
      p_trip_id: tripId,
      p_updates: cleanUpdates,
    });

    return parseRpcResponse(data, error);
  },

  /**
   * Fetch trip status history for a specific trip.
   */
  async getStatusHistory(
    organizationId: string,
    tripId: string
  ): Promise<{ data: any[]; error: string | null }> {
    if (!organizationId) return { data: [], error: 'No organization ID provided' };
    if (!tripId) return { data: [], error: 'No trip ID provided' };

    const { data, error } = await supabase
      .from('trip_status_history')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data || [], error: null };
  },
};

export type TripRecord = Trip;
