-- ============================================================
-- GARUD AI ERP — Phase 5: Correct RLS Policies
-- 
-- Removes ALL unsafe policies (USING(true), auth.uid() IS NOT NULL)
-- Implements membership-based + role-based security
-- ============================================================

-- ============================================================
-- STEP 1: Drop ALL existing policies on ALL tenant-owned tables
-- This ensures no unsafe legacy policies remain
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    -- Original 16 tables from Phase 1
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','activity_log','notifications','eway_bills','branches',
    -- 20 new tables from Phase 3
    'vendors','contracts','routes','indents','market_hires','work_orders',
    'challans','geofences','claims','approvals','transfers',
    'cash_entries','bank_entries','ledger_accounts','purchases','sales',
    'inventory','attendance','leave_requests','gps_devices'
  ])
  LOOP
    FOR pol IN 
      SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
    -- Ensure RLS is enabled
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Also drop policies on platform tables
DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organizations','organization_members','organization_settings',
    'organization_invitations','user_profiles','platform_admins'
  ])
  LOOP
    FOR pol IN 
      SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- STEP 2: Platform Table Policies
-- ============================================================

-- Organizations: Members can view their own org; platform admins see all
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.is_organization_member(id) OR public.is_platform_admin()
  );

CREATE POLICY "org_insert" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Any authenticated user can create an org (signup flow)

CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(id, ARRAY['organization_owner', 'admin'])
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_organization_role(id, ARRAY['organization_owner', 'admin'])
    OR public.is_platform_admin()
  );

CREATE POLICY "org_delete" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_platform_admin()); -- Only platform admins can delete orgs

-- Organization Members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    public.is_organization_member(organization_id) OR public.is_platform_admin()
  );

CREATE POLICY "members_insert" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Can add yourself during signup OR admins can add others
    (user_id = auth.uid())
    OR public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
    OR public.is_platform_admin()
  );

CREATE POLICY "members_update" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
    OR public.is_platform_admin()
  );

CREATE POLICY "members_delete" ON public.organization_members
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner'])
    OR public.is_platform_admin()
  );

-- Organization Settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON public.organization_settings
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "settings_upsert" ON public.organization_settings
  FOR ALL TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
  );

-- Organization Invitations
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_select" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "invitations_insert" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
  );

CREATE POLICY "invitations_update" ON public.organization_invitations
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner', 'admin'])
  );

-- User Profiles: Users can only access their own
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin());

CREATE POLICY "profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Platform Admins: Only platform admins can see this table
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "padmin_select" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR user_id = auth.uid());

-- ============================================================
-- STEP 3: Tenant-Owned Tables — Base Membership Policies
-- All authenticated members can READ their org's data
-- ============================================================

-- VEHICLES — Fleet/Admin roles for write; all members can read
CREATE POLICY "vehicles_select" ON public.vehicles
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "vehicles_insert" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','fleet_manager'
    ])
  );

CREATE POLICY "vehicles_update" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','fleet_manager'
    ])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','fleet_manager'
    ])
  );

CREATE POLICY "vehicles_delete" ON public.vehicles
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','fleet_manager'
    ])
  );

-- DRIVERS — Fleet/Operations/Admin for write
CREATE POLICY "drivers_select" ON public.drivers
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "drivers_insert" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','fleet_manager','hr_manager'
    ])
  );

CREATE POLICY "drivers_update" ON public.drivers
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','fleet_manager','hr_manager'
    ])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','fleet_manager','hr_manager'
    ])
  );

CREATE POLICY "drivers_delete" ON public.drivers
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','hr_manager'
    ])
  );

-- CUSTOMERS — All operational roles can read; admin/ops can write
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','accountant','dispatcher'
    ])
  );

CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','accountant'
    ])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','accountant'
    ])
  );

CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner','admin'])
  );

-- TRIPS — Operations roles for write; drivers can read assigned
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "trips_insert" ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','dispatcher'
    ])
  );

CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','dispatcher'
    ])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','operations_manager','dispatcher'
    ])
  );

