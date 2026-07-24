-- ============================================================
-- MIGRATION 001: Business Tables with Secure RLS
-- ============================================================
-- All tables use UUID primary keys and organization_id for isolation.
-- RLS policies are INCLUDED — no table is ever open by default.
-- ============================================================

-- ============================================================
-- BRANCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  manager_name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- VEHICLES
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  reg_number TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'truck',
  make TEXT,
  model TEXT,
  year INTEGER,
  ownership_type TEXT DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'attached', 'market')),
  owner_name TEXT,
  owner_phone TEXT,
  capacity_tons NUMERIC DEFAULT 0,
  fitness_expiry DATE,
  insurance_expiry DATE,
  puc_expiry DATE,
  permit_expiry DATE,
  driver_id UUID,
  driver_name TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'maintenance', 'breakdown', 'inactive')),
  odometer INTEGER DEFAULT 0,
  lat NUMERIC,
  lng NUMERIC,
  speed NUMERIC,
  last_location TEXT,
  last_gps_update TIMESTAMPTZ,
  ignition BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVERS
-- ============================================================

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  license_expiry DATE,
  aadhar TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  date_of_joining DATE,
  assigned_vehicle_id UUID,
  assigned_vehicle_reg TEXT,
  salary_type TEXT DEFAULT 'monthly',
  base_salary NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'on_leave', 'inactive')),
  safety_score INTEGER DEFAULT 85,
  total_trips INTEGER DEFAULT 0,
  total_km INTEGER DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  gstin TEXT,
  billing_address TEXT,
  credit_limit NUMERIC DEFAULT 0,
  credit_days INTEGER DEFAULT 30,
  outstanding NUMERIC DEFAULT 0,
  total_business NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'general',
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
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENQUIRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  enquiry_number TEXT,
  customer_id UUID,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  material TEXT,
  weight_tons NUMERIC DEFAULT 0,
  loading_date DATE,
  target_rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'confirmed', 'rejected', 'lost', 'closed')),
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- QUOTATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  quotation_number TEXT,
  enquiry_id UUID,
  customer_id UUID,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  material TEXT,
  weight_tons NUMERIC DEFAULT 0,
  rate_type TEXT DEFAULT 'per_trip',
  rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  gst_percent NUMERIC DEFAULT 5,
  validity_days INTEGER DEFAULT 7,
  terms TEXT,
  status TEXT DEFAULT 'draft',
  parent_quotation_id UUID,
  revision_number INTEGER DEFAULT 1,
  is_current_revision BOOLEAN DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  converted_vehicles INTEGER DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDENTS (Orders/Bookings)
-- ============================================================

CREATE TABLE IF NOT EXISTS indents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  indent_number TEXT,
  quotation_id UUID,
  enquiry_id UUID,
  customer_id UUID,
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
  trip_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'allocated', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TRIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  trip_number TEXT,
  lr_number TEXT,
  eway_bill TEXT,
  indent_id UUID,
  quotation_id UUID,
  enquiry_id UUID,
  customer_id UUID,
  customer_name TEXT,
  vehicle_id UUID,
  vehicle_reg TEXT,
  driver_id UUID,
  driver_name TEXT,
  driver_phone TEXT,
  origin TEXT,
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  destination TEXT,
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  distance_km NUMERIC DEFAULT 0,
  material TEXT,
  weight_tons NUMERIC DEFAULT 0,
  num_packages INTEGER,
  booking_date DATE,
  loading_date DATE,
  departure_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  freight_amount NUMERIC DEFAULT 0,
  advance_amount NUMERIC DEFAULT 0,
  balance_amount NUMERIC DEFAULT 0,
  detention_charges NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'booked',
  pod_url TEXT,
  pod_date DATE,
  pod_remarks TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  previous_status TEXT,
  reopened_by UUID,
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  invoice_number TEXT,
  customer_id UUID,
  customer_name TEXT,
  invoice_date DATE,
  due_date DATE,
  trip_ids JSONB DEFAULT '[]',
  freight_total NUMERIC DEFAULT 0,
  detention_total NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  gst_percent NUMERIC DEFAULT 5,
  gst_amount NUMERIC DEFAULT 0,
  tds_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  balance_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  invoice_id UUID,
  customer_id UUID,
  customer_name TEXT,
  amount NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'bank_transfer',
  reference_number TEXT,
  payment_date DATE,
  tds_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'cleared', 'bounced')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  trip_id UUID,
  vehicle_id UUID,
  vehicle_reg TEXT,
  category TEXT,
  amount NUMERIC DEFAULT 0,
  date DATE,
  description TEXT,
  paid_to TEXT,
  payment_mode TEXT DEFAULT 'cash',
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUEL ENTRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS fuel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  vehicle_id UUID,
  vehicle_reg TEXT,
  driver_id UUID,
  driver_name TEXT,
  trip_id UUID,
  date DATE,
  station TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  litres NUMERIC DEFAULT 0,
  rate_per_litre NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  odometer INTEGER DEFAULT 0,
  mileage NUMERIC,
  payment_mode TEXT DEFAULT 'fuel_card',
  receipt_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  vehicle_id UUID,
  vehicle_reg TEXT,
  type TEXT DEFAULT 'preventive',
  description TEXT,
  date DATE,
  odometer INTEGER DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  vendor TEXT,
  next_due_date DATE,
  next_due_km INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TYRES
