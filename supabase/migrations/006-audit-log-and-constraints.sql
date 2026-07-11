-- ============================================================
-- GARUD AI ERP — Migration 006: Audit Log Enhancements + Constraints
--
-- PURPOSE: 
-- 1. Ensure activity_log has required columns for the audit service
-- 2. Add single-active-membership constraint
--
-- NOTE: activity_log table is created in migration 000 and gets
-- organization_id added in migration 001. This migration ensures
-- additional columns/indexes exist for the audit service.
--
-- IDEMPOTENT: Uses IF NOT EXISTS throughout.
-- DEPENDENCY: Requires public.organizations, public.organization_members
-- ============================================================

-- ============================================================
-- STEP 1: Ensure activity_log has all required columns
-- (Some may already exist from migration 000, but ADD IF NOT EXISTS is safe)
-- ============================================================

-- Ensure organization_id has the FK constraint (may already exist from 001)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'activity_log'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name LIKE '%organization%'
  ) THEN
    -- Only add if the column exists but FK doesn't
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'organization_id'
    ) THEN
      BEGIN
        ALTER TABLE public.activity_log
          ADD CONSTRAINT activity_log_org_fk
          FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN
        NULL; -- constraint already exists
      END;
    END IF;
  END IF;
END $$;

-- Ensure user_id column exists (for new audit service format)
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Ensure metadata column exists
ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ============================================================
-- STEP 2: Indexes for audit log performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON public.activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id);

-- ============================================================
-- STEP 3: Single active membership constraint
-- Prevents configuration errors where a non-admin user belongs to
-- multiple organizations simultaneously.
-- ============================================================

-- Drop if exists first (idempotent)
DROP INDEX IF EXISTS idx_single_active_membership;

CREATE UNIQUE INDEX idx_single_active_membership
  ON public.organization_members(user_id)
  WHERE status = 'active';

-- ============================================================
-- STEP 4: RLS policies for activity_log (ensure they exist)
-- These may already exist from migration 003, but we ensure coverage
-- ============================================================

-- Only create if not already present
DO $$
BEGIN
  -- Check if the select policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_log' AND schemaname = 'public' AND policyname = 'activity_log_select'
  ) THEN
    -- Check if any select policy exists at all
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'activity_log' AND schemaname = 'public' AND cmd = 'SELECT'
    ) THEN
      EXECUTE 'CREATE POLICY "audit_select_006" ON public.activity_log FOR SELECT TO authenticated USING (
        organization_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid() AND status = ''active''
        )
      )';
    END IF;
  END IF;

  -- Check if insert policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_log' AND schemaname = 'public' AND cmd = 'INSERT'
  ) THEN
    EXECUTE 'CREATE POLICY "audit_insert_006" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (
      organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND status = ''active''
      )
    )';
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DONE — Migration 006 Complete
--
-- Guarantees:
-- ✅ activity_log has organization_id FK to public.organizations
-- ✅ activity_log has user_id, metadata columns
-- ✅ Performance indexes on activity_log
-- ✅ Single active membership constraint enforced
-- ✅ RLS policies protect audit data
-- ============================================================
