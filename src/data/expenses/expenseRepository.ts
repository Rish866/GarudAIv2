import { TenantRepository } from '../base/tenantRepository';
import { supabase } from '../../lib/supabase';

export interface ExpenseRecord {
  id: string;
  organization_id: string;
  trip_id?: string;
  vehicle_id?: string;
  vehicle_reg?: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  paid_to: string;
  payment_mode: string;
  approved: boolean;
  created_at: string;
}

class ExpenseRepository extends TenantRepository<ExpenseRecord> {
  constructor() { super('expenses'); }

  async getByCategory(organizationId: string, category: string) {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('category', category)
      .order('date', { ascending: false });
    return { data: data as ExpenseRecord[] | null, error: error?.message || null };
  }

  async getTotalExpenses(organizationId: string): Promise<number> {
    const { data } = await supabase
      .from('expenses')
      .select('amount')
      .eq('organization_id', organizationId);
    return (data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  }
}

export const expenseRepository = new ExpenseRepository();
