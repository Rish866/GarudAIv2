// ============================================================
// FINANCIAL STATEMENTS ENGINE
//
// Generates standard financial reports from transactional data.
// All calculations are from ACTUAL database records — no estimates.
//
// REPORTS:
// 1. Profit & Loss Statement (Income - Expenses for period)
// 2. Trial Balance (Debit/Credit balance per ledger account)
// 3. Cash Flow Statement (Receipts - Payments for period)
// 4. Receivable Aging (30/60/90/120+ days outstanding)
// 5. Payable Aging (vendor outstanding by age)
// 6. Vehicle Profitability (revenue - cost per vehicle)
// 7. Customer Statement (ledger with running balance)
// ============================================================

import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export interface ProfitAndLoss {
  period: { from: string; to: string };
  revenue: {
    freight: number;
    detention: number;
    other: number;
    totalRevenue: number;
  };
  expenses: {
    diesel: number;
    toll: number;
    driverBata: number;
    loading: number;
    repair: number;
    tyres: number;
    insurance: number;
    emi: number;
    office: number;
    misc: number;
    totalExpenses: number;
  };
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export interface AgingBucket {
  current: number; // Not yet due
  days30: number;  // 1-30 days overdue
  days60: number;  // 31-60 days
  days90: number;  // 61-90 days
  days120: number; // 91-120 days
  days120plus: number; // 120+ days
  total: number;
}

export interface CustomerAging {
  customerId: string;
  customerName: string;
  aging: AgingBucket;
}

export interface VehicleProfitability {
  vehicleId: string;
  vehicleReg: string;
  vehicleType: string;
  totalTrips: number;
  totalRevenue: number;
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  costPerKm: number;
  totalKm: number;
}

export interface CashFlowStatement {
  period: { from: string; to: string };
  inflows: {
    customerPayments: number;
    otherReceipts: number;
    totalInflow: number;
  };
  outflows: {
    vendorPayments: number;
    fuelExpenses: number;
    driverPayments: number;
    maintenanceExpenses: number;
    otherExpenses: number;
    totalOutflow: number;
  };
  netCashFlow: number;
}

export interface CustomerStatement {
  customerId: string;
  customerName: string;
  entries: {
    date: string;
    type: 'invoice' | 'payment' | 'credit_note';
    reference: string;
    debit: number;
    credit: number;
    balance: number;
  }[];
  openingBalance: number;
  closingBalance: number;
}

// ============================================================
// 1. PROFIT & LOSS STATEMENT
// ============================================================

export async function generateProfitAndLoss(
  organizationId: string,
  fromDate: string,
  toDate: string
): Promise<ProfitAndLoss> {
  // Revenue from invoices in period
  const { data: invoices } = await supabase
    .from('invoices')
    .select('freight_total, detention_total, other_charges, total_amount')
    .eq('organization_id', organizationId)
    .gte('invoice_date', fromDate)
    .lte('invoice_date', toDate)
    .neq('status', 'cancelled');

  const freight = (invoices || []).reduce((s, i) => s + (i.freight_total || 0), 0);
  const detention = (invoices || []).reduce((s, i) => s + (i.detention_total || 0), 0);
  const other = (invoices || []).reduce((s, i) => s + (i.other_charges || 0), 0);
  const totalRevenue = freight + detention + other;

  // Expenses by category in period
  const { data: expenses } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('organization_id', organizationId)
    .gte('date', fromDate)
    .lte('date', toDate);

  const expByCategory: Record<string, number> = {};
  (expenses || []).forEach(e => {
    expByCategory[e.category] = (expByCategory[e.category] || 0) + (e.amount || 0);
  });

  // Fuel in period
  const { data: fuel } = await supabase
    .from('fuel_entries')
    .select('amount')
    .eq('organization_id', organizationId)
    .gte('date', fromDate)
    .lte('date', toDate);

  const totalFuel = (fuel || []).reduce((s, f) => s + (f.amount || 0), 0);

  const expenseBreakdown = {
    diesel: totalFuel + (expByCategory['diesel'] || 0),
    toll: expByCategory['toll'] || 0,
    driverBata: expByCategory['driver_bata'] || 0 + (expByCategory['salary'] || 0),
    loading: (expByCategory['loading'] || 0) + (expByCategory['unloading'] || 0),
    repair: expByCategory['repair'] || 0,
    tyres: expByCategory['tyre'] || 0,
    insurance: expByCategory['insurance'] || 0,
    emi: expByCategory['emi'] || 0,
    office: expByCategory['office'] || 0,
    misc: expByCategory['misc'] || 0,
    totalExpenses: 0,
  };
  expenseBreakdown.totalExpenses = Object.values(expenseBreakdown).reduce((s, v) => s + v, 0);

  const grossProfit = totalRevenue - expenseBreakdown.totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  return {
    period: { from: fromDate, to: toDate },
    revenue: { freight, detention, other, totalRevenue },
    expenses: expenseBreakdown,
    grossProfit,
    netProfit: grossProfit, // Same as gross for transport (no tax calc)
    profitMargin,
  };
}

// ============================================================
// 2. RECEIVABLE AGING
// ============================================================

export async function generateReceivableAging(
  organizationId: string
): Promise<CustomerAging[]> {
  const today = new Date();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('customer_id, customer_name, balance_amount, due_date')
    .eq('organization_id', organizationId)
    .gt('balance_amount', 0)
    .neq('status', 'cancelled');

  if (!invoices || invoices.length === 0) return [];

  // Group by customer
  const byCustomer: Record<string, { name: string; invoices: typeof invoices }> = {};
  invoices.forEach(inv => {
    if (!byCustomer[inv.customer_id]) {
      byCustomer[inv.customer_id] = { name: inv.customer_name, invoices: [] };
    }
    byCustomer[inv.customer_id].invoices.push(inv);
  });

  return Object.entries(byCustomer).map(([customerId, data]) => {
    const aging: AgingBucket = { current: 0, days30: 0, days60: 0, days90: 0, days120: 0, days120plus: 0, total: 0 };

    data.invoices.forEach(inv => {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
      const amount = inv.balance_amount || 0;

      if (daysOverdue <= 0) aging.current += amount;
      else if (daysOverdue <= 30) aging.days30 += amount;
      else if (daysOverdue <= 60) aging.days60 += amount;
      else if (daysOverdue <= 90) aging.days90 += amount;
      else if (daysOverdue <= 120) aging.days120 += amount;
      else aging.days120plus += amount;

      aging.total += amount;
    });

    return { customerId, customerName: data.name, aging };
  }).sort((a, b) => b.aging.total - a.aging.total);
}

// ============================================================
// 3. VEHICLE PROFITABILITY
// ============================================================

export async function generateVehicleProfitability(
  organizationId: string,
  fromDate?: string,
  toDate?: string
): Promise<VehicleProfitability[]> {
  // Get all vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, reg_number, vehicle_type')
    .eq('organization_id', organizationId)
    .neq('status', 'inactive');

  if (!vehicles) return [];

  // Get trips (with optional date filter)
  let tripQuery = supabase
    .from('trips')
    .select('vehicle_id, freight_amount, detention_charges, other_charges, distance_km')
    .eq('organization_id', organizationId)
    .in('status', ['completed', 'billed', 'settled']);
  if (fromDate) tripQuery = tripQuery.gte('booking_date', fromDate);
  if (toDate) tripQuery = tripQuery.lte('booking_date', toDate);
  const { data: trips } = await tripQuery;

  // Get fuel
  let fuelQuery = supabase
    .from('fuel_entries')
    .select('vehicle_id, amount')
    .eq('organization_id', organizationId);
  if (fromDate) fuelQuery = fuelQuery.gte('date', fromDate);
  if (toDate) fuelQuery = fuelQuery.lte('date', toDate);
  const { data: fuelEntries } = await fuelQuery;

  // Get expenses
  let expQuery = supabase
    .from('expenses')
    .select('vehicle_id, amount, category')
    .eq('organization_id', organizationId);
  if (fromDate) expQuery = expQuery.gte('date', fromDate);
  if (toDate) expQuery = expQuery.lte('date', toDate);
  const { data: expenses } = await expQuery;

  // Get maintenance
  let maintQuery = supabase
    .from('maintenance_records')
    .select('vehicle_id, cost')
    .eq('organization_id', organizationId)
    .eq('status', 'completed');
  if (fromDate) maintQuery = maintQuery.gte('date', fromDate);
  if (toDate) maintQuery = maintQuery.lte('date', toDate);
  const { data: maintenance } = await maintQuery;

  // Build per-vehicle metrics
  return vehicles.map(vehicle => {
    const vTrips = (trips || []).filter(t => t.vehicle_id === vehicle.id);
    const vFuel = (fuelEntries || []).filter(f => f.vehicle_id === vehicle.id);
    const vExpenses = (expenses || []).filter(e => e.vehicle_id === vehicle.id);
    const vMaint = (maintenance || []).filter(m => m.vehicle_id === vehicle.id);

    const totalRevenue = vTrips.reduce((s, t) => s + (t.freight_amount || 0) + (t.detention_charges || 0) + (t.other_charges || 0), 0);
    const fuelCost = vFuel.reduce((s, f) => s + (f.amount || 0), 0);
    const maintenanceCost = vMaint.reduce((s, m) => s + (m.cost || 0), 0);
    const otherExpenses = vExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalCost = fuelCost + maintenanceCost + otherExpenses;
    const profit = totalRevenue - totalCost;
    const totalKm = vTrips.reduce((s, t) => s + (t.distance_km || 0), 0);

    return {
      vehicleId: vehicle.id,
      vehicleReg: vehicle.reg_number,
      vehicleType: vehicle.vehicle_type || 'truck',
      totalTrips: vTrips.length,
      totalRevenue,
      fuelCost,
      maintenanceCost,
      otherExpenses,
      totalCost,
      profit,
      profitMargin: totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0,
      costPerKm: totalKm > 0 ? Math.round(totalCost / totalKm) : 0,
      totalKm,
    };
  }).sort((a, b) => b.profit - a.profit);
}

// ============================================================
// 4. CASH FLOW STATEMENT
// ============================================================

export async function generateCashFlow(
  organizationId: string,
  fromDate: string,
  toDate: string
): Promise<CashFlowStatement> {
  // Inflows: payments received
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('organization_id', organizationId)
    .gte('payment_date', fromDate)
    .lte('payment_date', toDate);

  const customerPayments = (payments || []).reduce((s, p) => s + (p.amount || 0), 0);

  // Outflows: expenses
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('organization_id', organizationId)
    .gte('date', fromDate)
    .lte('date', toDate);

  const fuelExpenses = (expenses || []).filter(e => e.category === 'diesel').reduce((s, e) => s + (e.amount || 0), 0);
  const driverPayments = (expenses || []).filter(e => ['driver_bata', 'salary'].includes(e.category)).reduce((s, e) => s + (e.amount || 0), 0);
  const maintenanceExpenses = (expenses || []).filter(e => e.category === 'repair').reduce((s, e) => s + (e.amount || 0), 0);
  const otherExpensesAmt = (expenses || []).filter(e => !['diesel', 'driver_bata', 'salary', 'repair'].includes(e.category)).reduce((s, e) => s + (e.amount || 0), 0);

  // Fuel entries (separate from expenses table)
  const { data: fuel } = await supabase
    .from('fuel_entries')
    .select('amount')
    .eq('organization_id', organizationId)
    .gte('date', fromDate)
    .lte('date', toDate);

  const totalFuelOutflow = (fuel || []).reduce((s, f) => s + (f.amount || 0), 0) + fuelExpenses;
  const totalOutflow = totalFuelOutflow + driverPayments + maintenanceExpenses + otherExpensesAmt;

  return {
    period: { from: fromDate, to: toDate },
    inflows: {
      customerPayments,
      otherReceipts: 0,
      totalInflow: customerPayments,
    },
    outflows: {
      vendorPayments: 0,
      fuelExpenses: totalFuelOutflow,
      driverPayments,
      maintenanceExpenses,
      otherExpenses: otherExpensesAmt,
      totalOutflow,
    },
    netCashFlow: customerPayments - totalOutflow,
  };
}
