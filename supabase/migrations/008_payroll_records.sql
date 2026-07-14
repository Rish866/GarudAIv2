-- ============================================================
-- GARUD AI ERP — Migration 008: Payroll Records
--
-- PURPOSE: Creates a proper payroll_records table to store finalized
-- monthly salary calculations. Once a month is "locked", the payroll
-- data is immutable and cannot be recalculated retroactively.
--
-- IDEMPOTENT: Uses CREATE TABLE IF NOT EXISTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id UUID,
  employee_name TEXT NOT NULL,
  employee_type TEXT DEFAULT 'driver' CHECK (employee_type IN ('driver', 'staff', 'manager')),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'per_trip', 'per_km')),
  base_salary NUMERIC DEFAULT 0,
  trip_count INTEGER DEFAULT 0,
  total_km NUMERIC DEFAULT 0,
  trip_allowance NUMERIC DEFAULT 0,
  overtime NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  incentives NUMERIC DEFAULT 0,
  gross_salary NUMERIC DEFAULT 0,
  advance_deduction NUMERIC DEFAULT 0,
  penalty_deduction NUMERIC DEFAULT 0,
  pf_deduction NUMERIC DEFAULT 0,
  esi_deduction NUMERIC DEFAULT 0,
  tds_deduction NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  total_deductions NUMERIC DEFAULT 0,
  net_payable NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'bank_transfer',
  payment_reference TEXT,
  payment_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processed', 'paid', 'cancelled')),
  locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: one record per employee per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_unique_employee_month
  ON public.payroll_records(organization_id, employee_id, month, year)
  WHERE status != 'cancelled';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_payroll_org ON public.payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON public.payroll_records(organization_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_records(organization_id, employee_id);

-- Enable RLS
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "payroll_select" ON public.payroll_records
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "payroll_insert" ON public.payroll_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner', 'admin', 'accountant', 'hr_manager'
    ])
  );

CREATE POLICY "payroll_update" ON public.payroll_records
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner', 'admin', 'accountant', 'hr_manager'
    ])
    AND locked = FALSE
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner', 'admin', 'accountant', 'hr_manager'
    ])
  );

-- Only owner/admin can delete payroll records, and only if not locked
CREATE POLICY "payroll_delete" ON public.payroll_records
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
    AND locked = FALSE
  );

-- ============================================================
-- DONE — Migration 008 Complete
-- Created payroll_records table with:
-- - Monthly salary breakdown per employee
-- - Lock mechanism (once locked, cannot be edited/deleted)
-- - Draft → Processed → Paid workflow
-- - Proper deductions (PF, ESI, TDS, advances, penalties)
-- - Unique constraint per employee per month
-- ============================================================
