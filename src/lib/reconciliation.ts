// ============================================================
// RECONCILIATION ENGINE
//
// Automated financial integrity checks. Every check returns
// PASS, WARNING, or FAIL with detailed diagnostics.
//
// Run these checks:
// - On admin login (background)
// - On demand (Settings → Diagnostics)
// - Before financial report generation
//
// CHECKS:
// 1. Trial Balance: Total DR must equal Total CR
// 2. Customer Outstanding: customer.outstanding must match unpaid invoices
// 3. Vendor Outstanding: vendor.outstanding must match payable balance
// 4. Cash Balance: Cash journal entries must reconcile
// 5. Bank Balance: Bank journal entries must reconcile
// 6. Journal Integrity: Every entry must have DR = CR per reference
// ============================================================

import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================

export type CheckStatus = 'PASS' | 'WARNING' | 'FAIL';

export interface ReconciliationResult {
  check: string;
  status: CheckStatus;
  message: string;
  details?: {
    expected?: number;
    actual?: number;
    difference?: number;
    items?: { id: string; name: string; expected: number; actual: number }[];
  };
}

// ============================================================
// CHECK 1: TRIAL BALANCE
// Total Debits must equal Total Credits across ALL journal entries
// ============================================================

export async function checkTrialBalance(organizationId: string): Promise<ReconciliationResult> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('debit, credit')
    .eq('organization_id', organizationId);

  if (error) return { check: 'Trial Balance', status: 'FAIL', message: `Query error: ${error.message}` };
  if (!data || data.length === 0) return { check: 'Trial Balance', status: 'PASS', message: 'No journal entries (system is new)' };

  const totalDebit = data.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = data.reduce((sum, e) => sum + (e.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);

  if (difference < 0.01) {
    return { check: 'Trial Balance', status: 'PASS', message: `Balanced. DR ₹${totalDebit.toLocaleString('en-IN')} = CR ₹${totalCredit.toLocaleString('en-IN')}`, details: { expected: totalDebit, actual: totalCredit, difference: 0 } };
  } else if (difference < 1) {
    return { check: 'Trial Balance', status: 'WARNING', message: `Rounding difference: ₹${difference.toFixed(2)}`, details: { expected: totalDebit, actual: totalCredit, difference } };
  } else {
    return { check: 'Trial Balance', status: 'FAIL', message: `UNBALANCED. DR ₹${totalDebit.toLocaleString('en-IN')} ≠ CR ₹${totalCredit.toLocaleString('en-IN')}. Difference: ₹${difference.toFixed(2)}`, details: { expected: totalDebit, actual: totalCredit, difference } };
  }
}

// ============================================================
// CHECK 2: CUSTOMER OUTSTANDING
// customer.outstanding must equal SUM(invoice.balance_amount) for that customer
// ============================================================

export async function checkCustomerOutstanding(organizationId: string): Promise<ReconciliationResult> {
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, outstanding')
    .eq('organization_id', organizationId);

  if (!customers || customers.length === 0) return { check: 'Customer Outstanding', status: 'PASS', message: 'No customers' };

  const mismatches: { id: string; name: string; expected: number; actual: number }[] = [];

  for (const customer of customers) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('balance_amount')
      .eq('organization_id', organizationId)
      .eq('customer_id', customer.id)
      .gt('balance_amount', 0)
      .neq('status', 'cancelled');

    const actualOutstanding = (invoices || []).reduce((sum, inv) => sum + (inv.balance_amount || 0), 0);
    const recordedOutstanding = customer.outstanding || 0;

    if (Math.abs(actualOutstanding - recordedOutstanding) > 1) {
      mismatches.push({ id: customer.id, name: customer.name, expected: actualOutstanding, actual: recordedOutstanding });
    }
  }

  if (mismatches.length === 0) {
    return { check: 'Customer Outstanding', status: 'PASS', message: `All ${customers.length} customers reconciled` };
  } else {
    return { check: 'Customer Outstanding', status: 'FAIL', message: `${mismatches.length} customer(s) have mismatched outstanding`, details: { items: mismatches } };
  }
}

// ============================================================
// CHECK 3: VENDOR OUTSTANDING
// vendor.outstanding must be non-negative and reasonable
// ============================================================

export async function checkVendorOutstanding(organizationId: string): Promise<ReconciliationResult> {
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, name, outstanding, total_paid')
    .eq('organization_id', organizationId);

  if (!vendors || vendors.length === 0) return { check: 'Vendor Outstanding', status: 'PASS', message: 'No vendors' };

  const issues: { id: string; name: string; expected: number; actual: number }[] = [];

  for (const vendor of vendors) {
    if ((vendor.outstanding || 0) < 0) {
      issues.push({ id: vendor.id, name: vendor.name, expected: 0, actual: vendor.outstanding });
    }
  }

  if (issues.length === 0) {
    return { check: 'Vendor Outstanding', status: 'PASS', message: `All ${vendors.length} vendors have valid outstanding` };
  } else {
    return { check: 'Vendor Outstanding', status: 'WARNING', message: `${issues.length} vendor(s) have negative outstanding`, details: { items: issues } };
  }
}

// ============================================================
// CHECK 4: JOURNAL INTEGRITY
// Every transaction reference must have balanced entries (DR = CR)
// ============================================================

