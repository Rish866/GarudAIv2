// ============================================================
// GARUD AI ERP — Permission System
// 
// Tenant isolation: "Which organization can the user access?"
//   → Enforced by organization_members + RLS
//
// Permissions: "What can the user DO inside that organization?"
//   → Enforced here (frontend) + RLS role checks (database)
// ============================================================

import type { OrganizationRole } from '../types/organization';

// ============================================================
// PERMISSION DEFINITIONS
// Format: resource.action
// ============================================================

export const PERMISSIONS = {
  // Vehicles
  'vehicles.read': 'View vehicles',
  'vehicles.create': 'Add vehicles',
  'vehicles.update': 'Edit vehicles',
  'vehicles.delete': 'Delete vehicles',

  // Drivers
  'drivers.read': 'View drivers',
  'drivers.create': 'Add drivers',
  'drivers.update': 'Edit drivers',
  'drivers.delete': 'Delete drivers',

  // Customers
  'customers.read': 'View customers',
  'customers.create': 'Add customers',
  'customers.update': 'Edit customers',
  'customers.delete': 'Delete customers',

  // Vendors
  'vendors.read': 'View vendors',
  'vendors.create': 'Add vendors',
  'vendors.update': 'Edit vendors',
  'vendors.delete': 'Delete vendors',

  // Trips
  'trips.read': 'View trips',
  'trips.create': 'Create trips',
  'trips.update': 'Update trip status',
  'trips.delete': 'Cancel/delete trips',

  // Enquiries & Quotations
  'enquiries.read': 'View enquiries',
  'enquiries.create': 'Create enquiries',
  'quotations.read': 'View quotations',
  'quotations.create': 'Create quotations',
  'quotations.update': 'Edit quotations',

  // Indents / Orders
  'indents.read': 'View indents',
  'indents.create': 'Create indents',
  'indents.update': 'Allocate vehicles to indents',
  'indents.delete': 'Cancel indents',

  // Invoices
  'invoices.read': 'View invoices',
  'invoices.create': 'Generate invoices',
  'invoices.update': 'Edit invoices',
  'invoices.delete': 'Delete invoices',

  // Payments
  'payments.read': 'View payments',
  'payments.create': 'Record payments',
  'payments.update': 'Edit payments',
  'payments.delete': 'Delete payments',

  // Expenses
  'expenses.read': 'View expenses',
  'expenses.create': 'Add expenses',
  'expenses.update': 'Edit expenses',
  'expenses.delete': 'Delete expenses',
  'expenses.approve': 'Approve expenses',

  // Fuel
  'fuel.read': 'View fuel entries',
  'fuel.create': 'Add fuel entries',
  'fuel.update': 'Edit fuel entries',

  // Maintenance
  'maintenance.read': 'View maintenance',
  'maintenance.create': 'Schedule maintenance',
  'maintenance.update': 'Update maintenance',

  // Tyres
  'tyres.read': 'View tyre records',
  'tyres.create': 'Add tyres',
  'tyres.update': 'Update tyre records',

  // Documents
  'documents.read': 'View documents',
  'documents.upload': 'Upload documents',
  'documents.delete': 'Delete documents',

  // Reports
  'reports.read': 'View reports',
  'reports.export': 'Export reports',

  // Finance
  'finance.read': 'View financial data',
  'finance.manage': 'Manage cash/bank/ledger',
  'gst.read': 'View GST reports',
  'gst.export': 'Export GST data',

  // Payroll & HR
  'payroll.read': 'View payroll',
  'payroll.manage': 'Process payroll',
  'attendance.read': 'View attendance',
  'attendance.manage': 'Manage attendance',

  // Settings & Users
  'settings.read': 'View settings',
  'settings.manage': 'Change settings',
  'users.read': 'View users',
  'users.invite': 'Invite users',
  'users.manage': 'Manage roles',
  'users.delete': 'Remove users',

  // Approvals
  'approvals.read': 'View approvals',
  'approvals.action': 'Approve/reject requests',

  // GPS & Tracking
  'tracking.read': 'View GPS tracking',
  'tracking.manage': 'Manage GPS devices',
  'geofencing.read': 'View geofences',
  'geofencing.manage': 'Manage geofences',

  // Claims
  'claims.read': 'View claims',
  'claims.create': 'File claims',
  'claims.manage': 'Process claims',

  // Dashboard
  'dashboard.read': 'View dashboard',

  // API
  'api.read': 'View API documentation',
  'api.manage': 'Manage API keys',
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ============================================================
// ROLE → PERMISSION MATRIX
// ============================================================

export const ROLE_PERMISSION_MATRIX: Record<OrganizationRole, Permission[]> = {
  organization_owner: Object.keys(PERMISSIONS) as Permission[], // ALL permissions

  admin: Object.keys(PERMISSIONS) as Permission[], // ALL permissions

  operations_manager: [
    'dashboard.read',
    'vehicles.read', 'vehicles.create', 'vehicles.update',
    'drivers.read', 'drivers.create', 'drivers.update',
    'customers.read', 'customers.create', 'customers.update',
    'vendors.read', 'vendors.create',
    'trips.read', 'trips.create', 'trips.update',
    'enquiries.read', 'enquiries.create',
    'quotations.read', 'quotations.create', 'quotations.update',
    'indents.read', 'indents.create', 'indents.update',
    'invoices.read',
    'expenses.read', 'expenses.create',
    'fuel.read', 'fuel.create',
    'maintenance.read', 'maintenance.create',
    'documents.read', 'documents.upload',
    'reports.read', 'reports.export',
    'tracking.read',
    'geofencing.read',
    'claims.read', 'claims.create',
    'approvals.read',
  ],

  dispatcher: [
    'dashboard.read',
    'vehicles.read',
    'drivers.read',
    'customers.read',
    'trips.read', 'trips.create', 'trips.update',
    'indents.read', 'indents.create', 'indents.update',
    'tracking.read',
    'documents.read',
  ],

  fleet_manager: [
    'dashboard.read',
    'vehicles.read', 'vehicles.create', 'vehicles.update', 'vehicles.delete',
    'drivers.read', 'drivers.create', 'drivers.update',
    'fuel.read', 'fuel.create', 'fuel.update',
    'maintenance.read', 'maintenance.create', 'maintenance.update',
    'tyres.read', 'tyres.create', 'tyres.update',
    'documents.read', 'documents.upload', 'documents.delete',
    'tracking.read', 'tracking.manage',
    'geofencing.read', 'geofencing.manage',
    'reports.read',
  ],

  accountant: [
    'dashboard.read',
    'customers.read',
    'vendors.read',
    'invoices.read', 'invoices.create', 'invoices.update',
    'payments.read', 'payments.create', 'payments.update',
    'expenses.read', 'expenses.create', 'expenses.update', 'expenses.approve',
    'finance.read', 'finance.manage',
    'gst.read', 'gst.export',
    'payroll.read', 'payroll.manage',
    'reports.read', 'reports.export',
    'approvals.read', 'approvals.action',
  ],

  maintenance_manager: [
    'dashboard.read',
    'vehicles.read',
    'maintenance.read', 'maintenance.create', 'maintenance.update',
    'tyres.read', 'tyres.create', 'tyres.update',
    'fuel.read',
    'documents.read', 'documents.upload',
    'reports.read',
    'claims.read', 'claims.create',
  ],

  hr_manager: [
    'dashboard.read',
    'drivers.read', 'drivers.create', 'drivers.update',
    'attendance.read', 'attendance.manage',
    'payroll.read', 'payroll.manage',
    'documents.read', 'documents.upload',
    'reports.read',
  ],

  driver: [
    'dashboard.read',
    'trips.read',
    'expenses.create',
    'fuel.create',
    'documents.read',
    'attendance.read',
  ],

  customer: [
    'trips.read',
    'invoices.read',
    'documents.read',
  ],

  viewer: [
    'dashboard.read',
    'vehicles.read',
    'drivers.read',
    'customers.read',
    'trips.read',
    'invoices.read',
    'reports.read',
    'tracking.read',
  ],
};

// ============================================================
// PERMISSION CHECK FUNCTIONS
// ============================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrganizationRole | null, permission: Permission): boolean {
  if (!role) return false;
  const rolePermissions = ROLE_PERMISSION_MATRIX[role];
  if (!rolePermissions) return false;
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has ANY of the given permissions
 */
export function hasAnyPermission(role: OrganizationRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Check if a role has ALL of the given permissions
 */
export function hasAllPermissions(role: OrganizationRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: OrganizationRole): Permission[] {
  return ROLE_PERMISSION_MATRIX[role] || [];
}

/**
 * Get permission display name
 */
export function getPermissionLabel(permission: Permission): string {
  return PERMISSIONS[permission] || permission;
}
