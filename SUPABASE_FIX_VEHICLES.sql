-- Run this in Supabase SQL Editor to fix the Fleet sync error
-- Error: "Could not find the 'branch_id' column of 'vehicles' in the schema cache"

-- Add missing columns to existing vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'truck';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS make TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ownership_type TEXT DEFAULT 'owned';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS capacity_tons NUMERIC DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fitness_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS puc_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS permit_expiry DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_id TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS odometer INTEGER DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS last_gps_update TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ignition BOOLEAN DEFAULT FALSE;

-- Done! The Fleet module will now sync without errors.
