-- ============================================================
-- Migration 010: Database-Enforced Branch Isolation
--
-- Creates:
--   1. organization_member_branches table (explicit branch access grants)
--   2. has_all_branch_access column on organization_members
--   3. Helper functions for branch access checks
--   4. Converts existing TEXT branch_id columns to UUID with FK
--   5. Adds branch_id to tables that need it
--   6. Updates RLS policies for branch-scoped tables
--
-- IDEMPOTENT: Uses IF NOT EXISTS / OR REPLACE throughout.
-- DEPENDENCY: Requires migrations 000-009 applied.
-- ============================================================

-- ============================================================
-- STEP 1: Add has_all_branch_access to organization_members
-- ============================================================
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS has_all_branch_access BOOLEAN NOT NULL DEFAULT FALSE;

-- Auto-grant all-branch access to owners and admins
UPDATE public.organization_members
SET has_all_branch_access = TRUE
WHERE role IN ('organization_owner', 'admin')
  AND has_all_branch_access = FALSE;

-- ============================================================
-- STEP 2: organization_member_branches table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_member_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  UNIQUE(member_id, branch_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_omb_org ON public.organization_member_branches(organization_id);
CREATE INDEX IF NOT EXISTS idx_omb_member ON public.organization_member_branches(member_id);
CREATE INDEX IF NOT EXISTS idx_omb_branch ON public.organization_member_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_omb_member_branch ON public.organization_member_branches(member_id, branch_id);

-- RLS
ALTER TABLE public.organization_member_branches ENABLE ROW LEVEL SECURITY;


-- RLS policies for organization_member_branches
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_member_branches' AND policyname = 'omb_select') THEN
    EXECUTE 'CREATE POLICY "omb_select" ON public.organization_member_branches FOR SELECT TO authenticated
      USING (public.is_organization_member(organization_id))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_member_branches' AND policyname = 'omb_insert') THEN
    EXECUTE 'CREATE POLICY "omb_insert" ON public.organization_member_branches FOR INSERT TO authenticated
      WITH CHECK (public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_member_branches' AND policyname = 'omb_delete') THEN
    EXECUTE 'CREATE POLICY "omb_delete" ON public.organization_member_branches FOR DELETE TO authenticated
      USING (public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']))';
  END IF;
END $$;

-- ============================================================
-- STEP 3: Branch access helper functions
-- ============================================================

-- Returns TRUE if the current user can access the given branch_id.
-- Access is granted when:
--   1. branch_id IS NULL (org-wide record, accessible to all org members), OR
--   2. User has has_all_branch_access = TRUE for that org, OR
--   3. User has an explicit grant in organization_member_branches.
CREATE OR REPLACE FUNCTION public.current_user_can_access_branch(
  p_branch_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- NULL branch = org-wide, accessible to all org members
  IF p_branch_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if the user has all-branch access or explicit grant
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.organization_id = (SELECT organization_id FROM public.branches WHERE id = p_branch_id)
      AND (
        om.has_all_branch_access = TRUE
        OR EXISTS (
          SELECT 1 FROM public.organization_member_branches omb
          WHERE omb.member_id = om.id AND omb.branch_id = p_branch_id
        )
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.current_user_can_access_branch(UUID) TO authenticated;


-- Returns all branch IDs the current user can access within an organization.
-- Returns NULL set if user has all-branch access (caller should check that separately).
CREATE OR REPLACE FUNCTION public.current_user_accessible_branch_ids(
  p_organization_id UUID
) RETURNS SETOF UUID AS $$
  SELECT omb.branch_id
  FROM public.organization_member_branches omb
  JOIN public.organization_members om ON om.id = omb.member_id
  WHERE om.user_id = auth.uid()
    AND om.status = 'active'
    AND om.organization_id = p_organization_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.current_user_accessible_branch_ids(UUID) TO authenticated;

-- Returns TRUE if the current user has all-branch access for the organization.
CREATE OR REPLACE FUNCTION public.current_user_has_all_branch_access(
  p_organization_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.organization_id = p_organization_id
      AND om.has_all_branch_access = TRUE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.current_user_has_all_branch_access(UUID) TO authenticated;

-- ============================================================
-- STEP 4: Convert existing TEXT branch_id to UUID on tables that already have it
-- Strategy: Cast valid UUIDs, set empty/invalid to NULL
-- ============================================================

-- Helper: safe TEXT-to-UUID cast
CREATE OR REPLACE FUNCTION pg_temp.safe_uuid_cast(val TEXT)
RETURNS UUID AS $$
BEGIN
  IF val IS NULL OR val = '' THEN RETURN NULL; END IF;
  RETURN val::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Convert branch_id from TEXT to UUID for the 12 tables that already have it.
-- Each table: add new UUID column, copy data, drop old, rename new.
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records','tyres'
  ])
  LOOP
    -- Only convert if column is still TEXT type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl
        AND column_name = 'branch_id' AND data_type = 'text'
    ) THEN
      -- Add temporary UUID column
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS branch_id_uuid UUID', tbl);
      -- Copy valid UUIDs
      EXECUTE format('UPDATE public.%I SET branch_id_uuid = pg_temp.safe_uuid_cast(branch_id)', tbl);
      -- Drop old TEXT column
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN branch_id', tbl);
      -- Rename new column
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN branch_id_uuid TO branch_id', tbl);
      -- Add FK (branch must exist and belong to same org — validated by trigger)
      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT fk_%I_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id)',
          tbl, tbl
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END;
      RAISE NOTICE 'Converted %.branch_id TEXT → UUID', tbl;
    ELSIF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'branch_id'
    ) THEN
      -- Column doesn't exist at all — add it
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN branch_id UUID REFERENCES public.branches(id)', tbl);
      RAISE NOTICE 'Added %.branch_id UUID (new column)', tbl;
    ELSE
      RAISE NOTICE '%.branch_id already UUID — skipping', tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 5: Add branch_id to tables that need it (from migration 002)
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'indents','attendance','claims','challans','work_orders',
    'market_hires','cash_entries','bank_entries','purchases','sales',
    'inventory','eway_bills'
  ])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'branch_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN branch_id UUID REFERENCES public.branches(id)', tbl);
      RAISE NOTICE 'Added %.branch_id UUID', tbl;
    END IF;
  END LOOP;
