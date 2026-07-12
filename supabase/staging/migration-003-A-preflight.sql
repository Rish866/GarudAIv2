-- migration-003-A-preflight.sql
-- Migration 003 Preflight: Verify ALL dependencies for business RLS policies
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: raises exception on failure, emits PASS on success
-- Dependencies: Migration 001 (platform), Migration 002 (20 additional tables)
--
-- CHECKS:
-- 1. All 36 business tables exist
-- 2. RLS enabled on all 36
-- 3. organization_id column on all 36
-- 4. Zero policies on ANY business table (any name, not just role_%)
-- 5. Zero privileges for anon/authenticated on all 36 business tables
-- 6. Helper functions with exact signatures and SECURITY DEFINER
-- 7. Platform policies >= 10

DO $preflight$
DECLARE
  missing_tables TEXT[];
  missing_rls TEXT[];
  missing_org_id TEXT[];
  existing_policies TEXT[];
  unexpected_privileges TEXT[];
  fn_issues TEXT[];
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
BEGIN
  -- 1. Verify all 36 business tables exist
  SELECT array_agg(t) INTO missing_tables
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t
  );
  IF missing_tables IS NOT NULL AND array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: missing business tables: %', array_to_string(missing_tables, ', ');
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
    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: RLS not enabled on: %', array_to_string(missing_rls, ', ');
  END IF;

  -- 3. Verify organization_id column exists on all 36 business tables
  SELECT array_agg(t) INTO missing_org_id
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
  );
  IF missing_org_id IS NOT NULL AND array_length(missing_org_id, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: missing organization_id on: %', array_to_string(missing_org_id, ', ');
  END IF;

  -- 4. Verify ZERO policies on ANY business table (any name, not just role_%)
  SELECT array_agg(pol.polname::text || ' ON ' || c.relname::text) INTO existing_policies
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(expected_tables);
  IF existing_policies IS NOT NULL AND array_length(existing_policies, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: policies already exist on business tables (expected 0): %', array_to_string(existing_policies, ', ');
  END IF;

  -- 5. Verify zero privileges for anon/authenticated on all 36 business tables
  SELECT array_agg(table_name || ':' || grantee || ':' || privilege_type) INTO unexpected_privileges
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = ANY(expected_tables)
    AND grantee IN ('anon', 'authenticated');
  IF unexpected_privileges IS NOT NULL AND array_length(unexpected_privileges, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: unexpected privileges on business tables (dormant state violated): %', array_to_string(unexpected_privileges, ', ');
  END IF;

  -- 6. Helper functions: exact signatures + SECURITY DEFINER
  SELECT array_agg(issue) INTO fn_issues
  FROM (
    -- is_organization_member(UUID) must exist, be SECURITY DEFINER, STABLE
    SELECT 'is_organization_member: ' ||
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'is_organization_member'
            AND p.pronargs = 1 AND p.proargtypes[0] = 'uuid'::regtype::oid)
        THEN 'missing or wrong signature'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'is_organization_member'
            AND p.pronargs = 1 AND p.prosecdef = true)
        THEN 'not SECURITY DEFINER'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'is_organization_member'
            AND p.pronargs = 1 AND p.provolatile = 's')
        THEN 'not STABLE'
        ELSE NULL
      END AS issue
    UNION ALL
    -- has_organization_role(UUID, TEXT[]) must exist, be SECURITY DEFINER, STABLE
    SELECT 'has_organization_role: ' ||
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'has_organization_role'
            AND p.pronargs = 2 AND p.proargtypes[0] = 'uuid'::regtype::oid
            AND p.proargtypes[1] = 'text[]'::regtype::oid)
        THEN 'missing or wrong signature'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'has_organization_role'
            AND p.pronargs = 2 AND p.prosecdef = true)
        THEN 'not SECURITY DEFINER'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'has_organization_role'
            AND p.pronargs = 2 AND p.provolatile = 's')
        THEN 'not STABLE'
        ELSE NULL
      END AS issue
    UNION ALL
    -- current_user_organization_ids() must exist, be SECURITY DEFINER, STABLE
    SELECT 'current_user_organization_ids: ' ||
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'current_user_organization_ids'
            AND p.pronargs = 0)
        THEN 'missing'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'current_user_organization_ids'
            AND p.pronargs = 0 AND p.prosecdef = true)
        THEN 'not SECURITY DEFINER'
        WHEN NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = 'public' AND p.proname = 'current_user_organization_ids'
            AND p.pronargs = 0 AND p.provolatile = 's')
        THEN 'not STABLE'
        ELSE NULL
      END AS issue
  ) checks
  WHERE issue IS NOT NULL;
  IF fn_issues IS NOT NULL AND array_length(fn_issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: helper function issues: %', array_to_string(fn_issues, '; ');
  END IF;

  -- 7. Verify platform policies >= 10 (from Migration 001)
  SELECT count(*) INTO platform_policy_count
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('organizations','organization_members','organization_settings',
                      'organization_invitations','user_profiles','platform_admins');
  IF platform_policy_count < 10 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: expected >= 10 platform policies, found %', platform_policy_count;
  END IF;

  RAISE NOTICE 'PREFLIGHT PASS: 36 tables + RLS + org_id verified, 0 policies, 0 privileges, 3 functions (SECURITY DEFINER + STABLE), % platform policies. Safe to execute Block B.', platform_policy_count;
END $preflight$;

SELECT 'PREFLIGHT PASS: all 7 checks passed. Safe to execute Block B.' AS result;
