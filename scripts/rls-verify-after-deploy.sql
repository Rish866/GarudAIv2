-- ============================================================
-- RLS VERIFICATION — Run AFTER migration-006-rls-hardening.sql
-- Confirms policies are active and working correctly.
-- ============================================================

-- 1. Verify policies exist on key tables
SELECT 'ACTIVE POLICIES' AS section;
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('vehicles', 'drivers', 'customers', 'trips', 'invoices', 'branches')
ORDER BY tablename, cmd;

-- 2. Verify helper functions exist
SELECT 'HELPER FUNCTIONS' AS section;
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_organization_id',
    'user_has_all_branch_access',
    'user_can_access_branch',
    'get_user_role'
  );

-- 3. Test deny-by-default: anon user should get no rows
-- (Run this WITHOUT being authenticated)
SELECT 'DENY-BY-DEFAULT TEST (should return 0 rows)' AS section;
SELECT COUNT(*) AS vehicle_count FROM vehicles;
SELECT COUNT(*) AS trip_count FROM trips;

-- 4. Verify CHECK constraint on branch_id
SELECT 'BRANCH_ID CONSTRAINTS' AS section;
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE 'chk_%_branch_id_not_all';

-- 5. Verify service_role bypass works (for admin operations)
-- NOTE: This must be tested with service_role key, not anon key
-- SELECT 'SERVICE ROLE TEST' AS section;
-- SET ROLE authenticated;
-- SELECT COUNT(*) FROM vehicles; -- should work for service_role

-- ============================================================
-- DEPLOYMENT ORDER:
-- 1. Run rls-preflight-check.sql → verify clean output
-- 2. Run migration-006-rls-hardening.sql
-- 3. Run rls-verify-after-deploy.sql → verify policies active
-- 4. Test login with test2@test.com → verify data loads
-- 5. If lockout occurs → run rls-rollback.sql immediately
-- ============================================================
