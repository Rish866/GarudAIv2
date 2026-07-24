// ============================================================
// VirtualTable — Virtualized table for large datasets
//
// Only renders visible rows. Handles 5000+ rows without lag.
// Uses @tanstack/react-virtual for efficient row virtualization.
//
// Usage:
//   <VirtualTable
//     data={trips}
//     columns={[
//       { key: 'trip_number', label: 'Trip #', width: 120 },
//       { key: 'customer_name', label: 'Customer', width: 200 },
//     ]}
//     rowHeight={48}
//     onRowClick={(row) => setDetailTrip(row)}
//   />
// ============================================================

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface VirtualColumn<T> {
  key: keyof T | string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: VirtualColumn<T>[];
  rowHeight?: number;
  maxHeight?: number;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export default function VirtualTable<T extends { id: string }>({
  data,
  columns,
  rowHeight = 48,
  maxHeight = 600,
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  if (data.length === 0) {
    return (
      <div className={`rounded-2xl border overflow-hidden ${className}`} style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="p-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${className}`} style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
      {/* Header */}
      <div className="flex border-b sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        {columns.map(col => (
          <div
            key={String(col.key)}
            className="px-4 py-3 text-xs font-semibold uppercase flex-shrink-0"
            style={{
              width: col.width || 150,
              minWidth: col.width || 150,
              textAlign: col.align || 'left',
              color: 'var(--text-tertiary)',
            }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = data[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className={`absolute top-0 left-0 w-full flex items-center border-b transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : ''
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  borderColor: 'var(--border-color)',
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => {
                  const value = (row as Record<string, unknown>)[col.key as string];
                  return (
                    <div
                      key={String(col.key)}
                      className="px-4 py-2 text-sm truncate flex-shrink-0"
                      style={{
                        width: col.width || 150,
                        minWidth: col.width || 150,
                        textAlign: col.align || 'left',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {col.render ? col.render(value, row, virtualRow.index) : String(value ?? '')}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with count */}
      <div className="px-4 py-2 border-t text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-tertiary)' }}>
        {data.length.toLocaleString()} rows
      </div>
    </div>
  );
}
