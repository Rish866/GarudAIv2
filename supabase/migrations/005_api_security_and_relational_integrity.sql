-- ============================================================
-- GARUD AI ERP — Phase 14+15: API Security & Relational Integrity
--
-- Phase 14: Service role security (audit + documentation)
-- Phase 15: Cross-organization reference prevention
-- ============================================================

-- ============================================================
-- PHASE 14: API & SERVICE ROLE SECURITY
-- ============================================================

-- AUDIT RESULT:
-- ✅ No service role key in frontend code
-- ✅ Only anon key used (VITE_SUPABASE_ANON_KEY)
-- ✅ All client queries go through RLS (anon key respects RLS)
-- ✅ No Edge Functions exist (pure frontend app)
-- ✅ No server-side API routes (Vercel serves static frontend only)
-- ✅ create_organization_for_user() uses SECURITY DEFINER (safe)
-- ✅ is_organization_member() uses SECURITY DEFINER (safe)
--
-- RULES FOR FUTURE DEVELOPMENT:
-- 1. NEVER add SUPABASE_SERVICE_ROLE_KEY to .env or any VITE_ variable
-- 2. If Edge Functions are added, they MUST:
--    a. Verify auth token: supabase.auth.getUser(token)
--    b. Resolve membership: query organization_members
--    c. Check role: verify allowed_roles
--    d. Scope queries: always include organization_id
--    e. Log actions: insert into activity_log
-- 3. Service role key may ONLY exist in Supabase Edge Functions (server-side)
-- 4. Background jobs (if added) must use service role + explicit org scoping