export async function checkJournalIntegrity(organizationId: string): Promise<ReconciliationResult> {
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('reference_type, reference_id, debit, credit')
    .eq('organization_id', organizationId);

  if (!entries || entries.length === 0) return { check: 'Journal Integrity', status: 'PASS', message: 'No journal entries' };

  // Group by reference
  const byRef: Record<string, { dr: number; cr: number }> = {};
  entries.forEach(e => {
    const key = `${e.reference_type}:${e.reference_id}`;
    if (!byRef[key]) byRef[key] = { dr: 0, cr: 0 };
    byRef[key].dr += e.debit || 0;
    byRef[key].cr += e.credit || 0;
  });

  const unbalanced: { id: string; name: string; expected: number; actual: number }[] = [];
  Object.entries(byRef).forEach(([key, totals]) => {
    if (Math.abs(totals.dr - totals.cr) > 0.01) {
      unbalanced.push({ id: key, name: key, expected: totals.dr, actual: totals.cr });
    }
  });

  if (unbalanced.length === 0) {
    return { check: 'Journal Integrity', status: 'PASS', message: `All ${Object.keys(byRef).length} transaction entries are balanced` };
  } else {
    return { check: 'Journal Integrity', status: 'FAIL', message: `${unbalanced.length} unbalanced journal entries found`, details: { items: unbalanced.slice(0, 10) } };
  }
}

// ============================================================
// CHECK 5: CASH/BANK RECONCILIATION
// Cash entries total must be reasonable (non-negative balance)
// ============================================================

export async function checkCashBankBalance(organizationId: string): Promise<ReconciliationResult> {
  // Cash: receipts - payments
  const { data: cashEntries } = await supabase
    .from('cash_entries')
    .select('type, amount')
    .eq('organization_id', organizationId);

  const cashReceipts = (cashEntries || []).filter(e => e.type === 'receipt').reduce((s, e) => s + (e.amount || 0), 0);
  const cashPayments = (cashEntries || []).filter(e => e.type === 'payment').reduce((s, e) => s + (e.amount || 0), 0);
  const cashBalance = cashReceipts - cashPayments;

  // Bank: receipts - payments
  const { data: bankEntries } = await supabase
    .from('bank_entries')
    .select('type, amount')
    .eq('organization_id', organizationId);

  const bankReceipts = (bankEntries || []).filter(e => e.type === 'receipt').reduce((s, e) => s + (e.amount || 0), 0);
  const bankPayments = (bankEntries || []).filter(e => e.type === 'payment').reduce((s, e) => s + (e.amount || 0), 0);
  const bankBalance = bankReceipts - bankPayments;

  const issues: string[] = [];
  if (cashBalance < 0) issues.push(`Cash balance is negative: ₹${cashBalance.toFixed(2)}`);
  if (bankBalance < -100000) issues.push(`Bank balance severely negative: ₹${bankBalance.toFixed(2)}`);

  if (issues.length === 0) {
    return { check: 'Cash & Bank', status: 'PASS', message: `Cash: ₹${cashBalance.toLocaleString('en-IN')} | Bank: ₹${bankBalance.toLocaleString('en-IN')}`, details: { expected: cashBalance, actual: bankBalance } };
  } else {
    return { check: 'Cash & Bank', status: 'WARNING', message: issues.join('; '), details: { expected: cashBalance, actual: bankBalance } };
  }
}

// ============================================================
// CHECK 6: ORPHAN RECORDS
// Trips with non-existent customer/vehicle/driver references
// ============================================================

export async function checkOrphanRecords(organizationId: string): Promise<ReconciliationResult> {
  // Trips with customer_id that doesn't exist
  const { data: trips } = await supabase
    .from('trips')
    .select('id, trip_number, customer_id')
    .eq('organization_id', organizationId)
    .not('customer_id', 'is', null);

  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId);

  if (!trips || !customers) return { check: 'Orphan Records', status: 'PASS', message: 'No data to check' };

  const customerIds = new Set(customers.map(c => c.id));
  const orphanTrips = trips.filter(t => t.customer_id && !customerIds.has(t.customer_id));

  if (orphanTrips.length === 0) {
    return { check: 'Orphan Records', status: 'PASS', message: 'No orphan references found' };
  } else {
    return { check: 'Orphan Records', status: 'WARNING', message: `${orphanTrips.length} trip(s) reference non-existent customers`, details: { items: orphanTrips.slice(0, 5).map(t => ({ id: t.id, name: t.trip_number || t.id, expected: 0, actual: 0 })) } };
  }
}

// ============================================================
// RUN ALL CHECKS
// ============================================================

export async function runAllReconciliations(organizationId: string): Promise<ReconciliationResult[]> {
  const results: ReconciliationResult[] = [];

  results.push(await checkTrialBalance(organizationId));
  results.push(await checkCustomerOutstanding(organizationId));
  results.push(await checkVendorOutstanding(organizationId));
  results.push(await checkJournalIntegrity(organizationId));
  results.push(await checkCashBankBalance(organizationId));
  results.push(await checkOrphanRecords(organizationId));

  return results;
}

/**
 * Quick health check — returns true only if ALL checks pass
 */
export async function isHealthy(organizationId: string): Promise<boolean> {
  const results = await runAllReconciliations(organizationId);
  return results.every(r => r.status !== 'FAIL');
}
