-- ============================================================
-- GARUD AI ERP — Migration 000: Prerequisite Base Business Tables
-- 
-- PURPOSE: Creates the 16 core business tables that migrations 001+
-- expect to already exist. Migration 001 does ALTER TABLE ... ADD COLUMN
-- organization_id on these tables, so they MUST exist first.
--
-- IDEMPOTENT: Uses CREATE TABLE IF NOT EXISTS throughout.
-- SAFE: Does not delete or overwrite existing data.
-- 
-- EXECUTION ORDER: This MUST run BEFORE 001_multi_tenant_foundation.sql
-- ============================================================

-- ============================================================
-- PRE-MIGRATION DIAGNOSTIC
-- Run this SELECT before executing to understand current state:
-- ============================================================
-- SELECT table_name, 
--        (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
-- FROM information_schema.tables t
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE 1: vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  reg_number TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'truck',
  make TEXT DEFAULT '',
  model TEXT DEFAULT '',
  year INTEGER DEFAULT 2020,
  ownership_type TEXT DEFAULT 'owned' CHECK (ownership_type IN ('owned', 'attached', 'market')),
  owner_name TEXT DEFAULT '',
  owner_phone TEXT,
  capacity_tons NUMERIC DEFAULT 0,
  fitness_expiry TEXT,
  insurance_expiry TEXT,
  puc_expiry TEXT,
  permit_expiry TEXT,
  driver_id TEXT,
  driver_name TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'maintenance', 'breakdown', 'inactive')),
  odometer NUMERIC DEFAULT 0,
  lat NUMERIC,
  lng NUMERIC,
  speed NUMERIC,
  last_location TEXT,
  last_gps_update TEXT,
  ignition BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: drivers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  license_number TEXT DEFAULT '',
  license_expiry TEXT,
  aadhar TEXT,
  address TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  emergency_phone TEXT DEFAULT '',
  date_of_joining TEXT,
  assigned_vehicle_id TEXT,
  assigned_vehicle_reg TEXT,
  salary_type TEXT DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'per_trip', 'per_km')),
  base_salary NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'on_trip', 'on_leave', 'inactive')),
  safety_score NUMERIC DEFAULT 100,
  total_trips INTEGER DEFAULT 0,
  total_km NUMERIC DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: customers
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  billing_address TEXT DEFAULT '',
  credit_limit NUMERIC DEFAULT 0,
  credit_days INTEGER DEFAULT 30,
  outstanding NUMERIC DEFAULT 0,
  total_business NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: trips
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  trip_number TEXT,
  lr_number TEXT,
  eway_bill TEXT,
  customer_id TEXT,
  customer_name TEXT DEFAULT '',
  vehicle_id TEXT,
  vehicle_reg TEXT DEFAULT '',
  driver_id TEXT,
  driver_name TEXT DEFAULT '',
  driver_phone TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  origin_lat NUMERIC,
  origin_lng NUMERIC,
  destination TEXT DEFAULT '',
  dest_lat NUMERIC,
  dest_lng NUMERIC,
  distance_km NUMERIC DEFAULT 0,
  material TEXT DEFAULT '',
  weight_tons NUMERIC DEFAULT 0,
  num_packages INTEGER,
  booking_date TEXT,
  loading_date TEXT,
  departure_date TEXT,
  expected_delivery TEXT,
  actual_delivery TEXT,
  freight_amount NUMERIC DEFAULT 0,
  advance_amount NUMERIC DEFAULT 0,
  balance_amount NUMERIC DEFAULT 0,
  detention_charges NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'booked' CHECK (status IN ('booked', 'assigned', 'loading', 'in_transit', 'reached', 'unloading', 'pod_pending', 'completed', 'billed', 'settled', 'cancelled')),
  pod_url TEXT,
  pod_date TEXT,
  pod_status TEXT,
  pod_received_by TEXT,
  pod_condition TEXT,
  pod_received_date TEXT,
  pod_remarks TEXT,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  quotation_id TEXT,
  enquiry_id TEXT,
  vehicle_type TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 5: enquiries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  customer_id TEXT,
  customer_name TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  destination TEXT DEFAULT '',
  material TEXT DEFAULT '',
  vehicle_type TEXT DEFAULT 'truck',
  weight_tons NUMERIC DEFAULT 0,
  loading_date TEXT,
  target_rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'quoted', 'confirmed', 'lost', 'converted', 'rejected', 'closed')),
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 6: quotations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  quotation_number TEXT,
  enquiry_id TEXT,
  customer_id TEXT,
  customer_name TEXT DEFAULT '',
  origin TEXT DEFAULT '',
  destination TEXT DEFAULT '',
  vehicle_type TEXT DEFAULT 'truck',
  material TEXT DEFAULT '',
  weight_tons NUMERIC DEFAULT 0,
  rate_type TEXT DEFAULT 'per_trip' CHECK (rate_type IN ('per_trip', 'per_ton', 'per_km')),
  rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  gst_percent NUMERIC DEFAULT 5,
  validity_days INTEGER DEFAULT 7,
  terms TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 7: invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  invoice_number TEXT,
  customer_id TEXT,
  customer_name TEXT DEFAULT '',
  invoice_date TEXT,
  due_date TEXT,
  trip_ids JSONB DEFAULT '[]'::jsonb,
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 8: payments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  invoice_id TEXT,
  customer_id TEXT,
  customer_name TEXT DEFAULT '',
  amount NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'bank_transfer' CHECK (payment_mode IN ('bank_transfer', 'cheque', 'cash', 'upi')),
  reference_number TEXT DEFAULT '',
  payment_date TEXT,
  tds_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'cleared', 'bounced')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 9: expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  trip_id TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT,
  category TEXT DEFAULT 'misc',
  amount NUMERIC DEFAULT 0,
  date TEXT,
  description TEXT DEFAULT '',
  paid_to TEXT DEFAULT '',
  payment_mode TEXT DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'bank', 'fuel_card', 'fastag', 'upi')),
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 10: fuel_entries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fuel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT DEFAULT '',
  driver_id TEXT,
  driver_name TEXT DEFAULT '',
  trip_id TEXT,
  date TEXT,
  litres NUMERIC DEFAULT 0,
  rate NUMERIC DEFAULT 0,
  amount NUMERIC DEFAULT 0,
  odometer NUMERIC DEFAULT 0,
  station TEXT DEFAULT '',
  mileage NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 11: maintenance_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  vehicle_id TEXT,
  vehicle_reg TEXT DEFAULT '',
  type TEXT DEFAULT 'repair' CHECK (type IN ('preventive', 'repair', 'breakdown', 'tyre', 'inspection')),
  description TEXT DEFAULT '',
  date TEXT,
  odometer NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  vendor TEXT DEFAULT '',
  next_due_date TEXT,
  next_due_km NUMERIC,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 12: tyres
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tyres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  branch_id TEXT,
  serial_number TEXT,
  brand TEXT DEFAULT '',
  size TEXT DEFAULT '',
  type TEXT DEFAULT 'new',
  vehicle_id TEXT,
  vehicle_reg TEXT,
  position TEXT,
  odometer_fitted NUMERIC DEFAULT 0,
  current_odometer NUMERIC DEFAULT 0,
  condition TEXT DEFAULT 'good',
  retread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'fitted' CHECK (status IN ('fitted', 'spare', 'retreading', 'scrapped')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 13: activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  user_id TEXT,
  user_name TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  details TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 14: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  type TEXT DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  link_module TEXT,
  link_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 15: eway_bills
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eway_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  trip_id TEXT,
  trip_number TEXT,
  eway_number TEXT,
  generated_date TEXT,
  valid_until TEXT,
  distance_km NUMERIC DEFAULT 0,
  transporter_id TEXT,
  vehicle_reg TEXT,
  from_place TEXT,
  to_place TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 16: branches
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT,
  name TEXT NOT NULL,
  code TEXT,
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  address TEXT DEFAULT '',
  manager_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BASIC INDEXES FOR PERFORMANCE (before multi-tenant indexes)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_reg ON public.vehicles(reg_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON public.drivers(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_number ON public.trips(trip_number);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);

-- ============================================================
-- DONE — Migration 000 Complete
-- 
-- Created 16 base business tables:
-- vehicles, drivers, customers, trips, enquiries, quotations,
-- invoices, payments, expenses, fuel_entries, maintenance_records,
-- tyres, activity_log, notifications, eway_bills, branches
--
-- These tables are now ready for:
-- - Migration 001: Add organization_id columns + multi-tenant foundation
-- - Migration 002: Create additional 20 business tables
-- - Migration 003: RLS policies
-- - Migration 004: Storage policies
-- - Migration 005: Relational integrity triggers
-- - Migration 006: Audit log improvements + constraints
-- ============================================================
