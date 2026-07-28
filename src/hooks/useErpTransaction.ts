// ============================================================
// useErpTransaction — Hook for integrated ERP operations
//
// Provides access to transaction functions that cascade updates
// across all modules. Use these INSTEAD of raw useModuleData.create()
// for any business operation that affects multiple modules.
//
// Usage:
//   const { createCustomer, recordPayment, recordExpense } = useErpTransaction();
//   const result = await recordPayment({ ... });
//   if (result.success) showToast('success', 'Payment recorded');
//
// Every function in this hook:
// 1. Calls a server-side RPC (atomic multi-table update)
// 2. Invalidates all affected TanStack Query caches
// 3. All dependent UI components auto-refresh
// ============================================================

import { useCallback } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { showToast } from '../components/ui/Toast';
import * as erp from '../services/erpTransactions';

export function useErpTransaction() {
  const { organizationId } = useOrganization();

  const createCustomer = useCallback(async (customer: Parameters<typeof erp.createCustomer>[1]) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.createCustomer(organizationId, customer);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  const createInvoice = useCallback(async (invoice: Parameters<typeof erp.createInvoice>[1]) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.createInvoice(organizationId, invoice);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  const recordPayment = useCallback(async (payment: Parameters<typeof erp.recordPayment>[1]) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.recordPayment(organizationId, payment);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  const recordExpense = useCallback(async (expense: Parameters<typeof erp.recordExpense>[1]) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.recordExpense(organizationId, expense);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  const recordFuel = useCallback(async (fuel: Parameters<typeof erp.recordFuel>[1]) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.recordFuel(organizationId, fuel);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  const completeTrip = useCallback(async (tripId: string, deliveryDate: string) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.completeTrip(organizationId, tripId, deliveryDate);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  const assignTripResources = useCallback(async (
    tripId: string, vehicleId: string, driverId: string,
    vehicleReg: string, driverName: string, driverPhone: string
  ) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.assignTripResources(organizationId, tripId, vehicleId, driverId, vehicleReg, driverName, driverPhone);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  const recordVendorPayment = useCallback(async (payment: Parameters<typeof erp.recordVendorPayment>[1]) => {
    if (!organizationId) { showToast('error', 'No organization'); return { success: false, error: 'No org' }; }
    const result = await erp.recordVendorPayment(organizationId, payment);
    if (!result.success) showToast('error', result.error || 'Failed');
    return result;
  }, [organizationId]);

  return {
    createCustomer,
    createInvoice,
    recordPayment,
    recordExpense,
    recordFuel,
    completeTrip,
    assignTripResources,
    recordVendorPayment,
  };
}
