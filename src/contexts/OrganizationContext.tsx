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

      // Fetch ALL active memberships (not just one)
      const { data: memberships, error: memError } = await supabase
        .from('organization_members')
        .select('*, organizations(*)')
        .eq('user_id', session.user.id)
        .eq('status', 'active');

      if (memError) {
        setError(new Error(memError.message));
        setLoading(false);
        return;
      }

      if (!memberships || memberships.length === 0) {
        // User has no organization — they need to create one
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      if (memberships.length > 1) {
        // Multiple active memberships — this is a configuration error
        // Normal users should have exactly one active org
        setError(new Error(
          `Configuration error: User has ${memberships.length} active organization memberships. ` +
          `Contact support to resolve this. Only one active organization is allowed per user.`
        ));
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      // Exactly one membership — use it
      const memRecord = memberships[0];
      const org = memRecord.organizations as unknown as Organization;

      // Block portal roles that require row-level isolation
      const blockedPortalRoles = new Set(['customer', 'vendor', 'driver']);
      if (blockedPortalRoles.has(memRecord.role)) {
        setError(new Error(
          `Portal access for ${memRecord.role} accounts is not yet enabled. ` +
          `Row-level data isolation is being deployed. Please contact your administrator.`
        ));
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      const mem: OrganizationMembership = {
        id: memRecord.id,
        organization_id: memRecord.organization_id,
        user_id: memRecord.user_id,
        role: memRecord.role,
        status: memRecord.status,
        created_at: memRecord.created_at,
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
