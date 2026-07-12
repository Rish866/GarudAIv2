-- remediation-002-B-migration.sql
-- Default ACL Remediation: Deny-by-default for all future objects
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Purpose: Prevent future tables, sequences, and functions in public schema
--          from automatically granting privileges to PUBLIC, anon, or authenticated.
-- Scope:
--   TABLE defaults: revoke ALL from PUBLIC, anon, authenticated (both owners)
--   SEQUENCE defaults: revoke ALL from PUBLIC, anon, authenticated (both owners)
--   FUNCTION defaults: revoke EXECUTE from PUBLIC, anon, authenticated (both owners)
-- Owners: supabase_admin, postgres
-- Principle: DENY-BY-DEFAULT. Future callable functions must receive explicit
--            GRANT EXECUTE after security review. This does NOT affect existing
--            functions, existing RPCs, or existing service_role operations.
-- Safety: ALTER DEFAULT PRIVILEGES is idempotent — re-running is a no-op.
--         Does not revoke direct service_role grants.
-- Production: NOT TOUCHED.

BEGIN;

-- ============================================================
-- PHASE 1: Revoke default TABLE privileges
-- Covers all table privileges: SELECT, INSERT, UPDATE, DELETE,
-- TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
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
-- All PKs use gen_random_uuid() — no sequence access needed.
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
-- PHASE 3: Revoke default FUNCTION EXECUTE privileges
-- DENY-BY-DEFAULT: future functions are not callable without explicit grant.
-- This does NOT affect existing functions or existing grants.
-- Future callable functions must explicitly:
--   GRANT EXECUTE ON FUNCTION ... TO authenticated;
-- after security review (already the pattern in Migration 001).
-- ============================================================

-- supabase_admin owned functions
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- postgres owned functions
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

COMMIT;
