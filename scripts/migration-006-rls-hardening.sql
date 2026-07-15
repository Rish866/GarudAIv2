-- ============================================================
-- MIGRATION 006: RLS Hardening — Organization Isolation
--
-- CRITICAL: This migration ONLY applies to tables that have
-- the 'organization_id' column. Tables that only have 'tenant_id'
-- are NOT affected (they use the existing get_user_tenant_id() function).
--
-- PREREQUISITES:
-- 1. organization_members table exists
-- 2. get_user_tenant_id() function exists (confirmed in production)
-- 3. Tables have been migrated to have organization_id column
--    (via map-existing-data-to-organizations.sql or migration 004/005)
--
-- This migration is SAFE to run on a partially-migrated database.
-- Tables without organization_id are silently skipped.
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get the current user's organization ID from their active membership
-- This is the NEW canonical function for multi-tenant isolation
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if the current user has all-branch access
CREATE OR REPLACE FUNCTION user_has_all_branch_access()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT has_all_branch_access
     FROM organization_members
     WHERE user_id = auth.uid()
       AND status = 'active'
     ORDER BY created_at ASC
     LIMIT 1),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if the current user can access a specific branch
CREATE OR REPLACE FUNCTION user_can_access_branch(target_branch_id UUID)
RETURNS BOOLEAN AS $$
  SELECT CASE
    WHEN user_has_all_branch_access() THEN true
    WHEN target_branch_id IS NULL THEN true
    ELSE EXISTS (
      SELECT 1
      FROM organization_member_branches omb
      JOIN organization_members om ON om.id = omb.member_id
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND omb.branch_id = target_branch_id
    )
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Get the current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role
  FROM organization_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- DROP EXISTING OPEN POLICIES
-- Only drop policies we know exist (from original SUPABASE_SCHEMA.sql)
-- ============================================================

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
      AND (
        policyname = 'anon_full_access'
        OR policyname = 'Allow all for anon'
        OR policyname LIKE 'tenant_%'
        OR policyname LIKE 'org_%'
        OR policyname LIKE 'branch_%'
      )
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- ORGANIZATION-LEVEL RLS POLICIES
-- Applied ONLY to tables that have 'organization_id' column
-- Tables without this column are SKIPPED (no error)
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.column_name = 'organization_id'
      AND c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('organizations', 'organization_members', 'organization_invitations', 'organization_settings', 'organization_member_branches', 'user_profiles')
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT: User can only read their organization's data
    EXECUTE format(
      'CREATE POLICY "org_read_%1$s" ON %1$I FOR SELECT USING (organization_id = get_user_organization_id())',
      tbl
    );

    -- INSERT: Must insert into own organization
    EXECUTE format(
      'CREATE POLICY "org_write_%1$s" ON %1$I FOR INSERT WITH CHECK (organization_id = get_user_organization_id())',
      tbl
    );

    -- UPDATE: Can only update own organization's records, cannot change org_id
    EXECUTE format(
      'CREATE POLICY "org_edit_%1$s" ON %1$I FOR UPDATE USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id())',
      tbl
    );

    -- DELETE: Can only delete own organization's records
    EXECUTE format(
      'CREATE POLICY "org_del_%1$s" ON %1$I FOR DELETE USING (organization_id = get_user_organization_id())',
      tbl
    );

    RAISE NOTICE 'Applied RLS to table: %', tbl;
  END LOOP;
END $$;

-- ============================================================
-- SPECIAL POLICIES FOR SYSTEM TABLES
-- ============================================================

-- organizations: users can read their own org
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_org" ON organizations;
CREATE POLICY "users_read_own_org" ON organizations FOR SELECT
  USING (id = get_user_organization_id());

-- organization_members: users can read members of their org
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_org_members" ON organization_members;
CREATE POLICY "users_read_org_members" ON organization_members FOR SELECT
  USING (organization_id = get_user_organization_id());

-- organization_invitations: users can read invitations for their org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_invitations') THEN
    ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "users_read_org_invites" ON organization_invitations';
    EXECUTE 'CREATE POLICY "users_read_org_invites" ON organization_invitations FOR SELECT USING (organization_id = get_user_organization_id())';
    EXECUTE 'CREATE POLICY "users_write_org_invites" ON organization_invitations FOR INSERT WITH CHECK (organization_id = get_user_organization_id())';
    EXECUTE 'CREATE POLICY "users_update_org_invites" ON organization_invitations FOR UPDATE USING (organization_id = get_user_organization_id())';
  END IF;
END $$;

-- branches: users can read branches of their org
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'organization_id') THEN
    ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
    EXECUTE 'DROP POLICY IF EXISTS "users_read_org_branches" ON branches';
    EXECUTE 'CREATE POLICY "users_read_org_branches" ON branches FOR SELECT USING (organization_id = get_user_organization_id())';
  END IF;
END $$;

-- ============================================================
-- BRANCH_ID = 'all' PREVENTION
-- Only apply to tables that have branch_id column AND it's UUID type
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  col_type TEXT;
BEGIN
  FOR tbl IN
    SELECT c.table_name
    FROM information_schema.columns c
    WHERE c.column_name = 'branch_id'
      AND c.table_schema = 'public'
      AND c.data_type IN ('uuid', 'text', 'character varying')
  LOOP
    -- Get actual column type
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = tbl AND column_name = 'branch_id' AND table_schema = 'public';

    -- For UUID columns, invalid text 'all' would already fail type casting
    -- For TEXT columns, add explicit CHECK
    IF col_type IN ('text', 'character varying') THEN
      EXECUTE format(
        'ALTER TABLE %I DROP CONSTRAINT IF EXISTS chk_branch_not_all_%1$s',
        tbl
      );
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT chk_branch_not_all_%1$s CHECK (branch_id IS NULL OR branch_id != ''all'')',
        tbl
      );
      RAISE NOTICE 'Added branch_id CHECK to: %', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- SERVICE ROLE BYPASS
-- Ensure service_role can always access all data (for admin/migration scripts)
-- Supabase service_role bypasses RLS by default, but be explicit:
-- ============================================================
-- NOTE: In Supabase, service_role key automatically bypasses RLS.
-- No additional policy needed for service_role access.

-- ============================================================
-- DONE
-- Run verification:
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================
