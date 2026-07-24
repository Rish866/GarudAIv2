// ============================================================
// ROUTE CONFIGURATION
// Maps ModuleName → URL path for React Router
// ============================================================

import type { ModuleName } from '../types';

/**
 * Module-to-path mapping. Each module gets a clean URL path.
 * This is the single source of truth for all navigation.
 */
export const MODULE_ROUTES: Record<ModuleName, string> = {
  dashboard: '/dashboard',
  fleet: '/fleet',
  trips: '/trips',
  drivers: '/drivers',
  customers: '/customers',
  billing: '/billing',
  fuel: '/fuel',
  maintenance: '/maintenance',
  reports: '/reports',
  settings: '/settings',
  enquiries: '/enquiries',
  notifications: '/notifications',
  tyres: '/tyres',
  payroll: '/payroll',
  contracts: '/contracts',
  market: '/market',
  documents: '/documents',
  gps: '/gps',
  accounts: '/accounts',
  purchases: '/purchases',
  sales: '/sales',
  inventory: '/inventory',
  geofencing: '/geofencing',
  sla: '/sla',
  dashcam: '/dashcam',
  fueltheft: '/fuel-alerts',
  challans: '/challans',
  workorders: '/work-orders',
  ewaybill: '/eway-bill',
  audittrail: '/audit-trail',
  portal: '/customer-portal',
  pnl: '/pnl',
  gstreports: '/gst-reports',
  vendors: '/vendors',
  routes: '/routes',
  indents: '/indents',
  attendance: '/attendance',
  creditblock: '/credit-control',
  transfers: '/transfers',
  restapi: '/api',
  predictive: '/analytics',
  mobileapp: '/mobile-app',
  approvals: '/approvals',
  trackinglinks: '/tracking-links',
  expiry: '/doc-expiry',
  claims: '/claims',
  vendorportal: '/vendor-portal',
  profitability: '/profitability',
};

/**
 * Reverse lookup: path → ModuleName
 */
const PATH_TO_MODULE: Record<string, ModuleName> = Object.fromEntries(
  Object.entries(MODULE_ROUTES).map(([module, path]) => [path, module as ModuleName])
) as Record<string, ModuleName>;

/**
 * Get ModuleName from a URL path.
 * Returns 'dashboard' if path is not recognized.
 */
export function getModuleFromPath(path: string): ModuleName {
  // Exact match
  if (PATH_TO_MODULE[path]) return PATH_TO_MODULE[path];
  // Try without trailing slash
  const cleaned = path.endsWith('/') ? path.slice(0, -1) : path;
  if (PATH_TO_MODULE[cleaned]) return PATH_TO_MODULE[cleaned];
  // Root path → dashboard
  if (path === '/' || path === '') return 'dashboard';
  return 'dashboard';
}

/**
 * Get URL path for a module.
 */
export function getPathForModule(module: ModuleName): string {
  return MODULE_ROUTES[module] || '/dashboard';
}
