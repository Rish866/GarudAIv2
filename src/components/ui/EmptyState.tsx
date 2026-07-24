// ============================================================
// EmptyState — Consistent empty state display for tables and lists
//
// Usage:
//   <EmptyState
//     icon={Truck}
//     title="No vehicles yet"
//     description="Add your first vehicle to get started"
//     action={{ label: "Add Vehicle", onClick: openAddModal }}
//   />
// ============================================================

import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'}`}>
      <div
        className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-full flex items-center justify-center mb-3`}
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <Icon size={compact ? 18 : 24} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <h3
        className={`${compact ? 'text-sm' : 'text-base'} font-semibold`}
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--text-tertiary)' }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
