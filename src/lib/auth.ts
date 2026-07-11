// Authentication & Multi-Tenant System for Garud AI ERP
// Uses Supabase Auth (bcrypt hashed passwords, JWT sessions)
// NO hardcoded passwords in source code

import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  company_name: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'operations' | 'fleet_manager' | 'accounts' | 'driver';
  tenant_id: string;
}

export interface Tenant {
  id: string;
  company_name: string;
  owner_email: string;
  created_at: string;
  status: 'active' | 'trial' | 'suspended';
}

// Platform admin email from environment variable (not hardcoded)
const PLATFORM_ADMIN_EMAIL = import.meta.env.VITE_PLATFORM_ADMIN_EMAIL || '';

// ========== SUPABASE AUTH FUNCTIONS ==========

/**
 * Sign up a new user with Supabase Auth (password hashed server-side by Supabase)
 */
export async function signUp(data: {
  email: string;
  password: string;
  name: string;
  company_name: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Create user in Supabase Auth (password hashed with bcrypt on server)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
          company_name: data.company_name,
          phone: data.phone,
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Registration failed. Please try again.' };
    }

    // 2. Create tenant record
    const tenantId = 'tenant_' + authData.user.id.slice(0, 12);
    await supabase.from('tenants').upsert({
      id: tenantId,
      name: data.company_name,
      domain: data.email.split('@')[1],
      industry: 'Logistics & Freight',
      total_trips: 0,
      safety_score: 0,
      billing_due: '₹0',
    });

    // 3. Create user profile in users table
    await supabase.from('users').upsert({
      id: authData.user.id,
      tenant_id: tenantId,
      name: data.name,
      email: data.email,
      role: 'super_admin',
      phone: data.phone,
      status: 'active',
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

/**
 * Sign in with Supabase Auth (server validates password hash)
 */
export async function signIn(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Provide user-friendly error messages
      if (error.message.includes('Invalid login')) {
        return { success: false, error: 'Invalid email or password. Please check and try again.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login failed. Please try again.' };
    }

    // Get user profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
      company_name: profile?.company_name || data.user.user_metadata?.company_name || 'My Company',
      phone: profile?.phone || data.user.user_metadata?.phone || '',
      role: profile?.role || 'super_admin',
      tenant_id: profile?.tenant_id || 'tenant_' + data.user.id.slice(0, 12),
    };

    return { success: true, user };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error. Please check your connection.' };
  }
}

/**
 * Sign out — clears Supabase session
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current Supabase Auth session
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: profile?.name || session.user.user_metadata?.name || '',
      company_name: profile?.company_name || session.user.user_metadata?.company_name || '',
      phone: profile?.phone || '',
      role: profile?.role || 'super_admin',
      tenant_id: profile?.tenant_id || 'tenant_' + session.user.id.slice(0, 12),
    };
  } catch {
    return null;
  }
}

// ========== PLATFORM ADMIN FUNCTIONS ==========

export function isPlatformAdmin(email: string): boolean {
  return email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase();
}

export async function getAllTenants(): Promise<Tenant[]> {
  const { data } = await supabase.from('tenants').select('*');
  return (data || []).map(t => ({
    id: t.id,
    company_name: t.name || t.company_name || 'Unknown',
    owner_email: t.domain || '',
    created_at: t.created_at || '',
    status: 'active' as const,
  }));
}

export function getAllUsers(): { email: string; tenant_id: string; name: string }[] {
  // For session validation — returns from Supabase Auth
  // In production this should be an async call, but for backward compatibility with existing code:
  return [];
}

export function switchTenant(tenantId: string): void {
  localStorage.setItem('garud_current_tenant', tenantId);
}

export function getCurrentTenantId(): string {
  return localStorage.getItem('garud_current_tenant') || '';
}

export function getStorageKeyForTenant(tenantId: string): string {
  return `garud-erp-${tenantId}`;
}
