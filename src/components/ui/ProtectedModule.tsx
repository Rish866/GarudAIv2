// ProtectedModule — Wraps a module component to enforce permission checks.
//
// Usage in App.tsx or module loaders:
//   <ProtectedModule permission="vehicles.read" moduleName="Fleet">
//     <FleetModule />
//   </ProtectedModule>
//
// If the user lacks the required permission, shows AccessDeniedState instead.
// This prevents direct URL/hash navigation from bypassing sidebar filtering.

import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { AccessDeniedState } from './PermissionGate';
import type { Permission } from '../../lib/permissions';

interface ProtectedModuleProps {
  /** Permission required to view this module */
  permission: Permission;
  /** Human-readable module name for the access denied message */
  moduleName: string;
  /** The module content */
  children: React.ReactNode;
}

export default function ProtectedModule({ permission, moduleName, children }: ProtectedModuleProps) {
  const { can } = usePermission();

  if (!can(permission)) {
    return <AccessDeniedState moduleName={moduleName} />;
  }

  return <>{children}</>;
}
