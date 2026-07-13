-- migration-005-D-transactional-tests.sql
-- Migration 005 Transactional DML Validation
-- Target: staging ybuhazlnjqjrshcvpuna
-- NOT read-only. Creates minimal test data, exercises composite FKs,
-- and automatically rolls back via exception-backed subtransaction.
-- Run ONLY after Block C passes and operator confirms.
-- Design: outer DO block captures baselines, inner BEGIN/EXCEPTION block
-- performs all DML then intentionally raises to trigger rollback.
-- Post-block SELECT compares current counts to baselines.
-- No temp tables needed — baselines stored in PL/pgSQL variables.

DO $wrapper$
DECLARE
  -- Baseline counts (captured before any test DML)
  b_organizations BIGINT; b_customers BIGINT; b_drivers BIGINT;
  b_vehicles BIGINT; b_trips BIGINT; b_enquiries BIGINT;
  b_quotations BIGINT; b_invoices BIGINT; b_vendors BIGINT;
  b_branches BIGINT; b_expenses BIGINT;
  -- Post-rollback counts
  a_organizations BIGINT; a_customers BIGINT; a_drivers BIGINT;
  a_vehicles BIGINT; a_trips BIGINT; a_enquiries BIGINT;
  a_quotations BIGINT; a_invoices BIGINT; a_vendors BIGINT;
  a_branches BIGINT; a_expenses BIGINT;
  -- Test variables
  org_a UUID := gen_random_uuid();
  org_b UUID := gen_random_uuid();
  cust_a UUID := gen_random_uuid();
  drv_a UUID := gen_random_uuid();
  veh_a UUID := gen_random_uuid();
  trip_a UUID := gen_random_uuid();
  enq_a UUID := gen_random_uuid();
  quot_a UUID := gen_random_uuid();
  inv_a UUID := gen_random_uuid();
  vendor_a UUID := gen_random_uuid();
  branch_a UUID := gen_random_uuid();
  cust_b UUID := gen_random_uuid();
  nonexist UUID := gen_random_uuid();
  violation_caught BOOLEAN;
  mismatches TEXT[];
