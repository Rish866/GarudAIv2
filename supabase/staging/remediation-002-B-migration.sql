-- remediation-002-B-migration.sql
-- Default ACL Remediation: postgres-owned defaults ONLY
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Scope: ALTER DEFAULT PRIVILEGES FOR ROLE postgres ONLY
-- Purpose: Deny-by-default for future postgres-owned objects in public schema.
--          Prevents auto-granting to PUBLIC, anon, or authenticated.
-- NOT included: supabase_admin defaults (current_user lacks authorization;
--               documented as external platform blocker).
-- Safety: Idempotent. Does not affect existing objects or service_role grants.
-- Production: NOT TOUCHED.

BEGIN;

-- ============================================================
-- PHASE 1: Revoke default TABLE privileges (postgres-owned)
-- Covers: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
-- ============================================================

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM authenticated;

-- ============================================================
-- PHASE 2: Revoke default SEQUENCE privileges (postgres-owned)
-- All PKs use gen_random_uuid() — no sequence access needed by API roles.
-- ============================================================

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM authenticated;

-- ============================================================
-- PHASE 3: Revoke default FUNCTION EXECUTE (postgres-owned)
-- Deny-by-default: future functions must get explicit GRANT EXECUTE.
-- ============================================================

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

COMMIT;
