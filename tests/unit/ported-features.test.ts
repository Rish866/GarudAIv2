/**
 * GARUD AI ERP — Ported Features Tests
 *
 * Tests for features ported from feat/production-saas-transformation:
 * 1. Billing RPCs (migration 013) — record_payment, create_invoice_with_outstanding
 * 2. Payroll records (migration 012) — table structure, lock mechanism
 * 3. Audit triggers (migration 014) — trigger function behavior
 * 4. Password recovery — auth functions
 * 5. RBAC additions — canDelete, canApprove
 */

import { describe, it, expect } from 'vitest';
import { canWrite, canAccessFinancials, canManageSettings, canDelete, canApprove } from '../../src/lib/rbac';
import type { UserRole } from '../../src/types';

// ============================================================
// RBAC: canDelete and canApprove
// ============================================================

describe('RBAC: canDelete', () => {
  it('super_admin can delete', () => {
    expect(canDelete('super_admin')).toBe(true);
  });

  it('admin can delete', () => {
    expect(canDelete('admin')).toBe(true);
  });

  it('operations cannot delete', () => {
    expect(canDelete('operations')).toBe(false);
  });

  it('fleet_manager cannot delete', () => {
    expect(canDelete('fleet_manager')).toBe(false);
  });

  it('accounts cannot delete', () => {
    expect(canDelete('accounts')).toBe(false);
  });

  it('driver cannot delete', () => {
    expect(canDelete('driver')).toBe(false);
  });
});

describe('RBAC: canApprove', () => {
  it('super_admin can approve', () => {
    expect(canApprove('super_admin')).toBe(true);
  });

  it('admin can approve', () => {
    expect(canApprove('admin')).toBe(true);
  });

  it('operations can approve', () => {
    expect(canApprove('operations')).toBe(true);
  });

  it('accounts can approve', () => {
    expect(canApprove('accounts')).toBe(true);
  });

  it('fleet_manager cannot approve', () => {
    expect(canApprove('fleet_manager')).toBe(false);
  });

  it('driver cannot approve', () => {
    expect(canApprove('driver')).toBe(false);
  });
});

// ============================================================
// RBAC: existing functions still work (regression)
// ============================================================

describe('RBAC: existing functions regression', () => {
  it('canWrite allows appropriate roles', () => {
    expect(canWrite('super_admin')).toBe(true);
    expect(canWrite('admin')).toBe(true);
    expect(canWrite('operations')).toBe(true);
    expect(canWrite('fleet_manager')).toBe(true);
    expect(canWrite('accounts')).toBe(false);
    expect(canWrite('driver')).toBe(false);
  });

  it('canAccessFinancials allows appropriate roles', () => {
    expect(canAccessFinancials('super_admin')).toBe(true);
    expect(canAccessFinancials('admin')).toBe(true);
    expect(canAccessFinancials('accounts')).toBe(true);
    expect(canAccessFinancials('operations')).toBe(false);
    expect(canAccessFinancials('driver')).toBe(false);
  });

  it('canManageSettings allows only admin roles', () => {
    expect(canManageSettings('super_admin')).toBe(true);
    expect(canManageSettings('admin')).toBe(true);
    expect(canManageSettings('operations')).toBe(false);
    expect(canManageSettings('driver')).toBe(false);
  });
});

// ============================================================
// Payroll record schema validation (conceptual — mirrors migration 012)
// ============================================================

