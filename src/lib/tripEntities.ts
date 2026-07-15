// ============================================================
// TRIP ENTITIES — Persistent LR, POD, and Driver Settlement
//
// These services replace inline string-based handling with real
// database entities. Each entity has its own lifecycle and status.
// ============================================================

import { supabase } from './supabase';

// ============================================================
// LR (CONSIGNMENT NOTE) SERVICE
// ============================================================

export interface LRRecord {
  id: string;
  organization_id: string;
  branch_id?: string;
  trip_id: string;
  lr_number: string;
  consignor_name?: string;
  consignee_name?: string;
  material?: string;
  package_count?: number;
  declared_weight?: number;
  eway_bill_number?: string;
  status: 'active' | 'locked' | 'amended';
  generated_at?: string;
  locked_at?: string;
}

/**
 * Generate and persist an LR record for a trip.
 * Uses database RPC for concurrency-safe number generation.
 * Idempotent: returns existing LR if one already exists for the trip.
 */
export async function generateLR(
  organizationId: string,
  tripId: string,
  lrData: {
    lr_number?: string; // Ignored when RPC is available — DB generates number
    branch_id?: string;
    consignor_name?: string;
    consignee_name?: string;
    material?: string;
    package_count?: number;
    declared_weight?: number;
    eway_bill_number?: string;
  }
): Promise<{ success: boolean; lr?: LRRecord; isExisting?: boolean; error?: string }> {
  // Try database RPC first (concurrency-safe, generates number)
  const { data: rpcResult, error: rpcError } = await supabase.rpc('generate_lr_for_trip', {
    p_organization_id: organizationId,
    p_branch_id: lrData.branch_id || null,
    p_trip_id: tripId,
    p_consignor_name: lrData.consignor_name || null,
    p_consignee_name: lrData.consignee_name || null,
    p_material: lrData.material || null,
    p_package_count: lrData.package_count || 0,
    p_declared_weight: lrData.declared_weight || 0,
    p_eway_bill_number: lrData.eway_bill_number || null,
  });

  if (!rpcError && rpcResult && rpcResult.success) {
    return {
      success: true,
      lr: { id: rpcResult.lr_id, lr_number: rpcResult.lr_number, organization_id: organizationId, trip_id: tripId, status: 'active' } as LRRecord,
      isExisting: rpcResult.is_existing || false,
    };
  }

  // Fallback: direct insert if RPC doesn't exist yet (pre-migration-007)
  // This path uses the frontend-provided lr_number as a safe fallback
  const { data: existing } = await supabase
    .from('lrs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, lr: existing[0] as LRRecord, isExisting: true };
  }

  const fallbackNumber = lrData.lr_number || `LR-${Date.now().toString(36).toUpperCase()}`;
  const { data: created, error } = await supabase
    .from('lrs')
    .insert({
      organization_id: organizationId,
      trip_id: tripId,
      lr_number: fallbackNumber,
      branch_id: lrData.branch_id || null,
      consignor_name: lrData.consignor_name,
      consignee_name: lrData.consignee_name,
      material: lrData.material,
      package_count: lrData.package_count || 0,
      declared_weight: lrData.declared_weight || 0,
      eway_bill_number: lrData.eway_bill_number,
      status: 'active',
      generated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('lrs')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trip_id', tripId)
        .single();
      return { success: true, lr: retry as LRRecord, isExisting: true };
    }
    // If lrs table doesn't exist yet (pre-migration), fail gracefully
    return { success: false, error: `LR creation failed: ${error.message}` };
  }

  return { success: true, lr: created as LRRecord, isExisting: false };
}

/**
 * Lock an LR (after dispatch). Locked LRs cannot be edited.
 */
