// BranchContext — Provides the current user's accessible branches and selected branch.
//
// Security model:
// - Branches are loaded from Supabase (RLS enforces access)
// - The selector only shows branches the user can access
// - "All branches" is only available to users with has_all_branch_access
// - localStorage persists selection for convenience but is NOT the source of truth
// - If the persisted branch is no longer accessible, it falls back to the first allowed branch
// - Pagination resets when branch changes (via callback)

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useOrganization } from './OrganizationContext';

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  state: string | null;
  status: string;
}

export interface BranchContextValue {
  /** All branches accessible to the current user */
  accessibleBranches: Branch[];
  /** Currently selected branch ID, or null for "all accessible branches" */
  selectedBranchId: string | null;
  /** Whether the user can view all branches (owner/admin) */
  hasAllBranchAccess: boolean;
  /** Set the selected branch (null = all) */
  selectBranch: (branchId: string | null) => void;
  /** Loading state */
  loading: boolean;
  /** Listeners notified when branch changes (for pagination reset) */
  onBranchChange: (callback: () => void) => () => void;
}

const BranchContext = createContext<BranchContextValue>({
  accessibleBranches: [],
  selectedBranchId: null,
  hasAllBranchAccess: false,
  selectBranch: () => {},
  loading: true,
  onBranchChange: () => () => {},
});

const STORAGE_KEY = 'garud_selected_branch';

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { organizationId, membership, loading: orgLoading } = useOrganization();
  const [accessibleBranches, setAccessibleBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [hasAllBranchAccess, setHasAllBranchAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changeListeners] = useState<Set<() => void>>(new Set());

  // Load accessible branches from Supabase
  const loadBranches = useCallback(async () => {
    if (!organizationId || !membership) {
      setAccessibleBranches([]);
      setHasAllBranchAccess(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if user has all-branch access
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('has_all_branch_access')
        .eq('id', membership.id)
        .single();

      const allAccess = memberData?.has_all_branch_access === true;
      setHasAllBranchAccess(allAccess);

      let branches: Branch[] = [];

      if (allAccess) {
        // Fetch all active branches in the organization
        const { data } = await supabase
          .from('branches')
          .select('id, name, code, city, state, status')
          .eq('organization_id', organizationId)
          .eq('status', 'active')
          .order('name');
        branches = (data || []) as Branch[];
      } else {
        // Fetch only explicitly granted branches
        const { data } = await supabase
          .from('organization_member_branches')
          .select('branch_id, branches(id, name, code, city, state, status)')
          .eq('member_id', membership.id);

        branches = ((data || [])
          .map((row: any) => row.branches)
          .filter(Boolean)
          .filter((b: Branch) => b.status === 'active')) as Branch[];
      }

      setAccessibleBranches(branches);

      // Restore persisted selection (validate it's still accessible)
      const persisted = localStorage.getItem(STORAGE_KEY);
      if (persisted && branches.some(b => b.id === persisted)) {
        setSelectedBranchId(persisted);
      } else if (allAccess) {
        // All-access users default to "all branches" (null)
        setSelectedBranchId(null);
      } else if (branches.length === 1) {
        // Single branch users are locked to that branch
        setSelectedBranchId(branches[0].id);
      } else if (branches.length > 1) {
        // Multi-branch users default to first branch
        setSelectedBranchId(branches[0].id);
      } else {
        setSelectedBranchId(null);
      }
    } catch (e) {
      console.error('Failed to load branches:', e);
      setAccessibleBranches([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, membership]);

  useEffect(() => {
    if (!orgLoading) loadBranches();
  }, [orgLoading, loadBranches]);

  const selectBranch = useCallback((branchId: string | null) => {
    // Validate: null only allowed for all-access users
    if (branchId === null && !hasAllBranchAccess) return;
    // Validate: branch must be in accessible list
    if (branchId !== null && !accessibleBranches.some(b => b.id === branchId)) return;

    setSelectedBranchId(branchId);

    // Persist for convenience (not security)
    if (branchId) {
      localStorage.setItem(STORAGE_KEY, branchId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Notify listeners (pagination reset)
    changeListeners.forEach(cb => cb());
  }, [hasAllBranchAccess, accessibleBranches, changeListeners]);

  const onBranchChange = useCallback((callback: () => void) => {
    changeListeners.add(callback);
    return () => { changeListeners.delete(callback); };
  }, [changeListeners]);

  return (
    <BranchContext.Provider value={{
      accessibleBranches,
      selectedBranchId,
      hasAllBranchAccess,
      selectBranch,
      loading,
      onBranchChange,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch(): BranchContextValue {
  return useContext(BranchContext);
}
