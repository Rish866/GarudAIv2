-- ============================================================
-- DEPRECATED — DO NOT USE FOR NEW DEPLOYMENTS
-- ============================================================
-- This file is the ORIGINAL legacy schema with INSECURE open policies.
-- It uses tenant_id (TEXT) instead of organization_id (UUID).
-- Its RLS policies allow ALL authenticated users to access ALL data.
--
-- For new deployments, use:
--   supabase/schema.sql (platform tables)
--   supabase/migrations/001-business-tables.sql (business tables + secure RLS)
--   supabase/migrations/002-workflow-tables.sql (LR, POD, settlements)
--   supabase/storage-policies.sql (file access isolation)
--
-- This file is kept ONLY for reference and existing deployment migration.
-- ============================================================

-- GARUD AI TRANSPORT ERP — Full Supabase Schema (Fixed)
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- 
-- NOTE: This script does NOT recreate tenants/users/vehicles/events
-- tables if they already exist. It only creates the NEW tables.
-- All tenant_id columns are TEXT to match your existing setup.
-- Foreign key constraints to tenants are REMOVED to avoid type conflicts.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BRANCHES
-- ============================================================

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  city TEXT,
  state TEXT,
  address TEXT,
  manager_name TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVERS
-- ============================================================

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  license_expiry DATE,
  aadhar TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  date_of_joining DATE,
  assigned_vehicle_id TEXT,
  assigned_vehicle_reg TEXT,
  salary_type TEXT DEFAULT 'monthly',
  base_salary NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available',
  safety_score INTEGER DEFAULT 85,
  total_trips INTEGER DEFAULT 0,
  total_km INTEGER DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CUSTOMERS
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
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
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIPS
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  trip_number TEXT,
  lr_number TEXT,
  eway_bill TEXT,
  customer_id TEXT,
  customer_name TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  driver_id TEXT,
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
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENQUIRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  enquiry_number TEXT,
  customer_id TEXT,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  material TEXT,
  weight_tons NUMERIC DEFAULT 0,
  target_rate NUMERIC DEFAULT 0,
  expected_date DATE,
  status TEXT DEFAULT 'new',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUOTATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  quotation_number TEXT,
  enquiry_id TEXT,
  customer_id TEXT,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  invoice_number TEXT,
  customer_id TEXT,
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
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  invoice_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  amount NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'bank_transfer',
  reference_number TEXT,
  payment_date DATE,
  tds_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  trip_id TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  category TEXT,
  amount NUMERIC DEFAULT 0,
  date DATE,
  description TEXT,
  paid_to TEXT,
  payment_mode TEXT DEFAULT 'cash',
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FUEL ENTRIES
-- ============================================================

CREATE TABLE IF NOT EXISTS fuel_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  driver_name TEXT,
  date DATE,
  station TEXT,
  fuel_type TEXT DEFAULT 'diesel',
  litres NUMERIC DEFAULT 0,
  rate_per_litre NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  odometer INTEGER DEFAULT 0,
  payment_mode TEXT DEFAULT 'fuel_card',
  receipt_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MAINTENANCE RECORDS
-- ============================================================

CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  branch_id TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  type TEXT DEFAULT 'preventive',
  description TEXT,
  date DATE,
  odometer INTEGER DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  vendor TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TYRES
-- ============================================================

CREATE TABLE IF NOT EXISTS tyres (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  serial_number TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  position TEXT,
  make TEXT,
  km_run INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  retread_count INTEGER DEFAULT 0,
  purchase_date DATE,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOG (Audit Trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_name TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT,
  title TEXT,
  message TEXT,
  link_module TEXT,
  link_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- E-WAY BILLS
-- ============================================================

CREATE TABLE IF NOT EXISTS eway_bills (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  ewb_number TEXT,
  trip_id TEXT,
  trip_number TEXT,
  lr_number TEXT,
  customer_name TEXT,
  origin TEXT,
  destination TEXT,
  distance_km NUMERIC DEFAULT 0,
  vehicle_reg TEXT,
  transporter_id TEXT,
  hsn_code TEXT,
  goods_description TEXT,
  goods_value NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  sgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  generated_date DATE,
  valid_until DATE,
  status TEXT DEFAULT 'active',
  part_b_updated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (for performance)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_tenant ON trips(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fuel_tenant ON fuel_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON maintenance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eway_tenant ON eway_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tyres_tenant ON tyres(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_tenant ON enquiries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);

-- ============================================================
-- ENABLE RLS (Row Level Security) on all new tables
-- ============================================================

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tyres ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE eway_bills ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — Allow anon key full access (for demo/MVP)
-- In production, restrict by tenant_id using JWT claims
-- ============================================================

CREATE POLICY "anon_full_access" ON branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON enquiries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON fuel_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON maintenance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON tyres FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_full_access" ON eway_bills FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DONE! All tables created successfully.
-- Your Garud AI ERP is now fully backed by Supabase.
-- ============================================================
