// Authentication helpers for Garud AI ERP
// Uses Supabase Auth exclusively. Organization access is managed by
// OrganizationContext + organization_members table, NOT localStorage.

import { supabase } from './supabase';

// ========== TYPES ==========

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// ========== SUPABASE AUTH FUNCTIONS ==========

/**
 * Sign in with Supabase Auth (server validates password hash).
 * Organization membership is loaded by OrganizationContext after login.
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('Signups not allowed')) {
        return { success: false, error: 'Email verification required. Check your inbox.' };
      }
      if (error.message.includes('Invalid login')) {
        return { success: false, error: 'Invalid email or password.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login failed. Please try again.' };
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.name || email.split('@')[0],
    };

    return { success: true, user };
  } catch (e: any) {
    return { success: false, error: 'Cannot connect to server. Please check your internet connection.' };
  }
}

/**
 * Sign out — clears Supabase session.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current authenticated user from Supabase session.
 * Does NOT determine organization or role — that's OrganizationContext's job.
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || '',
    };
  } catch {
    return null;
  }
}

/**
 * Check if a user is a platform admin (can see all organizations).
 * Uses the VITE_PLATFORM_ADMIN_EMAIL env var — NOT a security boundary,
 * just a UI visibility flag. Real admin access is enforced by RLS + is_platform_admin() in DB.
 */
export function isPlatformAdmin(email: string): boolean {
  const adminEmail = import.meta.env.VITE_PLATFORM_ADMIN_EMAIL || '';
  return adminEmail !== '' && email.toLowerCase() === adminEmail.toLowerCase();
}
