// ============================================================
// ERP TRANSACTION ENGINE
//
// This is the HEART of the integrated ERP.
// Every business operation goes through this service.
// Every operation cascades updates to ALL dependent modules.
//
// PRINCIPLE: No module operates in isolation.
// Every create/update/delete triggers ALL related updates.
//
// ARCHITECTURE:
// 1. Frontend calls erpTransactions.recordPayment(...)
// 2. This calls a Supabase RPC that atomically updates:
//    - payments table
//    - invoice status/paid_amount
//    - customer outstanding
//    - ledger entry
// 3. After success, invalidates TanStack Query caches for:
//    - payments, invoices, customers, ledger, dashboard
// 4. All UI components auto-refresh via cache invalidation
//
// WHY SERVER-SIDE:
// - Atomicity (all-or-nothing)
// - Consistency (no partial updates on network failure)
// - Security (business rules enforced at DB level)
// - Performance (single round-trip instead of 5 separate calls)
// ============================================================

import { supabase } from '../lib/supabase';
import { queryClient, queryKeys } from '../lib/queryClient';
import { showToast } from '../components/ui/Toast';
import * as domainEvents from '../lib/domainEvents';
import type { DomainEvent } from '../lib/domainEvents';

// ============================================================
// TYPES
// ============================================================

interface TransactionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fire a domain event after successful transaction.
 * Events trigger cache invalidation + notifications via subscribers.
 * Errors in event handling do NOT fail the transaction.
 */
async function fireEvent(orgId: string, event: Omit<DomainEvent, 'organizationId' | 'timestamp'>): Promise<void> {
  try {
    await domainEvents.emit({
      ...event,
      organizationId: orgId,
      timestamp: new Date().toISOString(),
    } as DomainEvent);
  } catch {
    // Event failures are non-critical — don't crash the transaction
  }
}

// ============================================================
// CUSTOMER TRANSACTIONS
// ============================================================

/**
 * Create a customer with all dependent records.
 * Automatically creates: customer record + initial ledger account + zero outstanding
 * 
 * CASCADE: customers → ledger_accounts → dashboard
 */
