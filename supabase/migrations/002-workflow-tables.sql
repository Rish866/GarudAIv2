-- ============================================================
-- MIGRATION 002: Workflow Entity Tables
-- LR, POD, Driver Settlements, Invoice-Trips, Document Sequences
-- All tables have secure RLS policies included.
-- ============================================================

-- ============================================================
-- LR (LORRY RECEIPT / CONSIGNMENT NOTE)
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_lrs_unique_number
  ON lrs (organization_id, lr_number);
CREATE INDEX IF NOT EXISTS idx_lrs_trip ON lrs (trip_id);


-- ============================================================
-- POD (PROOF OF DELIVERY)
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
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'verified', 'rejected', 'waived')),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_pods_active_trip
  ON pods (organization_id, trip_id) WHERE status IN ('uploaded', 'verified', 'waived');
CREATE INDEX IF NOT EXISTS idx_pods_trip ON pods (trip_id);

-- ============================================================
-- DRIVER SETTLEMENTS
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
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'settled', 'reversed')),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_active_trip
  ON driver_settlements (organization_id, trip_id) WHERE status NOT IN ('reversed');
CREATE INDEX IF NOT EXISTS idx_settlements_trip ON driver_settlements (trip_id);
CREATE INDEX IF NOT EXISTS idx_settlements_driver ON driver_settlements (driver_id);


-- ============================================================
-- INVOICE-TRIPS JUNCTION (Idempotent Billing)
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
CREATE INDEX IF NOT EXISTS idx_invoice_trips_invoice ON invoice_trips (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_trips_trip ON invoice_trips (trip_id);

-- ============================================================
-- TRIP STATUS HISTORY (Audit)
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  trip_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_history_trip ON trip_status_history (trip_id);

-- ============================================================
-- DOCUMENT SEQUENCES (Concurrency-Safe Numbering)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  branch_id UUID,
  document_type TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  prefix TEXT NOT NULL DEFAULT '',
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, branch_id, document_type, financial_year)
);

-- ============================================================
-- RLS ON ALL WORKFLOW TABLES
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  workflow_tables TEXT[] := ARRAY[
    'lrs', 'pods', 'driver_settlements', 'invoice_trips',
    'trip_status_history', 'document_sequences'
  ];
BEGIN
  FOREACH tbl IN ARRAY workflow_tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format(
      'CREATE POLICY "org_read_%1$s" ON %1$I FOR SELECT USING (organization_id = get_user_organization_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "org_write_%1$s" ON %1$I FOR INSERT WITH CHECK (organization_id = get_user_organization_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "org_edit_%1$s" ON %1$I FOR UPDATE USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "org_del_%1$s" ON %1$I FOR DELETE USING (organization_id = get_user_organization_id())',
      tbl
    );

    -- Immutable organization_id
    EXECUTE format(
      'CREATE TRIGGER trg_immutable_org_id_%1$s BEFORE UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION enforce_immutable_organization_id()',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- GENERATE LR RPC (Transaction-Safe, Concurrency-Safe)
-- ============================================================

CREATE OR REPLACE FUNCTION generate_lr_for_trip(
  p_organization_id UUID,
  p_branch_id UUID DEFAULT NULL,
  p_trip_id UUID DEFAULT NULL,
  p_consignor_name TEXT DEFAULT NULL,
  p_consignee_name TEXT DEFAULT NULL,
  p_material TEXT DEFAULT NULL,
  p_package_count INTEGER DEFAULT 0,
  p_declared_weight NUMERIC DEFAULT 0,
  p_eway_bill_number TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
  v_next_number INTEGER;
  v_lr_number TEXT;
  v_fy TEXT;
  v_branch_code TEXT;
  v_lr RECORD;
BEGIN
  -- Validate organization membership
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization access denied');
  END IF;

  -- Idempotent: return existing LR if already generated
  SELECT * INTO v_existing FROM lrs
  WHERE organization_id = p_organization_id AND trip_id = p_trip_id LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'lr_id', v_existing.id, 'lr_number', v_existing.lr_number, 'is_existing', true);
  END IF;

  -- Financial year (April-March)
  IF EXTRACT(MONTH FROM NOW()) >= 4 THEN
    v_fy := TO_CHAR(NOW(), 'YY') || '-' || TO_CHAR(NOW() + INTERVAL '1 year', 'YY');
  ELSE
    v_fy := TO_CHAR(NOW() - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(NOW(), 'YY');
  END IF;

  -- Branch code
  v_branch_code := '';
  IF p_branch_id IS NOT NULL THEN
    SELECT COALESCE(code, '') INTO v_branch_code FROM branches WHERE id = p_branch_id AND organization_id = p_organization_id;
  END IF;

  -- Advisory lock for sequence safety
  PERFORM pg_advisory_xact_lock(hashtext(p_organization_id::text || COALESCE(p_branch_id::text,'') || 'LR' || v_fy));

  INSERT INTO document_sequences (organization_id, branch_id, document_type, financial_year, prefix, last_number)
  VALUES (p_organization_id, p_branch_id, 'LR', v_fy, 'LR', 0)
  ON CONFLICT (organization_id, branch_id, document_type, financial_year) DO NOTHING;

  UPDATE document_sequences
  SET last_number = last_number + 1, updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND (branch_id = p_branch_id OR (branch_id IS NULL AND p_branch_id IS NULL))
    AND document_type = 'LR'
    AND financial_year = v_fy
  RETURNING last_number INTO v_next_number;

  -- Build LR number
  IF v_branch_code != '' THEN
    v_lr_number := 'LR-' || v_branch_code || '-' || v_fy || '-' || LPAD(v_next_number::text, 6, '0');
  ELSE
    v_lr_number := 'LR-' || v_fy || '-' || LPAD(v_next_number::text, 6, '0');
  END IF;

  -- Create LR
  INSERT INTO lrs (organization_id, branch_id, trip_id, lr_number, consignor_name, consignee_name, material, package_count, declared_weight, eway_bill_number, status, generated_at)
  VALUES (p_organization_id, p_branch_id, p_trip_id, v_lr_number, p_consignor_name, p_consignee_name, p_material, p_package_count, p_declared_weight, p_eway_bill_number, 'active', NOW())
  RETURNING * INTO v_lr;

  -- Update trip.lr_number for compatibility
  IF p_trip_id IS NOT NULL THEN
    UPDATE trips SET lr_number = v_lr_number WHERE id = p_trip_id AND organization_id = p_organization_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'lr_id', v_lr.id, 'lr_number', v_lr_number, 'is_existing', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE: Workflow tables ready with full RLS.
-- ============================================================
