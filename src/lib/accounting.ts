// ============================================================
// ACCOUNTING ENGINE — Double-Entry Ledger Automation
//
// Every financial transaction automatically posts journal entries
// following Indian transport accounting standards.
//
// CHART OF ACCOUNTS (Transport ERP):
// ────────────────────────────────────
// ASSETS:
//   - Cash Account
//   - Bank Account
//   - Sundry Debtors (per customer - auto-created)
//   - Vehicles (fixed assets)
//   - TDS Receivable
//
// LIABILITIES:
//   - Sundry Creditors (per vendor - auto-created)
//   - GST Payable (Output Tax)
//   - TDS Payable
//
// INCOME:
//   - Freight Revenue
//   - Detention Revenue
//   - Other Income
//
// EXPENSES:
//   - Diesel/Fuel
//   - Toll
//   - Driver Bata/Salary
//   - Loading/Unloading
//   - Repair & Maintenance
//   - Tyres
//   - Insurance
//   - EMI
//   - Office & Admin
//   - Miscellaneous
//
// DOUBLE-ENTRY RULES:
// ────────────────────
// Invoice Created:
//   DR  Sundry Debtor (customer)     ₹ Total
//   CR  Freight Revenue              ₹ Subtotal
//   CR  GST Payable                  ₹ GST Amount
//
// Payment Received (Bank):
//   DR  Bank Account                 ₹ Amount
//   DR  TDS Receivable               ₹ TDS (if any)
//   CR  Sundry Debtor (customer)     ₹ Total
//
// Expense Recorded (Cash):
//   DR  Expense Account (category)   ₹ Amount
//   CR  Cash Account                 ₹ Amount
//
// Fuel Purchased:
//   DR  Diesel Expense               ₹ Amount
//   CR  Cash/Fuel Card               ₹ Amount
//
// Vendor Payment:
//   DR  Sundry Creditor (vendor)     ₹ Amount
//   CR  Bank/Cash                    ₹ Amount
// ============================================================

/**
 * Standard account names for the transport Chart of Accounts.
 * These are used as ledger_accounts.name values.
 */
export const CHART_OF_ACCOUNTS = {
  // Assets
  CASH: 'Cash Account',
  BANK: 'Bank Account',
  TDS_RECEIVABLE: 'TDS Receivable',

  // Liabilities
  GST_PAYABLE: 'GST Payable (Output)',
  TDS_PAYABLE: 'TDS Payable',

  // Income
  FREIGHT_REVENUE: 'Freight Revenue',
  DETENTION_REVENUE: 'Detention Revenue',
  OTHER_INCOME: 'Other Income',

  // Expenses (mapped from expense categories)
  EXPENSE_DIESEL: 'Diesel & Fuel',
  EXPENSE_TOLL: 'Toll Expenses',
  EXPENSE_DRIVER_BATA: 'Driver Bata & Salary',
  EXPENSE_LOADING: 'Loading & Unloading',
  EXPENSE_REPAIR: 'Repair & Maintenance',
  EXPENSE_TYRE: 'Tyre Expenses',
  EXPENSE_INSURANCE: 'Insurance',
  EXPENSE_EMI: 'EMI & Finance Charges',
  EXPENSE_OFFICE: 'Office & Admin',
  EXPENSE_MISC: 'Miscellaneous Expenses',
} as const;

/**
 * Map expense category to ledger account name
 */
export function getExpenseAccountName(category: string): string {
  const map: Record<string, string> = {
    diesel: CHART_OF_ACCOUNTS.EXPENSE_DIESEL,
    toll: CHART_OF_ACCOUNTS.EXPENSE_TOLL,
    driver_bata: CHART_OF_ACCOUNTS.EXPENSE_DRIVER_BATA,
    loading: CHART_OF_ACCOUNTS.EXPENSE_LOADING,
    unloading: CHART_OF_ACCOUNTS.EXPENSE_LOADING,
    repair: CHART_OF_ACCOUNTS.EXPENSE_REPAIR,
    tyre: CHART_OF_ACCOUNTS.EXPENSE_TYRE,
    insurance: CHART_OF_ACCOUNTS.EXPENSE_INSURANCE,
    emi: CHART_OF_ACCOUNTS.EXPENSE_EMI,
    salary: CHART_OF_ACCOUNTS.EXPENSE_DRIVER_BATA,
    office: CHART_OF_ACCOUNTS.EXPENSE_OFFICE,
    misc: CHART_OF_ACCOUNTS.EXPENSE_MISC,
  };
  return map[category] || CHART_OF_ACCOUNTS.EXPENSE_MISC;
}

/**
 * Map ledger account group to its normal balance side
 */
export function getNormalBalance(group: string): 'Dr' | 'Cr' {
  switch (group) {
    case 'Assets': return 'Dr';
    case 'Expense': return 'Dr';
    case 'Liabilities': return 'Cr';
    case 'Income': return 'Cr';
    default: return 'Dr';
  }
}

/**
 * Journal entry structure for double-entry postings
 */
export interface JournalEntry {
  account_name: string;
  account_group: 'Assets' | 'Liabilities' | 'Income' | 'Expense';
  debit: number;
  credit: number;
  narration: string;
  reference_type: string; // 'invoice', 'payment', 'expense', 'fuel', etc.
  reference_id: string;
}

/**
 * Generate journal entries for an INVOICE creation.
 * DR Sundry Debtor (customer), CR Freight Revenue + GST Payable
 */
