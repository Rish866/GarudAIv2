// PermissionGate — Reusable permission-aware wrapper component
//
// Usage:
//   <PermissionGate permission="vehicles.create">
//     <button onClick={handleAdd}>Add Vehicle</button>
//   </PermissionGate>
//
//   <PermissionGate permissions={['invoices.create', 'invoices.update']} mode="any">
//     <BillingActions />
//   </PermissionGate>
//
//   <PermissionGate permission="settings.manage" fallback={<AccessDenied />}>
//     <SettingsPanel />
//   </PermissionGate>

import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import type { Permission } from '../../lib/permissions';

interface PermissionGateProps {
  /** Single permission to check */
  permission?: Permission;
  /** Multiple permissions to check */
  permissions?: Permission[];
  /** 'any' = user needs ANY listed permission, 'all' = user needs ALL */
  mode?: 'any' | 'all';
  /** Content to render if permission check passes */
  children: React.ReactNode;
  /** Content to render if permission check fails (default: nothing) */
  fallback?: React.ReactNode;
}

/**
 * Renders children only if the current user has the required permission(s).
 * Uses the OrganizationContext role (not legacy Zustand store role).
 */
export default function PermissionGate({
  permission,
  permissions,
  mode = 'any',
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermission();

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = mode === 'all' ? canAll(permissions) : canAny(permissions);
  } else {
    // No permission specified = always show
    hasAccess = true;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Access denied state — shown when a user navigates to a module they don't have access to.
 */
export function AccessDeniedState({ moduleName }: { moduleName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 px-6">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        Access Denied
      </h2>
      <p className="text-sm text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>
        You don&apos;t have permission to access {moduleName ? `the ${moduleName} module` : 'this module'}.
        Contact your organization administrator to request access.
      </p>
    </div>
  );
}

/**
 * Hook-based permission check for protecting action handlers.
 * Use when you need to protect a callback, not just visibility.
 *
 * Example:
 *   const guardedCreate = useProtectedAction('vehicles.create', handleCreateVehicle);
 *   <button onClick={guardedCreate}>Add</button>
 */
export function useProtectedAction(
  permission: Permission,
  handler: (...args: any[]) => any,
  onDenied?: () => void
): (...args: any[]) => any {
  const { can } = usePermission();

  return (...args: any[]) => {
    if (!can(permission)) {
      if (onDenied) onDenied();
      return;
    }
    return handler(...args);
  };
}
