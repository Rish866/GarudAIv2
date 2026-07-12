-- migration-002-A-preflight.sql
-- Read-only pre-flight for Migration 002
-- Target: staging ybuhazlnjqjrshcvpuna
-- Fail-closed: raises exception if any dependency missing or any target exists.
-- On success: visible PASS result row.

DO $preflight$
DECLARE
  missing_deps TEXT;
  conflicts INTEGER;
BEGIN
  -- Verify ALL required dependency tables exist
  SELECT string_agg(d.name, ', ') INTO missing_deps
  FROM (VALUES ('organizations'),('customers'),('trips'),('vehicles'),('drivers'),('branches')) AS d(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = d.name
  );

  IF missing_deps IS NOT NULL THEN
    RAISE EXCEPTION 'PREFLIGHT STOP: missing dependency tables: %', missing_deps;
  END IF;

  -- Verify none of the 20 target tables already exist
  SELECT count(*) INTO conflicts
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'vendors','contracts','routes','indents','market_hires',
      'work_orders','challans','geofences','claims','approvals',
      'transfers','cash_entries','bank_entries','ledger_accounts',
      'purchases','sales','inventory','attendance','leave_requests',
      'gps_devices'
    );

  IF conflicts > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT STOP: % of 20 target tables already exist.', conflicts;
  END IF;
END $preflight$;

SELECT 'PREFLIGHT PASS: all 6 dependencies exist, 0/20 target conflicts. Safe to execute Block B.' AS result;
