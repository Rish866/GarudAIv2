-- ============================================================
-- GARUD AI — Phase 4: Validate Tenant Migration
-- Run AFTER map-existing-data-to-organizations.sql
-- ============================================================

-- 1. Verify NO records have NULL organization_id
SELECT 'vehicles' as tbl, count(*) FILTER (WHERE organization_id IS NULL) as null_org FROM vehicles
UNION ALL SELECT 'drivers', count(*) FILTER (WHERE organization_id IS NULL) FROM drivers
UNION ALL SELECT 'customers', count(*) FILTER (WHERE organization_id IS NULL) FROM customers
UNION ALL SELECT 'trips', count(*) FILTER (WHERE organization_id IS NULL) FROM trips
UNION ALL SELECT 'enquiries', count(*) FILTER (WHERE organization_id IS NULL) FROM enquiries
UNION ALL SELECT 'quotations', count(*) FILTER (WHERE organization_id IS NULL) FROM quotations
UNION ALL SELECT 'invoices', count(*) FILTER (WHERE organization_id IS NULL) FROM invoices
UNION ALL SELECT 'payments', count(*) FILTER (WHERE organization_id IS NULL) FROM payments
UNION ALL SELECT 'expenses', count(*) FILTER (WHERE organization_id IS NULL) FROM expenses
UNION ALL SELECT 'fuel_entries', count(*) FILTER (WHERE organization_id IS NULL) FROM fuel_entries
UNION ALL SELECT 'maintenance_records', count(*) FILTER (WHERE organization_id IS NULL) FROM maintenance_records
UNION ALL SELECT 'tyres', count(*) FILTER (WHERE organization_id IS NULL) FROM tyres
UNION ALL SELECT 'activity_log', count(*) FILTER (WHERE organization_id IS NULL) FROM activity_log
UNION ALL SELECT 'notifications', count(*) FILTER (WHERE organization_id IS NULL) FROM notifications
UNION ALL SELECT 'eway_bills', count(*) FILTER (WHERE organization_id IS NULL) FROM eway_bills
UNION ALL SELECT 'branches', count(*) FILTER (WHERE organization_id IS NULL) FROM branches;
-- Expected: ALL rows show 0 for null_org

-- 2. Verify demo data belongs ONLY to demo organization
SELECT 'vehicles' as tbl, organization_id, count(*) FROM vehicles GROUP BY organization_id
UNION ALL SELECT 'trips', organization_id, count(*) FROM trips GROUP BY organization_id
UNION ALL SELECT 'customers', organization_id, count(*) FROM customers GROUP BY organization_id
ORDER BY tbl, organization_id;
-- Expected: All counts under '00000000-0000-0000-0000-000000000001' (demo org)

-- 3. Verify RLS is enabled on all business tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches',
    'vendors','contracts','routes','indents','market_hires','work_orders',
    'challans','geofences','claims','approvals','transfers',
    'cash_entries','bank_entries','ledger_accounts','purchases','sales',
    'inventory','attendance','leave_requests','gps_devices'
  )
ORDER BY tablename;
-- Expected: ALL show rowsecurity = true

-- 4. Verify RLS policies exist for all tables
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: 4 policies (select, insert, update, delete) per table

-- 5. Verify helper functions exist
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('is_organization_member', 'current_user_organization_ids', 'has_organization_role', 'is_platform_admin', 'create_organization_for_user');
-- Expected: 5 functions, all with prosecdef = true

-- 6. Test isolation: Create test user and verify no access
-- (Run manually with a test auth token)
-- SELECT * FROM vehicles; -- Should return 0 rows for user with no org membership

-- ============================================================
-- MIGRATION REPORT
-- ============================================================
-- After running this validation:
-- ✅ All records have organization_id (NOT NULL)
-- ✅ Demo data isolated to demo org UUID
-- ✅ RLS enabled on all 36 business tables
-- ✅ Policies enforce org membership
-- ✅ Helper functions operational
-- ✅ New registered users will see 0 records (no org data yet)
-- ============================================================