-- Create an audit function for privileged operations
CREATE OR REPLACE FUNCTION public.log_privileged_action(
  action_type TEXT,
  action_description TEXT,
  target_organization_id UUID DEFAULT NULL,
  target_entity_type TEXT DEFAULT NULL,
  target_entity_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.activity_log (
    organization_id,
    user_name,
    action,
    entity_type,
    entity_id,
    details,
    timestamp
  ) VALUES (
    COALESCE(target_organization_id, (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active' LIMIT 1
    )),
    COALESCE(
      (SELECT full_name FROM public.user_profiles WHERE id = auth.uid()),
      auth.uid()::text
    ),
    action_type,
    COALESCE(target_entity_type, 'system'),
    COALESCE(target_entity_id, ''),
    action_description,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- PHASE 15: RELATIONAL TENANT INTEGRITY
-- 
-- Prevent cross-organization foreign-key references.
-- Example: Org A's trip cannot reference Org B's vehicle.
-- ============================================================

-- ============================================================
-- STEP 1: Add composite unique constraints
-- These enable composite foreign keys
-- ============================================================

-- Vehicles: unique on (organization_id, id)
ALTER TABLE public.vehicles 
  ADD CONSTRAINT vehicles_org_id_unique UNIQUE (organization_id, id);

-- Drivers: unique on (organization_id, id)
ALTER TABLE public.drivers 
  ADD CONSTRAINT drivers_org_id_unique UNIQUE (organization_id, id);

-- Customers: unique on (organization_id, id)
ALTER TABLE public.customers 
  ADD CONSTRAINT customers_org_id_unique UNIQUE (organization_id, id);

-- Trips: unique on (organization_id, id)
ALTER TABLE public.trips 
  ADD CONSTRAINT trips_org_id_unique UNIQUE (organization_id, id);

-- Invoices: unique on (organization_id, id)
ALTER TABLE public.invoices 
  ADD CONSTRAINT invoices_org_id_unique UNIQUE (organization_id, id);

-- Branches: unique on (organization_id, id)
ALTER TABLE public.branches 
  ADD CONSTRAINT branches_org_id_unique UNIQUE (organization_id, id);

-- ============================================================
-- STEP 2: Validation trigger to prevent cross-org references
-- This trigger fires on INSERT/UPDATE for tables with FK relationships
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_same_organization()
RETURNS TRIGGER AS $$
DECLARE
  trip_org UUID;
  vehicle_org UUID;
  driver_org UUID;
  customer_org UUID;
BEGIN
  -- For TRIPS: validate vehicle and driver belong to same org
  IF TG_TABLE_NAME = 'trips' THEN
    -- Check vehicle belongs to same org (if vehicle_id is set)
    IF NEW.vehicle_id IS NOT NULL AND NEW.vehicle_id != '' THEN
      SELECT organization_id INTO vehicle_org 
      FROM public.vehicles WHERE id = NEW.vehicle_id::text;
      IF vehicle_org IS NOT NULL AND vehicle_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Vehicle does not belong to this organization';
      END IF;
    END IF;
    
    -- Check driver belongs to same org (if driver_id is set)
    IF NEW.driver_id IS NOT NULL AND NEW.driver_id != '' THEN
      SELECT organization_id INTO driver_org 
      FROM public.drivers WHERE id = NEW.driver_id::text;
      IF driver_org IS NOT NULL AND driver_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Driver does not belong to this organization';
      END IF;
    END IF;
    
    -- Check customer belongs to same org (if customer_id is set)
    IF NEW.customer_id IS NOT NULL AND NEW.customer_id != '' THEN
      SELECT organization_id INTO customer_org 
      FROM public.customers WHERE id = NEW.customer_id::text;
      IF customer_org IS NOT NULL AND customer_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Customer does not belong to this organization';
      END IF;
    END IF;
  END IF;

  -- For INVOICES: validate customer belongs to same org
  IF TG_TABLE_NAME = 'invoices' THEN
    IF NEW.customer_id IS NOT NULL AND NEW.customer_id != '' THEN
      SELECT organization_id INTO customer_org 
      FROM public.customers WHERE id = NEW.customer_id::text;
      IF customer_org IS NOT NULL AND customer_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Customer does not belong to this organization';
      END IF;
    END IF;
  END IF;

  -- For MAINTENANCE_RECORDS: validate vehicle belongs to same org
  IF TG_TABLE_NAME = 'maintenance_records' THEN
    IF NEW.vehicle_id IS NOT NULL AND NEW.vehicle_id != '' THEN
      SELECT organization_id INTO vehicle_org 
      FROM public.vehicles WHERE id = NEW.vehicle_id::text;
      IF vehicle_org IS NOT NULL AND vehicle_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Vehicle does not belong to this organization';
      END IF;
    END IF;
  END IF;

  -- For FUEL_ENTRIES: validate vehicle belongs to same org
  IF TG_TABLE_NAME = 'fuel_entries' THEN
    IF NEW.vehicle_id IS NOT NULL AND NEW.vehicle_id != '' THEN
      SELECT organization_id INTO vehicle_org 
      FROM public.vehicles WHERE id = NEW.vehicle_id::text;
      IF vehicle_org IS NOT NULL AND vehicle_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Vehicle does not belong to this organization';
      END IF;
    END IF;
  END IF;

  -- For EXPENSES: validate trip belongs to same org (if trip-linked)
  IF TG_TABLE_NAME = 'expenses' THEN
    IF NEW.trip_id IS NOT NULL AND NEW.trip_id != '' THEN
      SELECT organization_id INTO trip_org 
      FROM public.trips WHERE id = NEW.trip_id::text;
      IF trip_org IS NOT NULL AND trip_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Trip does not belong to this organization';
      END IF;
    END IF;
  END IF;

  -- For PAYMENTS: validate invoice's customer belongs to same org
  IF TG_TABLE_NAME = 'payments' THEN
    IF NEW.customer_id IS NOT NULL AND NEW.customer_id != '' THEN
      SELECT organization_id INTO customer_org 
      FROM public.customers WHERE id = NEW.customer_id::text;
      IF customer_org IS NOT NULL AND customer_org != NEW.organization_id THEN
        RAISE EXCEPTION 'Customer does not belong to this organization';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- STEP 3: Apply the validation trigger to critical tables
-- ============================================================

-- Trips: Validate vehicle, driver, customer are same org
DROP TRIGGER IF EXISTS validate_trip_org_refs ON public.trips;
CREATE TRIGGER validate_trip_org_refs
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_same_organization();

-- Invoices: Validate customer is same org
DROP TRIGGER IF EXISTS validate_invoice_org_refs ON public.invoices;
CREATE TRIGGER validate_invoice_org_refs
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_same_organization();

-- Maintenance Records: Validate vehicle is same org
DROP TRIGGER IF EXISTS validate_maintenance_org_refs ON public.maintenance_records;
CREATE TRIGGER validate_maintenance_org_refs
  BEFORE INSERT OR UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_same_organization();

-- Fuel Entries: Validate vehicle is same org
DROP TRIGGER IF EXISTS validate_fuel_org_refs ON public.fuel_entries;
CREATE TRIGGER validate_fuel_org_refs
  BEFORE INSERT OR UPDATE ON public.fuel_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_same_organization();

-- Expenses: Validate trip is same org
DROP TRIGGER IF EXISTS validate_expense_org_refs ON public.expenses;
CREATE TRIGGER validate_expense_org_refs
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_same_organization();

-- Payments: Validate customer is same org
DROP TRIGGER IF EXISTS validate_payment_org_refs ON public.payments;
CREATE TRIGGER validate_payment_org_refs
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_same_organization();

-- ============================================================
-- VERIFICATION QUERIES (run manually to confirm)
-- ============================================================

-- Test: Try to insert a trip with a vehicle from another org
-- This should FAIL:
-- INSERT INTO trips (organization_id, vehicle_id, ...)
-- VALUES ('org_A_id', 'vehicle_from_org_B_id', ...);
-- Expected: ERROR: Vehicle does not belong to this organization

-- ============================================================
-- DONE — Phase 14+15 Complete
--
-- Phase 14 guarantees:
-- ✅ No service role key in frontend
-- ✅ All client queries go through RLS
-- ✅ Privileged action logging function created
-- ✅ Documentation for future Edge Functions
--
-- Phase 15 guarantees:
-- ✅ Composite unique constraints on 6 core tables
-- ✅ Validation trigger prevents cross-org references
-- ✅ Trips cannot reference another org's vehicle/driver/customer
-- ✅ Invoices cannot reference another org's customer
-- ✅ Maintenance cannot reference another org's vehicle
-- ✅ Fuel entries cannot reference another org's vehicle
-- ✅ Expenses cannot reference another org's trip
-- ✅ Payments cannot reference another org's customer
-- ============================================================
