import { describe, it, expect } from 'vitest';
import {
  sanitizeForTable,
  sanitizeUuidFields,
  validateUuidField,
  UUID_REFERENCE_COLUMNS,
  ALL_UUID_COLUMNS,
  UUID_REGEX,
} from '../../src/lib/sanitize';

// ============================================================
// Fix 1: Inventory-driven sanitization (only 22 UUID columns affected)
// ============================================================

describe('sanitizeForTable — inventory-driven behavior', () => {
  const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const VALID_UUID_UPPER = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890';

  describe('converts empty/whitespace to null ONLY for approved UUID columns', () => {
    it('trips.customer_id: empty string → null', () => {
      const result = sanitizeForTable('trips', { customer_id: '', origin: '' });
      expect(result.customer_id).toBeNull();
    });

    it('trips.vehicle_id: whitespace → null', () => {
      const result = sanitizeForTable('trips', { vehicle_id: '   ' });
      expect(result.vehicle_id).toBeNull();
    });

    it('trips.driver_id: empty → null', () => {
      const result = sanitizeForTable('trips', { driver_id: '' });
      expect(result.driver_id).toBeNull();
    });

    it('trips.quotation_id: empty → null', () => {
      const result = sanitizeForTable('trips', { quotation_id: '' });
      expect(result.quotation_id).toBeNull();
    });

    it('trips.enquiry_id: empty → null', () => {
      const result = sanitizeForTable('trips', { enquiry_id: '' });
      expect(result.enquiry_id).toBeNull();
    });

    it('expenses.trip_id: empty → null', () => {
      const result = sanitizeForTable('expenses', { trip_id: '' });
      expect(result.trip_id).toBeNull();
    });

    it('expenses.vehicle_id: empty → null', () => {
      const result = sanitizeForTable('expenses', { vehicle_id: '' });
      expect(result.vehicle_id).toBeNull();
    });

    it('fuel_entries.vehicle_id: empty → null', () => {
      const result = sanitizeForTable('fuel_entries', { vehicle_id: '' });
      expect(result.vehicle_id).toBeNull();
    });

    it('fuel_entries.driver_id: empty → null', () => {
      const result = sanitizeForTable('fuel_entries', { driver_id: '' });
      expect(result.driver_id).toBeNull();
    });

    it('fuel_entries.trip_id: empty → null', () => {
      const result = sanitizeForTable('fuel_entries', { trip_id: '' });
      expect(result.trip_id).toBeNull();
    });

    it('invoices.customer_id: empty → null', () => {
      const result = sanitizeForTable('invoices', { customer_id: '' });
      expect(result.customer_id).toBeNull();
    });

    it('payments.customer_id: empty → null', () => {
      const result = sanitizeForTable('payments', { customer_id: '' });
      expect(result.customer_id).toBeNull();
    });

    it('payments.invoice_id: empty → null', () => {
      const result = sanitizeForTable('payments', { invoice_id: '' });
      expect(result.invoice_id).toBeNull();
    });

    it('quotations.enquiry_id: empty → null', () => {
      const result = sanitizeForTable('quotations', { enquiry_id: '' });
      expect(result.enquiry_id).toBeNull();
    });

    it('quotations.customer_id: empty → null', () => {
      const result = sanitizeForTable('quotations', { customer_id: '' });
      expect(result.customer_id).toBeNull();
    });

    it('maintenance_records.vehicle_id: empty → null', () => {
      const result = sanitizeForTable('maintenance_records', { vehicle_id: '' });
      expect(result.vehicle_id).toBeNull();
    });

    it('tyres.vehicle_id: empty → null', () => {
      const result = sanitizeForTable('tyres', { vehicle_id: '' });
      expect(result.vehicle_id).toBeNull();
    });

    it('vehicles.driver_id: empty → null', () => {
      const result = sanitizeForTable('vehicles', { driver_id: '' });
      expect(result.driver_id).toBeNull();
    });

    it('drivers.assigned_vehicle_id: empty → null', () => {
      const result = sanitizeForTable('drivers', { assigned_vehicle_id: '' });
      expect(result.assigned_vehicle_id).toBeNull();
    });

    it('enquiries.customer_id: empty → null', () => {
      const result = sanitizeForTable('enquiries', { customer_id: '' });
      expect(result.customer_id).toBeNull();
    });

    it('eway_bills.trip_id: empty → null', () => {
      const result = sanitizeForTable('eway_bills', { trip_id: '' });
      expect(result.trip_id).toBeNull();
    });

    it('eway_bills.transporter_id: empty → null', () => {
      const result = sanitizeForTable('eway_bills', { transporter_id: '' });
      expect(result.transporter_id).toBeNull();
    });
  });

  describe('does NOT modify unrelated TEXT fields', () => {
    it('trips: origin empty string remains empty', () => {
      const result = sanitizeForTable('trips', { origin: '', customer_id: '' });
      expect(result.origin).toBe('');
      expect(result.customer_id).toBeNull();
    });

    it('trips: customer_name empty string remains empty', () => {
      const result = sanitizeForTable('trips', { customer_name: '', customer_id: VALID_UUID });
      expect(result.customer_name).toBe('');
      expect(result.customer_id).toBe(VALID_UUID);
    });

    it('expenses: description empty string remains empty', () => {
      const result = sanitizeForTable('expenses', { description: '', trip_id: '' });
      expect(result.description).toBe('');
      expect(result.trip_id).toBeNull();
    });

    it('fuel_entries: station empty string remains empty', () => {
      const result = sanitizeForTable('fuel_entries', { station: '', vehicle_id: VALID_UUID });
      expect(result.station).toBe('');
    });

    it('invoices: invoice_number empty stays empty', () => {
      const result = sanitizeForTable('invoices', { invoice_number: '', customer_id: '' });
      expect(result.invoice_number).toBe('');
      expect(result.customer_id).toBeNull();
    });

    it('payments: reference_number empty stays empty', () => {
      const result = sanitizeForTable('payments', { reference_number: '', invoice_id: VALID_UUID });
      expect(result.reference_number).toBe('');
    });

    it('unknown table: no fields modified', () => {
      const result = sanitizeForTable('unknown_table', { some_id: '', name: '' });
      expect(result.some_id).toBe('');
      expect(result.name).toBe('');
    });
  });

  describe('preserves valid UUIDs (case-insensitive)', () => {
    it('lowercase UUID unchanged', () => {
      const result = sanitizeForTable('trips', { customer_id: VALID_UUID });
      expect(result.customer_id).toBe(VALID_UUID);
    });

    it('uppercase UUID accepted (Fix 11)', () => {
      const result = sanitizeForTable('trips', { customer_id: VALID_UUID_UPPER });
      expect(result.customer_id).toBe(VALID_UUID_UPPER);
    });
  });

  describe('rejects invalid UUID values before API request (Fix 6)', () => {
    it('throws on non-UUID non-empty string', () => {
      expect(() => sanitizeForTable('trips', { customer_id: 'not-a-uuid' }))
        .toThrow(/invalid UUID/i);
    });

    it('throws on partial UUID', () => {
      expect(() => sanitizeForTable('trips', { customer_id: 'a1b2c3d4-e5f6' }))
        .toThrow(/invalid UUID/i);
    });

    it('throws on numeric string', () => {
      expect(() => sanitizeForTable('expenses', { trip_id: '12345' }))
        .toThrow(/invalid UUID/i);
    });
  });

  describe('preserves null and non-string values', () => {
    it('null stays null', () => {
      const result = sanitizeForTable('trips', { customer_id: null });
      expect(result.customer_id).toBeNull();
    });

    it('numbers unchanged', () => {
      const result = sanitizeForTable('expenses', { amount: 5000, trip_id: VALID_UUID });
      expect(result.amount).toBe(5000);
    });

    it('booleans unchanged', () => {
      const result = sanitizeForTable('expenses', { approved: true, trip_id: null });
      expect(result.approved).toBe(true);
    });
  });

  describe('does not mutate original object', () => {
    it('returns a new object', () => {
      const original = { customer_id: '', name: 'Test' };
      const result = sanitizeForTable('trips', original);
      expect(original.customer_id).toBe('');
      expect(result.customer_id).toBeNull();
    });
  });
});

