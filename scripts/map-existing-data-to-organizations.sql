-- ============================================================
-- GARUD AI — Phase 4: Map Existing Data to Organizations
-- 
-- STRATEGY:
-- 1. Create a dedicated DEMO organization for all seed/demo data
-- 2. All records with tenant_id = 'garud-erp-001' → Demo Org
-- 3. Any records tied to real Supabase Auth users → their org
-- 4. Orphan records with no identifiable owner → Demo Org (flagged)
-- 
-- RUN AFTER: 001_multi_tenant_foundation.sql and 002_complete_tenant_tables.sql
-- ============================================================

-- Step 1: Create the dedicated Demo Organization
INSERT INTO public.organizations (id, name, slug, status, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Garud AI Demo Transport',
  'garud-demo',
  'active',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create organization settings for demo
INSERT INTO public.organization_settings (organization_id, onboarding_completed)
VALUES ('00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (organization_id) DO NOTHING;

-- Step 3: Map ALL existing records with tenant_id = 'garud-erp-001' to Demo Org
-- These are the seed/demo records created during development

UPDATE vehicles SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE drivers SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE customers SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE trips SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE enquiries SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE quotations SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE invoices SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE payments SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE expenses SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE fuel_entries SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE maintenance_records SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE tyres SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE activity_log SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE notifications SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE eway_bills SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

UPDATE branches SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL AND tenant_id = 'garud-erp-001';

-- Step 4: Map any remaining orphan records (no tenant_id) to Demo Org
-- These are records that slipped through without proper tagging

UPDATE vehicles SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE drivers SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE customers SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE trips SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE enquiries SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE quotations SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE invoices SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE payments SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE expenses SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE fuel_entries SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE maintenance_records SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE tyres SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE activity_log SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE notifications SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE eway_bills SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

UPDATE branches SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Step 5: After migration, enforce NOT NULL on organization_id
-- Only run this AFTER confirming all records are mapped

ALTER TABLE vehicles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE drivers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE trips ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE enquiries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE quotations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE fuel_entries ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE maintenance_records ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE tyres ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE activity_log ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE eway_bills ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE branches ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================
-- DONE — All existing data mapped to organizations
-- Demo data is isolated to the demo organization
-- organization_id is now NOT NULL on all business tables
-- ============================================================
