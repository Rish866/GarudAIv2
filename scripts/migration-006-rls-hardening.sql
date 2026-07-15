-- ============================================================
-- MIGRATION 006: RLS Hardening — Organization + Branch Isolation
--
-- This migration replaces open/legacy RLS policies with strict
-- organization-scoped and branch-scoped access controls.
--
-- PREREQUISITES:
-- 1. All business tables must have 'organization_id' UUID column
-- 2. organization_members table must exist with user_id, organization_id, role, status
-- 3. organization_member_branches table must exist for branch assignments
--
-- RUN WITH: Supabase SQL Editor → New Query → Paste & Execute
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS (Security Definers)
-- ============================================================

-- Get the current user's organization ID from their active membership
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user has all-branch access
CREATE OR REPLACE FUNCTION user_has_all_branch_access()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT has_all_branch_access
     FROM organization_members
     WHERE user_id = auth.uid()
       AND status = 'active'
     LIMIT 1),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if the current user can access a specific branch
CREATE OR REPLACE FUNCTION user_can_access_branch(target_branch_id UUID)
RETURNS BOOLEAN AS $$
  -- All-branch access users can access any branch in their org
  SELECT CASE
    WHEN user_has_all_branch_access() THEN true
    -- Otherwise check explicit branch assignments
    ELSE EXISTS (
      SELECT 1
      FROM organization_member_branches omb
      JOIN organization_members om ON om.id = omb.member_id
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND omb.branch_id = target_branch_id
    )
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get the current user's role in their organization
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role
  FROM organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- DROP EXISTING OPEN POLICIES (from legacy schema)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'vehicles', 'drivers', 'customers', 'vendors', 'routes', 'contracts',
      'enquiries', 'quotations', 'indents', 'trips',
      'invoices', 'payments', 'expenses', 'fuel_entries',
      'maintenance_records', 'work_orders', 'tyres',
      'documents', 'attendance', 'payroll', 'challans', 'claims',
      'eway_bills', 'activity_log', 'notifications', 'branches',
      'market_hires', 'cash_entries', 'bank_entries',
      'purchases', 'sales', 'inventory', 'geofences',
      'tracking_links', 'ledger_accounts'
    )
  LOOP
    -- Drop ALL existing policies on this table
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- ORGANIZATION-LEVEL RLS POLICIES
-- Applied to all business tables with organization_id column
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'vehicles', 'drivers', 'customers', 'vendors', 'routes', 'contracts',
      'enquiries', 'quotations', 'indents', 'trips',
      'invoices', 'payments', 'expenses', 'fuel_entries',
      'maintenance_records', 'work_orders', 'tyres',
      'documents', 'attendance', 'challans', 'claims',
      'eway_bills', 'activity_log', 'notifications',
      'market_hires', 'cash_entries', 'bank_entries',
      'purchases', 'sales', 'inventory', 'geofences',
      'tracking_links', 'ledger_accounts'
    ])
  LOOP
    -- Only if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

      -- SELECT: User can only read their organization's data
      EXECUTE format(
        'CREATE POLICY "org_select_%1$s" ON %1$I FOR SELECT USING (organization_id = get_user_organization_id())',
        tbl
      );

      -- INSERT: Must insert into own organization (enforced — cannot override)
      EXECUTE format(
        'CREATE POLICY "org_insert_%1$s" ON %1$I FOR INSERT WITH CHECK (organization_id = get_user_organization_id())',
        tbl
      );

      -- UPDATE: Can only update own organization's records, cannot change org_id
      EXECUTE format(
        'CREATE POLICY "org_update_%1$s" ON %1$I FOR UPDATE USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id())',
        tbl
      );

      -- DELETE: Can only delete own organization's records
      EXECUTE format(
        'CREATE POLICY "org_delete_%1$s" ON %1$I FOR DELETE USING (organization_id = get_user_organization_id())',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- BRANCH-LEVEL RESTRICTIONS (for branch-scoped tables)
-- These REPLACE the org-level policies with stricter branch checks
-- ============================================================

-- Tables that have branch_id and should enforce branch access
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'vehicles', 'drivers', 'customers', 'trips', 'enquiries', 'quotations',
      'invoices', 'payments', 'expenses', 'fuel_entries', 'maintenance_records',
      'tyres', 'indents', 'attendance', 'claims', 'challans', 'work_orders',
      'market_hires', 'cash_entries', 'bank_entries', 'purchases', 'sales',
      'inventory', 'eway_bills'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'branch_id' AND table_schema = 'public') THEN
      -- Drop the basic org policies and replace with branch-aware ones
      EXECUTE format('DROP POLICY IF EXISTS "org_select_%1$s" ON %1$I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "org_insert_%1$s" ON %1$I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "org_update_%1$s" ON %1$I', tbl);

      -- SELECT: Org match AND (all-branch access OR branch in user's assignments)
      EXECUTE format(
        'CREATE POLICY "branch_select_%1$s" ON %1$I FOR SELECT USING (
          organization_id = get_user_organization_id()
          AND (
            user_has_all_branch_access()
            OR branch_id IS NULL
            OR user_can_access_branch(branch_id)
          )
        )', tbl
      );

      -- INSERT: Org match AND branch must be in user's accessible branches
      EXECUTE format(
        'CREATE POLICY "branch_insert_%1$s" ON %1$I FOR INSERT WITH CHECK (
          organization_id = get_user_organization_id()
          AND (
            user_has_all_branch_access()
            OR user_can_access_branch(branch_id)
          )
          AND branch_id IS DISTINCT FROM NULL
        )', tbl
      );

      -- UPDATE: Cannot change organization_id or branch_id to unauthorized values
      EXECUTE format(
        'CREATE POLICY "branch_update_%1$s" ON %1$I FOR UPDATE USING (
          organization_id = get_user_organization_id()
          AND (user_has_all_branch_access() OR user_can_access_branch(branch_id))
        ) WITH CHECK (
          organization_id = get_user_organization_id()
          AND (user_has_all_branch_access() OR user_can_access_branch(branch_id))
        )', tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- BRANCHES TABLE — Special policy (org-scoped only, no branch_id on itself)
