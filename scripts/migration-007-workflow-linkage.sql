-- ============================================================
-- MIGRATION 007: Workflow Entity Linkage
--
-- Adds parent-reference columns to connect the full workflow chain:
-- Enquiry → Quotation → Indent → Trip → LR → POD → Settlement → Invoice → Payment
--
-- Also creates persistent entities for LR, POD, and Driver Settlement.
-- Adds invoice_trips junction table for idempotent billing.
--
-- SAFE: Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS patterns.
-- ROLLBACK: See scripts/migration-007-rollback.sql
-- ============================================================

-- ============================================================
-- 1. ADD LINKAGE COLUMNS TO EXISTING TABLES
-- ============================================================

-- Indents: link to parent quotation and enquiry
DO $$ BEGIN
  ALTER TABLE indents ADD COLUMN IF NOT EXISTS quotation_id UUID;
  ALTER TABLE indents ADD COLUMN IF NOT EXISTS enquiry_id UUID;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Trips: link to parent indent, quotation, enquiry
DO $$ BEGIN
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS indent_id UUID;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS quotation_id UUID;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS enquiry_id UUID;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Quotations: revision tracking
DO $$ BEGIN
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS parent_quotation_id UUID;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS revision_number INTEGER DEFAULT 1;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS is_current_revision BOOLEAN DEFAULT true;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approved_by UUID;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  ALTER TABLE quotations ADD COLUMN IF NOT EXISTS converted_vehicles INTEGER DEFAULT 0;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================
-- 2. LR (CONSIGNMENT NOTE) TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS lrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  trip_id UUID NOT NULL,
  lr_number TEXT NOT NULL,
  consignor_name TEXT,
  consignor_gstin TEXT,
  consignee_name TEXT,
  consignee_gstin TEXT,
  material TEXT,
  package_count INTEGER DEFAULT 0,
  declared_weight NUMERIC DEFAULT 0,
  actual_weight NUMERIC,
  eway_bill_number TEXT,
  generated_by UUID,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active',
  locked_at TIMESTAMPTZ,
  amended_by UUID,
  amendment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique LR number per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_lrs_unique_number
  ON lrs (organization_id, lr_number);

-- ============================================================
-- 3. POD (PROOF OF DELIVERY) TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  trip_id UUID NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_at TIMESTAMPTZ,
  received_by TEXT,
  remarks TEXT,
  status TEXT DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  customer_visible BOOLEAN DEFAULT false,
  waiver_reason TEXT,
  waived_by UUID,
  waived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active POD per trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_pods_active_trip
  ON pods (organization_id, trip_id) WHERE status IN ('uploaded', 'verified', 'waived');

-- ============================================================
-- 4. DRIVER SETTLEMENT TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  trip_id UUID NOT NULL,
  driver_id UUID NOT NULL,
  opening_advance NUMERIC DEFAULT 0,
  additional_advance NUMERIC DEFAULT 0,
  diesel_cash NUMERIC DEFAULT 0,
  toll_cash NUMERIC DEFAULT 0,
  loading_cash NUMERIC DEFAULT 0,
  unloading_cash NUMERIC DEFAULT 0,
  bata NUMERIC DEFAULT 0,
  parking NUMERIC DEFAULT 0,
  repair_cash NUMERIC DEFAULT 0,
  miscellaneous NUMERIC DEFAULT 0,
  total_admissible NUMERIC DEFAULT 0,
  recoverable_amount NUMERIC DEFAULT 0,
  payable_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft',
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  reversal_reason TEXT,
  reversed_by UUID,
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One active settlement per trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_active_trip
  ON driver_settlements (organization_id, trip_id) WHERE status NOT IN ('reversed');

-- ============================================================
-- 5. INVOICE-TRIPS JUNCTION TABLE (Idempotency)
-- ============================================================

CREATE TABLE IF NOT EXISTS invoice_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  trip_id UUID NOT NULL,
  billed_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Unique trip per organization prevents double-invoicing
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_trips_unique
  ON invoice_trips (organization_id, trip_id);

-- ============================================================
-- 6. INDEXES FOR FOREIGN KEY LOOKUPS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_indents_quotation ON indents (quotation_id) WHERE quotation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_indent ON trips (indent_id) WHERE indent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trips_quotation ON trips (quotation_id) WHERE quotation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lrs_trip ON lrs (trip_id);
CREATE INDEX IF NOT EXISTS idx_pods_trip ON pods (trip_id);
CREATE INDEX IF NOT EXISTS idx_settlements_trip ON driver_settlements (trip_id);
CREATE INDEX IF NOT EXISTS idx_settlements_driver ON driver_settlements (driver_id);
CREATE INDEX IF NOT EXISTS idx_invoice_trips_invoice ON invoice_trips (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_trips_trip ON invoice_trips (trip_id);

-- ============================================================
-- 7. ENABLE RLS ON NEW TABLES
-- ============================================================

ALTER TABLE lrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_trips ENABLE ROW LEVEL SECURITY;

-- Apply org-scoped policies
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['lrs', 'pods', 'driver_settlements', 'invoice_trips'])
  LOOP
    EXECUTE format('CREATE POLICY "org_read_%1$s" ON %1$I FOR SELECT USING (organization_id = get_user_organization_id())', tbl);
    EXECUTE format('CREATE POLICY "org_write_%1$s" ON %1$I FOR INSERT WITH CHECK (organization_id = get_user_organization_id())', tbl);
    EXECUTE format('CREATE POLICY "org_edit_%1$s" ON %1$I FOR UPDATE USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id())', tbl);
    EXECUTE format('CREATE POLICY "org_del_%1$s" ON %1$I FOR DELETE USING (organization_id = get_user_organization_id())', tbl);
  END LOOP;
END $$;

-- ============================================================
-- 8. CROSS-TENANT LINKAGE PREVENTION TRIGGERS
-- Ensures trip.indent_id references an indent in the SAME organization
-- ============================================================

CREATE OR REPLACE FUNCTION validate_same_org_linkage()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate indent belongs to same org
  IF NEW.indent_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM indents WHERE id = NEW.indent_id AND organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Cross-organization linkage denied: indent_id belongs to different organization';
    END IF;
  END IF;
  -- Validate quotation belongs to same org
  IF NEW.quotation_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM quotations WHERE id = NEW.quotation_id AND organization_id = NEW.organization_id) THEN
      RAISE EXCEPTION 'Cross-organization linkage denied: quotation_id belongs to different organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trips_validate_linkage ON trips;
CREATE TRIGGER trg_trips_validate_linkage
  BEFORE INSERT OR UPDATE ON trips
  FOR EACH ROW
  WHEN (NEW.indent_id IS NOT NULL OR NEW.quotation_id IS NOT NULL)
  EXECUTE FUNCTION validate_same_org_linkage();

-- ============================================================
-- DONE. Verify with:
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE column_name IN ('indent_id','quotation_id','enquiry_id','parent_quotation_id')
-- AND table_schema = 'public' ORDER BY table_name;
-- ============================================================
