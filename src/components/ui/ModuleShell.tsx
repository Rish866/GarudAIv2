// ============================================================
// ModuleShell — Standard wrapper for all module content
//
// Provides consistent loading, error, and empty states.
// Every module should wrap its content in this component.
//
// Usage:
//   <ModuleShell loading={loading} error={error} empty={data.length === 0} emptyMessage="No trips found">
//     {/* Module content */}
//   </ModuleShell>
// ============================================================

import React from 'react';
import { Loader2, AlertCircle, Inbox, RefreshCw } from 'lucide-react';

interface ModuleShellProps {
  /** Whether data is loading */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether the data set is empty */
  empty?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Custom empty state description */
  emptyDescription?: string;
  /** Callback to retry/refresh data */
  onRetry?: () => void;
  /** Children (module content) — rendered when not loading, no error, not empty */
  children: React.ReactNode;
}

export default function ModuleShell({
  loading,
  error,
  empty,
  emptyMessage = 'No data found',
  emptyDescription,
  onRetry,
  children,
}: ModuleShellProps) {
  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
          Loading data...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Something went wrong
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {error}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        )}
      </div>
    );
  }

  // Empty state
  if (empty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <Inbox size={24} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {emptyMessage}
          </h3>
          {emptyDescription && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {emptyDescription}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Normal content
  return <>{children}</>;
}
