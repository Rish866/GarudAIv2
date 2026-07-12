-- migration-002-C-validation.sql
-- Read-only post-validation for Migration 002
-- Target: staging ybuhazlnjqjrshcvpuna
-- Returns visible result rows. SUMMARY derives from actual check results.

WITH expected_tables(name) AS (
  VALUES ('vendors'),('contracts'),('routes'),('indents'),('market_hires'),
         ('work_orders'),('challans'),('geofences'),('claims'),('approvals'),
         ('transfers'),('cash_entries'),('bank_entries'),('ledger_accounts'),
         ('purchases'),('sales'),('inventory'),('attendance'),('leave_requests'),
         ('gps_devices')
),
c1 AS (
  SELECT 'C01_TABLES_EXIST' AS check_name,
    CASE WHEN (SELECT count(*) FROM expected_tables e WHERE EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_name = e.name
    )) = 20 THEN 'PASS' ELSE 'FAIL' END AS result
),
c2 AS (
  SELECT 'C02_RLS_ENABLED' AS check_name,
    CASE WHEN (SELECT count(*) FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity
        AND tablename IN (SELECT name FROM expected_tables)
    ) = 20 THEN 'PASS' ELSE 'FAIL' END AS result
),
c3 AS (
  SELECT 'C03_ORG_ID_UUID_NOT_NULL' AS check_name,
    CASE WHEN (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'organization_id'
        AND data_type = 'uuid' AND is_nullable = 'NO'
        AND table_name IN (SELECT name FROM expected_tables)
    ) = 20 THEN 'PASS' ELSE 'FAIL' END AS result
),
c4 AS (
  SELECT 'C04_ORG_FK_EXISTS_NO_ACTION' AS check_name,
    CASE WHEN (
      SELECT count(*) FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON rc.constraint_name = kcu.constraint_name
        AND rc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON rc.constraint_name = ccu.constraint_name
        AND rc.constraint_schema = ccu.constraint_schema
      WHERE kcu.table_schema = 'public'
        AND kcu.column_name = 'organization_id'
        AND ccu.table_name = 'organizations' AND ccu.column_name = 'id'
        AND rc.delete_rule IN ('NO ACTION','RESTRICT')
        AND kcu.table_name IN (SELECT name FROM expected_tables)
    ) = 20 THEN 'PASS' ELSE 'FAIL' END AS result
),
expected_fks(src_table, src_column, tgt_table, tgt_column) AS (
  VALUES
    ('contracts','customer_id','customers','id'),
    ('indents','customer_id','customers','id'),
    ('indents','trip_id','trips','id'),
    ('work_orders','vehicle_id','vehicles','id'),
    ('challans','vehicle_id','vehicles','id'),
    ('challans','driver_id','drivers','id'),
    ('claims','trip_id','trips','id'),
    ('transfers','from_branch','branches','id'),
    ('transfers','to_branch','branches','id'),
    ('attendance','employee_id','drivers','id'),
    ('leave_requests','employee_id','drivers','id'),
    ('gps_devices','vehicle_id','vehicles','id')
),
c5 AS (
  SELECT 'C05_ENTITY_FKS_EXACT' AS check_name,
    CASE WHEN (
      SELECT count(*) FROM expected_fks ef
      WHERE EXISTS (
        SELECT 1 FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
          ON rc.constraint_name = kcu.constraint_name
          AND rc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON rc.constraint_name = ccu.constraint_name
          AND rc.constraint_schema = ccu.constraint_schema
        WHERE kcu.table_schema = 'public'
          AND kcu.table_name = ef.src_table
          AND kcu.column_name = ef.src_column
          AND ccu.table_name = ef.tgt_table
          AND ccu.column_name = ef.tgt_column
      )
    ) = 12 THEN 'PASS' ELSE 'FAIL' END AS result
),
c6 AS (
  SELECT 'C06_ZERO_POLICIES' AS check_name,
    CASE WHEN (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN (SELECT name FROM expected_tables)
    ) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
),
c7 AS (
  SELECT 'C07_ZERO_API_PRIVILEGES' AS check_name,
    CASE WHEN (SELECT count(*) FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND grantee IN ('anon','authenticated')
        AND table_name IN (SELECT name FROM expected_tables)
    ) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
),
expected_indexes(idx_name, tbl_name) AS (
  VALUES
    ('idx_vendors_org','vendors'),('idx_contracts_org','contracts'),
    ('idx_routes_org','routes'),('idx_indents_org','indents'),
    ('idx_market_hires_org','market_hires'),('idx_work_orders_org','work_orders'),
    ('idx_challans_org','challans'),('idx_geofences_org','geofences'),
    ('idx_claims_org','claims'),('idx_approvals_org','approvals'),
    ('idx_transfers_org','transfers'),('idx_cash_entries_org','cash_entries'),
    ('idx_bank_entries_org','bank_entries'),('idx_ledger_accounts_org','ledger_accounts'),
    ('idx_purchases_org','purchases'),('idx_sales_org','sales'),
    ('idx_inventory_org','inventory'),('idx_attendance_org','attendance'),
    ('idx_leave_requests_org','leave_requests'),('idx_gps_devices_org','gps_devices')
),
c8 AS (
  SELECT 'C08_ORG_INDEXES_EXACT' AS check_name,
    CASE WHEN (
      SELECT count(*) FROM expected_indexes ei
      WHERE EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ei.idx_name
          AND tablename = ei.tbl_name
          AND indexdef LIKE '%organization_id%'
      )
    ) = 20 THEN 'PASS' ELSE 'FAIL' END AS result
),
c9 AS (
  SELECT 'C09_ZERO_ROWS' AS check_name,
    CASE WHEN (
      SELECT sum(cnt) FROM (
        SELECT count(*) AS cnt FROM public.vendors
        UNION ALL SELECT count(*) FROM public.contracts
        UNION ALL SELECT count(*) FROM public.routes
        UNION ALL SELECT count(*) FROM public.indents
        UNION ALL SELECT count(*) FROM public.market_hires
        UNION ALL SELECT count(*) FROM public.work_orders
        UNION ALL SELECT count(*) FROM public.challans
        UNION ALL SELECT count(*) FROM public.geofences
        UNION ALL SELECT count(*) FROM public.claims
        UNION ALL SELECT count(*) FROM public.approvals
        UNION ALL SELECT count(*) FROM public.transfers
        UNION ALL SELECT count(*) FROM public.cash_entries
        UNION ALL SELECT count(*) FROM public.bank_entries
        UNION ALL SELECT count(*) FROM public.ledger_accounts
        UNION ALL SELECT count(*) FROM public.purchases
        UNION ALL SELECT count(*) FROM public.sales
        UNION ALL SELECT count(*) FROM public.inventory
        UNION ALL SELECT count(*) FROM public.attendance
        UNION ALL SELECT count(*) FROM public.leave_requests
        UNION ALL SELECT count(*) FROM public.gps_devices
      ) counts
    ) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
),
all_checks AS (
  SELECT * FROM c1 UNION ALL SELECT * FROM c2 UNION ALL SELECT * FROM c3
  UNION ALL SELECT * FROM c4 UNION ALL SELECT * FROM c5
  UNION ALL SELECT * FROM c6 UNION ALL SELECT * FROM c7
  UNION ALL SELECT * FROM c8 UNION ALL SELECT * FROM c9
)
SELECT * FROM all_checks
UNION ALL
SELECT 'SUMMARY' AS check_name,
  CASE WHEN (SELECT count(*) FROM all_checks WHERE result != 'PASS') = 0
    THEN 'MIGRATION 002 VALIDATION: ALL 9 CHECKS PASS'
    ELSE 'MIGRATION 002 VALIDATION: ' || (SELECT count(*) FROM all_checks WHERE result != 'PASS') || ' CHECK(S) FAILED'
  END AS result;