-- ============================================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select_branches" ON branches FOR SELECT
  USING (organization_id = get_user_organization_id());
CREATE POLICY "org_insert_branches" ON branches FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND get_user_role() IN ('organization_owner', 'admin'));
CREATE POLICY "org_update_branches" ON branches FOR UPDATE
  USING (organization_id = get_user_organization_id() AND get_user_role() IN ('organization_owner', 'admin'));
CREATE POLICY "org_delete_branches" ON branches FOR DELETE
  USING (organization_id = get_user_organization_id() AND get_user_role() IN ('organization_owner', 'admin'));

-- ============================================================
-- ORGANIZATION_MEMBERS — Users can only see members of their own org
-- ============================================================
CREATE POLICY "org_select_members" ON organization_members FOR SELECT
  USING (organization_id = get_user_organization_id());

-- ============================================================
-- CUSTOMER ROLE RESTRICTION
-- Customers can only see their own trips, invoices, payments
-- (requires customer_user_id on trips/invoices or matching via customer_id)
-- NOTE: This is a VIEW-layer restriction handled by the app for now.
-- Full customer portal RLS requires a customer_user_id FK on trips/invoices.
-- ============================================================

-- ============================================================
-- DRIVER ROLE RESTRICTION  
-- Drivers should only see their assigned trips
-- NOTE: Requires driver_user_id FK. Handled by app layer for now.
-- ============================================================

-- ============================================================
-- PREVENT branch_id = 'all' INSERT
-- This constraint ensures no record can be saved with the string 'all'
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'vehicles', 'drivers', 'customers', 'trips', 'enquiries', 'quotations',
      'invoices', 'payments', 'expenses', 'fuel_entries', 'maintenance_records',
      'tyres', 'indents', 'attendance'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'branch_id' AND table_schema = 'public') THEN
      -- Add CHECK constraint to prevent 'all' string (must be valid UUID or NULL)
      EXECUTE format(
        'ALTER TABLE %I DROP CONSTRAINT IF EXISTS chk_%1$s_branch_id_not_all', tbl
      );
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT chk_%1$s_branch_id_not_all CHECK (branch_id IS NULL OR branch_id::text != ''all'')',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- DONE
-- Run verification queries after applying:
--   SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