BEGIN
  -- Record baselines
  SELECT count(*) INTO b_organizations FROM public.organizations;
  SELECT count(*) INTO b_customers FROM public.customers;
  SELECT count(*) INTO b_drivers FROM public.drivers;
  SELECT count(*) INTO b_vehicles FROM public.vehicles;
  SELECT count(*) INTO b_trips FROM public.trips;
  SELECT count(*) INTO b_enquiries FROM public.enquiries;
  SELECT count(*) INTO b_quotations FROM public.quotations;
  SELECT count(*) INTO b_invoices FROM public.invoices;
  SELECT count(*) INTO b_vendors FROM public.vendors;
  SELECT count(*) INTO b_branches FROM public.branches;
  SELECT count(*) INTO b_expenses FROM public.expenses;

  -- Inner subtransaction: all test DML rolls back on the intentional RAISE
  BEGIN
    -- Setup
    INSERT INTO public.organizations (id, name) VALUES (org_a, 'Test Org A'), (org_b, 'Test Org B');
    INSERT INTO public.customers (id, organization_id, name) VALUES (cust_a, org_a, 'Cust A');
    INSERT INTO public.drivers (id, organization_id, name) VALUES (drv_a, org_a, 'Driver A');
    INSERT INTO public.vehicles (id, organization_id, reg_number) VALUES (veh_a, org_a, 'KA01XX1234');
    INSERT INTO public.trips (id, organization_id, customer_id, status, trip_number) VALUES (trip_a, org_a, cust_a, 'booked', 'TR-TEST1');
    INSERT INTO public.enquiries (id, organization_id, customer_id, status) VALUES (enq_a, org_a, cust_a, 'new');
    INSERT INTO public.quotations (id, organization_id, customer_id, enquiry_id, status, quotation_number) VALUES (quot_a, org_a, cust_a, enq_a, 'draft', 'QT-TEST1');
    INSERT INTO public.invoices (id, organization_id, customer_id, invoice_number, status) VALUES (inv_a, org_a, cust_a, 'INV-TEST1', 'draft');
    INSERT INTO public.vendors (id, organization_id, name) VALUES (vendor_a, org_a, 'Vendor A');
    INSERT INTO public.branches (id, organization_id, name) VALUES (branch_a, org_a, 'Branch A');
    INSERT INTO public.customers (id, organization_id, name) VALUES (cust_b, org_b, 'Cust B');

    -- TEST 1: Same-organization reference SUCCEEDS
    INSERT INTO public.expenses (id, organization_id, trip_id, vehicle_id, amount, category)
      VALUES (gen_random_uuid(), org_a, trip_a, veh_a, 1000, 'fuel');
    RAISE NOTICE 'TEST 1 PASS: same-org reference succeeds';

    -- TEST 2: Cross-organization reference raises foreign_key_violation
    violation_caught := FALSE;
    BEGIN
      INSERT INTO public.trips (id, organization_id, customer_id, status, trip_number)
        VALUES (gen_random_uuid(), org_a, cust_b, 'booked', 'TR-XORG');
    EXCEPTION WHEN foreign_key_violation THEN violation_caught := TRUE;
    END;
    IF NOT violation_caught THEN RAISE EXCEPTION 'TEST 2 FAIL: cross-org not rejected'; END IF;
    RAISE NOTICE 'TEST 2 PASS: cross-org reference correctly rejected';

    -- TEST 3: Nonexistent reference raises foreign_key_violation
    violation_caught := FALSE;
    BEGIN
      INSERT INTO public.expenses (id, organization_id, trip_id, amount, category)
        VALUES (gen_random_uuid(), org_a, nonexist, 500, 'misc');
    EXCEPTION WHEN foreign_key_violation THEN violation_caught := TRUE;
    END;
    IF NOT violation_caught THEN RAISE EXCEPTION 'TEST 3 FAIL: nonexistent not rejected'; END IF;
    RAISE NOTICE 'TEST 3 PASS: nonexistent reference correctly rejected';

    -- TEST 4: NULL optional reference succeeds (MATCH SIMPLE)
    INSERT INTO public.expenses (id, organization_id, trip_id, vehicle_id, amount, category)
      VALUES (gen_random_uuid(), org_a, NULL, NULL, 200, 'misc');
    RAISE NOTICE 'TEST 4 PASS: NULL optional reference succeeds';

    -- TEST 5: Circular vehicles<->drivers established in stages
    UPDATE public.vehicles SET driver_id = drv_a WHERE id = veh_a;
    UPDATE public.drivers SET assigned_vehicle_id = veh_a WHERE id = drv_a;
    RAISE NOTICE 'TEST 5 PASS: circular vehicles<->drivers established';

    -- TEST 6: Cross-org circular link is rejected
    violation_caught := FALSE;
    BEGIN
      INSERT INTO public.vehicles (id, organization_id, reg_number) VALUES (gen_random_uuid(), org_b, 'KA02ZZ9999');
      UPDATE public.drivers SET assigned_vehicle_id = (SELECT id FROM public.vehicles WHERE reg_number = 'KA02ZZ9999') WHERE id = drv_a;
    EXCEPTION WHEN foreign_key_violation THEN violation_caught := TRUE;
    END;
    IF NOT violation_caught THEN RAISE EXCEPTION 'TEST 6 FAIL: cross-org circular not rejected'; END IF;
    RAISE NOTICE 'TEST 6 PASS: cross-org circular link correctly rejected';

    RAISE NOTICE 'ALL 6 TRANSACTIONAL TESTS PASSED';

    -- Intentionally raise to roll back all test DML
    RAISE EXCEPTION '_m005_deliberate_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM != '_m005_deliberate_rollback' THEN
      RAISE;  -- Re-raise unexpected errors
    END IF;
    -- Deliberate rollback: subtransaction DML is undone
  END;

  -- Verify row counts match baselines (subtransaction rolled back)
  SELECT count(*) INTO a_organizations FROM public.organizations;
  SELECT count(*) INTO a_customers FROM public.customers;
  SELECT count(*) INTO a_drivers FROM public.drivers;
  SELECT count(*) INTO a_vehicles FROM public.vehicles;
  SELECT count(*) INTO a_trips FROM public.trips;
  SELECT count(*) INTO a_enquiries FROM public.enquiries;
  SELECT count(*) INTO a_quotations FROM public.quotations;
  SELECT count(*) INTO a_invoices FROM public.invoices;
  SELECT count(*) INTO a_vendors FROM public.vendors;
  SELECT count(*) INTO a_branches FROM public.branches;
  SELECT count(*) INTO a_expenses FROM public.expenses;

  mismatches := ARRAY[]::TEXT[];
  IF a_organizations != b_organizations THEN mismatches := mismatches || ('organizations: ' || b_organizations || '->' || a_organizations); END IF;
  IF a_customers != b_customers THEN mismatches := mismatches || ('customers: ' || b_customers || '->' || a_customers); END IF;
  IF a_drivers != b_drivers THEN mismatches := mismatches || ('drivers: ' || b_drivers || '->' || a_drivers); END IF;
  IF a_vehicles != b_vehicles THEN mismatches := mismatches || ('vehicles: ' || b_vehicles || '->' || a_vehicles); END IF;
  IF a_trips != b_trips THEN mismatches := mismatches || ('trips: ' || b_trips || '->' || a_trips); END IF;
  IF a_enquiries != b_enquiries THEN mismatches := mismatches || ('enquiries: ' || b_enquiries || '->' || a_enquiries); END IF;
  IF a_quotations != b_quotations THEN mismatches := mismatches || ('quotations: ' || b_quotations || '->' || a_quotations); END IF;
  IF a_invoices != b_invoices THEN mismatches := mismatches || ('invoices: ' || b_invoices || '->' || a_invoices); END IF;
  IF a_vendors != b_vendors THEN mismatches := mismatches || ('vendors: ' || b_vendors || '->' || a_vendors); END IF;
  IF a_branches != b_branches THEN mismatches := mismatches || ('branches: ' || b_branches || '->' || a_branches); END IF;
  IF a_expenses != b_expenses THEN mismatches := mismatches || ('expenses: ' || b_expenses || '->' || a_expenses); END IF;

  IF array_length(mismatches, 1) > 0 THEN
    RAISE EXCEPTION 'D_ROLLBACK FAIL: row counts changed: %', array_to_string(mismatches, ', ');
  END IF;
  RAISE NOTICE 'D_ROLLBACK PASS: all 11 table counts match baselines';
END $wrapper$;

-- Final confirmation (always reached if DO block succeeds)
SELECT 'D_ROLLBACK' AS check_id, 'row_counts_match_baselines' AS check_name, 'PASS' AS result;
