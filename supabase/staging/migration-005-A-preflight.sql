-- migration-005-A-preflight.sql
-- Migration 005 Preflight: Same-organization relational integrity prerequisites
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: raises exception on failure, emits PASS on success
-- Checks (10 total):
--   1. Source columns are nullable UUID
--   2. Target id columns are UUID
--   3. organization_id UUID NOT NULL on all source+target tables
--   4. Old simple FKs verified by exact catalog mapping (9 attributes)
--   5. No conflicting composite FK by name
--   6. No equivalent composite FK regardless of name
--   7. No conflicting/equivalent UNIQUE(org_id,id) on target tables
--   8. Zero dangling references
--   9. Zero cross-organization references
--  10. Zero effective privileges (anon/authenticated/PUBLIC/MAINTAIN)

DO $preflight$
DECLARE
  issues TEXT[];
  cnt BIGINT;
BEGIN

  -- Check 1: All 34 source columns are nullable UUID
  SELECT array_agg(t || '.' || c || '(' || COALESCE(udt_name,'MISSING') || ',' || COALESCE(is_nullable,'?') || ')') INTO issues
  FROM (VALUES
    ('attendance', 'employee_id'),
    ('challans', 'driver_id'),
    ('challans', 'vehicle_id'),
    ('claims', 'trip_id'),
    ('contracts', 'customer_id'),
    ('drivers', 'assigned_vehicle_id'),
    ('enquiries', 'customer_id'),
    ('eway_bills', 'transporter_id'),
    ('eway_bills', 'trip_id'),
    ('expenses', 'trip_id'),
    ('expenses', 'vehicle_id'),
    ('fuel_entries', 'driver_id'),
    ('fuel_entries', 'trip_id'),
    ('fuel_entries', 'vehicle_id'),
    ('gps_devices', 'vehicle_id'),
    ('indents', 'customer_id'),
    ('indents', 'trip_id'),
    ('invoices', 'customer_id'),
    ('leave_requests', 'employee_id'),
    ('maintenance_records', 'vehicle_id'),
    ('payments', 'customer_id'),
    ('payments', 'invoice_id'),
    ('quotations', 'customer_id'),
    ('quotations', 'enquiry_id'),
    ('transfers', 'from_branch'),
    ('transfers', 'to_branch'),
    ('trips', 'customer_id'),
    ('trips', 'driver_id'),
    ('trips', 'enquiry_id'),
    ('trips', 'quotation_id'),
    ('trips', 'vehicle_id'),
    ('tyres', 'vehicle_id'),
    ('vehicles', 'driver_id'),
    ('work_orders', 'vehicle_id')
  ) AS expected(t, c)
  LEFT JOIN information_schema.columns cols
    ON cols.table_schema = 'public' AND cols.table_name = expected.t AND cols.column_name = expected.c
  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'NO';
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: source columns not nullable UUID: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 2: Target table id columns are UUID
  SELECT array_agg(t) INTO issues
  FROM unnest(ARRAY['branches','customers','drivers','enquiries','invoices','quotations','trips','vehicles','vendors']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
      AND table_name = t AND column_name = 'id' AND udt_name = 'uuid');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: target id not UUID: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 3: organization_id UUID NOT NULL on all involved tables
  SELECT array_agg(t || ':' || COALESCE(udt_name,'MISSING') || ':' || COALESCE(is_nullable,'?')) INTO issues
  FROM (VALUES
    ('attendance'),
    ('branches'),
    ('challans'),
    ('claims'),
    ('contracts'),
    ('customers'),
    ('drivers'),
    ('enquiries'),
    ('eway_bills'),
    ('expenses'),
    ('fuel_entries'),
    ('gps_devices'),
    ('indents'),
    ('invoices'),
    ('leave_requests'),
    ('maintenance_records'),
    ('payments'),
    ('quotations'),
    ('transfers'),
    ('trips'),
    ('tyres'),
    ('vehicles'),
    ('vendors'),
    ('work_orders')
  ) AS expected(t)
  LEFT JOIN information_schema.columns cols
    ON cols.table_schema = 'public' AND cols.table_name = expected.t AND cols.column_name = 'organization_id'
  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'YES';
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: organization_id not UUID NOT NULL: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 4: Old simple FKs verified by exact catalog mapping
  -- Verifies: name, source table, exact source column, target table, target column=id,
  --   contype=f, convalidated=true, MATCH SIMPLE, NO ACTION
  SELECT array_agg(
    e.expected_name || ': ' || CASE
      WHEN con.conname IS NULL THEN 'MISSING'
      WHEN con.contype != 'f' THEN 'not FK (type=' || con.contype || ')'
      WHEN NOT con.convalidated THEN 'NOT VALIDATED'
      WHEN con.confmatchtype != 's' THEN 'MATCH type=' || con.confmatchtype
      WHEN con.confupdtype != 'a' THEN 'ON UPDATE=' || con.confupdtype
      WHEN con.confdeltype != 'a' THEN 'ON DELETE=' || con.confdeltype
      WHEN con.conrelid::regclass::text != e.expected_src_table THEN 'src_table=' || con.conrelid::regclass::text
      WHEN array_length(con.conkey, 1) != 1 THEN 'src_cols=' || array_length(con.conkey, 1)
      WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) != e.expected_src_col
        THEN 'src_col=' || (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1])
      WHEN con.confrelid::regclass::text != e.expected_tgt_table THEN 'tgt_table=' || con.confrelid::regclass::text
      WHEN array_length(con.confkey, 1) != 1 THEN 'tgt_cols=' || array_length(con.confkey, 1)
      WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1]) != 'id'
        THEN 'tgt_col=' || (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1])
      ELSE NULL END
  ) INTO issues
  FROM (VALUES
    ('attendance_employee_id_fkey', 'attendance', 'employee_id', 'drivers'),
    ('challans_driver_id_fkey', 'challans', 'driver_id', 'drivers'),
    ('challans_vehicle_id_fkey', 'challans', 'vehicle_id', 'vehicles'),
    ('claims_trip_id_fkey', 'claims', 'trip_id', 'trips'),
    ('contracts_customer_id_fkey', 'contracts', 'customer_id', 'customers'),
    ('gps_devices_vehicle_id_fkey', 'gps_devices', 'vehicle_id', 'vehicles'),
    ('indents_customer_id_fkey', 'indents', 'customer_id', 'customers'),
    ('indents_trip_id_fkey', 'indents', 'trip_id', 'trips'),
    ('leave_requests_employee_id_fkey', 'leave_requests', 'employee_id', 'drivers'),
    ('transfers_from_branch_fkey', 'transfers', 'from_branch', 'branches'),
    ('transfers_to_branch_fkey', 'transfers', 'to_branch', 'branches'),
    ('work_orders_vehicle_id_fkey', 'work_orders', 'vehicle_id', 'vehicles')
  ) AS e(expected_name, expected_src_table, expected_src_col, expected_tgt_table)
  LEFT JOIN pg_constraint con ON con.connamespace = 'public'::regnamespace AND con.conname = e.expected_name
  WHERE con.conname IS NULL
    OR con.contype != 'f'
    OR NOT con.convalidated
    OR con.confmatchtype != 's'
    OR con.confupdtype != 'a'
    OR con.confdeltype != 'a'
    OR con.conrelid::regclass::text != e.expected_src_table
    OR array_length(con.conkey, 1) != 1
    OR (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) != e.expected_src_col
    OR con.confrelid::regclass::text != e.expected_tgt_table
    OR array_length(con.confkey, 1) != 1
    OR (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1]) != 'id';
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: old FK catalog mismatch: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 5: No composite FK constraints by expected name
  SELECT array_agg(conname) INTO issues FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace
    AND conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: composite FKs already exist: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 6: No equivalent composite FK (any name) with exact (organization_id, source_col)
  SELECT array_agg(con.conname || ' on ' || con.conrelid::regclass::text) INTO issues
  FROM pg_constraint con
  WHERE con.connamespace = 'public'::regnamespace AND con.contype = 'f'
    AND array_length(con.conkey, 1) = 2
    AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) = 'organization_id'
    AND (con.conrelid::regclass::text, (
      SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]
    )) IN (
      ('attendance', 'employee_id'),
      ('challans', 'driver_id'),
      ('challans', 'vehicle_id'),
      ('claims', 'trip_id'),
      ('contracts', 'customer_id'),
      ('drivers', 'assigned_vehicle_id'),
      ('enquiries', 'customer_id'),
      ('eway_bills', 'transporter_id'),
      ('eway_bills', 'trip_id'),
      ('expenses', 'trip_id'),
      ('expenses', 'vehicle_id'),
      ('fuel_entries', 'driver_id'),
      ('fuel_entries', 'trip_id'),
      ('fuel_entries', 'vehicle_id'),
      ('gps_devices', 'vehicle_id'),
      ('indents', 'customer_id'),
      ('indents', 'trip_id'),
      ('invoices', 'customer_id'),
      ('leave_requests', 'employee_id'),
      ('maintenance_records', 'vehicle_id'),
      ('payments', 'customer_id'),
      ('payments', 'invoice_id'),
      ('quotations', 'customer_id'),
      ('quotations', 'enquiry_id'),
      ('transfers', 'from_branch'),
      ('transfers', 'to_branch'),
      ('trips', 'customer_id'),
      ('trips', 'driver_id'),
      ('trips', 'enquiry_id'),
      ('trips', 'quotation_id'),
      ('trips', 'vehicle_id'),
      ('tyres', 'vehicle_id'),
      ('vehicles', 'driver_id'),
      ('work_orders', 'vehicle_id')
    );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: equivalent composite FKs found: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 7: No existing UNIQUE with exact ordered columns (organization_id, id) on target tables
  SELECT array_agg(con.conname || ' on ' || con.conrelid::regclass::text) INTO issues
  FROM pg_constraint con
  WHERE con.connamespace = 'public'::regnamespace AND con.contype = 'u'
    AND con.conrelid::regclass::text IN ('branches','customers','drivers','enquiries','invoices','quotations','trips','vehicles','vendors')
    AND array_length(con.conkey, 1) = 2
    AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) = 'organization_id'
    AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]) = 'id';
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: equivalent UNIQUE(organization_id,id) found: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 8: Zero dangling references
  SELECT count(*) INTO cnt FROM public.attendance s
  WHERE s.employee_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.employee_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in attendance.employee_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.challans s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in challans.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.challans s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in challans.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.claims s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in claims.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.contracts s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in contracts.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.drivers s
  WHERE s.assigned_vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.assigned_vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in drivers.assigned_vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.enquiries s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in enquiries.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.eway_bills s
  WHERE s.transporter_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vendors t WHERE t.id = s.transporter_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in eway_bills.transporter_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.eway_bills s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in eway_bills.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.expenses s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in expenses.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.expenses s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in expenses.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.fuel_entries s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in fuel_entries.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.fuel_entries s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in fuel_entries.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.fuel_entries s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in fuel_entries.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.gps_devices s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in gps_devices.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.indents s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in indents.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.indents s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in indents.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.invoices s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in invoices.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.leave_requests s
  WHERE s.employee_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.employee_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in leave_requests.employee_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.maintenance_records s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in maintenance_records.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.payments s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in payments.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.payments s
  WHERE s.invoice_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.invoices t WHERE t.id = s.invoice_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in payments.invoice_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.quotations s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in quotations.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.quotations s
  WHERE s.enquiry_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.enquiries t WHERE t.id = s.enquiry_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in quotations.enquiry_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.transfers s
  WHERE s.from_branch IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.branches t WHERE t.id = s.from_branch);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in transfers.from_branch', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.transfers s
  WHERE s.to_branch IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.branches t WHERE t.id = s.to_branch);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in transfers.to_branch', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in trips.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in trips.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.enquiry_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.enquiries t WHERE t.id = s.enquiry_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in trips.enquiry_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.quotation_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.quotations t WHERE t.id = s.quotation_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in trips.quotation_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in trips.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.tyres s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in tyres.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.vehicles s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in vehicles.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.work_orders s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in work_orders.vehicle_id', cnt; END IF;

  -- Check 9: Zero cross-organization references
  SELECT count(*) INTO cnt FROM public.attendance s
  JOIN public.drivers t ON t.id = s.employee_id
  WHERE s.employee_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in attendance.employee_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.challans s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in challans.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.challans s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in challans.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.claims s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in claims.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.contracts s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in contracts.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.drivers s
  JOIN public.vehicles t ON t.id = s.assigned_vehicle_id
  WHERE s.assigned_vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in drivers.assigned_vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.enquiries s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in enquiries.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.eway_bills s
  JOIN public.vendors t ON t.id = s.transporter_id
  WHERE s.transporter_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in eway_bills.transporter_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.eway_bills s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in eway_bills.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.expenses s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in expenses.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.expenses s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in expenses.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.fuel_entries s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in fuel_entries.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.fuel_entries s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in fuel_entries.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.fuel_entries s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in fuel_entries.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.gps_devices s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in gps_devices.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.indents s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in indents.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.indents s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in indents.trip_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.invoices s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in invoices.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.leave_requests s
  JOIN public.drivers t ON t.id = s.employee_id
  WHERE s.employee_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in leave_requests.employee_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.maintenance_records s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in maintenance_records.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.payments s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in payments.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.payments s
  JOIN public.invoices t ON t.id = s.invoice_id
  WHERE s.invoice_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in payments.invoice_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.quotations s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in quotations.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.quotations s
  JOIN public.enquiries t ON t.id = s.enquiry_id
  WHERE s.enquiry_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in quotations.enquiry_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.transfers s
  JOIN public.branches t ON t.id = s.from_branch
  WHERE s.from_branch IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in transfers.from_branch', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.transfers s
  JOIN public.branches t ON t.id = s.to_branch
  WHERE s.to_branch IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in transfers.to_branch', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in trips.customer_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in trips.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.enquiries t ON t.id = s.enquiry_id
  WHERE s.enquiry_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in trips.enquiry_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.quotations t ON t.id = s.quotation_id
  WHERE s.quotation_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in trips.quotation_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in trips.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.tyres s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in tyres.vehicle_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.vehicles s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in vehicles.driver_id', cnt; END IF;
  SELECT count(*) INTO cnt FROM public.work_orders s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in work_orders.vehicle_id', cnt; END IF;

  -- Check 10: Zero effective privileges (anon/authenticated/PUBLIC/MAINTAIN)
  SELECT array_agg(t||':' ||r||':' ||p) INTO issues FROM (
    SELECT t.t, r.r, p.p FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
    CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)
    WHERE has_table_privilege(r.r, 'public.'||t.t, p.p)) violations;
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [10a]: privileges: %', array_to_string(issues, ', ');
  END IF; issues := NULL;

  IF current_setting('server_version_num')::int >= 170000 THEN
    SELECT array_agg(t||':' ||r||':MAINTAIN') INTO issues FROM (
      SELECT t.t, r.r FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
      CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
      WHERE has_table_privilege(r.r, 'public.'||t.t, 'MAINTAIN')) violations;
    IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
      RAISE EXCEPTION 'PREFLIGHT FAIL [10b]: MAINTAIN: %', array_to_string(issues, ', ');
    END IF; issues := NULL;
  END IF;

  SELECT array_agg(c.relname||':PUBLIC:'||acl.privilege_type) INTO issues
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
  CROSS JOIN LATERAL aclexplode(c.relacl) AS acl WHERE c.relkind='r' AND acl.grantee=0
    AND c.relname IN ('activity_log','approvals','attendance','bank_entries','branches','cash_entries','challans','claims','contracts','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','geofences','gps_devices','indents','inventory','invoices','leave_requests','ledger_accounts','maintenance_records','market_hires','notifications','payments','purchases','quotations','routes','sales','transfers','trips','tyres','vehicles','vendors','work_orders');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [10c]: PUBLIC grants: %', array_to_string(issues, ', ');
  END IF;

  RAISE NOTICE 'PREFLIGHT PASS: all 10 checks passed. Safe to execute Block B.';
END $preflight$;

SELECT 'PREFLIGHT PASS: all 10 checks passed. 34 FKs, 9 UNIQUEs, 12 old FKs verified.' AS result;
