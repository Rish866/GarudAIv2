-- migration-005-D-transactional-tests.sql
-- Migration 005 Transactional DML Validation
-- Target: staging ybuhazlnjqjrshcvpuna
-- NOT read-only. Creates minimal test data, exercises composite FKs,
-- and ALWAYS rolls back. Run ONLY after Block C passes and operator confirms.
-- Expected: All assertions pass, zero rows remain after ROLLBACK.

BEGIN;

-- Record baseline row counts BEFORE test data (do not assume zero)
CREATE TEMP TABLE _m005_baselines(tbl TEXT PRIMARY KEY, cnt BIGINT);
INSERT INTO _m005_baselines VALUES ('organizations',(SELECT count(*) FROM public.organizations));
INSERT INTO _m005_baselines VALUES ('customers',(SELECT count(*) FROM public.customers));
INSERT INTO _m005_baselines VALUES ('drivers',(SELECT count(*) FROM public.drivers));
INSERT INTO _m005_baselines VALUES ('vehicles',(SELECT count(*) FROM public.vehicles));
INSERT INTO _m005_baselines VALUES ('trips',(SELECT count(*) FROM public.trips));
INSERT INTO _m005_baselines VALUES ('enquiries',(SELECT count(*) FROM public.enquiries));
INSERT INTO _m005_baselines VALUES ('quotations',(SELECT count(*) FROM public.quotations));
INSERT INTO _m005_baselines VALUES ('invoices',(SELECT count(*) FROM public.invoices));
INSERT INTO _m005_baselines VALUES ('vendors',(SELECT count(*) FROM public.vendors));
INSERT INTO _m005_baselines VALUES ('branches',(SELECT count(*) FROM public.branches));
INSERT INTO _m005_baselines VALUES ('expenses',(SELECT count(*) FROM public.expenses));

