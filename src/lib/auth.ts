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
 * Central logout service — call this for ALL logout scenarios.
 * 
 * 1. Calls supabase.auth.signOut()
 * 2. Clears localStorage branch selection
 * 3. Returns success/failure (caller handles store cleanup & redirect)
 * 
 * Even if sign-out API fails (network error), we still invalidate local state
 * to prevent the user from accessing protected content.
 */
export async function performLogout(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    // Clear branch selection cache
    localStorage.removeItem('garud_selected_branch');
    if (error) {
      // Sign-out API failed but we still clear local state
      return { success: true, error: `Sign-out API error (local session cleared): ${error.message}` };
    }
    return { success: true };
  } catch (e: any) {
    // Network failure — still clear local state for security
    localStorage.removeItem('garud_selected_branch');
    return { success: true, error: 'Network error during sign-out (local session cleared)' };
  }
}

/**
 * Resolve user's organization role after successful authentication.
 * Returns the role from organization_members table, or an error if
 * the user has no active membership.
 */
export async function resolveUserRole(): Promise<{
  success: boolean;
  role?: string;
  organizationId?: string;
  organizationName?: string;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'No authenticated session' };
    }

    const { data: memberships, error: memError } = await supabase
      .from('organization_members')
      .select('role, status, organization_id, organizations(name)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .limit(1);

    if (memError) {
      return { success: false, error: `Failed to resolve role: ${memError.message}` };
    }

    if (!memberships || memberships.length === 0) {
      return { success: false, error: 'No active organization membership found. Please contact your administrator.' };
    }

    const membership = memberships[0];
    const orgName = (membership.organizations as any)?.name || 'Unknown';

    return {
      success: true,
      role: membership.role,
      organizationId: membership.organization_id,
      organizationName: orgName,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to resolve user role' };
  }
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


/**
 * Request password reset email via Supabase Auth.
 * Sends a recovery email with a link back to the app.
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
 * Update password (called after Supabase validates the recovery token).
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
