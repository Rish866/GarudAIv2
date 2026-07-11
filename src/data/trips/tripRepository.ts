import { TenantRepository } from '../base/tenantRepository';
import { supabase } from '../../lib/supabase';

export interface TripRecord {
  id: string;
  organization_id: string;
  trip_number: string;
  lr_number: string;
  eway_bill?: string;
  customer_id: string;
  customer_name: string;
  vehicle_id: string;
  vehicle_reg: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  origin: string;
  destination: string;
  distance_km: number;
  material: string;
  weight_tons: number;
  booking_date: string;
  loading_date?: string;
  departure_date?: string;
  expected_delivery?: string;
  actual_delivery?: string;
  freight_amount: number;
  advance_amount: number;
  balance_amount: number;
  detention_charges: number;
  other_charges: number;
  total_amount: number;
  status: string;
  pod_url?: string;
  pod_date?: string;
  remarks?: string;
  created_at: string;
}

class TripRepository extends TenantRepository<TripRecord> {
  constructor() { super('trips'); }

  async getByStatus(organizationId: string, status: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', status)
      .order('created_at', { ascending: false });
    return { data: data as TripRecord[] | null, error: error?.message || null };
  }

  async getActive(organizationId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['booked', 'assigned', 'loading', 'in_transit', 'reached', 'unloading'])
      .order('created_at', { ascending: false });
    return { data: data as TripRecord[] | null, error: error?.message || null };
  }

  async getByCustomer(organizationId: string, customerId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    return { data: data as TripRecord[] | null, error: error?.message || null };
  }
}

export const tripRepository = new TripRepository();
