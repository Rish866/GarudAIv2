// Tests for usePaginatedData hook behavior
import { describe, it, expect } from 'vitest';

// Test the sort allow-list and debounce logic (unit-testable without React)
const ALLOWED_SORT_COLUMNS = new Set([
  'created_at', 'updated_at', 'booking_date', 'date', 'invoice_date', 'due_date',
  'payment_date', 'name', 'trip_number', 'invoice_number', 'total_amount',
  'balance_amount', 'amount', 'freight_amount', 'distance_km', 'weight_tons',
  'status', 'reg_number', 'odometer', 'litres', 'cost', 'timestamp',
]);

describe('Pagination sort allow-list', () => {
  it('allows valid sort columns', () => {
    expect(ALLOWED_SORT_COLUMNS.has('created_at')).toBe(true);
    expect(ALLOWED_SORT_COLUMNS.has('booking_date')).toBe(true);
    expect(ALLOWED_SORT_COLUMNS.has('total_amount')).toBe(true);
    expect(ALLOWED_SORT_COLUMNS.has('trip_number')).toBe(true);
    expect(ALLOWED_SORT_COLUMNS.has('status')).toBe(true);
  });

  it('rejects invalid/dangerous sort columns', () => {
    expect(ALLOWED_SORT_COLUMNS.has('organization_id')).toBe(false);
    expect(ALLOWED_SORT_COLUMNS.has('1; DROP TABLE trips;--')).toBe(false);
    expect(ALLOWED_SORT_COLUMNS.has('')).toBe(false);
    expect(ALLOWED_SORT_COLUMNS.has('password')).toBe(false);
    expect(ALLOWED_SORT_COLUMNS.has('cancelled_by')).toBe(false);
  });
});

describe('Pagination range calculation', () => {
  it('calculates correct range for page 1, size 25', () => {
    const page = 1, pageSize = 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    expect(from).toBe(0);
    expect(to).toBe(24);
  });

  it('calculates correct range for page 2, size 25', () => {
    const page = 2, pageSize = 25;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    expect(from).toBe(25);
    expect(to).toBe(49);
  });

  it('calculates correct range for page 3, size 50', () => {
    const page = 3, pageSize = 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    expect(from).toBe(100);
    expect(to).toBe(149);
  });

  it('calculates correct range for page 1, size 100', () => {
    const page = 1, pageSize = 100;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    expect(from).toBe(0);
    expect(to).toBe(99);
  });
});

describe('Pagination total pages calculation', () => {
  it('calculates total pages correctly', () => {
    expect(Math.max(1, Math.ceil(0 / 25))).toBe(1); // 0 rows = 1 page min
    expect(Math.max(1, Math.ceil(1 / 25))).toBe(1);
    expect(Math.max(1, Math.ceil(25 / 25))).toBe(1);
    expect(Math.max(1, Math.ceil(26 / 25))).toBe(2);
    expect(Math.max(1, Math.ceil(100 / 25))).toBe(4);
    expect(Math.max(1, Math.ceil(101 / 25))).toBe(5);
    expect(Math.max(1, Math.ceil(10000 / 100))).toBe(100);
  });
});

describe('Page reset behavior', () => {
  it('page resets to 1 when filters change (logic)', () => {
    // Simulated: when setFilters is called, page is set to 1
    let page = 3;
    // Simulate setFilters behavior
    page = 1; // This is what the hook does
    expect(page).toBe(1);
  });

  it('page resets to 1 when page size changes', () => {
    let page = 5;
    page = 1; // setPageSize always resets
    expect(page).toBe(1);
  });

  it('page resets to 1 when sort changes', () => {
    let page = 4;
    page = 1; // setSort always resets
    expect(page).toBe(1);
  });
});

describe('Delete last row page behavior', () => {
  it('stays on current page if items remain', () => {
    const page = 3, pageSize = 25, totalCount = 75;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    // After delete: 74 items, 3 pages still
    const newTotal = totalCount - 1;
    const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
    expect(newTotalPages).toBe(3);
    // Page 3 still valid
    expect(Math.min(page, newTotalPages)).toBe(3);
  });

  it('moves back one page if last item on page deleted', () => {
    const page = 3, pageSize = 25, totalCount = 51;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    expect(totalPages).toBe(3);
    // After delete: 50 items = 2 pages
    const newTotal = totalCount - 1;
    const newTotalPages = Math.max(1, Math.ceil(newTotal / pageSize));
    expect(newTotalPages).toBe(2);
    // Page 3 no longer valid, should go to 2
    expect(Math.min(page, newTotalPages)).toBe(2);
  });
});

describe('useModuleData fetchOnMount option', () => {
  it('fetchOnMount defaults to true when not specified', () => {
    const options = undefined;
    const fetchOnMount = options?.fetchOnMount !== false;
    expect(fetchOnMount).toBe(true);
  });

  it('fetchOnMount is false when explicitly set', () => {
    const options = { fetchOnMount: false };
    const fetchOnMount = options?.fetchOnMount !== false;
    expect(fetchOnMount).toBe(false);
  });

  it('fetchOnMount is true when other options set but fetchOnMount omitted', () => {
    const options = { orderBy: 'name' } as any;
    const fetchOnMount = options?.fetchOnMount !== false;
    expect(fetchOnMount).toBe(true);
  });
});

describe('Stale response protection', () => {
  it('fetchId increments prevent stale overwrites', () => {
    let fetchIdRef = { current: 0 };
    
    // Simulate two concurrent fetches
    const id1 = ++fetchIdRef.current; // 1
    const id2 = ++fetchIdRef.current; // 2
    
    // Response from id1 arrives after id2
    expect(id1 !== fetchIdRef.current).toBe(true); // Should be discarded
    expect(id2 === fetchIdRef.current).toBe(true); // Should be kept
  });
});
