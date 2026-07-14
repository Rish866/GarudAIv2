// Authentication for Garud AI ERP
// Uses Supabase Auth (bcrypt hashed passwords, JWT sessions)
// Organization membership is resolved via OrganizationContext after login.
// This module handles ONLY authentication (sign in, sign up, sign out, session).

import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
}

// Platform admin email — the platform owner who can manage all organizations
const PLATFORM_ADMIN_EMAIL = import.meta.env.VITE_PLATFORM_ADMIN_EMAIL || '';

/**
 * Sign in with Supabase Auth (server validates password hash)
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('Signups not allowed')) {
        return { success: false, error: 'Email verification required. Check your inbox.' };
      }
      if (error.message.includes('Invalid login')) {
        return { success: false, error: 'Invalid email or password. Please check and try again.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login failed. Please try again.' };
    }

    // Get user profile from user_profiles table
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, phone')
      .eq('id', data.user.id)
      .single();

    // Get organization role from organization_members
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', data.user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: profile?.full_name || data.user.user_metadata?.full_name || data.user.user_metadata?.name || email.split('@')[0],
      phone: profile?.phone || data.user.user_metadata?.phone || '',
      role: membership?.role || 'viewer',
    };

    return { success: true, user };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Cannot connect to server.';
    return { success: false, error: message };
  }
}

/**
 * Sign out — clears Supabase session
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Request password reset email via Supabase Auth
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { success: false, error: message };
  }
}

/**
 * Update password (after reset token validation by Supabase)
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Network error';
    return { success: false, error: message };
  }
}

/**
 * Get current authenticated session user
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name, phone')
      .eq('id', session.user.id)
      .single();

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1)
      .single();

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: profile?.full_name || session.user.user_metadata?.full_name || '',
      phone: profile?.phone || '',
      role: membership?.role || 'viewer',
    };
  } catch {
    return null;
  }
}

/**
 * Check if the given email is the platform super admin
 */
export function isPlatformAdmin(email: string): boolean {
  if (!PLATFORM_ADMIN_EMAIL) return false;
  return email.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase();
}

/**
 * Get all organizations (platform admin only)
 */
export async function getAllOrganizations(): Promise<{ id: string; name: string; status: string; created_at: string }[]> {
  const { data } = await supabase.from('organizations').select('id, name, status, created_at');
  return data || [];
}
