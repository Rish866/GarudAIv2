-- remediation-002-A-preflight.sql
-- Default ACL Remediation: Read-only audit
-- Target: staging ybuhazlnjqjrshcvpuna
-- Purpose: Report all default ACLs in public schema that auto-grant privileges
--          to PUBLIC, anon, or authenticated on new objects.
-- Covers: TABLE, SEQUENCE, FUNCTION defaults for supabase_admin and postgres.
-- Read-only: no changes, just reporting.

-- ============================================================
-- SECTION 1: All default ACLs (granular via aclexplode)
-- Shows: grantor role, schema, object type, grantee, privilege, grantable, safety flag
-- ============================================================
SELECT
  'S1_DEFAULT_ACLS' AS section,
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
    WHEN defaclobjtype = 'r'
      AND acl.grantee IN (
        0,
        (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
        (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
      )
    THEN 'UNSAFE: auto-grants TABLE privilege to API-exposed role'
    WHEN defaclobjtype = 'S'
      AND acl.grantee IN (
        0,
        (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
        (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
      )
    THEN 'UNSAFE: auto-grants SEQUENCE privilege to API-exposed role'
    WHEN defaclobjtype = 'f'
      AND acl.grantee IN (
        0,
        (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
        (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
      )
    THEN 'REVIEW: auto-grants FUNCTION EXECUTE to API-exposed role'
    ELSE 'OK'
  END AS safety_flag
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclnamespace = 0
   OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY owner_role, schema, object_type, grantee, privilege_type;

-- ============================================================
-- SECTION 2: Verify executing role can ALTER DEFAULT PRIVILEGES for each owner
-- Required: current_user must be the owner or a superuser/member of the owner role
-- ============================================================
SELECT
  'S2_AUTHORIZATION' AS section,
  rolname AS owner_role,
  CASE
    WHEN pg_has_role(current_user, rolname, 'MEMBER') THEN 'AUTHORIZED: current_user is member of ' || rolname
    WHEN current_setting('is_superuser') = 'on' THEN 'AUTHORIZED: current_user is superuser'
    ELSE 'NOT AUTHORIZED: cannot ALTER DEFAULT PRIVILEGES FOR ROLE ' || rolname
  END AS authorization_status
FROM pg_roles
WHERE rolname IN ('supabase_admin', 'postgres')
ORDER BY rolname;

-- ============================================================
-- SECTION 3: Default TABLE privileges summary (unsafe grants only)
-- ============================================================
SELECT
  'S3_UNSAFE_TABLE_DEFAULTS' AS section,
  defaclrole::regrole::text AS owner_role,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  acl.privilege_type,
  'Must be revoked before Migration 003' AS action_required
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'r'
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )
ORDER BY owner_role, grantee, privilege_type;

-- ============================================================
-- SECTION 4: Default SEQUENCE privileges for anon/authenticated
-- Security note: Sequence access bypasses table RLS. Should be deny-by-default
-- unless explicitly required by application logic (e.g., serial PK generation
-- via PostgREST). In this ERP, all PKs are gen_random_uuid() so sequence
-- grants are NOT required.
-- ============================================================
SELECT
  'S4_SEQUENCE_DEFAULTS' AS section,
  defaclrole::regrole::text AS owner_role,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  acl.privilege_type,
  'UNSAFE: should be revoked (all PKs use gen_random_uuid, no sequence access needed)' AS assessment
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'S'
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )
ORDER BY owner_role, grantee, privilege_type;

-- ============================================================
-- SECTION 5: Default FUNCTION EXECUTE privileges — compatibility analysis
-- Security note: Revoking default EXECUTE from authenticated would break
-- all RPC calls to newly-created functions unless explicit GRANT EXECUTE
-- is added per function. Our Migration 001 already does explicit
-- REVOKE ALL + GRANT EXECUTE on each security-critical function.
--
-- ASSESSMENT:
-- - Revoking default FUNCTION EXECUTE for 'anon' is SAFE: anon should
--   never call arbitrary new functions.
-- - Revoking default FUNCTION EXECUTE for 'authenticated' is RISKY:
--   future migrations creating SECURITY DEFINER RPCs would silently fail
--   unless each explicitly grants EXECUTE.
-- - Revoking default FUNCTION EXECUTE for PUBLIC is VERY RISKY: it affects
--   all roles including service_role internal operations.
--
-- RECOMMENDATION:
-- - Revoke from anon only for TABLE/SEQUENCE defaults.
-- - For FUNCTION: revoke from anon only. Leave authenticated/PUBLIC as-is
--   until Migration 013 establishes explicit per-function grant discipline.
-- - Document that all new functions MUST have explicit GRANT/REVOKE.
-- ============================================================
SELECT
  'S5_FUNCTION_DEFAULTS' AS section,
  defaclrole::regrole::text AS owner_role,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  acl.privilege_type,
  CASE
    WHEN acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
    THEN 'SAFE TO REVOKE: anon should not auto-execute new functions'
    WHEN acl.grantee = 0
    THEN 'DO NOT REVOKE: PUBLIC EXECUTE removal breaks service_role internals'
    WHEN acl.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    THEN 'DEFER: revocation requires per-function explicit grants (Migration 013)'
    ELSE 'OK'
  END AS assessment
FROM pg_default_acl
CROSS JOIN LATERAL aclexplode(defaclacl) AS acl
WHERE defaclobjtype = 'f'
  AND (defaclnamespace = 0 OR defaclnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
  AND acl.grantee IN (
    0,
    (SELECT oid FROM pg_roles WHERE rolname = 'anon'),
    (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
  )
ORDER BY owner_role, grantee, privilege_type;