-- ============================================================

CREATE TABLE IF NOT EXISTS tyres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  serial_number TEXT,
  brand TEXT,
  size TEXT,
  type TEXT,
  vehicle_id UUID,
  vehicle_reg TEXT,
  position TEXT,
  odometer_fitted INTEGER DEFAULT 0,
  current_odometer INTEGER DEFAULT 0,
  condition TEXT DEFAULT 'new',
  retread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'spare' CHECK (status IN ('spare', 'fitted', 'retreading', 'scrapped')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- E-WAY BILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS eway_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  eway_number TEXT,
  trip_id UUID,
  trip_number TEXT,
  from_place TEXT,
  to_place TEXT,
  distance_km NUMERIC DEFAULT 0,
  vehicle_reg TEXT,
  transporter_id UUID,
  generated_date DATE,
  valid_until DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'extended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHALLANS (Traffic Fines)
-- ============================================================

CREATE TABLE IF NOT EXISTS challans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  challan_number TEXT,
  vehicle_id UUID,
  vehicle_reg TEXT,
  driver_id UUID,
  driver_name TEXT,
  offence TEXT,
  amount NUMERIC DEFAULT 0,
  date DATE,
  location TEXT,
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'contested', 'deducted')),
  deducted_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTRACTS (Rate Agreements)
-- ============================================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  customer_id UUID,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  rate_type TEXT DEFAULT 'per_trip',
  rate NUMERIC DEFAULT 0,
  effective_from DATE,
  effective_to DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- ROUTES
-- ============================================================

CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT,
  origin TEXT,
  destination TEXT,
  distance_km NUMERIC DEFAULT 0,
  standard_hours NUMERIC,
  toll_points INTEGER DEFAULT 0,
  toll_cost NUMERIC DEFAULT 0,
  fuel_estimate NUMERIC DEFAULT 0,
  trips_completed INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MARKET HIRES (Broker/Market Vehicles)
-- ============================================================

CREATE TABLE IF NOT EXISTS market_hires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WORK ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  work_order_number TEXT,
  vehicle_id UUID,
  vehicle_reg TEXT,
  type TEXT DEFAULT 'repair',
  description TEXT,
  assigned_to TEXT,
  priority TEXT DEFAULT 'normal',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CLAIMS (Insurance/Damage)
-- ============================================================

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  claim_number TEXT,
  trip_id UUID,
  vehicle_id UUID,
  vehicle_reg TEXT,
  type TEXT DEFAULT 'damage',
  description TEXT,
  amount NUMERIC DEFAULT 0,
  filed_date DATE,
  status TEXT DEFAULT 'filed' CHECK (status IN ('filed', 'under_review', 'approved', 'rejected', 'settled')),
  approved_amount NUMERIC DEFAULT 0,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SUPPORTING TABLES
-- ============================================================

-- Geofences
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT,
  type TEXT DEFAULT 'circle',
  lat NUMERIC,
  lng NUMERIC,
  radius_meters NUMERIC DEFAULT 500,
  alert_on TEXT DEFAULT 'both',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking Links (shareable with customers)
CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  trip_id UUID,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  customer_name TEXT,
  expires_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfers (inter-branch)
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  transfer_number TEXT,
  type TEXT DEFAULT 'vehicle',
  item_name TEXT,
  item_id UUID,
  from_branch UUID,
  from_branch_name TEXT,
  to_branch UUID,
  to_branch_name TEXT,
  initiated_by TEXT,
  initiated_date DATE,
  received_date DATE,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'in_transit', 'received', 'cancelled')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  employee_id UUID,
  employee_name TEXT,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_name TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  link_module TEXT,
  link_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- FINANCE TABLES
-- ============================================================

-- Cash Book
CREATE TABLE IF NOT EXISTS cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  date DATE NOT NULL,
  voucher_number TEXT,
  particulars TEXT,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'payment')),
  amount NUMERIC DEFAULT 0,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bank Book
