// ============================================================
// BACKGROUND JOBS ENGINE
//
// Automated ERP housekeeping tasks that run periodically.
// In a full production system these would run as Supabase Edge
// Functions on a cron schedule. For now, they can be triggered
// manually or via a client-side scheduler on admin login.
//
// JOBS:
// ─────────────────────────────────────────────────────────────
// 1. OVERDUE INVOICE DETECTION
//    Marks invoices as 'overdue' when due_date < today and
//    balance > 0. Creates notifications for accountant.
//
// 2. DOCUMENT EXPIRY ALERTS
//    Scans vehicles for fitness/insurance/permit/PUC expiring
//    within 30/15/7 days. Creates notifications for fleet_manager.
//
// 3. DRIVER LICENSE EXPIRY
//    Scans drivers for license expiring within 30 days.
//    Creates notification for HR + fleet_manager.
//
// 4. APPROVAL REQUEST EXPIRY
//    Marks pending approvals as 'expired' after their expiry time.
//
// 5. STALE TRIP DETECTION
//    Trips in 'loading' or 'assigned' for > 48 hours without
//    status update. Notifies operations_manager.
//
// 6. CUSTOMER OUTSTANDING RECONCILIATION
//    Recalculates customer.outstanding from actual invoice balances
//    to fix any drift from failed cascade operations.
// ============================================================

import { supabase } from './supabase';
import * as notificationEngine from './notificationEngine';

interface JobResult {
  job: string;
  processed: number;
  errors: string[];
}

// ============================================================
// JOB 1: OVERDUE INVOICE DETECTION
// ============================================================

export async function detectOverdueInvoices(organizationId: string): Promise<JobResult> {
  const today = new Date().toISOString().split('T')[0];
  const errors: string[] = [];
  let processed = 0;

  try {
    // Find invoices that are overdue but not yet marked
    const { data: overdueInvoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, balance_amount, due_date')
      .eq('organization_id', organizationId)
      .gt('balance_amount', 0)
      .lt('due_date', today)
      .in('status', ['sent', 'partial']);

    if (error) { errors.push(error.message); return { job: 'overdue_invoices', processed, errors }; }
    if (!overdueInvoices || overdueInvoices.length === 0) return { job: 'overdue_invoices', processed: 0, errors };

    // Update status to overdue
    const ids = overdueInvoices.map(inv => inv.id);
    await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('organization_id', organizationId)
      .in('id', ids);

    processed = overdueInvoices.length;

    // Create notifications for each overdue invoice
    for (const inv of overdueInvoices.slice(0, 10)) { // Limit to 10 notifications per run
      const daysOverdue = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / 86400000);
      await notificationEngine.emit(organizationId, {
        type: 'invoice.created', // Using existing type for compatibility
        invoiceNumber: inv.invoice_number || '',
        customerName: inv.customer_name || '',
        amount: inv.balance_amount || 0,
      });
    }
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return { job: 'overdue_invoices', processed, errors };
}

// ============================================================
// JOB 2: DOCUMENT EXPIRY ALERTS
// ============================================================

export async function checkDocumentExpiry(organizationId: string): Promise<JobResult> {
  const errors: string[] = [];
  let processed = 0;

  try {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];

    // Check vehicle documents
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, reg_number, fitness_expiry, insurance_expiry, permit_expiry, puc_expiry')
      .eq('organization_id', organizationId)
      .neq('status', 'inactive');

    if (!vehicles) return { job: 'document_expiry', processed: 0, errors };

    for (const vehicle of vehicles) {
      const docs = [
        { type: 'Fitness', expiry: vehicle.fitness_expiry },
        { type: 'Insurance', expiry: vehicle.insurance_expiry },
        { type: 'Permit', expiry: vehicle.permit_expiry },
        { type: 'PUC', expiry: vehicle.puc_expiry },
      ];

      for (const doc of docs) {
        if (!doc.expiry) continue;
        const expiryDate = new Date(doc.expiry);
        const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / 86400000);

        // Alert at 30, 15, 7, 0 days
        if (daysRemaining <= 30 && daysRemaining >= 0) {
          if (daysRemaining === 30 || daysRemaining === 15 || daysRemaining === 7 || daysRemaining <= 1) {
            await notificationEngine.emit(organizationId, {
              type: 'document.expiring',
              entityType: 'Vehicle',
              entityName: vehicle.reg_number,
              documentType: doc.type,
              daysRemaining,
            });
            processed++;
          }
        }
      }
    }
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return { job: 'document_expiry', processed, errors };
}

