/**
 * Migration 004 — Real useModuleData Hook Test
 *
 * Renders the real hook with mocked OrganizationContext and Supabase.
 * Invokes actual create() and update() callbacks.
 * Proves:
 *   - Sanitized payloads reach Supabase (empty string → null)
 *   - Invalid UUIDs prevent Supabase calls and return structured errors
 *   - update() applies the sanitized patch to local state ('' → null in UI)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// --- Supabase mock ---
const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockUpdateEq2 = vi.fn(() => ({ data: null, error: null }));
const mockUpdateEq1 = vi.fn(() => ({ eq: mockUpdateEq2 }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq1 }));
const mockOrder = vi.fn(() => ({ data: [], error: null }));
const mockSelectAllEq = vi.fn(() => ({ order: mockOrder }));
const mockSelectAll = vi.fn(() => ({ eq: mockSelectAllEq }));
const mockFrom = vi.fn(() => ({
  select: mockSelectAll,
  insert: mockInsert,
  update: mockUpdate,
  delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })) })),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => (mockFrom as any)(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// --- OrganizationContext mock ---
const ORG_ID = '11111111-1111-1111-1111-111111111111';

vi.mock('../../src/contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    organizationId: ORG_ID,
    loading: false,
    organization: { id: ORG_ID, name: 'Test Org' },
    membership: null,
    role: 'organization_owner',
    permissions: [],
    error: null,
    refreshOrganization: vi.fn(),
  }),
  OrganizationProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Import after mocks
import { useModuleData } from '../../src/hooks/useModuleData';

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const RECORD_ID = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  // Default: select returns empty array, insert/update succeed
  mockOrder.mockReturnValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: { id: RECORD_ID, organization_id: ORG_ID }, error: null });
  mockUpdateEq2.mockResolvedValue({ data: null, error: null });
});


// ============================================================
// create() — sanitized payloads reach Supabase
// ============================================================
describe('useModuleData.create() — real hook', () => {
  it('sends sanitized payload to Supabase (empty string → null)', async () => {
    const { result } = renderHook(() => useModuleData<any>('trips'));

    // Wait for initial load to finish
    await waitFor(() => expect(result.current.loading).toBe(false));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.create({
        customer_id: VALID_UUID,
        vehicle_id: '',   // should become null
        driver_id: '   ', // should become null
        origin: 'Delhi',
      });
    });

    expect(createResult.error).toBeNull();
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

  it('rejects invalid UUID — Supabase NOT called, structured error returned', async () => {
    const { result } = renderHook(() => useModuleData<any>('trips'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.create({
        customer_id: 'not-a-valid-uuid',
        origin: 'Delhi',
      });
    });

    expect(createResult.error).toContain('invalid UUID');
    expect(createResult.data).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects number in UUID field — structured error', async () => {
    const { result } = renderHook(() => useModuleData<any>('expenses'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.create({ trip_id: 12345 });
    });

    expect(createResult.error).toContain('expected string or null');
    expect(createResult.data).toBeNull();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects boolean in UUID field — structured error', async () => {
    const { result } = renderHook(() => useModuleData<any>('trips'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.create({ vehicle_id: true });
    });

    expect(createResult.error).toContain('expected string or null');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects array in UUID field — structured error', async () => {
    const { result } = renderHook(() => useModuleData<any>('payments'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.create({ invoice_id: ['a', 'b'] });
    });

    expect(createResult.error).toContain('array');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects object in UUID field — structured error', async () => {
    const { result } = renderHook(() => useModuleData<any>('quotations'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.create({ enquiry_id: { nested: true } });
    });

    expect(createResult.error).toContain('object');
    expect(mockInsert).not.toHaveBeenCalled();
  });
});


// ============================================================
// update() — sanitized patch reaches Supabase AND local state
// ============================================================
describe('useModuleData.update() — real hook', () => {
  it('sends sanitized payload to Supabase (empty → null)', async () => {
    // Pre-seed local state with one record
    mockOrder.mockReturnValueOnce({
      data: [{ id: RECORD_ID, organization_id: ORG_ID, driver_id: VALID_UUID, model: 'Tata Ace' }],
      error: null,
    });
    mockUpdateEq2.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useModuleData<any>('vehicles'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Verify initial data loaded
    expect(result.current.data).toHaveLength(1);

    let updateResult: any;
    await act(async () => {
      updateResult = await result.current.update(RECORD_ID, {
        driver_id: '',  // should become null in payload AND local state
        model: 'Ashok Leyland',
      });
    });

    expect(updateResult.error).toBeNull();
    // Supabase received sanitized payload
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        driver_id: null,
        model: 'Ashok Leyland',
      })
    );
  });

  it('local state uses sanitized patch (empty → null, DB/UI agree)', async () => {
    mockOrder.mockReturnValueOnce({
      data: [{ id: RECORD_ID, organization_id: ORG_ID, driver_id: VALID_UUID, model: 'Tata Ace' }],
      error: null,
    });
    mockUpdateEq2.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHook(() => useModuleData<any>('vehicles'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update(RECORD_ID, {
        driver_id: '   ', // whitespace → null
      });
    });

    // Local state reflects sanitized value (null), not raw input ('   ')
    const updatedItem = result.current.data.find((d: any) => d.id === RECORD_ID);
    expect(updatedItem).toBeDefined();
    expect(updatedItem.driver_id).toBeNull();
  });

  it('rejects invalid UUID — Supabase NOT called, structured error', async () => {
    mockOrder.mockReturnValueOnce({
      data: [{ id: RECORD_ID, organization_id: ORG_ID, driver_id: VALID_UUID }],
      error: null,
    });

    const { result } = renderHook(() => useModuleData<any>('vehicles'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let updateResult: any;
    await act(async () => {
      updateResult = await result.current.update(RECORD_ID, {
        driver_id: 'not-a-uuid',
      });
    });

    expect(updateResult.error).toContain('invalid UUID');
    expect(mockUpdate).not.toHaveBeenCalled();
    // Local state should NOT have changed
    const item = result.current.data.find((d: any) => d.id === RECORD_ID);
    expect(item.driver_id).toBe(VALID_UUID);
  });

  it('rejects number in UUID field on update', async () => {
    mockOrder.mockReturnValueOnce({
      data: [{ id: RECORD_ID, organization_id: ORG_ID, trip_id: null }],
      error: null,
    });

    const { result } = renderHook(() => useModuleData<any>('expenses'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let updateResult: any;
    await act(async () => {
      updateResult = await result.current.update(RECORD_ID, { trip_id: 999 });
    });

    expect(updateResult.error).toContain('expected string or null');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
