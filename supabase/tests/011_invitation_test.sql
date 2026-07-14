-- ============================================================
-- TEST SUITE: Migration 011 — Organization Invitations
-- Tests the invitation model and accept_organization_invite RPC.
-- ============================================================

DO $$
DECLARE
  v_org UUID := gen_random_uuid();
  v_user_owner UUID := gen_random_uuid();
  v_user_admin UUID := gen_random_uuid();
  v_user_viewer UUID := gen_random_uuid();
  v_user_invitee UUID := gen_random_uuid();
  v_member_owner UUID := gen_random_uuid();
  v_member_admin UUID := gen_random_uuid();
  v_member_viewer UUID := gen_random_uuid();
  v_invite_id UUID;
  v_token_hash TEXT := encode(sha256(convert_to('test-token-123', 'UTF8')), 'hex');
  v_expired_hash TEXT := encode(sha256(convert_to('expired-token', 'UTF8')), 'hex');
  v_revoked_hash TEXT := encode(sha256(convert_to('revoked-token', 'UTF8')), 'hex');
  v_result JSON;
  v_count INT;
  v_test_name TEXT;
  v_tests_passed INT := 0;
  v_tests_failed INT := 0;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'INVITATION TEST SUITE — Migration 011';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  -- Setup
  INSERT INTO public.organizations (id, name, slug, status, subscription_status)
  VALUES (v_org, 'Invite Test Org', 'invite-test', 'active', 'active');

  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at)
  VALUES (v_user_owner, 'invowner@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
         (v_user_admin, 'invadmin@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
         (v_user_viewer, 'invviewer@test.com', 'authenticated', 'authenticated', NOW(), NOW()),
         (v_user_invitee, 'newinvitee@test.com', 'authenticated', 'authenticated', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organization_members (id, organization_id, user_id, role, status, has_all_branch_access)
  VALUES (v_member_owner, v_org, v_user_owner, 'organization_owner', 'active', TRUE),
         (v_member_admin, v_org, v_user_admin, 'admin', 'active', TRUE),
         (v_member_viewer, v_org, v_user_viewer, 'viewer', 'active', FALSE);

  -- Create test invitations
  INSERT INTO public.organization_invitations (id, organization_id, email, role, token_hash, status, expires_at, invited_by)
  VALUES
    (gen_random_uuid(), v_org, 'newinvitee@test.com', 'dispatcher', v_token_hash, 'pending', NOW() + INTERVAL '7 days', v_user_owner),
    (gen_random_uuid(), v_org, 'expired@test.com', 'viewer', v_expired_hash, 'pending', NOW() - INTERVAL '1 day', v_user_owner),
    (gen_random_uuid(), v_org, 'revoked@test.com', 'viewer', v_revoked_hash, 'revoked', NOW() + INTERVAL '7 days', v_user_owner);

  RAISE NOTICE 'Setup complete.';
  RAISE NOTICE '';

  -- ============================================================
  -- TEST 1: Table exists with correct columns
  -- ============================================================
  v_test_name := 'TEST 1: organization_invitations table has all columns';
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'organization_invitations'
    AND column_name IN ('token_hash','status','expires_at','invited_by','accepted_by','branch_ids','has_all_branch_access','send_count');
  IF v_count = 8 THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — expected 8 columns, found %', v_test_name, v_count;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 2: Unique constraint prevents duplicate active invites
  -- ============================================================
  v_test_name := 'TEST 2: Duplicate active invite rejected';
  BEGIN
    INSERT INTO public.organization_invitations (organization_id, email, role, token_hash, status, expires_at, invited_by)
    VALUES (v_org, 'newinvitee@test.com', 'viewer', 'different_hash', 'pending', NOW() + INTERVAL '7 days', v_user_owner);
    RAISE NOTICE '  ✗ % — duplicate insert succeeded', v_test_name;
    v_tests_failed := v_tests_failed + 1;
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  END;

  -- ============================================================
  -- TEST 3: Accept valid invitation
  -- ============================================================
  v_test_name := 'TEST 3: Existing user accepts valid invitation';
  PERFORM set_config('request.jwt.claim.sub', v_user_invitee::text, true);

  v_result := public.accept_organization_invite(v_token_hash);
  IF (v_result->>'success')::boolean THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — error: %', v_test_name, v_result->>'error';
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 4: Duplicate acceptance is idempotent (already member)
  -- ============================================================
  v_test_name := 'TEST 4: Duplicate acceptance returns already_member';
  -- Reset invitation to pending for re-test (in production this wouldn't happen)
  UPDATE public.organization_invitations SET status = 'pending', token_hash = v_token_hash WHERE email = 'newinvitee@test.com' AND organization_id = v_org;
  v_result := public.accept_organization_invite(v_token_hash);
  IF (v_result->>'success')::boolean AND (v_result->>'already_member')::boolean THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — result: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 5: Expired invite rejected
  -- ============================================================
  v_test_name := 'TEST 5: Expired invite rejected';
  v_result := public.accept_organization_invite(v_expired_hash);
  IF NOT (v_result->>'success')::boolean AND (v_result->>'error') LIKE '%expired%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — result: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 6: Revoked invite rejected
  -- ============================================================
  v_test_name := 'TEST 6: Revoked invite rejected';
  v_result := public.accept_organization_invite(v_revoked_hash);
  IF NOT (v_result->>'success')::boolean AND (v_result->>'error') LIKE '%no longer active%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — result: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 7: Invalid token rejected
  -- ============================================================
  v_test_name := 'TEST 7: Invalid token rejected';
  v_result := public.accept_organization_invite('nonexistent_hash_value');
  IF NOT (v_result->>'success')::boolean AND (v_result->>'error') LIKE '%Invalid%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — result: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 8: Email mismatch rejected
  -- ============================================================
  v_test_name := 'TEST 8: Email mismatch rejected';
  -- Use owner's auth (email=invowner@test.com) to try accepting invitee's invite
  PERFORM set_config('request.jwt.claim.sub', v_user_owner::text, true);
  -- Reset invitation
  UPDATE public.organization_invitations SET status = 'pending' WHERE email = 'newinvitee@test.com' AND organization_id = v_org;
  v_result := public.accept_organization_invite(v_token_hash);
  IF NOT (v_result->>'success')::boolean AND (v_result->>'error') LIKE '%different email%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — result: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 9: Unauthenticated rejected
  -- ============================================================
  v_test_name := 'TEST 9: Unauthenticated call rejected';
  PERFORM set_config('request.jwt.claim.sub', '', true);
  v_result := public.accept_organization_invite(v_token_hash);
  IF NOT (v_result->>'success')::boolean AND (v_result->>'error') LIKE '%Not authenticated%' THEN
    RAISE NOTICE '  ✓ %', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — result: %', v_test_name, v_result;
    v_tests_failed := v_tests_failed + 1;
  END IF;

  -- ============================================================
  -- TEST 10: Raw token NOT stored in database
  -- ============================================================
  v_test_name := 'TEST 10: Raw token not stored (only hash)';
  SELECT count(*) INTO v_count FROM public.organization_invitations
  WHERE organization_id = v_org AND token_hash = 'test-token-123';
  IF v_count = 0 THEN
    RAISE NOTICE '  ✓ % (raw token not found in token_hash column)', v_test_name;
    v_tests_passed := v_tests_passed + 1;
  ELSE
    RAISE NOTICE '  ✗ % — raw token found in DB!', v_test_name;
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

  -- Cleanup
  DELETE FROM public.activity_log WHERE organization_id = v_org;
  DELETE FROM public.organization_invitations WHERE organization_id = v_org;
  DELETE FROM public.organization_members WHERE organization_id = v_org;
  DELETE FROM public.organizations WHERE id = v_org;
  DELETE FROM auth.users WHERE id IN (v_user_owner, v_user_admin, v_user_viewer, v_user_invitee);

  RAISE NOTICE 'Cleanup complete.';

  IF v_tests_failed > 0 THEN
    RAISE EXCEPTION '% tests FAILED', v_tests_failed;
  END IF;
END $$;
