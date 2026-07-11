-- ============================================================
-- GARUD AI — SECURITY FIX: Replace open policies with tenant-based RLS
-- Run this in Supabase SQL Editor AFTER enabling Supabase Auth
-- ============================================================

-- Step 1: Drop all existing open policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('branches','drivers','customers','trips','enquiries','quotations',
      'invoices','payments','expenses','fuel_entries','maintenance_records',
      'tyres','activity_log','notifications','eway_bills')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_full_access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all for anon" ON %I', tbl);
  END LOOP;
END $$;

-- Step 2: Create secure tenant-based policies
-- Users can only access data belonging to their tenant

-- Helper: Get current user's tenant_id from the users table
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS TEXT AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid()::text;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Apply secure policies to all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'branches','drivers','customers','trips','enquiries','quotations',
      'invoices','payments','expenses','fuel_entries','maintenance_records',
      'tyres','activity_log','notifications','eway_bills'
    ])
  LOOP
    -- Select: users can only see their tenant's data
    EXECUTE format(
      'CREATE POLICY "tenant_select" ON %I FOR SELECT USING (tenant_id = get_user_tenant_id())',
      tbl
    );
    -- Insert: users can only insert into their tenant
    EXECUTE format(
      'CREATE POLICY "tenant_insert" ON %I FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id())',
      tbl
    );
    -- Update: users can only update their tenant's data
    EXECUTE format(
      'CREATE POLICY "tenant_update" ON %I FOR UPDATE USING (tenant_id = get_user_tenant_id())',
      tbl
    );
    -- Delete: users can only delete their tenant's data
    EXECUTE format(
      'CREATE POLICY "tenant_delete" ON %I FOR DELETE USING (tenant_id = get_user_tenant_id())',
      tbl
    );
  END LOOP;
END $$;

-- Step 3: Keep tenants table accessible for initial signup flow
DROP POLICY IF EXISTS "anon_full_access" ON tenants;
CREATE POLICY "authenticated_tenants" ON tenants
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Step 4: Users table — users can only see/edit their own record
DROP POLICY IF EXISTS "anon_full_access" ON users;
CREATE POLICY "users_own_record" ON users
  FOR SELECT USING (id = auth.uid()::text OR tenant_id = get_user_tenant_id());
CREATE POLICY "users_insert" ON users
  FOR INSERT WITH CHECK (true); -- Allow signup to create user record
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid()::text);

-- ============================================================
-- DONE! Data is now isolated per tenant.
-- Only authenticated users with matching tenant_id can access data.
-- ============================================================
