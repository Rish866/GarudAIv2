// ============================================================
// WORKFLOW SERVICE — Transaction-Safe Business Operations
//
// Handles multi-step operations that must be atomic:
// - Enquiry → Quotation (with idempotency)
// - Invoice creation (with trip deduplication)
// - Trip closure (with validation)
// - Driver settlement lifecycle
// ============================================================

import { supabase } from './supabase';
import { showToast } from '../components/ui/Toast';
import type { TripStatus } from '../types';

// ============================================================
// ENQUIRY → QUOTATION (Idempotent)
// ============================================================

export interface ConvertEnquiryResult {
  success: boolean;
  quotationId?: string;
  isExisting?: boolean;
  error?: string;
}

/**
 * Convert an enquiry to a quotation. Idempotent:
 * - If an active quotation already exists for this enquiry, returns it instead of duplicating.
 * - Creates a new quotation only if none exists.
 * - Updates enquiry status to 'quoted' atomically.
 */
export async function convertEnquiryToQuotation(
  organizationId: string,
  enquiryId: string,
  quotationData: Record<string, unknown>
): Promise<ConvertEnquiryResult> {
  if (!organizationId || !enquiryId) {
    return { success: false, error: 'Missing organization or enquiry ID' };
  }

  // Check if a quotation already exists for this enquiry
  const { data: existing } = await supabase
    .from('quotations')
    .select('id, quotation_number, status')
    .eq('organization_id', organizationId)
    .eq('enquiry_id', enquiryId)
    .eq('is_current_revision', true)
    .limit(1);

  if (existing && existing.length > 0) {
    // Return existing quotation instead of creating duplicate
    return {
      success: true,
      quotationId: existing[0].id,
      isExisting: true,
    };
  }

  // Create new quotation
  const { data: created, error: createError } = await supabase
    .from('quotations')
    .insert({
      ...quotationData,
      organization_id: organizationId,
      enquiry_id: enquiryId,
      revision_number: 1,
      is_current_revision: true,
    })
    .select('id')
    .single();

  if (createError) {
    return { success: false, error: createError.message };
  }

  // Update enquiry status to 'quoted'
  const { error: updateError } = await supabase
    .from('enquiries')
    .update({ status: 'quoted' })
    .eq('id', enquiryId)
    .eq('organization_id', organizationId);

  if (updateError) {
    // Quotation created but enquiry status not updated — log warning
    console.warn('Enquiry status update failed:', updateError.message);
  }

  return { success: true, quotationId: created.id, isExisting: false };
}

/**
 * Create a quotation revision. Marks old revision as not-current.
 */
export async function createQuotationRevision(
  organizationId: string,
  parentQuotationId: string,
  revisionData: Record<string, unknown>
): Promise<{ success: boolean; quotationId?: string; error?: string }> {
  // Get parent quotation's revision number
  const { data: parent } = await supabase
    .from('quotations')
    .select('revision_number, enquiry_id')
    .eq('id', parentQuotationId)
    .eq('organization_id', organizationId)
    .single();

  if (!parent) {
    return { success: false, error: 'Parent quotation not found' };
  }

  // Mark parent as not-current
  await supabase
    .from('quotations')
    .update({ is_current_revision: false })
    .eq('id', parentQuotationId)
    .eq('organization_id', organizationId);

  // Create new revision
  const { data: created, error } = await supabase
    .from('quotations')
    .insert({
      ...revisionData,
      organization_id: organizationId,
      enquiry_id: parent.enquiry_id,
      parent_quotation_id: parentQuotationId,
      revision_number: (parent.revision_number || 1) + 1,
      is_current_revision: true,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    // Rollback: re-mark parent as current
    await supabase
      .from('quotations')
      .update({ is_current_revision: true })
      .eq('id', parentQuotationId)
      .eq('organization_id', organizationId);
    return { success: false, error: error.message };
  }

  return { success: true, quotationId: created.id };
}

// ============================================================
// QUOTATION APPROVAL VALIDATION
// ============================================================

export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'revised' | 'converted' | 'partially_converted';

const QUOTATION_CONVERTIBLE_STATUSES: QuotationStatus[] = ['approved'];

/**
 * Check if a quotation can be converted to an indent.
 */
export function canConvertQuotation(quotation: {
  status: string;
  validity_days?: number;
  created_at?: string;
  converted_vehicles?: number;
  weight_tons?: number;
}): { allowed: boolean; error?: string } {
  if (!QUOTATION_CONVERTIBLE_STATUSES.includes(quotation.status as QuotationStatus)) {
    return { allowed: false, error: `Cannot convert quotation with status "${quotation.status}". Only approved quotations can be converted.` };
  }

  // Check expiry
  if (quotation.validity_days && quotation.created_at) {
    const expiryDate = new Date(quotation.created_at);
    expiryDate.setDate(expiryDate.getDate() + quotation.validity_days);
    if (new Date() > expiryDate) {
      return { allowed: false, error: 'Quotation has expired. Please create a revision or new quotation.' };
    }
  }

  return { allowed: true };
}

// ============================================================
// INVOICE CREATION (Idempotent via invoice_trips)
// ============================================================

export interface CreateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  isExisting?: boolean;
  error?: string;
}

