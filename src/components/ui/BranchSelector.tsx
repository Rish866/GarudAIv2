// BranchSelector — Dropdown to switch between accessible branches.
// Shows only branches the signed-in user has access to.
// "All Branches" option only available for users with has_all_branch_access.

import React from 'react';
import { useBranch } from '../../contexts/BranchContext';
import { Building2 } from 'lucide-react';

export default function BranchSelector() {
  const { accessibleBranches, selectedBranchId, hasAllBranchAccess, selectBranch, loading } = useBranch();

  // Don't render if only one branch and no all-access (user is locked)
  if (!hasAllBranchAccess && accessibleBranches.length <= 1) {
    if (accessibleBranches.length === 1) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-slate-50 rounded-lg">
          <Building2 size={14} className="text-slate-400" />
          <span className="font-medium">{accessibleBranches[0].name}</span>
        </div>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400">
        <Building2 size={14} />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 size={14} className="text-slate-400" />
      <select
        value={selectedBranchId || ''}
        onChange={(e) => selectBranch(e.target.value || null)}
        className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-700"
      >
        {hasAllBranchAccess && (
          <option value="">All Branches</option>
        )}
        {accessibleBranches.map(branch => (
          <option key={branch.id} value={branch.id}>
            {branch.name}{branch.code ? ` (${branch.code})` : ''}{branch.city ? ` — ${branch.city}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
