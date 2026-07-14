// usePaginatedData — Server-side paginated data fetching for high-volume modules
//
// Provides: .range() pagination, count: 'exact', multi-column search,
// status/date/branch filters, sorting, page size control.
//
// All filtering is applied BEFORE .range() — never loads all rows client-side.
// Organization isolation enforced on every query via organization_id.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { resolveTableName, fromDatabaseRecord } from '../lib/legacyTableAdapter';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';
export type PageSize = 25 | 50 | 100;

export interface PaginationFilter {
  /** Exact match filters (status, branch_id, etc.) */
  eq?: Record<string, string | number | boolean>;
  /** ILIKE search across multiple columns (OR'd) */
  search?: { columns: string[]; query: string };
  /** Date range filter: { column, from?, to? } */
  dateRange?: { column: string; from?: string; to?: string };
  /** Greater than or equal */
  gte?: Record<string, string | number>;
  /** Less than or equal */
  lte?: Record<string, string | number>;
  /** Not equal */
  neq?: Record<string, string | number | boolean>;
}

export interface PaginatedDataResult<T> {
  // Data
  data: T[];
  totalCount: number;
  totalPages: number;

  // Pagination state
  page: number;
  pageSize: PageSize;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;

  // Sort
  sortBy: string;
  sortDirection: SortDirection;
  setSort: (column: string, direction?: SortDirection) => void;

  // Filters
  filters: PaginationFilter;
  setFilters: (filters: PaginationFilter) => void;
  resetFilters: () => void;

  // States
  loading: boolean;
  error: string | null;
  organizationId: string | null;
  isOrgReady: boolean;

  // Actions
  refresh: () => Promise<void>;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsePaginatedDataOptions {
  /** Default sort column (default: 'created_at') */
  defaultSort?: string;
  /** Default sort direction (default: 'desc') */
  defaultSortDirection?: SortDirection;
  /** Default page size (default: 25) */
  defaultPageSize?: PageSize;
  /** Whether to fetch data (default: true) */
  enabled?: boolean;
  /** Select specific columns (default: '*') */
  select?: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePaginatedData<T extends { id: string }>(
  tableName: string,
  options?: UsePaginatedDataOptions
): PaginatedDataResult<T> {
  const { organizationId, loading: orgLoading } = useOrganization();
  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState<PageSize>(options?.defaultPageSize || 25);
  const [sortBy, setSortBy] = useState(options?.defaultSort || 'created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>(options?.defaultSortDirection || 'desc');
  const [filters, setFiltersRaw] = useState<PaginationFilter>({});

  const enabled = options?.enabled !== false;
  const isOrgReady = !orgLoading && !!organizationId;
  const databaseTableName = resolveTableName(tableName);
  const selectColumns = options?.select || '*';

  // Ref to track the latest fetch request (prevents stale responses)
  const fetchIdRef = useRef(0);

  // Computed
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // ─── Fetch function ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!organizationId || !enabled) {
      setData([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const currentFetchId = ++fetchIdRef.current;

    try {
      // Calculate range
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query with count
      let query = supabase
        .from(databaseTableName)
        .select(selectColumns, { count: 'exact' })
        .eq('organization_id', organizationId);

      // Apply exact-match filters
      if (filters.eq) {
        for (const [col, val] of Object.entries(filters.eq)) {
          if (val !== '' && val !== undefined && val !== null) {
            query = query.eq(col, val);
          }
        }
      }

      // Apply not-equal filters
      if (filters.neq) {
        for (const [col, val] of Object.entries(filters.neq)) {
          if (val !== '' && val !== undefined && val !== null) {
            query = query.neq(col, val);
          }
        }
      }

      // Apply search (ILIKE across multiple columns, OR'd)
      if (filters.search && filters.search.query.trim()) {
        const searchTerm = `%${filters.search.query.trim()}%`;
        const orConditions = filters.search.columns
          .map(col => `${col}.ilike.${searchTerm}`)
          .join(',');
        query = query.or(orConditions);
      }

      // Apply date range
      if (filters.dateRange) {
        const { column, from: dateFrom, to: dateTo } = filters.dateRange;
        if (dateFrom) {
          query = query.gte(column, dateFrom);
        }
        if (dateTo) {
          query = query.lte(column, dateTo);
        }
      }

      // Apply gte filters
      if (filters.gte) {
        for (const [col, val] of Object.entries(filters.gte)) {
          if (val !== '' && val !== undefined && val !== null) {
            query = query.gte(col, val);
          }
        }
      }

      // Apply lte filters
      if (filters.lte) {
        for (const [col, val] of Object.entries(filters.lte)) {
          if (val !== '' && val !== undefined && val !== null) {
            query = query.lte(col, val);
          }
        }
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortDirection === 'asc' });

      // Apply pagination range
      query = query.range(from, to);

      const { data: result, error: fetchError, count } = await query;

      // Discard stale responses
      if (currentFetchId !== fetchIdRef.current) return;

      if (fetchError) {
        setError(fetchError.message);
        setData([]);
        setTotalCount(0);
      } else {
        const rows = ((result as unknown as T[]) || [])
          .filter(Boolean)
          .map(row => fromDatabaseRecord(tableName, row as Record<string, unknown>) as T);
        setData(rows);
        setTotalCount(count ?? 0);
        setError(null);
      }
    } catch (e: any) {
      if (currentFetchId !== fetchIdRef.current) return;
      setError(e.message || 'Failed to fetch data');
      setData([]);
      setTotalCount(0);
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [organizationId, databaseTableName, tableName, selectColumns, enabled, page, pageSize, sortBy, sortDirection, filters]);

  // ─── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!orgLoading) fetchData();
  }, [orgLoading, fetchData]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const setPage = useCallback((newPage: number) => {
    setPageRaw(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const setPageSize = useCallback((size: PageSize) => {
    setPageSizeRaw(size);
    setPageRaw(1); // Reset to page 1 when page size changes
  }, []);

  const setSort = useCallback((column: string, direction?: SortDirection) => {
    if (column === sortBy && !direction) {
      // Toggle direction
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection(direction || 'desc');
    }
    setPageRaw(1); // Reset to page 1 when sort changes
  }, [sortBy]);

  const setFilters = useCallback((newFilters: PaginationFilter) => {
    setFiltersRaw(newFilters);
    setPageRaw(1); // Reset to page 1 when filters change
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersRaw({});
    setPageRaw(1);
  }, []);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) setPageRaw(p => p + 1);
  }, [hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (hasPrevPage) setPageRaw(p => p - 1);
  }, [hasPrevPage]);

  const goToFirstPage = useCallback(() => setPageRaw(1), []);

  const goToLastPage = useCallback(() => setPageRaw(totalPages), [totalPages]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    sortBy,
    sortDirection,
    setSort,
    filters,
    setFilters,
    resetFilters,
    loading,
    error,
    organizationId,
    isOrgReady,
    refresh,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    hasNextPage,
    hasPrevPage,
  };
}
