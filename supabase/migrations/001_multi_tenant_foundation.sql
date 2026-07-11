-- ============================================================
-- GARUD AI ERP — Multi-Tenant Foundation Migration
-- Phase 1: Organizations, Members, Helpers, Table Alterations
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PHASE 1A: Core Multi-Tenant Tables
-- ============================================================

-- Organizations (each transport company)
CREATE TABLE IF NOT EXISTS public.organizations (
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
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization Members (user ↔ org relationship)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'organization_owner', 'admin', 'operations_manager', 'dispatcher',
    'fleet_manager', 'accountant', 'maintenance_manager', 'hr_manager',
    'driver', 'customer', 'viewer'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- Organization Settings (per-org config)
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  default_gst_percent NUMERIC DEFAULT 5,
  default_tds_percent NUMERIC DEFAULT 2,
  invoice_prefix TEXT DEFAULT 'INV',
  trip_prefix TEXT DEFAULT 'TRP',
  lr_prefix TEXT DEFAULT 'LR',
  financial_year_start INTEGER DEFAULT 4, -- April
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization Invitations
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform Admins (separate from org roles)
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'admin' CHECK (level IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PHASE 2: Tenant Helper Functions
-- ============================================================

-- Check if current user is a member of given organization
CREATE OR REPLACE FUNCTION public.is_organization_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Get all organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS SETOF UUID AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active';
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if user has specific role(s) in an organization
CREATE OR REPLACE FUNCTION public.has_organization_role(target_org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(allowed_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Check if current user is a platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- PHASE 3: Add organization_id to ALL tenant-owned tables
-- ============================================================

-- Vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Drivers
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Enquiries
ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Quotations
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Fuel Entries
ALTER TABLE fuel_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Maintenance Records
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Tyres
ALTER TABLE tyres ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Activity Log
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- E-Way Bills
ALTER TABLE eway_bills ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- ============================================================
-- PHASE 5: RLS Policies (Membership-Based)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Organizations: members can view their own org
CREATE POLICY "Members can view their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (public.is_organization_member(id) OR public.is_platform_admin());

CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_organization_role(id, ARRAY['organization_owner', 'admin']))
  WITH CHECK (public.has_organization_role(id, ARRAY['organization_owner', 'admin']));

-- Organization Members: members can view co-members
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "Owners can manage org members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin']));

CREATE POLICY "Owners can update org members"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin']));

-- Organization Settings
CREATE POLICY "Members can view org settings"
  ON public.organization_settings FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "Owners can manage org settings"
  ON public.organization_settings FOR ALL TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin']))
  WITH CHECK (public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin']));

-- User Profiles: users can view and update their own
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================
-- PHASE 5B: RLS for Tenant-Owned Business Tables
-- Drop old unsafe policies first
-- ============================================================

-- Drop all existing unsafe policies
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches'
  ])
  LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Create secure membership-based policies for all tenant tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches'
  ])
  LOOP
    -- SELECT
    EXECUTE format(
      'CREATE POLICY "org_select_%1$s" ON %1$I FOR SELECT TO authenticated USING (public.is_organization_member(organization_id) OR public.is_platform_admin())',
      tbl
    );
    -- INSERT
    EXECUTE format(
      'CREATE POLICY "org_insert_%1$s" ON %1$I FOR INSERT TO authenticated WITH CHECK (public.is_organization_member(organization_id))',
      tbl
    );
    -- UPDATE
    EXECUTE format(
      'CREATE POLICY "org_update_%1$s" ON %1$I FOR UPDATE TO authenticated USING (public.is_organization_member(organization_id)) WITH CHECK (public.is_organization_member(organization_id))',
      tbl
    );
    -- DELETE
    EXECUTE format(
      'CREATE POLICY "org_delete_%1$s" ON %1$I FOR DELETE TO authenticated USING (public.is_organization_member(organization_id))',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- PHASE 3B: Indexes for Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_org ON drivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org ON trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org_status ON trips(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_org ON fuel_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_org ON maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_org ON branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_eway_org ON eway_bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_tyres_org ON tyres(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_org ON quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_org ON enquiries(organization_id);

-- ============================================================
-- PHASE 6: Secure Onboarding Function
-- Creates org + member + settings in one transaction
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  org_name TEXT,
  org_slug TEXT DEFAULT NULL,
  org_gstin TEXT DEFAULT NULL,
  org_city TEXT DEFAULT NULL,
  org_state TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
  calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create organization
  INSERT INTO public.organizations (name, slug, gstin, city, state, created_by)
  VALUES (org_name, COALESCE(org_slug, lower(replace(org_name, ' ', '-')) || '-' || substr(gen_random_uuid()::text, 1, 8)), org_gstin, org_city, org_state, calling_user_id)
  RETURNING id INTO new_org_id;

  -- Add user as organization owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (new_org_id, calling_user_id, 'organization_owner', 'active');

  -- Create default settings
  INSERT INTO public.organization_settings (organization_id)
  VALUES (new_org_id);

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE — Phase 1 Complete
-- Run this in Supabase SQL Editor
-- ============================================================