export function invoiceJournalEntries(
  customerName: string,
  subtotal: number,
  gstAmount: number,
  totalAmount: number,
  invoiceId: string,
  invoiceNumber: string
): JournalEntry[] {
  const entries: JournalEntry[] = [
    {
      account_name: `${customerName} (Receivable)`,
      account_group: 'Assets',
      debit: totalAmount,
      credit: 0,
      narration: `Invoice ${invoiceNumber} raised`,
      reference_type: 'invoice',
      reference_id: invoiceId,
    },
    {
      account_name: CHART_OF_ACCOUNTS.FREIGHT_REVENUE,
      account_group: 'Income',
      debit: 0,
      credit: subtotal,
      narration: `Freight revenue - Invoice ${invoiceNumber}`,
      reference_type: 'invoice',
      reference_id: invoiceId,
    },
  ];

  if (gstAmount > 0) {
    entries.push({
      account_name: CHART_OF_ACCOUNTS.GST_PAYABLE,
      account_group: 'Liabilities',
      debit: 0,
      credit: gstAmount,
      narration: `GST on Invoice ${invoiceNumber}`,
      reference_type: 'invoice',
      reference_id: invoiceId,
    });
  }

  return entries;
}

/**
 * Generate journal entries for PAYMENT received.
 * DR Bank/Cash + TDS, CR Sundry Debtor (customer)
 */
export function paymentJournalEntries(
  customerName: string,
  amount: number,
  tdsAmount: number,
  paymentMode: string,
  paymentId: string,
  reference: string
): JournalEntry[] {
  const totalCredit = amount + tdsAmount;
  const entries: JournalEntry[] = [];

  // Debit: Bank or Cash
  entries.push({
    account_name: paymentMode === 'cash' ? CHART_OF_ACCOUNTS.CASH : CHART_OF_ACCOUNTS.BANK,
    account_group: 'Assets',
    debit: amount,
    credit: 0,
    narration: `Payment received from ${customerName} (${reference || paymentMode})`,
    reference_type: 'payment',
    reference_id: paymentId,
  });

  // Debit: TDS Receivable (if TDS deducted by customer)
  if (tdsAmount > 0) {
    entries.push({
      account_name: CHART_OF_ACCOUNTS.TDS_RECEIVABLE,
      account_group: 'Assets',
      debit: tdsAmount,
      credit: 0,
      narration: `TDS deducted by ${customerName}`,
      reference_type: 'payment',
      reference_id: paymentId,
    });
  }

  // Credit: Customer receivable
  entries.push({
    account_name: `${customerName} (Receivable)`,
    account_group: 'Assets',
    debit: 0,
    credit: totalCredit,
    narration: `Payment against receivable - ${customerName}`,
    reference_type: 'payment',
    reference_id: paymentId,
  });

  return entries;
}

/**
 * Generate journal entries for EXPENSE.
 * DR Expense Account (category), CR Cash/Bank
 */
export function expenseJournalEntries(
  category: string,
  amount: number,
  paymentMode: string,
  description: string,
  expenseId: string
): JournalEntry[] {
  return [
    {
      account_name: getExpenseAccountName(category),
      account_group: 'Expense',
      debit: amount,
      credit: 0,
      narration: description || `Expense: ${category}`,
      reference_type: 'expense',
      reference_id: expenseId,
    },
    {
      account_name: paymentMode === 'cash' ? CHART_OF_ACCOUNTS.CASH : CHART_OF_ACCOUNTS.BANK,
      account_group: 'Assets',
      debit: 0,
      credit: amount,
      narration: `Payment for ${category} expense`,
      reference_type: 'expense',
      reference_id: expenseId,
    },
  ];
}

/**
 * Generate journal entries for FUEL purchase.
 * DR Diesel Expense, CR Cash/Fuel Card
 */
export function fuelJournalEntries(
  amount: number,
  paymentMode: string,
  vehicleReg: string,
  fuelEntryId: string
): JournalEntry[] {
  return [
    {
      account_name: CHART_OF_ACCOUNTS.EXPENSE_DIESEL,
      account_group: 'Expense',
      debit: amount,
      credit: 0,
      narration: `Diesel for ${vehicleReg}`,
      reference_type: 'fuel',
      reference_id: fuelEntryId,
    },
    {
      account_name: paymentMode === 'cash' ? CHART_OF_ACCOUNTS.CASH : CHART_OF_ACCOUNTS.BANK,
      account_group: 'Assets',
      debit: 0,
      credit: amount,
      narration: `Fuel payment - ${vehicleReg}`,
      reference_type: 'fuel',
      reference_id: fuelEntryId,
    },
  ];
}

/**
 * Generate journal entries for VENDOR PAYMENT.
 * DR Sundry Creditor (vendor), CR Bank/Cash
 */
export function vendorPaymentJournalEntries(
  vendorName: string,
  amount: number,
  paymentMode: string,
  description: string,
  paymentId: string
): JournalEntry[] {
  return [
    {
      account_name: `${vendorName} (Payable)`,
      account_group: 'Liabilities',
      debit: amount,
      credit: 0,
      narration: `Payment to ${vendorName}: ${description}`,
      reference_type: 'vendor_payment',
      reference_id: paymentId,
    },
    {
      account_name: paymentMode === 'cash' ? CHART_OF_ACCOUNTS.CASH : CHART_OF_ACCOUNTS.BANK,
      account_group: 'Assets',
      debit: 0,
      credit: amount,
      narration: `Vendor payment - ${vendorName}`,
      reference_type: 'vendor_payment',
      reference_id: paymentId,
    },
  ];
}

/**
 * Validate journal entries — total debits must equal total credits
 */
export function validateJournalEntries(entries: JournalEntry[]): { valid: boolean; debitTotal: number; creditTotal: number } {
  const debitTotal = entries.reduce((sum, e) => sum + e.debit, 0);
  const creditTotal = entries.reduce((sum, e) => sum + e.credit, 0);
  return { valid: Math.abs(debitTotal - creditTotal) < 0.01, debitTotal, creditTotal };
}
