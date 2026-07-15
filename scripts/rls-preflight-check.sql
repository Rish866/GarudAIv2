-- ============================================================
-- RLS PREFLIGHT CHECK — Run BEFORE migration-006-rls-hardening.sql
--
-- This script validates the database state and reports issues.
-- DOES NOT MODIFY DATA. Read-only.
-- ============================================================

-- 1. Which tables have organization_id? (These will get RLS)
SELECT 'TABLES WITH organization_id (will get RLS)' AS section;
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'organization_id'
  AND table_schema = 'public'
ORDER BY table_name;

-- 2. Which tables ONLY have tenant_id? (These will NOT get new RLS)
SELECT 'TABLES WITH ONLY tenant_id (no new RLS)' AS section;
SELECT c.table_name
FROM information_schema.columns c
WHERE c.column_name = 'tenant_id'
  AND c.table_schema = 'public'
  AND c.table_name NOT IN (
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'organization_id' AND table_schema = 'public'
  )
ORDER BY c.table_name;

-- 3. Check organization_members structure
SELECT 'ORGANIZATION_MEMBERS STRUCTURE' AS section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check for organization_member_branches table
SELECT 'BRANCH ASSIGNMENTS TABLE' AS section;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organization_member_branches' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Existing helper functions
SELECT 'EXISTING HELPER FUNCTIONS' AS section;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_organization_id', 'get_user_tenant_id',
    'user_has_all_branch_access', 'user_can_access_branch',
    'get_user_role', 'is_platform_admin',
    'create_organization_for_user'
  )
ORDER BY routine_name;

-- 6. Existing RLS policies
SELECT 'EXISTING RLS POLICIES' AS section;
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Records with NULL organization_id (on tables that have it)
SELECT 'NULL ORGANIZATION_ID RECORDS' AS section;
DO $$
DECLARE
  tbl TEXT;
  cnt BIGINT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'organization_id' AND table_schema = 'public'
    AND table_name NOT IN ('organizations', 'organization_members', 'organization_invitations', 'organization_settings')
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id IS NULL', tbl) INTO cnt;
    IF cnt > 0 THEN
      RAISE NOTICE 'TABLE % has % records with NULL organization_id', tbl, cnt;
    END IF;
  END LOOP;
  RAISE NOTICE 'Check complete. Tables with 0 nulls are not listed.';
END $$;

-- 8. Records with branch_id = 'all'
SELECT 'BRANCH_ID ALL CHECK' AS section;
DO $$
DECLARE
  tbl TEXT;
  cnt BIGINT;
  col_type TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'branch_id' AND table_schema = 'public'
  LOOP
    SELECT data_type INTO col_type FROM information_schema.columns
    WHERE table_name = tbl AND column_name = 'branch_id' AND table_schema = 'public';

    IF col_type IN ('text', 'character varying') THEN
      EXECUTE format('SELECT COUNT(*) FROM %I WHERE branch_id = ''all''', tbl) INTO cnt;
      IF cnt > 0 THEN
        RAISE NOTICE 'TABLE % has % records with branch_id = all (MUST FIX)', tbl, cnt;
      END IF;
    END IF;
  END LOOP;
  RAISE NOTICE 'branch_id check complete.';
END $$;

-- 9. Users with multiple active memberships
SELECT 'MULTIPLE ACTIVE MEMBERSHIPS' AS section;
SELECT user_id, COUNT(*) AS membership_count
FROM organization_members
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 10. Invalid role values
SELECT 'INVALID ROLE VALUES' AS section;
SELECT DISTINCT role, COUNT(*) AS count
FROM organization_members
WHERE role NOT IN (
  'organization_owner', 'admin', 'operations_manager', 'dispatcher',
  'fleet_manager', 'accountant', 'maintenance_manager', 'hr_manager',
  'driver', 'customer', 'vendor', 'viewer'
)
GROUP BY role;

-- 11. has_all_branch_access column check
SELECT 'HAS_ALL_BRANCH_ACCESS COLUMN' AS section;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organization_members'
  AND column_name = 'has_all_branch_access'
  AND table_schema = 'public';

-- ============================================================
-- REVIEW OUTPUT ABOVE BEFORE RUNNING MIGRATION
-- If any table shows NULL organization_id records, run
-- map-existing-data-to-organizations.sql first!
-- ============================================================
