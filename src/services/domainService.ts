// ============================================================
// DOMAIN SERVICE — Atomic Business Operations
//
// ARCHITECTURE:
// 1. UI calls domainService.execute('recordPayment', params)
// 2. Service checks approval requirements
// 3. Service calls a SINGLE Supabase RPC (atomic, all-or-nothing)
// 4. On success: emits domain events (consumers react)
// 5. On failure: returns error (nothing committed)
//
// RULES:
// - Every operation is a SINGLE database round-trip
// - No sequential inserts from client (use RPCs or fallback to single-table + events)
// - Approval checks happen BEFORE execution
// - Domain events fire AFTER successful commit
// - Consumers (notifications, cache, reports) subscribe to events
// - UI components NEVER contain business logic
//
// FALLBACK STRATEGY:
// For operations where the RPC doesn't exist yet (not deployed to Supabase),
// the service falls back to a direct insert + event emission.
// This allows incremental migration from client-side to server-side atomicity.
// ============================================================

import { supabase } from '../lib/supabase';
import * as domainEvents from '../lib/domainEvents';
import { checkApprovalRequired } from '../lib/approvalEngine';
import type { OrganizationRole } from '../types/organization';
import type { DomainEvent } from '../lib/domainEvents';

// ============================================================
// TYPES
// ============================================================

export interface TransactionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  /** If approval is needed, returns the rule info */
  pendingApproval?: boolean;
  approvalMessage?: string;
}

// ============================================================
// CORE EXECUTION
// ============================================================

/**
 * Execute an atomic business operation.
 * 
 * 1. Check approval (if applicable)
 * 2. Call RPC (atomic)
 * 3. Emit domain events (consumers react)
 */
async function executeAtomic<T>(
  organizationId: string,
  rpcName: string,
  params: Record<string, unknown>,
  event: Omit<DomainEvent, 'organizationId' | 'timestamp'>,
  options?: {
    approvalCategory?: Parameters<typeof checkApprovalRequired>[0];
    approvalAmount?: number;
    userRole?: OrganizationRole | null;
    fallbackFn?: () => Promise<T>;
  }
): Promise<TransactionResult<T>> {
  // Step 1: Check approval
  if (options?.approvalCategory && options.approvalAmount !== undefined) {
    const rule = checkApprovalRequired(
      options.approvalCategory,
      options.approvalAmount,
      options.userRole || null
    );
    if (rule) {
      return {
        success: false,
        pendingApproval: true,
        approvalMessage: rule.description,
      };
    }
  }

  // Step 2: Execute RPC (atomic)
  const { data, error } = await supabase.rpc(rpcName, {
    ...params,
    p_organization_id: organizationId,
  });

  if (error) {
    // If RPC doesn't exist, try fallback
    if (error.message.includes('does not exist') && options?.fallbackFn) {
      try {
        const fallbackResult = await options.fallbackFn();
        // Step 3: Emit events on success
        await domainEvents.emit({
          ...event,
          organizationId,
          timestamp: new Date().toISOString(),
        } as DomainEvent);
        return { success: true, data: fallbackResult };
      } catch (fbError: unknown) {
        return { success: false, error: fbError instanceof Error ? fbError.message : 'Fallback failed' };
      }
    }
    return { success: false, error: error.message };
  }

  // Parse RPC result
  const result = data as { success?: boolean; error?: string } & T;
  if (result && result.success === false) {
    return { success: false, error: result.error || 'Operation failed' };
  }

  // Step 3: Emit domain events (fire-and-forget, doesn't fail the transaction)
  await domainEvents.emit({
    ...event,
    organizationId,
    timestamp: new Date().toISOString(),
  } as DomainEvent);

  return { success: true, data: result as T };
}

// ============================================================
// BUSINESS OPERATIONS
// Each is a thin wrapper around executeAtomic()
// ============================================================

// ─── MASTER DATA ─────────────────────────────────────────────

export async function createCustomer(
  organizationId: string,
  customer: { name: string; contact_person?: string; phone?: string; email?: string; gstin?: string; billing_address?: string; credit_limit?: number; credit_days?: number; branch_id?: string }
): Promise<TransactionResult<{ customer_id: string }>> {
  return executeAtomic(organizationId, 'create_customer_with_ledger', {
    p_name: customer.name,
    p_contact_person: customer.contact_person || null,
    p_phone: customer.phone || null,
    p_email: customer.email || null,
    p_gstin: customer.gstin || null,
    p_billing_address: customer.billing_address || null,
    p_credit_limit: customer.credit_limit || 0,
    p_credit_days: customer.credit_days || 30,
    p_branch_id: customer.branch_id || null,
  }, {
    name: 'customer.created',
    data: { customerId: '', customerName: customer.name },
  }, {
    fallbackFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .insert({ organization_id: organizationId, ...customer, outstanding: 0, total_business: 0, status: 'active' })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { customer_id: data.id };
    },
  });
}

