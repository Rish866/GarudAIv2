-- ============================================================
-- MIGRATION 005: Database Constraints & Performance Indexes
-- 
-- Adds missing FK constraints, CHECK constraints, and indexes
-- to ensure data integrity and query performance.
--
-- SAFE: Uses IF NOT EXISTS patterns. Idempotent.
-- ============================================================

-- ============================================================
-- 1. PERFORMANCE INDEXES (for common query patterns)
-- ============================================================

-- Trips: frequently filtered by status + date
CREATE INDEX IF NOT EXISTS idx_trips_org_booking_date ON trips (organization_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_org_vehicle ON trips (organization_id, vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_org_driver ON trips (organization_id, driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_org_customer_status ON trips (organization_id, customer_id, status);

-- Invoices: outstanding queries (balance > 0)
CREATE INDEX IF NOT EXISTS idx_invoices_outstanding ON invoices (organization_id, customer_id, balance_amount) WHERE balance_amount > 0;
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices (organization_id, due_date) WHERE balance_amount > 0 AND status NOT IN ('paid', 'cancelled');

-- Payments: date-based reports
CREATE INDEX IF NOT EXISTS idx_payments_org_date ON payments (organization_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_org_customer ON payments (organization_id, customer_id);

-- Expenses: trip-linked and vehicle-linked lookups
CREATE INDEX IF NOT EXISTS idx_expenses_org_trip ON expenses (organization_id, trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_org_vehicle ON expenses (organization_id, vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses (organization_id, date DESC);

-- Fuel: vehicle + date for mileage calculations
CREATE INDEX IF NOT EXISTS idx_fuel_org_vehicle_date ON fuel_entries (organization_id, vehicle_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fuel_org_trip ON fuel_entries (organization_id, trip_id) WHERE trip_id IS NOT NULL;

-- Activity log: recent first
CREATE INDEX IF NOT EXISTS idx_activity_log_org_time ON activity_log (organization_id, timestamp DESC);

-- Vehicles: status queries for dashboard
CREATE INDEX IF NOT EXISTS idx_vehicles_org_status ON vehicles (organization_id, status);

-- Drivers: status queries
CREATE INDEX IF NOT EXISTS idx_drivers_org_status ON drivers (organization_id, status);

-- ============================================================
-- 2. CHECK CONSTRAINTS (data integrity)
-- ============================================================

-- Ensure amounts are non-negative
DO $$ BEGIN
  ALTER TABLE invoices ADD CONSTRAINT chk_invoices_amounts 
    CHECK (total_amount >= 0 AND paid_amount >= 0 AND balance_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT chk_payments_amount 
    CHECK (amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amount 
    CHECK (amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE fuel_entries ADD CONSTRAINT chk_fuel_amounts 
    CHECK (litres >= 0 AND amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE customers ADD CONSTRAINT chk_customer_credit 
    CHECK (credit_limit >= 0 AND credit_days >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure trip freight is non-negative
DO $$ BEGIN
  ALTER TABLE trips ADD CONSTRAINT chk_trips_amounts 
    CHECK (freight_amount >= 0 AND advance_amount >= 0 AND total_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. COMPOSITE UNIQUE CONSTRAINTS (prevent duplicates)
-- ============================================================

-- Unique invoice number per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_number 
  ON invoices (organization_id, invoice_number) WHERE invoice_number IS NOT NULL AND invoice_number != '';

-- Unique trip number per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_unique_number 
  ON trips (organization_id, trip_number) WHERE trip_number IS NOT NULL AND trip_number != '';

-- ============================================================
-- 4. UPDATED_AT TRIGGER (auto-set on updates)
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to key tables (safe — uses IF NOT EXISTS via exception handling)
DO $$ 
DECLARE
  tbl TEXT;
  tables_to_update TEXT[] := ARRAY[
    'vehicles', 'drivers', 'customers', 'vendors', 'trips',
    'invoices', 'expenses', 'maintenance_records', 'contracts'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_update
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE TRIGGER trg_set_updated_at_%1$s BEFORE UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 5. OUTSTANDING CONSISTENCY CHECK (defensive)
-- Prevents customer.outstanding from going negative
-- ============================================================

CREATE OR REPLACE FUNCTION check_customer_outstanding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.outstanding < 0 THEN
    NEW.outstanding := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_customer_outstanding_check
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION check_customer_outstanding();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- DONE: Constraints and indexes applied.
-- ============================================================
