// ============================================================
// WORKFLOW 1 INTEGRATION TESTS
// Tests the complete Enquiry → Payment chain
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateStatusTransition, validateVehicleForTrip, validateDriverForTrip, validateCustomerCredit, canGenerateInvoice, canCloseTrip } from '../../src/lib/workflowRules';
import { validateTripClosure, canConvertQuotation } from '../../src/lib/workflowService';

// ============================================================
// FULL WORKFLOW CHAIN TEST
// ============================================================

describe('Workflow 1: Complete Enquiry → Payment Chain', () => {
  const orgId = 'org-001';

  // Simulate the complete chain with validation at each step
  const enquiry = {
    id: 'enq-001',
    organization_id: orgId,
    customer_id: 'cust-001',
    customer_name: 'Patel Logistics',
    origin: 'Mumbai',
    destination: 'Pune',
    material: 'Steel Coils',
    weight_tons: 20,
    vehicle_type: 'trailer',
    target_rate: 45000,
    status: 'new',
  };

  const quotation = {
    id: 'quot-001',
    organization_id: orgId,
    enquiry_id: 'enq-001',
    customer_id: 'cust-001',
    customer_name: 'Patel Logistics',
    origin: 'Mumbai',
    destination: 'Pune',
    material: 'Steel Coils',
    weight_tons: 20,
    vehicle_type: 'trailer',
    rate: 45000,
    rate_type: 'per_trip',
    status: 'approved',
    validity_days: 7,
    created_at: new Date().toISOString(),
    revision_number: 1,
    is_current_revision: true,
    converted_vehicles: 0,
  };

  const vehicle = {
    id: 'veh-001',
    status: 'available',
    fitness_expiry: '2027-12-31',
    insurance_expiry: '2027-06-30',
    permit_expiry: '2027-03-31',
  };

  const driver = {
    id: 'drv-001',
    status: 'available',
    license_expiry: '2028-12-31',
  };

  const customer = {
    id: 'cust-001',
    name: 'Patel Logistics',
    credit_limit: 500000,
    outstanding: 100000,
    status: 'active',
  };

  const trip = {
    id: 'trip-001',
    status: 'booked' as const,
    indent_id: 'ind-001',
    quotation_id: 'quot-001',
    enquiry_id: 'enq-001',
    customer_id: 'cust-001',
    customer_name: 'Patel Logistics',
    vehicle_id: 'veh-001',
    vehicle_reg: 'MH12AB1234',
    driver_id: 'drv-001',
    driver_name: 'Rajesh Kumar',
    lr_number: 'LR-MUM-2026-000001',
    freight_amount: 45000,
    pod_url: undefined as string | undefined,
    pod_date: undefined as string | undefined,
    actual_delivery: undefined as string | undefined,
    booking_date: '2026-07-15',
  };

  describe('Step 1: Quotation Approval Check', () => {
    it('approved quotation can be converted', () => {
      const result = canConvertQuotation(quotation);
      expect(result.allowed).toBe(true);
    });

    it('draft quotation cannot be converted', () => {
      const result = canConvertQuotation({ ...quotation, status: 'draft' });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Only approved');
    });

    it('rejected quotation cannot be converted', () => {
      const result = canConvertQuotation({ ...quotation, status: 'rejected' });
      expect(result.allowed).toBe(false);
    });

    it('expired quotation cannot be converted', () => {
      const expired = { ...quotation, created_at: '2020-01-01T00:00:00Z', validity_days: 7 };
      const result = canConvertQuotation(expired);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('expired');
    });
  });

  describe('Step 2: Vehicle and Driver Validation', () => {
    it('available vehicle with valid docs passes', () => {
      const result = validateVehicleForTrip(vehicle);
      expect(result.allowed).toBe(true);
    });

    it('available driver with valid licence passes', () => {
      const result = validateDriverForTrip(driver);
      expect(result.allowed).toBe(true);
    });

    it('expired vehicle is blocked', () => {
      const result = validateVehicleForTrip({ ...vehicle, fitness_expiry: '2020-01-01' });
      expect(result.allowed).toBe(false);
    });

    it('busy driver is blocked', () => {
      const result = validateDriverForTrip({ ...driver, status: 'on_trip' });
      expect(result.allowed).toBe(false);
    });
  });

  describe('Step 3: Credit Block Check', () => {
    it('customer within limit passes', () => {
      const result = validateCustomerCredit(customer, 45000);
      expect(result.allowed).toBe(true);
    });

    it('customer over limit is blocked', () => {
      const overCustomer = { ...customer, outstanding: 490000 };
      const result = validateCustomerCredit(overCustomer, 45000);
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('Credit limit exceeded');
    });
  });

  describe('Step 4: Trip Status Flow', () => {
    it('booked → assigned (with vehicle + driver)', () => {
      const result = validateStatusTransition(trip, 'assigned');
      expect(result.allowed).toBe(true);
    });

    it('assigned → loading', () => {
      const assigned = { ...trip, status: 'assigned' as const };
      const result = validateStatusTransition(assigned, 'loading');
      expect(result.allowed).toBe(true);
    });

    it('loading → in_transit (dispatch)', () => {
      const loading = { ...trip, status: 'loading' as const };
      const result = validateStatusTransition(loading, 'in_transit');
      expect(result.allowed).toBe(true);
    });

    it('in_transit → reached (delivery)', () => {
      const inTransit = { ...trip, status: 'in_transit' as const };
      const result = validateStatusTransition(inTransit, 'reached');
      expect(result.allowed).toBe(true);
    });

    it('pod_pending → completed (with POD)', () => {
      const podPending = { ...trip, status: 'pod_pending' as const, pod_url: 'pod.jpg', pod_date: '2026-07-16' };
      const result = validateStatusTransition(podPending, 'completed');
      expect(result.allowed).toBe(true);
    });

    it('pod_pending → completed (without POD, no override)', () => {
      const podPending = { ...trip, status: 'pod_pending' as const };
      const result = validateStatusTransition(podPending, 'completed');
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('POD');
    });
  });

  describe('Step 5: Invoice Generation', () => {
    it('completed trip with freight can be invoiced', () => {
      const completed = { ...trip, status: 'completed' as const };
      const result = canGenerateInvoice(completed);
      expect(result.allowed).toBe(true);
    });

    it('already billed trip cannot be invoiced again', () => {
      const billed = { ...trip, status: 'billed' as const };
      const result = canGenerateInvoice(billed);
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('already invoiced');
    });

    it('trip with zero freight cannot be invoiced', () => {
      const zeroFreight = { ...trip, status: 'completed' as const, freight_amount: 0 };
      const result = canGenerateInvoice(zeroFreight);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Step 6: Trip Closure', () => {
    it('completed trip with all requirements met can close', () => {
      const completedTrip = { ...trip, status: 'completed', actual_delivery: '2026-07-16', pod_url: 'pod.jpg' };
      const result = validateTripClosure(completedTrip, {
        hasSettlement: true,
        settlementStatus: 'settled',
        hasInvoice: true,
        podStatus: 'verified',
      });
      expect(result.valid).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('trip without POD has overridable blocker', () => {
      const noPod = { ...trip, status: 'completed', actual_delivery: '2026-07-16' };
      const result = validateTripClosure(noPod, {
        hasSettlement: true,
        settlementStatus: 'settled',
        hasInvoice: true,
        podStatus: 'pending',
      });
      expect(result.valid).toBe(false);
      expect(result.blockers.find(b => b.code === 'POD_PENDING')).toBeDefined();
      expect(result.blockers.find(b => b.code === 'POD_PENDING')?.overridable).toBe(true);
    });

    it('trip without settlement has overridable blocker', () => {
      const noSettlement = { ...trip, status: 'completed', actual_delivery: '2026-07-16', pod_url: 'pod.jpg' };
      const result = validateTripClosure(noSettlement, {
        hasSettlement: false,
        hasInvoice: true,
        podStatus: 'verified',
      });
      expect(result.valid).toBe(false);
      expect(result.blockers.find(b => b.code === 'SETTLEMENT_PENDING')).toBeDefined();
    });

    it('trip without invoice for billable trip has overridable blocker', () => {
      const noInvoice = { ...trip, status: 'completed', actual_delivery: '2026-07-16', pod_url: 'pod.jpg' };
      const result = validateTripClosure(noInvoice, {
        hasSettlement: true,
        settlementStatus: 'settled',
        hasInvoice: false,
        podStatus: 'verified',
      });
      expect(result.valid).toBe(false);
      expect(result.blockers.find(b => b.code === 'INVOICE_PENDING')).toBeDefined();
    });

    it('booked trip has non-overridable status blocker', () => {
      const result = validateTripClosure(trip, {
        hasSettlement: true,
        settlementStatus: 'settled',
        hasInvoice: true,
        podStatus: 'verified',
      });
      expect(result.valid).toBe(false);
      expect(result.blockers.find(b => b.code === 'STATUS_NOT_COMPLETE')?.overridable).toBe(false);
    });

    it('trip without delivery has non-overridable blocker', () => {
      const noDelivery = { ...trip, status: 'completed' };
      const result = validateTripClosure(noDelivery, {
        hasSettlement: true,
        settlementStatus: 'settled',
        hasInvoice: true,
        podStatus: 'verified',
      });
      expect(result.valid).toBe(false);
      expect(result.blockers.find(b => b.code === 'DELIVERY_PENDING')?.overridable).toBe(false);
    });
  });
});

// ============================================================
// FAILURE TESTS — Invalid Operations
// ============================================================

describe('Workflow 1: Invalid Operations (Rejection Tests)', () => {
  it('cannot skip from booked directly to in_transit', () => {
    const trip = { id: 't1', status: 'booked' as const, vehicle_id: 'v1', vehicle_reg: 'MH01', driver_id: 'd1', driver_name: 'A', customer_id: 'c1', lr_number: 'LR1', freight_amount: 1000 };
    const result = validateStatusTransition(trip, 'in_transit');
    expect(result.allowed).toBe(false);
  });

  it('cannot assign trip without vehicle', () => {
    const trip = { id: 't1', status: 'booked' as const, driver_id: 'd1', driver_name: 'A', customer_id: 'c1', freight_amount: 1000 };
    const result = validateStatusTransition(trip, 'assigned');
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('no vehicle');
  });

  it('cannot dispatch without driver', () => {
    const trip = { id: 't1', status: 'loading' as const, vehicle_id: 'v1', vehicle_reg: 'MH01', customer_id: 'c1', freight_amount: 1000 };
    const result = validateStatusTransition(trip, 'in_transit');
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('no driver');
  });

  it('cannot assign expired vehicle', () => {
    const result = validateVehicleForTrip({ id: 'v1', status: 'available', fitness_expiry: '2020-01-01' });
    expect(result.allowed).toBe(false);
  });

  it('cannot assign driver with expired licence', () => {
    const result = validateDriverForTrip({ id: 'd1', status: 'available', license_expiry: '2020-01-01' });
    expect(result.allowed).toBe(false);
  });

  it('cannot create trip for blocked customer', () => {
    const result = validateCustomerCredit({ id: 'c1', name: 'X', status: 'blocked', credit_limit: 100000, outstanding: 0 });
    expect(result.allowed).toBe(false);
  });

  it('cannot invoice trip with no customer', () => {
    const result = canGenerateInvoice({ id: 't1', status: 'completed' as const, freight_amount: 1000 });
    expect(result.allowed).toBe(false);
  });

  it('expired quotation cannot be converted', () => {
    const result = canConvertQuotation({ status: 'approved', validity_days: 7, created_at: '2020-01-01T00:00:00Z' });
    expect(result.allowed).toBe(false);
  });

  it('draft quotation cannot be converted', () => {
    const result = canConvertQuotation({ status: 'draft' });
    expect(result.allowed).toBe(false);
  });
});
