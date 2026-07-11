import { createRepository } from '../baseRepository';
import { supabase } from '../../lib/supabase';
import type { Trip } from '../../types';

const base = createRepository<Trip>('trips');

export const tripRepository = {
  ...base,

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

  async updateStatus(organizationId: string, tripId: string, status: string) {
    return base.update(organizationId, tripId, { status } as any);
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

  async cancel(organizationId: string, tripId: string, reason: string) {
    return base.update(organizationId, tripId, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: new Date().toISOString(),
    } as any);
  },
};
export type TripRecord = Trip;
