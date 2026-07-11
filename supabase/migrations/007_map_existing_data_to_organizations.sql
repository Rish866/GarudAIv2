-- ============================================================
-- GARUD AI ERP — Migration 007: Map Existing Legacy Data to Organizations
--
-- PURPOSE: Assigns organization_id to any existing rows that were
-- created before the multi-tenant migration. This ensures legacy
-- data is not orphaned and remains accessible after RLS is enforced.
--
-- SAFE: Does NOT delete or overwrite existing data.
-- IDEMPOTENT: Only updates rows where organization_id IS NULL.
-- DEPENDENCY: Runs AFTER 001-006 (organizations table must exist).
--
-- STRATEGY:
-- 1. If NO organizations exist yet → create a "default" organization
--    for the platform admin and assign all orphan rows to it.
-- 2. If exactly ONE organization exists → assign all orphan rows to it.
-- 3. If multiple organizations exist → assign orphans to the oldest org
--    (the one with the earliest created_at). This is the safest assumption
--    since the first org is likely the legacy org.
-- 4. Log the mapping operation to activity_log.
-- ============================================================

DO $$
DECLARE
  target_org_id UUID;
  org_count INTEGER;
  orphan_count INTEGER;
  admin_user_id UUID;
  tbl TEXT;
  mapped_total INTEGER := 0;
  mapped_per_table INTEGER;
