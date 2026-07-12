-- remediation-001-A-preflight.sql
-- Pre-Migration-003 Privilege Remediation: Read-only audit
-- Target: staging ybuhazlnjqjrshcvpuna
-- Purpose: List ALL privileges held by anon, authenticated, or PUBLIC
--          on the 36 business tables. Identifies the unsafe grants
--          (TRUNCATE, REFERENCES, TRIGGER, SELECT, INSERT, UPDATE, DELETE)
--          that must be revoked before Migration 003 can proceed.
-- Read-only: no changes, just reporting.

-- ============================================================
-- SECTION 1: Per-table privilege audit (anon + authenticated)
-- ============================================================
SELECT
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
-- SECTION 2: Summary counts
-- ============================================================
SELECT
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
  AND grantee IN ('anon', 'authenticated')
GROUP BY grantee, privilege_type
ORDER BY grantee, privilege_type;

-- ============================================================
-- SECTION 3: PUBLIC role grants (inherited by all roles)
-- ============================================================
SELECT
  c.relname AS table_name,
  'PUBLIC' AS grantee,
  CASE
    WHEN has_table_privilege('public', 'public.' || c.relname, 'SELECT') THEN 'SELECT'
    ELSE NULL
  END AS has_select,
  CASE
    WHEN has_table_privilege('public', 'public.' || c.relname, 'INSERT') THEN 'INSERT'
    ELSE NULL
  END AS has_insert,
  CASE
    WHEN has_table_privilege('public', 'public.' || c.relname, 'TRUNCATE') THEN 'TRUNCATE'
    ELSE NULL
  END AS has_truncate
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
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
ORDER BY c.relname;

-- ============================================================
-- SECTION 4: Default privileges (schema-level ACLs)
-- Reports what privileges are auto-granted on new tables.
-- ============================================================
SELECT
  defaclrole::regrole AS grantor,
  defaclnamespace::regnamespace AS schema,
  CASE defaclobjtype
    WHEN 'r' THEN 'TABLE'
    WHEN 'S' THEN 'SEQUENCE'
    WHEN 'f' THEN 'FUNCTION'
    WHEN 'T' THEN 'TYPE'
    WHEN 'n' THEN 'SCHEMA'
  END AS object_type,
  defaclacl AS acl_entries
FROM pg_default_acl
WHERE defaclnamespace = 0  -- global defaults
   OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY grantor, schema, object_type;
