-- remediation-001-C-validation.sql
-- Pre-Migration-003 Privilege Remediation: Validation (v3)
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes
-- Validates EFFECTIVE privileges (not just direct grant rows)
-- Validates all 8 PostgreSQL table privilege types including MAINTAIN
-- Expected: ALL 7 CHECKS PASS

-- ============================================================
-- C01: Zero effective privileges for 'anon' across 36 tables × 8 privilege types
-- Uses has_table_privilege() which evaluates role membership and PUBLIC inheritance
-- ============================================================
SELECT
  'C01' AS check_id,
  'zero_effective_anon' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' effective anon privileges remain: ' ||
      string_agg(t || ':' || priv, ', ' ORDER BY t, priv)
  END AS result
FROM (
  SELECT t.t, p.priv
  FROM (VALUES
    ('vehicles'),('drivers'),('customers'),('trips'),('enquiries'),('quotations'),
    ('invoices'),('payments'),('expenses'),('fuel_entries'),('maintenance_records'),
    ('tyres'),('activity_log'),('notifications'),('eway_bills'),('branches'),
    ('vendors'),('contracts'),('routes'),('indents'),('market_hires'),
    ('work_orders'),('challans'),('geofences'),('claims'),('approvals'),
    ('transfers'),('cash_entries'),('bank_entries'),('ledger_accounts'),
    ('purchases'),('sales'),('inventory'),('attendance'),('leave_requests'),
    ('gps_devices')
  ) AS t(t)
  CROSS JOIN (VALUES
    ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
    ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')
  ) AS p(priv)
  WHERE has_table_privilege('anon', 'public.' || t.t, p.priv)
) violations

UNION ALL

-- ============================================================
-- C02: Zero effective privileges for 'authenticated' across 36 tables × 8 privilege types
-- ============================================================
SELECT
  'C02',
  'zero_effective_authenticated',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' effective authenticated privileges remain: ' ||
      string_agg(t || ':' || priv, ', ' ORDER BY t, priv)
  END
FROM (
  SELECT t.t, p.priv
  FROM (VALUES
    ('vehicles'),('drivers'),('customers'),('trips'),('enquiries'),('quotations'),
    ('invoices'),('payments'),('expenses'),('fuel_entries'),('maintenance_records'),
    ('tyres'),('activity_log'),('notifications'),('eway_bills'),('branches'),
    ('vendors'),('contracts'),('routes'),('indents'),('market_hires'),
    ('work_orders'),('challans'),('geofences'),('claims'),('approvals'),
    ('transfers'),('cash_entries'),('bank_entries'),('ledger_accounts'),
    ('purchases'),('sales'),('inventory'),('attendance'),('leave_requests'),
    ('gps_devices')
  ) AS t(t)
  CROSS JOIN (VALUES
    ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),
    ('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')
  ) AS p(priv)
  WHERE has_table_privilege('authenticated', 'public.' || t.t, p.priv)
) violations

UNION ALL

-- ============================================================
-- C03: Zero PUBLIC grants on all 36 business tables (via aclexplode, grantee=0)
-- ============================================================
SELECT
  'C03',
  'zero_public_grants',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' PUBLIC grants remain: ' ||
      string_agg(c.relname || ':' || acl.privilege_type, ', ' ORDER BY c.relname, acl.privilege_type)
  END
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
  AND acl.grantee = 0

UNION ALL

-- ============================================================
-- C04: service_role has direct privileges on ALL 36 business tables
-- Requires coverage of every table (not just count > 0)
-- ============================================================
SELECT
  'C04',
  'service_role_covers_all_36',
  CASE WHEN count(DISTINCT table_name) = 36 THEN 'PASS: service_role has grants on all 36 tables'
    ELSE 'FAIL: service_role covers only ' || count(DISTINCT table_name) || '/36 tables. Missing: ' ||
      (SELECT string_agg(t, ', ' ORDER BY t) FROM (VALUES
        ('vehicles'),('drivers'),('customers'),('trips'),('enquiries'),('quotations'),
        ('invoices'),('payments'),('expenses'),('fuel_entries'),('maintenance_records'),
        ('tyres'),('activity_log'),('notifications'),('eway_bills'),('branches'),
        ('vendors'),('contracts'),('routes'),('indents'),('market_hires'),
        ('work_orders'),('challans'),('geofences'),('claims'),('approvals'),
        ('transfers'),('cash_entries'),('bank_entries'),('ledger_accounts'),
        ('purchases'),('sales'),('inventory'),('attendance'),('leave_requests'),
        ('gps_devices')
      ) AS expected(t)
      WHERE t NOT IN (
        SELECT rtg.table_name FROM information_schema.role_table_grants rtg
        WHERE rtg.table_schema = 'public' AND rtg.grantee = 'service_role'
      ))
  END
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

UNION ALL

-- ============================================================
-- C05: Zero direct grant rows for anon (belt-and-suspenders with C01)
-- ============================================================
SELECT
  'C05',
  'zero_direct_anon_grants',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' direct anon grant rows remain'
  END
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
  AND grantee = 'anon'

UNION ALL

-- ============================================================
-- C06: Zero direct grant rows for authenticated
-- ============================================================
SELECT
  'C06',
  'zero_direct_authenticated_grants',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' direct authenticated grant rows remain'
  END
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
  AND grantee = 'authenticated'

UNION ALL

-- ============================================================
-- C07: All 36 business tables exist (sanity)
-- ============================================================
SELECT
  'C07',
  'all_36_tables_exist',
  CASE WHEN count(*) = 36 THEN 'PASS'
    ELSE 'FAIL: expected 36 tables, found ' || count(*)
  END
FROM information_schema.tables
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

ORDER BY check_id;

-- ============================================================
-- VISIBLE SUMMARY: service_role table coverage detail
-- This separate query ensures Supabase SQL Editor shows it
-- even if the UNION ALL result scrolls past.
-- ============================================================
SELECT
  'SERVICE_ROLE_SUMMARY' AS report,
  count(DISTINCT table_name) AS tables_covered,
  count(*) AS total_privilege_rows
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
  AND grantee = 'service_role';
