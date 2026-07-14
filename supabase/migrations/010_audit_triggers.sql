-- ============================================================
-- GARUD AI ERP — Migration 010: Database-Enforced Audit Trail
--
-- PURPOSE: Critical business tables must log every change via
-- database triggers. This prevents clients from bypassing audit
-- logging by simply not calling the audit API.
--
-- CAPTURES: organization_id, user_id, action, entity_type,
-- entity_id, old values (JSON), new values (JSON), timestamp
-- ============================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id TEXT;
  v_org_id TEXT;
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- Get current user from auth context
  v_user_id := COALESCE(auth.uid()::TEXT, 'system');
  
  -- Get organization_id from the row
  IF TG_OP = 'DELETE' THEN
    v_org_id := OLD.organization_id::TEXT;
    v_old := to_jsonb(OLD);
    v_new := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_org_id := NEW.organization_id::TEXT;
    v_old := NULL;
    v_new := to_jsonb(NEW);
  ELSE -- UPDATE
    v_org_id := NEW.organization_id::TEXT;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
  END IF;

  -- Insert audit record
  INSERT INTO public.activity_log (
    organization_id, user_id, action, entity_type, entity_id, 
    details, metadata, timestamp
  ) VALUES (
    v_org_id::UUID,
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    TG_OP || ' on ' || TG_TABLE_NAME,
    jsonb_build_object('old', v_old, 'new', v_new),
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply triggers to sensitive business tables
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
    -- Drop existing trigger if any
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', tbl);
    -- Create AFTER trigger for INSERT, UPDATE, DELETE
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()',
      tbl
    );
  END LOOP;
END $$;

-- Ensure activity_log remains immutable for non-platform-admins
-- (Already enforced by RLS in migration 003: activity_log_no_update policy)

-- ============================================================
-- DONE — Migration 010 Complete
-- 
-- Audit triggers now fire on every INSERT/UPDATE/DELETE for:
-- customers, drivers, vehicles, trips, invoices, payments,
-- payroll_records, organization_members, organization_invitations,
-- fuel_entries, maintenance_records
--
-- Each audit record contains: old values, new values, user, timestamp
-- Normal users cannot edit or delete audit records (RLS enforced)
-- ============================================================
