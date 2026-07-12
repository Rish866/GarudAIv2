-- migration-003-A-preflight.sql
-- Migration 003 Preflight: Verify dependencies for 104 business RLS policies
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: raises exception on failure, emits PASS on success
-- Dependencies: Migration 001 (platform), Migration 002 (20 additional tables)

DO $preflight$
DECLARE
  missing_tables TEXT[];
  missing_rls TEXT[];
  missing_org_id TEXT[];
  missing_functions TEXT[];
  existing_biz_policies TEXT[];
  platform_policy_count INTEGER;
  expected_tables TEXT[] := ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches',
    'vendors','contracts','routes','indents','market_hires',
    'work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts',
    'purchases','sales','inventory','attendance','leave_requests',
    'gps_devices'
  ];
  expected_functions TEXT[] := ARRAY[
    'is_organization_member',
    'has_organization_role',
    'current_user_organization_ids'
  ];
  tbl TEXT;
  fn TEXT;
BEGIN
  -- 1. Verify all 36 business tables exist
  SELECT array_agg(t) INTO missing_tables
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t
  );
  IF missing_tables IS NOT NULL AND array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL: missing business tables: %', array_to_string(missing_tables, ', ');
  END IF;

  -- 2. Verify RLS enabled on all 36 business tables
  SELECT array_agg(t) INTO missing_rls
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t AND c.relrowsecurity = true
  );
  IF missing_rls IS NOT NULL AND array_length(missing_rls, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL: RLS not enabled on: %', array_to_string(missing_rls, ', ');
  END IF;

  -- 3. Verify organization_id column exists on all 36 business tables
  SELECT array_agg(t) INTO missing_org_id
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
  );
  IF missing_org_id IS NOT NULL AND array_length(missing_org_id, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL: missing organization_id on: %', array_to_string(missing_org_id, ', ');
  END IF;

  -- 4. Verify helper functions exist
  SELECT array_agg(f) INTO missing_functions
  FROM unnest(expected_functions) AS f
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = f
  );
  IF missing_functions IS NOT NULL AND array_length(missing_functions, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL: missing functions: %', array_to_string(missing_functions, ', ');
  END IF;

  -- 5. Verify 10 platform policies exist (from Migration 001)
  SELECT count(*) INTO platform_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('organizations','organization_members','organization_settings',
                      'organization_invitations','user_profiles','platform_admins');
  IF platform_policy_count < 10 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL: expected >= 10 platform policies, found %', platform_policy_count;
  END IF;

  -- 6. Verify ZERO business policies exist (deny-by-default state)
  SELECT array_agg(policyname::text) INTO existing_biz_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY(expected_tables)
    AND policyname LIKE 'role_%';
  IF existing_biz_policies IS NOT NULL AND array_length(existing_biz_policies, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL: business policies already exist (expected 0): %', array_to_string(existing_biz_policies, ', ');
  END IF;

  RAISE NOTICE 'PREFLIGHT PASS: all 36 business tables present with RLS + organization_id, 3 helper functions verified, % platform policies confirmed, 0 business policies (deny-by-default intact). Safe to execute Block B.', platform_policy_count;
END $preflight$;

SELECT 'PREFLIGHT PASS: all 36 business tables present with RLS + organization_id, helper functions verified, platform policies confirmed, 0 business policies. Safe to execute Block B.' AS result;
