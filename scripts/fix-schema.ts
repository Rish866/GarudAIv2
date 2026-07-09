import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function fixSchema() {
  console.log('🔧 Fixing database schema to match application requirements...');
  console.log(`📡 URL: ${SUPABASE_URL}`);
  console.log('');
  
  // Use the Supabase SQL API endpoint (pg-meta)
  const fullSql = `
-- Drop existing tables that have wrong schema
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Create tenants with correct schema
CREATE TABLE tenants (
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

-- Create users with correct schema
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create vehicles with correct schema
CREATE TABLE vehicles (
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

-- Create events table
CREATE TABLE events (
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

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for sandbox
CREATE POLICY "Allow all on tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);

-- Seed demo tenants
INSERT INTO tenants (id, name, domain, industry, client_logo_bg, total_trips, fuel_saved_litres, safety_score, billing_due)
VALUES 
('tenant-balaji', 'Shree Balaji Logistics', 'balaji.garud.ai', 'Trailer & Container', 'from-blue-600 to-indigo-600', 480, 14200, 94, '₹48,200'),
('tenant-hindustan', 'Hindustan Tipper & Mining Corp', 'hindustan.garud.ai', 'Hywa & Tipper', 'from-amber-600 to-orange-600', 1150, 8900, 82, '₹32,500'),
('tenant-polar', 'Polar Cold Chain Reefer Fleets', 'polar.garud.ai', 'Cold Chain', 'from-cyan-600 to-teal-500', 210, 4100, 97, '₹18,900');

-- Seed demo users
INSERT INTO users (id, tenant_id, email, password, name, role)
VALUES
('user-balaji-1', 'tenant-balaji', 'admin@balaji.com', 'balaji123', 'Rajesh Kumar (Fleet Admin)', 'admin'),
('user-hindustan-1', 'tenant-hindustan', 'admin@hindustan.com', 'hindustan123', 'Birendra Mahto (Mine Supt)', 'admin'),
('user-polar-1', 'tenant-polar', 'admin@polar.com', 'polar123', 'Kumar Swamy (Cold Chain Exec)', 'admin');

-- Seed demo vehicles
INSERT INTO vehicles (id, tenant_id, reg_number, driver_name, speed, status, route, cameras_active, last_update, lat, lng)
VALUES
('balaji-v1', 'tenant-balaji', 'HR-55-AJ-9021', 'Rajesh Kumar', 68, 'Moving', 'Delhi Cargo Terminal → Mumbai Nhava Sheva', 4, 'Just now', '28.6139° N', '77.2090° E'),
('balaji-v2', 'tenant-balaji', 'MH-43-QQ-1102', 'Satish Yadav', 0, 'Stopped', 'Pune Industrial Area → Hyderabad Hub', 4, '2 mins ago', '18.5204° N', '73.8567° E'),
('balaji-v3', 'tenant-balaji', 'GJ-12-BY-8843', 'Gurpreet Singh', 82, 'Alert', 'Ahmedabad Port → Jaipur Bypass Road', 4, '10 sec ago', '23.0225° N', '72.5714° E'),
('hindustan-v1', 'tenant-hindustan', 'JH-02-ZZ-8822', 'Birendra Mahto', 28, 'Moving', 'Dhanbad Quarry Pit 4 → Thermal Power Plant Coal Silo', 3, 'Just now', '23.7957° N', '86.4304° E'),
('hindustan-v2', 'tenant-hindustan', 'JH-09-AA-5561', 'Suraj Hansda', 0, 'Idle', 'Quarry Entry Weighbridge Gate 2', 3, '1 min ago', '23.7990° N', '86.4350° E'),
('polar-v1', 'tenant-polar', 'KA-51-MM-4491', 'Kumar Swamy', 55, 'Moving', 'Amul Dairy Anand → Bengaluru Ice Cream Depot 2', 4, 'Just now', '12.9716° N', '77.5946° E');

-- Seed demo events
INSERT INTO events (id, tenant_id, timestamp, vehicle_reg, type, description, severity, location, checked)
VALUES
('balaji-e1', 'tenant-balaji', '14:28:10', 'GJ-12-BY-8843', 'DSM (Driver Behavior)', 'Driver fatigue sequence alert - Micro-sleep pattern flagged', 'Critical', 'NH-48 Near Udaipur Bypass', false),
('balaji-e2', 'tenant-balaji', '14:15:44', 'HR-55-AJ-9021', 'ADAS (Road Safety)', 'Forward Collision Warning - Sudden pedestrian crossing', 'Warning', 'Kolar Highway Hub', true),
('hindustan-e1', 'tenant-hindustan', '13:50:11', 'JH-02-ZZ-8822', 'Overspeeding', 'Internal Mine Road Speed Limit Exceeded (38 km/h in 20 km/h zone)', 'Warning', 'Dhanbad Mine Descent Ramp B', false),
('polar-e1', 'tenant-polar', '14:02:15', 'KA-51-MM-4491', 'Reefer Sensor Anomaly', 'Chamber Temperature spiked from -18C to -11C (Compressor Defrost Warning)', 'Caution', 'NH-4 Bengaluru Outer Ring Road', false);
`;

  // Try using the Supabase pg-meta SQL execution endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({})
  });
  
  // The standard way to run raw SQL on Supabase is via the SQL endpoint at /pg
  // But that requires the dashboard. Instead, let's use supabase-js workaround.
  
  // Alternative: Use the supabase client to call individual operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  });

  // Since we can't run DDL directly, let's output the SQL for the user 
  // and instead seed data into whatever schema exists.
  // First check what tables/columns actually exist now
  
  console.log('📋 Checking current database state...');
  
  const { data: tData, error: tErr } = await supabase.from('tenants').select('*').limit(0);
  if (tErr) {
    console.log(`  Tenants table: ${tErr.message}`);
  } else {
    console.log('  ✅ Tenants table accessible');
  }

  const { data: uData, error: uErr } = await supabase.from('users').select('*').limit(0);
  if (uErr) {
    console.log(`  Users table: ${uErr.message}`);
  } else {
    console.log('  ✅ Users table accessible');
  }

  const { data: vData, error: vErr } = await supabase.from('vehicles').select('*').limit(0);
  if (vErr) {
    console.log(`  Vehicles table: ${vErr.message}`);
  } else {
    console.log('  ✅ Vehicles table accessible');
  }

  const { data: eData, error: eErr } = await supabase.from('events').select('*').limit(0);
  if (eErr) {
    console.log(`  Events table: ${eErr.code} - ${eErr.message}`);
  } else {
    console.log('  ✅ Events table accessible');
  }

  console.log('');
  console.log('═'.repeat(70));
  console.log('📌 IMPORTANT: Run the following SQL in your Supabase SQL Editor to fix the schema:');
  console.log('   URL: https://supabase.com/dashboard/project/emcynvexbauhohpwcqaw/sql/new');
  console.log('═'.repeat(70));
  console.log('');
  console.log(fullSql);
  console.log('');
  console.log('═'.repeat(70));
  console.log('After running the SQL above, the application will be fully functional!');
  console.log('═'.repeat(70));
}

fixSchema();
