-- ============================================================
-- CLEANUP: Drop all legacy public-schema objects
-- Run this BEFORE applying migrations 000-008.
-- This does NOT touch auth.users — all auth accounts are preserved.
-- ============================================================

-- Drop all tables (CASCADE removes dependent objects like triggers, indexes, policies)
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.eway_bills CASCADE;
DROP TABLE IF EXISTS public.fuel_entries CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.maintenance_records CASCADE;
DROP TABLE IF EXISTS public.tyres CASCADE;
DROP TABLE IF EXISTS public.trips CASCADE;
DROP TABLE IF EXISTS public.enquiries CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.drivers CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.consignments CASCADE;
DROP TABLE IF EXISTS public.batteries CASCADE;
DROP TABLE IF EXISTS public.temperature_logs CASCADE;
DROP TABLE IF EXISTS public.transfers CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organization_settings CASCADE;
DROP TABLE IF EXISTS public.trip_status_history CASCADE;

-- Drop legacy functions that may conflict
DROP FUNCTION IF EXISTS public.is_organization_member CASCADE;
DROP FUNCTION IF EXISTS public.current_user_organization_ids CASCADE;
DROP FUNCTION IF EXISTS public.has_organization_role CASCADE;
DROP FUNCTION IF EXISTS public.is_platform_admin CASCADE;
DROP FUNCTION IF EXISTS public.create_organization_for_user CASCADE;
DROP FUNCTION IF EXISTS public.validate_same_organization CASCADE;
DROP FUNCTION IF EXISTS public.enforce_immutable_organization_id CASCADE;
DROP FUNCTION IF EXISTS public.log_privileged_action CASCADE;
DROP FUNCTION IF EXISTS public.cancel_trip CASCADE;
DROP FUNCTION IF EXISTS public.reopen_trip CASCADE;
DROP FUNCTION IF EXISTS public.transition_trip_status CASCADE;
DROP FUNCTION IF EXISTS public.update_trip_details CASCADE;
DROP FUNCTION IF EXISTS public.is_valid_trip_transition CASCADE;

-- Drop extensions (will be re-created by migration 000)
-- Note: uuid-ossp and pgcrypto are safe to drop and recreate
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
DROP EXTENSION IF EXISTS "pgcrypto" CASCADE;

SELECT 'Legacy cleanup complete. Auth users preserved.' AS result;
