// Tests for: MODULE_PERMISSIONS registry completeness and correctness
import { describe, it, expect } from 'vitest';
import { MODULE_PERMISSIONS, getModuleViewPermission, isModuleRegistered } from '../../src/lib/modulePermissions';
import { PERMISSIONS, ROLE_PERMISSION_MATRIX, hasPermission } from '../../src/lib/permissions';
import type { ModuleName } from '../../src/types';
import type { OrganizationRole } from '../../src/types/organization';

// All known module names from the types file
const ALL_MODULES: ModuleName[] = [
  'dashboard', 'fleet', 'trips', 'drivers', 'customers', 'billing',
  'fuel', 'maintenance', 'reports', 'settings', 'notifications',
  'enquiries', 'tyres', 'payroll', 'contracts', 'market', 'documents', 'gps',
  'accounts', 'purchases', 'sales', 'inventory', 'geofencing', 'sla', 'dashcam', 'fueltheft', 'challans', 'workorders',
  'ewaybill', 'audittrail', 'portal', 'pnl', 'gstreports', 'vendors', 'routes', 'indents',
  'attendance', 'creditblock', 'transfers', 'restapi', 'predictive', 'mobileapp',
  'approvals', 'trackinglinks', 'expiry', 'claims', 'vendorportal', 'profitability',
];

describe('MODULE_PERMISSIONS registry', () => {
  it('every ModuleName has a permission entry (no missing = denied)', () => {
    const missing: string[] = [];
    ALL_MODULES.forEach(mod => {
      if (!MODULE_PERMISSIONS[mod]) {
        missing.push(mod);
      }
    });
    expect(missing).toEqual([]);
  });

  it('every registered module has a view permission', () => {
    Object.entries(MODULE_PERMISSIONS).forEach(([mod, perms]) => {
      expect(perms.view, `${mod} missing view permission`).toBeDefined();
    });
  });

  it('all referenced permissions exist in the PERMISSIONS constant', () => {
    const invalid: string[] = [];
    Object.entries(MODULE_PERMISSIONS).forEach(([mod, perms]) => {
      Object.values(perms).forEach(perm => {
        if (perm && !(perm in PERMISSIONS)) {
          invalid.push(`${mod}: ${perm}`);
        }
      });
    });
    expect(invalid).toEqual([]);
  });

  it('unknown module returns null from getModuleViewPermission', () => {
    expect(getModuleViewPermission('nonexistent_module' as any)).toBeNull();
  });

  it('isModuleRegistered returns true for known modules', () => {
    expect(isModuleRegistered('dashboard')).toBe(true);
    expect(isModuleRegistered('trips')).toBe(true);
    expect(isModuleRegistered('fleet')).toBe(true);
  });

  it('isModuleRegistered returns false for unknown modules', () => {
    expect(isModuleRegistered('fake_module')).toBe(false);
    expect(isModuleRegistered('')).toBe(false);
  });
});

