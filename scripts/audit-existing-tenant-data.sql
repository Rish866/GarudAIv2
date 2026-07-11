-- ============================================================
-- GARUD AI — Phase 4: Audit Existing Tenant Data
-- Run this BEFORE the data migration to understand current state
-- ============================================================

-- 1. Count records per table that have NO organization_id
SELECT 'vehicles' as table_name, count(*) as total, count(*) FILTER (WHERE organization_id IS NULL) as orphaned FROM vehicles
UNION ALL SELECT 'drivers', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM drivers
UNION ALL SELECT 'customers', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM customers
UNION ALL SELECT 'trips', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM trips
UNION ALL SELECT 'enquiries', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM enquiries
UNION ALL SELECT 'quotations', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM quotations
UNION ALL SELECT 'invoices', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM invoices
UNION ALL SELECT 'payments', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM payments
UNION ALL SELECT 'expenses', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM expenses
UNION ALL SELECT 'fuel_entries', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM fuel_entries
UNION ALL SELECT 'maintenance_records', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM maintenance_records
UNION ALL SELECT 'tyres', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM tyres
UNION ALL SELECT 'activity_log', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM activity_log
UNION ALL SELECT 'notifications', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM notifications
UNION ALL SELECT 'eway_bills', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM eway_bills
UNION ALL SELECT 'branches', count(*), count(*) FILTER (WHERE organization_id IS NULL) FROM branches
ORDER BY table_name;

-- 2. Check distinct tenant_id values in existing data
SELECT 'vehicles' as table_name, tenant_id, count(*) FROM vehicles GROUP BY tenant_id
UNION ALL SELECT 'drivers', tenant_id, count(*) FROM drivers GROUP BY tenant_id
UNION ALL SELECT 'customers', tenant_id, count(*) FROM customers GROUP BY tenant_id
UNION ALL SELECT 'trips', tenant_id, count(*) FROM trips GROUP BY tenant_id
ORDER BY table_name, tenant_id;

-- 3. List all existing organizations (if any)
SELECT * FROM organizations ORDER BY created_at;

-- 4. List all organization members (if any)
SELECT om.*, o.name as org_name 
FROM organization_members om
LEFT JOIN organizations o ON o.id = om.organization_id
ORDER BY om.created_at;
