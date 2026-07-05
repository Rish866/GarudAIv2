import { supabase } from './supabaseClient';

export interface DbTenant {
  id: string;
  name: string;
  domain: string;
  industry: 'Trailer & Container' | 'Hywa & Tipper' | 'Cold Chain' | 'School Bus & Staff' | 'Logistics';
  client_logo_bg: string;
  total_trips: number;
  fuel_saved_litres: number;
  safety_score: number;
  billing_due: string;
}

export interface DbUser {
  id: string;
  tenant_id: string;
  email: string;
  password?: string;
  name: string;
  role: string;
}

export interface DbVehicle {
  id: string;
  tenant_id: string;
  reg_number: string;
  driver_name: string;
  speed: number;
  status: 'Moving' | 'Stopped' | 'Idle' | 'Alert';
  route: string;
  cameras_active: number;
  last_update: string;
  lat: string;
  lng: string;
}

export interface DbEvent {
  id: string;
  tenant_id: string;
  timestamp: string;
  vehicle_reg: string;
  type: string;
  description: string;
  severity: 'Critical' | 'Warning' | 'Caution';
  location: string;
  checked: boolean;
}

export const supabaseService = {
  /**
   * Tests connection to Supabase and verifies if the schema tables exist.
   */
  async testConnection(): Promise<{ connected: boolean; needsSchema: boolean }> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);

      if (error) {
        console.warn('Supabase test connection warning:', error);
        // If error code is '42P01', it means relation/table does not exist
        if (error.code === '42P01') {
          return { connected: true, needsSchema: true };
        }
        return { connected: false, needsSchema: false };
      }
      return { connected: true, needsSchema: false };
    } catch (e) {
      console.error('Supabase test connection threw error:', e);
      return { connected: false, needsSchema: false };
    }
  },

  /**
   * Fetches all tenants
   */
  async getTenants(): Promise<DbTenant[]> {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  },

  /**
   * Fetches vehicles, optionally filtered by tenant_id
   */
  async getVehicles(tenantId?: string): Promise<DbVehicle[]> {
    let query = supabase.from('vehicles').select('*');
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Fetches events, optionally filtered by tenant_id
   */
  async getEvents(tenantId?: string): Promise<DbEvent[]> {
    let query = supabase.from('events').select('*').order('timestamp', { ascending: false });
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Registers or updates a tenant
   */
  async upsertTenant(tenant: DbTenant): Promise<DbTenant> {
    const { data, error } = await supabase
      .from('tenants')
      .upsert({
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
        industry: tenant.industry,
        client_logo_bg: tenant.client_logo_bg,
        total_trips: tenant.total_trips,
        fuel_saved_litres: tenant.fuel_saved_litres,
        safety_score: tenant.safety_score,
        billing_due: tenant.billing_due
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Creates a brand new tenant with an associated user and basic seed data
   */
  async createFullTenant(
    tenant: DbTenant, 
    user: DbUser, 
    seedVehicle: DbVehicle,
    seedEvent: DbEvent
  ): Promise<boolean> {
    try {
      // 1. Insert tenant
      await this.upsertTenant(tenant);

      // 2. Insert user
      const { error: userErr } = await supabase.from('users').insert({
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role
      });
      if (userErr) throw userErr;

      // 3. Insert seed vehicle
      const { error: vehErr } = await supabase.from('vehicles').insert({
        id: seedVehicle.id,
        tenant_id: seedVehicle.tenant_id,
        reg_number: seedVehicle.reg_number,
        driver_name: seedVehicle.driver_name,
        speed: seedVehicle.speed,
        status: seedVehicle.status,
        route: seedVehicle.route,
        cameras_active: seedVehicle.cameras_active,
        last_update: seedVehicle.last_update,
        lat: seedVehicle.lat,
        lng: seedVehicle.lng
      });
      if (vehErr) throw vehErr;

      // 4. Insert seed event
      const { error: evtErr } = await supabase.from('events').insert({
        id: seedEvent.id,
        tenant_id: seedEvent.tenant_id,
        timestamp: seedEvent.timestamp,
        vehicle_reg: seedEvent.vehicle_reg,
        type: seedEvent.type,
        description: seedEvent.description,
        severity: seedEvent.severity,
        location: seedEvent.location,
        checked: seedEvent.checked
      });
      if (evtErr) throw evtErr;

      return true;
    } catch (e) {
      console.error('Failed to create full tenant database rows:', e);
      throw e;
    }
  },

  /**
   * Inserts or updates a vehicle
   */
  async upsertVehicle(vehicle: DbVehicle): Promise<DbVehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .upsert({
        id: vehicle.id,
        tenant_id: vehicle.tenant_id,
        reg_number: vehicle.reg_number,
        driver_name: vehicle.driver_name,
        speed: vehicle.speed,
        status: vehicle.status,
        route: vehicle.route,
        cameras_active: vehicle.cameras_active,
        last_update: vehicle.last_update,
        lat: vehicle.lat,
        lng: vehicle.lng
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletes a vehicle
   */
  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Inserts or updates an event
   */
  async upsertEvent(event: DbEvent): Promise<DbEvent> {
    const { data, error } = await supabase
      .from('events')
      .upsert({
        id: event.id,
        tenant_id: event.tenant_id,
        timestamp: event.timestamp,
        vehicle_reg: event.vehicle_reg,
        type: event.type,
        description: event.description,
        severity: event.severity,
        location: event.location,
        checked: event.checked
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Validates custom credentials in user table (Sandbox secure auth demonstration)
   */
  async loginUser(email: string, password_input: string): Promise<{ success: boolean; user?: DbUser; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'User does not exist. Please check your credentials or register a new transporter.' };
        }
        return { success: false, error: error.message };
      }

      if (data && data.password === password_input) {
        return {
          success: true,
          user: {
            id: data.id,
            tenant_id: data.tenant_id,
            email: data.email,
            name: data.name,
            role: data.role
          }
        };
      }

      return { success: false, error: 'Incorrect password. Try again!' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Server connection error.' };
    }
  }
};
