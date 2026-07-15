// Tests for P0 Fix: Unified Permission System
import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  ROLE_PERMISSION_MATRIX,
} from '../../src/lib/permissions';
import type { OrganizationRole } from '../../src/types/organization';

describe('Permission System — Role Matrix', () => {
  describe('organization_owner has full access', () => {
    it('can manage settings', () => {
      expect(hasPermission('organization_owner', 'settings.manage')).toBe(true);
    });
    it('can create vehicles', () => {
      expect(hasPermission('organization_owner', 'vehicles.create')).toBe(true);
    });
    it('can manage users', () => {
      expect(hasPermission('organization_owner', 'users.manage')).toBe(true);
    });
    it('can export reports', () => {
      expect(hasPermission('organization_owner', 'reports.export')).toBe(true);
    });
  });

  describe('admin has full access', () => {
    it('can manage settings', () => {
      expect(hasPermission('admin', 'settings.manage')).toBe(true);
    });
    it('can delete vehicles', () => {
      expect(hasPermission('admin', 'vehicles.delete')).toBe(true);
    });
  });

  describe('dispatcher has limited permissions', () => {
    it('can view trips', () => {
      expect(hasPermission('dispatcher', 'trips.read')).toBe(true);
    });
    it('can create trips', () => {
      expect(hasPermission('dispatcher', 'trips.create')).toBe(true);
    });
    it('cannot manage settings', () => {
      expect(hasPermission('dispatcher', 'settings.manage')).toBe(false);
    });
    it('cannot manage users', () => {
      expect(hasPermission('dispatcher', 'users.manage')).toBe(false);
    });
    it('cannot create invoices', () => {
      expect(hasPermission('dispatcher', 'invoices.create')).toBe(false);
    });
    it('cannot access finance', () => {
      expect(hasPermission('dispatcher', 'finance.read')).toBe(false);
    });
  });

  describe('accountant permissions', () => {
    it('can view invoices', () => {
      expect(hasPermission('accountant', 'invoices.read')).toBe(true);
    });
    it('can create invoices', () => {
      expect(hasPermission('accountant', 'invoices.create')).toBe(true);
    });
    it('can manage finance', () => {
      expect(hasPermission('accountant', 'finance.manage')).toBe(true);
    });
    it('cannot create vehicles', () => {
      expect(hasPermission('accountant', 'vehicles.create')).toBe(false);
    });
    it('cannot manage GPS', () => {
      expect(hasPermission('accountant', 'tracking.manage')).toBe(false);
    });
  });

  describe('fleet_manager permissions', () => {
    it('can create vehicles', () => {
      expect(hasPermission('fleet_manager', 'vehicles.create')).toBe(true);
    });
    it('can manage maintenance', () => {
      expect(hasPermission('fleet_manager', 'maintenance.create')).toBe(true);
    });
    it('cannot create invoices', () => {
      expect(hasPermission('fleet_manager', 'invoices.create')).toBe(false);
    });
    it('cannot manage users', () => {
      expect(hasPermission('fleet_manager', 'users.manage')).toBe(false);
    });
  });

  describe('driver has minimal permissions', () => {
    it('can view dashboard', () => {
      expect(hasPermission('driver', 'dashboard.read')).toBe(true);
    });
    it('can view trips', () => {
      expect(hasPermission('driver', 'trips.read')).toBe(true);
    });
    it('cannot create trips', () => {
      expect(hasPermission('driver', 'trips.create')).toBe(false);
    });
    it('cannot view invoices', () => {
      expect(hasPermission('driver', 'invoices.read')).toBe(false);
    });
    it('cannot manage settings', () => {
      expect(hasPermission('driver', 'settings.manage')).toBe(false);
    });
    it('cannot view customers', () => {
      expect(hasPermission('driver', 'customers.read')).toBe(false);
    });
  });

  describe('customer has portal-only access', () => {
    it('can view trips', () => {
      expect(hasPermission('customer', 'trips.read')).toBe(true);
    });
    it('can view invoices', () => {
      expect(hasPermission('customer', 'invoices.read')).toBe(true);
    });
    it('cannot create trips', () => {
      expect(hasPermission('customer', 'trips.create')).toBe(false);
    });
    it('cannot view vehicles', () => {
      expect(hasPermission('customer', 'vehicles.read')).toBe(false);
    });
    it('cannot manage settings', () => {
      expect(hasPermission('customer', 'settings.manage')).toBe(false);
    });
  });

  describe('viewer (read-only auditor)', () => {
    it('can view dashboard', () => {
      expect(hasPermission('viewer', 'dashboard.read')).toBe(true);
    });
    it('can view vehicles', () => {
      expect(hasPermission('viewer', 'vehicles.read')).toBe(true);
    });
    it('can view reports', () => {
      expect(hasPermission('viewer', 'reports.read')).toBe(true);
    });
    it('cannot create vehicles', () => {
      expect(hasPermission('viewer', 'vehicles.create')).toBe(false);
    });
    it('cannot manage settings', () => {
      expect(hasPermission('viewer', 'settings.manage')).toBe(false);
    });
  });

  describe('null role has no access', () => {
    it('returns false for any permission', () => {
      expect(hasPermission(null, 'dashboard.read')).toBe(false);
      expect(hasPermission(null, 'vehicles.create')).toBe(false);
      expect(hasPermission(null, 'settings.manage')).toBe(false);
    });
  });
});

describe('hasAnyPermission', () => {
  it('returns true if user has at least one permission', () => {
    expect(hasAnyPermission('dispatcher', ['trips.create', 'invoices.create'])).toBe(true);
  });
  it('returns false if user has none', () => {
    expect(hasAnyPermission('driver', ['invoices.create', 'settings.manage'])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('returns true if user has all permissions', () => {
    expect(hasAllPermissions('admin', ['trips.create', 'invoices.create', 'settings.manage'])).toBe(true);
  });
  it('returns false if user lacks one', () => {
    expect(hasAllPermissions('dispatcher', ['trips.create', 'invoices.create'])).toBe(false);
  });
});

describe('getPermissionsForRole', () => {
  it('returns all permissions for admin', () => {
    const perms = getPermissionsForRole('admin');
    expect(perms.length).toBeGreaterThan(50); // Admin should have many permissions
  });
  it('returns limited set for driver', () => {
    const perms = getPermissionsForRole('driver');
    expect(perms.length).toBeLessThan(10);
    expect(perms).toContain('dashboard.read');
    expect(perms).toContain('trips.read');
  });
  it('every role in matrix is a valid OrganizationRole', () => {
    const validRoles: OrganizationRole[] = [
      'organization_owner', 'admin', 'operations_manager', 'dispatcher',
      'fleet_manager', 'accountant', 'maintenance_manager', 'hr_manager',
      'driver', 'customer', 'viewer',
    ];
    Object.keys(ROLE_PERMISSION_MATRIX).forEach(role => {
      expect(validRoles).toContain(role);
    });
  });
});

describe('Sidebar permission mapping coverage', () => {
  // Verify that every module accessible to admin is also mappable by the permission system
  it('admin can access all modules via permissions', () => {
    const adminPerms = getPermissionsForRole('admin');
    // Admin should have vehicle read, trip read, invoice read, settings manage
    expect(adminPerms).toContain('vehicles.read');
    expect(adminPerms).toContain('trips.read');
    expect(adminPerms).toContain('invoices.read');
    expect(adminPerms).toContain('settings.manage');
    expect(adminPerms).toContain('reports.read');
    expect(adminPerms).toContain('fuel.read');
    expect(adminPerms).toContain('maintenance.read');
  });
});
