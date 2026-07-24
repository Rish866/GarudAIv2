// ============================================================
// ActionButton — Permission-aware action button
//
// Automatically hides if user lacks the required permission.
// Consistent styling for primary/secondary/danger actions.
//
// Usage:
//   <ActionButton permission="vehicles.create" onClick={openAddModal}>
//     <Plus size={16} /> Add Vehicle
//   </ActionButton>
// ============================================================

import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../lib/permissions';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ActionButtonProps {
  /** Permission required to show this button. If omitted, always shown. */
  permission?: Permission;
  onClick: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Title/tooltip */
  title?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25',
  secondary: 'border hover:opacity-80',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25',
  ghost: 'hover:bg-[var(--bg-tertiary)]',
};

export default function ActionButton({
  permission,
  onClick,
  variant = 'primary',
  disabled,
  loading,
  className = '',
  children,
  title,
}: ActionButtonProps) {
  const { can } = usePermission();

  // Hide button if user lacks permission
  if (permission && !can(permission)) {
    return null;
  }

  const baseStyle = 'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const variantStyle = variantStyles[variant];
  const secondaryInline = variant === 'secondary'
    ? { borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }
    : undefined;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${baseStyle} ${variantStyle} ${className}`}
      style={secondaryInline}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
