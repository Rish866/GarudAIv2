-- ============================================================
-- VERIFICATION for migration-007-workflow-linkage.sql
-- Run AFTER migration to confirm success.
-- ============================================================

-- 1. New tables created
SELECT 'NEW TABLES' AS section;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('lrs','pods','driver_settlements','invoice_trips')
ORDER BY table_name;

-- 2. Linkage columns added
SELECT 'LINKAGE COLUMNS' AS section;
SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'trips' AND column_name IN ('indent_id','quotation_id','enquiry_id'))
    OR (table_name = 'indents' AND column_name IN ('quotation_id','enquiry_id'))
    OR (table_name = 'quotations' AND column_name IN ('parent_quotation_id','revision_number','is_current_revision','approved_by','approved_at','converted_vehicles'))
  )
ORDER BY table_name, column_name;

-- 3. RLS policies on new tables
SELECT 'RLS POLICIES' AS section;
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('lrs','pods','driver_settlements','invoice_trips')
ORDER BY tablename, cmd;

-- 4. Unique indexes
SELECT 'UNIQUE INDEXES' AS section;
SELECT indexname, tablename FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE 'idx_lrs_unique%' OR indexname LIKE 'idx_pods_active%' OR indexname LIKE 'idx_settlements_active%' OR indexname LIKE 'idx_invoice_trips_unique%');

-- 5. Cross-tenant trigger
SELECT 'CROSS-TENANT TRIGGER' AS section;
SELECT trigger_name, event_object_table FROM information_schema.triggers
WHERE trigger_name = 'trg_trips_validate_linkage';

-- ============================================================
-- Expected: 4 tables, 8+ columns, 16 policies, 4 unique indexes, 1 trigger
-- ============================================================
