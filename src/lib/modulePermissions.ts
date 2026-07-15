// ============================================================
// MODULE PERMISSION REGISTRY
//
// Central registry defining view/create/update/delete/export permissions
// for every module in the ERP. Used by:
// - Sidebar (view permission determines visibility)
// - Module wrappers (view permission gates content)
// - Action buttons (create/update/delete permissions)
// - Export controls (export permission)
//
// SECURITY: If a module is NOT listed here, it defaults to DENIED.
// ============================================================

import type { ModuleName } from '../types';
import type { Permission } from './permissions';

export interface ModulePermissionSet {
  /** Required to see the module in sidebar and render it */
  view: Permission;
  /** Required to show Add/Create buttons and execute creates */
  create?: Permission;
  /** Required to show Edit buttons and execute updates */
  update?: Permission;
  /** Required to show Delete/Archive buttons and execute removes */
  archive?: Permission;
  /** Required to export data from this module */
  export?: Permission;
  /** Required to approve actions in this module */
  approve?: Permission;
  /** Required to see financial data in this module */
  financial?: Permission;
}

/**
 * Complete module permission registry.
 * Every module must have at minimum a 'view' permission.
 * Unknown modules default to DENIED (not listed = no access).
 */
export const MODULE_PERMISSIONS: Record<ModuleName, ModulePermissionSet> = {
  // === Overview ===
  dashboard: { view: 'dashboard.read' },
  notifications: { view: 'dashboard.read' },

  // === Operations ===
  enquiries: { view: 'enquiries.read', create: 'enquiries.create', update: 'enquiries.create' },
  indents: { view: 'indents.read', create: 'indents.create', update: 'indents.update', archive: 'indents.delete' },
  trips: { view: 'trips.read', create: 'trips.create', update: 'trips.update', archive: 'trips.delete', export: 'reports.export' },
  fleet: { view: 'vehicles.read', create: 'vehicles.create', update: 'vehicles.update', archive: 'vehicles.delete', export: 'reports.export' },
  drivers: { view: 'drivers.read', create: 'drivers.create', update: 'drivers.update', archive: 'drivers.delete', export: 'reports.export' },
  customers: { view: 'customers.read', create: 'customers.create', update: 'customers.update', archive: 'customers.delete', export: 'reports.export' },
  vendors: { view: 'vendors.read', create: 'vendors.create', update: 'vendors.update', archive: 'vendors.delete' },
  contracts: { view: 'customers.read', create: 'customers.create', update: 'customers.update' },
  market: { view: 'vendors.read', create: 'vendors.create', update: 'vendors.update' },
  routes: { view: 'trips.read', create: 'trips.create', update: 'trips.update' },
  transfers: { view: 'vehicles.read', create: 'vehicles.update' },

  // === Finance ===
  billing: { view: 'invoices.read', create: 'invoices.create', update: 'invoices.update', archive: 'invoices.delete', export: 'reports.export', financial: 'finance.read' },
  accounts: { view: 'finance.read', create: 'finance.manage', update: 'finance.manage', financial: 'finance.read' },
  purchases: { view: 'finance.read', create: 'finance.manage', update: 'finance.manage', financial: 'finance.read' },
  sales: { view: 'invoices.read', create: 'invoices.create', update: 'invoices.update', financial: 'finance.read' },
  pnl: { view: 'finance.read', export: 'reports.export', financial: 'finance.read' },
  gstreports: { view: 'gst.read', export: 'gst.export', financial: 'finance.read' },
  profitability: { view: 'reports.read', export: 'reports.export', financial: 'finance.read' },
  creditblock: { view: 'customers.read', update: 'customers.update' },
  payroll: { view: 'payroll.read', create: 'payroll.manage', update: 'payroll.manage', financial: 'finance.read' },
  attendance: { view: 'attendance.read', create: 'attendance.manage', update: 'attendance.manage' },
  inventory: { view: 'finance.read', create: 'finance.manage', update: 'finance.manage' },

  // === Fleet Operations ===
  fuel: { view: 'fuel.read', create: 'fuel.create', update: 'fuel.update', export: 'reports.export' },
  tyres: { view: 'tyres.read', create: 'tyres.create', update: 'tyres.update' },
  maintenance: { view: 'maintenance.read', create: 'maintenance.create', update: 'maintenance.update' },
  workorders: { view: 'maintenance.read', create: 'maintenance.create', update: 'maintenance.update', approve: 'approvals.action' },
  challans: { view: 'vehicles.read', create: 'vehicles.update', update: 'vehicles.update' },
  documents: { view: 'documents.read', create: 'documents.upload', archive: 'documents.delete' },
  ewaybill: { view: 'trips.read', create: 'trips.create' },
  expiry: { view: 'documents.read' },
  claims: { view: 'claims.read', create: 'claims.create', update: 'claims.manage', approve: 'claims.manage' },

  // === Tracking & AI ===
  gps: { view: 'tracking.read', update: 'tracking.manage' },
  geofencing: { view: 'geofencing.read', create: 'geofencing.manage', update: 'geofencing.manage' },
  sla: { view: 'tracking.read' },
  dashcam: { view: 'tracking.read', update: 'tracking.manage' },
  fueltheft: { view: 'fuel.read' },
  predictive: { view: 'reports.read' },
  trackinglinks: { view: 'tracking.read', create: 'tracking.manage' },

  // === Admin ===
  reports: { view: 'reports.read', export: 'reports.export' },
  approvals: { view: 'approvals.read', approve: 'approvals.action' },
  audittrail: { view: 'settings.read' },
  portal: { view: 'customers.read' },
  vendorportal: { view: 'vendors.read' },
  restapi: { view: 'api.read', update: 'api.manage' },
  mobileapp: { view: 'settings.read' },
  settings: { view: 'settings.read', update: 'settings.manage' },
};

/**
 * Get the permission required to view a module.
 * Returns null if the module is not in the registry (unknown modules are denied).
 */
export function getModuleViewPermission(module: ModuleName): Permission | null {
  return MODULE_PERMISSIONS[module]?.view ?? null;
}

/**
 * Get the full permission set for a module.
 * Returns null if the module is not in the registry.
 */
export function getModulePermissions(module: ModuleName): ModulePermissionSet | null {
  return MODULE_PERMISSIONS[module] ?? null;
}

/**
 * Check if a module exists in the permission registry.
 * Unknown modules should be denied access.
 */
export function isModuleRegistered(module: string): module is ModuleName {
  return module in MODULE_PERMISSIONS;
}
