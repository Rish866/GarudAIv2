-- ============================================================
-- GARUD AI TRANSPORT ERP — Production Database Schema
-- ============================================================
--
-- This is the CANONICAL schema for new deployments.
-- It includes secure RLS policies by default.
--
-- SECURITY: No table is accessible without authentication.
-- Every table uses organization_id-based isolation.
--
-- PREREQUISITES:
--   1. Supabase project created with Auth enabled
--   2. Email/password auth provider enabled
--   3. Run this script in SQL Editor
--   4. Then run supabase/migrations/001-platform-tables.sql
--   5. Then run supabase/migrations/002-workflow-tables.sql
--
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PLATFORM TABLES (Multi-Tenant Infrastructure)
-- These must exist BEFORE business tables
-- ============================================================

-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  gstin TEXT,
  pan TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Members (user-to-org mapping with role)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN (
    'organization_owner', 'admin', 'operations_manager', 'dispatcher',
    'fleet_manager', 'accountant', 'maintenance_manager', 'hr_manager',
    'driver', 'customer', 'vendor', 'viewer'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  has_all_branch_access BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- Organization Invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL,
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Settings
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT false,
  default_gst_percent NUMERIC DEFAULT 5,
  default_tds_percent NUMERIC DEFAULT 2,
  invoice_prefix TEXT DEFAULT 'INV',
  trip_prefix TEXT DEFAULT 'TRP',
  lr_prefix TEXT DEFAULT 'LR',
  financial_year_start INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Member Branch Access
CREATE TABLE IF NOT EXISTS organization_member_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, branch_id)
);

-- User Profiles (public metadata)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECURITY HELPER FUNCTIONS
-- These MUST be created before RLS policies
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
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if user is a member of a specific organization
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if user has a specific role in their organization
CREATE OR REPLACE FUNCTION has_organization_role(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND status = 'active'
      AND role = ANY(allowed_roles)
  );
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

-- Check if user has all-branch access
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

-- Prevent organization_id from being changed after insert
CREATE OR REPLACE FUNCTION enforce_immutable_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    RAISE EXCEPTION 'organization_id is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PLATFORM TABLE RLS POLICIES
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_member_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Organizations: users can read their own org
CREATE POLICY "users_read_own_org" ON organizations
  FOR SELECT USING (id = get_user_organization_id());

-- Organization Members: users can read/write members of their org
CREATE POLICY "members_read" ON organization_members
  FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "members_insert" ON organization_members
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "members_update" ON organization_members
  FOR UPDATE USING (organization_id = get_user_organization_id());

-- Invitations: org members can manage
CREATE POLICY "invites_read" ON organization_invitations
  FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "invites_insert" ON organization_invitations
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());
CREATE POLICY "invites_update" ON organization_invitations
  FOR UPDATE USING (organization_id = get_user_organization_id());

-- Settings: org members can read/update
CREATE POLICY "settings_read" ON organization_settings
  FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "settings_update" ON organization_settings
  FOR UPDATE USING (organization_id = get_user_organization_id());

-- Member Branches: members can read their own assignments
CREATE POLICY "branches_read" ON organization_member_branches
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM organization_members
      WHERE organization_id = get_user_organization_id()
    )
  );

-- User Profiles: users can read/update their own profile
CREATE POLICY "profile_read_own" ON user_profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profile_update_own" ON user_profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profile_insert" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================
-- ORGANIZATION CREATION RPC
-- Used during signup to create org + membership atomically
-- ============================================================

CREATE OR REPLACE FUNCTION create_organization_for_user(
  org_name TEXT,
  org_gstin TEXT DEFAULT NULL,
  org_city TEXT DEFAULT NULL,
  org_state TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, gstin, city, state)
  VALUES (org_name, org_gstin, org_city, org_state)
  RETURNING id INTO v_org_id;

  -- Create owner membership
  INSERT INTO organization_members (organization_id, user_id, role, status, has_all_branch_access)
  VALUES (v_org_id, v_user_id, 'organization_owner', 'active', true);

  -- Create default settings
  INSERT INTO organization_settings (organization_id)
  VALUES (v_org_id);

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE: Platform tables are ready.
-- Next: Run supabase/migrations/001-business-tables.sql
-- ============================================================