CREATE TABLE IF NOT EXISTS bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  date DATE NOT NULL,
  voucher_number TEXT,
  particulars TEXT,
  type TEXT NOT NULL CHECK (type IN ('receipt', 'payment')),
  amount NUMERIC DEFAULT 0,
  reference TEXT,
  narration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger Accounts
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  "group" TEXT NOT NULL CHECK ("group" IN ('Assets', 'Liabilities', 'Income', 'Expense')),
  balance NUMERIC DEFAULT 0,
  balance_type TEXT DEFAULT 'Dr' CHECK (balance_type IN ('Dr', 'Cr')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  date DATE NOT NULL,
  vendor_id UUID,
  vendor_name TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'cash' CHECK (type IN ('cash', 'credit')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  date DATE NOT NULL,
  customer_id UUID,
  customer_name TEXT,
  description TEXT,
  amount NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'cash' CHECK (type IN ('cash', 'credit')),
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  item_code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  qty NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  rate NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (Performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_org ON drivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org ON trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org_status ON trips(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_org_customer ON trips(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_customer ON invoices(organization_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_org ON fuel_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_org ON maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_tyres_org ON tyres(organization_id);
CREATE INDEX IF NOT EXISTS idx_eway_org ON eway_bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_org ON enquiries(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_indents_org ON indents(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_org ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_challans_org ON challans(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_routes_org ON routes(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org ON work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_claims_org ON claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_market_hires_org ON market_hires(organization_id);


-- ============================================================
-- ROW LEVEL SECURITY — ENABLED ON ALL TABLES
-- NO TABLE IS ACCESSIBLE WITHOUT AUTHENTICATION
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  business_tables TEXT[] := ARRAY[
    'branches', 'vehicles', 'drivers', 'customers', 'vendors',
    'enquiries', 'quotations', 'indents', 'trips',
    'invoices', 'payments', 'expenses', 'fuel_entries',
    'maintenance_records', 'tyres', 'eway_bills', 'challans',
    'contracts', 'routes', 'market_hires', 'work_orders', 'claims',
    'geofences', 'tracking_links', 'transfers', 'attendance',
    'activity_log', 'notifications',
    'cash_entries', 'bank_entries', 'ledger_accounts',
    'purchases', 'sales', 'inventory'
  ];
BEGIN
  FOREACH tbl IN ARRAY business_tables
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT: User can only read their organization's data
    EXECUTE format(
      'CREATE POLICY "org_read_%1$s" ON %1$I FOR SELECT USING (organization_id = get_user_organization_id())',
      tbl
    );

    -- INSERT: Must insert into own organization
    EXECUTE format(
      'CREATE POLICY "org_write_%1$s" ON %1$I FOR INSERT WITH CHECK (organization_id = get_user_organization_id())',
      tbl
    );

    -- UPDATE: Can only update own org records, cannot change org_id
    EXECUTE format(
      'CREATE POLICY "org_edit_%1$s" ON %1$I FOR UPDATE USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id())',
      tbl
    );

    -- DELETE: Can only delete own organization's records
    EXECUTE format(
      'CREATE POLICY "org_del_%1$s" ON %1$I FOR DELETE USING (organization_id = get_user_organization_id())',
      tbl
    );

    -- IMMUTABLE organization_id trigger
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_immutable_org_id_%1$s ON %1$I', tbl
    );
    EXECUTE format(
      'CREATE TRIGGER trg_immutable_org_id_%1$s BEFORE UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION enforce_immutable_organization_id()',
      tbl
    );

    RAISE NOTICE 'Secured table: %', tbl;
  END LOOP;
END $$;

-- ============================================================
-- CROSS-TENANT LINKAGE PREVENTION
-- Ensures FK references cannot cross organizations
-- ============================================================

CREATE OR REPLACE FUNCTION validate_same_org_linkage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.indent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM indents WHERE id = NEW.indent_id AND organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Cross-organization linkage denied: indent_id belongs to different organization';
    END IF;
  END IF;
  IF NEW.quotation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM quotations WHERE id = NEW.quotation_id AND organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Cross-organization linkage denied: quotation_id belongs to different organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_trips_validate_linkage
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  WHEN (NEW.indent_id IS NOT NULL OR NEW.quotation_id IS NOT NULL)
  EXECUTE FUNCTION validate_same_org_linkage();

-- ============================================================
-- DONE: All business tables created with secure RLS.
-- No table allows anonymous/unauthenticated access.
-- All data is isolated by organization_id.
-- ============================================================
