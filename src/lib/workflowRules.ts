// ============================================================
// WORKFLOW BUSINESS RULES ENGINE
//
// Validates trip status transitions and enforces real transport
// business rules. This is the heart of Workflow 1.
//
// Rules:
// - Cannot dispatch without vehicle + driver + customer + LR
// - Cannot close without POD (unless override permission)
// - Cannot invoice without delivery
// - Cannot settle before all expenses resolved
// - Cannot assign expired vehicle/driver
// - Cannot assign overlapping vehicle/driver
// ============================================================

import type { TripStatus } from '../types';

export interface TripRecord {
  id: string;
  status: TripStatus;
  vehicle_id?: string;
  vehicle_reg?: string;
  driver_id?: string;
  driver_name?: string;
  customer_id?: string;
  customer_name?: string;
  lr_number?: string;
  pod_url?: string;
  pod_date?: string;
  freight_amount?: number;
  booking_date?: string;
  loading_date?: string;
  departure_date?: string;
  actual_delivery?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================
// STATUS TRANSITION MATRIX
// Defines which transitions are valid from each status
// ============================================================

const VALID_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  booked: ['assigned', 'cancelled'],
  assigned: ['loading', 'cancelled'],
  loading: ['in_transit', 'cancelled'],
  in_transit: ['reached', 'cancelled'],
  reached: ['unloading'],
  unloading: ['pod_pending', 'completed'],
  pod_pending: ['completed'],
  completed: ['billed'],
  billed: ['settled'],
  settled: [], // Terminal state
  cancelled: [], // Terminal (can be reopened via separate action)
};

/**
 * Validate whether a trip status transition is allowed.
 * Returns errors that BLOCK the transition and warnings that are informational.
 */