export async function createVendor(
  organizationId: string,
  vendor: { name: string; type?: string; contact_person?: string; phone?: string; email?: string; gstin?: string; pan?: string; address?: string; city?: string; state?: string; bank_name?: string; account_number?: string; ifsc?: string; branch_id?: string }
): Promise<TransactionResult<{ vendor_id: string }>> {
  return executeAtomic(organizationId, 'create_vendor_with_ledger', {
    p_name: vendor.name,
    p_type: vendor.type || 'general',
  }, {
    name: 'vendor.created',
    data: { vendorId: '', vendorName: vendor.name },
  }, {
    fallbackFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .insert({ organization_id: organizationId, ...vendor, outstanding: 0, total_paid: 0, status: 'active' })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      // Create payable ledger
      await supabase.from('ledger_accounts').insert({
        organization_id: organizationId,
        name: `${vendor.name} (Payable)`,
        group: 'Liabilities',
        balance: 0,
        balance_type: 'Cr',
      });
      return { vendor_id: data.id };
    },
  });
}

export async function createVehicle(
  organizationId: string,
  vehicle: { reg_number: string; vehicle_type?: string; make?: string; model?: string; year?: number; ownership_type?: string; owner_name?: string; capacity_tons?: number; fitness_expiry?: string; insurance_expiry?: string; puc_expiry?: string; permit_expiry?: string; branch_id?: string }
): Promise<TransactionResult<{ vehicle_id: string }>> {
  return executeAtomic(organizationId, 'create_vehicle_atomic', {
    p_reg_number: vehicle.reg_number,
    p_vehicle_type: vehicle.vehicle_type || 'truck',
  }, {
    name: 'vehicle.created',
    data: { vehicleId: '', regNumber: vehicle.reg_number },
  }, {
    fallbackFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({ organization_id: organizationId, ...vehicle, status: 'available', odometer: 0 })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { vehicle_id: data.id };
    },
  });
}

export async function createDriver(
  organizationId: string,
  driver: { name: string; phone?: string; license_number?: string; license_expiry?: string; aadhar?: string; address?: string; emergency_contact?: string; emergency_phone?: string; date_of_joining?: string; salary_type?: string; base_salary?: number; branch_id?: string }
): Promise<TransactionResult<{ driver_id: string }>> {
  return executeAtomic(organizationId, 'create_driver_atomic', {
    p_name: driver.name,
    p_phone: driver.phone || null,
  }, {
    name: 'driver.created',
    data: { driverId: '', driverName: driver.name },
  }, {
    fallbackFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .insert({ organization_id: organizationId, ...driver, status: 'available', safety_score: 85, total_trips: 0, total_km: 0 })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { driver_id: data.id };
    },
  });
}

// ─── FINANCIAL ───────────────────────────────────────────────

export async function createInvoice(
  organizationId: string,
  invoice: { customer_id: string; invoice_number: string; invoice_date: string; due_date: string; trip_ids?: string[]; freight_total: number; detention_total?: number; other_charges?: number; gst_percent?: number }
): Promise<TransactionResult<{ invoice_id: string; total_amount: number }>> {
  return executeAtomic(organizationId, 'create_invoice_with_outstanding', {
    p_customer_id: invoice.customer_id,
    p_invoice_number: invoice.invoice_number,
    p_invoice_date: invoice.invoice_date,
    p_due_date: invoice.due_date,
    p_trip_ids: JSON.stringify(invoice.trip_ids || []),
    p_freight_total: invoice.freight_total,
    p_detention_total: invoice.detention_total || 0,
    p_other_charges: invoice.other_charges || 0,
    p_gst_percent: invoice.gst_percent || 5,
    p_status: 'sent',
  }, {
    name: 'invoice.created',
    data: { invoiceId: '', invoiceNumber: invoice.invoice_number, customerName: '', totalAmount: invoice.freight_total },
  });
}

export async function recordPayment(
  organizationId: string,
  payment: { customer_id: string; invoice_id?: string; amount: number; tds_amount?: number; payment_mode: string; reference_number?: string; payment_date: string },
  userRole?: OrganizationRole | null
): Promise<TransactionResult<{ payment_id: string }>> {
  return executeAtomic(organizationId, 'record_payment', {
    p_customer_id: payment.customer_id,
    p_invoice_id: payment.invoice_id || null,
    p_amount: payment.amount,
    p_tds_amount: payment.tds_amount || 0,
    p_payment_mode: payment.payment_mode,
    p_reference_number: payment.reference_number || '',
    p_payment_date: payment.payment_date,
  }, {
    name: 'payment.recorded',
    data: { paymentId: '', customerName: '', amount: payment.amount, mode: payment.payment_mode },
  });
}

