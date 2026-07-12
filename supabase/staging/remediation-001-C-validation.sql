-- remediation-001-C-validation.sql
-- Pre-Migration-003 Privilege Remediation: Validation
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes
-- Expected: ALL 3 CHECKS PASS

-- ============================================================
-- C01: Zero privileges for 'anon' on all 36 business tables
-- ============================================================
SELECT
  'C01' AS check_id,
  'zero_anon_privileges' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' anon privileges remain: ' ||
      string_agg(table_name || ':' || privilege_type, ', ' ORDER BY table_name, privilege_type)
  END AS result
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
-- C02: Zero privileges for 'authenticated' on all 36 business tables
-- ============================================================
SELECT
  'C02',
  'zero_authenticated_privileges',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' authenticated privileges remain: ' ||
      string_agg(table_name || ':' || privilege_type, ', ' ORDER BY table_name, privilege_type)
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
-- C03: Confirm exact 36 business tables exist (sanity check)
-- ============================================================
SELECT
  'C03',
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
