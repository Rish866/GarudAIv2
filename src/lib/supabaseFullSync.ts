// Full Supabase Persistence Layer for Garud AI Transport ERP
// Syncs ALL store data to Supabase (not just vehicles/events)
import { supabase } from './supabase';
import type { Vehicle, Driver, Customer, Trip, Invoice, Payment, Expense, FuelEntry, MaintenanceRecord, Enquiry, Quotation, Notification, ActivityLog } from '../types';

// DEPRECATED: Use organization_id from OrganizationContext instead
const TENANT_ID = ''; // Legacy — will be removed

// ============================================================
// GENERIC UPSERT HELPER
// ============================================================

async function upsertRecords(table: string, records: any[]): Promise<boolean> {
  if (records.length === 0) return true;
  const withTenant = records.map(r => ({ ...r, tenant_id: TENANT_ID }));
  const { error } = await supabase.from(table).upsert(withTenant, { onConflict: 'id' });
  if (error) {
    console.warn(`[Supabase] Failed to sync ${table}:`, error.message);
    return false;
  }
  return true;
}

async function fetchRecords<T>(table: string): Promise<T[] | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('tenant_id', TENANT_ID);
  if (error) {
    console.warn(`[Supabase] Failed to fetch ${table}:`, error.message);
    return null;
  }
  return data as T[];
}

async function deleteRecord(table: string, id: string): Promise<boolean> {
  const { error } = await supabase.from(table).delete().eq('id', id).eq('tenant_id', TENANT_ID);
  if (error) {
    console.warn(`[Supabase] Failed to delete from ${table}:`, error.message);
    return false;
  }
  return true;
}


// ============================================================
// SYNC FUNCTIONS PER ENTITY
// ============================================================

export async function syncVehicles(vehicles: Vehicle[]): Promise<boolean> {
  const records = vehicles.map(v => ({
    id: v.id,
    reg_number: v.reg_number,
    vehicle_type: v.vehicle_type,
    make: v.make,
    model: v.model,
    year: v.year,
    ownership_type: v.ownership_type,
    owner_name: v.owner_name,
    owner_phone: v.owner_phone || null,
    capacity_tons: v.capacity_tons,
    fitness_expiry: v.fitness_expiry,
    insurance_expiry: v.insurance_expiry,
    puc_expiry: v.puc_expiry,
    permit_expiry: v.permit_expiry,
    driver_id: v.driver_id || null,
    driver_name: v.driver_name || null,
    status: v.status,
    odometer: v.odometer,
    lat: v.lat ? String(v.lat) : null,
    lng: v.lng ? String(v.lng) : null,
    speed: v.speed || 0,
    last_gps_update: v.last_gps_update || null,
    ignition: v.ignition || false,
  }));
  return upsertRecords('vehicles', records);
}

export async function syncDrivers(drivers: Driver[]): Promise<boolean> {
  const records = drivers.map(d => ({
    id: d.id,
    branch_id: d.branch_id || null,
    name: d.name,
    phone: d.phone,
    license_number: d.license_number,
    license_expiry: d.license_expiry,
    aadhar: d.aadhar || null,
    address: d.address,
    emergency_contact: d.emergency_contact,
    emergency_phone: d.emergency_phone,
    date_of_joining: d.date_of_joining,
    assigned_vehicle_id: d.assigned_vehicle_id || null,
    assigned_vehicle_reg: d.assigned_vehicle_reg || null,
    salary_type: d.salary_type,
    base_salary: d.base_salary,
    status: d.status,
    safety_score: d.safety_score,
    total_trips: d.total_trips,
    total_km: d.total_km,
    photo_url: d.photo_url || null,
  }));
  return upsertRecords('drivers', records);
}

export async function syncCustomers(customers: Customer[]): Promise<boolean> {
  const records = customers.map(c => ({
    id: c.id,
    branch_id: c.branch_id || null,
    name: c.name,
    contact_person: c.contact_person,
    phone: c.phone,
    email: c.email,
    gstin: c.gstin,
    billing_address: c.billing_address,
    credit_limit: c.credit_limit,
    credit_days: c.credit_days,
    outstanding: c.outstanding,
    total_business: c.total_business,
    status: c.status,
  }));
  return upsertRecords('customers', records);
}