END $$;

-- Add indexes for branch_id on all branch-scoped tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records','tyres',
    'indents','attendance','claims','challans','work_orders',
    'market_hires','cash_entries','bank_entries','purchases','sales',
    'inventory','eway_bills'
  ])
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_branch ON public.%I(branch_id)', tbl, tbl);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_org_branch ON public.%I(organization_id, branch_id)', tbl, tbl);
  END LOOP;
END $$;


-- ============================================================
-- STEP 6: Update RLS policies for branch-scoped tables
--
-- New policy logic for SELECT:
--   organization_member AND (branch_id IS NULL OR can_access_branch)
--
-- We DROP and recreate the SELECT policies for branch-scoped tables.
-- INSERT/UPDATE/DELETE policies also updated to enforce branch access.
-- ============================================================

-- Drop existing overly-broad select policies and recreate with branch check
DO $$
DECLARE
  tbl TEXT;
  policy_name TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records','tyres',
    'indents','attendance','claims','challans','work_orders',
    'market_hires','cash_entries','bank_entries','purchases','sales',
    'inventory','eway_bills'
  ])
  LOOP
    -- Drop old broad policies (naming varies, try common patterns)
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
        AND (policyname LIKE '%select%' OR policyname LIKE '%_select_%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    END LOOP;

    -- Create new branch-aware SELECT policy
    EXECUTE format(
      'CREATE POLICY "branch_select_%1$s" ON public.%1$I FOR SELECT TO authenticated USING (
        public.is_organization_member(organization_id)
        AND public.current_user_can_access_branch(branch_id)
      )', tbl
    );

    -- Drop and recreate INSERT policy with branch check
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
        AND (policyname LIKE '%insert%' OR policyname LIKE '%_insert_%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "branch_insert_%1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (
        public.is_organization_member(organization_id)
        AND public.current_user_can_access_branch(branch_id)
      )', tbl
    );

    -- Drop and recreate UPDATE policy with branch check
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
        AND (policyname LIKE '%update%' OR policyname LIKE '%_update_%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "branch_update_%1$s" ON public.%1$I FOR UPDATE TO authenticated
        USING (public.is_organization_member(organization_id) AND public.current_user_can_access_branch(branch_id))
        WITH CHECK (public.is_organization_member(organization_id) AND public.current_user_can_access_branch(branch_id))
      ', tbl
    );

    -- Drop and recreate DELETE policy with branch check
    FOR policy_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
        AND (policyname LIKE '%delete%' OR policyname LIKE '%_delete_%')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY "branch_delete_%1$s" ON public.%1$I FOR DELETE TO authenticated
        USING (
          public.is_organization_member(organization_id)
          AND public.current_user_can_access_branch(branch_id)
          AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])
        )
      ', tbl
    );

    RAISE NOTICE 'Updated RLS for % with branch isolation', tbl;
  END LOOP;
