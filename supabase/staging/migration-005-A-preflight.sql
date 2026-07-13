-- migration-005-A-preflight.sql
-- Migration 005 Preflight: Same-organization relational integrity prerequisites
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: raises exception on failure, emits PASS on success
-- Checks (9 total):
--   1. Source columns are UUID type
--   2. Target columns (id) are UUID type
--   3. organization_id is UUID NOT NULL on all source and target tables
--   4. Old simple FKs exist (for existing_uuid_fk category)
--   5. No conflicting composite FK constraints already present
--   6. No conflicting UNIQUE(organization_id, id) constraints already present
--   7. Zero dangling references (ref_id exists in target table)
--   8. Zero cross-organization references
--   9. Zero effective privileges for anon/authenticated/PUBLIC including MAINTAIN

DO $preflight$
DECLARE
  issues TEXT[];
  cnt BIGINT;
BEGIN

  -- Check 1: All 34 source columns are UUID type
  SELECT array_agg(t || '.' || c) INTO issues
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
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = expected.t
      AND column_name = expected.c AND udt_name = 'uuid'
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: source columns not UUID: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 2: All target table id columns are UUID type
  SELECT array_agg(t) INTO issues
  FROM unnest(ARRAY['branches','customers','drivers','enquiries','invoices','quotations','trips','vehicles','vendors']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t
      AND column_name = 'id' AND udt_name = 'uuid'
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: target id not UUID: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 3: organization_id is UUID NOT NULL on all involved tables
  SELECT array_agg(t || ':' || COALESCE(udt_name, 'MISSING') || ':' || COALESCE(is_nullable, '?')) INTO issues
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

  -- Check 4: Old simple FKs exist (to be replaced)
  SELECT array_agg(expected_name) INTO issues
  FROM (VALUES
    ('attendance_employee_id_fkey'),
    ('challans_driver_id_fkey'),
    ('challans_vehicle_id_fkey'),
    ('claims_trip_id_fkey'),
    ('contracts_customer_id_fkey'),
    ('gps_devices_vehicle_id_fkey'),
    ('indents_customer_id_fkey'),
    ('indents_trip_id_fkey'),
    ('leave_requests_employee_id_fkey'),
    ('transfers_from_branch_fkey'),
    ('transfers_to_branch_fkey'),
    ('work_orders_vehicle_id_fkey')
  ) AS expected(expected_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND conname = expected.expected_name
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: expected simple FKs missing: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 5: No conflicting composite FK constraints already present
  SELECT array_agg(conname) INTO issues
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace
    AND conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: composite FKs already exist: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 6: No conflicting UNIQUE(organization_id, id) constraints
  SELECT array_agg(conname) INTO issues
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace
    AND conname IN ('uq_branches_org_id','uq_customers_org_id','uq_drivers_org_id','uq_enquiries_org_id','uq_invoices_org_id','uq_quotations_org_id','uq_trips_org_id','uq_vehicles_org_id','uq_vendors_org_id');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: UNIQUE constraints already exist: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 7: Zero dangling references (staging is empty, but verify)
  SELECT count(*) INTO cnt FROM public.attendance s
  WHERE s.employee_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.employee_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in attendance.employee_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.challans s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in challans.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.challans s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in challans.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.claims s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in claims.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.contracts s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in contracts.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.drivers s
  WHERE s.assigned_vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.assigned_vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in drivers.assigned_vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.enquiries s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in enquiries.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.eway_bills s
  WHERE s.transporter_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vendors t WHERE t.id = s.transporter_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in eway_bills.transporter_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.eway_bills s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in eway_bills.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.expenses s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in expenses.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.expenses s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in expenses.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.fuel_entries s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in fuel_entries.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.fuel_entries s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in fuel_entries.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.fuel_entries s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in fuel_entries.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.gps_devices s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in gps_devices.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.indents s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in indents.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.indents s
  WHERE s.trip_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.trips t WHERE t.id = s.trip_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in indents.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.invoices s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in invoices.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.leave_requests s
  WHERE s.employee_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.employee_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in leave_requests.employee_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.maintenance_records s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in maintenance_records.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.payments s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in payments.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.payments s
  WHERE s.invoice_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.invoices t WHERE t.id = s.invoice_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in payments.invoice_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.quotations s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in quotations.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.quotations s
  WHERE s.enquiry_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.enquiries t WHERE t.id = s.enquiry_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in quotations.enquiry_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.transfers s
  WHERE s.from_branch IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.branches t WHERE t.id = s.from_branch);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in transfers.from_branch', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.transfers s
  WHERE s.to_branch IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.branches t WHERE t.id = s.to_branch);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in transfers.to_branch', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.customers t WHERE t.id = s.customer_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in trips.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in trips.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.enquiry_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.enquiries t WHERE t.id = s.enquiry_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in trips.enquiry_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.quotation_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.quotations t WHERE t.id = s.quotation_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in trips.quotation_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in trips.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.tyres s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in tyres.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.vehicles s
  WHERE s.driver_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.drivers t WHERE t.id = s.driver_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in vehicles.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.work_orders s
  WHERE s.vehicle_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.vehicles t WHERE t.id = s.vehicle_id);
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in work_orders.vehicle_id', cnt;
  END IF;

  -- Check 8: Zero cross-organization references
  SELECT count(*) INTO cnt FROM public.attendance s
  JOIN public.drivers t ON t.id = s.employee_id
  WHERE s.employee_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in attendance.employee_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.challans s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in challans.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.challans s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in challans.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.claims s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in claims.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.contracts s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in contracts.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.drivers s
  JOIN public.vehicles t ON t.id = s.assigned_vehicle_id
  WHERE s.assigned_vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in drivers.assigned_vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.enquiries s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in enquiries.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.eway_bills s
  JOIN public.vendors t ON t.id = s.transporter_id
  WHERE s.transporter_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in eway_bills.transporter_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.eway_bills s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in eway_bills.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.expenses s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in expenses.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.expenses s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in expenses.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.fuel_entries s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in fuel_entries.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.fuel_entries s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in fuel_entries.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.fuel_entries s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in fuel_entries.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.gps_devices s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in gps_devices.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.indents s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in indents.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.indents s
  JOIN public.trips t ON t.id = s.trip_id
  WHERE s.trip_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in indents.trip_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.invoices s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in invoices.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.leave_requests s
  JOIN public.drivers t ON t.id = s.employee_id
  WHERE s.employee_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in leave_requests.employee_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.maintenance_records s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in maintenance_records.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.payments s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in payments.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.payments s
  JOIN public.invoices t ON t.id = s.invoice_id
  WHERE s.invoice_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in payments.invoice_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.quotations s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in quotations.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.quotations s
  JOIN public.enquiries t ON t.id = s.enquiry_id
  WHERE s.enquiry_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in quotations.enquiry_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.transfers s
  JOIN public.branches t ON t.id = s.from_branch
  WHERE s.from_branch IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in transfers.from_branch', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.transfers s
  JOIN public.branches t ON t.id = s.to_branch
  WHERE s.to_branch IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in transfers.to_branch', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.customers t ON t.id = s.customer_id
  WHERE s.customer_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in trips.customer_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in trips.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.enquiries t ON t.id = s.enquiry_id
  WHERE s.enquiry_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in trips.enquiry_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.quotations t ON t.id = s.quotation_id
  WHERE s.quotation_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in trips.quotation_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.trips s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in trips.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.tyres s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in tyres.vehicle_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.vehicles s
  JOIN public.drivers t ON t.id = s.driver_id
  WHERE s.driver_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in vehicles.driver_id', cnt;
  END IF;

  SELECT count(*) INTO cnt FROM public.work_orders s
  JOIN public.vehicles t ON t.id = s.vehicle_id
  WHERE s.vehicle_id IS NOT NULL AND s.organization_id != t.organization_id;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in work_orders.vehicle_id', cnt;
  END IF;

  -- Check 9: Zero effective privileges for anon/authenticated/PUBLIC including MAINTAIN
  SELECT array_agg(t || ':' || r || ':' || p) INTO issues
  FROM (
    SELECT t.t, r.r, p.p
    FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
    CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)
    WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)
  ) violations;
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [9a]: effective privileges found: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  IF current_setting('server_version_num')::int >= 170000 THEN
    SELECT array_agg(t || ':' || r || ':MAINTAIN') INTO issues
    FROM (
      SELECT t.t, r.r
      FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
      CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
      WHERE has_table_privilege(r.r, 'public.' || t.t, 'MAINTAIN')
    ) violations;
    IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
      RAISE EXCEPTION 'PREFLIGHT FAIL [9b]: MAINTAIN privileges found: %', array_to_string(issues, ', ');
    END IF;
    issues := NULL;
  END IF;

  SELECT array_agg(c.relname || ':PUBLIC:' || acl.privilege_type) INTO issues
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
  WHERE c.relkind = 'r' AND acl.grantee = 0
    AND c.relname IN ('activity_log','approvals','attendance','bank_entries','branches','cash_entries','challans','claims','contracts','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','geofences','gps_devices','indents','inventory','invoices','leave_requests','ledger_accounts','maintenance_records','market_hires','notifications','payments','purchases','quotations','routes','sales','transfers','trips','tyres','vehicles','vendors','work_orders');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [9c]: PUBLIC grants found: %', array_to_string(issues, ', ');
  END IF;

  RAISE NOTICE 'PREFLIGHT PASS: all 9 checks passed. Safe to execute Block B.';
END $preflight$;

SELECT 'PREFLIGHT PASS: all 9 checks passed. 34 composite FKs ready, 9 UNIQUE constraints ready, 12 old FKs verified.' AS result;
