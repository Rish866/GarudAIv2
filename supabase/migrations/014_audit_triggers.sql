-- ============================================================
-- GARUD AI ERP — Migration 014: Database-Enforced Audit Trail
--
-- PURPOSE: Critical business tables must log every change via
-- database triggers. This prevents clients from bypassing audit
-- logging by simply not calling the audit API.
--
-- CAPTURES: organization_id, user_id, action, entity_type,
-- entity_id, old values (JSONB), new values (JSONB), timestamp
--
-- DEPENDS ON: activity_log table (created in migration 006)
-- ============================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id TEXT;
  v_org_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_entity_id TEXT;
BEGIN
  -- Get current user from auth context (NULL in system operations)
  v_user_id := COALESCE(auth.uid()::TEXT, 'system');

  -- Get organization_id and entity data based on operation type
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id;
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_entity_id := OLD.id::TEXT;
  ELSIF TG_OP = 'INSERT' THEN
    v_org_id := NEW.organization_id;
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_entity_id := NEW.id::TEXT;
  ELSE -- UPDATE
    v_org_id := NEW.organization_id;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_entity_id := NEW.id::TEXT;
  END IF;

  -- Skip if organization_id is NULL (safety valve)
  IF v_org_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Insert audit record into activity_log
  INSERT INTO public.activity_log (
    organization_id, user_id, action, entity_type, entity_id,
    details, metadata, timestamp
  ) VALUES (
    v_org_id,
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    v_entity_id,
    TG_OP || ' on ' || TG_TABLE_NAME || ' by ' || v_user_id,
    jsonb_build_object('old', v_old, 'new', v_new),
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the original operation if audit logging fails
  RAISE WARNING 'Audit trigger failed for % on %: %', TG_OP, TG_TABLE_NAME, SQLERRM;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply triggers to sensitive business tables
-- These are the tables where every data change must be tracked
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'customers', 'drivers', 'vehicles', 'trips',
    'invoices', 'payments', 'payroll_records',
    'organization_members', 'organization_invitations',
    'fuel_entries', 'maintenance_records'
  ])
  LOOP
    -- Only create trigger if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      -- Drop existing trigger if any (idempotent)
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', tbl);
      -- Create AFTER trigger for INSERT, UPDATE, DELETE
      EXECUTE format(
        'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- DONE — Migration 014: Audit Triggers
--
-- Audit triggers now fire on every INSERT/UPDATE/DELETE for:
-- customers, drivers, vehicles, trips, invoices, payments,
-- payroll_records, organization_members, organization_invitations,
-- fuel_entries, maintenance_records
--
-- Each audit record contains: old values, new values, user, timestamp
-- Normal users cannot edit or delete audit records (RLS enforced by migration 003)
-- If audit logging fails, the original operation still succeeds (EXCEPTION handler)
-- ============================================================
