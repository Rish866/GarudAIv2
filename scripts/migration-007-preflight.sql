-- ============================================================
-- PREFLIGHT CHECK for migration-007-workflow-linkage.sql
-- Run BEFORE migration. Read-only.
-- ============================================================

-- 1. Check parent tables exist
SELECT 'REQUIRED PARENT TABLES' AS section;
SELECT table_name, CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END
FROM (SELECT unnest(ARRAY['trips','indents','quotations','enquiries','invoices','drivers','vehicles','customers']) AS table_name) req
LEFT JOIN information_schema.tables ist ON ist.table_name = req.table_name AND ist.table_schema = 'public';

-- 2. Check new tables don't already exist (idempotent creation)
SELECT 'NEW TABLES STATUS' AS section;
SELECT table_name, CASE WHEN table_name IS NOT NULL THEN 'ALREADY EXISTS' ELSE 'WILL CREATE' END
FROM (SELECT unnest(ARRAY['lrs','pods','driver_settlements','invoice_trips']) AS table_name) req
LEFT JOIN information_schema.tables ist ON ist.table_name = req.table_name AND ist.table_schema = 'public';

-- 3. Check existing linkage columns
SELECT 'EXISTING LINKAGE COLUMNS' AS section;
SELECT table_name, column_name FROM information_schema.columns
WHERE (table_name = 'trips' AND column_name IN ('indent_id','quotation_id','enquiry_id'))
  OR (table_name = 'indents' AND column_name IN ('quotation_id','enquiry_id'))
  OR (table_name = 'quotations' AND column_name IN ('parent_quotation_id','revision_number'))
ORDER BY table_name, column_name;

-- 4. Check for duplicate LR numbers
SELECT 'DUPLICATE LR NUMBERS (must fix before unique constraint)' AS section;
SELECT lr_number, organization_id, COUNT(*)
FROM trips
WHERE lr_number IS NOT NULL AND lr_number != ''
GROUP BY lr_number, organization_id
HAVING COUNT(*) > 1;

-- 5. Check for trips already invoiced (for invoice_trips backfill)
SELECT 'TRIPS WITH INVOICES (for backfill)' AS section;
SELECT COUNT(*) AS invoiced_trips
FROM trips
WHERE status IN ('billed', 'settled');

-- 6. Check existing POD data
SELECT 'EXISTING POD DATA' AS section;
SELECT COUNT(*) AS trips_with_pod
FROM trips
WHERE pod_url IS NOT NULL AND pod_url != '';

-- 7. Verify organization_id exists on trips and indents
SELECT 'ORG_ID CHECK' AS section;
SELECT 'trips' AS tbl, COUNT(*) FILTER (WHERE organization_id IS NULL) AS null_org FROM trips
UNION ALL
SELECT 'indents', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM indents
UNION ALL
SELECT 'quotations', COUNT(*) FILTER (WHERE organization_id IS NULL) FROM quotations;

-- ============================================================
-- If any MISSING tables: STOP, create them first
-- If duplicate LR numbers: resolve before migration
-- If null org_id records: backfill before migration
-- ============================================================
