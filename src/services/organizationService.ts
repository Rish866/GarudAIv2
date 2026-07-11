// Organization Service — Handles onboarding, invitations, and org management
// All operations go through Supabase with proper auth

import { supabase } from '../lib/supabase';
import type { Organization, OrganizationMembership } from '../types/organization';

// ============================================================
// FLOW A: New Organization Signup
// ============================================================

/**
 * Create a new organization for the currently authenticated user.
 * Uses the secure database function create_organization_for_user()
 * which creates org + membership + settings in one transaction.
 */
export async function createOrganization(data: {
  name: string;
  gstin?: string;
  city?: string;
  state?: string;
}): Promise<{ organizationId: string | null; error: string | null }> {
  try {
    const { data: result, error } = await supabase.rpc('create_organization_for_user', {
      org_name: data.name,
      org_gstin: data.gstin || null,
      org_city: data.city || null,
      org_state: data.state || null,
    });

    if (error) return { organizationId: null, error: error.message };
    return { organizationId: result as string, error: null };
  } catch (e: any) {
    return { organizationId: null, error: e.message || 'Failed to create organization' };
  }
}

/**
 * Complete signup flow:
 * 1. Sign up user with Supabase Auth
 * 2. Sign in immediately (to get session)
 * 3. Create organization via RPC
 * 4. Create user profile
 */
export async function signUpWithOrganization(data: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  phone?: string;
  gstin?: string;
  city?: string;
  state?: string;
}): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          company_name: data.companyName,
          phone: data.phone,
        },
      },
    });

    if (authError) return { success: false, error: authError.message };
    if (!authData.user) return { success: false, error: 'Registration failed' };

    // Step 2: Sign in to get session (needed for RPC calls)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      // User created but email confirmation required
      return { success: true, error: 'Account created. Please verify your email before logging in.' };
    }

    // Step 3: Create organization (uses DB function)
    const { organizationId, error: orgError } = await createOrganization({
      name: data.companyName,
      gstin: data.gstin,
      city: data.city,
      state: data.state,
    });

    if (orgError) return { success: false, error: orgError };

    // Step 4: Create user profile
    await supabase.from('user_profiles').upsert({
      id: authData.user.id,
      full_name: data.fullName,
      phone: data.phone || null,
    });

    return { success: true, organizationId: organizationId || undefined };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error' };
  }
}

// ============================================================
// FLOW B: Invited User Joins Organization
// ============================================================

/**
 * Accept an invitation and join an existing organization
 */
export async function acceptInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'Not authenticated' };

    // Get invitation details
    const { data: invitation, error: invError } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('status', 'pending')
      .single();

    if (invError || !invitation) return { success: false, error: 'Invalid or expired invitation' };

    // Verify email matches
    if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
      return { success: false, error: 'This invitation is for a different email address' };
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase.from('organization_invitations').update({ status: 'expired' }).eq('id', invitationId);
      return { success: false, error: 'Invitation has expired' };
    }

    // Add membership
    const { error: memError } = await supabase.from('organization_members').insert({
      organization_id: invitation.organization_id,
      user_id: session.user.id,
      role: invitation.role,
      status: 'active',
    });

    if (memError) {
      if (memError.code === '23505') return { success: false, error: 'You are already a member of this organization' };
      return { success: false, error: memError.message };
    }

    // Mark invitation as accepted
    await supabase.from('organization_invitations').update({ status: 'accepted' }).eq('id', invitationId);

    // Create profile if not exists
    await supabase.from('user_profiles').upsert({
      id: session.user.id,
      full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// Organization Management
// ============================================================

/**
 * Invite a user to the organization
 */
export async function inviteUser(organizationId: string, email: string, role: string): Promise<{ success: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('organization_invitations').insert({
    organization_id: organizationId,
    email: email.toLowerCase().trim(),
    role,
    invited_by: session.user.id,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Get current user's organization
 */
export async function getCurrentOrganization(): Promise<{ organization: Organization | null; membership: OrganizationMembership | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { organization: null, membership: null };

  const { data: mem } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!mem) return { organization: null, membership: null };

  return {
    organization: mem.organizations as unknown as Organization,
    membership: {
      id: mem.id,
      organization_id: mem.organization_id,
      user_id: mem.user_id,
      role: mem.role,
      status: mem.status,
      created_at: mem.created_at,
    },
  };
}

/**
 * Update organization details
 */
export async function updateOrganization(
  organizationId: string,
  updates: Partial<Pick<Organization, 'name' | 'gstin' | 'pan' | 'address' | 'city' | 'state' | 'phone' | 'email'>>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
