-- ============================================================
-- GARUD AI ERP — Pre-Migration Diagnostic
-- 
-- Run this BEFORE executing the migration chain (000 → 007).
-- It reports the current database state so you understand what
-- will be created vs. what already exists.
--
-- This is a READ-ONLY diagnostic. It does not modify anything.
-- ============================================================

-- 1. List all existing tables in public schema
SELECT '=== EXISTING TABLES ===' AS section;
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns c 
        WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check if multi-tenant foundation tables already exist
SELECT '=== MULTI-TENANT FOUNDATION STATUS ===' AS section;
SELECT table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = t.expected
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
FROM (VALUES 
  ('organizations'),
  ('organization_members'),
  ('organization_settings'),
  ('organization_invitations'),
  ('user_profiles'),
  ('platform_admins')
) AS t(expected);

-- 3. Check if business tables exist and have organization_id
SELECT '=== BUSINESS TABLE + ORG_ID STATUS ===' AS section;
SELECT t.expected AS table_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name = t.expected
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END AS table_status,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = t.expected AND column_name = 'organization_id'
       ) THEN '✅ HAS org_id' ELSE '❌ NO org_id' END AS org_id_status
FROM (VALUES 
  ('vehicles'), ('drivers'), ('customers'), ('trips'),
  ('enquiries'), ('quotations'), ('invoices'), ('payments'),
  ('expenses'), ('fuel_entries'), ('maintenance_records'), ('tyres'),
  ('activity_log'), ('notifications'), ('eway_bills'), ('branches'),
  ('vendors'), ('contracts'), ('routes'), ('indents'),
  ('market_hires'), ('work_orders'), ('challans'), ('geofences'),
  ('claims'), ('approvals'), ('transfers'), ('cash_entries'),
  ('bank_entries'), ('ledger_accounts'), ('purchases'), ('sales'),
  ('inventory'), ('attendance'), ('leave_requests'), ('gps_devices')
) AS t(expected);

-- 4. Count rows in business tables (to assess data migration scope)
SELECT '=== ROW COUNTS (existing data) ===' AS section;
DO $$
DECLARE
  tbl TEXT;
  row_count BIGINT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches'
  ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('SELECT count(*) FROM public.%I', tbl) INTO row_count;
      IF row_count > 0 THEN
        RAISE NOTICE 'Table % has % rows', tbl, row_count;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 5. Check orphan rows (organization_id IS NULL)
SELECT '=== ORPHAN ROWS (need mapping) ===' AS section;
DO $$
DECLARE
  tbl TEXT;
  orphan_count BIGINT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'organization_id'
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id IS NULL', tbl) INTO orphan_count;
      IF orphan_count > 0 THEN
        RAISE NOTICE 'Table % has % orphan rows (organization_id IS NULL)', tbl, orphan_count;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 6. Check RLS status
SELECT '=== RLS STATUS ===' AS section;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN (
  'vehicles','drivers','customers','trips','organizations','organization_members'
)
ORDER BY tablename;

-- 7. Check existing policies
SELECT '=== EXISTING POLICIES (sample) ===' AS section;
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname
LIMIT 30;

-- 8. Check existing functions
SELECT '=== HELPER FUNCTIONS ===' AS section;
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'is_organization_member',
    'current_user_organization_ids',
    'has_organization_role',
    'is_platform_admin',
    'create_organization_for_user',
    'validate_same_organization',
    'log_privileged_action'
  )
ORDER BY routine_name;

-- 9. Auth users count
SELECT '=== AUTH USERS ===' AS section;
SELECT count(*) AS total_users FROM auth.users;

-- ============================================================
-- END OF DIAGNOSTIC
-- 
-- INTERPRETATION:
-- - If business tables are MISSING → migration 000 will create them
-- - If org_id is MISSING → migration 001 will add it
-- - If orphan rows exist → migration 007 will map them
-- - If foundation tables are MISSING → migration 001 will create them
-- - If RLS is not enabled → migrations 001 + 003 will enable it
-- ============================================================
