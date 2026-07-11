import { createRepository } from '../baseRepository';
import { supabase } from '../../lib/supabase';
import type { Vehicle } from '../../types';

const base = createRepository<Vehicle>('vehicles');

export const vehicleRepository = {
  ...base,

  async assignDriver(organizationId: string, vehicleId: string, driverId: string) {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };
    
    // Verify driver belongs to same org
    const { data: driver } = await supabase
      .from('drivers')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('id', driverId)
      .single();

    if (!driver) return { data: null, error: 'Driver not found in this organization' };

    return base.update(organizationId, vehicleId, { assigned_driver_id: driverId } as any);
  },

  async updateStatus(organizationId: string, vehicleId: string, status: string) {
    return base.update(organizationId, vehicleId, { status } as any);
  },

  async assignBranch(organizationId: string, vehicleId: string, branchId: string) {
    return base.update(organizationId, vehicleId, { branch_id: branchId } as any);
  },
};