export async function recordExpense(
  organizationId: string,
  expense: { trip_id?: string; vehicle_id?: string; vehicle_reg?: string; category: string; amount: number; date: string; description?: string; paid_to?: string; payment_mode?: string; branch_id?: string },
  userRole?: OrganizationRole | null
): Promise<TransactionResult<{ expense_id: string }>> {
  return executeAtomic(organizationId, 'record_expense_with_cascade', {
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
  }, {
    name: 'expense.recorded',
    data: { expenseId: '', category: expense.category, amount: expense.amount, tripId: expense.trip_id, vehicleReg: expense.vehicle_reg },
  }, {
    approvalCategory: 'expense',
    approvalAmount: expense.amount,
    userRole,
  });
}

export async function recordFuel(
  organizationId: string,
  fuel: { vehicle_id: string; vehicle_reg: string; driver_id?: string; driver_name?: string; trip_id?: string; date: string; litres: number; rate_per_litre: number; amount: number; odometer: number; station?: string; payment_mode?: string }
): Promise<TransactionResult<{ fuel_entry_id: string }>> {
  return executeAtomic(organizationId, 'record_fuel_atomic', {
    p_vehicle_id: fuel.vehicle_id,
    p_vehicle_reg: fuel.vehicle_reg,
    p_litres: fuel.litres,
    p_rate: fuel.rate_per_litre,
    p_amount: fuel.amount,
    p_odometer: fuel.odometer,
    p_date: fuel.date,
  }, {
    name: 'fuel.recorded',
    data: { fuelEntryId: '', vehicleReg: fuel.vehicle_reg, litres: fuel.litres, amount: fuel.amount },
  }, {
    fallbackFn: async () => {
      const { data, error } = await supabase
        .from('fuel_entries')
        .insert({ organization_id: organizationId, vehicle_id: fuel.vehicle_id, vehicle_reg: fuel.vehicle_reg, driver_id: fuel.driver_id, driver_name: fuel.driver_name, trip_id: fuel.trip_id, date: fuel.date, litres: fuel.litres, rate_per_litre: fuel.rate_per_litre, amount: fuel.amount, odometer: fuel.odometer, station: fuel.station, fuel_type: 'diesel' })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      // Update vehicle odometer
      await supabase.from('vehicles').update({ odometer: fuel.odometer }).eq('id', fuel.vehicle_id).eq('organization_id', organizationId);
      return { fuel_entry_id: data.id };
    },
  });
}

// ─── TRIP LIFECYCLE ──────────────────────────────────────────

export async function createTrip(
  organizationId: string,
  trip: { trip_number: string; customer_id: string; customer_name: string; vehicle_id: string; vehicle_reg: string; driver_id: string; driver_name: string; driver_phone?: string; origin: string; destination: string; distance_km?: number; material?: string; weight_tons?: number; booking_date: string; loading_date?: string; freight_amount: number; advance_amount?: number; indent_id?: string; quotation_id?: string; enquiry_id?: string; branch_id?: string }
): Promise<TransactionResult<{ trip_id: string }>> {
  return executeAtomic(organizationId, 'create_trip_atomic', {
    p_trip_number: trip.trip_number,
    p_customer_id: trip.customer_id,
    p_vehicle_id: trip.vehicle_id,
    p_driver_id: trip.driver_id,
    p_origin: trip.origin,
    p_destination: trip.destination,
    p_freight_amount: trip.freight_amount,
  }, {
    name: 'trip.created',
    data: { tripId: '', tripNumber: trip.trip_number, origin: trip.origin, destination: trip.destination, customerName: trip.customer_name, vehicleReg: trip.vehicle_reg, driverName: trip.driver_name },
  }, {
    fallbackFn: async () => {
      const balance = trip.freight_amount - (trip.advance_amount || 0);
      const { data, error } = await supabase
        .from('trips')
        .insert({ organization_id: organizationId, ...trip, balance_amount: balance, total_amount: trip.freight_amount, status: 'assigned', detention_charges: 0, other_charges: 0 })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      // Lock vehicle + driver
      await supabase.from('vehicles').update({ status: 'on_trip', driver_id: trip.driver_id, driver_name: trip.driver_name }).eq('id', trip.vehicle_id).eq('organization_id', organizationId);
      await supabase.from('drivers').update({ status: 'on_trip', assigned_vehicle_id: trip.vehicle_id, assigned_vehicle_reg: trip.vehicle_reg }).eq('id', trip.driver_id).eq('organization_id', organizationId);
      // Update indent if linked
      if (trip.indent_id) {
        await supabase.from('indents').update({ status: 'in_progress', trip_id: data.id }).eq('id', trip.indent_id).eq('organization_id', organizationId);
      }
      return { trip_id: data.id };
    },
  });
}

