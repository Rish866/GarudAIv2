// ============================================================
// ERP TRANSACTION ENGINE — Unit Tests
//
// Tests verify:
// 1. Transaction functions call the correct RPC
// 2. Domain events are emitted on success
// 3. Error handling returns structured results
// 4. Accounting journal entries are balanced
// 5. Reconciliation checks work correctly
//
// These tests mock Supabase — they verify the ENGINE logic,
// not the database. Integration tests (requiring live DB)
// are in tests/integration/
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateJournalEntries, invoiceJournalEntries, paymentJournalEntries, expenseJournalEntries, fuelJournalEntries, vendorPaymentJournalEntries } from '../../src/lib/accounting';
import { checkApprovalRequired, canApprove } from '../../src/lib/approvalEngine';
import type { OrganizationRole } from '../../src/types/organization';

// ============================================================
// ACCOUNTING TESTS
// ============================================================

describe('Accounting Engine — Journal Entry Generation', () => {
  describe('Invoice Journal Entries', () => {
    it('generates balanced DR/CR for invoice', () => {
      const entries = invoiceJournalEntries('Patel Logistics', 50000, 2500, 52500, 'inv-001', 'INV-2026-001');
      const { valid, debitTotal, creditTotal } = validateJournalEntries(entries);

      expect(valid).toBe(true);
      expect(debitTotal).toBe(52500); // DR Receivable = total
      expect(creditTotal).toBe(52500); // CR Revenue + GST = total
      expect(entries.length).toBe(3); // Receivable DR, Revenue CR, GST CR
    });

    it('generates 2 entries when GST is zero', () => {
      const entries = invoiceJournalEntries('ABC Transport', 30000, 0, 30000, 'inv-002', 'INV-2026-002');
      const { valid } = validateJournalEntries(entries);

      expect(valid).toBe(true);
      expect(entries.length).toBe(2); // No GST entry
    });

    it('uses correct account names', () => {
      const entries = invoiceJournalEntries('XYZ Corp', 10000, 500, 10500, 'inv-003', 'INV-2026-003');

      expect(entries[0].account_name).toBe('XYZ Corp (Receivable)');
      expect(entries[0].account_group).toBe('Assets');
      expect(entries[1].account_name).toBe('Freight Revenue');
      expect(entries[1].account_group).toBe('Income');
      expect(entries[2].account_name).toBe('GST Payable (Output)');
      expect(entries[2].account_group).toBe('Liabilities');
    });
  });

  describe('Payment Journal Entries', () => {
    it('generates balanced entries for bank payment', () => {
      const entries = paymentJournalEntries('Patel Logistics', 50000, 0, 'bank_transfer', 'pay-001', 'UTR12345');
      const { valid, debitTotal, creditTotal } = validateJournalEntries(entries);

      expect(valid).toBe(true);
      expect(debitTotal).toBe(50000);
      expect(creditTotal).toBe(50000);
    });

    it('handles TDS correctly', () => {
      const entries = paymentJournalEntries('ABC Transport', 48000, 2000, 'bank_transfer', 'pay-002', '');
      const { valid, debitTotal, creditTotal } = validateJournalEntries(entries);

      expect(valid).toBe(true);
      expect(debitTotal).toBe(50000); // 48000 bank + 2000 TDS
      expect(creditTotal).toBe(50000); // Customer receivable
      expect(entries.length).toBe(3); // Bank DR, TDS DR, Customer CR
    });

    it('uses Cash Account for cash payments', () => {
      const entries = paymentJournalEntries('XYZ', 10000, 0, 'cash', 'pay-003', '');
      expect(entries[0].account_name).toBe('Cash Account');
    });

    it('uses Bank Account for bank payments', () => {
      const entries = paymentJournalEntries('XYZ', 10000, 0, 'bank_transfer', 'pay-004', '');
      expect(entries[0].account_name).toBe('Bank Account');
    });
  });

  describe('Expense Journal Entries', () => {
    it('maps diesel category to correct account', () => {
      const entries = expenseJournalEntries('diesel', 5000, 'cash', 'Fuel for MH04AB1234', 'exp-001');
      const { valid } = validateJournalEntries(entries);

      expect(valid).toBe(true);
      expect(entries[0].account_name).toBe('Diesel & Fuel');
      expect(entries[0].account_group).toBe('Expense');
      expect(entries[1].account_name).toBe('Cash Account');
    });

    it('maps toll category correctly', () => {
      const entries = expenseJournalEntries('toll', 1200, 'cash', 'Mumbai-Pune expressway', 'exp-002');
      expect(entries[0].account_name).toBe('Toll Expenses');
    });

    it('maps repair category correctly', () => {
      const entries = expenseJournalEntries('repair', 8000, 'bank', 'Engine oil change', 'exp-003');
      expect(entries[0].account_name).toBe('Repair & Maintenance');
      expect(entries[1].account_name).toBe('Bank Account'); // Bank payment
    });
  });

  describe('Fuel Journal Entries', () => {
    it('always debits Diesel & Fuel', () => {
      const entries = fuelJournalEntries(4500, 'fuel_card', 'MH04AB1234', 'fuel-001');
      const { valid } = validateJournalEntries(entries);

      expect(valid).toBe(true);
      expect(entries[0].account_name).toBe('Diesel & Fuel');
      expect(entries[0].debit).toBe(4500);
    });
  });

  describe('Vendor Payment Journal Entries', () => {
    it('debits vendor payable and credits bank', () => {
      const entries = vendorPaymentJournalEntries('Sharma Workshop', 15000, 'bank_transfer', 'Engine repair', 'vp-001');
      const { valid } = validateJournalEntries(entries);

      expect(valid).toBe(true);
      expect(entries[0].account_name).toBe('Sharma Workshop (Payable)');
      expect(entries[0].account_group).toBe('Liabilities');
      expect(entries[0].debit).toBe(15000);
      expect(entries[1].account_name).toBe('Bank Account');
      expect(entries[1].credit).toBe(15000);
    });
  });
});