// ============================================================
// JOB 3: DRIVER LICENSE EXPIRY
// ============================================================

export async function checkDriverLicenseExpiry(organizationId: string): Promise<JobResult> {
  const errors: string[] = [];
  let processed = 0;

  try {
    const today = new Date();
    const { data: drivers } = await supabase
      .from('drivers')
      .select('id, name, license_expiry')
      .eq('organization_id', organizationId)
      .neq('status', 'inactive');

    if (!drivers) return { job: 'driver_license_expiry', processed: 0, errors };

    for (const driver of drivers) {
      if (!driver.license_expiry) continue;
      const expiryDate = new Date(driver.license_expiry);
      const daysRemaining = Math.floor((expiryDate.getTime() - today.getTime()) / 86400000);

      if (daysRemaining <= 30 && daysRemaining >= 0) {
        if (daysRemaining === 30 || daysRemaining === 15 || daysRemaining === 7 || daysRemaining <= 1) {
          await notificationEngine.emit(organizationId, {
            type: 'document.expiring',
            entityType: 'Driver',
            entityName: driver.name,
            documentType: 'Driving License',
            daysRemaining,
          });
          processed++;
        }
      }
    }
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return { job: 'driver_license_expiry', processed, errors };
}

// ============================================================
// JOB 4: STALE TRIP DETECTION
// ============================================================

export async function detectStaleTrips(organizationId: string): Promise<JobResult> {
  const errors: string[] = [];
  let processed = 0;

  try {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Find trips stuck in 'assigned' or 'loading' for > 48 hours
    const { data: staleTrips } = await supabase
      .from('trips')
      .select('id, trip_number, status, vehicle_reg, driver_name')
      .eq('organization_id', organizationId)
      .in('status', ['assigned', 'loading'])
      .lt('updated_at', twoDaysAgo);

    if (!staleTrips || staleTrips.length === 0) return { job: 'stale_trips', processed: 0, errors };

    for (const trip of staleTrips.slice(0, 5)) {
      await notificationEngine.emit(organizationId, {
        type: 'trip.created', // Reusing for notification
        tripNumber: trip.trip_number || '',
        origin: `STALE: ${trip.status} for 48h+`,
        destination: trip.vehicle_reg || '',
        customerName: trip.driver_name || '',
      });
      processed++;
    }
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return { job: 'stale_trips', processed, errors };
}

// ============================================================
// JOB 5: CUSTOMER OUTSTANDING RECONCILIATION
// ============================================================

export async function reconcileCustomerOutstanding(organizationId: string): Promise<JobResult> {
  const errors: string[] = [];
  let processed = 0;

  try {
    // Get all customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, outstanding')
      .eq('organization_id', organizationId);

    if (!customers) return { job: 'reconcile_outstanding', processed: 0, errors };

    for (const customer of customers) {
      // Calculate actual outstanding from invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('balance_amount')
        .eq('organization_id', organizationId)
        .eq('customer_id', customer.id)
        .gt('balance_amount', 0)
        .neq('status', 'cancelled');

      const actualOutstanding = (invoices || []).reduce((sum, inv) => sum + (inv.balance_amount || 0), 0);

      // Fix drift if > ₹1 difference
      if (Math.abs((customer.outstanding || 0) - actualOutstanding) > 1) {
        await supabase
          .from('customers')
          .update({ outstanding: actualOutstanding })
          .eq('id', customer.id)
          .eq('organization_id', organizationId);
        processed++;
      }
    }
  } catch (e: unknown) {
    errors.push(e instanceof Error ? e.message : 'Unknown error');
  }

  return { job: 'reconcile_outstanding', processed, errors };
}

// ============================================================
// RUN ALL JOBS
// ============================================================

/**
 * Run all background jobs for an organization.
 * Call this on admin login or via a scheduled trigger.
 */
export async function runAllJobs(organizationId: string): Promise<JobResult[]> {
  const results: JobResult[] = [];

  results.push(await detectOverdueInvoices(organizationId));
  results.push(await checkDocumentExpiry(organizationId));
  results.push(await checkDriverLicenseExpiry(organizationId));
  results.push(await detectStaleTrips(organizationId));
  results.push(await reconcileCustomerOutstanding(organizationId));

  return results;
}