// ============================================================
// Fix 5: Direct conversion workflow tests
// ============================================================

describe('sanitizeForTable — conversion workflow payloads', () => {
  const ORG = '11111111-1111-1111-1111-111111111111';
  const CUST = '22222222-2222-2222-2222-222222222222';
  const VEH = '33333333-3333-3333-3333-333333333333';
  const DRV = '44444444-4444-4444-4444-444444444444';
  const ENQ = '55555555-5555-5555-5555-555555555555';

  it('enquiry→quotation: customer_id and enquiry_id sanitized', () => {
    const quotation = {
      organization_id: ORG,
      enquiry_id: ENQ,
      customer_id: CUST,
      customer_name: 'Test Customer',
      origin: 'Delhi',
      destination: 'Mumbai',
      status: 'draft',
    };
    const result = sanitizeForTable('quotations', quotation);
    expect(result.enquiry_id).toBe(ENQ);
    expect(result.customer_id).toBe(CUST);
    expect(result.customer_name).toBe('Test Customer');
  });

  it('quotation→trip: all FK fields sanitized, text fields preserved', () => {
    const trip = {
      organization_id: ORG,
      quotation_id: ENQ, // reusing UUID for test
      enquiry_id: null,  // optional, null is valid
      customer_id: CUST,
      customer_name: 'Test',
      vehicle_id: '',    // not yet assigned — becomes null
      driver_id: '',     // not yet assigned — becomes null
      origin: 'Delhi',
      freight_amount: 50000,
      status: 'booked',
    };
    const result = sanitizeForTable('trips', trip);
    expect(result.quotation_id).toBe(ENQ);
    expect(result.enquiry_id).toBeNull();
    expect(result.customer_id).toBe(CUST);
    expect(result.vehicle_id).toBeNull();
    expect(result.driver_id).toBeNull();
    expect(result.customer_name).toBe('Test');
    expect(result.origin).toBe('Delhi');
    expect(result.freight_amount).toBe(50000);
  });

  it('fuel entry: vehicle + driver validated, trip optional', () => {
    const fuel = {
      vehicle_id: VEH,
      driver_id: DRV,
      trip_id: '',  // no trip — becomes null
      litres: 100,
      station: '',  // TEXT field — stays empty
    };
    const result = sanitizeForTable('fuel_entries', fuel);
    expect(result.vehicle_id).toBe(VEH);
    expect(result.driver_id).toBe(DRV);
    expect(result.trip_id).toBeNull();
    expect(result.station).toBe('');
  });
});

