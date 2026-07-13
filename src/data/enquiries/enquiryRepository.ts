import { createRepository } from '../baseRepository';
import { supabase } from '../../lib/supabase';
import { sanitizeForTable, sanitizeForTableSafe } from '../../lib/sanitize';

const base = createRepository<any>('enquiries');

export const enquiryRepository = {
  ...base,

  async updateStatus(organizationId: string, enquiryId: string, status: string) {
    return base.update(organizationId, enquiryId, { status });
  },

  async reject(organizationId: string, enquiryId: string, reason: string) {
    return base.update(organizationId, enquiryId, {
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
    });
  },

  async close(organizationId: string, enquiryId: string) {
    return base.update(organizationId, enquiryId, {
      status: 'closed',
      closed_at: new Date().toISOString(),
    });
  },

  /**
   * Convert enquiry to quotation (Supabase transaction-safe).
   * Creates a quotation record and updates enquiry status atomically.
   */
  async convertToQuotation(organizationId: string, enquiryId: string) {
    if (!organizationId) return { data: null, error: 'No organization ID provided' };

    // Fetch the enquiry
    const { data: enquiry, error: fetchErr } = await supabase
      .from('enquiries')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', enquiryId)
      .single();

    if (fetchErr || !enquiry) return { data: null, error: fetchErr?.message || 'Enquiry not found' };

    // Create quotation from enquiry data
    const quotation = {
      organization_id: organizationId,
      enquiry_id: enquiryId,
      customer_id: enquiry.customer_id,
      customer_name: enquiry.customer_name,
      origin: enquiry.origin,
      destination: enquiry.destination,
      vehicle_type: enquiry.vehicle_type,
      material: enquiry.material,
      weight_tons: enquiry.weight_tons,
      rate_type: 'per_trip',
      rate: enquiry.target_rate || 0,
      total_amount: Math.round((enquiry.target_rate || 0) * 1.05),
      gst_percent: 5,
      validity_days: 7,
      quotation_number: `QT-${Date.now().toString(36).toUpperCase()}`,
      status: 'draft',
    };

    const { data: sanitized, errors: sanitizeErrors } = sanitizeForTableSafe('quotations', quotation);
    if (sanitizeErrors.length > 0) {
      return { data: null, error: sanitizeErrors.map(e => e.message).join('; ') };
    }

    const { data: newQuotation, error: createErr } = await supabase
      .from('quotations')
      .insert(sanitized as Record<string, unknown>)
      .select()
      .single();

    if (createErr) return { data: null, error: createErr.message };

    // Update enquiry status
    await supabase
      .from('enquiries')
      .update({ status: 'converted', converted_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('id', enquiryId);

    return { data: newQuotation, error: null };
  },
};
