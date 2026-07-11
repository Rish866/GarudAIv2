import { TenantRepository } from '../base/tenantRepository';
import { supabase } from '../../lib/supabase';

export interface CustomerRecord {
  id: string;
  organization_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  billing_address: string;
  credit_limit: number;
  credit_days: number;
  outstanding: number;
  total_business: number;
  status: string;
  created_at: string;
}

class CustomerRepository extends TenantRepository<CustomerRecord> {
  constructor() { super('customers'); }

  async getActive(organizationId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active');
    return { data: data as CustomerRecord[] | null, error: error?.message || null };
  }

  async getOverdueCustomers(organizationId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', organizationId)
      .gt('outstanding', 0);
    return { data: data as CustomerRecord[] | null, error: error?.message || null };
  }
}

export const customerRepository = new CustomerRepository();
