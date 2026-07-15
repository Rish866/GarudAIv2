-- ============================================================
-- ROLLBACK for migration-006-rls-hardening.sql
--
-- Run this ONLY if the migration causes lockout or data access issues.
-- This restores the "anon full access" policies temporarily.
-- After rollback, investigate and fix the issue before re-applying.
-- ============================================================

-- Drop all policies created by migration-006
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE tablename = tbl AND schemaname = 'public'
      AND (policyname LIKE 'org_%' OR policyname LIKE 'branch_%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- Restore safe authenticated-only access (not anon open)
-- This allows all authenticated users to access all data in their session
-- It is NOT secure for multi-tenant, but prevents lockout
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'vehicles', 'drivers', 'customers', 'vendors', 'trips',
      'enquiries', 'quotations', 'indents', 'invoices', 'payments',
      'expenses', 'fuel_entries', 'maintenance_records', 'tyres',
      'documents', 'challans', 'claims', 'eway_bills',
      'activity_log', 'notifications', 'branches',
      'work_orders', 'market_hires', 'routes', 'contracts'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      EXECUTE format(
        'CREATE POLICY "rollback_authenticated_%1$s" ON %1$I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- Keep helper functions (they don't cause harm)
-- DROP FUNCTION IF EXISTS get_user_organization_id();
-- DROP FUNCTION IF EXISTS user_has_all_branch_access();
-- DROP FUNCTION IF EXISTS user_can_access_branch(UUID);
-- DROP FUNCTION IF EXISTS get_user_role();

-- ============================================================
-- After rollback, the system is in "authenticated but not tenant-isolated" state.
-- Re-investigate the migration issue and re-apply once fixed.
-- ============================================================