END $$;


-- ============================================================
-- STEP 7: Seed default branch for existing demo data
-- ============================================================
DO $$
DECLARE
  v_org_id UUID;
  v_branch_id UUID;
BEGIN
  -- For each organization that has no branches, create a default "Head Office" branch
  FOR v_org_id IN
    SELECT o.id FROM public.organizations o
    WHERE NOT EXISTS (SELECT 1 FROM public.branches b WHERE b.organization_id = o.id)
  LOOP
    INSERT INTO public.branches (organization_id, name, code, city, state, status)
    VALUES (v_org_id, 'Head Office', 'HO', '', '', 'active')
    RETURNING id INTO v_branch_id;

    -- Assign all existing branch-scoped records to this default branch
    UPDATE public.vehicles SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.drivers SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.customers SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.trips SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.enquiries SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.quotations SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.invoices SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.payments SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.expenses SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.fuel_entries SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.maintenance_records SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;
    UPDATE public.tyres SET branch_id = v_branch_id WHERE organization_id = v_org_id AND branch_id IS NULL;

    -- Grant all existing members of this org access to the default branch
    INSERT INTO public.organization_member_branches (organization_id, member_id, branch_id)
    SELECT v_org_id, om.id, v_branch_id
    FROM public.organization_members om
    WHERE om.organization_id = v_org_id AND om.status = 'active'
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created default branch % for org %', v_branch_id, v_org_id;
  END LOOP;
END $$;

-- ============================================================
-- STEP 8: Trigger to auto-grant all-branch access on owner/admin role assignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_grant_all_branch_access()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IN ('organization_owner', 'admin') THEN
    NEW.has_all_branch_access := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_branch_access ON public.organization_members;
CREATE TRIGGER trg_auto_branch_access
  BEFORE INSERT OR UPDATE OF role ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_grant_all_branch_access();

-- ============================================================
-- STEP 9: Comments
-- ============================================================
COMMENT ON TABLE public.organization_member_branches IS
  'Explicit branch access grants. A member can access a row only if they have a grant for that branch or has_all_branch_access.';
COMMENT ON COLUMN public.organization_members.has_all_branch_access IS
  'When TRUE, the member can access all branches in their organization. Auto-set for owner/admin roles.';
COMMENT ON FUNCTION public.current_user_can_access_branch IS
  'Returns TRUE if the authenticated user can access the given branch_id. NULL branch_id = always accessible.';
COMMENT ON FUNCTION public.current_user_accessible_branch_ids IS
  'Returns the set of branch UUIDs the authenticated user has explicit access to.';
COMMENT ON FUNCTION public.current_user_has_all_branch_access IS
  'Returns TRUE if the user has all-branch access for the given organization.';

-- ============================================================
-- DONE — Migration 010: Branch Isolation Complete
-- ============================================================
