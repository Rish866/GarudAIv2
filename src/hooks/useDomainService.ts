// ============================================================
// useDomainService — React hook for the Atomic Domain Service
//
// REPLACES: useErpTransaction (which had sequential, non-atomic calls)
//
// This hook:
// 1. Provides all business operations as async functions
// 2. Automatically passes organizationId + userRole
// 3. Handles approval rejections gracefully
// 4. Shows error toasts on failure
// 5. Shows approval-needed toasts when blocked
//
// UI RULE: Components call ONLY this hook for business operations.
// No supabase.from().insert() in any component. Ever.
// ============================================================

import { useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { showToast } from '../components/ui/Toast';
import * as domain from '../services/domainService';
import type { TransactionResult } from '../services/domainService';
import type { OrganizationRole } from '../types/organization';

function handleResult<T>(result: TransactionResult<T>, successMsg?: string): TransactionResult<T> {
  if (result.pendingApproval) {
    showToast('warning', result.approvalMessage || 'This operation requires approval');
  } else if (!result.success) {
    showToast('error', result.error || 'Operation failed');
  } else if (successMsg) {
    showToast('success', successMsg);
  }
  return result;
}

export function useDomainService() {
  const { organizationId, role } = useOrganization();

  const withOrg = useCallback(<T>(fn: (orgId: string, role: OrganizationRole | null) => Promise<TransactionResult<T>>): Promise<TransactionResult<T>> => {
    if (!organizationId) {
      showToast('error', 'No organization');
      return Promise.resolve({ success: false, error: 'No organization' });
    }
    return fn(organizationId, role);
  }, [organizationId, role]);

  // ─── Master Data ─────────────────────────────────────────

  const createCustomer = useCallback(
    (data: Parameters<typeof domain.createCustomer>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.createCustomer(orgId, data), 'Customer created')),
    [withOrg]
  );

  const createVendor = useCallback(
    (data: Parameters<typeof domain.createVendor>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.createVendor(orgId, data), 'Vendor created')),
    [withOrg]
  );

  const createVehicle = useCallback(
    (data: Parameters<typeof domain.createVehicle>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.createVehicle(orgId, data), 'Vehicle added')),
    [withOrg]
  );

  const createDriver = useCallback(
    (data: Parameters<typeof domain.createDriver>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.createDriver(orgId, data), 'Driver added')),
    [withOrg]
  );

  // ─── Financial ───────────────────────────────────────────

  const createInvoice = useCallback(
    (data: Parameters<typeof domain.createInvoice>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.createInvoice(orgId, data), 'Invoice created')),
    [withOrg]
  );

  const recordPayment = useCallback(
    (data: Parameters<typeof domain.recordPayment>[1]) =>
      withOrg(async (orgId, userRole) => handleResult(await domain.recordPayment(orgId, data, userRole), 'Payment recorded')),
    [withOrg]
  );

  const recordExpense = useCallback(
    (data: Parameters<typeof domain.recordExpense>[1]) =>
      withOrg(async (orgId, userRole) => handleResult(await domain.recordExpense(orgId, data, userRole))),
    [withOrg]
  );

  const recordFuel = useCallback(
    (data: Parameters<typeof domain.recordFuel>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.recordFuel(orgId, data), 'Fuel entry recorded')),
    [withOrg]
  );

  const recordVendorPayment = useCallback(
    (data: Parameters<typeof domain.recordVendorPayment>[1]) =>
      withOrg(async (orgId, userRole) => handleResult(await domain.recordVendorPayment(orgId, data, userRole), 'Vendor payment recorded')),
    [withOrg]
  );

  // ─── Trip Lifecycle ──────────────────────────────────────

  const createTrip = useCallback(
    (data: Parameters<typeof domain.createTrip>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.createTrip(orgId, data), 'Trip created')),
    [withOrg]
  );

  const completeTrip = useCallback(
    (tripId: string, deliveryDate: string) =>
      withOrg(async (orgId) => handleResult(await domain.completeTrip(orgId, tripId, deliveryDate), 'Trip completed')),
    [withOrg]
  );

  const cancelTrip = useCallback(
    (tripId: string, reason: string) =>
      withOrg(async (orgId, userRole) => handleResult(await domain.cancelTrip(orgId, tripId, reason, userRole))),
    [withOrg]
  );

  // ─── Fleet Operations ────────────────────────────────────

  const recordMaintenance = useCallback(
    (data: Parameters<typeof domain.recordMaintenance>[1]) =>
      withOrg(async (orgId, userRole) => handleResult(await domain.recordMaintenance(orgId, data, userRole), 'Maintenance recorded')),
    [withOrg]
  );

  const recordChallan = useCallback(
    (data: Parameters<typeof domain.recordChallan>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.recordChallan(orgId, data), 'Challan recorded')),
    [withOrg]
  );

  const createWorkOrder = useCallback(
    (data: Parameters<typeof domain.createWorkOrder>[1]) =>
      withOrg(async (orgId) => handleResult(await domain.createWorkOrder(orgId, data), 'Work order created')),
    [withOrg]
  );

  return {
    createCustomer,
    createVendor,
    createVehicle,
    createDriver,
    createInvoice,
    recordPayment,
    recordExpense,
    recordFuel,
    recordVendorPayment,
    createTrip,
    completeTrip,
    cancelTrip,
    recordMaintenance,
    recordChallan,
    createWorkOrder,
  };
}
