import { createRepository } from '../baseRepository';
import { supabase } from '../../lib/supabase';
import type { Driver } from '../../types';

const base = createRepository<Driver>('drivers');

export const driverRepository = {
  ...base,

  async assignVehicle(organizationId: string, driverId: string, vehicleId: string) {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };

    // Verify vehicle belongs to same org
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', vehicleId)
      .single();

    if (!vehicle) return { data: null, error: 'Vehicle not found in this organization' };

    return base.update(organizationId, driverId, { assigned_vehicle_id: vehicleId } as any);
  },

  async updateStatus(organizationId: string, driverId: string, status: string) {
    return base.update(organizationId, driverId, { status } as any);
  },

  async deactivate(organizationId: string, driverId: string) {
    return base.update(organizationId, driverId, { status: 'inactive' } as any);
  },
};
export type DriverRecord = Driver;
