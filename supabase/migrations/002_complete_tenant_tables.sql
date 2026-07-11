-- ============================================================
-- GARUD AI ERP — Phase 3 Extended: Complete Tenant Table Coverage
-- Creates ALL missing tenant-owned tables with organization_id
-- ============================================================

-- ============================================================
-- TABLES THAT EXIST IN APP BUT NOT IN DATABASE
-- These modules currently use useState with local seed data
-- They need proper Supabase tables with organization_id
-- ============================================================

-- Vendors / Suppliers
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('vehicle_owner','fuel_supplier','tyre_vendor','garage','broker','other')),
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
  total_paid NUMERIC DEFAULT 0,
  outstanding NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts / Rate Cards
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id TEXT,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  rate_type TEXT DEFAULT 'per_trip',
  rate NUMERIC DEFAULT 0,
  effective_from DATE,
  effective_to DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin TEXT,
  destination TEXT,
  distance_km NUMERIC DEFAULT 0,
  standard_hours NUMERIC DEFAULT 0,
  toll_points INTEGER DEFAULT 0,
  toll_cost NUMERIC DEFAULT 0,
  fuel_estimate NUMERIC DEFAULT 0,
  trips_completed INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indents / Orders
CREATE TABLE IF NOT EXISTS public.indents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indent_number TEXT,
  customer_id TEXT,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  material TEXT,
  weight_tons NUMERIC DEFAULT 0,
  vehicle_type TEXT,
  num_vehicles INTEGER DEFAULT 1,
  loading_date DATE,
  rate NUMERIC DEFAULT 0,
  allocated_vehicles JSONB DEFAULT '[]',
  trip_id TEXT,
  status TEXT DEFAULT 'pending',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Hire
CREATE TABLE IF NOT EXISTS public.market_hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_number TEXT,
  market_vehicle_reg TEXT,
  owner_name TEXT,
  owner_phone TEXT,
  hire_amount NUMERIC DEFAULT 0,
  advance_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  freight_charged NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Orders
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  work_order_number TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  type TEXT DEFAULT 'repair',
  description TEXT,
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Challans / Fines
CREATE TABLE IF NOT EXISTS public.challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  challan_number TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  driver_id TEXT,
  driver_name TEXT,
  offence TEXT,
  amount NUMERIC DEFAULT 0,
  date DATE,
  location TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  deducted_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofences
CREATE TABLE IF NOT EXISTS public.geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'circle',
  lat NUMERIC,
  lng NUMERIC,
  radius_meters INTEGER DEFAULT 500,
  alert_on TEXT DEFAULT 'both',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claims & Insurance
CREATE TABLE IF NOT EXISTS public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_number TEXT,
  type TEXT,
  trip_id TEXT,
  trip_number TEXT,
  customer_name TEXT,
  vehicle_reg TEXT,
  driver_name TEXT,
  incident_date DATE,
  location TEXT,
  description TEXT,
  claim_amount NUMERIC DEFAULT 0,
  approved_amount NUMERIC DEFAULT 0,
  liability TEXT,
  evidence JSONB DEFAULT '[]',
  status TEXT DEFAULT 'reported',
  filed_by TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals
CREATE TABLE IF NOT EXISTS public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  requested_by TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  entity_id TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfers (Inter-Branch)
CREATE TABLE IF NOT EXISTS public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  transfer_number TEXT,
  type TEXT DEFAULT 'vehicle',
  item_name TEXT,
  item_id TEXT,
  from_branch TEXT,
  from_branch_name TEXT,
  to_branch TEXT,
  to_branch_name TEXT,
  initiated_by TEXT,
  initiated_date DATE,
  received_date DATE,
  status TEXT DEFAULT 'initiated',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash Entries
CREATE TABLE IF NOT EXISTS public.cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE,
  voucher_number TEXT,
  particulars TEXT,
  type TEXT DEFAULT 'receipt' CHECK (type IN ('receipt', 'payment')),
  amount NUMERIC DEFAULT 0,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Entries
