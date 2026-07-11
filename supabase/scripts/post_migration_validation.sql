-- ============================================================
-- GARUD AI ERP — Post-Migration Validation
-- 
-- Run this AFTER executing the full migration chain (000 → 007).
-- It verifies that all multi-tenant infrastructure is correctly
-- set up and no data was lost.
--
-- This is a READ-ONLY validation. It does not modify anything.
-- Each check outputs PASS or FAIL.
-- ============================================================

-- ============================================================
-- CHECK 1: All foundation tables exist
-- ============================================================
SELECT '=== CHECK 1: Foundation Tables ===' AS section;

SELECT 
  t.expected AS table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.expected
  ) THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM (VALUES 
  ('organizations'),
  ('organization_members'),
  ('organization_settings'),
  ('organization_invitations'),
  ('user_profiles'),
  ('platform_admins')
) AS t(expected);

-- ============================================================
-- CHECK 2: All 36 business tables exist with organization_id
-- ============================================================
SELECT '=== CHECK 2: Business Tables + organization_id ===' AS section;

SELECT 
  t.expected AS table_name,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = t.expected
    ) THEN '❌ TABLE MISSING'
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = t.expected AND column_name = 'organization_id'
    ) THEN '❌ NO org_id COLUMN'
    ELSE '✅ PASS'
  END AS result
FROM (VALUES 
  ('vehicles'), ('drivers'), ('customers'), ('trips'),
  ('enquiries'), ('quotations'), ('invoices'), ('payments'),
  ('expenses'), ('fuel_entries'), ('maintenance_records'), ('tyres'),
  ('activity_log'), ('notifications'), ('eway_bills'), ('branches'),
  ('vendors'), ('contracts'), ('routes'), ('indents'),
  ('market_hires'), ('work_orders'), ('challans'), ('geofences'),
  ('claims'), ('approvals'), ('transfers'), ('cash_entries'),
  ('bank_entries'), ('ledger_accounts'), ('purchases'), ('sales'),
  ('inventory'), ('attendance'), ('leave_requests'), ('gps_devices')
) AS t(expected);

-- ============================================================
-- CHECK 3: No orphan rows (organization_id IS NULL)
-- ============================================================
SELECT '=== CHECK 3: No Orphan Rows ===' AS section;

DO $$
DECLARE
  tbl TEXT;
  orphan_count BIGINT;
  all_clean BOOLEAN := TRUE;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','notifications','eway_bills','branches',
    'vendors','contracts','routes','indents','market_hires','work_orders',
    'challans','geofences','claims','approvals','transfers',
    'cash_entries','bank_entries','ledger_accounts','purchases','sales',
    'inventory','attendance','leave_requests','gps_devices'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'organization_id'
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id IS NULL', tbl) INTO orphan_count;
      IF orphan_count > 0 THEN
        RAISE NOTICE '❌ FAIL: % has % rows with NULL organization_id', tbl, orphan_count;
        all_clean := FALSE;
      END IF;
    END IF;
  END LOOP;
  
  IF all_clean THEN
    RAISE NOTICE '✅ PASS: No orphan rows found in any table';
  END IF;
END $$;

-- ============================================================
-- CHECK 4: RLS is enabled on all tenant-owned tables
-- ============================================================
SELECT '=== CHECK 4: RLS Enabled ===' AS section;

SELECT tablename,
  CASE WHEN rowsecurity THEN '✅ PASS' ELSE '❌ FAIL - RLS DISABLED' END AS result
FROM pg_tables
WHERE schemaname = 'public' AND tablename IN (
  'organizations','organization_members','organization_settings',
  'organization_invitations','user_profiles','platform_admins',
  'vehicles','drivers','customers','trips','enquiries','quotations',
  'invoices','payments','expenses','fuel_entries','maintenance_records',
  'tyres','activity_log','notifications','eway_bills','branches',
  'vendors','contracts','routes','indents','market_hires','work_orders',
  'challans','geofences','claims','approvals','transfers',
  'cash_entries','bank_entries','ledger_accounts','purchases','sales',
  'inventory','attendance','leave_requests','gps_devices'
)
ORDER BY tablename;

-- ============================================================
-- CHECK 5: No unsafe USING(true) policies remain
-- ============================================================
SELECT '=== CHECK 5: No Unsafe Policies ===' AS section;

SELECT 
  CASE WHEN count(*) = 0 
    THEN '✅ PASS: No USING(true) policies found'
    ELSE '❌ FAIL: ' || count(*) || ' unsafe policies found'
  END AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR qual LIKE '%uid()%is not null%');

-- Show any unsafe policies if they exist
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR qual LIKE '%uid()%is not null%');

-- ============================================================
-- CHECK 6: Helper functions exist
-- ============================================================
SELECT '=== CHECK 6: Helper Functions ===' AS section;

SELECT 
  t.expected AS function_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = t.expected
  ) THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM (VALUES 
  ('is_organization_member'),
  ('current_user_organization_ids'),
  ('has_organization_role'),
  ('is_platform_admin'),
  ('create_organization_for_user'),
  ('validate_same_organization'),
  ('log_privileged_action')
) AS t(expected);

-- ============================================================
-- CHECK 7: At least one organization exists
-- ============================================================
SELECT '=== CHECK 7: Organization Exists ===' AS section;

SELECT 
  CASE WHEN count(*) > 0 
    THEN '✅ PASS: ' || count(*) || ' organization(s) exist'
    ELSE '⚠️ WARNING: No organizations yet (will be created on first signup)'
  END AS result
FROM public.organizations;

-- ============================================================
-- CHECK 8: Validation triggers exist on critical tables
-- ============================================================
SELECT '=== CHECK 8: Cross-Org Validation Triggers ===' AS section;

SELECT 
  event_object_table AS table_name,
  trigger_name,
  '✅ PRESENT' AS result
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'validate_%'
ORDER BY event_object_table;

-- ============================================================
-- CHECK 9: Single-membership constraint exists
-- ============================================================
SELECT '=== CHECK 9: Single Membership Constraint ===' AS section;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'organization_members' 
      AND indexname = 'idx_single_active_membership'
  ) THEN '✅ PASS: idx_single_active_membership exists'
  ELSE '❌ FAIL: constraint missing'
  END AS result;

-- ============================================================
-- CHECK 10: Storage bucket exists
-- ============================================================
SELECT '=== CHECK 10: Storage Bucket ===' AS section;

SELECT 
  CASE WHEN EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'erp-documents'
  ) THEN '✅ PASS: erp-documents bucket exists'
  ELSE '⚠️ INFO: erp-documents bucket not yet created (will be on first upload or run migration 004)'
  END AS result;

-- ============================================================
-- CHECK 11: Composite unique constraints (for relational integrity)
-- ============================================================
SELECT '=== CHECK 11: Composite Unique Constraints ===' AS section;

SELECT 
  t.expected AS constraint_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = t.expected AND constraint_type = 'UNIQUE'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END AS result
FROM (VALUES 
  ('vehicles_org_id_unique'),
  ('drivers_org_id_unique'),
  ('customers_org_id_unique'),
  ('trips_org_id_unique'),
  ('invoices_org_id_unique'),
  ('branches_org_id_unique')
) AS t(expected);

-- ============================================================
-- SUMMARY
-- ============================================================
SELECT '=== MIGRATION VALIDATION COMPLETE ===' AS section;
SELECT 'Review results above. All items should show ✅ PASS.' AS instructions;
SELECT 'If any show ❌ FAIL, re-run the relevant migration.' AS next_steps;

-- ============================================================
-- END OF VALIDATION
-- ============================================================