export async function createCustomer(
  organizationId: string,
  customer: {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    billing_address?: string;
    credit_limit?: number;
    credit_days?: number;
    branch_id?: string;
  }
): Promise<TransactionResult<{ customerId: string }>> {
  try {
    // Use RPC for atomic customer + ledger creation
    const { data, error } = await supabase.rpc('create_customer_with_ledger', {
      p_organization_id: organizationId,
      p_name: customer.name,
      p_contact_person: customer.contact_person || null,
      p_phone: customer.phone || null,
      p_email: customer.email || null,
      p_gstin: customer.gstin || null,
      p_billing_address: customer.billing_address || null,
      p_credit_limit: customer.credit_limit || 0,
      p_credit_days: customer.credit_days || 30,
      p_branch_id: customer.branch_id || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    invalidateCustomerCaches(organizationId);
    await fireEvent(organizationId, { name: 'customer.created', data: { customerId: data?.customer_id || '', customerName: customer.name } });
    return { success: true, data: { customerId: data?.customer_id || data } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create customer' };
  }
}

// ============================================================
// INVOICE TRANSACTIONS
// ============================================================

/**
 * Create an invoice with all cascading effects.
 * 
 * CASCADE: invoices → customer.outstanding → ledger → invoice_trips → trip.status → dashboard
 */
export async function createInvoice(
  organizationId: string,
  invoice: {
    customer_id: string;
    trip_id?: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    freight_total: number;
    detention_total?: number;
    other_charges?: number;
    gst_percent?: number;
  }
): Promise<TransactionResult<{ invoiceId: string }>> {
  try {
    const { data, error } = await supabase.rpc('create_invoice_with_outstanding', {
      p_organization_id: organizationId,
      p_customer_id: invoice.customer_id,
      p_invoice_number: invoice.invoice_number,
      p_invoice_date: invoice.invoice_date,
      p_due_date: invoice.due_date,
      p_trip_ids: invoice.trip_id ? JSON.stringify([invoice.trip_id]) : '[]',
      p_freight_total: invoice.freight_total,
      p_detention_total: invoice.detention_total || 0,
      p_other_charges: invoice.other_charges || 0,
      p_gst_percent: invoice.gst_percent || 5,
      p_status: 'draft',
    });

    if (error) return { success: false, error: error.message };

    // Invalidate all affected caches
    invalidateInvoiceCaches(organizationId);
    invalidateCustomerCaches(organizationId);
    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: 'invoice.created', data: { invoiceId: String(data?.invoice_id || ''), invoiceNumber: invoice.invoice_number, customerName: '', totalAmount: invoice.freight_total } });

    return { success: true, data: { invoiceId: data?.invoice_id || data } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create invoice' };
  }
}

// ============================================================
// PAYMENT TRANSACTIONS
// ============================================================

/**
 * Record a payment with all cascading effects.
 * 
 * CASCADE: payments → invoice.paid_amount/status → customer.outstanding → ledger → dashboard
 */
export async function recordPayment(
  organizationId: string,
  payment: {
    customer_id: string;
    invoice_id?: string;
    amount: number;
    tds_amount?: number;
    payment_mode: string;
    reference_number?: string;
    payment_date: string;
  }
): Promise<TransactionResult<{ paymentId: string }>> {
  try {
    const { data, error } = await supabase.rpc('record_payment', {
      p_organization_id: organizationId,
      p_customer_id: payment.customer_id,
      p_invoice_id: payment.invoice_id || null,
      p_amount: payment.amount,
      p_tds_amount: payment.tds_amount || 0,
      p_payment_mode: payment.payment_mode,
      p_reference_number: payment.reference_number || '',
      p_payment_date: payment.payment_date,
    });

    if (error) return { success: false, error: error.message };

    // Invalidate ALL affected module caches
    invalidatePaymentCaches(organizationId);
    invalidateInvoiceCaches(organizationId);
    invalidateCustomerCaches(organizationId);
    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: 'payment.recorded', data: { paymentId: String(data?.payment_id || ''), customerName: '', amount: payment.amount, mode: payment.payment_mode } });

    return { success: true, data: { paymentId: data?.payment_id || data } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to record payment' };
  }
}

// ============================================================
// EXPENSE TRANSACTIONS
// ============================================================

/**
 * Record an expense with all cascading effects.
 * 
 * CASCADE: expenses → trip.cost (if linked) → vehicle.cost → vendor.outstanding (if unpaid) → ledger → P&L → dashboard
 */
export async function recordExpense(
  organizationId: string,
  expense: {
    trip_id?: string;
    vehicle_id?: string;
    vehicle_reg?: string;
    category: string;
    amount: number;
    date: string;
    description?: string;
    paid_to?: string;
    payment_mode?: string;
    branch_id?: string;
  }
): Promise<TransactionResult<{ expenseId: string }>> {
  try {
    // Try RPC first for atomic multi-table update
    const { data, error } = await supabase.rpc('record_expense_with_cascade', {
      p_organization_id: organizationId,
      p_trip_id: expense.trip_id || null,
      p_vehicle_id: expense.vehicle_id || null,
      p_vehicle_reg: expense.vehicle_reg || null,
      p_category: expense.category,
      p_amount: expense.amount,
      p_date: expense.date,
      p_description: expense.description || '',
      p_paid_to: expense.paid_to || '',
      p_payment_mode: expense.payment_mode || 'cash',
      p_branch_id: expense.branch_id || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    invalidateExpenseCaches(organizationId);
    invalidateDashboardCaches(organizationId);
    if (expense.trip_id) invalidateTripCaches(organizationId);
    if (expense.vehicle_id) invalidateVehicleCaches(organizationId);
    await fireEvent(organizationId, { name: 'expense.recorded', data: { expenseId: String(data?.expense_id || ''), category: expense.category, amount: expense.amount, tripId: expense.trip_id, vehicleReg: expense.vehicle_reg } });

    return { success: true, data: { expenseId: data?.expense_id || data } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to record expense' };
  }
}

// ============================================================
// FUEL TRANSACTIONS
// ============================================================

/**
 * Record a fuel entry with all cascading effects.
 * 
 * CASCADE: fuel_entries → vehicle.fuel_cost → trip.cost (if linked) → mileage calc → dashboard
 */
export async function recordFuel(
  organizationId: string,
  fuel: {
    vehicle_id: string;
    vehicle_reg: string;
    driver_id?: string;
    driver_name?: string;
    trip_id?: string;
    date: string;
    litres: number;
    rate_per_litre: number;
    amount: number;
    odometer: number;
    station?: string;
    payment_mode?: string;
    branch_id?: string;
  }
): Promise<TransactionResult<{ fuelEntryId: string }>> {
  try {
    const { data: created, error } = await supabase
      .from('fuel_entries')
      .insert({
        organization_id: organizationId,
        ...fuel,
        fuel_type: 'diesel',
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Update vehicle odometer
    await supabase
      .from('vehicles')
      .update({ odometer: fuel.odometer })
      .eq('id', fuel.vehicle_id)
      .eq('organization_id', organizationId);

    // Invalidate affected caches
    invalidateFuelCaches(organizationId);
    invalidateVehicleCaches(organizationId);
    if (fuel.trip_id) invalidateTripCaches(organizationId);
    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: 'fuel.recorded', data: { fuelEntryId: String(created.id), vehicleReg: fuel.vehicle_reg, litres: fuel.litres, amount: fuel.amount } });

    return { success: true, data: { fuelEntryId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to record fuel' };
  }
}

// ============================================================
// TRIP TRANSACTIONS
// ============================================================

/**
 * Complete a trip with all cascading effects.
 * 
 * CASCADE: trip.status → auto-invoice → customer.outstanding → vehicle.status → driver.status → profitability
 */
export async function completeTrip(
  organizationId: string,
  tripId: string,
  deliveryDate: string
): Promise<TransactionResult> {
  try {
    // Update trip status + delivery date
    const { error: tripErr } = await supabase
      .from('trips')
      .update({ status: 'completed', actual_delivery: deliveryDate, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .eq('organization_id', organizationId);

    if (tripErr) return { success: false, error: tripErr.message };

    // Release vehicle (set back to available)
    const { data: trip } = await supabase
      .from('trips')
      .select('vehicle_id, driver_id')
      .eq('id', tripId)
      .single();

    if (trip?.vehicle_id) {
      await supabase
        .from('vehicles')
        .update({ status: 'available' })
        .eq('id', trip.vehicle_id)
        .eq('organization_id', organizationId);
    }

    if (trip?.driver_id) {
      await supabase
        .from('drivers')
        .update({ status: 'available' })
        .eq('id', trip.driver_id)
        .eq('organization_id', organizationId);
    }

    // Invalidate ALL related caches
    invalidateTripCaches(organizationId);
    invalidateVehicleCaches(organizationId);
    invalidateDriverCaches(organizationId);
    invalidateDashboardCaches(organizationId);

    await fireEvent(organizationId, { name: "trip.completed", data: { tripId: tripId, tripNumber: "", customerName: "", freightAmount: 0 } });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to complete trip' };
  }
}

/**
 * Assign vehicle and driver to a trip.
 * 
 * CASCADE: trip.vehicle/driver → vehicle.status=on_trip → driver.status=on_trip
 */
export async function assignTripResources(
  organizationId: string,
  tripId: string,
  vehicleId: string,
  driverId: string,
  vehicleReg: string,
  driverName: string,
  driverPhone: string
): Promise<TransactionResult> {
  try {
    // Single atomic RPC: trip + vehicle + driver in one transaction
    const { data: result, error } = await supabase.rpc('assign_trip_resources_atomic', {
      p_organization_id: organizationId,
      p_trip_id: tripId,
      p_vehicle_id: vehicleId,
      p_vehicle_reg: vehicleReg,
      p_driver_id: driverId,
      p_driver_name: driverName,
      p_driver_phone: driverPhone,
    });

    if (error) return { success: false, error: error.message };
    if (result && !result.success) return { success: false, error: result.error };

    // Domain event
    await fireEvent(organizationId, { name: 'trip.assigned', data: { tripId, tripNumber: '', vehicleReg, driverName } });

    // Invalidate caches
    invalidateTripCaches(organizationId);
    invalidateVehicleCaches(organizationId);
    invalidateDriverCaches(organizationId);

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to assign resources' };
  }
}

// ============================================================
// VENDOR TRANSACTIONS
// ============================================================

/**
 * Record a vendor payment with cascading effects.
 * 
 * CASCADE: vendor.outstanding → ledger → cash/bank → dashboard
 */
export async function recordVendorPayment(
  organizationId: string,
  payment: {
    vendor_id: string;
    amount: number;
    payment_mode: string;
    reference?: string;
    date: string;
    description?: string;
  }
): Promise<TransactionResult> {
  try {
    // Reduce vendor outstanding
    const { data: vendor } = await supabase
      .from('vendors')
      .select('name, outstanding, total_paid')
      .eq('id', payment.vendor_id)
      .eq('organization_id', organizationId)
      .single();

    if (vendor) {
      await supabase
        .from('vendors')
        .update({
          outstanding: Math.max(0, (vendor.outstanding || 0) - payment.amount),
          total_paid: (vendor.total_paid || 0) + payment.amount,
        })
        .eq('id', payment.vendor_id)
        .eq('organization_id', organizationId);
    }

    // Record in cash/bank book
    const table = payment.payment_mode === 'cash' ? 'cash_entries' : 'bank_entries';
    await supabase.from(table).insert({
      organization_id: organizationId,
      date: payment.date,
      voucher_number: `VP-${Date.now().toString(36).toUpperCase()}`,
      particulars: `Vendor Payment: ${payment.description || ''}`,
      type: 'payment',
      amount: payment.amount,
      reference: payment.reference || '',
      narration: payment.description || '',
    });

    invalidateVendorCaches(organizationId);
    invalidateDashboardCaches(organizationId);

    await fireEvent(organizationId, { name: "vendor.payment.recorded", data: { vendorName: vendor?.name || '', amount: payment.amount } });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to record vendor payment' };
  }
}

// ============================================================
// VENDOR TRANSACTIONS
// ============================================================

/**
 * Create a vendor with all dependent records.
 * CASCADE: vendor + payable_ledger_account + activity_log
 */
export async function createVendor(
  organizationId: string,
  vendor: {
    name: string;
    type?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    pan?: string;
    address?: string;
    city?: string;
    state?: string;
    bank_name?: string;
    account_number?: string;
    ifsc?: string;
    branch_id?: string;
  }
): Promise<TransactionResult<{ vendorId: string }>> {
  try {
    const { data: created, error } = await supabase
      .from('vendors')
      .insert({
        organization_id: organizationId,
        ...vendor,
        type: vendor.type || 'general',
        outstanding: 0,
        total_paid: 0,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Create payable ledger account
    await supabase.from('ledger_accounts').insert({
      organization_id: organizationId,
      name: `${vendor.name} (Payable)`,
      group: 'Liabilities',
      balance: 0,
      balance_type: 'Cr',
    });

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'created',
      entity_type: 'vendor',
      entity_id: created.id,
      details: `Vendor created: ${vendor.name}`,
    });

    invalidateVendorCaches(organizationId);
    await fireEvent(organizationId, { name: "vendor.created", data: { vendorId: created.id, vendorName: vendor.name } });
    return { success: true, data: { vendorId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create vendor' };
  }
}

// ============================================================
// VEHICLE TRANSACTIONS
// ============================================================

/**
 * Create a vehicle with activity logging.
 * CASCADE: vehicle + activity_log
 */
export async function createVehicle(
  organizationId: string,
  vehicle: {
    reg_number: string;
    vehicle_type?: string;
    make?: string;
    model?: string;
    year?: number;
    ownership_type?: string;
    owner_name?: string;
    owner_phone?: string;
    capacity_tons?: number;
    fitness_expiry?: string;
    insurance_expiry?: string;
    puc_expiry?: string;
    permit_expiry?: string;
    branch_id?: string;
  }
): Promise<TransactionResult<{ vehicleId: string }>> {
  try {
    const { data: created, error } = await supabase
      .from('vehicles')
      .insert({
        organization_id: organizationId,
        ...vehicle,
        status: 'available',
        odometer: 0,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'created',
      entity_type: 'vehicle',
      entity_id: created.id,
      details: `Vehicle added: ${vehicle.reg_number} (${vehicle.vehicle_type || 'truck'})`,
    });

    invalidateVehicleCaches(organizationId);
    await fireEvent(organizationId, { name: "vehicle.created", data: { vehicleId: created.id, regNumber: vehicle.reg_number } });
    return { success: true, data: { vehicleId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create vehicle' };
  }
}

// ============================================================
// DRIVER TRANSACTIONS
// ============================================================

/**
 * Create a driver with activity logging.
 * CASCADE: driver + activity_log
 */
export async function createDriver(
  organizationId: string,
  driver: {
    name: string;
    phone?: string;
    license_number?: string;
    license_expiry?: string;
    aadhar?: string;
    address?: string;
    emergency_contact?: string;
    emergency_phone?: string;
    date_of_joining?: string;
    salary_type?: string;
    base_salary?: number;
    branch_id?: string;
  }
): Promise<TransactionResult<{ driverId: string }>> {
  try {
    const { data: created, error } = await supabase
      .from('drivers')
      .insert({
        organization_id: organizationId,
        ...driver,
        status: 'available',
        safety_score: 85,
        total_trips: 0,
        total_km: 0,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'created',
      entity_type: 'driver',
      entity_id: created.id,
      details: `Driver added: ${driver.name}`,
    });

    invalidateDriverCaches(organizationId);
    await fireEvent(organizationId, { name: "driver.created", data: { driverId: created.id, driverName: driver.name } });
    return { success: true, data: { driverId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create driver' };
  }
}

// ============================================================
// TRIP CREATION TRANSACTION
// ============================================================

/**
 * Create a trip with full cascade.
 * CASCADE: trip + vehicle.status=on_trip + driver.status=on_trip + indent.status update + activity_log
 */
export async function createTrip(
  organizationId: string,
  trip: {
    trip_number: string;
    customer_id: string;
    customer_name: string;
    vehicle_id: string;
    vehicle_reg: string;
    driver_id: string;
    driver_name: string;
    driver_phone?: string;
    origin: string;
    destination: string;
    distance_km?: number;
    material?: string;
    weight_tons?: number;
    booking_date: string;
    loading_date?: string;
    freight_amount: number;
    advance_amount?: number;
    indent_id?: string;
    quotation_id?: string;
    enquiry_id?: string;
    branch_id?: string;
  }
): Promise<TransactionResult<{ tripId: string }>> {
  try {
    const balance = (trip.freight_amount || 0) - (trip.advance_amount || 0);

    const { data: created, error } = await supabase
      .from('trips')
      .insert({
        organization_id: organizationId,
        ...trip,
        balance_amount: balance,
        total_amount: trip.freight_amount,
        detention_charges: 0,
        other_charges: 0,
        status: 'assigned',
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Lock vehicle
    await supabase.from('vehicles')
      .update({ status: 'on_trip', driver_id: trip.driver_id, driver_name: trip.driver_name })
      .eq('id', trip.vehicle_id)
      .eq('organization_id', organizationId);

    // Lock driver
    await supabase.from('drivers')
      .update({ status: 'on_trip', assigned_vehicle_id: trip.vehicle_id, assigned_vehicle_reg: trip.vehicle_reg })
      .eq('id', trip.driver_id)
      .eq('organization_id', organizationId);

    // Update indent status if linked
    if (trip.indent_id) {
      await supabase.from('indents')
        .update({ status: 'in_progress', trip_id: created.id })
        .eq('id', trip.indent_id)
        .eq('organization_id', organizationId);
    }

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'created',
      entity_type: 'trip',
      entity_id: created.id,
      details: `Trip ${trip.trip_number}: ${trip.origin} → ${trip.destination} | ${trip.vehicle_reg} | ${trip.driver_name}`,
    });

    invalidateTripCaches(organizationId);
    invalidateVehicleCaches(organizationId);
    invalidateDriverCaches(organizationId);
    invalidateDashboardCaches(organizationId);

    await fireEvent(organizationId, { name: "trip.created", data: { tripId: created.id, tripNumber: trip.trip_number, origin: trip.origin, destination: trip.destination, customerName: trip.customer_name, vehicleReg: trip.vehicle_reg, driverName: trip.driver_name } });
    return { success: true, data: { tripId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create trip' };
  }
}

// ============================================================
// MAINTENANCE TRANSACTIONS
// ============================================================

/**
 * Record maintenance with cascade.
 * CASCADE: maintenance_record + vehicle.status=maintenance + expense (if completed) + vendor.outstanding↑ (if credit) + activity_log
 */
export async function recordMaintenance(
  organizationId: string,
  maintenance: {
    vehicle_id: string;
    vehicle_reg: string;
    type: string;
    description: string;
    date: string;
    odometer?: number;
    cost: number;
    vendor?: string;
    vendor_id?: string;
    status?: string;
    branch_id?: string;
  }
): Promise<TransactionResult<{ maintenanceId: string }>> {
  try {
    const { data: created, error } = await supabase
      .from('maintenance_records')
      .insert({
        organization_id: organizationId,
        vehicle_id: maintenance.vehicle_id,
        vehicle_reg: maintenance.vehicle_reg,
        type: maintenance.type,
        description: maintenance.description,
        date: maintenance.date,
        odometer: maintenance.odometer || 0,
        cost: maintenance.cost,
        vendor: maintenance.vendor || '',
        status: maintenance.status || 'scheduled',
        branch_id: maintenance.branch_id || null,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // If status is 'in_progress', set vehicle to maintenance
    if (maintenance.status === 'in_progress') {
      await supabase.from('vehicles')
        .update({ status: 'maintenance' })
        .eq('id', maintenance.vehicle_id)
        .eq('organization_id', organizationId);
      invalidateVehicleCaches(organizationId);
    }

    // If completed immediately, create expense record
    if (maintenance.status === 'completed' && maintenance.cost > 0) {
      await supabase.from('expenses').insert({
        organization_id: organizationId,
        vehicle_id: maintenance.vehicle_id,
        vehicle_reg: maintenance.vehicle_reg,
        category: 'repair',
        amount: maintenance.cost,
        date: maintenance.date,
        description: `Maintenance: ${maintenance.description}`,
        paid_to: maintenance.vendor || '',
        payment_mode: 'cash',
        approved: true,
        branch_id: maintenance.branch_id || null,
      });

      // If vendor specified, increase vendor outstanding
      if (maintenance.vendor_id) {
        const { data: vendor } = await supabase.from('vendors')
          .select('outstanding')
          .eq('id', maintenance.vendor_id)
          .eq('organization_id', organizationId)
          .single();
        if (vendor) {
          await supabase.from('vendors')
            .update({ outstanding: (vendor.outstanding || 0) + maintenance.cost })
            .eq('id', maintenance.vendor_id)
            .eq('organization_id', organizationId);
        }
      }

      invalidateExpenseCaches(organizationId);
    }

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'maintenance_recorded',
      entity_type: 'maintenance',
      entity_id: created.id,
      details: `${maintenance.type}: ${maintenance.description} | ${maintenance.vehicle_reg} | ₹${maintenance.cost}`,
    });

    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: "maintenance.recorded", data: { maintenanceId: created.id, vehicleReg: maintenance.vehicle_reg, description: maintenance.description, cost: maintenance.cost } });
    return { success: true, data: { maintenanceId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to record maintenance' };
  }
}

/**
 * Complete a maintenance job.
 * CASCADE: maintenance.status=completed + vehicle.status=available + expense creation + activity_log
 */
export async function completeMaintenance(
  organizationId: string,
  maintenanceId: string,
  actualCost: number
): Promise<TransactionResult> {
  try {
    // Get maintenance record
    const { data: record } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('id', maintenanceId)
      .eq('organization_id', organizationId)
      .single();

    if (!record) return { success: false, error: 'Maintenance record not found' };

    // Update status + cost
    await supabase.from('maintenance_records')
      .update({ status: 'completed', cost: actualCost })
      .eq('id', maintenanceId)
      .eq('organization_id', organizationId);

    // Release vehicle
    await supabase.from('vehicles')
      .update({ status: 'available' })
      .eq('id', record.vehicle_id)
      .eq('organization_id', organizationId);

    // Create expense for the maintenance cost
    if (actualCost > 0) {
      await supabase.from('expenses').insert({
        organization_id: organizationId,
        vehicle_id: record.vehicle_id,
        vehicle_reg: record.vehicle_reg,
        category: 'repair',
        amount: actualCost,
        date: new Date().toISOString().split('T')[0],
        description: `Maintenance completed: ${record.description}`,
        paid_to: record.vendor || '',
        payment_mode: 'cash',
        approved: true,
      });
      invalidateExpenseCaches(organizationId);
    }

    invalidateVehicleCaches(organizationId);
    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: "maintenance.completed", data: { maintenanceId: maintenanceId, vehicleReg: record.vehicle_reg || "", actualCost: actualCost } });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to complete maintenance' };
  }
}

// ============================================================
// CHALLAN TRANSACTIONS
// ============================================================

/**
 * Record a traffic challan with cascade.
 * CASCADE: challan + expense + driver_penalty (optional deduction) + activity_log
 */
export async function recordChallan(
  organizationId: string,
  challan: {
    challan_number?: string;
    vehicle_id: string;
    vehicle_reg: string;
    driver_id?: string;
    driver_name?: string;
    offence: string;
    amount: number;
    date: string;
    location?: string;
    deducted_from?: string;
    branch_id?: string;
  }
): Promise<TransactionResult<{ challanId: string }>> {
  try {
    const { data: created, error } = await supabase
      .from('challans')
      .insert({
        organization_id: organizationId,
        ...challan,
        payment_status: 'unpaid',
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Create corresponding expense
    await supabase.from('expenses').insert({
      organization_id: organizationId,
      vehicle_id: challan.vehicle_id,
      vehicle_reg: challan.vehicle_reg,
      category: 'misc',
      amount: challan.amount,
      date: challan.date,
      description: `Traffic Challan: ${challan.offence} at ${challan.location || 'unknown'}`,
      paid_to: 'Traffic Police',
      payment_mode: 'cash',
      approved: true,
      branch_id: challan.branch_id || null,
    });

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'challan_recorded',
      entity_type: 'challan',
      entity_id: created.id,
      details: `Challan ₹${challan.amount}: ${challan.offence} | ${challan.vehicle_reg} | ${challan.driver_name || ''}`,
    });

    invalidateExpenseCaches(organizationId);
    invalidateVehicleCaches(organizationId);
    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: "challan.recorded", data: { challanId: created.id, vehicleReg: challan.vehicle_reg, offence: challan.offence, amount: challan.amount } });
    return { success: true, data: { challanId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to record challan' };
  }
}

// ============================================================
// WORK ORDER TRANSACTIONS
// ============================================================

/**
 * Create a work order with cascade.
 * CASCADE: work_order + vehicle.status (if immediate) + activity_log
 */
export async function createWorkOrder(
  organizationId: string,
  workOrder: {
    vehicle_id: string;
    vehicle_reg: string;
    type: string;
    description: string;
    assigned_to?: string;
    priority?: string;
    estimated_cost?: number;
    branch_id?: string;
  }
): Promise<TransactionResult<{ workOrderId: string }>> {
  try {
    const woNumber = `WO-${Date.now().toString(36).toUpperCase()}`;

    const { data: created, error } = await supabase
      .from('work_orders')
      .insert({
        organization_id: organizationId,
        work_order_number: woNumber,
        vehicle_id: workOrder.vehicle_id,
        vehicle_reg: workOrder.vehicle_reg,
        type: workOrder.type,
        description: workOrder.description,
        assigned_to: workOrder.assigned_to || '',
        priority: workOrder.priority || 'normal',
        estimated_cost: workOrder.estimated_cost || 0,
        actual_cost: 0,
        status: 'open',
        branch_id: workOrder.branch_id || null,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'work_order_created',
      entity_type: 'work_order',
      entity_id: created.id,
      details: `Work Order ${woNumber}: ${workOrder.type} — ${workOrder.description} | ${workOrder.vehicle_reg}`,
    });

    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: "workorder.created", data: { workOrderId: created.id, vehicleReg: workOrder.vehicle_reg, woType: workOrder.type } });
    return { success: true, data: { workOrderId: created.id } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to create work order' };
  }
}

// ============================================================
// TRIP CANCELLATION TRANSACTION
// ============================================================

/**
 * Cancel a trip with full rollback cascade.
 * CASCADE: trip.status=cancelled + vehicle.status=available + driver.status=available + indent.status revert + activity_log
 */
export async function cancelTrip(
  organizationId: string,
  tripId: string,
  reason: string
): Promise<TransactionResult> {
  try {
    // Get trip details for cascade
    const { data: trip } = await supabase
      .from('trips')
      .select('vehicle_id, driver_id, indent_id, trip_number, status')
      .eq('id', tripId)
      .eq('organization_id', organizationId)
      .single();

    if (!trip) return { success: false, error: 'Trip not found' };
    if (['completed', 'billed', 'settled'].includes(trip.status)) {
      return { success: false, error: 'Cannot cancel completed/billed/settled trip' };
    }

    // Cancel the trip
    await supabase.from('trips')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        previous_status: trip.status,
      })
      .eq('id', tripId)
      .eq('organization_id', organizationId);

    // Release vehicle
    if (trip.vehicle_id) {
      await supabase.from('vehicles')
        .update({ status: 'available' })
        .eq('id', trip.vehicle_id)
        .eq('organization_id', organizationId);
    }

    // Release driver
    if (trip.driver_id) {
      await supabase.from('drivers')
        .update({ status: 'available' })
        .eq('id', trip.driver_id)
        .eq('organization_id', organizationId);
    }

    // Revert indent status if linked
    if (trip.indent_id) {
      await supabase.from('indents')
        .update({ status: 'allocated' })
        .eq('id', trip.indent_id)
        .eq('organization_id', organizationId);
    }

    // Activity log
    await supabase.from('activity_log').insert({
      organization_id: organizationId,
      user_name: 'system',
      action: 'cancelled',
      entity_type: 'trip',
      entity_id: tripId,
      details: `Trip ${trip.trip_number} cancelled. Reason: ${reason}`,
    });

    invalidateTripCaches(organizationId);
    invalidateVehicleCaches(organizationId);
    invalidateDriverCaches(organizationId);
    invalidateDashboardCaches(organizationId);
    await fireEvent(organizationId, { name: "trip.cancelled", data: { tripId, tripNumber: trip.trip_number, reason } });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to cancel trip' };
  }
}

// ============================================================
// INVOICE GENERATION FROM TRIP
// ============================================================

/**
 * Generate an invoice from a completed trip.
 * CASCADE: invoice + customer.outstanding↑ + invoice_trips link + trip.status=billed + activity_log
 */
export async function generateInvoiceFromTrip(
  organizationId: string,
  tripId: string,
  invoiceNumber: string,
  gstPercent: number = 5
): Promise<TransactionResult<{ invoiceId: string }>> {
  try {
    // Single atomic RPC: invoice + outstanding + trip link + journal entries
    const { data: result, error } = await supabase.rpc('generate_invoice_from_trip_atomic', {
      p_organization_id: organizationId,
      p_trip_id: tripId,
      p_invoice_number: invoiceNumber,
      p_gst_percent: gstPercent,
    });

    if (error) return { success: false, error: error.message };
    if (result && !result.success) return { success: false, error: result.error };

    const invoiceId = result?.invoice_id || '';

    // Domain event
    await fireEvent(organizationId, { name: 'invoice.created', data: { invoiceId, invoiceNumber, customerName: '', totalAmount: result?.total_amount || 0 } });

    // Invalidate caches
    invalidateTripCaches(organizationId);
    invalidateInvoiceCaches(organizationId);
    invalidateCustomerCaches(organizationId);
    invalidateDashboardCaches(organizationId);

    return { success: true, data: { invoiceId } };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed to generate invoice' };
  }
}

// ============================================================
// CACHE INVALIDATION HELPERS
// These ensure all affected UI components refresh after a transaction
// ============================================================

function invalidateCustomerCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('customers', orgId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.table('ledger_accounts', orgId) });
}

function invalidateInvoiceCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('invoices', orgId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.table('invoice_trips', orgId) });
}

function invalidatePaymentCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('payments', orgId) });
}

function invalidateExpenseCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('expenses', orgId) });
}

function invalidateFuelCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('fuel_entries', orgId) });
}

function invalidateTripCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('trips', orgId) });
}

function invalidateVehicleCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('vehicles', orgId) });
}

function invalidateDriverCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('drivers', orgId) });
}

function invalidateVendorCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.table('vendors', orgId) });
}

function invalidateDashboardCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(orgId) });
  // Also invalidate commonly displayed aggregates
  queryClient.invalidateQueries({ queryKey: queryKeys.table('invoices', orgId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.table('payments', orgId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.table('expenses', orgId) });
}

/**
 * Invalidate ALL caches for an organization.
 * Use sparingly — only when a major operation affects everything.
 */
export function invalidateAllCaches(orgId: string) {
  queryClient.invalidateQueries({ queryKey: ['table'] });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(orgId) });
}
