-- remediation-001-C-validation.sql
-- Pre-Migration-003 Privilege Remediation: Validation
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes
-- Validates EFFECTIVE privileges (not just direct grant rows)
-- Expected: ALL 6 CHECKS PASS

-- ============================================================
-- C01: Zero effective privileges for 'anon' across all 36 tables × 7 privilege types
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
    ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')
  ) AS p(priv)
  WHERE has_table_privilege('anon', 'public.' || t.t, p.priv)
) violations

UNION ALL

-- ============================================================
-- C02: Zero effective privileges for 'authenticated' across all 36 tables × 7 privilege types
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
    ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')
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
-- C04: service_role retains direct privileges (expected: has grants)
-- This confirms the REVOKE did not accidentally remove service_role access.
-- ============================================================
SELECT
  'C04',
  'service_role_intact',
  CASE WHEN count(*) > 0 THEN 'PASS'
    ELSE 'FAIL: service_role has zero direct privileges (may indicate broader issue)'
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
-- C06: All 36 business tables exist (sanity)
-- ============================================================
SELECT
  'C06',
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
