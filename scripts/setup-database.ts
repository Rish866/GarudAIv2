/**
 * GARUD AI ERP - Supabase Database Setup Script
 * 
 * This script creates all required tables and seeds initial data
 * in your Supabase PostgreSQL instance using the service role key.
 * 
 * Usage: npx tsx scripts/setup-database.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('🚀 GARUD AI ERP - Database Setup Starting...');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log('');

  // Execute SQL via Supabase's rpc or direct REST API
  const sql = `
-- ============================================================
-- GARUD AI Enterprise ERP - Complete Database Schema
-- ============================================================

-- 1. Tenants Table (Multi-tenant core)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  client_logo_bg TEXT DEFAULT 'from-blue-600 to-indigo-600',
  total_trips INTEGER DEFAULT 0,
  fuel_saved_litres INTEGER DEFAULT 0,
  safety_score INTEGER DEFAULT 100,
  billing_due TEXT DEFAULT '₹0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  reg_number TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  speed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Stopped',
  route TEXT,
  cameras_active INTEGER DEFAULT 4,
  last_update TEXT,
  lat TEXT,
  lng TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Events Table (AI Safety Events)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  vehicle_reg TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'Warning',
  location TEXT,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create permissive policies (for sandbox/demo - tighten for production)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read/write to tenants in sandbox') THEN
    CREATE POLICY "Allow public read/write to tenants in sandbox" ON tenants FOR ALL USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read/write to users in sandbox') THEN
    CREATE POLICY "Allow public read/write to users in sandbox" ON users FOR ALL USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read/write to vehicles in sandbox') THEN
    CREATE POLICY "Allow public read/write to vehicles in sandbox" ON vehicles FOR ALL USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read/write to events in sandbox') THEN
    CREATE POLICY "Allow public read/write to events in sandbox" ON events FOR ALL USING (true);
  END IF;
END $$;
`;

  const seedSql = `
-- Seed Initial Demo Data
INSERT INTO tenants (id, name, domain, industry, client_logo_bg, total_trips, fuel_saved_litres, safety_score, billing_due)
VALUES 
('tenant-balaji', 'Shree Balaji Logistics', 'balaji.garud.ai', 'Trailer & Container', 'from-blue-600 to-indigo-600', 480, 14200, 94, '₹48,200'),
('tenant-hindustan', 'Hindustan Tipper & Mining Corp', 'hindustan.garud.ai', 'Hywa & Tipper', 'from-amber-600 to-orange-600', 1150, 8900, 82, '₹32,500'),
('tenant-polar', 'Polar Cold Chain Reefer Fleets', 'polar.garud.ai', 'Cold Chain', 'from-cyan-600 to-teal-500', 210, 4100, 97, '₹18,900')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password, name, role)
VALUES
('user-balaji-1', 'tenant-balaji', 'admin@balaji.com', 'balaji123', 'Rajesh Kumar (Fleet Admin)', 'admin'),
('user-hindustan-1', 'tenant-hindustan', 'admin@hindustan.com', 'hindustan123', 'Birendra Mahto (Mine Supt)', 'admin'),
('user-polar-1', 'tenant-polar', 'admin@polar.com', 'polar123', 'Kumar Swamy (Cold Chain Exec)', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO vehicles (id, tenant_id, reg_number, driver_name, speed, status, route, cameras_active, last_update, lat, lng)
VALUES
('balaji-v1', 'tenant-balaji', 'HR-55-AJ-9021', 'Rajesh Kumar', 68, 'Moving', 'Delhi Cargo Terminal → Mumbai Nhava Sheva', 4, 'Just now', '28.6139° N', '77.2090° E'),
('balaji-v2', 'tenant-balaji', 'MH-43-QQ-1102', 'Satish Yadav', 0, 'Stopped', 'Pune Industrial Area → Hyderabad Hub', 4, '2 mins ago', '18.5204° N', '73.8567° E'),
('balaji-v3', 'tenant-balaji', 'GJ-12-BY-8843', 'Gurpreet Singh', 82, 'Alert', 'Ahmedabad Port → Jaipur Bypass Road', 4, '10 sec ago', '23.0225° N', '72.5714° E'),
('hindustan-v1', 'tenant-hindustan', 'JH-02-ZZ-8822', 'Birendra Mahto', 28, 'Moving', 'Dhanbad Quarry Pit 4 → Thermal Power Plant Coal Silo', 3, 'Just now', '23.7957° N', '86.4304° E'),
('hindustan-v2', 'tenant-hindustan', 'JH-09-AA-5561', 'Suraj Hansda', 0, 'Idle', 'Quarry Entry Weighbridge Gate 2', 3, '1 min ago', '23.7990° N', '86.4350° E'),
('polar-v1', 'tenant-polar', 'KA-51-MM-4491', 'Kumar Swamy', 55, 'Moving', 'Amul Dairy Anand → Bengaluru Ice Cream Depot 2', 4, 'Just now', '12.9716° N', '77.5946° E')
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, tenant_id, timestamp, vehicle_reg, type, description, severity, location, checked)
VALUES
('balaji-e1', 'tenant-balaji', '14:28:10', 'GJ-12-BY-8843', 'DSM (Driver Behavior)', 'Driver fatigue sequence alert - Micro-sleep pattern flagged', 'Critical', 'NH-48 Near Udaipur Bypass', false),
('balaji-e2', 'tenant-balaji', '14:15:44', 'HR-55-AJ-9021', 'ADAS (Road Safety)', 'Forward Collision Warning - Sudden pedestrian crossing', 'Warning', 'Kolar Highway Hub', true),
('hindustan-e1', 'tenant-hindustan', '13:50:11', 'JH-02-ZZ-8822', 'Overspeeding', 'Internal Mine Road Speed Limit Exceeded (38 km/h in 20 km/h zone)', 'Warning', 'Dhanbad Mine Descent Ramp B', false),
('polar-e1', 'tenant-polar', '14:02:15', 'KA-51-MM-4491', 'Reefer Sensor Anomaly', 'Chamber Temperature spiked from -18°C to -11°C (Compressor Defrost Warning)', 'Caution', 'NH-4 Bengaluru Outer Ring Road', false)
ON CONFLICT (id) DO NOTHING;
`;

  try {
    // Execute schema creation
    console.log('📋 Step 1: Creating tables and RLS policies...');
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (schemaError) {
      // If the rpc doesn't exist, try using the REST SQL endpoint directly
      console.log('⚠️  rpc exec_sql not available, attempting direct table operations...');
      
      // Try to verify tables exist by querying them
      const { error: testError } = await supabase.from('tenants').select('id').limit(1);
      
      if (testError && testError.code === '42P01') {
        console.log('');
        console.log('⚠️  Tables do not exist yet. Please run the following SQL in your Supabase SQL Editor:');
        console.log('    https://supabase.com/dashboard/project/emcynvexbauhohpwcqaw/sql/new');
        console.log('');
        console.log('─'.repeat(70));
        console.log(sql);
        console.log('─'.repeat(70));
        console.log('');
        console.log('After creating tables, run this script again to seed data.');
        return;
      } else if (!testError) {
        console.log('✅ Tables already exist! Proceeding to seed data...');
      } else {
        console.log(`⚠️  Connection test result: ${testError.message}`);
      }
    } else {
      console.log('✅ Schema created successfully!');
    }

    // Seed data using Supabase client API (more reliable than raw SQL)
    console.log('');
    console.log('📋 Step 2: Seeding demo data...');

    // Seed tenants
    const { error: tenantErr } = await supabase.from('tenants').upsert([
      { id: 'tenant-balaji', name: 'Shree Balaji Logistics', domain: 'balaji.garud.ai', industry: 'Trailer & Container', client_logo_bg: 'from-blue-600 to-indigo-600', total_trips: 480, fuel_saved_litres: 14200, safety_score: 94, billing_due: '₹48,200' },
      { id: 'tenant-hindustan', name: 'Hindustan Tipper & Mining Corp', domain: 'hindustan.garud.ai', industry: 'Hywa & Tipper', client_logo_bg: 'from-amber-600 to-orange-600', total_trips: 1150, fuel_saved_litres: 8900, safety_score: 82, billing_due: '₹32,500' },
      { id: 'tenant-polar', name: 'Polar Cold Chain Reefer Fleets', domain: 'polar.garud.ai', industry: 'Cold Chain', client_logo_bg: 'from-cyan-600 to-teal-500', total_trips: 210, fuel_saved_litres: 4100, safety_score: 97, billing_due: '₹18,900' }
    ], { onConflict: 'id' });

    if (tenantErr) {
      console.log(`  ⚠️  Tenants: ${tenantErr.message}`);
    } else {
      console.log('  ✅ Tenants seeded (3 demo companies)');
    }

    // Seed users
    const { error: userErr } = await supabase.from('users').upsert([
      { id: 'user-balaji-1', tenant_id: 'tenant-balaji', email: 'admin@balaji.com', password: 'balaji123', name: 'Rajesh Kumar (Fleet Admin)', role: 'admin' },
      { id: 'user-hindustan-1', tenant_id: 'tenant-hindustan', email: 'admin@hindustan.com', password: 'hindustan123', name: 'Birendra Mahto (Mine Supt)', role: 'admin' },
      { id: 'user-polar-1', tenant_id: 'tenant-polar', email: 'admin@polar.com', password: 'polar123', name: 'Kumar Swamy (Cold Chain Exec)', role: 'admin' }
    ], { onConflict: 'id' });

    if (userErr) {
      console.log(`  ⚠️  Users: ${userErr.message}`);
    } else {
      console.log('  ✅ Users seeded (3 admin accounts)');
    }

    // Seed vehicles
    const { error: vehErr } = await supabase.from('vehicles').upsert([
      { id: 'balaji-v1', tenant_id: 'tenant-balaji', reg_number: 'HR-55-AJ-9021', driver_name: 'Rajesh Kumar', speed: 68, status: 'Moving', route: 'Delhi Cargo Terminal → Mumbai Nhava Sheva', cameras_active: 4, last_update: 'Just now', lat: '28.6139° N', lng: '77.2090° E' },
      { id: 'balaji-v2', tenant_id: 'tenant-balaji', reg_number: 'MH-43-QQ-1102', driver_name: 'Satish Yadav', speed: 0, status: 'Stopped', route: 'Pune Industrial Area → Hyderabad Hub', cameras_active: 4, last_update: '2 mins ago', lat: '18.5204° N', lng: '73.8567° E' },
      { id: 'balaji-v3', tenant_id: 'tenant-balaji', reg_number: 'GJ-12-BY-8843', driver_name: 'Gurpreet Singh', speed: 82, status: 'Alert', route: 'Ahmedabad Port → Jaipur Bypass Road', cameras_active: 4, last_update: '10 sec ago', lat: '23.0225° N', lng: '72.5714° E' },
      { id: 'hindustan-v1', tenant_id: 'tenant-hindustan', reg_number: 'JH-02-ZZ-8822', driver_name: 'Birendra Mahto', speed: 28, status: 'Moving', route: 'Dhanbad Quarry Pit 4 → Thermal Power Plant Coal Silo', cameras_active: 3, last_update: 'Just now', lat: '23.7957° N', lng: '86.4304° E' },
      { id: 'hindustan-v2', tenant_id: 'tenant-hindustan', reg_number: 'JH-09-AA-5561', driver_name: 'Suraj Hansda', speed: 0, status: 'Idle', route: 'Quarry Entry Weighbridge Gate 2', cameras_active: 3, last_update: '1 min ago', lat: '23.7990° N', lng: '86.4350° E' },
      { id: 'polar-v1', tenant_id: 'tenant-polar', reg_number: 'KA-51-MM-4491', driver_name: 'Kumar Swamy', speed: 55, status: 'Moving', route: 'Amul Dairy Anand → Bengaluru Ice Cream Depot 2', cameras_active: 4, last_update: 'Just now', lat: '12.9716° N', lng: '77.5946° E' }
    ], { onConflict: 'id' });

    if (vehErr) {
      console.log(`  ⚠️  Vehicles: ${vehErr.message}`);
    } else {
      console.log('  ✅ Vehicles seeded (6 fleet vehicles)');
    }

    // Seed events
    const { error: evtErr } = await supabase.from('events').upsert([
      { id: 'balaji-e1', tenant_id: 'tenant-balaji', timestamp: '14:28:10', vehicle_reg: 'GJ-12-BY-8843', type: 'DSM (Driver Behavior)', description: 'Driver fatigue sequence alert - Micro-sleep pattern flagged', severity: 'Critical', location: 'NH-48 Near Udaipur Bypass', checked: false },
      { id: 'balaji-e2', tenant_id: 'tenant-balaji', timestamp: '14:15:44', vehicle_reg: 'HR-55-AJ-9021', type: 'ADAS (Road Safety)', description: 'Forward Collision Warning - Sudden pedestrian crossing', severity: 'Warning', location: 'Kolar Highway Hub', checked: true },
      { id: 'hindustan-e1', tenant_id: 'tenant-hindustan', timestamp: '13:50:11', vehicle_reg: 'JH-02-ZZ-8822', type: 'Overspeeding', description: 'Internal Mine Road Speed Limit Exceeded (38 km/h in 20 km/h zone)', severity: 'Warning', location: 'Dhanbad Mine Descent Ramp B', checked: false },
      { id: 'polar-e1', tenant_id: 'tenant-polar', timestamp: '14:02:15', vehicle_reg: 'KA-51-MM-4491', type: 'Reefer Sensor Anomaly', description: 'Chamber Temperature spiked from -18°C to -11°C (Compressor Defrost Warning)', severity: 'Caution', location: 'NH-4 Bengaluru Outer Ring Road', checked: false }
    ], { onConflict: 'id' });

    if (evtErr) {
      console.log(`  ⚠️  Events: ${evtErr.message}`);
    } else {
      console.log('  ✅ Events seeded (4 AI safety events)');
    }

    console.log('');
    console.log('═'.repeat(70));
    console.log('🎉 GARUD AI ERP Database Setup Complete!');
    console.log('═'.repeat(70));
    console.log('');
    console.log('📌 Demo Login Credentials:');
    console.log('   ┌──────────────────────────────────────────────────────────┐');
    console.log('   │ Superuser:  rishkatiyar1@gmail.com / 123456789           │');
    console.log('   │ Demo Admin: admin@garud.ai / garud123                    │');
    console.log('   │ Balaji:     admin@balaji.com / balaji123                 │');
    console.log('   │ Hindustan:  admin@hindustan.com / hindustan123           │');
    console.log('   │ Polar:      admin@polar.com / polar123                   │');
    console.log('   └──────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('🔧 To start the application:');
    console.log('   npm run dev');
    console.log('');

  } catch (error: any) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('💡 If tables do not exist, paste the SQL schema from');
    console.log('   src/supabaseClient.ts (SQL_SCHEMA export) into your Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/emcynvexbauhohpwcqaw/sql/new');
  }
}

setupDatabase();
