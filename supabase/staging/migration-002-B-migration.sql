-- migration-002-B-migration.sql
-- Migration 002: 20 additional business tables (revised v2)
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- organization_id: NOT NULL UUID FK → organizations(id), NO ACTION on delete
-- Entity references: UUID FKs to existing tables where applicable
-- Financial: NOT NULL + CHECK >= 0 on all monetary columns
-- Identifiers: organization-scoped uniqueness where semantically required
-- Date constraints: logical ordering enforced
-- NO policies, NO grants (deny-by-default)
-- Immutable tables: UPDATE/DELETE never granted (enforced in Migration 013)

BEGIN;

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other'
    CHECK (type IN ('vehicle_owner','fuel_supplier','tyre_vendor','garage','broker','other')),
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  pan TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc TEXT,
  total_paid NUMERIC NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  outstanding NUMERIC NOT NULL DEFAULT 0, -- intentionally signed: negative = credit/overpayment
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  rate_type TEXT NOT NULL DEFAULT 'per_trip'
    CHECK (rate_type IN ('per_trip','per_ton','per_km')),
  rate NUMERIC NOT NULL DEFAULT 0 CHECK (rate >= 0),
  effective_from DATE,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','terminated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km NUMERIC NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  standard_hours NUMERIC DEFAULT 0 CHECK (standard_hours >= 0),
  toll_points INTEGER NOT NULL DEFAULT 0 CHECK (toll_points >= 0),
  toll_cost NUMERIC DEFAULT 0 CHECK (toll_cost >= 0),
  fuel_estimate NUMERIC DEFAULT 0 CHECK (fuel_estimate >= 0),
  trips_completed INTEGER NOT NULL DEFAULT 0 CHECK (trips_completed >= 0),
  total_revenue NUMERIC NOT NULL DEFAULT 0 CHECK (total_revenue >= 0),
  total_cost NUMERIC NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.indents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  indent_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  material TEXT,
  weight_tons NUMERIC DEFAULT 0 CHECK (weight_tons >= 0),
  vehicle_type TEXT,
  num_vehicles INTEGER NOT NULL DEFAULT 1 CHECK (num_vehicles >= 1),
  loading_date DATE NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0 CHECK (rate >= 0),
  allocated_vehicles JSONB NOT NULL DEFAULT '[]',
  trip_id UUID REFERENCES public.trips(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','allocated','confirmed','in_progress','completed','cancelled')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, indent_number)
);

CREATE TABLE IF NOT EXISTS public.market_hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  trip_number TEXT,
  market_vehicle_reg TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  hire_amount NUMERIC NOT NULL DEFAULT 0 CHECK (hire_amount >= 0),
  advance_paid NUMERIC NOT NULL DEFAULT 0 CHECK (advance_paid >= 0),
  balance_due NUMERIC NOT NULL DEFAULT 0, -- intentionally signed: negative = advance exceeds hire
  freight_charged NUMERIC NOT NULL DEFAULT 0 CHECK (freight_charged >= 0),
  commission NUMERIC NOT NULL DEFAULT 0 CHECK (commission >= 0),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','partial','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  work_order_number TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_reg TEXT,
  type TEXT NOT NULL DEFAULT 'repair'
    CHECK (type IN ('preventive','repair','breakdown','inspection','body_work')),
  description TEXT NOT NULL,
  assigned_to TEXT,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  estimated_cost NUMERIC NOT NULL DEFAULT 0 CHECK (estimated_cost >= 0),
  actual_cost NUMERIC CHECK (actual_cost >= 0),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','parts_waiting','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CHECK (completed_at IS NULL OR completed_at >= created_at),
  UNIQUE (organization_id, work_order_number)
);

CREATE TABLE IF NOT EXISTS public.challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  challan_number TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_reg TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  driver_name TEXT,
  offence TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL,
  location TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','disputed')),
  deducted_from TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, challan_number)
);

CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'depot'
    CHECK (type IN ('loading_point','unloading_point','depot','restricted','customer')),
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 500 CHECK (radius_meters > 0),
  alert_on TEXT NOT NULL DEFAULT 'both'
    CHECK (alert_on IN ('entry','exit','both')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  claim_number TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('shortage','damage','theft','accident','breakdown','delay_penalty')),
  trip_id UUID REFERENCES public.trips(id),
  trip_number TEXT,
  customer_name TEXT,
  vehicle_reg TEXT,
  driver_name TEXT,
  incident_date DATE NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  claim_amount NUMERIC NOT NULL CHECK (claim_amount >= 0),
  approved_amount NUMERIC NOT NULL DEFAULT 0 CHECK (approved_amount >= 0),
  liability TEXT CHECK (liability IN ('company','driver','customer','insurer','vendor')),
  evidence JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'reported'
    CHECK (status IN ('reported','under_investigation','evidence_collected','claim_filed','approved','settled','rejected')),
  filed_by TEXT NOT NULL,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, claim_number)
);

CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  type TEXT NOT NULL
    CHECK (type IN ('expense','rate_change','credit_limit','payment','trip_cancellation')),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  entity_id TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  transfer_number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'vehicle'
    CHECK (type IN ('vehicle','driver','inventory')),
  item_name TEXT NOT NULL,
  item_id UUID,
  from_branch UUID REFERENCES public.branches(id),
  from_branch_name TEXT,
  to_branch UUID REFERENCES public.branches(id),
  to_branch_name TEXT,
  initiated_by TEXT NOT NULL,
  initiated_date DATE NOT NULL,
  received_date DATE,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','in_transit','received','cancelled')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (received_date IS NULL OR received_date >= initiated_date),
  UNIQUE (organization_id, transfer_number)
);

CREATE TABLE IF NOT EXISTS public.cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  date DATE NOT NULL,
  voucher_number TEXT NOT NULL,
  particulars TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receipt','payment')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  narration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, voucher_number)
);

CREATE TABLE IF NOT EXISTS public.bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  date DATE NOT NULL,
  voucher_number TEXT NOT NULL,
  particulars TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receipt','payment')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  reference TEXT,
  narration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, voucher_number)
);

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  "group" TEXT NOT NULL DEFAULT 'Assets'
    CHECK ("group" IN ('Assets','Liabilities','Income','Expense')),
  balance NUMERIC NOT NULL DEFAULT 0, -- intentionally signed: debit/credit accounting
  balance_type TEXT NOT NULL DEFAULT 'Dr' CHECK (balance_type IN ('Dr','Cr')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  invoice_number TEXT,
  items TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  type TEXT NOT NULL DEFAULT 'cash' CHECK (type IN ('cash','credit','bank')),
  narration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  date DATE NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_number TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  type TEXT NOT NULL DEFAULT 'credit' CHECK (type IN ('cash','credit','bank')),
  narration TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  item_code TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Spare Parts',
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  unit TEXT NOT NULL DEFAULT 'Units',
  rate NUMERIC NOT NULL DEFAULT 0 CHECK (rate >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  employee_id UUID REFERENCES public.drivers(id),
  employee_name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present','absent','half_day','on_leave','on_trip')),
  check_in TEXT,
  check_out TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  employee_id UUID REFERENCES public.drivers(id),
  employee_name TEXT NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'casual'
    CHECK (leave_type IN ('casual','sick','earned','unpaid')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 1 CHECK (days >= 1),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  applied_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (to_date >= from_date)
);

CREATE TABLE IF NOT EXISTS public.gps_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  device_id TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  vehicle_reg TEXT,
  provider TEXT NOT NULL,
  api_endpoint TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, device_id)
);

-- RLS deny-by-default
DO $x$ DECLARE tbl TEXT; BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vendors','contracts','routes','indents','market_hires',
    'work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts',
    'purchases','sales','inventory','attendance','leave_requests',
    'gps_devices'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $x$;

-- Revoke default privileges
DO $x$ DECLARE tbl TEXT; BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vendors','contracts','routes','indents','market_hires',
    'work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts',
    'purchases','sales','inventory','attendance','leave_requests',
    'gps_devices'
  ]) LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', tbl);
  END LOOP;
END $x$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendors_org ON public.vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org ON public.contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_org ON public.routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_indents_org ON public.indents(organization_id);
CREATE INDEX IF NOT EXISTS idx_market_hires_org ON public.market_hires(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_challans_org ON public.challans(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofences_org ON public.geofences(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_org ON public.claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_approvals_org ON public.approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_org ON public.transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_org ON public.cash_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_entries_org ON public.bank_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_org ON public.ledger_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchases_org ON public.purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_org ON public.sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON public.inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON public.attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON public.leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_gps_devices_org ON public.gps_devices(organization_id);

COMMIT;
