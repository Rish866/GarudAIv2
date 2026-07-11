// usePermissions — Hook for checking user permissions in components
//
// Usage:
//   const { can, canAny, canAll } = usePermissions();
//   if (can('vehicles.create')) { /* show add button */ }
//   if (canAny(['invoices.create', 'invoices.update'])) { /* show billing section */ }

import { useOrganization } from '../contexts/OrganizationContext';
import { hasPermission, hasAnyPermission, hasAllPermissions } from '../lib/permissions';
import type { Permission } from '../lib/permissions';

export function usePermissions() {
  const { role } = useOrganization();

  return {
    /**
     * Check if current user has a specific permission
     */
    can: (permission: Permission): boolean => hasPermission(role, permission),

    /**
     * Check if current user has ANY of the given permissions
     */
    canAny: (permissions: Permission[]): boolean => hasAnyPermission(role, permissions),

    /**
     * Check if current user has ALL of the given permissions
     */
    canAll: (permissions: Permission[]): boolean => hasAllPermissions(role, permissions),

    /**
     * Current role (for display)
     */
    role,
  };
}
