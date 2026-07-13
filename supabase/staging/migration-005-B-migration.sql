-- migration-005-B-migration.sql
-- Migration 005: Same-Organization Relational Integrity
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Phases:
--   1. Add UNIQUE(organization_id, id) on 9 referenced tables
--   2. Drop 12 old simple FKs
--   3. Add 34 composite FKs (organization_id, ref) -> target(organization_id, id)
-- MATCH SIMPLE: NULL reference remains valid while organization_id is NOT NULL.
-- ON UPDATE NO ACTION, ON DELETE NO ACTION. No grants, policies, or functions.

BEGIN;

-- ============================================================
-- PHASE 1: Add UNIQUE(organization_id, id) on 9 referenced tables
-- Required for composite FK references
-- ============================================================

ALTER TABLE public.branches ADD CONSTRAINT uq_branches_org_id UNIQUE (organization_id, id);
ALTER TABLE public.customers ADD CONSTRAINT uq_customers_org_id UNIQUE (organization_id, id);
ALTER TABLE public.drivers ADD CONSTRAINT uq_drivers_org_id UNIQUE (organization_id, id);
ALTER TABLE public.enquiries ADD CONSTRAINT uq_enquiries_org_id UNIQUE (organization_id, id);
ALTER TABLE public.invoices ADD CONSTRAINT uq_invoices_org_id UNIQUE (organization_id, id);
ALTER TABLE public.quotations ADD CONSTRAINT uq_quotations_org_id UNIQUE (organization_id, id);
ALTER TABLE public.trips ADD CONSTRAINT uq_trips_org_id UNIQUE (organization_id, id);
ALTER TABLE public.vehicles ADD CONSTRAINT uq_vehicles_org_id UNIQUE (organization_id, id);
ALTER TABLE public.vendors ADD CONSTRAINT uq_vendors_org_id UNIQUE (organization_id, id);

-- ============================================================
-- PHASE 2: Drop 12 old simple FKs (replaced by composite FKs)
-- ============================================================

ALTER TABLE public.attendance DROP CONSTRAINT attendance_employee_id_fkey;
ALTER TABLE public.challans DROP CONSTRAINT challans_driver_id_fkey;
ALTER TABLE public.challans DROP CONSTRAINT challans_vehicle_id_fkey;
ALTER TABLE public.claims DROP CONSTRAINT claims_trip_id_fkey;
ALTER TABLE public.contracts DROP CONSTRAINT contracts_customer_id_fkey;
ALTER TABLE public.gps_devices DROP CONSTRAINT gps_devices_vehicle_id_fkey;
ALTER TABLE public.indents DROP CONSTRAINT indents_customer_id_fkey;
ALTER TABLE public.indents DROP CONSTRAINT indents_trip_id_fkey;
ALTER TABLE public.leave_requests DROP CONSTRAINT leave_requests_employee_id_fkey;
ALTER TABLE public.transfers DROP CONSTRAINT transfers_from_branch_fkey;
ALTER TABLE public.transfers DROP CONSTRAINT transfers_to_branch_fkey;
ALTER TABLE public.work_orders DROP CONSTRAINT work_orders_vehicle_id_fkey;

-- ============================================================
-- PHASE 3: Add 34 composite FKs
-- Each: (organization_id, source_column) REFERENCES target(organization_id, id)
-- MATCH SIMPLE, ON UPDATE NO ACTION, ON DELETE NO ACTION
-- ============================================================

-- attendance.employee_id -> drivers.id
ALTER TABLE public.attendance ADD CONSTRAINT fk_attendance_employee_id_org
  FOREIGN KEY (organization_id, employee_id)
  REFERENCES public.drivers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- challans.driver_id -> drivers.id
ALTER TABLE public.challans ADD CONSTRAINT fk_challans_driver_id_org
  FOREIGN KEY (organization_id, driver_id)
  REFERENCES public.drivers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- challans.vehicle_id -> vehicles.id
