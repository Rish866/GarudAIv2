-- remediation-002-A-preflight.sql
-- Default ACL Remediation: Read-only preflight
-- Target: staging ybuhazlnjqjrshcvpuna
-- Purpose: Verify authorization for postgres-owned default revocation,
--          report supabase_admin defaults as an unresolved external blocker.
-- Read-only: no changes.

-- ============================================================
-- SECTION 1: Authorization verification
-- postgres-owned defaults: current_user must be postgres or member
-- supabase_admin: expected NOT AUTHORIZED (external/platform blocker)
-- ============================================================
SELECT
  'S1_AUTHORIZATION' AS section,
  rolname AS owner_role,
  CASE
    WHEN current_user = rolname THEN 'AUTHORIZED: current_user IS ' || rolname
    WHEN pg_has_role(current_user, rolname, 'MEMBER') THEN 'AUTHORIZED: current_user is member of ' || rolname
    ELSE 'NOT AUTHORIZED: cannot ALTER DEFAULT PRIVILEGES FOR ROLE ' || rolname
  END AS authorization_status,
  CASE
    WHEN rolname = 'postgres' AND (current_user = 'postgres' OR pg_has_role(current_user, 'postgres', 'MEMBER'))
    THEN 'EXECUTABLE: included in Remediation 002-B'
    WHEN rolname = 'supabase_admin'
    THEN 'BLOCKER: requires Supabase platform mechanism or support ticket'
    ELSE 'UNKNOWN'
  END AS action_scope
FROM pg_roles
WHERE rolname IN ('supabase_admin', 'postgres')
ORDER BY rolname;

-- ============================================================
-- SECTION 2: All unsafe default ACLs (granular via aclexplode)
-- ============================================================
SELECT
  'S2_ALL_DEFAULTS' AS section,
  defaclrole::regrole::text AS owner_role,
  CASE defaclnamespace
    WHEN 0 THEN 'GLOBAL'
    ELSE defaclnamespace::regnamespace::text
  END AS schema,
  CASE defaclobjtype
    WHEN 'r' THEN 'TABLE'
    WHEN 'S' THEN 'SEQUENCE'
    WHEN 'f' THEN 'FUNCTION'
    WHEN 'T' THEN 'TYPE'
    WHEN 'n' THEN 'SCHEMA'
  END AS object_type,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable,
  CASE
    WHEN defaclobjtype IN ('r', 'S', 'f')
      AND acl.grantee IN (
        0,
        (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
        (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
      )
    THEN 'UNSAFE'
    ELSE 'OK'
  END AS safety_flag,
  CASE
    WHEN defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
    THEN 'REMEDIABLE: included in Block B'
    WHEN defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'supabase_admin')
    THEN 'EXTERNAL BLOCKER: requires platform mechanism'
    ELSE 'OTHER OWNER'
  END AS remediation_scope
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclnamespace = 0
   OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY owner_role, schema, object_type, grantee, privilege_type;

-- ============================================================
-- SECTION 3: Unsafe postgres-owned defaults (will be revoked by Block B)
-- ============================================================
SELECT
  'S3_POSTGRES_UNSAFE' AS section,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  CASE defaclobjtype
    WHEN 'r' THEN 'TABLE'
    WHEN 'S' THEN 'SEQUENCE'
    WHEN 'f' THEN 'FUNCTION'
  END AS object_type,
  acl.privilege_type,
  'Will be revoked by Remediation 002-B' AS status
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
  AND defaclobjtype IN ('r', 'S', 'f')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )
ORDER BY object_type, grantee, privilege_type;

-- ============================================================
-- SECTION 4: supabase_admin unsafe defaults (UNRESOLVED BLOCKER)
-- These cannot be remediated by the current executing role.
-- Resolution requires one of:
--   1. Supabase Dashboard > Database > Roles > alter defaults
--   2. Supabase support ticket
--   3. supabase CLI with service_role key (if supported)
--   4. Direct connection as supabase_admin (platform-internal)
-- ============================================================
SELECT
  'S4_SUPABASE_ADMIN_BLOCKER' AS section,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  CASE defaclobjtype
    WHEN 'r' THEN 'TABLE'
    WHEN 'S' THEN 'SEQUENCE'
    WHEN 'f' THEN 'FUNCTION'
  END AS object_type,
  acl.privilege_type,
  'UNRESOLVED: requires authorized Supabase platform mechanism' AS status
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclrole = (SELECT oid FROM pg_roles WHERE rolname = 'supabase_admin')
  AND defaclobjtype IN ('r', 'S', 'f')
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )
ORDER BY object_type, grantee, privilege_type;