BEGIN
  -- ============================================================
  -- STEP 1: Determine target organization
  -- ============================================================
  
  SELECT count(*) INTO org_count FROM public.organizations;
  
  IF org_count = 0 THEN
    -- No organization exists yet.
    -- Check if there's an authenticated user we can use as owner.
    -- Use the platform admin env var email or first user in auth.users.
    SELECT id INTO admin_user_id
    FROM auth.users
    ORDER BY created_at ASC
    LIMIT 1;

    -- Create a default organization for legacy data
    INSERT INTO public.organizations (
      name, slug, status, subscription_status, created_by
    ) VALUES (
      'Default Organization (Legacy Data)',
      'legacy-org-' || substr(gen_random_uuid()::text, 1, 8),
      'active',
      'active',
      admin_user_id  -- may be NULL if no users exist yet (fresh DB)
    )
    RETURNING id INTO target_org_id;

    -- If we have an admin user, make them the org owner
    IF admin_user_id IS NOT NULL THEN
      INSERT INTO public.organization_members (
        organization_id, user_id, role, status
      ) VALUES (
        target_org_id, admin_user_id, 'organization_owner', 'active'
      )
      ON CONFLICT (organization_id, user_id) DO NOTHING;
    END IF;

    -- Create default org settings
    INSERT INTO public.organization_settings (organization_id)
    VALUES (target_org_id)
    ON CONFLICT (organization_id) DO NOTHING;

    RAISE NOTICE 'Created default organization: % (no existing org found)', target_org_id;

  ELSIF org_count = 1 THEN
    -- Exactly one org exists — use it
    SELECT id INTO target_org_id FROM public.organizations LIMIT 1;
    RAISE NOTICE 'Using single existing organization: %', target_org_id;

  ELSE
    -- Multiple orgs exist — use the oldest one (first created)
    SELECT id INTO target_org_id
    FROM public.organizations
    ORDER BY created_at ASC
    LIMIT 1;
    RAISE NOTICE 'Multiple orgs exist (%). Using oldest: %', org_count, target_org_id;
  END IF;

  -- ============================================================
  -- STEP 2: Map orphan rows (organization_id IS NULL) to target org
  -- ============================================================
  
  -- Process all 16 base tables from migration 000
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles', 'drivers', 'customers', 'trips', 'enquiries', 'quotations',
    'invoices', 'payments', 'expenses', 'fuel_entries', 'maintenance_records',
    'tyres', 'activity_log', 'notifications', 'eway_bills', 'branches'
  ])
  LOOP
    -- Check if table has organization_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'organization_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET organization_id = $1 WHERE organization_id IS NULL',
        tbl
      ) USING target_org_id;
      
      GET DIAGNOSTICS mapped_per_table = ROW_COUNT;
      mapped_total := mapped_total + mapped_per_table;
      
      IF mapped_per_table > 0 THEN
        RAISE NOTICE 'Mapped % orphan rows in table: %', mapped_per_table, tbl;
      END IF;
    END IF;
  END LOOP;

  -- Also process the 20 tables from migration 002
  FOR tbl IN SELECT unnest(ARRAY[
    'vendors', 'contracts', 'routes', 'indents', 'market_hires', 'work_orders',
    'challans', 'geofences', 'claims', 'approvals', 'transfers',
    'cash_entries', 'bank_entries', 'ledger_accounts', 'purchases', 'sales',
    'inventory', 'attendance', 'leave_requests', 'gps_devices'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'organization_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET organization_id = $1 WHERE organization_id IS NULL',
        tbl
      ) USING target_org_id;
      
      GET DIAGNOSTICS mapped_per_table = ROW_COUNT;
      mapped_total := mapped_total + mapped_per_table;
      
      IF mapped_per_table > 0 THEN
        RAISE NOTICE 'Mapped % orphan rows in table: %', mapped_per_table, tbl;
      END IF;
    END IF;
  END LOOP;

  -- ============================================================
  -- STEP 3: Log the migration operation
  -- ============================================================
  
  IF mapped_total > 0 THEN
    INSERT INTO public.activity_log (
      organization_id, user_name, action, entity_type, entity_id, details, created_at
    ) VALUES (
      target_org_id,
      'system-migration',
      'legacy_data_mapped',
      'migration',
      '007',
      format('Mapped %s orphan rows to organization %s', mapped_total, target_org_id),
      NOW()
    );
  END IF;

  RAISE NOTICE '=== Migration 007 complete. Total rows mapped: % ===', mapped_total;
END $$;

-- ============================================================
-- STEP 4: Add NOT NULL constraint to organization_id where safe
-- Only for tables that should ALWAYS have an org (after mapping)
-- Uses ALTER ... SET NOT NULL (fails if any NULLs remain)
-- ============================================================

-- We do this safely: only if no NULLs remain
DO $$
DECLARE
  tbl TEXT;
  null_count INTEGER;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles', 'drivers', 'customers', 'trips', 'enquiries', 'quotations',
    'invoices', 'payments', 'expenses', 'fuel_entries', 'maintenance_records',
    'tyres', 'notifications', 'eway_bills', 'branches',
    'vendors', 'contracts', 'routes', 'indents', 'market_hires', 'work_orders',
    'challans', 'geofences', 'claims', 'approvals', 'transfers',
    'cash_entries', 'bank_entries', 'ledger_accounts', 'purchases', 'sales',
    'inventory', 'attendance', 'leave_requests', 'gps_devices'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'organization_id'
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE organization_id IS NULL', tbl)
        INTO null_count;
      
      IF null_count = 0 THEN
        -- Safe to add NOT NULL
        BEGIN
          EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', tbl
          );
          RAISE NOTICE 'Set NOT NULL on %.organization_id', tbl;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Could not set NOT NULL on %.organization_id: %', tbl, SQLERRM;
        END;
      ELSE
        RAISE NOTICE 'WARNING: % still has % rows with NULL organization_id — skipping NOT NULL', tbl, null_count;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- NOTE: activity_log intentionally excluded from NOT NULL enforcement
-- because system-level logs may not have an org context.
-- The RLS policies handle this safely.
-- ============================================================

-- ============================================================
-- DONE — Migration 007 Complete
--
-- Guarantees after this migration:
-- ✅ All existing business rows have an organization_id
-- ✅ New rows require organization_id (NOT NULL on most tables)
-- ✅ Legacy data is preserved and accessible via RLS
-- ✅ A default organization was created if none existed
-- ✅ The mapping operation is recorded in activity_log
-- ============================================================
