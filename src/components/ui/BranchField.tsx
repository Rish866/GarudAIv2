// BranchField — Reusable branch selector for create/edit forms.
//
// Behavior:
// - If user has only 1 accessible branch → auto-selects it (hidden or read-only)
// - If user has multiple branches → shows dropdown with only accessible branches
// - If user has all-branch access → shows all branches
// - Never exposes unauthorized branches
// - Validates that selected branch belongs to the user's accessible set

import React from 'react';
import { useBranch } from '../../contexts/BranchContext';

interface BranchFieldProps {
  value: string;
  onChange: (branchId: string) => void;
  required?: boolean;
  label?: string;
  className?: string;
  /** If true, auto-selects the current branch and hides the field when only 1 branch is available */
  autoSelect?: boolean;
}

export default function BranchField({
  value,
  onChange,
  required = false,
  label = 'Branch',
  className = '',
  autoSelect = true,
}: BranchFieldProps) {
  const { accessibleBranches, selectedBranchId, hasAllBranchAccess } = useBranch();

  // Auto-select: if only one branch, set it and optionally hide
  React.useEffect(() => {
    if (autoSelect && !value) {
      if (selectedBranchId) {
        onChange(selectedBranchId);
      } else if (accessibleBranches.length === 1) {
        onChange(accessibleBranches[0].id);
      }
    }
  }, [autoSelect, value, selectedBranchId, accessibleBranches, onChange]);

  // If only one branch and autoSelect, show as read-only text
  if (autoSelect && accessibleBranches.length === 1 && !hasAllBranchAccess) {
    return (
      <div className={className}>
        {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
        <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm text-slate-600">
          {accessibleBranches[0].name}
          {accessibleBranches[0].code && ` (${accessibleBranches[0].code})`}
        </div>
        <input type="hidden" value={accessibleBranches[0].id} />
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && ' *'}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="">Select branch</option>
        {accessibleBranches.map(branch => (
          <option key={branch.id} value={branch.id}>
            {branch.name}{branch.code ? ` (${branch.code})` : ''}{branch.city ? ` — ${branch.city}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