export async function lockLR(
  organizationId: string,
  lrId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('lrs')
    .update({ status: 'locked', locked_at: new Date().toISOString() })
    .eq('id', lrId)
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get LR for a trip.
 */
export async function getLRForTrip(
  organizationId: string,
  tripId: string
): Promise<LRRecord | null> {
  const { data } = await supabase
    .from('lrs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId)
    .limit(1)
    .single();
  return data as LRRecord | null;
}

// ============================================================
// POD (PROOF OF DELIVERY) SERVICE
// ============================================================

export interface PODRecord {
  id: string;
  organization_id: string;
  trip_id: string;
  file_path?: string;
  file_name?: string;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected' | 'waived';
  uploaded_at?: string;
  delivery_at?: string;
  received_by?: string;
  remarks?: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  waiver_reason?: string;
}

/**
 * Upload and persist a POD record.
 */
export async function uploadPOD(
  organizationId: string,
  tripId: string,
  podData: {
    file_path: string;
    file_name: string;
    file_type?: string;
    delivery_at?: string;
    received_by?: string;
    remarks?: string;
  }
): Promise<{ success: boolean; pod?: PODRecord; error?: string }> {
  const { data, error } = await supabase
    .from('pods')
    .insert({
      organization_id: organizationId,
      trip_id: tripId,
      ...podData,
      status: 'uploaded',
      uploaded_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    // Unique constraint = POD already exists for this trip
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('pods')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trip_id', tripId)
        .single();
      return { success: true, pod: existing as PODRecord };
    }
    return { success: false, error: error.message };
  }

  // Also update trip.pod_url for backward compat
  await supabase
    .from('trips')
    .update({ pod_url: podData.file_path, pod_date: podData.delivery_at || new Date().toISOString().split('T')[0] })
    .eq('id', tripId)
    .eq('organization_id', organizationId);

  return { success: true, pod: data as PODRecord };
}

/**
 * Verify a POD.
 */
export async function verifyPOD(
  organizationId: string,
  podId: string,
  verifiedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('pods')
    .update({ status: 'verified', verified_by: verifiedBy, verified_at: new Date().toISOString() })
    .eq('id', podId)
    .eq('organization_id', organizationId)
    .eq('status', 'uploaded');

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Reject a POD.
 */
export async function rejectPOD(
  organizationId: string,
  podId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason) return { success: false, error: 'Rejection reason required' };
  const { error } = await supabase
    .from('pods')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', podId)
    .eq('organization_id', organizationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get authoritative POD state for a trip.
 * This is the SINGLE source of truth for POD status — do not use trip.pod_url for business decisions.
 */
export async function getTripPODState(
  organizationId: string,
  tripId: string
): Promise<{
  status: 'pending' | 'uploaded' | 'verified' | 'rejected' | 'waived';
  pod: PODRecord | null;
  satisfiesBilling: boolean;
  satisfiesClosure: boolean;
}> {
  const pod = await getPODForTrip(organizationId, tripId);

  if (!pod) {
    return { status: 'pending', pod: null, satisfiesBilling: false, satisfiesClosure: false };
  }

  const status = pod.status as 'pending' | 'uploaded' | 'verified' | 'rejected' | 'waived';
  const satisfiesBilling = status === 'verified' || status === 'waived';
  const satisfiesClosure = status === 'verified' || status === 'waived';

  return { status, pod, satisfiesBilling, satisfiesClosure };
}

/**
 * Waive POD requirement. Requires special permission and reason.
 */
export async function waivePOD(
  organizationId: string,
  podId: string | null,
  tripId: string,
  reason: string,
  waivedBy: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'Waiver reason must be at least 5 characters' };
  }

  if (podId) {
    // Waive existing POD record
    const { error } = await supabase
      .from('pods')
      .update({
        status: 'waived',
        waiver_reason: reason,
        waived_by: waivedBy,
        waived_at: new Date().toISOString(),
      })
      .eq('id', podId)
      .eq('organization_id', organizationId);

    if (error) return { success: false, error: error.message };
  } else {
    // Create a waived POD record (no file uploaded, directly waived)
    const { error } = await supabase
      .from('pods')
      .insert({
        organization_id: organizationId,
        trip_id: tripId,
        status: 'waived',
        waiver_reason: reason,
        waived_by: waivedBy,
        waived_at: new Date().toISOString(),
      });

    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get POD for a trip.
 */
export async function getPODForTrip(
  organizationId: string,
  tripId: string
): Promise<PODRecord | null> {
  const { data } = await supabase
    .from('pods')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data as PODRecord | null;
}

// ============================================================
// DRIVER SETTLEMENT SERVICE
// ============================================================

export interface DriverSettlementRecord {
  id: string;
  organization_id: string;
  trip_id: string;
  driver_id: string;
  opening_advance: number;
  additional_advance: number;
  diesel_cash: number;
  toll_cash: number;
  loading_cash: number;
  unloading_cash: number;
  bata: number;
  parking: number;
  repair_cash: number;
  miscellaneous: number;
  total_admissible: number;
  recoverable_amount: number;
  payable_amount: number;
  status: 'draft' | 'submitted' | 'approved' | 'settled' | 'reversed' | 'waived';
}

/**
 * Create or get a draft driver settlement for a trip.
 */
export async function getOrCreateSettlement(
  organizationId: string,
  tripId: string,
  driverId: string
): Promise<{ success: boolean; settlement?: DriverSettlementRecord; isExisting?: boolean; error?: string }> {
  // Check existing non-reversed settlement
  const { data: existing } = await supabase
    .from('driver_settlements')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId)
    .neq('status', 'reversed')
    .limit(1);

  if (existing && existing.length > 0) {
    return { success: true, settlement: existing[0] as DriverSettlementRecord, isExisting: true };
  }

  // Create draft
  const { data, error } = await supabase
    .from('driver_settlements')
    .insert({
      organization_id: organizationId,
      trip_id: tripId,
      driver_id: driverId,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint — fetch existing
      const { data: retry } = await supabase
        .from('driver_settlements')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('trip_id', tripId)
        .neq('status', 'reversed')
        .single();
      return { success: true, settlement: retry as DriverSettlementRecord, isExisting: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true, settlement: data as DriverSettlementRecord, isExisting: false };
}

/**
 * Update settlement amounts (only in draft/submitted status).
 */
export async function updateSettlement(
  organizationId: string,
  settlementId: string,
  amounts: Partial<Pick<DriverSettlementRecord,
    'opening_advance' | 'additional_advance' | 'diesel_cash' | 'toll_cash' |
    'loading_cash' | 'unloading_cash' | 'bata' | 'parking' | 'repair_cash' | 'miscellaneous'
  >>
): Promise<{ success: boolean; error?: string }> {
  // Calculate totals
  const totalExpenses = Object.values(amounts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const totalAdvance = (Number(amounts.opening_advance) || 0) + (Number(amounts.additional_advance) || 0);
  const admissible = totalExpenses - totalAdvance;
  const payable = admissible > 0 ? admissible : 0;
  const recoverable = admissible < 0 ? Math.abs(admissible) : 0;

  const { error } = await supabase
    .from('driver_settlements')
    .update({
      ...amounts,
      total_admissible: admissible,
      payable_amount: payable,
      recoverable_amount: recoverable,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settlementId)
    .eq('organization_id', organizationId)
    .in('status', ['draft', 'submitted']);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Submit settlement for approval.
 */
export async function submitSettlement(
  organizationId: string,
  settlementId: string,
  submittedBy?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('driver_settlements')
    .update({ status: 'submitted', submitted_by: submittedBy, submitted_at: new Date().toISOString() })
    .eq('id', settlementId)
    .eq('organization_id', organizationId)
    .eq('status', 'draft');

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Approve settlement.
 */
export async function approveSettlement(
  organizationId: string,
  settlementId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('driver_settlements')
    .update({ status: 'approved', approved_by: approvedBy, approved_at: new Date().toISOString() })
    .eq('id', settlementId)
    .eq('organization_id', organizationId)
    .eq('status', 'submitted');

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get settlement status for a trip (for closure validation).
 */
export async function getSettlementForTrip(
  organizationId: string,
  tripId: string
): Promise<DriverSettlementRecord | null> {
  const { data } = await supabase
    .from('driver_settlements')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId)
    .neq('status', 'reversed')
    .limit(1)
    .single();
  return data as DriverSettlementRecord | null;
}

// ============================================================
// PROFITABILITY CALCULATION
// ============================================================

export interface TripProfitability {
  revenue: number;
  directCost: number;
  grossProfit: number;
  netProfit: number;
  marginPercentage: number;
  completeness: 'complete' | 'incomplete' | 'estimated';
  missingInputs: string[];
  calculatedAt: string;
}

/**
 * Calculate trip profitability from linked real data.
 */
export async function calculateTripProfitability(
  organizationId: string,
  tripId: string
): Promise<TripProfitability> {
  const missingInputs: string[] = [];

  // Revenue from trip/invoice
  const { data: trip } = await supabase
    .from('trips')
    .select('freight_amount, detention_charges, other_charges')
    .eq('id', tripId)
    .eq('organization_id', organizationId)
    .single();

  const revenue = (trip?.freight_amount || 0) + (trip?.detention_charges || 0) + (trip?.other_charges || 0);
  if (!trip || revenue === 0) missingInputs.push('Trip revenue');

  // Fuel cost
  const { data: fuelEntries } = await supabase
    .from('fuel_entries')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId);

  const fuelCost = (fuelEntries || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
  if (!fuelEntries || fuelEntries.length === 0) missingInputs.push('Fuel entries');

  // Expenses linked to trip
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId);

  const expenseCost = (expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  // Driver settlement
  const { data: settlement } = await supabase
    .from('driver_settlements')
    .select('total_admissible')
    .eq('organization_id', organizationId)
    .eq('trip_id', tripId)
    .neq('status', 'reversed')
    .limit(1);

  const driverCost = settlement?.[0]?.total_admissible || 0;
  if (!settlement || settlement.length === 0) missingInputs.push('Driver settlement');

  const directCost = fuelCost + expenseCost + driverCost;
  const grossProfit = revenue - directCost;
  const marginPercentage = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

  const completeness = missingInputs.length === 0
    ? 'complete'
    : missingInputs.length <= 1
    ? 'estimated'
    : 'incomplete';

  return {
    revenue,
    directCost,
    grossProfit,
    netProfit: grossProfit, // Net = gross for now (no overhead allocation)
    marginPercentage,
    completeness,
    missingInputs,
    calculatedAt: new Date().toISOString(),
  };
}
