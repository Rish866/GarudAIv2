-- migration-001-A-preflight.sql
-- Read-only pre-flight for Migration 001
-- Target: staging ybuhazlnjqjrshcvpuna

SELECT 'PREFLIGHT_001_BASE_TABLES' AS check_name;
SELECT t.name AS required_table,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.name
  ) THEN 'EXISTS' ELSE 'MISSING - STOP' END AS status
FROM (VALUES
  ('vehicles'),('drivers'),('customers'),('trips'),
  ('enquiries'),('quotations'),('invoices'),('payments'),
  ('expenses'),('fuel_entries'),('maintenance_records'),('tyres'),
  ('activity_log'),('notifications'),('eway_bills'),('branches')
) AS t(name) ORDER BY t.name;

SELECT 'PREFLIGHT_001_PLATFORM_CONFLICTS' AS check_name;
SELECT t.name AS table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t.name
  ) THEN 'ALREADY EXISTS - STOP' ELSE 'DOES NOT EXIST - SAFE' END AS status
FROM (VALUES
  ('organizations'),('organization_members'),('organization_settings'),
  ('organization_invitations'),('user_profiles'),('platform_admins')
) AS t(name) ORDER BY t.name;

SELECT 'PREFLIGHT_001_ORG_ID_COLUMNS' AS check_name;
SELECT t.name AS table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t.name
      AND column_name = 'organization_id'
  ) THEN 'ALREADY HAS org_id - STOP' ELSE 'NO org_id - SAFE' END AS status
FROM (VALUES
  ('vehicles'),('drivers'),('customers'),('trips'),
  ('enquiries'),('quotations'),('invoices'),('payments'),
  ('expenses'),('fuel_entries'),('maintenance_records'),('tyres'),
  ('activity_log'),('notifications'),('eway_bills'),('branches')
) AS t(name) ORDER BY t.name;

SELECT 'PREFLIGHT_001_FUNCTION_CONFLICTS' AS check_name;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN (
  'is_organization_member','current_user_organization_ids',
  'has_organization_role','is_platform_admin',
  'create_organization_for_user',
  'accept_organization_invitation','cancel_organization_invitation',
  'create_organization_invitation'
) ORDER BY routine_name;

SELECT 'PREFLIGHT_001_AUTH_USERS' AS check_name;
SELECT count(*) AS user_count FROM auth.users;
