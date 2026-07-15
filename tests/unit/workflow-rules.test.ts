// Tests for Workflow 1 Business Rules Engine
import { describe, it, expect } from 'vitest';
import {
  validateStatusTransition,
  getValidNextStatuses,
  canCloseTrip,
  validateVehicleForTrip,
  validateDriverForTrip,
  validateCustomerCredit,
  canGenerateInvoice,
} from '../../src/lib/workflowRules';

const baseTripRecord = {
  id: 'trip-1',
  status: 'booked' as const,
  vehicle_id: 'v-1',
  vehicle_reg: 'MH12AB1234',
  driver_id: 'd-1',
  driver_name: 'Rajesh',
  customer_id: 'c-1',
  customer_name: 'ABC Transport',
  lr_number: 'LR-2026-001',
  freight_amount: 25000,
};

describe('validateStatusTransition', () => {
  describe('valid transitions', () => {
    it('booked → assigned (with vehicle and driver)', () => {
      const result = validateStatusTransition(baseTripRecord, 'assigned');
      expect(result.allowed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('assigned → loading', () => {
      const trip = { ...baseTripRecord, status: 'assigned' as const };
      const result = validateStatusTransition(trip, 'loading');
      expect(result.allowed).toBe(true);
    });

    it('loading → in_transit', () => {
      const trip = { ...baseTripRecord, status: 'loading' as const };
      const result = validateStatusTransition(trip, 'in_transit');
      expect(result.allowed).toBe(true);
    });

    it('in_transit → reached', () => {
      const trip = { ...baseTripRecord, status: 'in_transit' as const };
      const result = validateStatusTransition(trip, 'reached');
      expect(result.allowed).toBe(true);
    });
  });

  describe('invalid transitions', () => {
    it('booked → in_transit (skips assigned/loading)', () => {
      const result = validateStatusTransition(baseTripRecord, 'in_transit');
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('Cannot transition');
    });

    it('completed → booked (backward)', () => {
      const trip = { ...baseTripRecord, status: 'completed' as const };
      const result = validateStatusTransition(trip, 'booked');
      expect(result.allowed).toBe(false);
    });

    it('settled → anything (terminal)', () => {
      const trip = { ...baseTripRecord, status: 'settled' as const };
      const result = validateStatusTransition(trip, 'completed');
      expect(result.allowed).toBe(false);
    });

    it('cancelled → anything (terminal)', () => {
      const trip = { ...baseTripRecord, status: 'cancelled' as const };
      const result = validateStatusTransition(trip, 'booked');
      expect(result.allowed).toBe(false);
    });
  });

  describe('business rules', () => {
    it('cannot assign without vehicle', () => {
      const trip = { ...baseTripRecord, vehicle_id: undefined, vehicle_reg: undefined };
      const result = validateStatusTransition(trip, 'assigned');
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('no vehicle');
    });

    it('cannot assign without driver', () => {
      const trip = { ...baseTripRecord, driver_id: undefined, driver_name: undefined };
      const result = validateStatusTransition(trip, 'assigned');
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('no driver');
    });

    it('cannot dispatch without vehicle', () => {
      const trip = { ...baseTripRecord, status: 'loading' as const, vehicle_id: undefined, vehicle_reg: undefined };
      const result = validateStatusTransition(trip, 'in_transit');
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('no vehicle');
    });

    it('cannot complete without POD', () => {
      const trip = { ...baseTripRecord, status: 'pod_pending' as const, pod_url: undefined, pod_date: undefined };
      const result = validateStatusTransition(trip, 'completed');
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('POD');
    });

    it('can complete without POD with override permission', () => {
      const trip = { ...baseTripRecord, status: 'pod_pending' as const, pod_url: undefined, pod_date: undefined };
      const result = validateStatusTransition(trip, 'completed', { canOverridePOD: true });
      expect(result.allowed).toBe(true);
      expect(result.warnings[0]).toContain('override');
    });

    it('cannot bill with zero freight', () => {
      const trip = { ...baseTripRecord, status: 'completed' as const, freight_amount: 0 };
      const result = validateStatusTransition(trip, 'billed');
      expect(result.allowed).toBe(false);
      expect(result.errors[0]).toContain('freight amount is zero');
    });

    it('can cancel from any active status', () => {
      const statuses = ['booked', 'assigned', 'loading', 'in_transit'] as const;
      statuses.forEach(status => {
        const trip = { ...baseTripRecord, status };
        const result = validateStatusTransition(trip, 'cancelled');
        expect(result.allowed, `Should allow cancel from ${status}`).toBe(true);
      });
    });
  });
});

describe('getValidNextStatuses', () => {
  it('booked can go to assigned or cancelled', () => {
    expect(getValidNextStatuses({ ...baseTripRecord, status: 'booked' })).toEqual(['assigned', 'cancelled']);
  });

  it('in_transit can go to reached or cancelled', () => {
    expect(getValidNextStatuses({ ...baseTripRecord, status: 'in_transit' })).toEqual(['reached', 'cancelled']);
  });

  it('settled has no next states', () => {
    expect(getValidNextStatuses({ ...baseTripRecord, status: 'settled' })).toEqual([]);
  });
});

describe('validateVehicleForTrip', () => {
  it('available vehicle with valid docs passes', () => {
    const result = validateVehicleForTrip({
      id: 'v-1',
      status: 'available',
      fitness_expiry: '2027-12-31',
      insurance_expiry: '2027-06-30',
      permit_expiry: '2027-03-31',
    });
    expect(result.allowed).toBe(true);
  });

  it('vehicle in maintenance fails', () => {
    const result = validateVehicleForTrip({ id: 'v-1', status: 'maintenance' });
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('maintenance');
  });

  it('expired fitness fails', () => {
    const result = validateVehicleForTrip({
      id: 'v-1',
      status: 'available',
      fitness_expiry: '2020-01-01',
    });
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('fitness expired');
  });

  it('expired insurance fails', () => {
    const result = validateVehicleForTrip({
      id: 'v-1',
      status: 'available',
      insurance_expiry: '2020-01-01',
    });
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('insurance expired');
  });
});

describe('validateDriverForTrip', () => {
  it('available driver with valid licence passes', () => {
    const result = validateDriverForTrip({
      id: 'd-1',
      status: 'available',
      license_expiry: '2028-12-31',
    });
    expect(result.allowed).toBe(true);
  });

  it('driver on trip fails', () => {
    const result = validateDriverForTrip({ id: 'd-1', status: 'on_trip' });
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('already on another trip');
  });

  it('expired licence fails', () => {
    const result = validateDriverForTrip({
      id: 'd-1',
      status: 'available',
      license_expiry: '2020-01-01',
    });
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('licence expired');
  });
});

describe('canGenerateInvoice', () => {
  it('completed trip with freight can be invoiced', () => {
    const trip = { ...baseTripRecord, status: 'completed' as const };
    const result = canGenerateInvoice(trip);
    expect(result.allowed).toBe(true);
  });

  it('already billed trip cannot be invoiced again', () => {
    const trip = { ...baseTripRecord, status: 'billed' as const };
    const result = canGenerateInvoice(trip);
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('already invoiced');
  });

  it('trip without customer cannot be invoiced', () => {
    const trip = { ...baseTripRecord, status: 'completed' as const, customer_id: undefined };
    const result = canGenerateInvoice(trip);
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('no customer');
  });

  it('trip with zero freight cannot be invoiced', () => {
    const trip = { ...baseTripRecord, status: 'completed' as const, freight_amount: 0 };
    const result = canGenerateInvoice(trip);
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('freight amount is zero');
  });
});

describe('canCloseTrip', () => {
  it('completed trip with POD and delivery can close', () => {
    const trip = { ...baseTripRecord, status: 'completed' as const, pod_url: 'file.jpg', actual_delivery: '2026-07-15' };
    const { canClose, blockers } = canCloseTrip(trip);
    expect(canClose).toBe(true);
    expect(blockers).toHaveLength(0);
  });

  it('trip without POD cannot close', () => {
    const trip = { ...baseTripRecord, status: 'completed' as const, actual_delivery: '2026-07-15' };
    const { canClose, blockers } = canCloseTrip(trip);
    expect(canClose).toBe(false);
    expect(blockers[0]).toContain('POD');
  });

  it('trip without delivery cannot close', () => {
    const trip = { ...baseTripRecord, status: 'completed' as const, pod_url: 'file.jpg' };
    const { canClose, blockers } = canCloseTrip(trip);
    expect(canClose).toBe(false);
    expect(blockers[0]).toContain('Delivery');
  });
});



describe('validateCustomerCredit', () => {
  it('customer below limit is allowed', () => {
    const result = validateCustomerCredit(
      { id: 'c-1', name: 'ABC', credit_limit: 500000, outstanding: 100000, status: 'active' },
      50000
    );
    expect(result.allowed).toBe(true);
  });

  it('customer at 80% limit shows warning', () => {
    const result = validateCustomerCredit(
      { id: 'c-1', name: 'ABC', credit_limit: 500000, outstanding: 350000, status: 'active' },
      60000
    );
    expect(result.allowed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('credit utilisation');
  });

  it('customer over limit is blocked', () => {
    const result = validateCustomerCredit(
      { id: 'c-1', name: 'ABC', credit_limit: 500000, outstanding: 480000, status: 'active' },
      50000
    );
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('Credit limit exceeded');
  });

  it('blocked customer is rejected', () => {
    const result = validateCustomerCredit(
      { id: 'c-1', name: 'XYZ', credit_limit: 1000000, outstanding: 0, status: 'blocked' }
    );
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('blocked');
  });

  it('inactive customer is rejected', () => {
    const result = validateCustomerCredit(
      { id: 'c-1', name: 'XYZ', credit_limit: 1000000, outstanding: 0, status: 'inactive' }
    );
    expect(result.allowed).toBe(false);
    expect(result.errors[0]).toContain('inactive');
  });

  it('customer with no credit limit passes', () => {
    const result = validateCustomerCredit(
      { id: 'c-1', name: 'DEF', credit_limit: 0, outstanding: 500000, status: 'active' },
      100000
    );
    expect(result.allowed).toBe(true); // No limit = unlimited
  });
});
