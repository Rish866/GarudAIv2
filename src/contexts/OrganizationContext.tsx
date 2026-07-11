// Organization Context — Provides verified org membership to all components
// This is the ONLY source of truth for which organization the user belongs to
// Never trust localStorage, URL params, or browser state for org access

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Organization, OrganizationMembership, OrganizationRole, OrganizationContextValue } from '../types/organization';
import { getPermissionsForRole } from '../lib/permissions';

const OrganizationContext = createContext<OrganizationContextValue>({
  organization: null,
  organizationId: null,
  membership: null,
  role: null,
  permissions: [],
  loading: true,
  error: null,
  refreshOrganization: async () => {},
});

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadOrganization = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      // Get user's active membership (first active org)
      const { data: memberships, error: memError } = await supabase
        .from('organization_members')
        .select('*, organizations(*)')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (memError || !memberships) {
        // User has no organization — they need to create one
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      const org = memberships.organizations as unknown as Organization;
      const mem: OrganizationMembership = {
        id: memberships.id,
        organization_id: memberships.organization_id,
        user_id: memberships.user_id,
        role: memberships.role,
        status: memberships.status,
        created_at: memberships.created_at,
      };

      setOrganization(org);
      setMembership(mem);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrganization();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadOrganization();
    });

    return () => subscription.unsubscribe();
  }, [loadOrganization]);

  const role = membership?.role ?? null;
  const permissions = role ? getPermissionsForRole(role) : [];

  const value: OrganizationContextValue = {
    organization,
    organizationId: organization?.id ?? null,
    membership,
    role,
    permissions,
    loading,
    error,
    refreshOrganization: loadOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider');
  return ctx;
}

export function useRequireOrganization(): OrganizationContextValue & { organizationId: string } {
  const ctx = useOrganization();
  if (!ctx.organizationId) throw new Error('No organization found. User must belong to an organization.');
  return ctx as OrganizationContextValue & { organizationId: string };
}