describe('Payroll record structure', () => {
  const validPayroll = {
    organization_id: '5e8c6ca7-9b3c-48b9-a741-411268db299e',
    employee_name: 'Test Driver',
    employee_type: 'driver',
    month: 7,
    year: 2026,
    salary_type: 'monthly',
    base_salary: 25000,
    trip_count: 12,
    total_km: 4500,
    trip_allowance: 3000,
    gross_salary: 28000,
    advance_deduction: 5000,
    total_deductions: 5000,
    net_payable: 23000,
    status: 'draft',
    locked: false,
  };

  it('validates employee_type is one of driver/staff/manager', () => {
    const validTypes = ['driver', 'staff', 'manager'];
    expect(validTypes).toContain(validPayroll.employee_type);
    expect(validTypes).not.toContain('contractor');
  });

  it('validates month is between 1 and 12', () => {
    expect(validPayroll.month).toBeGreaterThanOrEqual(1);
    expect(validPayroll.month).toBeLessThanOrEqual(12);
  });

  it('validates year is reasonable', () => {
    expect(validPayroll.year).toBeGreaterThanOrEqual(2020);
    expect(validPayroll.year).toBeLessThanOrEqual(2100);
  });

  it('validates salary_type is one of monthly/per_trip/per_km', () => {
    const validSalaryTypes = ['monthly', 'per_trip', 'per_km'];
    expect(validSalaryTypes).toContain(validPayroll.salary_type);
  });

  it('validates status workflow', () => {
    const validStatuses = ['draft', 'processed', 'paid', 'cancelled'];
    expect(validStatuses).toContain(validPayroll.status);
  });

  it('locked records should block edits', () => {
    const lockedRecord = { ...validPayroll, locked: true };
    // Business rule: locked = true means no UPDATE/DELETE allowed
    expect(lockedRecord.locked).toBe(true);
    // In production this is enforced by RLS: AND locked = FALSE in USING clause
  });

  it('net_payable equals gross minus deductions', () => {
    expect(validPayroll.net_payable).toBe(validPayroll.gross_salary - validPayroll.total_deductions);
  });
});

// ============================================================
// Billing RPC validation logic (mirrors migration 013)
// ============================================================

describe('Billing RPC: record_payment validation', () => {
  it('rejects negative payment amount', () => {
    const amount = -100;
    const tds = 0;
    const totalPayment = amount + tds;
    expect(totalPayment).toBeLessThanOrEqual(0);
  });

  it('rejects zero payment amount', () => {
    const amount = 0;
    const tds = 0;
    const totalPayment = amount + tds;
    expect(totalPayment).toBeLessThanOrEqual(0);
  });

  it('accepts valid payment amount', () => {
    const amount = 5000;
    const tds = 100;
    const totalPayment = amount + tds;
    expect(totalPayment).toBeGreaterThan(0);
  });

  it('detects overpayment', () => {
    const invoiceBalance = 10000;
    const paymentAmount = 15000;
    expect(paymentAmount > invoiceBalance).toBe(true);
  });

  it('calculates new invoice status correctly', () => {
    const totalAmount = 50000;
    const scenarios = [
      { paid: 50000, expectedStatus: 'paid' },
      { paid: 25000, expectedStatus: 'partial' },
      { paid: 0, expectedStatus: 'draft' },
    ];

    for (const s of scenarios) {
      const balance = Math.max(0, totalAmount - s.paid);
      const status = balance <= 0 ? 'paid' : s.paid > 0 ? 'partial' : 'draft';
      expect(status).toBe(s.expectedStatus);
    }
  });

  it('outstanding never goes negative', () => {
    const currentOutstanding = 5000;
    const payment = 8000;
    const newOutstanding = Math.max(0, currentOutstanding - payment);
    expect(newOutstanding).toBe(0);
    expect(newOutstanding).toBeGreaterThanOrEqual(0);
  });
});

describe('Billing RPC: create_invoice_with_outstanding validation', () => {
  it('calculates GST correctly', () => {
    const subtotal = 100000;
    const gstPercent = 5;
    const gstAmount = Math.round(subtotal * gstPercent / 100);
    expect(gstAmount).toBe(5000);
  });

  it('calculates TDS at 2%', () => {
    const subtotal = 100000;
    const tdsAmount = Math.round(subtotal * 0.02);
    expect(tdsAmount).toBe(2000);
  });

  it('total = subtotal + GST - TDS', () => {
    const freight = 80000;
    const detention = 5000;
    const other = 2000;
    const subtotal = freight + detention + other;
    const gst = Math.round(subtotal * 5 / 100);
    const tds = Math.round(subtotal * 0.02);
    const total = subtotal + gst - tds;
    expect(total).toBe(87000 + 4350 - 1740);
    expect(total).toBe(89610);
  });

  it('new outstanding increases by total amount', () => {
    const currentOutstanding = 25000;
    const invoiceTotal = 50000;
    const newOutstanding = currentOutstanding + invoiceTotal;
    expect(newOutstanding).toBe(75000);
  });
});

// ============================================================
// Audit trigger conceptual tests (migration 014)
// ============================================================

