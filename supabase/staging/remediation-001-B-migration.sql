-- remediation-001-B-migration.sql
-- Pre-Migration-003 Privilege Remediation: Revoke all unsafe grants
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Purpose: Ensure zero table-level privileges for PUBLIC, anon, and
--          authenticated on ALL 36 business tables.
-- Covers all three API exposure paths:
--   PUBLIC  → inherited by every role including anon/authenticated
--   anon    → Supabase anonymous API requests
--   authenticated → Supabase authenticated API requests
-- Safety: REVOKE ALL is idempotent. Does NOT modify postgres/service_role.
-- Production: NOT TOUCHED.

BEGIN;

-- ============================================================
-- REVOKE ALL from PUBLIC, anon, and authenticated
-- Covers: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
-- All 36 business tables listed explicitly for determinism
-- ============================================================

REVOKE ALL ON TABLE public.vehicles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.drivers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.customers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.trips FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.enquiries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.quotations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.invoices FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.expenses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.fuel_entries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.maintenance_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.tyres FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.activity_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.eway_bills FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.branches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.vendors FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.contracts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.routes FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.indents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.market_hires FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.work_orders FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.challans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.geofences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.claims FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.approvals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.transfers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cash_entries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.bank_entries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.ledger_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.purchases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.sales FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.inventory FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.attendance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.leave_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.gps_devices FROM PUBLIC, anon, authenticated;

COMMIT;
