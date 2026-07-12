-- remediation-001-B-migration.sql
-- Pre-Migration-003 Privilege Remediation: Revoke all unsafe grants
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Purpose: Ensure zero table-level privileges for anon and authenticated
--          on ALL 36 business tables. This is required for Migration 003
--          Block A preflight check [5] to pass.
-- Safety: REVOKE ALL is idempotent. Running on tables already revoked is a no-op.
-- Scope: anon + authenticated only. Does not modify postgres/service_role grants.
-- Production: NOT TOUCHED.

BEGIN;

-- ============================================================
-- REVOKE ALL from anon and authenticated on all 36 business tables
-- Covers: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
-- Deterministic: includes all 36 regardless of current state
-- ============================================================

REVOKE ALL ON TABLE public.vehicles FROM anon, authenticated;
REVOKE ALL ON TABLE public.drivers FROM anon, authenticated;
REVOKE ALL ON TABLE public.customers FROM anon, authenticated;
REVOKE ALL ON TABLE public.trips FROM anon, authenticated;
REVOKE ALL ON TABLE public.enquiries FROM anon, authenticated;
REVOKE ALL ON TABLE public.quotations FROM anon, authenticated;
REVOKE ALL ON TABLE public.invoices FROM anon, authenticated;
REVOKE ALL ON TABLE public.payments FROM anon, authenticated;
REVOKE ALL ON TABLE public.expenses FROM anon, authenticated;
REVOKE ALL ON TABLE public.fuel_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.maintenance_records FROM anon, authenticated;
REVOKE ALL ON TABLE public.tyres FROM anon, authenticated;
REVOKE ALL ON TABLE public.activity_log FROM anon, authenticated;
REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
REVOKE ALL ON TABLE public.eway_bills FROM anon, authenticated;
REVOKE ALL ON TABLE public.branches FROM anon, authenticated;
REVOKE ALL ON TABLE public.vendors FROM anon, authenticated;
REVOKE ALL ON TABLE public.contracts FROM anon, authenticated;
REVOKE ALL ON TABLE public.routes FROM anon, authenticated;
REVOKE ALL ON TABLE public.indents FROM anon, authenticated;
REVOKE ALL ON TABLE public.market_hires FROM anon, authenticated;
REVOKE ALL ON TABLE public.work_orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.challans FROM anon, authenticated;
REVOKE ALL ON TABLE public.geofences FROM anon, authenticated;
REVOKE ALL ON TABLE public.claims FROM anon, authenticated;
REVOKE ALL ON TABLE public.approvals FROM anon, authenticated;
REVOKE ALL ON TABLE public.transfers FROM anon, authenticated;
REVOKE ALL ON TABLE public.cash_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.bank_entries FROM anon, authenticated;
REVOKE ALL ON TABLE public.ledger_accounts FROM anon, authenticated;
REVOKE ALL ON TABLE public.purchases FROM anon, authenticated;
REVOKE ALL ON TABLE public.sales FROM anon, authenticated;
REVOKE ALL ON TABLE public.inventory FROM anon, authenticated;
REVOKE ALL ON TABLE public.attendance FROM anon, authenticated;
REVOKE ALL ON TABLE public.leave_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.gps_devices FROM anon, authenticated;

COMMIT;
