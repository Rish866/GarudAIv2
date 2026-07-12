-- migration-001-B-migration.sql
-- Migration 001: Platform foundation + organization_id + RLS enabled
-- Target: staging ybuhazlnjqjrshcvpuna
-- Scope: platform tables, functions, org_id columns, platform policies, indexes
-- Business tables: RLS enabled, NO client policies (deny-by-default)
-- ATOMIC: Wrapped in BEGIN/COMMIT. Any error rolls back entire migration.

BEGIN;

-- ============================================================
-- PHASE 1: Platform tables
-- ============================================================

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
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deactivated')),
  subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN (
    'organization_owner', 'admin', 'operations_manager', 'dispatcher',
    'fleet_manager', 'accountant', 'maintenance_manager', 'hr_manager',
    'viewer'
  )),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  default_gst_percent NUMERIC DEFAULT 5,
  default_tds_percent NUMERIC DEFAULT 2,
  invoice_prefix TEXT DEFAULT 'INV',
  trip_prefix TEXT DEFAULT 'TRP',
  lr_prefix TEXT DEFAULT 'LR',
  financial_year_start INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'admin', 'operations_manager', 'dispatcher', 'fleet_manager',
    'accountant', 'maintenance_manager', 'hr_manager', 'viewer'
  )),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE
    REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'admin'
    CHECK (level IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PHASE 2: Secured helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_organization_member(target_org_id UUID)
RETURNS BOOLEAN AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$fn$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
REVOKE ALL ON FUNCTION public.is_organization_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_organization_member(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_organization_ids()
RETURNS SETOF UUID AS $fn$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = auth.uid() AND status = 'active';
$fn$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
REVOKE ALL ON FUNCTION public.current_user_organization_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_organization_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_organization_role(target_org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(allowed_roles)
  );
$fn$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
REVOKE ALL ON FUNCTION public.has_organization_role(UUID, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_organization_role(UUID, TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  );
$fn$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  org_name TEXT, org_slug TEXT DEFAULT NULL, org_gstin TEXT DEFAULT NULL,
  org_city TEXT DEFAULT NULL, org_state TEXT DEFAULT NULL
) RETURNS UUID AS $fn$
DECLARE new_org_id UUID; calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.organizations (name, slug, gstin, city, state, created_by)
  VALUES (org_name, COALESCE(org_slug, lower(replace(org_name,' ','-')) || '-' || substr(gen_random_uuid()::text,1,8)), org_gstin, org_city, org_state, calling_user_id)
  RETURNING id INTO new_org_id;
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (new_org_id, calling_user_id, 'organization_owner', 'active');
  INSERT INTO public.organization_settings (organization_id) VALUES (new_org_id);
  RETURN new_org_id;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.create_organization_for_user(TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user(TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_organization_invitation(p_org_id UUID, p_email TEXT, p_role TEXT)
RETURNS UUID AS $fn$
DECLARE inv_id UUID; calling_user_id UUID; clean_email TEXT;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_organization_role(p_org_id, ARRAY['organization_owner','admin']) THEN
    RAISE EXCEPTION 'Not authorized to invite'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id AND status = 'active') THEN
    RAISE EXCEPTION 'Organization not found or inactive'; END IF;
  clean_email := lower(btrim(p_email));
  IF clean_email IS NULL OR clean_email = '' THEN RAISE EXCEPTION 'Email required'; END IF;
  IF p_role IN ('organization_owner','driver','customer') OR p_role IS NULL THEN
    RAISE EXCEPTION 'Invalid invitation role: %', p_role; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_invitations WHERE organization_id = p_org_id AND lower(btrim(email)) = clean_email AND status = 'pending' AND expires_at > NOW()) THEN
    RAISE EXCEPTION 'Pending invitation already exists for this email'; END IF;
  INSERT INTO public.organization_invitations (organization_id, email, role, invited_by, status, expires_at)
  VALUES (p_org_id, clean_email, p_role, calling_user_id, 'pending', NOW() + INTERVAL '7 days')
  RETURNING id INTO inv_id;
  RETURN inv_id;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.create_organization_invitation(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_invitation(UUID,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_invitation_id UUID)
RETURNS UUID AS $fn$
DECLARE inv RECORD; calling_user_id UUID; caller_email TEXT; caller_confirmed TIMESTAMPTZ; new_member_id UUID;
  allowed_roles TEXT[] := ARRAY['admin','operations_manager','dispatcher','fleet_manager','accountant','maintenance_manager','hr_manager','viewer'];
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT au.email, au.email_confirmed_at INTO caller_email, caller_confirmed
    FROM auth.users au WHERE au.id = calling_user_id;
  IF caller_email IS NULL OR btrim(caller_email) = '' THEN
    RAISE EXCEPTION 'Caller has no email address'; END IF;
  IF caller_confirmed IS NULL THEN
    RAISE EXCEPTION 'Email address is not confirmed'; END IF;
  SELECT * INTO inv FROM public.organization_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found or access denied'; END IF;
  IF inv.status != 'pending' THEN RAISE EXCEPTION 'Invitation is not pending'; END IF;
  IF inv.expires_at < NOW() THEN RAISE EXCEPTION 'Invitation has expired'; END IF;
  IF inv.email IS NULL OR btrim(inv.email) = '' THEN RAISE EXCEPTION 'Invitation has invalid email'; END IF;
  IF lower(btrim(caller_email)) != lower(btrim(inv.email)) THEN RAISE EXCEPTION 'Email does not match invitation'; END IF;
  IF inv.role = 'organization_owner' OR NOT (inv.role = ANY(allowed_roles)) THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = inv.organization_id AND user_id = calling_user_id) THEN
    RAISE EXCEPTION 'Already a member of this organization'; END IF;
  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = p_invitation_id;
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (inv.organization_id, calling_user_id, inv.role, 'active')
  RETURNING id INTO new_member_id;
  RETURN new_member_id;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.accept_organization_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_organization_invitation(p_invitation_id UUID)
RETURNS VOID AS $fn$
DECLARE inv RECORD; calling_user_id UUID;
BEGIN
  calling_user_id := auth.uid();
  IF calling_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO inv FROM public.organization_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found or access denied'; END IF;
  IF inv.status != 'pending' THEN RAISE EXCEPTION 'Invitation is not pending'; END IF;
  IF NOT public.has_organization_role(inv.organization_id, ARRAY['organization_owner','admin']) THEN
    RAISE EXCEPTION 'Not authorized to cancel'; END IF;
  UPDATE public.organization_invitations SET status = 'cancelled' WHERE id = p_invitation_id;
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.cancel_organization_invitation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_organization_invitation(UUID) TO authenticated;

-- ============================================================
-- PHASE 3: Add organization_id to 16 business tables
-- ============================================================

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.fuel_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.maintenance_records ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tyres ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.eway_bills ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- ============================================================
-- PHASE 4: Enable RLS on ALL 22 tables (deny-by-default)
-- ============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DO $x$ DECLARE tbl TEXT; BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $x$;

-- ============================================================
-- PHASE 4b: Revoke all DML privileges on platform tables
-- Ensures no default ACL grants make these tables writable.
-- Migration 013 will issue audited column-specific grants.
-- ============================================================

REVOKE ALL ON TABLE public.organizations FROM anon, authenticated;
REVOKE ALL ON TABLE public.organization_members FROM anon, authenticated;
REVOKE ALL ON TABLE public.organization_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.organization_invitations FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.platform_admins FROM anon, authenticated;

-- ============================================================
-- PHASE 5: Platform-table policies ONLY (idempotent)
-- Business tables get NO policies here (deny-by-default)
-- NOTE: These policies restrict eligible ROWS only. Column
-- restrictions are enforced separately by column-level grants
-- issued in Migration 013. Until then, no table-level DML
-- privilege exists for authenticated on these tables.
-- ============================================================

DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_organization_member(id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_organization_role(id, ARRAY['organization_owner','admin']))
  WITH CHECK (public.has_organization_role(id, ARRAY['organization_owner','admin']));

DROP POLICY IF EXISTS "members_select" ON public.organization_members;
CREATE POLICY "members_select" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

DROP POLICY IF EXISTS "settings_select" ON public.organization_settings;
CREATE POLICY "settings_select" ON public.organization_settings FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

DROP POLICY IF EXISTS "settings_update" ON public.organization_settings;
CREATE POLICY "settings_update" ON public.organization_settings FOR UPDATE TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['organization_owner','admin']))
  WITH CHECK (public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));

DROP POLICY IF EXISTS "invitations_select" ON public.organization_invitations;
CREATE POLICY "invitations_select" ON public.organization_invitations FOR SELECT TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));

DROP POLICY IF EXISTS "profiles_select_own" ON public.user_profiles;
CREATE POLICY "profiles_select_own" ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_own" ON public.user_profiles;
CREATE POLICY "profiles_insert_own" ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.user_profiles;
CREATE POLICY "profiles_update_own" ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "padmin_select_own" ON public.platform_admins;
CREATE POLICY "padmin_select_own" ON public.platform_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- PHASE 6: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_org ON public.drivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org ON public.trips(organization_id);
CREATE INDEX IF NOT EXISTS idx_trips_org_status ON public.trips(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_fuel_org ON public.fuel_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_org ON public.maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_org ON public.activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_eway_org ON public.eway_bills(organization_id);
CREATE INDEX IF NOT EXISTS idx_tyres_org ON public.tyres(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_org ON public.quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_org ON public.enquiries(organization_id);

COMMIT;
