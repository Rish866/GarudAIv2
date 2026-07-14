// usePermission — Hook for granular permission checks using OrganizationContext
//
// Usage:
//   const { can, canAny, canAll, role } = usePermission();
//   if (can('vehicles.create')) { ... }
//   if (canAny(['trips.create', 'trips.update'])) { ... }

import { useOrganization } from '../contexts/OrganizationContext';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../lib/permissions';
import type { Permission } from '../lib/permissions';
import type { OrganizationRole } from '../types/organization';

interface UsePermissionResult {
  /** Check a single permission */
  can: (permission: Permission) => boolean;
  /** Check if user has ANY of the given permissions */
  canAny: (permissions: Permission[]) => boolean;
  /** Check if user has ALL of the given permissions */
  canAll: (permissions: Permission[]) => boolean;
  /** The current organization role (null if no membership) */
  role: OrganizationRole | null;
  /** Whether user is an owner or admin */
  isAdmin: boolean;
  /** Whether user can write (non-viewer, non-customer) */
  isWriter: boolean;
}

export function usePermission(): UsePermissionResult {
  const { role } = useOrganization();

  return {
    can: (permission: Permission) => hasPermission(role, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
    role,
    isAdmin: role === 'organization_owner' || role === 'admin',
    isWriter: role !== null && role !== 'viewer' && role !== 'customer',
  };
}
