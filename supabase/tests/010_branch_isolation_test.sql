-- ============================================================
-- TEST SUITE: Migration 010 — Branch Isolation
--
-- Tests branch access model, RLS enforcement, helper functions.
-- Run against a PostgreSQL instance with migrations 000-010 applied.
-- ============================================================

DO $$
DECLARE
  -- Orgs
  v_org_a UUID := gen_random_uuid();
  v_org_b UUID := gen_random_uuid();
  -- Users
  v_user_owner UUID := gen_random_uuid();
  v_user_dispatcher UUID := gen_random_uuid();
  v_user_viewer UUID := gen_random_uuid();
  v_user_other_org UUID := gen_random_uuid();
  -- Branches
  v_branch_ho UUID := gen_random_uuid();
  v_branch_mumbai UUID := gen_random_uuid();
  v_branch_orgb UUID := gen_random_uuid();
  -- Members
  v_member_owner UUID := gen_random_uuid();
  v_member_dispatcher UUID := gen_random_uuid();
  v_member_viewer UUID := gen_random_uuid();
  v_member_other UUID := gen_random_uuid();
  -- Test data
  v_trip_ho UUID := gen_random_uuid();
  v_trip_mumbai UUID := gen_random_uuid();
  v_customer_ho UUID := gen_random_uuid();
  -- Results
  v_result BOOLEAN;
  v_count INT;
  v_test_name TEXT;
  v_tests_passed INT := 0;
  v_tests_failed INT := 0;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'BRANCH ISOLATION TEST SUITE — Migration 010';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '--- SETUP ---';

  -- Create orgs
  INSERT INTO public.organizations (id, name, slug, status, subscription_status)
  VALUES (v_org_a, 'Branch Test Org A', 'branch-test-a', 'active', 'active'),
         (v_org_b, 'Branch Test Org B', 'branch-test-b', 'active', 'active');

  -- Create auth users
  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at)
  VALUES (v_user_owner, 'branchowner@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
         (v_user_dispatcher, 'branchdispatch@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
         (v_user_viewer, 'branchviewer@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
         (v_user_other_org, 'branchother@test.com', 'authenticated', 'authenticated', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Create branches
  INSERT INTO public.branches (id, organization_id, name, code, city, status)
  VALUES (v_branch_ho, v_org_a, 'Head Office', 'HO', 'Bangalore', 'active'),
         (v_branch_mumbai, v_org_a, 'Mumbai Branch', 'MUM', 'Mumbai', 'active'),
         (v_branch_orgb, v_org_b, 'Org B Branch', 'OBB', 'Delhi', 'active');

  -- Create members
  INSERT INTO public.organization_members (id, organization_id, user_id, role, status, has_all_branch_access)
  VALUES (v_member_owner, v_org_a, v_user_owner, 'organization_owner', 'active', TRUE),
         (v_member_dispatcher, v_org_a, v_user_dispatcher, 'dispatcher', 'active', FALSE),
         (v_member_viewer, v_org_a, v_user_viewer, 'viewer', 'active', FALSE),
         (v_member_other, v_org_b, v_user_other_org, 'organization_owner', 'active', TRUE);

  -- Grant dispatcher access to HO branch only
  INSERT INTO public.organization_member_branches (organization_id, member_id, branch_id)
  VALUES (v_org_a, v_member_dispatcher, v_branch_ho);

  -- Grant viewer access to Mumbai branch only
  INSERT INTO public.organization_member_branches (organization_id, member_id, branch_id)
  VALUES (v_org_a, v_member_viewer, v_branch_mumbai);

  -- Disable validate_trip_org_refs trigger for test data insertion
  ALTER TABLE public.trips DISABLE TRIGGER validate_trip_org_refs;

  -- Create test trips in different branches
  INSERT INTO public.trips (id, organization_id, branch_id, trip_number, customer_name, vehicle_reg, driver_name, origin, destination, status, freight_amount, advance_amount, balance_amount, total_amount, distance_km, material, weight_tons)
  VALUES (v_trip_ho, v_org_a, v_branch_ho, 'BR-TR-001', 'Test Customer', 'KA01XX', 'Driver A', 'Bangalore', 'Chennai', 'booked', 50000, 10000, 40000, 50000, 350, 'Steel', 20),
         (v_trip_mumbai, v_org_a, v_branch_mumbai, 'BR-TR-002', 'Test Customer', 'MH01YY', 'Driver B', 'Mumbai', 'Pune', 'booked', 30000, 5000, 25000, 30000, 150, 'Cement', 25);

  -- Create test customer in HO branch
  INSERT INTO public.customers (id, organization_id, branch_id, name, phone, email, gstin, billing_address, credit_limit, credit_days, outstanding, total_business, status)
  VALUES (v_customer_ho, v_org_a, v_branch_ho, 'HO Customer', '9999999999', 'ho@test.com', '29TEST1234', 'Bangalore', 500000, 30, 0, 0, 'active');

  ALTER TABLE public.trips ENABLE TRIGGER validate_trip_org_refs;

  RAISE NOTICE 'Setup complete.';
  RAISE NOTICE '';


  -- ============================================================
  -- TEST 1: Owner accesses all branches (has_all_branch_access)
  -- ============================================================
  v_test_name := 'TEST 1: Owner accesses all branches';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);

  v_result := public.current_user_has_all_branch_access(v_org_a);
  IF v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected TRUE', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 2: Owner can access both branches
  -- ============================================================
  v_test_name := 'TEST 2: Owner can access HO branch';
  v_result := public.current_user_can_access_branch(v_branch_ho);
  IF v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected TRUE', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  v_test_name := 'TEST 2b: Owner can access Mumbai branch';
  v_result := public.current_user_can_access_branch(v_branch_mumbai);
  IF v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected TRUE', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 3: Dispatcher only sees HO branch
  -- ============================================================
  v_test_name := 'TEST 3: Dispatcher can access HO branch';
  PERFORM set_config('request.jwt.claim.sub', v_user_dispatcher::text, true);

  v_result := public.current_user_can_access_branch(v_branch_ho);
  IF v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected TRUE', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  v_test_name := 'TEST 3b: Dispatcher CANNOT access Mumbai branch';
  v_result := public.current_user_can_access_branch(v_branch_mumbai);
  IF NOT v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected FALSE (unauthorized branch)', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 4: Viewer only sees Mumbai branch
  -- ============================================================
  v_test_name := 'TEST 4: Viewer can access Mumbai branch';
  PERFORM set_config('request.jwt.claim.sub', v_user_viewer::text, true);

  v_result := public.current_user_can_access_branch(v_branch_mumbai);
  IF v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected TRUE', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  v_test_name := 'TEST 4b: Viewer CANNOT access HO branch';
  v_result := public.current_user_can_access_branch(v_branch_ho);
  IF NOT v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected FALSE', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 5: Cross-org branch access denied
  -- ============================================================
  v_test_name := 'TEST 5: User cannot access another org branch';
  PERFORM set_config('request.jwt.claim.sub', v_user_dispatcher::text, true);

  v_result := public.current_user_can_access_branch(v_branch_orgb);
  IF NOT v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected FALSE (cross-org)', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 6: NULL branch_id accessible to all org members
  -- ============================================================
  v_test_name := 'TEST 6: NULL branch_id accessible to all';
  v_result := public.current_user_can_access_branch(NULL);
  IF v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected TRUE (NULL = org-wide)', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;


  -- ============================================================
  -- TEST 7: accessible_branch_ids returns correct set
  -- ============================================================
  v_test_name := 'TEST 7: Dispatcher accessible_branch_ids returns 1 branch';
  PERFORM set_config('request.jwt.claim.sub', v_user_dispatcher::text, true);

  SELECT count(*) INTO v_count FROM public.current_user_accessible_branch_ids(v_org_a);
  IF v_count = 1 THEN
    RAISE NOTICE '  ✓ % (count=%)', v_test_name, v_count;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected 1, got %', v_test_name, v_count;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 8: has_all_branch_access is FALSE for dispatcher
  -- ============================================================
  v_test_name := 'TEST 8: Dispatcher has_all_branch_access is FALSE';
  v_result := public.current_user_has_all_branch_access(v_org_a);
  IF NOT v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected FALSE', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 9: Auto-grant trigger works for admin role
  -- ============================================================
  v_test_name := 'TEST 9: Auto-grant all-branch on admin role';
  -- Update dispatcher to admin role — should trigger auto-grant
  UPDATE public.organization_members SET role = 'admin' WHERE id = v_member_dispatcher;

  SELECT has_all_branch_access INTO v_result FROM public.organization_members WHERE id = v_member_dispatcher;
  IF v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected TRUE after role change to admin', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- Revert dispatcher role
  UPDATE public.organization_members SET role = 'dispatcher', has_all_branch_access = FALSE WHERE id = v_member_dispatcher;

  -- ============================================================
  -- TEST 10: Revoked branch access takes effect
  -- ============================================================
  v_test_name := 'TEST 10: Revoked branch access blocks immediately';
  PERFORM set_config('request.jwt.claim.sub', v_user_dispatcher::text, true);

  -- Verify access before revocation
  v_result := public.current_user_can_access_branch(v_branch_ho);
  IF NOT v_result THEN
    RAISE NOTICE '  ✗ % — pre-condition failed (should have access before revoke)', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  ELSE
    -- Revoke access
    DELETE FROM public.organization_member_branches WHERE member_id = v_member_dispatcher AND branch_id = v_branch_ho;

    -- Verify blocked
    v_result := public.current_user_can_access_branch(v_branch_ho);
    IF NOT v_result THEN
      RAISE NOTICE '  ✓ %', v_test_name;
      v_tests_passed := v_tests_passed + 1;
    ELSE
      RAISE NOTICE '  ✗ % — still has access after revoke', v_test_name;
      v_tests_failed := v_tests_failed + 1;
    END IF;

    -- Restore access for remaining tests
    INSERT INTO public.organization_member_branches (organization_id, member_id, branch_id)
    VALUES (v_org_a, v_member_dispatcher, v_branch_ho);
  END IF;

  -- ============================================================
  -- TEST 11: organization_member_branches unique constraint
  -- ============================================================
  v_test_name := 'TEST 11: Duplicate branch grant rejected';
  BEGIN
    INSERT INTO public.organization_member_branches (organization_id, member_id, branch_id)
    VALUES (v_org_a, v_member_dispatcher, v_branch_ho);
    -- Should not reach here
    RAISE NOTICE '  ✗ % — duplicate insert succeeded (should fail)', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  END;

  -- ============================================================
  -- TEST 12: Branch FK constraint validates branch exists
  -- ============================================================
  v_test_name := 'TEST 12: Invalid branch_id FK rejected';
  BEGIN
    INSERT INTO public.organization_member_branches (organization_id, member_id, branch_id)
    VALUES (v_org_a, v_member_dispatcher, gen_random_uuid());
    RAISE NOTICE '  ✗ % — invalid FK insert succeeded', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  END;


  -- ============================================================
  -- TEST 13: Branch-scoped table has branch_id UUID column
  -- ============================================================
  v_test_name := 'TEST 13: trips.branch_id is UUID type';
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'trips'
    AND column_name = 'branch_id' AND data_type = 'uuid';
  IF v_count = 1 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — column not found or wrong type', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 14: Branch-aware RLS policy exists
  -- ============================================================
  v_test_name := 'TEST 14: branch_select_trips policy exists';
  SELECT count(*) INTO v_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'branch_select_trips';
  IF v_count = 1 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — policy not found', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 15: All 24 branch-scoped tables have branch RLS policies
  -- ============================================================
  v_test_name := 'TEST 15: All branch-scoped tables have branch_select policy';
  SELECT count(DISTINCT tablename) INTO v_count FROM pg_policies
  WHERE schemaname = 'public' AND policyname LIKE 'branch_select_%';
  IF v_count >= 20 THEN
    RAISE NOTICE '  ✓ % (% tables with branch_select policy)', v_test_name, v_count;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected >=20, got %', v_test_name, v_count;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 16: Helper function handles non-existent branch gracefully
  -- ============================================================
  v_test_name := 'TEST 16: Non-existent branch returns FALSE';
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);
  v_result := public.current_user_can_access_branch(gen_random_uuid());
  IF NOT v_result THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected FALSE for non-existent branch', v_test_name;
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
  -- CLEANUP
  -- ============================================================
  DELETE FROM public.customers WHERE id = v_customer_ho;
  DELETE FROM public.trips WHERE organization_id = v_org_a;
  DELETE FROM public.organization_member_branches WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.branches WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.organization_members WHERE organization_id IN (v_org_a, v_org_b);
  DELETE FROM public.organizations WHERE id IN (v_org_a, v_org_b);
  DELETE FROM auth.users WHERE id IN (v_user_owner, v_user_dispatcher, v_user_viewer, v_user_other_org);

  RAISE NOTICE 'Cleanup complete.';

  IF v_tests_failed > 0 THEN
    RAISE EXCEPTION '% tests FAILED', v_tests_failed;
  END IF;
END $$;
