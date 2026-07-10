-- ============================================================
-- RUN THIS FIRST: Drop any existing tables that have bad FK constraints
-- Then run SUPABASE_SCHEMA.sql after this succeeds
-- ============================================================

-- Drop tables if they exist (to remove old FK constraints)
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS fuel_entries CASCADE;
DROP TABLE IF EXISTS maintenance_records CASCADE;
DROP TABLE IF EXISTS tyres CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS eway_bills CASCADE;

-- Now you can safely run SUPABASE_SCHEMA.sql