export async function syncTrips(trips: Trip[]): Promise<boolean> {
  const records = trips.map(t => ({
    id: t.id,
    branch_id: t.branch_id || null,
    trip_number: t.trip_number,
    lr_number: t.lr_number,
    eway_bill: t.eway_bill || null,
    customer_id: t.customer_id,
    customer_name: t.customer_name,
    vehicle_id: t.vehicle_id,
    vehicle_reg: t.vehicle_reg,
    driver_id: t.driver_id,
    driver_name: t.driver_name,
    driver_phone: t.driver_phone,
    origin: t.origin,
    origin_lat: t.origin_lat || null,
    origin_lng: t.origin_lng || null,
    destination: t.destination,
    dest_lat: t.dest_lat || null,
    dest_lng: t.dest_lng || null,
    distance_km: t.distance_km,
    material: t.material,
    weight_tons: t.weight_tons,
    num_packages: t.num_packages || null,
    booking_date: t.booking_date,
    loading_date: t.loading_date || null,
    departure_date: t.departure_date || null,
    expected_delivery: t.expected_delivery || null,
    actual_delivery: t.actual_delivery || null,
    freight_amount: t.freight_amount,
    advance_amount: t.advance_amount,
    balance_amount: t.balance_amount,
    detention_charges: t.detention_charges,
    other_charges: t.other_charges,
    total_amount: t.total_amount,
    status: t.status,
    pod_url: t.pod_url || null,
    pod_date: t.pod_date || null,
    remarks: t.remarks || null,
  }));
  return upsertRecords('trips', records);
}

export async function syncInvoices(invoices: Invoice[]): Promise<boolean> {
  const records = invoices.map(i => ({
    id: i.id,
    branch_id: i.branch_id || null,
    invoice_number: i.invoice_number,
    customer_id: i.customer_id,
    customer_name: i.customer_name,
    invoice_date: i.invoice_date,
    due_date: i.due_date,
    trip_ids: JSON.stringify(i.trip_ids),
    freight_total: i.freight_total,
    detention_total: i.detention_total,
    other_charges: i.other_charges,
    subtotal: i.subtotal,
    gst_percent: i.gst_percent,
    gst_amount: i.gst_amount,
    tds_amount: i.tds_amount,
    total_amount: i.total_amount,
    paid_amount: i.paid_amount,
    balance_amount: i.balance_amount,
    status: i.status,
  }));
  return upsertRecords('invoices', records);
}

export async function syncPayments(payments: Payment[]): Promise<boolean> {
  const records = payments.map(p => ({
    id: p.id,
    branch_id: p.branch_id || null,
    invoice_id: p.invoice_id || null,
    customer_id: p.customer_id,
    customer_name: p.customer_name,
    amount: p.amount,
    payment_mode: p.payment_mode,
    reference_number: p.reference_number,
    payment_date: p.payment_date,
    tds_amount: p.tds_amount,
    status: p.status,
  }));
  return upsertRecords('payments', records);
}

export async function syncExpenses(expenses: Expense[]): Promise<boolean> {
  const records = expenses.map(e => ({
    id: e.id,
    branch_id: e.branch_id || null,
    trip_id: e.trip_id || null,
    vehicle_id: e.vehicle_id || null,
    vehicle_reg: e.vehicle_reg || null,
    category: e.category,
    amount: e.amount,
    date: e.date,
    description: e.description,
    paid_to: e.paid_to,
    payment_mode: e.payment_mode,
    approved: e.approved,
  }));
  return upsertRecords('expenses', records);
}


export async function syncFuelEntries(entries: FuelEntry[]): Promise<boolean> {
  const records = entries.map(f => ({
    id: f.id,
    branch_id: f.branch_id || null,
    vehicle_id: f.vehicle_id,
    vehicle_reg: f.vehicle_reg,
    driver_name: f.driver_name,
    date: f.date,
    station: f.station,
    fuel_type: 'diesel',
    litres: f.litres,
    rate_per_litre: f.rate,
    amount: f.amount,
    odometer: f.odometer,
    payment_mode: 'fuel_card',
    receipt_number: null,
  }));
  return upsertRecords('fuel_entries', records);
}

export async function syncMaintenance(records_in: MaintenanceRecord[]): Promise<boolean> {
  const records = records_in.map(m => ({
    id: m.id,
    branch_id: m.branch_id || null,
    vehicle_id: m.vehicle_id,
    vehicle_reg: m.vehicle_reg,
    type: m.type,
    description: m.description,
    date: m.date,
    odometer: m.odometer,
    cost: m.cost,
    vendor: m.vendor,
    status: m.status,
  }));
  return upsertRecords('maintenance_records', records);
}

export async function syncEnquiries(enquiries: Enquiry[]): Promise<boolean> {
  const records = enquiries.map(e => ({
    id: e.id,
    branch_id: e.branch_id || null,
    enquiry_number: e.id,
    customer_id: e.customer_id,
    customer_name: e.customer_name,
    origin: e.origin,
    destination: e.destination,
    vehicle_type: e.vehicle_type,
    material: e.material,
    weight_tons: e.weight_tons,
    target_rate: e.target_rate,
    expected_date: e.loading_date,
    status: e.status,
    remarks: e.remarks || null,
  }));
  return upsertRecords('enquiries', records);
}

export async function syncQuotations(quotations: Quotation[]): Promise<boolean> {
  const records = quotations.map(q => ({
    id: q.id,
    quotation_number: q.quotation_number,
    enquiry_id: q.enquiry_id || null,
    customer_id: q.customer_id,
    customer_name: q.customer_name,
    origin: q.origin,
    destination: q.destination,
    vehicle_type: q.vehicle_type,
    material: q.material,
    weight_tons: q.weight_tons,
    rate_type: q.rate_type,
    rate: q.rate,
    total_amount: q.total_amount,
    gst_percent: q.gst_percent,
    validity_days: q.validity_days,
    terms: q.terms || null,
    status: q.status,
  }));
  return upsertRecords('quotations', records);
}

