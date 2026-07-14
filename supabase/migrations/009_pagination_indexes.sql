-- ============================================================
-- Migration 009: Pagination Performance Indexes
--
-- Adds composite indexes for common paginated queries:
-- (organization_id, sort_column) patterns and search columns.
-- IDEMPOTENT: Uses IF NOT EXISTS throughout.
-- ============================================================

-- ─── TRIPS ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trips_org_created
  ON public.trips(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_org_booking_date
  ON public.trips(organization_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_org_status_created
  ON public.trips(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_org_customer_name
  ON public.trips(organization_id, customer_name);
CREATE INDEX IF NOT EXISTS idx_trips_org_trip_number
  ON public.trips(organization_id, trip_number);

-- ─── INVOICES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invoices_org_created
  ON public.invoices(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_status_created
  ON public.invoices(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_org_invoice_number
  ON public.invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_org_due_date
  ON public.invoices(organization_id, due_date);

-- ─── PAYMENTS ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_org_created
  ON public.payments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_status
  ON public.payments(organization_id, status, created_at DESC);

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_org_created
  ON public.customers(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_org_name
  ON public.customers(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_org_status
  ON public.customers(organization_id, status);

-- ─── DRIVERS ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_drivers_org_created
  ON public.drivers(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drivers_org_name
  ON public.drivers(organization_id, name);
CREATE INDEX IF NOT EXISTS idx_drivers_org_phone
  ON public.drivers(organization_id, phone);

-- ─── VEHICLES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vehicles_org_created
  ON public.vehicles(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_reg_number
  ON public.vehicles(organization_id, reg_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_org_status_created
  ON public.vehicles(organization_id, status, created_at DESC);

-- ─── FUEL ENTRIES ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fuel_entries_org_created
  ON public.fuel_entries(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_org_date
  ON public.fuel_entries(organization_id, date DESC);

-- ─── MAINTENANCE RECORDS ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_maintenance_org_created
  ON public.maintenance_records(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_org_status
  ON public.maintenance_records(organization_id, status, created_at DESC);

-- ─── EXPENSES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_org_created
  ON public.expenses(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_org_date
  ON public.expenses(organization_id, date DESC);

-- ─── ENQUIRIES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_enquiries_org_created
  ON public.enquiries(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_org_status
  ON public.enquiries(organization_id, status, created_at DESC);

-- ─── ACTIVITY LOG ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activity_log_org_entity_created
  ON public.activity_log(organization_id, entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_org_action
  ON public.activity_log(organization_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_org_user
  ON public.activity_log(organization_id, user_id, created_at DESC);

-- ─── TRIP STATUS HISTORY ─────────────────────────────────────────────────────
-- (already has indexes from migration 008)

-- ============================================================
-- DONE — Pagination indexes complete
-- ============================================================
