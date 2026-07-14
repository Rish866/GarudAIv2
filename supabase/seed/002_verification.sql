-- ============================================================
-- VERIFICATION: Run after migrations + seed to confirm everything works
-- ============================================================

-- 1. Table existence
SELECT '=== TABLES ===' AS section;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. RPC functions exist
SELECT '=== RPC FUNCTIONS ===' AS section;
SELECT proname, prokind FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('cancel_trip','reopen_trip','transition_trip_status','update_trip_details','is_valid_trip_transition','is_organization_member','has_organization_role','create_organization_for_user')
ORDER BY proname;

-- 3. trip_status_history columns
SELECT '=== TRIP_STATUS_HISTORY COLUMNS ===' AS section;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trip_status_history'
ORDER BY ordinal_position;

-- 4. New trip columns
SELECT '=== NEW TRIP COLUMNS ===' AS section;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trips'
  AND column_name IN ('organization_id','cancelled_by','previous_status','reopened_by','reopened_at','reopen_reason','updated_at','cancellation_reason','cancelled_at')
ORDER BY column_name;

-- 5. RLS enabled
SELECT '=== RLS STATUS ===' AS section;
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('trips','vehicles','drivers','customers','trip_status_history','organizations','organization_members')
ORDER BY tablename;

-- 6. RLS policies on trip_status_history
SELECT '=== TRIP_STATUS_HISTORY POLICIES ===' AS section;
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'trip_status_history'
ORDER BY policyname;

-- 7. Organization data
SELECT '=== ORGANIZATIONS ===' AS section;
SELECT id, name, status FROM public.organizations ORDER BY name;

-- 8. Organization members
SELECT '=== MEMBERS ===' AS section;
SELECT om.role, au.email, o.name as org_name
FROM public.organization_members om
JOIN auth.users au ON au.id = om.user_id
JOIN public.organizations o ON o.id = om.organization_id
ORDER BY o.name, om.role;

-- 9. Row counts
SELECT '=== ROW COUNTS ===' AS section;
SELECT 'organizations' as tbl, count(*) FROM public.organizations
UNION ALL SELECT 'members', count(*) FROM public.organization_members
UNION ALL SELECT 'customers', count(*) FROM public.customers
UNION ALL SELECT 'vehicles', count(*) FROM public.vehicles
UNION ALL SELECT 'drivers', count(*) FROM public.drivers
UNION ALL SELECT 'trips', count(*) FROM public.trips
UNION ALL SELECT 'invoices', count(*) FROM public.invoices
ORDER BY tbl;

-- 10. No tenant_id in active schema
SELECT '=== TENANT_ID CHECK (should be 0 rows) ===' AS section;
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'tenant_id'
  AND table_name NOT IN ('_legacy_backup');

-- 11. GRANT verification on RPCs
SELECT '=== RPC GRANTS ===' AS section;
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('cancel_trip','reopen_trip','transition_trip_status','update_trip_details')
  AND grantee = 'authenticated'
ORDER BY routine_name;

SELECT '=== VERIFICATION COMPLETE ===' AS result;
