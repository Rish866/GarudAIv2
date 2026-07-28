// ============================================================
// useErpTransaction — Hook for integrated ERP operations
//
// ALL 18 transaction functions that cascade updates across modules.
// Use these INSTEAD of raw useModuleData.create() for any business
// operation that affects multiple tables.
//
// Usage:
//   const erp = useErpTransaction();
//   const result = await erp.recordPayment({ ... });
//   if (result.success) showToast('success', 'Payment recorded');
// ============================================================

import { useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { showToast } from '../components/ui/Toast';
import * as erp from '../services/erpTransactions';

type NoOrg = { success: false; error: string };
const noOrg: NoOrg = { success: false, error: 'No organization' };

export function useErpTransaction() {
  const { organizationId } = useOrganization();

  // Helper to check org before every call
  const withOrg = useCallback(<T>(fn: (orgId: string) => Promise<T>): Promise<T | NoOrg> => {
    if (!organizationId) { showToast('error', 'No organization'); return Promise.resolve(noOrg as T | NoOrg); }
    return fn(organizationId);
  }, [organizationId]);

  // ─── MASTER DATA ─────────────────────────────────────────────

  const createCustomer = useCallback(
    (data: Parameters<typeof erp.createCustomer>[1]) => withOrg(orgId => erp.createCustomer(orgId, data)),
    [withOrg]
  );

  const createVendor = useCallback(
    (data: Parameters<typeof erp.createVendor>[1]) => withOrg(orgId => erp.createVendor(orgId, data)),
    [withOrg]
  );

  const createVehicle = useCallback(
    (data: Parameters<typeof erp.createVehicle>[1]) => withOrg(orgId => erp.createVehicle(orgId, data)),
    [withOrg]
  );

  const createDriver = useCallback(
    (data: Parameters<typeof erp.createDriver>[1]) => withOrg(orgId => erp.createDriver(orgId, data)),
    [withOrg]
  );

  // ─── TRIP LIFECYCLE ──────────────────────────────────────────

  const createTrip = useCallback(
    (data: Parameters<typeof erp.createTrip>[1]) => withOrg(orgId => erp.createTrip(orgId, data)),
    [withOrg]
  );

  const assignTripResources = useCallback(
    (tripId: string, vehicleId: string, driverId: string, vehicleReg: string, driverName: string, driverPhone: string) =>
      withOrg(orgId => erp.assignTripResources(orgId, tripId, vehicleId, driverId, vehicleReg, driverName, driverPhone)),
    [withOrg]
  );

  const completeTrip = useCallback(
    (tripId: string, deliveryDate: string) => withOrg(orgId => erp.completeTrip(orgId, tripId, deliveryDate)),
    [withOrg]
  );

  const cancelTrip = useCallback(
    (tripId: string, reason: string) => withOrg(orgId => erp.cancelTrip(orgId, tripId, reason)),
    [withOrg]
  );

  // ─── FINANCIAL ───────────────────────────────────────────────

  const createInvoice = useCallback(
    (data: Parameters<typeof erp.createInvoice>[1]) => withOrg(orgId => erp.createInvoice(orgId, data)),
    [withOrg]
  );

  const generateInvoiceFromTrip = useCallback(
    (tripId: string, invoiceNumber: string, gstPercent?: number) =>
      withOrg(orgId => erp.generateInvoiceFromTrip(orgId, tripId, invoiceNumber, gstPercent)),
    [withOrg]
  );

  const recordPayment = useCallback(
    (data: Parameters<typeof erp.recordPayment>[1]) => withOrg(orgId => erp.recordPayment(orgId, data)),
    [withOrg]
  );

  const recordExpense = useCallback(
    (data: Parameters<typeof erp.recordExpense>[1]) => withOrg(orgId => erp.recordExpense(orgId, data)),
    [withOrg]
  );

  const recordVendorPayment = useCallback(
    (data: Parameters<typeof erp.recordVendorPayment>[1]) => withOrg(orgId => erp.recordVendorPayment(orgId, data)),
    [withOrg]
  );

  // ─── FLEET OPERATIONS ────────────────────────────────────────

  const recordFuel = useCallback(
    (data: Parameters<typeof erp.recordFuel>[1]) => withOrg(orgId => erp.recordFuel(orgId, data)),
    [withOrg]
  );

  const recordMaintenance = useCallback(
    (data: Parameters<typeof erp.recordMaintenance>[1]) => withOrg(orgId => erp.recordMaintenance(orgId, data)),
    [withOrg]
  );

  const completeMaintenance = useCallback(
    (maintenanceId: string, actualCost: number) => withOrg(orgId => erp.completeMaintenance(orgId, maintenanceId, actualCost)),
    [withOrg]
  );

  const recordChallan = useCallback(
    (data: Parameters<typeof erp.recordChallan>[1]) => withOrg(orgId => erp.recordChallan(orgId, data)),
    [withOrg]
  );

  const createWorkOrder = useCallback(
    (data: Parameters<typeof erp.createWorkOrder>[1]) => withOrg(orgId => erp.createWorkOrder(orgId, data)),
    [withOrg]
  );

  return {
    // Master Data
    createCustomer,
    createVendor,
    createVehicle,
    createDriver,
    // Trip Lifecycle
    createTrip,
    assignTripResources,
    completeTrip,
    cancelTrip,
    // Financial
    createInvoice,
    generateInvoiceFromTrip,
    recordPayment,
    recordExpense,
    recordVendorPayment,
    // Fleet Operations
    recordFuel,
    recordMaintenance,
    completeMaintenance,
    recordChallan,
    createWorkOrder,
  };
}
