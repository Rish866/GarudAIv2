// Supabase Client & Sync Layer for Garud AI Transport ERP
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://emcynvexbauhohpwcqaw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MQxqdtD5HRHHsIxhmIjHrQ_XS4jyXWh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TENANT_ID = 'garud-erp-001';

// ============================================================
// AUTH
// ============================================================

export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('tenant_id', TENANT_ID)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'User not found. Check your email or contact admin.' };
      }
      return { success: false, error: error.message };
    }

    if (data && data.password === password) {
      return {
        success: true,
        user: { id: data.id, email: data.email, name: data.name, role: data.role, tenant_id: data.tenant_id }
      };
    }

    return { success: false, error: 'Incorrect password.' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Connection error' };
  }
}

// ============================================================
// VEHICLE SYNC (Supabase ↔ App)
// ============================================================

export async function fetchVehiclesFromSupabase() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('tenant_id', TENANT_ID);
  
  if (error) {
    console.warn('Failed to fetch vehicles from Supabase:', error.message);
    return null;
  }
  return data;
}

export async function syncVehicleToSupabase(vehicle: {
  id: string;
  reg_number: string;
  driver_name?: string;
  speed?: number;
  status: string;
  last_location?: string;
  lat?: number;
  lng?: number;
}) {
  const { error } = await supabase.from('vehicles').upsert({
    id: vehicle.id,
    tenant_id: TENANT_ID,
    reg_number: vehicle.reg_number,
    driver_name: vehicle.driver_name || 'Unassigned',
    speed: vehicle.speed || 0,
    status: vehicle.status === 'on_trip' ? 'Moving' : vehicle.status === 'available' ? 'Stopped' : vehicle.status,
    route: vehicle.last_location || '',
    cameras_active: 4,
    last_update: 'Just now',
    lat: vehicle.lat ? String(vehicle.lat) : null,
    lng: vehicle.lng ? String(vehicle.lng) : null,
  });

  if (error) {
    console.warn('Failed to sync vehicle to Supabase:', error.message);
  }
}

export async function syncAllVehiclesToSupabase(vehicles: Array<{
  id: string;
  reg_number: string;
  driver_name?: string;
  speed?: number;
  status: string;
  last_location?: string;
  lat?: number;
  lng?: number;
}>) {
  const records = vehicles.map(v => ({
    id: v.id,
    tenant_id: TENANT_ID,
    reg_number: v.reg_number,
    driver_name: v.driver_name || 'Unassigned',
    speed: v.speed || 0,
    status: v.status === 'on_trip' ? 'Moving' : v.status === 'available' ? 'Stopped' : v.status,
    route: v.last_location || '',
    cameras_active: 4,
    last_update: new Date().toISOString(),
    lat: v.lat ? String(v.lat) : null,
    lng: v.lng ? String(v.lng) : null,
  }));

  const { error } = await supabase.from('vehicles').upsert(records);
  if (error) {
    console.warn('Failed to bulk sync vehicles:', error.message);
    return false;
  }
  return true;
}

// ============================================================
// EVENTS / ALERTS SYNC
// ============================================================

export async function syncAlertToSupabase(alert: {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
}) {
  const { error } = await supabase.from('events').upsert({
    id: alert.id,
    tenant_id: TENANT_ID,
    timestamp: new Date().toTimeString().split(' ')[0],
    vehicle_reg: 'System',
    type: alert.type,
    description: `${alert.title}: ${alert.description}`,
    severity: alert.severity === 'critical' ? 'Critical' : alert.severity === 'warning' ? 'Warning' : 'Caution',
    location: 'System',
    checked: false,
  });

  if (error) {
    console.warn('Failed to sync alert to Supabase:', error.message);
  }
}

export async function fetchAlertsFromSupabase() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (error) {
    console.warn('Failed to fetch alerts from Supabase:', error.message);
    return null;
  }
  return data;
}

// ============================================================
// TENANT INFO
// ============================================================

export async function updateTenantStats(stats: {
  total_trips: number;
  safety_score: number;
  billing_due: string;
}) {
  const { error } = await supabase.from('tenants').update({
    total_trips: stats.total_trips,
    safety_score: stats.safety_score,
    billing_due: stats.billing_due,
  }).eq('id', TENANT_ID);

  if (error) {
    console.warn('Failed to update tenant stats:', error.message);
  }
}

// ============================================================
// CONNECTION TEST
// ============================================================

export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('tenants').select('id, name').eq('id', TENANT_ID).single();
    if (error) {
      return { connected: false, message: `Error: ${error.message}` };
    }
    return { connected: true, message: `Connected to: ${data.name}` };
  } catch (e: any) {
    return { connected: false, message: e.message };
  }
}

// ============================================================
// INITIAL SYNC (call on app load)
// ============================================================

export async function performInitialSync(vehicles: Array<any>, alerts: Array<any>, tripCount: number, outstandingAmount: string) {
  console.log('🔄 Syncing data to Supabase...');
  
  // Ensure tenant exists
  await supabase.from('tenants').upsert({
    id: TENANT_ID,
    name: 'Garud Transport Pvt Ltd',
    domain: 'garud.ai',
    industry: 'Logistics & Freight',
    total_trips: tripCount,
    safety_score: 92,
    billing_due: outstandingAmount,
  });

  // Sync vehicles
  await syncAllVehiclesToSupabase(vehicles);

  // Sync recent alerts
  for (const alert of alerts.slice(0, 5)) {
    await syncAlertToSupabase(alert);
  }

  console.log('✅ Supabase sync complete');
}
