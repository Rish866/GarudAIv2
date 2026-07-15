-- ============================================================
-- ROLLBACK for migration-007-workflow-linkage.sql
-- Removes new tables and columns. USE WITH CAUTION.
-- Data in lrs, pods, driver_settlements, invoice_trips will be LOST.
-- ============================================================

-- Drop trigger
DROP TRIGGER IF EXISTS trg_trips_validate_linkage ON trips;
DROP FUNCTION IF EXISTS validate_same_org_linkage();

-- Drop new tables (CASCADE removes policies)
DROP TABLE IF EXISTS invoice_trips CASCADE;
DROP TABLE IF EXISTS driver_settlements CASCADE;
DROP TABLE IF EXISTS pods CASCADE;
DROP TABLE IF EXISTS lrs CASCADE;

-- Remove added columns (only if safe — will lose data)
-- DO NOT run these if data has been written to these columns
-- ALTER TABLE trips DROP COLUMN IF EXISTS indent_id;
-- ALTER TABLE trips DROP COLUMN IF EXISTS quotation_id;
-- ALTER TABLE trips DROP COLUMN IF EXISTS enquiry_id;
-- ALTER TABLE indents DROP COLUMN IF EXISTS quotation_id;
-- ALTER TABLE indents DROP COLUMN IF EXISTS enquiry_id;
-- ALTER TABLE quotations DROP COLUMN IF EXISTS parent_quotation_id;
-- ALTER TABLE quotations DROP COLUMN IF EXISTS revision_number;
-- ALTER TABLE quotations DROP COLUMN IF EXISTS is_current_revision;
-- ALTER TABLE quotations DROP COLUMN IF EXISTS approved_by;
-- ALTER TABLE quotations DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE quotations DROP COLUMN IF EXISTS rejection_reason;
-- ALTER TABLE quotations DROP COLUMN IF EXISTS converted_vehicles;

-- NOTE: Column drops are commented out by default.
-- Only uncomment if you need full rollback and accept data loss.
-- ============================================================
