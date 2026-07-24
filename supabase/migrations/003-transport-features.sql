-- ============================================================
-- MIGRATION 003: Transport Industry Features
-- Multi-point trips, detention policies, rate master
-- ============================================================

-- ============================================================
-- 1. TRIP STOPS (Multi-Point Trips)
-- ============================================================

CREATE TABLE IF NOT EXISTS trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  trip_id UUID NOT NULL,
  sequence INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('loading', 'unloading', 'transit_hub', 'fuel_stop', 'rest_stop')),
  location TEXT NOT NULL,
  address TEXT,
  lat NUMERIC,
  lng NUMERIC,
  distance_from_prev_km NUMERIC DEFAULT 0,
  planned_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'en_route', 'arrived', 'in_progress', 'completed', 'skipped')),
  material TEXT,
  weight_tons NUMERIC DEFAULT 0,
  packages INTEGER DEFAULT 0,
  contact_name TEXT,
  contact_phone TEXT,
  remarks TEXT,
  detention_hours NUMERIC DEFAULT 0,
  detention_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique sequence per trip
CREATE UNIQUE INDEX IF NOT EXISTS idx_trip_stops_sequence
  ON trip_stops (organization_id, trip_id, sequence);
CREATE INDEX IF NOT EXISTS idx_trip_stops_trip ON trip_stops (trip_id);


-- ============================================================
-- 2. DETENTION POLICIES (Per-Organization Configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS detention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  free_hours_loading NUMERIC DEFAULT 4,
  free_hours_unloading NUMERIC DEFAULT 4,
  hourly_rate NUMERIC DEFAULT 500,
  daily_rate NUMERIC DEFAULT 3000,
  mode TEXT DEFAULT 'slab' CHECK (mode IN ('hourly', 'daily', 'slab')),
  slabs JSONB DEFAULT '[
    {"from_hours": 0, "to_hours": 4, "rate_per_hour": 0},
    {"from_hours": 4, "to_hours": 12, "rate_per_hour": 500},
    {"from_hours": 12, "to_hours": 24, "rate_per_hour": 750},
    {"from_hours": 24, "to_hours": 9999, "rate_per_hour": 1000}
  ]',
  max_per_trip NUMERIC DEFAULT 50000,
  holiday_multiplier NUMERIC DEFAULT 1.5,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One default policy per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_detention_default
  ON detention_policies (organization_id) WHERE is_default = true;

-- ============================================================
-- 3. RATE RULES (Rate Master)
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  /** Which route/customer this applies to (null = all) */
  customer_id UUID,
  origin TEXT,
  destination TEXT,
  vehicle_type TEXT,
  material_type TEXT,
  /** Rate calculation type */
  rate_type TEXT NOT NULL CHECK (rate_type IN ('per_trip', 'per_ton', 'per_km', 'per_ton_km', 'slab_weight', 'slab_distance')),
  base_rate NUMERIC NOT NULL DEFAULT 0,
  minimum_charge NUMERIC DEFAULT 0,
  /** Weight/distance slabs as JSON */
  slabs JSONB DEFAULT '[]',
  /** Surcharges as JSON */
  surcharges JSONB DEFAULT '[]',
  /** Priority (higher = checked first for matching) */
  priority INTEGER DEFAULT 0,
  effective_from DATE,
  effective_to DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_rules_org ON rate_rules (organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_rules_route ON rate_rules (organization_id, origin, destination) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_rate_rules_customer ON rate_rules (organization_id, customer_id) WHERE customer_id IS NOT NULL;

-- ============================================================
-- 4. ADD MULTI-POINT FLAG TO TRIPS TABLE
-- ============================================================

DO $$ BEGIN
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_multi_point BOOLEAN DEFAULT false;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_stops INTEGER DEFAULT 0;
  ALTER TABLE trips ADD COLUMN IF NOT EXISTS completed_stops INTEGER DEFAULT 0;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

ALTER TABLE trip_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE detention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_rules ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
  new_tables TEXT[] := ARRAY['trip_stops', 'detention_policies', 'rate_rules'];
BEGIN
  FOREACH tbl IN ARRAY new_tables
  LOOP
    EXECUTE format('CREATE POLICY "org_read_%1$s" ON %1$I FOR SELECT USING (organization_id = get_user_organization_id())', tbl);
    EXECUTE format('CREATE POLICY "org_write_%1$s" ON %1$I FOR INSERT WITH CHECK (organization_id = get_user_organization_id())', tbl);
    EXECUTE format('CREATE POLICY "org_edit_%1$s" ON %1$I FOR UPDATE USING (organization_id = get_user_organization_id()) WITH CHECK (organization_id = get_user_organization_id())', tbl);
    EXECUTE format('CREATE POLICY "org_del_%1$s" ON %1$I FOR DELETE USING (organization_id = get_user_organization_id())', tbl);
    EXECUTE format('CREATE TRIGGER trg_immutable_org_id_%1$s BEFORE UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION enforce_immutable_organization_id()', tbl);
  END LOOP;
END $$;

-- ============================================================
-- DONE: Transport features schema ready.
-- ============================================================
