import { TenantRepository, TenantQueryOptions } from '../base/tenantRepository';
import { supabase } from '../../lib/supabase';

export interface VehicleRecord {
  id: string;
  organization_id: string;
  reg_number: string;
  vehicle_type: string;
  make: string;
  model: string;
  year: number;
  ownership_type: string;
  owner_name: string;
  owner_phone?: string;
  capacity_tons: number;
  fitness_expiry: string;
  insurance_expiry: string;
  puc_expiry: string;
  permit_expiry: string;
  driver_id?: string;
  driver_name?: string;
  status: string;
  odometer: number;
  lat?: number;
  lng?: number;
  speed?: number;
  last_location?: string;
  ignition?: boolean;
  created_at: string;
}

class VehicleRepository extends TenantRepository<VehicleRecord> {
  constructor() { super('vehicles'); }

  async getByStatus(organizationId: string, status: string) {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', status);
    return { data: data as VehicleRecord[] | null, error: error?.message || null };
  }

  async getExpiringDocuments(organizationId: string, withinDays: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);
    const dateStr = futureDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`fitness_expiry.lte.${dateStr},insurance_expiry.lte.${dateStr},puc_expiry.lte.${dateStr},permit_expiry.lte.${dateStr}`);
    return { data: data as VehicleRecord[] | null, error: error?.message || null };
  }
}

export const vehicleRepository = new VehicleRepository();