export async function completeTrip(
  organizationId: string,
  tripId: string,
  deliveryDate: string
): Promise<TransactionResult> {
  // Get trip for event data
  const { data: trip } = await supabase.from('trips').select('trip_number, customer_name, freight_amount, vehicle_id, driver_id').eq('id', tripId).eq('organization_id', organizationId).single();

  return executeAtomic(organizationId, 'complete_trip_atomic', {
    p_trip_id: tripId,
    p_delivery_date: deliveryDate,
  }, {
    name: 'trip.completed',
    data: { tripId, tripNumber: trip?.trip_number || '', customerName: trip?.customer_name || '', freightAmount: trip?.freight_amount || 0 },
  }, {
    fallbackFn: async () => {
      await supabase.from('trips').update({ status: 'completed', actual_delivery: deliveryDate }).eq('id', tripId).eq('organization_id', organizationId);
      if (trip?.vehicle_id) await supabase.from('vehicles').update({ status: 'available' }).eq('id', trip.vehicle_id).eq('organization_id', organizationId);
      if (trip?.driver_id) await supabase.from('drivers').update({ status: 'available' }).eq('id', trip.driver_id).eq('organization_id', organizationId);
      return {};
    },
  });
}

export async function cancelTrip(
  organizationId: string,
  tripId: string,
  reason: string,
  userRole?: OrganizationRole | null
): Promise<TransactionResult> {
  const { data: trip } = await supabase.from('trips').select('trip_number, vehicle_id, driver_id, indent_id, status').eq('id', tripId).eq('organization_id', organizationId).single();

  if (trip && ['completed', 'billed', 'settled'].includes(trip.status)) {
    return { success: false, error: 'Cannot cancel completed/billed/settled trip' };
  }

  return executeAtomic(organizationId, 'cancel_trip', {
    p_trip_id: tripId,
    p_reason: reason,
  }, {
    name: 'trip.cancelled',
    data: { tripId, tripNumber: trip?.trip_number || '', reason },
  }, {
    approvalCategory: 'trip_cancellation',
    approvalAmount: 0,
    userRole,
    fallbackFn: async () => {
      await supabase.from('trips').update({ status: 'cancelled', cancellation_reason: reason, cancelled_at: new Date().toISOString(), previous_status: trip?.status }).eq('id', tripId).eq('organization_id', organizationId);
      if (trip?.vehicle_id) await supabase.from('vehicles').update({ status: 'available' }).eq('id', trip.vehicle_id).eq('organization_id', organizationId);
      if (trip?.driver_id) await supabase.from('drivers').update({ status: 'available' }).eq('id', trip.driver_id).eq('organization_id', organizationId);
      if (trip?.indent_id) await supabase.from('indents').update({ status: 'allocated' }).eq('id', trip.indent_id).eq('organization_id', organizationId);
      return {};
    },
  });
}

// ─── FLEET OPERATIONS ────────────────────────────────────────

export async function recordMaintenance(
  organizationId: string,
  maintenance: { vehicle_id: string; vehicle_reg: string; type: string; description: string; date: string; odometer?: number; cost: number; vendor?: string; status?: string; branch_id?: string },
  userRole?: OrganizationRole | null
): Promise<TransactionResult<{ maintenance_id: string }>> {
  return executeAtomic(organizationId, 'record_maintenance_atomic', {
    p_vehicle_id: maintenance.vehicle_id,
    p_vehicle_reg: maintenance.vehicle_reg,
    p_type: maintenance.type,
    p_description: maintenance.description,
    p_cost: maintenance.cost,
    p_date: maintenance.date,
  }, {
    name: 'maintenance.recorded',
    data: { maintenanceId: '', vehicleReg: maintenance.vehicle_reg, description: maintenance.description, cost: maintenance.cost },
  }, {
    approvalCategory: 'maintenance',
    approvalAmount: maintenance.cost,
    userRole,
    fallbackFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .insert({ organization_id: organizationId, vehicle_id: maintenance.vehicle_id, vehicle_reg: maintenance.vehicle_reg, type: maintenance.type, description: maintenance.description, date: maintenance.date, odometer: maintenance.odometer || 0, cost: maintenance.cost, vendor: maintenance.vendor || '', status: maintenance.status || 'scheduled', branch_id: maintenance.branch_id })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      // If immediately in_progress, lock vehicle
      if (maintenance.status === 'in_progress') {
        await supabase.from('vehicles').update({ status: 'maintenance' }).eq('id', maintenance.vehicle_id).eq('organization_id', organizationId);
      }
      return { maintenance_id: data.id };
    },
  });
}

