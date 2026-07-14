// Unified Role-Based Access Control for Garud AI ERP
//
// This is the SINGLE source of truth for frontend permission checks.
// Database-level security is enforced via RLS (has_organization_role function).
// This module provides UI-level checks for:
//   - Module visibility in sidebar
//   - Write/edit/delete button visibility
//   - Financial data access
//   - Settings management
//
// The store persists a simplified UserRole for backward compatibility.
// OrganizationContext provides the granular OrganizationRole.
// Both are supported by these functions.

import type { UserRole, ModuleName } from '../types';
import type { OrganizationRole } from '../types/organization';

// ============================================================
// MODULE ACCESS — Which sidebar items are visible per role
// ============================================================

const ALL_MODULES: ModuleName[] = [
  'dashboard', 'fleet', 'trips', 'drivers', 'customers', 'billing',
  'fuel', 'maintenance', 'reports', 'settings', 'notifications',
  'enquiries', 'tyres', 'payroll', 'contracts', 'market', 'documents', 'gps',
  'accounts', 'purchases', 'sales', 'inventory', 'geofencing', 'sla',
  'dashcam', 'fueltheft', 'challans', 'workorders', 'ewaybill', 'audittrail',
  'portal', 'pnl', 'gstreports', 'vendors', 'routes', 'indents',
  'attendance', 'creditblock', 'transfers', 'restapi', 'predictive',
  'mobileapp', 'approvals', 'trackinglinks', 'expiry', 'claims',
  'vendorportal', 'profitability',
];

const ROLE_MODULE_ACCESS: Record<UserRole, ModuleName[]> = {
  super_admin: ALL_MODULES,
  admin: ALL_MODULES,
  operations: [
    'dashboard', 'fleet', 'trips', 'drivers', 'customers', 'fuel',
    'maintenance', 'notifications', 'enquiries', 'tyres', 'documents',
    'gps', 'ewaybill', 'indents', 'routes', 'vendors', 'transfers',
    'attendance', 'contracts', 'market', 'workorders', 'challans',
    'claims', 'geofencing', 'approvals', 'reports',
  ],
  fleet_manager: [
    'dashboard', 'fleet', 'trips', 'drivers', 'fuel', 'maintenance',
    'notifications', 'tyres', 'documents', 'gps', 'geofencing',
    'workorders', 'challans', 'expiry',
  ],
  accounts: [
    'dashboard', 'billing', 'reports', 'customers', 'notifications',
    'payroll', 'contracts', 'market', 'accounts', 'purchases', 'sales',
    'inventory', 'ewaybill', 'portal', 'pnl', 'gstreports', 'vendors',
    'creditblock', 'attendance', 'profitability', 'claims', 'approvals',
  ],
  driver: [
    'dashboard', 'trips', 'notifications', 'documents',
  ],
};

/**
 * Check if a role has access to a specific module (sidebar visibility)
 */
export function canAccessModule(role: UserRole, module: ModuleName): boolean {
  return ROLE_MODULE_ACCESS[role]?.includes(module) ?? false;
}

/**
 * Get all accessible modules for a role
 */
export function getAccessibleModules(role: UserRole): ModuleName[] {
  return ROLE_MODULE_ACCESS[role] || [];
}

// ============================================================
// WRITE PERMISSIONS — Can the user create/edit/delete data?
// ============================================================

/**
 * Check if user can perform write operations (add/edit/delete)
 */
export function canWrite(role: UserRole): boolean {
  return ['super_admin', 'admin', 'operations', 'fleet_manager', 'accounts'].includes(role);
}

/**
 * Check if user can access billing/financial data
 */
export function canAccessFinancials(role: UserRole): boolean {
  return ['super_admin', 'admin', 'accounts'].includes(role);
}

/**
 * Check if user can manage users/settings
 */
export function canManageSettings(role: UserRole): boolean {
  return ['super_admin', 'admin'].includes(role);
}

/**
 * Check if user can delete records (more restrictive than edit)
 */
export function canDelete(role: UserRole): boolean {
  return ['super_admin', 'admin'].includes(role);
}

/**
 * Check if user can approve actions (expenses, leaves, trips)
 */
export function canApprove(role: UserRole): boolean {
  return ['super_admin', 'admin', 'operations', 'accounts'].includes(role);
}

// ============================================================
// ROLE LABELS — Display names for roles
// ============================================================

const LEGACY_ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Owner',
  admin: 'Admin',
  operations: 'Operations Manager',
  fleet_manager: 'Fleet Manager',
  accounts: 'Accounts Manager',
  driver: 'Driver',
};

const ORG_ROLE_LABELS: Record<OrganizationRole, string> = {
  organization_owner: 'Owner',
  admin: 'Admin',
  operations_manager: 'Operations Manager',
  dispatcher: 'Dispatcher',
  fleet_manager: 'Fleet Manager',
  accountant: 'Accountant',
  maintenance_manager: 'Maintenance Manager',
  hr_manager: 'HR Manager',
  driver: 'Driver',
  customer: 'Customer',
  viewer: 'Viewer',
};

/**
 * Get display label for a legacy UserRole
 */
export function getRoleLabel(role: UserRole): string {
  return LEGACY_ROLE_LABELS[role] || role;
}

/**
 * Get display label for an OrganizationRole
 */
export function getOrgRoleLabel(role: OrganizationRole): string {
  return ORG_ROLE_LABELS[role] || role;
}

/**
 * Get all available organization roles for user management
 */
export function getAllOrganizationRoles(): { value: OrganizationRole; label: string }[] {
  return (Object.entries(ORG_ROLE_LABELS) as [OrganizationRole, string][]).map(
    ([value, label]) => ({ value, label })
  );
}
