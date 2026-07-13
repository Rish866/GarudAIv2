-- migration-005-B-migration.sql
-- Migration 005: Same-Organization Relational Integrity
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Phases:
--   1. Add UNIQUE(organization_id, id) on 9 referenced tables
--   2. Drop simple FKs, recreate as composite (organization_id, ref_id)
--   3. Create per-table same-org validation trigger functions for TEXT refs
--   4. Attach triggers to 12 tables with TEXT entity references
-- No grants. No policies. No anonymous access. Dormant state preserved.

BEGIN;

-- ============================================================
-- PHASE 1: Composite unique constraints on referenced tables
-- Required for composite FK references to enforce same-organization
-- ============================================================

ALTER TABLE public.customers ADD CONSTRAINT uq_customers_org_id UNIQUE (organization_id, id);
ALTER TABLE public.trips ADD CONSTRAINT uq_trips_org_id UNIQUE (organization_id, id);
ALTER TABLE public.vehicles ADD CONSTRAINT uq_vehicles_org_id UNIQUE (organization_id, id);
ALTER TABLE public.drivers ADD CONSTRAINT uq_drivers_org_id UNIQUE (organization_id, id);
ALTER TABLE public.branches ADD CONSTRAINT uq_branches_org_id UNIQUE (organization_id, id);
ALTER TABLE public.enquiries ADD CONSTRAINT uq_enquiries_org_id UNIQUE (organization_id, id);
ALTER TABLE public.quotations ADD CONSTRAINT uq_quotations_org_id UNIQUE (organization_id, id);
ALTER TABLE public.invoices ADD CONSTRAINT uq_invoices_org_id UNIQUE (organization_id, id);
ALTER TABLE public.vendors ADD CONSTRAINT uq_vendors_org_id UNIQUE (organization_id, id);

-- ============================================================
-- PHASE 2: Convert simple FKs to composite (same-organization)
-- Drop existing FK, add composite FK referencing (organization_id, id)
-- ============================================================

-- contracts.customer_id → customers
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_customer_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT fk_contracts_customer_id_org
  FOREIGN KEY (organization_id, customer_id) REFERENCES public.customers(organization_id, id);

-- indents.customer_id → customers
ALTER TABLE public.indents DROP CONSTRAINT IF EXISTS indents_customer_id_fkey;
ALTER TABLE public.indents ADD CONSTRAINT fk_indents_customer_id_org
  FOREIGN KEY (organization_id, customer_id) REFERENCES public.customers(organization_id, id);

-- indents.trip_id → trips
ALTER TABLE public.indents DROP CONSTRAINT IF EXISTS indents_trip_id_fkey;
ALTER TABLE public.indents ADD CONSTRAINT fk_indents_trip_id_org
  FOREIGN KEY (organization_id, trip_id) REFERENCES public.trips(organization_id, id);

-- work_orders.vehicle_id → vehicles
ALTER TABLE public.work_orders DROP CONSTRAINT IF EXISTS work_orders_vehicle_id_fkey;
ALTER TABLE public.work_orders ADD CONSTRAINT fk_work_orders_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id) REFERENCES public.vehicles(organization_id, id);

-- challans.vehicle_id → vehicles
ALTER TABLE public.challans DROP CONSTRAINT IF EXISTS challans_vehicle_id_fkey;
ALTER TABLE public.challans ADD CONSTRAINT fk_challans_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id) REFERENCES public.vehicles(organization_id, id);

-- challans.driver_id → drivers
ALTER TABLE public.challans DROP CONSTRAINT IF EXISTS challans_driver_id_fkey;
ALTER TABLE public.challans ADD CONSTRAINT fk_challans_driver_id_org
  FOREIGN KEY (organization_id, driver_id) REFERENCES public.drivers(organization_id, id);

-- claims.trip_id → trips
ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_trip_id_fkey;
ALTER TABLE public.claims ADD CONSTRAINT fk_claims_trip_id_org
  FOREIGN KEY (organization_id, trip_id) REFERENCES public.trips(organization_id, id);

-- transfers.from_branch → branches
ALTER TABLE public.transfers DROP CONSTRAINT IF EXISTS transfers_from_branch_fkey;
ALTER TABLE public.transfers ADD CONSTRAINT fk_transfers_from_branch_org
  FOREIGN KEY (organization_id, from_branch) REFERENCES public.branches(organization_id, id);

