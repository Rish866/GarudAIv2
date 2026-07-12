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
-- SECTION 5: Default FUNCTION EXECUTE privileges — assessment
-- Security note: Leaving automatic EXECUTE for future functions means any
-- accidentally created SECURITY DEFINER function becomes callable without
-- explicit security review. Revoking defaults does NOT affect existing
-- functions or existing RPC grants — it only requires future functions to
-- receive deliberate GRANT EXECUTE (the pattern already used in Migration 001).
--
-- DECISION: DENY-BY-DEFAULT for all three roles.
-- - PUBLIC:        revoke. Existing functions unaffected. Future functions
--                  used by service_role must get explicit grants.
-- - anon:          revoke. Anon should never auto-execute new functions.
-- - authenticated: revoke. Future RPCs must explicitly GRANT EXECUTE TO
--                  authenticated after security review.
-- ============================================================
SELECT
  'S5_FUNCTION_DEFAULTS' AS section,
  defaclrole::regrole::text AS owner_role,
  CASE acl.grantee
    WHEN 0 THEN 'PUBLIC'
    ELSE acl.grantee::regrole::text
  END AS grantee,
  acl.privilege_type,
  'REVOKE: deny-by-default (future functions must get explicit GRANT EXECUTE)' AS assessment
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
