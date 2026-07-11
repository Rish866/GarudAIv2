import { TenantRepository } from '../base/tenantRepository';
import { supabase } from '../../lib/supabase';

export interface InvoiceRecord {
  id: string;
  organization_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  trip_ids: string[];
  freight_total: number;
  detention_total: number;
  other_charges: number;
  subtotal: number;
  gst_percent: number;
  gst_amount: number;
  tds_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: string;
  created_at: string;
}

class InvoiceRepository extends TenantRepository<InvoiceRecord> {
  constructor() { super('invoices'); }

  async getOutstanding(organizationId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .gt('balance_amount', 0)
      .order('due_date', { ascending: true });
    return { data: data as InvoiceRecord[] | null, error: error?.message || null };
  }

  async getByCustomer(organizationId: string, customerId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .order('invoice_date', { ascending: false });
    return { data: data as InvoiceRecord[] | null, error: error?.message || null };
  }

  async getTotalRevenue(organizationId: string): Promise<number> {
    const { data } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('organization_id', organizationId);
    return (data || []).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }
}

export const invoiceRepository = new InvoiceRepository();