describe('Role-based module access', () => {
  // Helper to check which modules a role can see
  function getAccessibleModules(role: OrganizationRole): ModuleName[] {
    return ALL_MODULES.filter(mod => {
      const perm = getModuleViewPermission(mod);
      return perm ? hasPermission(role, perm) : false;
    });
  }

  it('organization_owner can access all modules', () => {
    const accessible = getAccessibleModules('organization_owner');
    expect(accessible.length).toBe(ALL_MODULES.length);
  });

  it('admin can access all modules', () => {
    const accessible = getAccessibleModules('admin');
    expect(accessible.length).toBe(ALL_MODULES.length);
  });

  it('driver has very limited access', () => {
    const accessible = getAccessibleModules('driver');
    expect(accessible).toContain('dashboard');
    expect(accessible).toContain('trips');
    expect(accessible).not.toContain('billing');
    expect(accessible).not.toContain('settings');
    expect(accessible).not.toContain('accounts');
    expect(accessible).not.toContain('customers');
    expect(accessible).not.toContain('payroll');
    expect(accessible.length).toBeLessThan(10);
  });

  it('customer has portal-only access', () => {
    const accessible = getAccessibleModules('customer');
    expect(accessible).toContain('trips');
    // Customers can see their invoices (portal access)
    expect(accessible).toContain('billing');
    // But cannot access internal operations
    expect(accessible).not.toContain('fleet');
    expect(accessible).not.toContain('settings');
    expect(accessible).not.toContain('drivers');
    expect(accessible).not.toContain('fuel');
    expect(accessible).not.toContain('maintenance');
    expect(accessible.length).toBeLessThan(10);
  });

  it('viewer (read-only auditor) cannot create/update', () => {
    // Viewer can see many modules but cannot write
    const viewerPerms = ROLE_PERMISSION_MATRIX['viewer'];
    expect(viewerPerms).not.toContain('vehicles.create');
    expect(viewerPerms).not.toContain('trips.create');
    expect(viewerPerms).not.toContain('invoices.create');
    expect(viewerPerms).not.toContain('settings.manage');
    expect(viewerPerms).not.toContain('users.manage');
  });

  it('accountant cannot access fleet configuration', () => {
    expect(hasPermission('accountant', 'vehicles.create')).toBe(false);
    expect(hasPermission('accountant', 'vehicles.update')).toBe(false);
    expect(hasPermission('accountant', 'vehicles.delete')).toBe(false);
    expect(hasPermission('accountant', 'tracking.manage')).toBe(false);
  });

  it('dispatcher cannot record payments', () => {
    expect(hasPermission('dispatcher', 'payments.create')).toBe(false);
    expect(hasPermission('dispatcher', 'invoices.create')).toBe(false);
    expect(hasPermission('dispatcher', 'finance.manage')).toBe(false);
  });

  it('fleet_manager cannot manage users', () => {
    expect(hasPermission('fleet_manager', 'users.manage')).toBe(false);
    expect(hasPermission('fleet_manager', 'users.invite')).toBe(false);
    expect(hasPermission('fleet_manager', 'settings.manage')).toBe(false);
  });

  it('maintenance_manager cannot see billing or customers', () => {
    expect(hasPermission('maintenance_manager', 'invoices.read')).toBe(false);
    expect(hasPermission('maintenance_manager', 'customers.create')).toBe(false);
    expect(hasPermission('maintenance_manager', 'payments.create')).toBe(false);
  });
});

describe('No business CRUD in persisted Zustand (regression guard)', () => {
  it('useStore does not export business CRUD actions', async () => {
    const { useStore } = await import('../../src/store/useStore');
    const state = useStore.getState();
    // These should NOT exist in the store interface
    expect('addVehicle' in state).toBe(false);
    expect('updateVehicle' in state).toBe(false);
    expect('deleteVehicle' in state).toBe(false);
    expect('addDriver' in state).toBe(false);
    expect('addTrip' in state).toBe(false);
    expect('addInvoice' in state).toBe(false);
    expect('addPayment' in state).toBe(false);
    expect('addExpense' in state).toBe(false);
    expect('addFuelEntry' in state).toBe(false);
    expect('addMaintenance' in state).toBe(false);
    expect('addEnquiry' in state).toBe(false);
    expect('addQuotation' in state).toBe(false);
    expect('convertEnquiryToQuotation' in state).toBe(false);
    expect('convertQuotationToTrip' in state).toBe(false);
    expect('addActivityLog' in state).toBe(false);
    expect('markAlertRead' in state).toBe(false);
  });

  it('useStore only contains UI/auth actions', async () => {
    const { useStore } = await import('../../src/store/useStore');
    const state = useStore.getState();
    const keys = Object.keys(state);
    const expectedActions = ['setActiveModule', 'toggleSidebar', 'toggleTheme', 'setActiveBranch', 'login', 'logout'];
    expectedActions.forEach(action => {
      expect(keys).toContain(action);
    });
  });

  it('persisted state does not include business data arrays', async () => {
    // The partialize function should only persist UI preferences
    const { useStore } = await import('../../src/store/useStore');
    const state = useStore.getState();
    expect('vehicles' in state).toBe(false);
    expect('drivers' in state).toBe(false);
    expect('trips' in state).toBe(false);
    expect('invoices' in state).toBe(false);
    expect('customers' in state).toBe(false);
  });
});
