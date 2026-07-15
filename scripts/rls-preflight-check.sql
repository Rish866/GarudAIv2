-- ============================================================
-- RLS PREFLIGHT CHECK — Run BEFORE migration-006-rls-hardening.sql
-- 
-- This script validates the database state and reports issues
-- that would cause the migration to fail or lock out users.
-- 
-- DOES NOT MODIFY DATA. Read-only.
-- Run in Supabase SQL Editor.
-- ============================================================

-- 1. Check required tables exist
SELECT 'REQUIRED TABLES' AS section;
SELECT table_name, 
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM (
  SELECT unnest(ARRAY[
    'organizations', 'organization_members', 'branches',
    'vehicles', 'drivers', 'customers', 'vendors', 'trips',
    'enquiries', 'quotations', 'indents', 'invoices', 'payments',
    'expenses', 'fuel_entries', 'maintenance_records', 'tyres',
    'documents', 'attendance', 'challans', 'claims', 'eway_bills',
    'activity_log', 'notifications', 'work_orders', 'market_hires',
    'geofences', 'tracking_links', 'routes', 'contracts'
  ]) AS required_table
) req
LEFT JOIN information_schema.tables ist 
  ON ist.table_name = req.required_table AND ist.table_schema = 'public'
ORDER BY required_table;

-- 2. Check organization_id column exists on business tables
SELECT 'ORGANIZATION_ID COLUMN CHECK' AS section;
SELECT required_table,
  CASE WHEN column_name IS NOT NULL THEN 'HAS organization_id' ELSE 'MISSING organization_id' END AS status
FROM (
  SELECT unnest(ARRAY[
    'vehicles', 'drivers', 'customers', 'vendors', 'trips',
    'enquiries', 'quotations', 'indents', 'invoices', 'payments',
    'expenses', 'fuel_entries', 'maintenance_records', 'tyres',
    'documents', 'challans', 'claims', 'eway_bills',
    'activity_log', 'notifications'
  ]) AS required_table
) req
LEFT JOIN information_schema.columns isc 
  ON isc.table_name = req.required_table 
  AND isc.column_name = 'organization_id' 
  AND isc.table_schema = 'public'
ORDER BY required_table;

-- 3. Check branch_id column exists on branch-scoped tables
SELECT 'BRANCH_ID COLUMN CHECK' AS section;
SELECT required_table,
  CASE WHEN column_name IS NOT NULL THEN 'HAS branch_id' ELSE 'MISSING branch_id' END AS status
FROM (
  SELECT unnest(ARRAY[
    'vehicles', 'drivers', 'customers', 'trips',
    'enquiries', 'quotations', 'invoices', 'payments',
    'expenses', 'fuel_entries', 'maintenance_records', 'tyres'
  ]) AS required_table
) req
LEFT JOIN information_schema.columns isc 
  ON isc.table_name = req.required_table 
  AND isc.column_name = 'branch_id' 
  AND isc.table_schema = 'public'
ORDER BY required_table;

-- 4. Check organization_members table structure
SELECT 'ORGANIZATION_MEMBERS STRUCTURE' AS section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'organization_members' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check for organization_member_branches table
SELECT 'BRANCH ASSIGNMENTS TABLE' AS section;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organization_member_branches' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check existing RLS policies
SELECT 'EXISTING RLS POLICIES' AS section;
SELECT tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Records with NULL organization_id (data integrity)
SELECT 'NULL ORGANIZATION_ID RECORDS' AS section;
DO $$
DECLARE
  tbl TEXT;
  cnt BIGINT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY['vehicles', 'drivers', 'customers', 'trips', 'invoices', 'expenses'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'organization_id') THEN
      EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id IS NULL', tbl) INTO cnt;
      IF cnt > 0 THEN
        RAISE NOTICE 'TABLE % has % records with NULL organization_id', tbl, cnt;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 8. Records with branch_id = 'all' (must not exist)
SELECT 'BRANCH_ID ALL CHECK' AS section;
DO $$
DECLARE
  tbl TEXT;
  cnt BIGINT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY['vehicles', 'drivers', 'customers', 'trips', 'invoices', 'expenses', 'fuel_entries'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'branch_id') THEN
      EXECUTE format('SELECT COUNT(*) FROM %I WHERE branch_id::text = ''all''', tbl) INTO cnt;
      IF cnt > 0 THEN
        RAISE NOTICE 'TABLE % has % records with branch_id = all', tbl, cnt;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 9. Users without memberships
SELECT 'USERS WITHOUT MEMBERSHIPS' AS section;
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN organization_members om ON om.user_id = au.id AND om.status = 'active'
WHERE om.id IS NULL
LIMIT 20;

-- 10. Users with multiple active memberships
SELECT 'MULTIPLE ACTIVE MEMBERSHIPS' AS section;
SELECT user_id, COUNT(*) AS membership_count
FROM organization_members
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 11. Invalid role values
SELECT 'INVALID ROLE VALUES' AS section;
SELECT DISTINCT role, COUNT(*) AS count
FROM organization_members
WHERE role NOT IN (
  'organization_owner', 'admin', 'operations_manager', 'dispatcher',
  'fleet_manager', 'accountant', 'maintenance_manager', 'hr_manager',
  'driver', 'customer', 'vendor', 'viewer'
)
GROUP BY role;

-- 12. Check has_all_branch_access column exists
SELECT 'HAS_ALL_BRANCH_ACCESS CHECK' AS section;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organization_members' 
  AND column_name = 'has_all_branch_access'
  AND table_schema = 'public';

-- 13. Existing helper functions
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

-- ============================================================
-- END PREFLIGHT — Review output for issues before running migration
-- ============================================================
