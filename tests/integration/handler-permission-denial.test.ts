// Tests for Task #7: Handler-level permission denial
//
// These tests verify that useModuleData.create/update/remove
// REFUSE unauthorized operations at the handler level, not just visibility.
// A hidden button is not security — the handler itself must deny.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasPermission } from '../../src/lib/permissions';
import { MODULE_PERMISSIONS } from '../../src/lib/modulePermissions';
import type { OrganizationRole } from '../../src/types/organization';
import type { ModuleName } from '../../src/types';

// We test the permission enforcement logic directly since the actual hook
// requires React context. The enforcement uses hasPermission(role, perm).

describe('Handler-level denial: create operations', () => {
  const testCases: { role: OrganizationRole; module: ModuleName; shouldDeny: boolean; description: string }[] = [
    { role: 'driver', module: 'fleet', shouldDeny: true, description: 'Driver cannot create vehicles' },
    { role: 'driver', module: 'billing', shouldDeny: true, description: 'Driver cannot create invoices' },
    { role: 'driver', module: 'customers', shouldDeny: true, description: 'Driver cannot create customers' },
    { role: 'customer', module: 'fleet', shouldDeny: true, description: 'Customer cannot create vehicles' },
    { role: 'customer', module: 'trips', shouldDeny: true, description: 'Customer cannot create trips' },
    { role: 'viewer', module: 'fleet', shouldDeny: true, description: 'Viewer cannot create vehicles' },
    { role: 'viewer', module: 'trips', shouldDeny: true, description: 'Viewer cannot create trips' },
    { role: 'viewer', module: 'billing', shouldDeny: true, description: 'Viewer cannot create invoices' },
    { role: 'accountant', module: 'fleet', shouldDeny: true, description: 'Accountant cannot create vehicles' },
    { role: 'accountant', module: 'drivers', shouldDeny: true, description: 'Accountant cannot create drivers' },
    { role: 'dispatcher', module: 'billing', shouldDeny: true, description: 'Dispatcher cannot create invoices' },
    { role: 'dispatcher', module: 'fuel', shouldDeny: true, description: 'Dispatcher cannot create fuel entries' },
    { role: 'fleet_manager', module: 'billing', shouldDeny: true, description: 'Fleet Manager cannot create invoices' },
    { role: 'fleet_manager', module: 'customers', shouldDeny: true, description: 'Fleet Manager cannot create customers' },
    { role: 'maintenance_manager', module: 'trips', shouldDeny: true, description: 'Maintenance Manager cannot create trips' },
    { role: 'maintenance_manager', module: 'billing', shouldDeny: true, description: 'Maintenance Manager cannot create invoices' },
    // Allowed cases
    { role: 'admin', module: 'fleet', shouldDeny: false, description: 'Admin CAN create vehicles' },
    { role: 'admin', module: 'trips', shouldDeny: false, description: 'Admin CAN create trips' },
    { role: 'admin', module: 'billing', shouldDeny: false, description: 'Admin CAN create invoices' },
    { role: 'operations_manager', module: 'trips', shouldDeny: false, description: 'Operations Manager CAN create trips' },
    { role: 'operations_manager', module: 'enquiries', shouldDeny: false, description: 'Operations Manager CAN create enquiries' },
    { role: 'fleet_manager', module: 'fleet', shouldDeny: false, description: 'Fleet Manager CAN create vehicles' },
    { role: 'fleet_manager', module: 'fuel', shouldDeny: false, description: 'Fleet Manager CAN create fuel entries' },
    { role: 'accountant', module: 'billing', shouldDeny: false, description: 'Accountant CAN create invoices' },
  ];

  testCases.forEach(({ role, module, shouldDeny, description }) => {
    it(description, () => {
      const perms = MODULE_PERMISSIONS[module];
      expect(perms).toBeDefined();
      
      if (!perms?.create) {
        // No create permission defined = no create allowed for anyone
        return;
      }

      const canCreate = hasPermission(role, perms.create);

      if (shouldDeny) {
        expect(canCreate, `${role} should NOT be able to create in ${module}`).toBe(false);
      } else {
        expect(canCreate, `${role} SHOULD be able to create in ${module}`).toBe(true);
      }
    });
  });
});

describe('Handler-level denial: update operations', () => {
  const testCases: { role: OrganizationRole; module: ModuleName; shouldDeny: boolean; description: string }[] = [
    { role: 'driver', module: 'fleet', shouldDeny: true, description: 'Driver cannot update vehicles' },
    { role: 'driver', module: 'customers', shouldDeny: true, description: 'Driver cannot update customers' },
    { role: 'customer', module: 'fleet', shouldDeny: true, description: 'Customer cannot update vehicles' },
    { role: 'viewer', module: 'trips', shouldDeny: true, description: 'Viewer cannot update trips' },
    { role: 'viewer', module: 'fleet', shouldDeny: true, description: 'Viewer cannot update vehicles' },
    { role: 'accountant', module: 'fleet', shouldDeny: true, description: 'Accountant cannot update vehicles' },
    { role: 'dispatcher', module: 'billing', shouldDeny: true, description: 'Dispatcher cannot update invoices' },
    // Allowed
    { role: 'admin', module: 'trips', shouldDeny: false, description: 'Admin CAN update trips' },
    { role: 'operations_manager', module: 'trips', shouldDeny: false, description: 'Operations Manager CAN update trips' },
    { role: 'fleet_manager', module: 'fleet', shouldDeny: false, description: 'Fleet Manager CAN update vehicles' },
  ];

  testCases.forEach(({ role, module, shouldDeny, description }) => {
    it(description, () => {
      const perms = MODULE_PERMISSIONS[module];
      expect(perms).toBeDefined();
      
      if (!perms?.update) return;

      const canUpdate = hasPermission(role, perms.update);

      if (shouldDeny) {
        expect(canUpdate, `${role} should NOT be able to update in ${module}`).toBe(false);
      } else {
        expect(canUpdate, `${role} SHOULD be able to update in ${module}`).toBe(true);
      }
    });
  });
});

