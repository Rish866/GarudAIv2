/**
 * Migration 004 — Mocked Write Abstraction Tests
 *
 * Invokes REAL write abstractions and inspects Supabase payloads:
 *   - baseRepository create/update
 *   - TenantRepository create/update
 *   - useModuleData create/update (via hook logic)
 *   - enquiry→quotation conversion
 *   - quotation→trip conversion
 *
 * Proves:
 *   - Invalid UUID input prevents the Supabase request (requirement 7)
 *   - Sanitizer failures return structured errors (requirement 8)
 *   - sanitizeForTableSafe returns { data: null, errors: [...] } for bad input
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase before importing modules
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockEq3 = vi.fn(() => ({ select: mockSelect }));
const mockEq2 = vi.fn(() => ({ eq: mockEq3 }));
const mockUpdate = vi.fn(() => ({ eq: mockEq2 }));
const mockFrom = vi.fn(() => ({
  insert: mockInsert,
  update: mockUpdate,
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: mockSingle,
      })),
      order: vi.fn(() => ({ data: [], error: null })),
    })),
  })),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: (...args: any[]) => (mockFrom as any)(...args) },
}));


import { createRepository } from '../../src/data/baseRepository';
import { TenantRepository } from '../../src/data/base/tenantRepository';
import { sanitizeForTableSafe } from '../../src/lib/sanitize';

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ORG_ID = '11111111-1111-1111-1111-111111111111';
const RECORD_ID = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  mockSingle.mockResolvedValue({ data: { id: RECORD_ID }, error: null });
});

// ============================================================
// baseRepository create/update
// ============================================================
describe('baseRepository — sanitized write path', () => {
  const repo = createRepository<any>('trips');

  describe('create', () => {
    it('sends sanitized payload (empty string → null)', async () => {
      const result = await repo.create(ORG_ID, {
        customer_id: VALID_UUID,
        vehicle_id: '',  // → null
        driver_id: '   ', // → null
        origin: 'Delhi',
      });
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('trips');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: VALID_UUID,
          vehicle_id: null,
          driver_id: null,
          origin: 'Delhi',
          organization_id: ORG_ID,
        })
      );
    });

    it('rejects invalid UUID without calling Supabase', async () => {
      const result = await repo.create(ORG_ID, {
        customer_id: 'not-a-valid-uuid',
        origin: 'Delhi',
      });
      expect(result.error).toContain('invalid UUID');
      expect(result.data).toBeNull();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('rejects number in UUID field without calling Supabase', async () => {
      const result = await repo.create(ORG_ID, {
        customer_id: 12345,
      });
      expect(result.error).toContain('expected string or null');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('rejects boolean in UUID field', async () => {
      const result = await repo.create(ORG_ID, {
        vehicle_id: true,
      });
      expect(result.error).toContain('expected string or null');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('rejects array in UUID field', async () => {
      const result = await repo.create(ORG_ID, {
        driver_id: ['abc'],
      });
      expect(result.error).toContain('expected string or null');
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('rejects object in UUID field', async () => {
      const result = await repo.create(ORG_ID, {
        quotation_id: { id: 'x' },
      });
      expect(result.error).toContain('expected string or null');
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('sends sanitized payload', async () => {
      const result = await repo.update(ORG_ID, RECORD_ID, {
        vehicle_id: VALID_UUID,
        driver_id: '',
      });
      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle_id: VALID_UUID,
          driver_id: null,
        })
      );
    });

    it('rejects invalid UUID in update', async () => {
      const result = await repo.update(ORG_ID, RECORD_ID, {
        vehicle_id: 'bad-uuid',
      });
      expect(result.error).toContain('invalid UUID');
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});


// ============================================================
// TenantRepository create/update
// ============================================================
describe('TenantRepository — sanitized write path', () => {
  const repo = new TenantRepository<any>('expenses');

  describe('create', () => {
    it('sends sanitized payload (empty → null)', async () => {
      const result = await repo.create({
        trip_id: '',
        vehicle_id: VALID_UUID,
        amount: 5000,
        organization_id: ORG_ID,
      } as any, ORG_ID);
      expect(result.error).toBeNull();
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          trip_id: null,
          vehicle_id: VALID_UUID,
          amount: 5000,
        })
      );
    });

    it('rejects invalid UUID without calling Supabase', async () => {
      const result = await repo.create({
        trip_id: 'invalid',
        organization_id: ORG_ID,
      } as any, ORG_ID);
      expect(result.error).toContain('invalid UUID');
      expect(result.data).toBeNull();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('sends sanitized payload', async () => {
      const result = await repo.update(RECORD_ID, {
        vehicle_id: VALID_UUID,
        trip_id: '  ',
      } as any, ORG_ID);
      expect(result.error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle_id: VALID_UUID,
          trip_id: null,
        })
      );
    });

    it('rejects number in UUID field', async () => {
      const result = await repo.update(RECORD_ID, {
        trip_id: 999,
      } as any, ORG_ID);
      expect(result.error).toContain('expected string or null');
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});


// ============================================================
// useModuleData create/update (logic path, not hook rendering)
// Tests the sanitizeForTableSafe path that useModuleData uses
// ============================================================
describe('useModuleData write path (sanitizeForTableSafe)', () => {
  describe('create', () => {
    it('sanitizes empty strings to null', () => {
      const { data, errors } = sanitizeForTableSafe('trips', {
        customer_id: VALID_UUID,
        vehicle_id: '',
        driver_id: '   ',
        organization_id: ORG_ID,
        origin: 'Delhi',
      });
      expect(errors).toHaveLength(0);
      expect(data).not.toBeNull();
      expect(data!.customer_id).toBe(VALID_UUID);
      expect(data!.vehicle_id).toBeNull();
      expect(data!.driver_id).toBeNull();
      expect(data!.origin).toBe('Delhi');
    });

    it('returns structured error for invalid UUID', () => {
      const { data, errors } = sanitizeForTableSafe('trips', {
        customer_id: 'not-a-uuid',
        organization_id: ORG_ID,
      });
      expect(data).toBeNull();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].field).toBe('customer_id');
      expect(errors[0].message).toContain('invalid UUID');
    });

    it('returns structured error for number input', () => {
      const { data, errors } = sanitizeForTableSafe('expenses', {
        trip_id: 42,
        organization_id: ORG_ID,
      });
      expect(data).toBeNull();
      expect(errors[0].field).toBe('trip_id');
      expect(errors[0].message).toContain('expected string or null');
    });

    it('returns structured error for boolean input', () => {
      const { data, errors } = sanitizeForTableSafe('fuel_entries', {
        vehicle_id: false,
      });
      expect(data).toBeNull();
      expect(errors[0].message).toContain('boolean');
    });

    it('returns structured error for array input', () => {
      const { data, errors } = sanitizeForTableSafe('payments', {
        invoice_id: ['uuid1', 'uuid2'],
      });
      expect(data).toBeNull();
      expect(errors[0].message).toContain('array');
    });

    it('returns structured error for object input', () => {
      const { data, errors } = sanitizeForTableSafe('quotations', {
        enquiry_id: { nested: true },
      });
      expect(data).toBeNull();
      expect(errors[0].message).toContain('object');
    });
  });

  describe('update — sanitized patch for local state', () => {
    it('returns sanitized data for UI state agreement', () => {
      const { data, errors } = sanitizeForTableSafe('vehicles', {
        driver_id: '',
        model: 'Tata Ace',
      });
      expect(errors).toHaveLength(0);
      expect(data!.driver_id).toBeNull();
      expect(data!.model).toBe('Tata Ace');
    });
  });
});


// ============================================================
// enquiry→quotation conversion
// ============================================================
describe('enquiryRepository.convertToQuotation — sanitized path', () => {
  it('rejects invalid customer_id from enquiry data', async () => {
    // Mock the enquiry fetch to return invalid customer_id
    const mockEnquirySingle = vi.fn().mockResolvedValue({
      data: {
        id: RECORD_ID,
        customer_id: 'not-a-uuid', // invalid
        customer_name: 'Test',
        origin: 'Delhi',
        destination: 'Mumbai',
        vehicle_type: 'truck',
        material: 'cement',
        weight_tons: 10,
        target_rate: 50000,
        organization_id: ORG_ID,
      },
      error: null,
    });
    const mockEnquiryEq2 = vi.fn(() => ({ single: mockEnquirySingle }));
    const mockEnquiryEq1 = vi.fn(() => ({ eq: mockEnquiryEq2 }));
    const mockEnquirySelect = vi.fn(() => ({ eq: mockEnquiryEq1 }));
    mockFrom.mockImplementation(((table: string) => {
      if (table === 'enquiries') {
        return { select: mockEnquirySelect };
      }
      return {
        insert: mockInsert,
        update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn() })) })),
      };
    }) as any);

    // Import after mock setup
    const { enquiryRepository } = await import('../../src/data/enquiries/enquiryRepository');
    const result = await enquiryRepository.convertToQuotation(ORG_ID, RECORD_ID);

    expect(result.error).toContain('invalid UUID');
    expect(result.data).toBeNull();
    // Supabase insert should NOT have been called
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ============================================================
// quotation→trip conversion
// ============================================================
describe('quotationRepository.convertToTrip — sanitized path', () => {
  it('rejects invalid enquiry_id from quotation data', async () => {
    const mockQuotSingle = vi.fn().mockResolvedValue({
      data: {
        id: RECORD_ID,
        enquiry_id: 'bad-id', // invalid
        customer_id: VALID_UUID,
        customer_name: 'Test',
        origin: 'Delhi',
        destination: 'Mumbai',
        vehicle_type: 'truck',
        material: 'cement',
        weight_tons: 10,
        total_amount: 55000,
        rate: 50000,
        organization_id: ORG_ID,
      },
      error: null,
    });
    const mockQuotEq2 = vi.fn(() => ({ single: mockQuotSingle }));
    const mockQuotEq1 = vi.fn(() => ({ eq: mockQuotEq2 }));
    const mockQuotSelect = vi.fn(() => ({ eq: mockQuotEq1 }));
    mockFrom.mockImplementation(((table: string) => {
      if (table === 'quotations') {
        return {
          select: mockQuotSelect,
          update: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn() })) })),
        };
      }
      return { insert: mockInsert };
    }) as any);

    const { quotationRepository } = await import('../../src/data/quotations/quotationRepository');
    const result = await quotationRepository.convertToTrip(ORG_ID, RECORD_ID);

    expect(result.error).toContain('invalid UUID');
    expect(result.data).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