export async function recordChallan(
  organizationId: string,
  challan: { challan_number?: string; vehicle_id: string; vehicle_reg: string; driver_id?: string; driver_name?: string; offence: string; amount: number; date: string; location?: string; branch_id?: string }
): Promise<TransactionResult<{ challan_id: string }>> {
  return executeAtomic(organizationId, 'record_challan_atomic', {
    p_vehicle_id: challan.vehicle_id,
    p_vehicle_reg: challan.vehicle_reg,
    p_offence: challan.offence,
    p_amount: challan.amount,
    p_date: challan.date,
  }, {
    name: 'challan.recorded',
    data: { challanId: '', vehicleReg: challan.vehicle_reg, offence: challan.offence, amount: challan.amount },
  }, {
    fallbackFn: async () => {
      const { data, error } = await supabase
        .from('challans')
        .insert({ organization_id: organizationId, ...challan, payment_status: 'unpaid' })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      // Create expense
      await supabase.from('expenses').insert({
        organization_id: organizationId, vehicle_id: challan.vehicle_id, vehicle_reg: challan.vehicle_reg,
        category: 'misc', amount: challan.amount, date: challan.date,
        description: `Traffic Challan: ${challan.offence}`, paid_to: 'Traffic Police', payment_mode: 'cash', approved: true,
      });
      return { challan_id: data.id };
    },
  });
}

export async function createWorkOrder(
  organizationId: string,
  workOrder: { vehicle_id: string; vehicle_reg: string; type: string; description: string; assigned_to?: string; priority?: string; estimated_cost?: number; branch_id?: string }
): Promise<TransactionResult<{ work_order_id: string }>> {
  return executeAtomic(organizationId, 'create_work_order_atomic', {
    p_vehicle_id: workOrder.vehicle_id,
    p_vehicle_reg: workOrder.vehicle_reg,
    p_type: workOrder.type,
    p_description: workOrder.description,
  }, {
    name: 'workorder.created',
    data: { workOrderId: '', vehicleReg: workOrder.vehicle_reg, woType: workOrder.type },
  }, {
    fallbackFn: async () => {
      const woNumber = `WO-${Date.now().toString(36).toUpperCase()}`;
      const { data, error } = await supabase
        .from('work_orders')
        .insert({ organization_id: organizationId, work_order_number: woNumber, ...workOrder, actual_cost: 0, status: 'open' })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return { work_order_id: data.id };
    },
  });
}

export async function recordVendorPayment(
  organizationId: string,
  payment: { vendor_id: string; amount: number; payment_mode: string; reference?: string; date: string; description?: string },
  userRole?: OrganizationRole | null
): Promise<TransactionResult> {
  return executeAtomic(organizationId, 'record_vendor_payment_atomic', {
    p_vendor_id: payment.vendor_id,
    p_amount: payment.amount,
    p_payment_mode: payment.payment_mode,
    p_date: payment.date,
  }, {
    name: 'vendor.payment.recorded',
    data: { vendorName: '', amount: payment.amount },
  }, {
    approvalCategory: 'vendor_payment',
    approvalAmount: payment.amount,
    userRole,
    fallbackFn: async () => {
      // Reduce vendor outstanding
      const { data: vendor } = await supabase.from('vendors').select('outstanding, total_paid, name').eq('id', payment.vendor_id).eq('organization_id', organizationId).single();
      if (vendor) {
        await supabase.from('vendors').update({
          outstanding: Math.max(0, (vendor.outstanding || 0) - payment.amount),
          total_paid: (vendor.total_paid || 0) + payment.amount,
        }).eq('id', payment.vendor_id).eq('organization_id', organizationId);
      }
      // Record in cash/bank
      const table = payment.payment_mode === 'cash' ? 'cash_entries' : 'bank_entries';
      await supabase.from(table).insert({
        organization_id: organizationId, date: payment.date,
        voucher_number: `VP-${Date.now().toString(36).toUpperCase()}`,
        particulars: `Vendor Payment: ${payment.description || vendor?.name || ''}`,
        type: 'payment', amount: payment.amount,
        ...(table === 'bank_entries' ? { reference: payment.reference || '' } : {}),
        narration: payment.description || '',
      });
      return {};
    },
  });
}
