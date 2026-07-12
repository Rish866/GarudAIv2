-- remediation-002-C-validation.sql
-- Default ACL Remediation: Validation
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes
-- Validates that default ACLs no longer auto-grant unsafe privileges
-- Expected: ALL 5 CHECKS PASS

-- ============================================================
-- C01: Zero default TABLE grants to PUBLIC/anon/authenticated under supabase_admin
-- ============================================================
SELECT
  'C01' AS check_id,
  'zero_table_defaults_supabase_admin' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' unsafe table defaults remain for supabase_admin: ' ||
      string_agg(
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END AS result
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'r'
  AND defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'supabase_admin')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

UNION ALL

-- ============================================================
-- C02: Zero default TABLE grants to PUBLIC/anon/authenticated under postgres
-- ============================================================
SELECT
  'C02',
  'zero_table_defaults_postgres',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' unsafe table defaults remain for postgres: ' ||
      string_agg(
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END
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
-- C03: Zero default SEQUENCE grants to PUBLIC/anon/authenticated (both owners)
-- ============================================================
SELECT
  'C03',
  'zero_sequence_defaults',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' unsafe sequence defaults remain: ' ||
      string_agg(
        defaclrole::regrole::text || '→' ||
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'S'
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

UNION ALL

-- ============================================================
-- C04: Zero default FUNCTION EXECUTE grants to PUBLIC, anon, and authenticated (both owners)
-- Deny-by-default: future functions must receive explicit GRANT EXECUTE
-- ============================================================
SELECT
  'C04',
  'zero_function_defaults_all_api_roles',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' function defaults remain: ' ||
      string_agg(
        defaclrole::regrole::text || '→' ||
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'f'
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

UNION ALL

-- ============================================================
-- C05: Comprehensive check — no default ACL entry for TABLE or SEQUENCE
--      grants any privilege to PUBLIC/anon/authenticated under any owner
-- ============================================================
SELECT
  'C05',
  'zero_unsafe_future_table_seq_grants',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' unsafe defaults still exist: ' ||
      string_agg(
        defaclrole::regrole::text || '(' ||
        CASE defaclobjtype WHEN 'r' THEN 'TABLE' WHEN 'S' THEN 'SEQUENCE' END
        || ')→' ||
        CASE acl.grantee WHEN 0 THEN 'PUBLIC' ELSE acl.grantee::regrole::text END
        || ':' || acl.privilege_type, ', '
      )
  END
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype IN ('r', 'S')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )

ORDER BY check_id;