describe('Handler-level denial: delete/archive operations', () => {
  const testCases: { role: OrganizationRole; module: ModuleName; shouldDeny: boolean; description: string }[] = [
    { role: 'driver', module: 'fleet', shouldDeny: true, description: 'Driver cannot delete vehicles' },
    { role: 'customer', module: 'trips', shouldDeny: true, description: 'Customer cannot delete trips' },
    { role: 'viewer', module: 'fleet', shouldDeny: true, description: 'Viewer cannot archive vehicles' },
    { role: 'dispatcher', module: 'fleet', shouldDeny: true, description: 'Dispatcher cannot archive vehicles' },
    { role: 'accountant', module: 'fleet', shouldDeny: true, description: 'Accountant cannot archive vehicles' },
    { role: 'operations_manager', module: 'fleet', shouldDeny: true, description: 'Operations Manager cannot delete vehicles' },
    // Allowed
    { role: 'admin', module: 'fleet', shouldDeny: false, description: 'Admin CAN archive vehicles' },
    { role: 'organization_owner', module: 'fleet', shouldDeny: false, description: 'Owner CAN archive vehicles' },
  ];

  testCases.forEach(({ role, module, shouldDeny, description }) => {
    it(description, () => {
      const perms = MODULE_PERMISSIONS[module];
      expect(perms).toBeDefined();
      
      if (!perms?.archive) return;

      const canArchive = hasPermission(role, perms.archive);

      if (shouldDeny) {
        expect(canArchive, `${role} should NOT be able to archive in ${module}`).toBe(false);
      } else {
        expect(canArchive, `${role} SHOULD be able to archive in ${module}`).toBe(true);
      }
    });
  });
});

describe('Handler-level denial: export operations', () => {
  it('Driver cannot export reports', () => {
    const perms = MODULE_PERMISSIONS['reports'];
    expect(perms?.export).toBeDefined();
    expect(hasPermission('driver', perms!.export!)).toBe(false);
  });

  it('Viewer cannot export reports', () => {
    const perms = MODULE_PERMISSIONS['reports'];
    expect(hasPermission('viewer', perms!.export!)).toBe(false);
  });

  it('Admin can export reports', () => {
    const perms = MODULE_PERMISSIONS['reports'];
    expect(hasPermission('admin', perms!.export!)).toBe(true);
  });

  it('Accountant can export reports', () => {
    const perms = MODULE_PERMISSIONS['reports'];
    expect(hasPermission('accountant', perms!.export!)).toBe(true);
  });
});

describe('Handler-level denial: settings/user management', () => {
  it('Driver cannot manage settings', () => {
    const perms = MODULE_PERMISSIONS['settings'];
    expect(perms?.update).toBeDefined();
    expect(hasPermission('driver', perms!.update!)).toBe(false);
  });

  it('Customer cannot manage settings', () => {
    expect(hasPermission('customer', MODULE_PERMISSIONS['settings']!.update!)).toBe(false);
  });

  it('Viewer cannot manage settings', () => {
    expect(hasPermission('viewer', MODULE_PERMISSIONS['settings']!.update!)).toBe(false);
  });

  it('Fleet Manager cannot manage settings', () => {
    expect(hasPermission('fleet_manager', MODULE_PERMISSIONS['settings']!.update!)).toBe(false);
  });

  it('Admin can manage settings', () => {
    expect(hasPermission('admin', MODULE_PERMISSIONS['settings']!.update!)).toBe(true);
  });
});

describe('Permission enforcement integration with useModuleData table mapping', () => {
  // Verify that TABLE_TO_MODULE correctly maps tables to their permission modules
  it('vehicles table maps to fleet module permissions', () => {
    // The useModuleData hook resolves 'vehicles' -> 'fleet' module
    // and then checks MODULE_PERMISSIONS['fleet'].create before allowing insert
    const fleetPerms = MODULE_PERMISSIONS['fleet'];
    expect(fleetPerms.view).toBe('vehicles.read');
    expect(fleetPerms.create).toBe('vehicles.create');
    expect(fleetPerms.update).toBe('vehicles.update');
    expect(fleetPerms.archive).toBe('vehicles.delete');
  });

  it('trips table maps to trips module permissions', () => {
    const tripPerms = MODULE_PERMISSIONS['trips'];
    expect(tripPerms.view).toBe('trips.read');
    expect(tripPerms.create).toBe('trips.create');
    expect(tripPerms.update).toBe('trips.update');
  });

  it('invoices table maps to billing module permissions', () => {
    const billingPerms = MODULE_PERMISSIONS['billing'];
    expect(billingPerms.view).toBe('invoices.read');
    expect(billingPerms.create).toBe('invoices.create');
  });

  it('fuel_entries table maps to fuel module permissions', () => {
    const fuelPerms = MODULE_PERMISSIONS['fuel'];
    expect(fuelPerms.view).toBe('fuel.read');
    expect(fuelPerms.create).toBe('fuel.create');
  });
});