export async function syncActivityLog(logs: ActivityLog[]): Promise<boolean> {
  const records = logs.map(l => ({
    id: l.id,
    user_name: l.user_name,
    action: l.action,
    entity_type: l.entity_type,
    entity_id: l.entity_id,
    details: l.details,
    timestamp: l.timestamp,
  }));
  return upsertRecords('activity_log', records);
}

export async function syncNotifications(notifs: Notification[]): Promise<boolean> {
  const records = notifs.map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    link_module: n.link_module || null,
    link_id: n.link_id || null,
    is_read: n.is_read,
  }));
  return upsertRecords('notifications', records);
}


// ============================================================
// FULL SYNC — Push all data to Supabase
// ============================================================

export interface FullSyncPayload {
  vehicles: Vehicle[];
  drivers: Driver[];
  customers: Customer[];
  trips: Trip[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  fuelEntries: FuelEntry[];
  maintenance: MaintenanceRecord[];
  enquiries: Enquiry[];
  quotations: Quotation[];
  activityLog: ActivityLog[];
  notifications: Notification[];
}

export async function performFullSync(data: FullSyncPayload): Promise<{ success: boolean; synced: string[]; failed: string[] }> {
  console.log('🔄 [Supabase] Starting full sync...');
  const synced: string[] = [];
  const failed: string[] = [];

  const tasks: [string, () => Promise<boolean>][] = [
    ['vehicles', () => syncVehicles(data.vehicles)],
    ['drivers', () => syncDrivers(data.drivers)],
    ['customers', () => syncCustomers(data.customers)],
    ['trips', () => syncTrips(data.trips)],
    ['invoices', () => syncInvoices(data.invoices)],
    ['payments', () => syncPayments(data.payments)],
    ['expenses', () => syncExpenses(data.expenses)],
    ['fuel_entries', () => syncFuelEntries(data.fuelEntries)],
    ['maintenance', () => syncMaintenance(data.maintenance)],
    ['enquiries', () => syncEnquiries(data.enquiries)],
    ['quotations', () => syncQuotations(data.quotations)],
    ['activity_log', () => syncActivityLog(data.activityLog)],
    ['notifications', () => syncNotifications(data.notifications)],
  ];

  for (const [name, fn] of tasks) {
    const ok = await fn();
    if (ok) synced.push(name);
    else failed.push(name);
  }

  const status = failed.length === 0 ? '✅' : '⚠️';
  console.log(`${status} [Supabase] Sync complete: ${synced.length} tables synced, ${failed.length} failed`);
  if (failed.length > 0) console.warn('  Failed:', failed.join(', '));

  return { success: failed.length === 0, synced, failed };
}

// ============================================================
// FETCH ALL — Pull all data from Supabase (for initial load)
// ============================================================

export async function fetchAllFromSupabase(): Promise<Partial<FullSyncPayload> | null> {
  try {
    const [vehicles, drivers, customers, trips, invoices, payments, expenses, fuelEntries, maintenance, enquiries, quotations, activityLog, notifications] = await Promise.all([
      fetchRecords<Vehicle>('vehicles'),
      fetchRecords<Driver>('drivers'),
      fetchRecords<Customer>('customers'),
      fetchRecords<Trip>('trips'),
      fetchRecords<Invoice>('invoices'),
      fetchRecords<Payment>('payments'),
      fetchRecords<Expense>('expenses'),
      fetchRecords<FuelEntry>('fuel_entries'),
      fetchRecords<MaintenanceRecord>('maintenance_records'),
      fetchRecords<Enquiry>('enquiries'),
      fetchRecords<Quotation>('quotations'),
      fetchRecords<ActivityLog>('activity_log'),
      fetchRecords<Notification>('notifications'),
    ]);

    return {
      vehicles: vehicles || undefined,
      drivers: drivers || undefined,
      customers: customers || undefined,
      trips: trips || undefined,
      invoices: invoices || undefined,
      payments: payments || undefined,
      expenses: expenses || undefined,
      fuelEntries: fuelEntries || undefined,
      maintenance: maintenance || undefined,
      enquiries: enquiries || undefined,
      quotations: quotations || undefined,
      activityLog: activityLog || undefined,
      notifications: notifications || undefined,
    };
  } catch (e) {
    console.warn('[Supabase] Full fetch failed:', e);
    return null;
  }
}

// ============================================================
// INCREMENTAL SYNC (per table) — For use in store subscriptions
// ============================================================

export async function syncSingleRecord(table: string, record: any): Promise<boolean> {
  return upsertRecords(table, [record]);
}

export async function deleteSingleRecord(table: string, id: string): Promise<boolean> {
  return deleteRecord(table, id);
}