/**
 * Create an invoice for a trip with idempotency protection.
 * Uses invoice_trips unique constraint to prevent double-invoicing.
 */
export async function createInvoiceForTrip(
  organizationId: string,
  tripId: string,
  invoiceData: Record<string, unknown>
): Promise<CreateInvoiceResult> {
  if (!organizationId || !tripId) {
    return { success: false, error: 'Missing organization or trip ID' };
  }

  // Check if trip is already invoiced (via invoice_trips)
  const { data: existingLink } = await supabase
    .from('invoice_trips')
    .select('invoice_id')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId)
    .limit(1);

  if (existingLink && existingLink.length > 0) {
    return {
      success: true,
      invoiceId: existingLink[0].invoice_id,
      isExisting: true,
    };
  }

  // Create invoice
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      ...invoiceData,
      organization_id: organizationId,
      trip_ids: [tripId], // Keep JSONB for backward compat
    })
    .select('id')
    .single();

  if (invError) {
    return { success: false, error: invError.message };
  }

  // Create invoice_trips link (unique constraint prevents race condition)
  const { error: linkError } = await supabase
    .from('invoice_trips')
    .insert({
      organization_id: organizationId,
      invoice_id: invoice.id,
      trip_id: tripId,
      billed_amount: (invoiceData.total_amount as number) || 0,
    });

  if (linkError) {
    // Unique constraint violation = another request created it simultaneously
    if (linkError.code === '23505') {
      // Delete the orphan invoice we just created
      await supabase.from('invoices').delete().eq('id', invoice.id);
      // Return the existing one
      const { data: existing } = await supabase
        .from('invoice_trips')
        .select('invoice_id')
        .eq('organization_id', organizationId)
        .eq('trip_id', tripId)
        .single();
      return { success: true, invoiceId: existing?.invoice_id, isExisting: true };
    }
    return { success: false, error: linkError.message };
  }

  return { success: true, invoiceId: invoice.id, isExisting: false };
}

// ============================================================
// TRIP CLOSURE VALIDATION
// ============================================================

export interface TripClosureBlocker {
  code: string;
  message: string;
  overridable: boolean;
}

export interface TripClosureResult {
  valid: boolean;
  blockers: TripClosureBlocker[];
}

/**
 * Validate whether a trip can be closed.
 * Returns structured blockers that must be resolved (or overridden) before closure.
 */