CREATE POLICY "trips_delete" ON public.trips
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner','admin'])
  );

-- INVOICES — Accounting roles for write
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','accountant','operations_manager'
    ])
  );

CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','accountant'
    ])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','accountant'
    ])
  );

CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner','admin'])
  );

-- PAYMENTS — Only accounting/admin can manage
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','accountant'
    ])
  );

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','accountant'
    ])
  )
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY[
      'organization_owner','admin','accountant'
    ])
  );

CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE TO authenticated
  USING (
    public.has_organization_role(organization_id, ARRAY['organization_owner','admin'])
  );

-- ============================================================
-- STEP 4: Remaining Tables — Standard Membership Policies
-- These tables use standard member-read / admin-write pattern
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'enquiries','quotations','expenses','fuel_entries','maintenance_records',
    'tyres','eway_bills','branches','vendors','contracts','routes','indents',
    'market_hires','work_orders','challans','geofences','claims','approvals',
    'transfers','cash_entries','bank_entries','ledger_accounts','purchases',
    'sales','inventory','attendance','leave_requests','gps_devices'
  ])
  LOOP
    -- SELECT: Any org member can read
    EXECUTE format(
      'CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT TO authenticated USING (public.is_organization_member(organization_id) OR public.is_platform_admin())',
      tbl
    );
    -- INSERT: Operations roles can create
    EXECUTE format(
      'CREATE POLICY "%1$s_insert" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (
        public.has_organization_role(organization_id, ARRAY[
          ''organization_owner'',''admin'',''operations_manager'',''fleet_manager'',
          ''accountant'',''dispatcher'',''maintenance_manager'',''hr_manager''
        ])
      )',
      tbl
    );
    -- UPDATE: Operations roles can update
    EXECUTE format(
      'CREATE POLICY "%1$s_update" ON public.%1$I FOR UPDATE TO authenticated
        USING (
          public.has_organization_role(organization_id, ARRAY[
            ''organization_owner'',''admin'',''operations_manager'',''fleet_manager'',
            ''accountant'',''dispatcher'',''maintenance_manager'',''hr_manager''
          ])
        )
        WITH CHECK (
          public.has_organization_role(organization_id, ARRAY[
            ''organization_owner'',''admin'',''operations_manager'',''fleet_manager'',
            ''accountant'',''dispatcher'',''maintenance_manager'',''hr_manager''
          ])
        )',
      tbl
    );
    -- DELETE: Only owner/admin can delete
    EXECUTE format(
      'CREATE POLICY "%1$s_delete" ON public.%1$I FOR DELETE TO authenticated USING (
        public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])
      )',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- STEP 5: Notifications & Activity Log — Special Cases
-- ============================================================

-- Notifications: Members can read; system can insert (no role check for insert)
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id));

-- Activity Log: All members can read; system inserts (any member)
DROP POLICY IF EXISTS "activity_log_select" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_update" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_delete" ON public.activity_log;

CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) OR public.is_platform_admin());

CREATE POLICY "activity_log_insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id));

-- Activity log should NOT be updated or deleted (immutable audit)
CREATE POLICY "activity_log_no_update" ON public.activity_log
  FOR UPDATE TO authenticated
  USING (false); -- No one can update audit logs

CREATE POLICY "activity_log_no_delete" ON public.activity_log
  FOR DELETE TO authenticated
  USING (public.is_platform_admin()); -- Only platform admin can purge

-- ============================================================
-- STEP 6: Verify No Unsafe Policies Remain
-- ============================================================

-- This query should return 0 rows after running this migration:
-- SELECT tablename, policyname, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND (qual = 'true' OR qual LIKE '%uid()%is not null%')
-- ORDER BY tablename;

-- ============================================================
-- DONE — Phase 5 Complete
-- All 36 org-owned tables + 6 platform tables have secure RLS
-- No USING(true) or USING(auth.uid() IS NOT NULL) policies exist
-- Role-based write restrictions enforced
-- Activity log is immutable (no update/delete except platform admin)
-- ============================================================
