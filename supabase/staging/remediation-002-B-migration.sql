-- remediation-002-B-migration.sql
-- Default ACL Remediation: Revoke unsafe default TABLE and SEQUENCE privileges
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Purpose: Prevent future tables/sequences in public schema from automatically
--          granting privileges to PUBLIC, anon, or authenticated.
-- Scope:
--   TABLE defaults: revoke ALL from PUBLIC, anon, authenticated (for both owners)
--   SEQUENCE defaults: revoke ALL from PUBLIC, anon, authenticated (for both owners)
--   FUNCTION defaults: revoke EXECUTE from anon ONLY (see compatibility analysis)
-- Owners: supabase_admin, postgres (both have default ACLs on staging)
-- Safety: ALTER DEFAULT PRIVILEGES is idempotent — re-running is a no-op.
-- Does NOT retroactively affect existing tables (that's Remediation 001's job).
-- Production: NOT TOUCHED.

BEGIN;

-- ============================================================
-- PHASE 1: Revoke default TABLE privileges
-- Covers: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
-- For both supabase_admin and postgres as owners
-- ============================================================

-- supabase_admin owned tables
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM authenticated;

-- postgres owned tables
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM authenticated;

-- ============================================================
-- PHASE 2: Revoke default SEQUENCE privileges
-- All PKs use gen_random_uuid() — no sequence access needed by API roles.
-- Sequence access bypasses table RLS.
-- ============================================================

-- supabase_admin owned sequences
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM authenticated;

-- postgres owned sequences
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM authenticated;

-- ============================================================
-- PHASE 3: Revoke default FUNCTION EXECUTE from anon ONLY
-- anon should never auto-execute newly-created functions.
-- authenticated and PUBLIC are left intact per compatibility analysis:
--   - authenticated: revoking would silently break future RPCs
--   - PUBLIC: revoking would break service_role internals
-- Migration 013 will establish per-function grant discipline.
-- ============================================================

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

COMMIT;
