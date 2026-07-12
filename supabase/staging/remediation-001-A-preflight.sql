-- remediation-001-A-preflight.sql
-- Pre-Migration-003 Privilege Remediation: Read-only audit
-- Target: staging ybuhazlnjqjrshcvpuna
-- Purpose: Report ALL privileges held by PUBLIC, anon, authenticated, and
--          service_role on the 36 business tables. Also reports schema-level
--          default ACLs that may auto-grant on future tables.
-- Read-only: no changes, just reporting.

-- ============================================================
-- SECTION 1: Direct grants to anon and authenticated
-- ============================================================
SELECT
  'S1_DIRECT' AS section,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches',
    'vendors','contracts','routes','indents','market_hires',
    'work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts',
    'purchases','sales','inventory','attendance','leave_requests',
    'gps_devices'
  )
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- ============================================================
-- SECTION 2: PUBLIC grants via aclexplode (grantee OID 0 = PUBLIC)
-- ============================================================
SELECT
  'S2_PUBLIC' AS section,
  c.relname AS table_name,
  'PUBLIC' AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches',
    'vendors','contracts','routes','indents','market_hires',
    'work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts',
    'purchases','sales','inventory','attendance','leave_requests',
    'gps_devices'
  )
  AND acl.grantee = 0  -- OID 0 = PUBLIC
ORDER BY c.relname, acl.privilege_type;

-- ============================================================
-- SECTION 3: service_role direct grants (must remain intact)
-- ============================================================
SELECT
  'S3_SERVICE_ROLE' AS section,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches',
    'vendors','contracts','routes','indents','market_hires',
    'work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts',
    'purchases','sales','inventory','attendance','leave_requests',
    'gps_devices'
  )
  AND grantee = 'service_role'
ORDER BY table_name, privilege_type;

-- ============================================================
-- SECTION 4: Summary counts by grantee
-- ============================================================
SELECT
  'S4_SUMMARY' AS section,
  grantee,
  privilege_type,
  count(*) AS table_count
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches',
    'vendors','contracts','routes','indents','market_hires',
    'work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts',
    'purchases','sales','inventory','attendance','leave_requests',
    'gps_devices'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY grantee, privilege_type
ORDER BY grantee, privilege_type;

-- ============================================================
-- SECTION 5: Default ACLs via aclexplode (granular reporting)
-- Flags defaults granting table privileges to PUBLIC/anon/authenticated
-- ============================================================
SELECT
  'S5_DEFAULT_ACL' AS section,
  defaclrole::regrole AS grantor_role,
  CASE defaclnamespace
    WHEN 0 THEN 'GLOBAL'
    ELSE defaclnamespace::regnamespace::text
  END AS schema,
  CASE defaclobjtype
    WHEN 'r' THEN 'TABLE'
    WHEN 'S' THEN 'SEQUENCE'
    WHEN 'f' THEN 'FUNCTION'
    WHEN 'T' THEN 'TYPE'
    WHEN 'n' THEN 'SCHEMA'
  END AS object_type,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable,
  CASE
    WHEN defaclobjtype = 'r' AND acl.grantee IN (0, (SELECT oid FROM pg_roles WHERE rolname = 'anon'), (SELECT oid FROM pg_roles WHERE rolname = 'authenticated'))
    THEN 'WARNING: auto-grants table privileges to API-exposed role'
    ELSE 'OK'
  END AS safety_flag
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclnamespace = 0
   OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY grantor_role, schema, object_type, grantee, privilege_type;