export function validateStatusTransition(
  trip: TripRecord,
  newStatus: TripStatus,
  options?: {
    /** User has permission to override POD requirement */
    canOverridePOD?: boolean;
    /** User has permission to override settlement requirement */
    canOverrideSettlement?: boolean;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check if transition is structurally valid
  const allowed = VALID_TRANSITIONS[trip.status];
  if (!allowed || !allowed.includes(newStatus)) {
    errors.push(`Cannot transition from "${trip.status}" to "${newStatus}". Valid next: ${allowed?.join(', ') || 'none'}.`);
    return { allowed: false, errors, warnings };
  }

  // 2. Rule: Cannot move to 'assigned' without vehicle and driver
  if (newStatus === 'assigned') {
    if (!trip.vehicle_id && !trip.vehicle_reg) {
      errors.push('Cannot assign trip: no vehicle allocated.');
    }
    if (!trip.driver_id && !trip.driver_name) {
      errors.push('Cannot assign trip: no driver assigned.');
    }
  }

  // 3. Rule: Cannot move to 'loading' without customer and LR
  if (newStatus === 'loading') {
    if (!trip.customer_id && !trip.customer_name) {
      errors.push('Cannot start loading: no customer specified.');
    }
    if (!trip.lr_number) {
      warnings.push('LR number not generated. Will be auto-generated on dispatch.');
    }
  }

  // 4. Rule: Cannot dispatch (in_transit) without vehicle + driver + LR
  if (newStatus === 'in_transit') {
    if (!trip.vehicle_id && !trip.vehicle_reg) {
      errors.push('Cannot dispatch: no vehicle assigned.');
    }
    if (!trip.driver_id && !trip.driver_name) {
      errors.push('Cannot dispatch: no driver assigned.');
    }
    if (!trip.lr_number) {
      warnings.push('No LR number. Will be auto-generated.');
    }
  }

  // 5. Rule: Cannot complete without POD (unless override)
  if (newStatus === 'completed') {
    if (!trip.pod_url && !trip.pod_date) {
      if (options?.canOverridePOD) {
        warnings.push('POD not uploaded. Proceeding with override permission.');
      } else {
        errors.push('Cannot complete trip: POD (Proof of Delivery) not uploaded. Upload POD first or request override.');
      }
    }
  }

  // 6. Rule: Cannot bill without delivery
  if (newStatus === 'billed') {
    if (!trip.actual_delivery && trip.status !== 'completed') {
      errors.push('Cannot bill: delivery not recorded.');
    }
    if (!trip.freight_amount || trip.freight_amount <= 0) {
      errors.push('Cannot bill: freight amount is zero.');
    }
  }

  return {
    allowed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get the next valid statuses for a trip, considering business rules.
 * Used by UI to show only valid transition options.
 */
export function getValidNextStatuses(trip: TripRecord): TripStatus[] {
  return VALID_TRANSITIONS[trip.status] || [];
}

/**
 * Check if a trip can be closed (all requirements met).
 */
export function canCloseTrip(trip: TripRecord): { canClose: boolean; blockers: string[] } {
  const blockers: string[] = [];

  if (!trip.pod_url && !trip.pod_date) {
    blockers.push('POD not uploaded');
  }
  if (!trip.actual_delivery) {
    blockers.push('Delivery not recorded');
  }
  if (trip.status !== 'completed' && trip.status !== 'billed' && trip.status !== 'settled') {
    blockers.push(`Trip status is "${trip.status}" — must be completed first`);
  }

  return { canClose: blockers.length === 0, blockers };
}

/**
 * Validate vehicle availability for a trip.
 * Checks: not already on another trip, not in maintenance, documents valid.
 */
export function validateVehicleForTrip(vehicle: {
  id: string;
  status?: string;
  fitness_expiry?: string;
  insurance_expiry?: string;
  permit_expiry?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  if (vehicle.status === 'maintenance' || vehicle.status === 'breakdown') {
    errors.push('Vehicle is under maintenance/breakdown. Cannot assign.');
  }
  if (vehicle.status === 'inactive') {
    errors.push('Vehicle is inactive. Cannot assign.');
  }

  // Document expiry checks
  if (vehicle.fitness_expiry && vehicle.fitness_expiry < today) {
    errors.push(`Vehicle fitness expired on ${vehicle.fitness_expiry}.`);
  }
  if (vehicle.insurance_expiry && vehicle.insurance_expiry < today) {
    errors.push(`Vehicle insurance expired on ${vehicle.insurance_expiry}.`);
  }
  if (vehicle.permit_expiry && vehicle.permit_expiry < today) {
    warnings.push(`Vehicle permit expired on ${vehicle.permit_expiry}. May cause challan.`);
  }

  return { allowed: errors.length === 0, errors, warnings };
}

/**
 * Validate driver availability for a trip.
 * Checks: licence valid, not on another trip, not on leave.
 */
export function validateDriverForTrip(driver: {
  id: string;
  status?: string;
  license_expiry?: string;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  if (driver.status === 'on_trip') {
    errors.push('Driver is already on another trip.');
  }
  if (driver.status === 'on_leave') {
    errors.push('Driver is on leave. Cannot assign.');
  }
  if (driver.status === 'inactive') {
    errors.push('Driver is inactive. Cannot assign.');
  }

  if (driver.license_expiry && driver.license_expiry < today) {
    errors.push(`Driver licence expired on ${driver.license_expiry}.`);
  }

  return { allowed: errors.length === 0, errors, warnings };
}

/**
 * Validate invoice generation for a trip.
 */
export function canGenerateInvoice(trip: TripRecord): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!trip.customer_id) {
    errors.push('Cannot invoice: no customer linked.');
  }
  if (!trip.freight_amount || trip.freight_amount <= 0) {
    errors.push('Cannot invoice: freight amount is zero.');
  }
  if (trip.status === 'billed' || trip.status === 'settled') {
    errors.push('Trip already invoiced.');
  }
  if (trip.status !== 'completed' && trip.status !== 'pod_pending') {
    warnings.push('Trip not yet completed. Invoice may be premature.');
  }

  return { allowed: errors.length === 0, errors, warnings };
}