-- transfers.to_branch → branches
ALTER TABLE public.transfers DROP CONSTRAINT IF EXISTS transfers_to_branch_fkey;
ALTER TABLE public.transfers ADD CONSTRAINT fk_transfers_to_branch_org
  FOREIGN KEY (organization_id, to_branch) REFERENCES public.branches(organization_id, id);

-- attendance.employee_id → drivers
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
ALTER TABLE public.attendance ADD CONSTRAINT fk_attendance_employee_id_org
  FOREIGN KEY (organization_id, employee_id) REFERENCES public.drivers(organization_id, id);

-- leave_requests.employee_id → drivers
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS leave_requests_employee_id_fkey;
ALTER TABLE public.leave_requests ADD CONSTRAINT fk_leave_requests_employee_id_org
  FOREIGN KEY (organization_id, employee_id) REFERENCES public.drivers(organization_id, id);

-- gps_devices.vehicle_id → vehicles
ALTER TABLE public.gps_devices DROP CONSTRAINT IF EXISTS gps_devices_vehicle_id_fkey;
ALTER TABLE public.gps_devices ADD CONSTRAINT fk_gps_devices_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id) REFERENCES public.vehicles(organization_id, id);

-- ============================================================
-- PHASE 3: Same-organization validation trigger functions
-- Per-table functions for TEXT entity references
-- SECURITY DEFINER with secured search_path
-- Rejects cross-organization references; handles NULL safely
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_same_org_drivers()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate assigned_vehicle_id → vehicles
  IF NEW.assigned_vehicle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = NEW.assigned_vehicle_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.assigned_vehicle_id (%) references vehicles in different organization',
        TG_TABLE_NAME, NEW.assigned_vehicle_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_enquiries()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate customer_id → customers
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = NEW.customer_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.customer_id (%) references customers in different organization',
        TG_TABLE_NAME, NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_eway_bills()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate trip_id → trips
  IF NEW.trip_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = NEW.trip_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.trip_id (%) references trips in different organization',
        TG_TABLE_NAME, NEW.trip_id;
    END IF;
  END IF;
  -- Validate transporter_id → vendors
  IF NEW.transporter_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vendors
      WHERE id = NEW.transporter_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.transporter_id (%) references vendors in different organization',
        TG_TABLE_NAME, NEW.transporter_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_expenses()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate trip_id → trips
  IF NEW.trip_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = NEW.trip_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.trip_id (%) references trips in different organization',
        TG_TABLE_NAME, NEW.trip_id;
    END IF;
  END IF;
  -- Validate vehicle_id → vehicles
  IF NEW.vehicle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = NEW.vehicle_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.vehicle_id (%) references vehicles in different organization',
        TG_TABLE_NAME, NEW.vehicle_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_fuel_entries()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate vehicle_id → vehicles
  IF NEW.vehicle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = NEW.vehicle_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.vehicle_id (%) references vehicles in different organization',
        TG_TABLE_NAME, NEW.vehicle_id;
    END IF;
  END IF;
  -- Validate driver_id → drivers
  IF NEW.driver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = NEW.driver_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.driver_id (%) references drivers in different organization',
        TG_TABLE_NAME, NEW.driver_id;
    END IF;
  END IF;
  -- Validate trip_id → trips
  IF NEW.trip_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.trips
      WHERE id = NEW.trip_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.trip_id (%) references trips in different organization',
        TG_TABLE_NAME, NEW.trip_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_invoices()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate customer_id → customers
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = NEW.customer_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.customer_id (%) references customers in different organization',
        TG_TABLE_NAME, NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_maintenance_records()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate vehicle_id → vehicles
  IF NEW.vehicle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = NEW.vehicle_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.vehicle_id (%) references vehicles in different organization',
        TG_TABLE_NAME, NEW.vehicle_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_payments()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate invoice_id → invoices
  IF NEW.invoice_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.invoices
      WHERE id = NEW.invoice_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.invoice_id (%) references invoices in different organization',
        TG_TABLE_NAME, NEW.invoice_id;
    END IF;
  END IF;
  -- Validate customer_id → customers
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = NEW.customer_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.customer_id (%) references customers in different organization',
        TG_TABLE_NAME, NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_quotations()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate enquiry_id → enquiries
  IF NEW.enquiry_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.enquiries
      WHERE id = NEW.enquiry_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.enquiry_id (%) references enquiries in different organization',
        TG_TABLE_NAME, NEW.enquiry_id;
    END IF;
  END IF;
  -- Validate customer_id → customers
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = NEW.customer_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.customer_id (%) references customers in different organization',
        TG_TABLE_NAME, NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_trips()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate customer_id → customers
  IF NEW.customer_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = NEW.customer_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.customer_id (%) references customers in different organization',
        TG_TABLE_NAME, NEW.customer_id;
    END IF;
  END IF;
  -- Validate vehicle_id → vehicles
  IF NEW.vehicle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = NEW.vehicle_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.vehicle_id (%) references vehicles in different organization',
        TG_TABLE_NAME, NEW.vehicle_id;
    END IF;
  END IF;
  -- Validate driver_id → drivers
  IF NEW.driver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = NEW.driver_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.driver_id (%) references drivers in different organization',
        TG_TABLE_NAME, NEW.driver_id;
    END IF;
  END IF;
  -- Validate quotation_id → quotations
  IF NEW.quotation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.quotations
      WHERE id = NEW.quotation_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.quotation_id (%) references quotations in different organization',
        TG_TABLE_NAME, NEW.quotation_id;
    END IF;
  END IF;
  -- Validate enquiry_id → enquiries
  IF NEW.enquiry_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.enquiries
      WHERE id = NEW.enquiry_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.enquiry_id (%) references enquiries in different organization',
        TG_TABLE_NAME, NEW.enquiry_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_tyres()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate vehicle_id → vehicles
  IF NEW.vehicle_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = NEW.vehicle_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.vehicle_id (%) references vehicles in different organization',
        TG_TABLE_NAME, NEW.vehicle_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.enforce_same_org_vehicles()
