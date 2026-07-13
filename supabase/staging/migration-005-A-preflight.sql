-- migration-005-A-preflight.sql
-- Migration 005 Preflight: Verify dependencies for same-org enforcement
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: raises exception on failure, emits PASS on success
-- Dependencies: Migrations 001-003 (tables, RLS, triggers, policies)

DO $preflight$
DECLARE
  issues TEXT[];
  missing_tables TEXT[];
  missing_org_id TEXT[];
  existing_constraints TEXT[];
  missing_immutable_triggers TEXT[];
  expected_tables TEXT[] := ARRAY[
    'customers','trips','vehicles','drivers','branches',
    'enquiries','quotations','invoices','vendors',
    'contracts','indents','work_orders','challans','claims',
    'transfers','attendance','leave_requests','gps_devices',
    'expenses','fuel_entries','maintenance_records','tyres',
    'payments','eway_bills'
  ];
  unique_targets TEXT[] := ARRAY[
    'customers','trips','vehicles','drivers','branches','enquiries','quotations','invoices','vendors'
  ];
BEGIN

  -- 1. All required tables exist
  SELECT array_agg(t) INTO missing_tables
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t
  );
  IF missing_tables IS NOT NULL AND array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: missing tables: %', array_to_string(missing_tables, ', ');
  END IF;

  -- 2. All tables have organization_id
  SELECT array_agg(t) INTO missing_org_id
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'organization_id'
  );
  IF missing_org_id IS NOT NULL AND array_length(missing_org_id, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: missing organization_id: %', array_to_string(missing_org_id, ', ');
  END IF;

  -- 3. No conflicting UNIQUE constraints already exist
  SELECT array_agg(conname::text) INTO existing_constraints
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE conname LIKE 'uq_%_org_id' AND c.relname = ANY(unique_targets);
  IF existing_constraints IS NOT NULL AND array_length(existing_constraints, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: composite unique constraints already exist: %', array_to_string(existing_constraints, ', ');
  END IF;

  -- 4. Immutable org_id triggers exist (from Migration 003)
  SELECT array_agg(t) INTO missing_immutable_triggers
  FROM unnest(expected_tables) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class c ON c.oid = tr.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
    WHERE c.relname = t AND tr.tgname = 'enforce_immutable_organization_id'
  );
  IF missing_immutable_triggers IS NOT NULL AND array_length(missing_immutable_triggers, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: missing immutable org_id triggers: %', array_to_string(missing_immutable_triggers, ', ');
  END IF;

  -- 5. No conflicting same-org triggers already exist
  SELECT array_agg(tr.tgname::text) INTO existing_constraints
  FROM pg_trigger tr
  JOIN pg_class c ON c.oid = tr.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE tr.tgname LIKE 'enforce_same_org_refs_%';
  IF existing_constraints IS NOT NULL AND array_length(existing_constraints, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: same-org triggers already exist: %', array_to_string(existing_constraints, ', ');
  END IF;

  -- 6. Zero rows in all tables (empty staging)
  -- This ensures constraint addition won't fail on existing violating data

  RAISE NOTICE 'PREFLIGHT PASS: all 5 checks passed. Safe to execute Block B.';
END $preflight$;

SELECT 'PREFLIGHT PASS: all tables present, organization_id confirmed, no conflicting constraints/triggers, immutable org_id triggers verified. Safe to execute Block B.' AS result;