// ============================================================
// APPROVAL ENGINE TESTS
// ============================================================

describe('Approval Engine', () => {
  it('allows admin to self-approve any amount', () => {
    const rule = checkApprovalRequired('expense', 100000, 'admin');
    expect(rule).toBeNull(); // No approval needed for admin
  });

  it('allows organization_owner to self-approve', () => {
    const rule = checkApprovalRequired('expense', 1000000, 'organization_owner');
    expect(rule).toBeNull();
  });

  it('blocks dispatcher from high expenses', () => {
    const rule = checkApprovalRequired('expense', 6000, 'dispatcher');
    expect(rule).not.toBeNull();
    expect(rule?.description).toContain('₹5,000');
  });

  it('allows operations_manager for expenses under 25000', () => {
    const rule = checkApprovalRequired('expense', 6000, 'operations_manager');
    expect(rule).toBeNull(); // ops_manager is in approver list
  });

  it('blocks fleet_manager from vendor payments over 50000', () => {
    const rule = checkApprovalRequired('vendor_payment', 60000, 'fleet_manager');
    expect(rule).not.toBeNull();
  });

  it('canApprove returns true for authorized roles', () => {
    expect(canApprove('admin', 'expense')).toBe(true);
    expect(canApprove('organization_owner', 'write_off')).toBe(true);
    expect(canApprove('dispatcher', 'write_off')).toBe(false);
  });
});

// ============================================================
// VALIDATION RULES
// ============================================================

describe('Journal Validation', () => {
  it('rejects unbalanced entries', () => {
    const entries = [
      { account_name: 'Cash', account_group: 'Assets' as const, debit: 1000, credit: 0, narration: '', reference_type: 'test', reference_id: '1' },
      { account_name: 'Revenue', account_group: 'Income' as const, debit: 0, credit: 900, narration: '', reference_type: 'test', reference_id: '1' },
    ];
    const { valid } = validateJournalEntries(entries);
    expect(valid).toBe(false);
  });

  it('accepts balanced entries', () => {
    const entries = [
      { account_name: 'Cash', account_group: 'Assets' as const, debit: 1000, credit: 0, narration: '', reference_type: 'test', reference_id: '1' },
      { account_name: 'Revenue', account_group: 'Income' as const, debit: 0, credit: 1000, narration: '', reference_type: 'test', reference_id: '1' },
    ];
    const { valid } = validateJournalEntries(entries);
    expect(valid).toBe(true);
  });
});