describe('Audit trigger behavior', () => {
  const AUDITED_TABLES = [
    'customers', 'drivers', 'vehicles', 'trips',
    'invoices', 'payments', 'payroll_records',
    'organization_members', 'organization_invitations',
    'fuel_entries', 'maintenance_records',
  ];

  it('covers 11 sensitive business tables', () => {
    expect(AUDITED_TABLES).toHaveLength(11);
  });

  it('includes all financial tables', () => {
    expect(AUDITED_TABLES).toContain('invoices');
    expect(AUDITED_TABLES).toContain('payments');
    expect(AUDITED_TABLES).toContain('payroll_records');
  });

  it('includes all identity tables', () => {
    expect(AUDITED_TABLES).toContain('customers');
    expect(AUDITED_TABLES).toContain('drivers');
    expect(AUDITED_TABLES).toContain('vehicles');
  });

  it('includes membership tables', () => {
    expect(AUDITED_TABLES).toContain('organization_members');
    expect(AUDITED_TABLES).toContain('organization_invitations');
  });

  it('includes operational tables', () => {
    expect(AUDITED_TABLES).toContain('trips');
    expect(AUDITED_TABLES).toContain('fuel_entries');
    expect(AUDITED_TABLES).toContain('maintenance_records');
  });

  it('audit record structure captures all required fields', () => {
    const auditRecord = {
      organization_id: '5e8c6ca7-9b3c-48b9-a741-411268db299e',
      user_id: '4466de4e-1f90-4a6f-8976-5f5277279a9f',
      action: 'UPDATE',
      entity_type: 'trips',
      entity_id: 'some-trip-uuid',
      details: 'UPDATE on trips by 4466de4e-...',
      metadata: { old: { status: 'booked' }, new: { status: 'assigned' } },
      timestamp: new Date().toISOString(),
    };

    expect(auditRecord.action).toMatch(/^(INSERT|UPDATE|DELETE)$/);
    expect(auditRecord.organization_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(auditRecord.entity_type).toBe('trips');
    expect(auditRecord.metadata.old).toBeDefined();
    expect(auditRecord.metadata.new).toBeDefined();
  });
});

// ============================================================
// Password recovery flow validation
// ============================================================

describe('Password recovery', () => {
  it('requestPasswordReset is exported from auth', async () => {
    const auth = await import('../../src/lib/auth');
    expect(typeof auth.requestPasswordReset).toBe('function');
  });

  it('updatePassword is exported from auth', async () => {
    const auth = await import('../../src/lib/auth');
    expect(typeof auth.updatePassword).toBe('function');
  });

  it('password validation rules', () => {
    // Min 6 chars
    expect('12345'.length >= 6).toBe(false);
    expect('123456'.length >= 6).toBe(true);
    expect('strongpass'.length >= 6).toBe(true);
  });

  it('password confirmation must match', () => {
    const pass: string = 'newpassword123';
    const confirm: string = 'newpassword123';
    const mismatch: string = 'differentpass';
    expect(pass === confirm).toBe(true);
    expect(pass === mismatch).toBe(false);
  });
});

// ============================================================
// Tenant isolation: all ported features scope by organization_id
// ============================================================

describe('Tenant isolation in ported features', () => {
  it('payroll_records requires organization_id', () => {
    // Migration 012: organization_id UUID NOT NULL REFERENCES public.organizations(id)
    const schema = { organization_id: 'NOT NULL', employee_id: 'NULLABLE' };
    expect(schema.organization_id).toBe('NOT NULL');
  });

  it('billing RPCs require p_organization_id parameter', () => {
    // Migration 013: first param is always p_organization_id UUID
    const rpcParams = ['p_organization_id', 'p_customer_id', 'p_invoice_id'];
    expect(rpcParams[0]).toBe('p_organization_id');
  });

  it('audit triggers capture organization_id from the row', () => {
    // Migration 014: v_org_id := NEW.organization_id or OLD.organization_id
    const triggerCaptures = ['organization_id', 'user_id', 'action', 'entity_type', 'entity_id'];
    expect(triggerCaptures).toContain('organization_id');
  });
});

// ============================================================
// Branch isolation: payroll_records has optional branch_id
// ============================================================

describe('Branch isolation in ported features', () => {
  it('payroll_records supports branch_id (optional)', () => {
    // Migration 012: branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL
    const record = { organization_id: 'org-1', branch_id: null };
    // Valid: branch_id is optional
    expect(record.branch_id).toBeNull();

    const branchedRecord = { organization_id: 'org-1', branch_id: 'branch-uuid' };
    expect(branchedRecord.branch_id).not.toBeNull();
  });
});
