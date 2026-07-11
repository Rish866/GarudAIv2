import { TenantRepository } from '../base/tenantRepository';
import { supabase } from '../../lib/supabase';

export interface DriverRecord {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  aadhar?: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  date_of_joining: string;
  assigned_vehicle_id?: string;
  assigned_vehicle_reg?: string;
  salary_type: string;
  base_salary: number;
  status: string;
  safety_score: number;
  total_trips: number;
  total_km: number;
  created_at: string;
}

class DriverRepository extends TenantRepository<DriverRecord> {
  constructor() { super('drivers'); }

  async getAvailable(organizationId: string) {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'available');
    return { data: data as DriverRecord[] | null, error: error?.message || null };
  }
}

export const driverRepository = new DriverRepository();