CREATE TABLE IF NOT EXISTS public.bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE,
  voucher_number TEXT,
  particulars TEXT,
  type TEXT DEFAULT 'receipt' CHECK (type IN ('receipt', 'payment')),
  amount NUMERIC DEFAULT 0,
  reference TEXT,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger Accounts
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "group" TEXT DEFAULT 'Assets',
  balance NUMERIC DEFAULT 0,
  balance_type TEXT DEFAULT 'Dr',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE,
  supplier_name TEXT,
  invoice_number TEXT,
  items TEXT,
  amount NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'cash',
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  date DATE,
  customer_name TEXT,
  invoice_number TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'credit',
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_code TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Spare Parts',
  qty INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'Units',
  rate NUMERIC DEFAULT 0,
  reorder_level INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id TEXT,
  employee_name TEXT,
  date DATE,
  status TEXT DEFAULT 'present',
  check_in TEXT,
  check_out TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_id TEXT,
  employee_name TEXT,
  leave_type TEXT DEFAULT 'casual',
  from_date DATE,
  to_date DATE,
  days INTEGER DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  applied_on DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPS Devices
CREATE TABLE IF NOT EXISTS public.gps_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  device_id TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  provider TEXT,
  api_endpoint TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENABLE RLS AND CREATE POLICIES FOR ALL NEW TABLES
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vendors','contracts','routes','indents','market_hires','work_orders',
    'challans','geofences','claims','approvals','transfers',
    'cash_entries','bank_entries','ledger_accounts','purchases','sales',
    'inventory','attendance','leave_requests','gps_devices'
  ])
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    -- SELECT
    EXECUTE format(
      'CREATE POLICY "org_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.is_organization_member(organization_id) OR public.is_platform_admin())',
      tbl
    );
    -- INSERT
    EXECUTE format(
      'CREATE POLICY "org_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_organization_member(organization_id))',
      tbl
    );
    -- UPDATE
    EXECUTE format(
      'CREATE POLICY "org_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_organization_member(organization_id)) WITH CHECK (public.is_organization_member(organization_id))',
      tbl
    );
    -- DELETE
    EXECUTE format(
      'CREATE POLICY "org_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated USING (public.is_organization_member(organization_id))',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- INDEXES FOR ALL NEW TABLES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_org ON routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_indents_org ON indents(organization_id);
CREATE INDEX IF NOT EXISTS idx_market_hires_org ON market_hires(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org ON work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_challans_org ON challans(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofences_org ON geofences(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_org ON claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_approvals_org ON approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_org ON transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_org ON cash_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_bank_entries_org ON bank_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_org ON ledger_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchases_org ON purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_org ON sales(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_gps_devices_org ON gps_devices(organization_id);

-- ============================================================
-- TABLE CLASSIFICATION DOCUMENTATION
-- ============================================================

-- ORGANIZATION-OWNED (require organization_id):
-- vehicles, drivers, customers, trips, enquiries, quotations,
-- invoices, payments, expenses, fuel_entries, maintenance_records,
-- tyres, activity_log, notifications, eway_bills, branches,
-- vendors, contracts, routes, indents, market_hires, work_orders,
-- challans, geofences, claims, approvals, transfers,
-- cash_entries, bank_entries, ledger_accounts, purchases, sales,
-- inventory, attendance, leave_requests, gps_devices
-- TOTAL: 36 org-owned tables

-- PLATFORM-OWNED (shared/system):
-- organizations, organization_members, organization_settings,
-- organization_invitations, user_profiles, platform_admins
-- TOTAL: 6 platform tables

-- GLOBAL REFERENCE (no org_id needed):
-- None currently (vehicle_types could be global in future)

-- ============================================================
-- DONE — Phase 3 Complete: All tables classified and created
-- ============================================================
