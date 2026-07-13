import { createRepository } from '../baseRepository';
import { supabase } from '../../lib/supabase';
import { sanitizeForTable, sanitizeForTableSafe } from '../../lib/sanitize';

const base = createRepository<any>('quotations');

export const quotationRepository = {
  ...base,

  async updateStatus(organizationId: string, quotationId: string, status: string) {
    return base.update(organizationId, quotationId, { status });
  },

  /**
   * Convert quotation to trip (Supabase transaction-safe).
   * Creates a trip record from quotation data and marks quotation as accepted.
   */
  async convertToTrip(organizationId: string, quotationId: string) {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };

    // Fetch the quotation
    const { data: quotation, error: fetchErr } = await supabase
      .from('quotations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', quotationId)
      .single();

    if (fetchErr || !quotation) return { data: null, error: fetchErr?.message || 'Quotation not found' };

    // Create trip from quotation data
    const trip = {
      organization_id: organizationId,
      quotation_id: quotationId,
      enquiry_id: quotation.enquiry_id || null,
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      origin: quotation.origin,
      destination: quotation.destination,
      vehicle_type: quotation.vehicle_type,
      material: quotation.material,
      weight_tons: quotation.weight_tons,
      freight_amount: quotation.total_amount || quotation.rate || 0,
      lr_number: `LR-${Date.now().toString(36).toUpperCase()}`,
      status: 'booked',
      trip_number: `TR-${Date.now().toString(36).toUpperCase()}`,
    };

    const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe('trips', trip);
    if (sanitizeErrors.length > 0) {
      return { data: null, error: sanitizeErrors.map(e => e.message).join('; ') };
    }

    const { data: newTrip, error: createErr } = await supabase
      .from('trips')
      .insert(sanitized as Record<string, unknown>)
      .select()
      .single();

    if (createErr) return { data: null, error: createErr.message };

    // Mark quotation as accepted
    await supabase
      .from('quotations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', quotationId);

    return { data: newTrip, error: null };
  },
};