// ============================================================
// Inventory completeness
// ============================================================

describe('UUID_REFERENCE_COLUMNS inventory', () => {
  it('contains exactly 12 tables', () => {
    expect(Object.keys(UUID_REFERENCE_COLUMNS)).toHaveLength(12);
  });

  it('total columns = 22', () => {
    const total = Object.values(UUID_REFERENCE_COLUMNS).reduce((sum, set) => sum + set.size, 0);
    expect(total).toBe(22);
  });

  it('ALL_UUID_COLUMNS has correct unique count', () => {
    // Some column names appear in multiple tables (e.g. vehicle_id)
    // ALL_UUID_COLUMNS is a Set of unique names
    expect(ALL_UUID_COLUMNS.size).toBeGreaterThan(0);
    expect(ALL_UUID_COLUMNS.size).toBeLessThanOrEqual(22);
  });
});

// ============================================================
// Fix 11: UUID regex accepts uppercase
// ============================================================

describe('UUID_REGEX — case-insensitive', () => {
  it('matches lowercase', () => expect(UUID_REGEX.test('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true));
  it('matches uppercase', () => expect(UUID_REGEX.test('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(true));
  it('matches mixed case', () => expect(UUID_REGEX.test('A1b2C3d4-E5f6-7890-AbCd-Ef1234567890')).toBe(true));
  it('rejects empty', () => expect(UUID_REGEX.test('')).toBe(false));
  it('rejects garbage', () => expect(UUID_REGEX.test('not-uuid')).toBe(false));
});

// ============================================================
// Fix 6: validateUuidField used in production write path
// ============================================================

describe('validateUuidField', () => {
  it('null → valid (no error)', () => expect(validateUuidField('x', null)).toBeNull());
  it('undefined → valid', () => expect(validateUuidField('x', undefined)).toBeNull());
  it('empty string → valid (will be sanitized)', () => expect(validateUuidField('x', '')).toBeNull());
  it('whitespace → valid (will be sanitized)', () => expect(validateUuidField('x', '  ')).toBeNull());
  it('valid UUID → valid', () => expect(validateUuidField('x', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBeNull());
  it('invalid string → error message', () => {
    const err = validateUuidField('customer_id', 'bad');
    expect(err).toContain('customer_id');
    expect(err).toContain('invalid UUID');
  });
  it('number → error message', () => {
    const err = validateUuidField('x', 123);
    expect(err).toContain('expected string or null');
  });
});