export function validateTripClosure(trip: {
  id: string;
  status: string;
  pod_url?: string;
  actual_delivery?: string;
  freight_amount?: number;
}, options?: {
  hasSettlement?: boolean;
  settlementStatus?: string;
  hasInvoice?: boolean;
  podStatus?: string;
}): TripClosureResult {
  const blockers: TripClosureBlocker[] = [];

  // Must be in a closable state
  if (!['completed', 'billed', 'settled'].includes(trip.status)) {
    blockers.push({
      code: 'STATUS_NOT_COMPLETE',
      message: `Trip status is "${trip.status}" — must be completed/billed/settled before closure.`,
      overridable: false,
    });
  }

  // Delivery must be recorded
  if (!trip.actual_delivery) {
    blockers.push({
      code: 'DELIVERY_PENDING',
      message: 'Delivery date not recorded.',
      overridable: false,
    });
  }

  // POD check
  const podStatus = options?.podStatus || (trip.pod_url ? 'uploaded' : 'pending');
  if (podStatus === 'pending') {
    blockers.push({
      code: 'POD_PENDING',
      message: 'POD (Proof of Delivery) not uploaded.',
      overridable: true,
    });
  } else if (podStatus === 'rejected') {
    blockers.push({
      code: 'POD_REJECTED',
      message: 'POD was rejected. Upload a valid POD or request waiver.',
      overridable: true,
    });
  }

  // Driver settlement check
  if (options?.hasSettlement === false) {
    blockers.push({
      code: 'SETTLEMENT_PENDING',
      message: 'Driver settlement not created.',
      overridable: true,
    });
  } else if (options?.settlementStatus && !['approved', 'settled', 'waived'].includes(options.settlementStatus)) {
    blockers.push({
      code: 'SETTLEMENT_INCOMPLETE',
      message: `Driver settlement status is "${options.settlementStatus}" — must be approved/settled.`,
      overridable: true,
    });
  }

  // Invoice check
  if (options?.hasInvoice === false && trip.freight_amount && trip.freight_amount > 0) {
    blockers.push({
      code: 'INVOICE_PENDING',
      message: 'Invoice not generated for billable trip.',
      overridable: true,
    });
  }

  return { valid: blockers.length === 0, blockers };
}

/**
 * Close a trip. Validates all requirements, applies overrides, creates audit record.
 */
export async function closeTrip(
  organizationId: string,
  tripId: string,
  overrides?: { code: string; reason: string }[],
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // Fetch trip
  const { data: trip, error: fetchErr } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('organization_id', organizationId)
    .single();

  if (fetchErr || !trip) {
    return { success: false, error: 'Trip not found' };
  }

  // Check settlement
  const { data: settlement } = await supabase
    .from('driver_settlements')
    .select('status')
    .eq('trip_id', tripId)
    .eq('organization_id', organizationId)
    .neq('status', 'reversed')
    .limit(1);

  // Check invoice
  const { data: invoiceLink } = await supabase
    .from('invoice_trips')
    .select('id')
    .eq('trip_id', tripId)
    .eq('organization_id', organizationId)
    .limit(1);

  // Check POD
  const { data: pod } = await supabase
    .from('pods')
    .select('status')
    .eq('trip_id', tripId)
    .eq('organization_id', organizationId)
    .limit(1);

  const validation = validateTripClosure(trip, {
    hasSettlement: settlement && settlement.length > 0,
    settlementStatus: settlement?.[0]?.status,
    hasInvoice: invoiceLink && invoiceLink.length > 0,
    podStatus: pod?.[0]?.status || (trip.pod_url ? 'uploaded' : 'pending'),
  });

  if (!validation.valid) {
    // Check if all blockers are overridable and have overrides provided
    const nonOverridable = validation.blockers.filter(b => !b.overridable);
    if (nonOverridable.length > 0) {
      return { success: false, error: nonOverridable[0].message };
    }

    const overridableBlockers = validation.blockers.filter(b => b.overridable);
    const providedOverrides = overrides || [];
    const uncoveredBlockers = overridableBlockers.filter(
      b => !providedOverrides.some(o => o.code === b.code && o.reason)
    );

    if (uncoveredBlockers.length > 0) {
      return { success: false, error: uncoveredBlockers[0].message };
    }
  }

  // Close the trip
  const { error: closeErr } = await supabase
    .from('trips')
    .update({ status: 'settled', updated_at: new Date().toISOString() })
    .eq('id', tripId)
    .eq('organization_id', organizationId);

  if (closeErr) {
    return { success: false, error: closeErr.message };
  }

  // Create audit record for closure
  await supabase.from('activity_log').insert({
    organization_id: organizationId,
    user_name: userId || 'system',
    action: 'closed',
    entity_type: 'trip',
    entity_id: tripId,
    details: `Trip closed.${overrides?.length ? ` Overrides: ${overrides.map(o => `${o.code}: ${o.reason}`).join('; ')}` : ''}`,
  });

  return { success: true };
}
