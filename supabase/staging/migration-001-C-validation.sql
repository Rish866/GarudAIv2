-- migration-001-C-validation.sql
-- Read-only post-validation for Migration 001
-- Target: staging ybuhazlnjqjrshcvpuna

SELECT 'C1_PLATFORM_TABLES' AS check_name;
SELECT t.name AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.name)
  THEN 'EXISTS' ELSE 'MISSING - FAIL' END AS status
FROM (VALUES ('organizations'),('organization_members'),('organization_settings'),('organization_invitations'),('user_profiles'),('platform_admins')) AS t(name) ORDER BY t.name;

SELECT 'C2_RLS_ENABLED_ALL_22' AS check_name;
SELECT tablename,
  CASE WHEN rowsecurity THEN 'RLS ON' ELSE 'RLS OFF - FAIL' END AS status
FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'organizations','organization_members','organization_settings','organization_invitations','user_profiles','platform_admins',
  'vehicles','drivers','customers','trips','enquiries','quotations','invoices','payments','expenses','fuel_entries','maintenance_records','tyres','activity_log','notifications','eway_bills','branches'
) ORDER BY tablename;

SELECT 'C3_ORG_ID_COLUMNS' AS check_name;
SELECT t.name AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.name AND column_name = 'organization_id')
  THEN 'HAS org_id' ELSE 'MISSING - FAIL' END AS status
FROM (VALUES ('vehicles'),('drivers'),('customers'),('trips'),('enquiries'),('quotations'),('invoices'),('payments'),('expenses'),('fuel_entries'),('maintenance_records'),('tyres'),('activity_log'),('notifications'),('eway_bills'),('branches')) AS t(name) ORDER BY t.name;

SELECT 'C4_PLATFORM_POLICIES' AS check_name;
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
  'organizations','organization_members','organization_settings','organization_invitations','user_profiles','platform_admins'
) ORDER BY tablename, policyname;

SELECT 'C5_NO_BUSINESS_POLICIES' AS check_name;
SELECT tablename, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' AND tablename IN (
  'vehicles','drivers','customers','trips','enquiries','quotations','invoices','payments','expenses','fuel_entries','maintenance_records','tyres','activity_log','notifications','eway_bills','branches'
) ORDER BY tablename;

SELECT 'C6_FUNCTIONS_EXIST' AS check_name;
SELECT t.name AS function_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = t.name)
  THEN 'EXISTS' ELSE 'MISSING - FAIL' END AS status
FROM (VALUES ('is_organization_member'),('current_user_organization_ids'),('has_organization_role'),('is_platform_admin'),('create_organization_for_user'),('create_organization_invitation'),('accept_organization_invitation'),('cancel_organization_invitation')) AS t(name) ORDER BY t.name;

SELECT 'C7_FUNCTION_PRIVILEGES' AS check_name;
SELECT p.proname AS function_name,
  CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'auth:YES' ELSE 'auth:NO-FAIL' END AS auth_exec,
  CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 'anon:YES-FAIL' ELSE 'anon:NO' END AS anon_exec
FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname IN (
  'is_organization_member','current_user_organization_ids','has_organization_role','is_platform_admin',
  'create_organization_for_user','create_organization_invitation','accept_organization_invitation','cancel_organization_invitation'
) ORDER BY p.proname;

SELECT 'C8_NO_ANON_POLICIES' AS check_name;
SELECT tablename, policyname, roles::text FROM pg_policies
WHERE schemaname = 'public' AND roles @> ARRAY['anon']::name[];

SELECT 'C9_ROW_COUNTS_ZERO' AS check_name;
SELECT 'organizations' AS tbl, count(*) AS rows FROM public.organizations
UNION ALL SELECT 'organization_members', count(*) FROM public.organization_members
UNION ALL SELECT 'vehicles', count(*) FROM public.vehicles
ORDER BY tbl;

SELECT 'C10_INDEXES' AS check_name;
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%org%' ORDER BY indexname;

SELECT 'MIGRATION_001_VALIDATION_COMPLETE' AS check_name;
