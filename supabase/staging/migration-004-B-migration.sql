-- migration-004-B-migration.sql
-- Migration 004: Schema Normalization (TEXT->UUID + org_id NOT NULL)
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Phase 1: Convert 22 TEXT entity-reference columns to nullable UUID
-- Phase 2: Enforce organization_id NOT NULL on 16 business tables
-- Conversion uses NULLIF(btrim(col),'')::uuid so preflight and migration
-- accept identical inputs (empty/whitespace -> NULL, valid UUID -> cast).
-- No FK constraints (Migration 005). No grants. Dormant state preserved.

BEGIN;

-- ============================================================
-- PHASE 1: Convert 22 TEXT entity-reference columns to nullable UUID
-- Each column: ALTER TYPE UUID USING NULLIF(btrim(col),'')::uuid
-- This atomically handles empty strings without a separate UPDATE pass.
-- ============================================================

-- drivers.assigned_vehicle_id -> vehicles.id
ALTER TABLE public.drivers ALTER COLUMN assigned_vehicle_id TYPE UUID USING NULLIF(btrim(assigned_vehicle_id), '')::uuid;

-- enquiries.customer_id -> customers.id
ALTER TABLE public.enquiries ALTER COLUMN customer_id TYPE UUID USING NULLIF(btrim(customer_id), '')::uuid;

-- eway_bills.transporter_id -> vendors.id
ALTER TABLE public.eway_bills ALTER COLUMN transporter_id TYPE UUID USING NULLIF(btrim(transporter_id), '')::uuid;

-- eway_bills.trip_id -> trips.id
ALTER TABLE public.eway_bills ALTER COLUMN trip_id TYPE UUID USING NULLIF(btrim(trip_id), '')::uuid;

-- expenses.trip_id -> trips.id
ALTER TABLE public.expenses ALTER COLUMN trip_id TYPE UUID USING NULLIF(btrim(trip_id), '')::uuid;

-- expenses.vehicle_id -> vehicles.id
ALTER TABLE public.expenses ALTER COLUMN vehicle_id TYPE UUID USING NULLIF(btrim(vehicle_id), '')::uuid;

-- fuel_entries.driver_id -> drivers.id
ALTER TABLE public.fuel_entries ALTER COLUMN driver_id TYPE UUID USING NULLIF(btrim(driver_id), '')::uuid;

-- fuel_entries.trip_id -> trips.id
ALTER TABLE public.fuel_entries ALTER COLUMN trip_id TYPE UUID USING NULLIF(btrim(trip_id), '')::uuid;

-- fuel_entries.vehicle_id -> vehicles.id
ALTER TABLE public.fuel_entries ALTER COLUMN vehicle_id TYPE UUID USING NULLIF(btrim(vehicle_id), '')::uuid;

-- invoices.customer_id -> customers.id
ALTER TABLE public.invoices ALTER COLUMN customer_id TYPE UUID USING NULLIF(btrim(customer_id), '')::uuid;

-- maintenance_records.vehicle_id -> vehicles.id
ALTER TABLE public.maintenance_records ALTER COLUMN vehicle_id TYPE UUID USING NULLIF(btrim(vehicle_id), '')::uuid;

-- payments.customer_id -> customers.id
ALTER TABLE public.payments ALTER COLUMN customer_id TYPE UUID USING NULLIF(btrim(customer_id), '')::uuid;

-- payments.invoice_id -> invoices.id
ALTER TABLE public.payments ALTER COLUMN invoice_id TYPE UUID USING NULLIF(btrim(invoice_id), '')::uuid;

-- quotations.customer_id -> customers.id
ALTER TABLE public.quotations ALTER COLUMN customer_id TYPE UUID USING NULLIF(btrim(customer_id), '')::uuid;

-- quotations.enquiry_id -> enquiries.id
ALTER TABLE public.quotations ALTER COLUMN enquiry_id TYPE UUID USING NULLIF(btrim(enquiry_id), '')::uuid;

-- trips.customer_id -> customers.id
ALTER TABLE public.trips ALTER COLUMN customer_id TYPE UUID USING NULLIF(btrim(customer_id), '')::uuid;

-- trips.driver_id -> drivers.id
ALTER TABLE public.trips ALTER COLUMN driver_id TYPE UUID USING NULLIF(btrim(driver_id), '')::uuid;

-- trips.enquiry_id -> enquiries.id
ALTER TABLE public.trips ALTER COLUMN enquiry_id TYPE UUID USING NULLIF(btrim(enquiry_id), '')::uuid;

-- trips.quotation_id -> quotations.id
ALTER TABLE public.trips ALTER COLUMN quotation_id TYPE UUID USING NULLIF(btrim(quotation_id), '')::uuid;

-- trips.vehicle_id -> vehicles.id
ALTER TABLE public.trips ALTER COLUMN vehicle_id TYPE UUID USING NULLIF(btrim(vehicle_id), '')::uuid;

-- tyres.vehicle_id -> vehicles.id
ALTER TABLE public.tyres ALTER COLUMN vehicle_id TYPE UUID USING NULLIF(btrim(vehicle_id), '')::uuid;

-- vehicles.driver_id -> drivers.id
ALTER TABLE public.vehicles ALTER COLUMN driver_id TYPE UUID USING NULLIF(btrim(driver_id), '')::uuid;

-- ============================================================
-- PHASE 2: Enforce organization_id NOT NULL on 16 tables
-- These were added as nullable in Migration 001. Staging is empty so safe.
-- ============================================================

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