ALTER TABLE public.challans ADD CONSTRAINT fk_challans_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- claims.trip_id -> trips.id
ALTER TABLE public.claims ADD CONSTRAINT fk_claims_trip_id_org
  FOREIGN KEY (organization_id, trip_id)
  REFERENCES public.trips(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- contracts.customer_id -> customers.id
ALTER TABLE public.contracts ADD CONSTRAINT fk_contracts_customer_id_org
  FOREIGN KEY (organization_id, customer_id)
  REFERENCES public.customers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- drivers.assigned_vehicle_id -> vehicles.id
ALTER TABLE public.drivers ADD CONSTRAINT fk_drivers_assigned_vehicle_id_org
  FOREIGN KEY (organization_id, assigned_vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- enquiries.customer_id -> customers.id
ALTER TABLE public.enquiries ADD CONSTRAINT fk_enquiries_customer_id_org
  FOREIGN KEY (organization_id, customer_id)
  REFERENCES public.customers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- eway_bills.transporter_id -> vendors.id
ALTER TABLE public.eway_bills ADD CONSTRAINT fk_eway_bills_transporter_id_org
  FOREIGN KEY (organization_id, transporter_id)
  REFERENCES public.vendors(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- eway_bills.trip_id -> trips.id
ALTER TABLE public.eway_bills ADD CONSTRAINT fk_eway_bills_trip_id_org
  FOREIGN KEY (organization_id, trip_id)
  REFERENCES public.trips(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- expenses.trip_id -> trips.id
ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_trip_id_org
  FOREIGN KEY (organization_id, trip_id)
  REFERENCES public.trips(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- expenses.vehicle_id -> vehicles.id
ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- fuel_entries.driver_id -> drivers.id
ALTER TABLE public.fuel_entries ADD CONSTRAINT fk_fuel_entries_driver_id_org
  FOREIGN KEY (organization_id, driver_id)
  REFERENCES public.drivers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- fuel_entries.trip_id -> trips.id
ALTER TABLE public.fuel_entries ADD CONSTRAINT fk_fuel_entries_trip_id_org
  FOREIGN KEY (organization_id, trip_id)
  REFERENCES public.trips(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- fuel_entries.vehicle_id -> vehicles.id
ALTER TABLE public.fuel_entries ADD CONSTRAINT fk_fuel_entries_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- gps_devices.vehicle_id -> vehicles.id
ALTER TABLE public.gps_devices ADD CONSTRAINT fk_gps_devices_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- indents.customer_id -> customers.id
ALTER TABLE public.indents ADD CONSTRAINT fk_indents_customer_id_org
  FOREIGN KEY (organization_id, customer_id)
  REFERENCES public.customers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- indents.trip_id -> trips.id
ALTER TABLE public.indents ADD CONSTRAINT fk_indents_trip_id_org
  FOREIGN KEY (organization_id, trip_id)
  REFERENCES public.trips(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- invoices.customer_id -> customers.id
ALTER TABLE public.invoices ADD CONSTRAINT fk_invoices_customer_id_org
  FOREIGN KEY (organization_id, customer_id)
  REFERENCES public.customers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- leave_requests.employee_id -> drivers.id
ALTER TABLE public.leave_requests ADD CONSTRAINT fk_leave_requests_employee_id_org
  FOREIGN KEY (organization_id, employee_id)
  REFERENCES public.drivers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- maintenance_records.vehicle_id -> vehicles.id
ALTER TABLE public.maintenance_records ADD CONSTRAINT fk_maintenance_records_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- payments.customer_id -> customers.id
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_customer_id_org
  FOREIGN KEY (organization_id, customer_id)
  REFERENCES public.customers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- payments.invoice_id -> invoices.id
ALTER TABLE public.payments ADD CONSTRAINT fk_payments_invoice_id_org
  FOREIGN KEY (organization_id, invoice_id)
  REFERENCES public.invoices(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- quotations.customer_id -> customers.id
ALTER TABLE public.quotations ADD CONSTRAINT fk_quotations_customer_id_org
  FOREIGN KEY (organization_id, customer_id)
  REFERENCES public.customers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- quotations.enquiry_id -> enquiries.id
ALTER TABLE public.quotations ADD CONSTRAINT fk_quotations_enquiry_id_org
  FOREIGN KEY (organization_id, enquiry_id)
  REFERENCES public.enquiries(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- transfers.from_branch -> branches.id
ALTER TABLE public.transfers ADD CONSTRAINT fk_transfers_from_branch_org
  FOREIGN KEY (organization_id, from_branch)
  REFERENCES public.branches(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- transfers.to_branch -> branches.id
ALTER TABLE public.transfers ADD CONSTRAINT fk_transfers_to_branch_org
  FOREIGN KEY (organization_id, to_branch)
  REFERENCES public.branches(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- trips.customer_id -> customers.id
ALTER TABLE public.trips ADD CONSTRAINT fk_trips_customer_id_org
  FOREIGN KEY (organization_id, customer_id)
  REFERENCES public.customers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- trips.driver_id -> drivers.id
ALTER TABLE public.trips ADD CONSTRAINT fk_trips_driver_id_org
  FOREIGN KEY (organization_id, driver_id)
  REFERENCES public.drivers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- trips.enquiry_id -> enquiries.id
ALTER TABLE public.trips ADD CONSTRAINT fk_trips_enquiry_id_org
  FOREIGN KEY (organization_id, enquiry_id)
  REFERENCES public.enquiries(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- trips.quotation_id -> quotations.id
ALTER TABLE public.trips ADD CONSTRAINT fk_trips_quotation_id_org
  FOREIGN KEY (organization_id, quotation_id)
  REFERENCES public.quotations(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- trips.vehicle_id -> vehicles.id
ALTER TABLE public.trips ADD CONSTRAINT fk_trips_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- tyres.vehicle_id -> vehicles.id
ALTER TABLE public.tyres ADD CONSTRAINT fk_tyres_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- vehicles.driver_id -> drivers.id
ALTER TABLE public.vehicles ADD CONSTRAINT fk_vehicles_driver_id_org
  FOREIGN KEY (organization_id, driver_id)
  REFERENCES public.drivers(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

-- work_orders.vehicle_id -> vehicles.id
ALTER TABLE public.work_orders ADD CONSTRAINT fk_work_orders_vehicle_id_org
  FOREIGN KEY (organization_id, vehicle_id)
  REFERENCES public.vehicles(organization_id, id)
  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;

COMMIT;