RETURNS TRIGGER AS $fn$
BEGIN
  -- Validate driver_id → drivers
  IF NEW.driver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = NEW.driver_id::uuid AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'same-organization violation: %.driver_id (%) references drivers in different organization',
        TG_TABLE_NAME, NEW.driver_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- PHASE 4: Attach same-org triggers to tables with TEXT refs
-- BEFORE INSERT OR UPDATE, FOR EACH ROW
-- ============================================================

DROP TRIGGER IF EXISTS enforce_same_org_refs_drivers ON public.drivers;
CREATE TRIGGER enforce_same_org_refs_drivers BEFORE INSERT OR UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_drivers();

DROP TRIGGER IF EXISTS enforce_same_org_refs_enquiries ON public.enquiries;
CREATE TRIGGER enforce_same_org_refs_enquiries BEFORE INSERT OR UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_enquiries();

DROP TRIGGER IF EXISTS enforce_same_org_refs_eway_bills ON public.eway_bills;
CREATE TRIGGER enforce_same_org_refs_eway_bills BEFORE INSERT OR UPDATE ON public.eway_bills
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_eway_bills();

DROP TRIGGER IF EXISTS enforce_same_org_refs_expenses ON public.expenses;
CREATE TRIGGER enforce_same_org_refs_expenses BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_expenses();

DROP TRIGGER IF EXISTS enforce_same_org_refs_fuel_entries ON public.fuel_entries;
CREATE TRIGGER enforce_same_org_refs_fuel_entries BEFORE INSERT OR UPDATE ON public.fuel_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_fuel_entries();

DROP TRIGGER IF EXISTS enforce_same_org_refs_invoices ON public.invoices;
CREATE TRIGGER enforce_same_org_refs_invoices BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_invoices();

DROP TRIGGER IF EXISTS enforce_same_org_refs_maintenance_records ON public.maintenance_records;
CREATE TRIGGER enforce_same_org_refs_maintenance_records BEFORE INSERT OR UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_maintenance_records();

DROP TRIGGER IF EXISTS enforce_same_org_refs_payments ON public.payments;
CREATE TRIGGER enforce_same_org_refs_payments BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_payments();

DROP TRIGGER IF EXISTS enforce_same_org_refs_quotations ON public.quotations;
CREATE TRIGGER enforce_same_org_refs_quotations BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_quotations();

DROP TRIGGER IF EXISTS enforce_same_org_refs_trips ON public.trips;
CREATE TRIGGER enforce_same_org_refs_trips BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_trips();

DROP TRIGGER IF EXISTS enforce_same_org_refs_tyres ON public.tyres;
CREATE TRIGGER enforce_same_org_refs_tyres BEFORE INSERT OR UPDATE ON public.tyres
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_tyres();

DROP TRIGGER IF EXISTS enforce_same_org_refs_vehicles ON public.vehicles;
CREATE TRIGGER enforce_same_org_refs_vehicles BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_same_org_vehicles();

COMMIT;
