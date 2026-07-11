// PermissionGate — Conditionally render UI based on user permissions
//
// Usage:
//   <PermissionGate permission="vehicles.create">
//     <button>Add Vehicle</button>
//   </PermissionGate>
//
//   <PermissionGate permissions={['invoices.create', 'invoices.update']} requireAll={false}>
//     <BillingSection />
//   </PermissionGate>

import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { Permission } from '../../lib/permissions';

interface PermissionGateProps {
  /** Single permission to check */
  permission?: Permission;
  /** Multiple permissions to check */
  permissions?: Permission[];
  /** If true, ALL permissions must be present. If false, ANY one is sufficient. Default: false */
  requireAll?: boolean;
  /** Content to show when permission is granted */
  children: React.ReactNode;
  /** Optional fallback when permission denied (default: nothing rendered) */
  fallback?: React.ReactNode;
}

export default function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
