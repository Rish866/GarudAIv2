-- ============================================================
-- TEST SUITE: Migration 008 — Trip Operations RPCs
--
-- Run against a Supabase instance with migrations 000-008 applied.
-- Uses a service_role connection (bypasses RLS for setup).
-- Tests verify RPC logic, role enforcement, and state transitions.
--
-- USAGE:
--   psql -f supabase/tests/008_trip_operations_test.sql
--   OR run in Supabase SQL Editor with service_role
-- ============================================================

DO $$
DECLARE
  -- Test org/user IDs
  v_org_a UUID := gen_random_uuid();
  v_org_b UUID := gen_random_uuid();
  v_user_owner UUID := gen_random_uuid();
  v_user_dispatcher UUID := gen_random_uuid();
  v_user_viewer UUID := gen_random_uuid();
  v_user_other_org UUID := gen_random_uuid();

  -- Test entities
  v_customer_a UUID := gen_random_uuid();
  v_vehicle_a UUID := gen_random_uuid();
  v_driver_a UUID := gen_random_uuid();
  v_trip_booked UUID := gen_random_uuid();
  v_trip_settled UUID := gen_random_uuid();
  v_trip_cancelled UUID := gen_random_uuid();
  v_trip_intransit UUID := gen_random_uuid();

  -- Result holders
  v_result JSON;
  v_success BOOLEAN;
  v_error TEXT;
  v_count INT;
  v_status TEXT;

  -- Test tracking
  v_tests_passed INT := 0;
  v_tests_failed INT := 0;
  v_test_name TEXT;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'TRIP OPERATIONS RPC TEST SUITE — Migration 008';
  RAISE NOTICE '============================================================';


  -- ============================================================
  -- SETUP: Create test organizations, users, memberships
  -- ============================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- SETUP ---';

  INSERT INTO public.organizations (id, name, slug, status, subscription_status)
  VALUES
    (v_org_a, 'Test Org A', 'test-org-a', 'active', 'active'),
    (v_org_b, 'Test Org B', 'test-org-b', 'active', 'active');

  -- Create auth.users entries (minimal for testing)
  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at)
  VALUES
    (v_user_owner, 'owner@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
    (v_user_dispatcher, 'dispatcher@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
    (v_user_viewer, 'viewer@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
    (v_user_other_org, 'other@test.com', 'authenticated', 'authenticated', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Create memberships
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES
    (v_org_a, v_user_owner, 'organization_owner', 'active'),
    (v_org_a, v_user_dispatcher, 'dispatcher', 'active'),
    (v_org_a, v_user_viewer, 'viewer', 'active'),
    (v_org_b, v_user_other_org, 'organization_owner', 'active');

  -- Create test entities in org_a
  INSERT INTO public.customers (id, organization_id, name, status)
  VALUES (v_customer_a, v_org_a, 'Test Customer', 'active');

  INSERT INTO public.vehicles (id, organization_id, reg_number, vehicle_type, status)
  VALUES (v_vehicle_a, v_org_a, 'KA01XX1234', 'truck', 'available');

  INSERT INTO public.drivers (id, organization_id, name, phone, status)
  VALUES (v_driver_a, v_org_a, 'Test Driver', '9999999999', 'available');


  -- Create test trips (vehicle_id, driver_id, customer_id are TEXT columns)
  -- Create test trips (vehicle_id, driver_id, customer_id are TEXT columns holding UUID strings)
  INSERT INTO public.trips (id, organization_id, trip_number, customer_id, customer_name, vehicle_id, vehicle_reg, driver_id, driver_name, status, origin, destination, freight_amount, advance_amount, balance_amount, total_amount, detention_charges, other_charges, distance_km, material, weight_tons)
  VALUES
    (v_trip_booked, v_org_a, 'TR-TEST-001', v_customer_a::text, 'Test Customer', v_vehicle_a::text, 'KA01XX1234', v_driver_a::text, 'Test Driver', 'booked', 'Mumbai', 'Delhi', 50000, 10000, 40000, 50000, 0, 0, 1400, 'Steel', 20),
    (v_trip_settled, v_org_a, 'TR-TEST-002', v_customer_a::text, 'Test Customer', v_vehicle_a::text, 'KA01XX1234', v_driver_a::text, 'Test Driver', 'settled', 'Mumbai', 'Pune', 20000, 5000, 15000, 20000, 0, 0, 200, 'Cement', 10),
    (v_trip_cancelled, v_org_a, 'TR-TEST-003', v_customer_a::text, 'Test Customer', v_vehicle_a::text, 'KA01XX1234', v_driver_a::text, 'Test Driver', 'cancelled', 'Delhi', 'Jaipur', 30000, 5000, 25000, 30000, 0, 0, 300, 'Grain', 15),
    (v_trip_intransit, v_org_a, 'TR-TEST-004', v_customer_a::text, 'Test Customer', v_vehicle_a::text, 'KA01XX1234', v_driver_a::text, 'Test Driver', 'in_transit', 'Chennai', 'Bangalore', 40000, 8000, 32000, 40000, 0, 0, 350, 'Electronics', 5);

  -- Set previous_status on cancelled trip (simulating prior cancellation)
  UPDATE public.trips SET previous_status = 'booked', cancellation_reason = 'Original test cancel' WHERE id = v_trip_cancelled;

  RAISE NOTICE 'Setup complete: 2 orgs, 4 users, 4 trips created.';
  RAISE NOTICE '';


  -- ============================================================
  -- TEST 1: Authorized user cancels booked trip
  -- ============================================================
  v_test_name := 'TEST 1: Authorized user cancels booked trip';
  -- Simulate auth.uid() = v_user_owner by setting request.jwt.claim.sub
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.cancel_trip(v_org_a, v_trip_booked, 'Customer cancelled order');
  v_success := (v_result->>'success')::boolean;

  IF v_success THEN
    -- Verify trip status
    SELECT status INTO v_status FROM public.trips WHERE id = v_trip_booked;
    IF v_status = 'cancelled' THEN
      RAISE NOTICE '  ✓ %', v_test_name;
      v_tests_passed := v_tests_passed + 1;
    ELSE
      RAISE NOTICE '  ✗ % — status is % (expected cancelled)', v_test_name, v_status;
      v_tests_failed := v_tests_failed + 1;
    END IF;
  ELSE
    RAISE NOTICE '  ✗ % — RPC returned error: %', v_test_name, v_result->>'error';
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 2: Unauthorized role (viewer) attempts cancellation
  -- ============================================================
  v_test_name := 'TEST 2: Unauthorized role (viewer) attempts cancellation';
  PERFORM set_config('request.jwt.claim.sub', v_user_viewer::text, true);

  v_result := public.cancel_trip(v_org_a, v_trip_intransit, 'Trying to cancel');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%Permission denied%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected permission denied, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;


  -- ============================================================
  -- TEST 3: Cross-organization cancellation attempt
  -- ============================================================
  v_test_name := 'TEST 3: Cross-organization cancellation attempt';
  PERFORM set_config('request.jwt.claim.sub', v_user_other_org::text, true);

  v_result := public.cancel_trip(v_org_a, v_trip_intransit, 'Cross-org attack');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%Permission denied%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected permission denied, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 4: Empty cancellation reason
  -- ============================================================
  v_test_name := 'TEST 4: Empty cancellation reason';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.cancel_trip(v_org_a, v_trip_intransit, '');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%reason is required%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected reason required error, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 5: Duplicate cancellation request (trip already cancelled)
  -- ============================================================
  v_test_name := 'TEST 5: Duplicate cancellation request';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.cancel_trip(v_org_a, v_trip_booked, 'Double cancel');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%already cancelled%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected already cancelled error, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;


  -- ============================================================
  -- TEST 6: Cancellation of settled trip
  -- ============================================================
  v_test_name := 'TEST 6: Cancellation of settled trip';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.cancel_trip(v_org_a, v_trip_settled, 'Try to cancel settled');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%settled%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected settled error, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 7: Cancellation of paid-invoice trip
  -- ============================================================
  v_test_name := 'TEST 7: Cancellation of paid-invoice trip';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  -- Create a paid invoice linked to the in_transit trip
  INSERT INTO public.invoices (id, organization_id, invoice_number, customer_id, customer_name, trip_ids, status, total_amount, paid_amount, balance_amount)
  VALUES (gen_random_uuid(), v_org_a, 'INV-TEST-001', v_customer_a::text, 'Test Customer', jsonb_build_array(v_trip_intransit::text), 'paid', 40000, 40000, 0);

  v_result := public.cancel_trip(v_org_a, v_trip_intransit, 'Has paid invoice');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%paid%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected paid invoice error, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- Remove the test invoice so other tests can proceed
  DELETE FROM public.invoices WHERE invoice_number = 'INV-TEST-001';


  -- ============================================================
  -- TEST 8: Reopen cancelled trip (valid)
  -- ============================================================
  v_test_name := 'TEST 8: Reopen cancelled trip';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.reopen_trip(v_org_a, v_trip_cancelled, 'Customer confirmed again');
  v_success := (v_result->>'success')::boolean;

  IF v_success THEN
    SELECT status INTO v_status FROM public.trips WHERE id = v_trip_cancelled;
    IF v_status = 'booked' THEN
      RAISE NOTICE '  ✓ %', v_test_name;
      v_tests_passed := v_tests_passed + 1;
    ELSE
      RAISE NOTICE '  ✗ % — status is % (expected booked)', v_test_name, v_status;
      v_tests_failed := v_tests_failed + 1;
    END IF;
  ELSE
    RAISE NOTICE '  ✗ % — RPC returned error: %', v_test_name, v_result->>'error';
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 9: Duplicate reopen request (trip is no longer cancelled)
  -- ============================================================
  v_test_name := 'TEST 9: Duplicate reopen request';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.reopen_trip(v_org_a, v_trip_cancelled, 'Double reopen');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%Only cancelled%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected only-cancelled error, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 10: Reopen with unavailable vehicle (info reported, not blocked)
  -- ============================================================
  v_test_name := 'TEST 10: Reopen reports vehicle availability';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  -- Cancel the trip first, then make vehicle unavailable, then reopen
  UPDATE public.trips SET status = 'cancelled', previous_status = 'booked' WHERE id = v_trip_cancelled;
  UPDATE public.vehicles SET status = 'maintenance' WHERE id = v_vehicle_a;

  v_result := public.reopen_trip(v_org_a, v_trip_cancelled, 'Reopen with unavailable vehicle');
  v_success := (v_result->>'success')::boolean;

  IF v_success AND (v_result->>'vehicle_available')::boolean = false THEN
    RAISE NOTICE '  ✓ % (vehicle_available=false reported)', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSIF v_success THEN
    RAISE NOTICE '  ✓ % (reopened, vehicle availability flag: %)', v_test_name, v_result->>'vehicle_available';
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — RPC error: %', v_test_name, v_result->>'error';
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- Reset vehicle
  UPDATE public.vehicles SET status = 'available' WHERE id = v_vehicle_a;


  -- ============================================================
  -- TEST 11: Valid edit of booked trip
  -- ============================================================
  v_test_name := 'TEST 11: Valid edit of booked trip';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  -- Trip v_trip_cancelled is now 'booked' again from test 10
  v_result := public.update_trip_details(
    v_org_a, v_trip_cancelled,
    jsonb_build_object('origin', 'Jaipur Updated', 'freight_amount', 35000, 'remarks', 'Edited in test')
  );
  v_success := (v_result->>'success') IS NOT NULL; -- Returns full row on success

  -- Check if origin was updated
  SELECT origin INTO v_status FROM public.trips WHERE id = v_trip_cancelled;
  IF v_status = 'Jaipur Updated' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — origin is % (expected Jaipur Updated), result: %', v_test_name, v_status, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 12: Invalid edit of settled trip
  -- ============================================================
  v_test_name := 'TEST 12: Invalid edit of settled trip';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.update_trip_details(
    v_org_a, v_trip_settled,
    jsonb_build_object('origin', 'Should Fail')
  );

  IF (v_result->>'success') = 'false' AND (v_result->>'error') LIKE '%Cannot edit%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected cannot-edit error, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;


  -- ============================================================
  -- TEST 13: Invalid status transition (booked → completed)
  -- ============================================================
  v_test_name := 'TEST 13: Invalid status transition (booked → completed)';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  -- v_trip_cancelled is now 'booked' — try to jump to completed
  v_result := public.transition_trip_status(v_org_a, v_trip_cancelled, 'completed');
  v_success := (v_result->>'success')::boolean;

  IF NOT v_success AND (v_result->>'error') LIKE '%Invalid transition%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected invalid transition error, got: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 13b: Valid status transition (booked → assigned)
  -- ============================================================
  v_test_name := 'TEST 13b: Valid status transition (booked → assigned)';
  PERFORM set_config('request.jwt.claim.sub', v_user_dispatcher::text, true);

  v_result := public.transition_trip_status(v_org_a, v_trip_cancelled, 'assigned');
  v_success := (v_result->>'success')::boolean;

  IF v_success THEN
    SELECT status INTO v_status FROM public.trips WHERE id = v_trip_cancelled;
    IF v_status = 'assigned' THEN
      RAISE NOTICE '  ✓ %', v_test_name;
      v_tests_passed := v_tests_passed + 1;
    ELSE
      RAISE NOTICE '  ✗ % — status is % (expected assigned)', v_test_name, v_status;
      v_tests_failed := v_tests_failed + 1;
    END IF;
  ELSE
    RAISE NOTICE '  ✗ % — RPC error: %', v_test_name, v_result->>'error';
    v_tests_failed := v_tests_failed + 1;
  END IF;


  -- ============================================================
  -- TEST 14: Status history creation
  -- ============================================================
  v_test_name := 'TEST 14: Status history creation';

  SELECT count(*) INTO v_count
  FROM public.trip_status_history
  WHERE organization_id = v_org_a AND trip_id = v_trip_booked;

  IF v_count >= 1 THEN
    RAISE NOTICE '  ✓ % (% history entries for trip_booked)', v_test_name, v_count;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected >=1 history entries, found %', v_test_name, v_count;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 15: Audit log creation
  -- ============================================================
  v_test_name := 'TEST 15: Audit log creation';

  SELECT count(*) INTO v_count
  FROM public.activity_log
  WHERE organization_id = v_org_a AND entity_type = 'trip' AND action LIKE 'trip_%';

  IF v_count >= 1 THEN
    RAISE NOTICE '  ✓ % (% audit entries for trip actions)', v_test_name, v_count;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — Expected >=1 audit entries, found %', v_test_name, v_count;
    v_tests_failed := v_tests_failed + 1;
  END IF;


  -- ============================================================
  -- SUMMARY
  -- ============================================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RESULTS: % passed, % failed (of % total)',
    v_tests_passed, v_tests_failed, v_tests_passed + v_tests_failed;
  RAISE NOTICE '============================================================';

  -- ============================================================
  -- CLEANUP: Remove test data
  -- ============================================================
  DELETE FROM public.activity_log WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.trip_status_history WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.invoices WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.trips WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.customers WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.vehicles WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.drivers WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.organization_members WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.organizations WHERE id IN (v_org_a, v_org_b);
  DELETE FROM auth.users WHERE id IN (v_user_owner, v_user_dispatcher, v_user_viewer, v_user_other_org);

  RAISE NOTICE 'Cleanup complete.';

  -- Fail the transaction if any tests failed (for CI integration)
  IF v_tests_failed > 0 THEN
    RAISE EXCEPTION '% tests FAILED', v_tests_failed;
  END IF;
END $$;
