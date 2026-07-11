/**
 * GARUD AI ERP — Permission System Tests
 * 
 * Verify that the role→permission matrix works correctly
 * and that permission checks return expected results.
 */

import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, hasAllPermissions, getPermissionsForRole } from '../../src/lib/permissions';
import type { OrganizationRole } from '../../src/types/organization';

describe('Permission System', () => {
  describe('organization_owner has all permissions', () => {
    it('can do everything', () => {
      expect(hasPermission('organization_owner', 'vehicles.create')).toBe(true);
      expect(hasPermission('organization_owner', 'invoices.delete')).toBe(true);
      expect(hasPermission('organization_owner', 'users.manage')).toBe(true);
      expect(hasPermission('organization_owner', 'settings.manage')).toBe(true);
    });
  });

  describe('driver has minimal permissions', () => {
    it('can read trips', () => {
      expect(hasPermission('driver', 'trips.read')).toBe(true);
    });

    it('cannot create trips', () => {
      expect(hasPermission('driver', 'trips.create')).toBe(false);
    });

    it('cannot delete vehicles', () => {
      expect(hasPermission('driver', 'vehicles.delete')).toBe(false);
    });

    it('cannot manage users', () => {
      expect(hasPermission('driver', 'users.manage')).toBe(false);
    });

    it('can create expenses', () => {
      expect(hasPermission('driver', 'expenses.create')).toBe(true);
    });
  });

  describe('accountant has finance permissions', () => {
    it('can create invoices', () => {
      expect(hasPermission('accountant', 'invoices.create')).toBe(true);
    });

    it('can manage payments', () => {
      expect(hasPermission('accountant', 'payments.create')).toBe(true);
    });

    it('cannot create vehicles', () => {
      expect(hasPermission('accountant', 'vehicles.create')).toBe(false);
    });

    it('cannot manage GPS', () => {
      expect(hasPermission('accountant', 'tracking.manage')).toBe(false);
    });
  });

  describe('fleet_manager has fleet permissions', () => {
    it('can CRUD vehicles', () => {
      expect(hasPermission('fleet_manager', 'vehicles.create')).toBe(true);
      expect(hasPermission('fleet_manager', 'vehicles.update')).toBe(true);
      expect(hasPermission('fleet_manager', 'vehicles.delete')).toBe(true);
    });

    it('can manage maintenance', () => {
      expect(hasPermission('fleet_manager', 'maintenance.create')).toBe(true);
    });

    it('cannot create invoices', () => {
      expect(hasPermission('fleet_manager', 'invoices.create')).toBe(false);
    });
  });

  describe('viewer is read-only', () => {
    it('can read vehicles', () => {
      expect(hasPermission('viewer', 'vehicles.read')).toBe(true);
    });

    it('cannot create anything', () => {
      expect(hasPermission('viewer', 'vehicles.create')).toBe(false);
      expect(hasPermission('viewer', 'trips.create')).toBe(false);
      expect(hasPermission('viewer', 'invoices.create')).toBe(false);
    });
  });

  describe('customer is very limited', () => {
    it('can read trips and invoices', () => {
      expect(hasPermission('customer', 'trips.read')).toBe(true);
      expect(hasPermission('customer', 'invoices.read')).toBe(true);
    });

    it('cannot create or modify anything', () => {
      expect(hasPermission('customer', 'trips.create')).toBe(false);
      expect(hasPermission('customer', 'vehicles.read')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if user has at least one permission', () => {
      expect(hasAnyPermission('driver', ['trips.read', 'trips.create'])).toBe(true);
    });

    it('returns false if user has none', () => {
      expect(hasAnyPermission('customer', ['vehicles.create', 'settings.manage'])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true if user has all listed', () => {
      expect(hasAllPermissions('fleet_manager', ['vehicles.read', 'vehicles.create'])).toBe(true);
    });

    it('returns false if missing any', () => {
      expect(hasAllPermissions('driver', ['trips.read', 'trips.create'])).toBe(false);
    });
  });

  describe('null role has no permissions', () => {
    it('returns false for any check', () => {
      expect(hasPermission(null, 'vehicles.read')).toBe(false);
      expect(hasAnyPermission(null, ['trips.read'])).toBe(false);
    });
  });

  describe('getPermissionsForRole', () => {
    it('returns array for valid role', () => {
      const perms = getPermissionsForRole('driver');
      expect(perms.length).toBeGreaterThan(0);
      expect(perms).toContain('trips.read');
    });

    it('organization_owner has the most permissions', () => {
      const ownerPerms = getPermissionsForRole('organization_owner');
      const driverPerms = getPermissionsForRole('driver');
      expect(ownerPerms.length).toBeGreaterThan(driverPerms.length);
    });
  });
});
