// Pagination — Reusable pagination controls for server-side paginated modules
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { PageSize } from '../../hooks/usePaginatedData';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  loading?: boolean;
}

const PAGE_SIZES: PageSize[] = [25, 50, 100];

export default function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPrevPage,
  loading,
}: PaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 rounded-b-2xl">
      {/* Left: Row info */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600">
          {totalCount === 0 ? 'No records' : `${from}–${to} of ${totalCount.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Rows:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="text-sm border border-slate-200 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            disabled={loading}
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage || loading}
          className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="First page"
        >
          <ChevronsLeft size={16} className="text-slate-600" />
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage || loading}
          className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft size={16} className="text-slate-600" />
        </button>

        <span className="px-3 py-1 text-sm font-medium text-slate-700">
          {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage || loading}
          className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight size={16} className="text-slate-600" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage || loading}
          className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Last page"
        >
          <ChevronsRight size={16} className="text-slate-600" />
        </button>
      </div>
    </div>
  );
}