DO $tests$
DECLARE
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
BEGIN

  -- ============================================================
  -- Setup: create minimal test organizations and entities
  -- ============================================================
  INSERT INTO public.organizations (id, name) VALUES (org_a, 'Test Org A'), (org_b, 'Test Org B');

  -- Org A entities (target tables for FK references)
  INSERT INTO public.customers (id, organization_id, name) VALUES (cust_a, org_a, 'Cust A');
  INSERT INTO public.drivers (id, organization_id, name) VALUES (drv_a, org_a, 'Driver A');
  INSERT INTO public.vehicles (id, organization_id, reg_number) VALUES (veh_a, org_a, 'KA01XX1234');
  INSERT INTO public.trips (id, organization_id, customer_id, status, trip_number) VALUES (trip_a, org_a, cust_a, 'booked', 'TR-TEST1');
  INSERT INTO public.enquiries (id, organization_id, customer_id, status) VALUES (enq_a, org_a, cust_a, 'new');
  INSERT INTO public.quotations (id, organization_id, customer_id, enquiry_id, status, quotation_number) VALUES (quot_a, org_a, cust_a, enq_a, 'draft', 'QT-TEST1');
  INSERT INTO public.invoices (id, organization_id, customer_id, invoice_number, status) VALUES (inv_a, org_a, cust_a, 'INV-TEST1', 'draft');
  INSERT INTO public.vendors (id, organization_id, name) VALUES (vendor_a, org_a, 'Vendor A');
  INSERT INTO public.branches (id, organization_id, name) VALUES (branch_a, org_a, 'Branch A');

  -- Org B entity (for cross-org test)
  INSERT INTO public.customers (id, organization_id, name) VALUES (cust_b, org_b, 'Cust B');

  -- ============================================================
  -- TEST 1: Same-organization reference SUCCEEDS
  -- ============================================================
  INSERT INTO public.expenses (id, organization_id, trip_id, vehicle_id, amount, category)
    VALUES (gen_random_uuid(), org_a, trip_a, veh_a, 1000, 'fuel');
  RAISE NOTICE 'TEST 1 PASS: same-org reference succeeds';

  -- ============================================================
  -- TEST 2: Cross-organization reference raises foreign_key_violation
  -- ============================================================
  violation_caught := FALSE;
  BEGIN
    -- Try to insert expense in org_a referencing trip in org_b (doesn't exist there)
    -- Actually: insert trip with customer_id pointing to org_b customer
    INSERT INTO public.trips (id, organization_id, customer_id, status, trip_number)
      VALUES (gen_random_uuid(), org_a, cust_b, 'booked', 'TR-XORG');
  EXCEPTION WHEN foreign_key_violation THEN
    violation_caught := TRUE;
  END;
  IF NOT violation_caught THEN
    RAISE EXCEPTION 'TEST 2 FAIL: cross-org reference was NOT rejected';
  END IF;
  RAISE NOTICE 'TEST 2 PASS: cross-org reference correctly rejected';

  -- ============================================================
  -- TEST 3: Nonexistent reference raises foreign_key_violation
  -- ============================================================
  violation_caught := FALSE;
  BEGIN
    INSERT INTO public.expenses (id, organization_id, trip_id, amount, category)
      VALUES (gen_random_uuid(), org_a, nonexist, 500, 'misc');
  EXCEPTION WHEN foreign_key_violation THEN
    violation_caught := TRUE;
  END;
  IF NOT violation_caught THEN
    RAISE EXCEPTION 'TEST 3 FAIL: nonexistent reference was NOT rejected';
  END IF;
  RAISE NOTICE 'TEST 3 PASS: nonexistent reference correctly rejected';

  -- ============================================================
  -- TEST 4: NULL optional reference succeeds (MATCH SIMPLE)
  -- ============================================================
  INSERT INTO public.expenses (id, organization_id, trip_id, vehicle_id, amount, category)
    VALUES (gen_random_uuid(), org_a, NULL, NULL, 200, 'misc');
  RAISE NOTICE 'TEST 4 PASS: NULL optional reference succeeds';

  -- ============================================================
  -- TEST 5: Circular vehicles<->drivers established in stages
  -- ============================================================
  -- Step 1: vehicle exists with driver_id=NULL (already inserted above)
  -- Step 2: driver exists with assigned_vehicle_id=NULL (already inserted above)
  -- Step 3: link vehicle -> driver (same org)
  UPDATE public.vehicles SET driver_id = drv_a WHERE id = veh_a;
  -- Step 4: link driver -> vehicle (same org)
  UPDATE public.drivers SET assigned_vehicle_id = veh_a WHERE id = drv_a;
  RAISE NOTICE 'TEST 5 PASS: circular vehicles<->drivers established';

  -- ============================================================
  -- TEST 6: Cross-org circular link is rejected
  -- ============================================================
  violation_caught := FALSE;
  BEGIN
    -- Try to link driver_a.assigned_vehicle_id to a vehicle in org_b
    INSERT INTO public.vehicles (id, organization_id, reg_number) VALUES (gen_random_uuid(), org_b, 'KA02ZZ9999');
    UPDATE public.drivers SET assigned_vehicle_id = (SELECT id FROM public.vehicles WHERE reg_number = 'KA02ZZ9999') WHERE id = drv_a;
  EXCEPTION WHEN foreign_key_violation THEN
    violation_caught := TRUE;
  END;
  IF NOT violation_caught THEN
    RAISE EXCEPTION 'TEST 6 FAIL: cross-org circular link was NOT rejected';
  END IF;
  RAISE NOTICE 'TEST 6 PASS: cross-org circular link correctly rejected';

  RAISE NOTICE 'ALL 6 TRANSACTIONAL TESTS PASSED';
END $tests$;

-- Always rollback: leaves row counts unchanged
ROLLBACK;

-- Verify row counts match baselines after rollback (proves transactional safety)
SELECT 'D_ROLLBACK' AS check_id, 'row_counts_match_baselines' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: row count changed for: ' || string_agg(tbl || '(baseline=' || baseline || ',now=' || current_cnt || ')', ', ')
  END AS result
FROM (
  SELECT b.tbl, b.cnt AS baseline, CASE b.tbl
    WHEN 'organizations' THEN (SELECT count(*) FROM public.organizations)
    WHEN 'customers' THEN (SELECT count(*) FROM public.customers)
    WHEN 'drivers' THEN (SELECT count(*) FROM public.drivers)
    WHEN 'vehicles' THEN (SELECT count(*) FROM public.vehicles)
    WHEN 'trips' THEN (SELECT count(*) FROM public.trips)
    WHEN 'enquiries' THEN (SELECT count(*) FROM public.enquiries)
    WHEN 'quotations' THEN (SELECT count(*) FROM public.quotations)
    WHEN 'invoices' THEN (SELECT count(*) FROM public.invoices)
    WHEN 'vendors' THEN (SELECT count(*) FROM public.vendors)
    WHEN 'branches' THEN (SELECT count(*) FROM public.branches)
    WHEN 'expenses' THEN (SELECT count(*) FROM public.expenses)
  END AS current_cnt
  FROM _m005_baselines b
) cmp WHERE baseline != current_cnt;

DROP TABLE IF EXISTS _m005_baselines;
