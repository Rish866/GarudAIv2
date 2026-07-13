-- migration-004-B-migration.sql
-- Migration 004: Schema Normalization (TEXT→UUID + org_id NOT NULL)
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Phase 1: Convert 22 TEXT entity-reference columns to nullable UUID
-- Phase 2: Enforce organization_id NOT NULL on 16 business tables
-- Empty-string normalization: '' and whitespace → NULL before CAST.
-- No FK constraints (Migration 005). No grants. Dormant state preserved.

BEGIN;

-- Phase 1: Convert 22 TEXT → nullable UUID
-- drivers.assigned_vehicle_id → vehicles.id
UPDATE public.drivers SET assigned_vehicle_id = NULL WHERE assigned_vehicle_id IS NOT NULL AND btrim(assigned_vehicle_id) = '';
ALTER TABLE public.drivers ALTER COLUMN assigned_vehicle_id TYPE UUID USING assigned_vehicle_id::uuid;

-- enquiries.customer_id → customers.id
UPDATE public.enquiries SET customer_id = NULL WHERE customer_id IS NOT NULL AND btrim(customer_id) = '';
ALTER TABLE public.enquiries ALTER COLUMN customer_id TYPE UUID USING customer_id::uuid;

-- eway_bills.transporter_id → vendors.id
UPDATE public.eway_bills SET transporter_id = NULL WHERE transporter_id IS NOT NULL AND btrim(transporter_id) = '';
ALTER TABLE public.eway_bills ALTER COLUMN transporter_id TYPE UUID USING transporter_id::uuid;

-- eway_bills.trip_id → trips.id
UPDATE public.eway_bills SET trip_id = NULL WHERE trip_id IS NOT NULL AND btrim(trip_id) = '';
ALTER TABLE public.eway_bills ALTER COLUMN trip_id TYPE UUID USING trip_id::uuid;

-- expenses.trip_id → trips.id
UPDATE public.expenses SET trip_id = NULL WHERE trip_id IS NOT NULL AND btrim(trip_id) = '';
ALTER TABLE public.expenses ALTER COLUMN trip_id TYPE UUID USING trip_id::uuid;

-- expenses.vehicle_id → vehicles.id
UPDATE public.expenses SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) = '';
ALTER TABLE public.expenses ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;

-- fuel_entries.driver_id → drivers.id
UPDATE public.fuel_entries SET driver_id = NULL WHERE driver_id IS NOT NULL AND btrim(driver_id) = '';
ALTER TABLE public.fuel_entries ALTER COLUMN driver_id TYPE UUID USING driver_id::uuid;

-- fuel_entries.trip_id → trips.id
UPDATE public.fuel_entries SET trip_id = NULL WHERE trip_id IS NOT NULL AND btrim(trip_id) = '';
ALTER TABLE public.fuel_entries ALTER COLUMN trip_id TYPE UUID USING trip_id::uuid;

-- fuel_entries.vehicle_id → vehicles.id
UPDATE public.fuel_entries SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) = '';
ALTER TABLE public.fuel_entries ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;

-- invoices.customer_id → customers.id
UPDATE public.invoices SET customer_id = NULL WHERE customer_id IS NOT NULL AND btrim(customer_id) = '';
ALTER TABLE public.invoices ALTER COLUMN customer_id TYPE UUID USING customer_id::uuid;

-- maintenance_records.vehicle_id → vehicles.id
UPDATE public.maintenance_records SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) = '';
ALTER TABLE public.maintenance_records ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;

-- payments.customer_id → customers.id
UPDATE public.payments SET customer_id = NULL WHERE customer_id IS NOT NULL AND btrim(customer_id) = '';
ALTER TABLE public.payments ALTER COLUMN customer_id TYPE UUID USING customer_id::uuid;

-- payments.invoice_id → invoices.id
UPDATE public.payments SET invoice_id = NULL WHERE invoice_id IS NOT NULL AND btrim(invoice_id) = '';
ALTER TABLE public.payments ALTER COLUMN invoice_id TYPE UUID USING invoice_id::uuid;

-- quotations.customer_id → customers.id
UPDATE public.quotations SET customer_id = NULL WHERE customer_id IS NOT NULL AND btrim(customer_id) = '';
ALTER TABLE public.quotations ALTER COLUMN customer_id TYPE UUID USING customer_id::uuid;

-- quotations.enquiry_id → enquiries.id
UPDATE public.quotations SET enquiry_id = NULL WHERE enquiry_id IS NOT NULL AND btrim(enquiry_id) = '';
ALTER TABLE public.quotations ALTER COLUMN enquiry_id TYPE UUID USING enquiry_id::uuid;

-- trips.customer_id → customers.id
UPDATE public.trips SET customer_id = NULL WHERE customer_id IS NOT NULL AND btrim(customer_id) = '';
ALTER TABLE public.trips ALTER COLUMN customer_id TYPE UUID USING customer_id::uuid;

-- trips.driver_id → drivers.id
UPDATE public.trips SET driver_id = NULL WHERE driver_id IS NOT NULL AND btrim(driver_id) = '';
ALTER TABLE public.trips ALTER COLUMN driver_id TYPE UUID USING driver_id::uuid;

-- trips.enquiry_id → enquiries.id
UPDATE public.trips SET enquiry_id = NULL WHERE enquiry_id IS NOT NULL AND btrim(enquiry_id) = '';
ALTER TABLE public.trips ALTER COLUMN enquiry_id TYPE UUID USING enquiry_id::uuid;

-- trips.quotation_id → quotations.id
UPDATE public.trips SET quotation_id = NULL WHERE quotation_id IS NOT NULL AND btrim(quotation_id) = '';
ALTER TABLE public.trips ALTER COLUMN quotation_id TYPE UUID USING quotation_id::uuid;

-- trips.vehicle_id → vehicles.id
UPDATE public.trips SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) = '';
ALTER TABLE public.trips ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;

-- tyres.vehicle_id → vehicles.id
UPDATE public.tyres SET vehicle_id = NULL WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) = '';
ALTER TABLE public.tyres ALTER COLUMN vehicle_id TYPE UUID USING vehicle_id::uuid;

-- vehicles.driver_id → drivers.id
UPDATE public.vehicles SET driver_id = NULL WHERE driver_id IS NOT NULL AND btrim(driver_id) = '';
ALTER TABLE public.vehicles ALTER COLUMN driver_id TYPE UUID USING driver_id::uuid;

-- Phase 2: Enforce organization_id NOT NULL on 16 tables
ALTER TABLE public.activity_log ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.branches ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.drivers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.enquiries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.eway_bills ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.fuel_entries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.maintenance_records ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.quotations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.trips ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.tyres ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.vehicles ALTER COLUMN organization_id SET NOT NULL;

COMMIT;
