-- remediation-002-C-validation.sql
-- Default ACL Remediation: Validation
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes
-- Validates postgres-owned defaults are clean.
-- Reports supabase_admin defaults as BLOCKER (not PASS).
-- Expected: C01-C04 PASS, C05 BLOCKER (informational)

-- ============================================================
-- C01: Zero postgres-owned default TABLE grants to PUBLIC/anon/authenticated
-- ============================================================
SELECT
  'C01' AS check_id,
  'zero_postgres_table_defaults' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' postgres table defaults remain: ' ||
      string_agg(
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END AS result
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'r'
  AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

UNION ALL

-- ============================================================
-- C02: Zero postgres-owned default SEQUENCE grants to PUBLIC/anon/authenticated
-- ============================================================
SELECT
  'C02',
  'zero_postgres_sequence_defaults',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' postgres sequence defaults remain: ' ||
      string_agg(
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'S'
  AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

UNION ALL

-- ============================================================
-- C03: Zero postgres-owned default FUNCTION EXECUTE for PUBLIC/anon/authenticated
-- ============================================================
SELECT
  'C03',
  'zero_postgres_function_defaults',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' postgres function defaults remain: ' ||
      string_agg(
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'f'
  AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

UNION ALL

-- ============================================================
-- C04: Comprehensive — zero postgres-owned unsafe defaults (TABLE + SEQUENCE + FUNCTION)
-- ============================================================
SELECT
  'C04',
  'zero_all_postgres_unsafe_defaults',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' postgres unsafe defaults remain'
  END
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype IN ('r', 'S', 'f')
  AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

UNION ALL

-- ============================================================
-- C05: supabase_admin unsafe defaults — EXTERNAL BLOCKER (not PASS/FAIL)
-- This check intentionally does NOT return PASS when unsafe defaults exist.
-- It reports the blocker count so it is visible and tracked.
-- Resolution requires Supabase platform mechanism or support.
-- ============================================================
SELECT
  'C05',
  'supabase_admin_defaults_BLOCKER',
  CASE WHEN count(*) = 0 THEN 'RESOLVED: no supabase_admin unsafe defaults remain'
    ELSE 'BLOCKER: ' || count(*) || ' supabase_admin unsafe defaults unresolved — requires platform mechanism: ' ||
      string_agg(
        CASE defaclobjtype WHEN 'r' THEN 'TABLE' WHEN 'S' THEN 'SEQUENCE' WHEN 'f' THEN 'FUNCTION' END
        || '→' ||
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype IN ('r', 'S', 'f')
  AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'supabase_admin')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

ORDER BY check_id;
