import type { UserRole, ModuleName } from '../types';

/**
 * Module access permissions per role
 */
const ROLE_PERMISSIONS: Record<UserRole, ModuleName[]> = {
  super_admin: [
    'dashboard', 'fleet', 'trips', 'drivers', 'customers', 'billing',
    'fuel', 'maintenance', 'reports', 'settings', 'notifications',
    'enquiries', 'tyres', 'payroll', 'contracts', 'market', 'documents', 'gps',
    'accounts', 'purchases', 'sales', 'inventory', 'geofencing', 'sla', 'dashcam', 'fueltheft', 'challans', 'workorders',
    'ewaybill', 'audittrail', 'portal', 'pnl', 'gstreports', 'vendors', 'routes', 'indents',
    'attendance', 'creditblock', 'transfers'
  ],
  admin: [
    'dashboard', 'fleet', 'trips', 'drivers', 'customers', 'billing',
    'fuel', 'maintenance', 'reports', 'settings', 'notifications',
    'enquiries', 'tyres', 'payroll', 'contracts', 'market', 'documents', 'gps',
    'accounts', 'purchases', 'sales', 'inventory', 'geofencing', 'sla', 'dashcam', 'fueltheft', 'challans', 'workorders',
    'ewaybill', 'audittrail', 'portal', 'pnl', 'gstreports', 'vendors', 'routes', 'indents',
    'attendance', 'creditblock', 'transfers'
  ],
  operations: [
    'dashboard', 'fleet', 'trips', 'drivers', 'fuel', 'maintenance',
    'notifications', 'enquiries', 'tyres', 'documents', 'gps', 'ewaybill', 'indents', 'routes', 'vendors', 'transfers', 'attendance'
  ],
  fleet_manager: [
    'dashboard', 'fleet', 'trips', 'drivers', 'fuel', 'maintenance',
    'notifications', 'tyres', 'documents', 'gps'
  ],
  accounts: [
    'dashboard', 'billing', 'reports', 'customers', 'notifications',
    'payroll', 'contracts', 'market', 'accounts', 'purchases', 'sales', 'inventory', 'ewaybill', 'portal', 'pnl', 'gstreports', 'vendors', 'creditblock', 'attendance'
  ],
  driver: [
    'dashboard', 'trips', 'notifications'
  ],
};

/**
 * Check if a role has access to a specific module
 */
export function canAccessModule(role: UserRole, module: ModuleName): boolean {
  return ROLE_PERMISSIONS[role]?.includes(module) ?? false;
}

/**
 * Get all accessible modules for a role
 */
export function getAccessibleModules(role: UserRole): ModuleName[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if user can perform write operations (add/edit/delete)
 */
export function canWrite(role: UserRole): boolean {
  return ['super_admin', 'admin', 'operations', 'fleet_manager'].includes(role);
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
 * Get role display label
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    operations: 'Operations Manager',
    fleet_manager: 'Fleet Manager',
    accounts: 'Accounts Manager',
    driver: 'Driver',
  };
  return labels[role] || role;
}
