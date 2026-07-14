import React from 'react';
import { useStore } from '../../store/useStore';
import { canWrite, canAccessFinancials, canManageSettings, canDelete, canApprove } from '../../lib/rbac';
import type { UserRole } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredPermission?: 'write' | 'financials' | 'settings' | 'delete' | 'approve';
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * RoleGuard — Conditionally renders children based on the user's role permissions.
 * Used to hide buttons, sections, or entire modules from unauthorized users.
 */
export default function RoleGuard({ children, requiredPermission, allowedRoles, fallback }: RoleGuardProps) {
  const role = useStore((s) => s.user.role);

  let hasAccess = true;

  if (requiredPermission === 'write') {
    hasAccess = canWrite(role);
  } else if (requiredPermission === 'financials') {
    hasAccess = canAccessFinancials(role);
  } else if (requiredPermission === 'settings') {
    hasAccess = canManageSettings(role);
  } else if (requiredPermission === 'delete') {
    hasAccess = canDelete(role);
  } else if (requiredPermission === 'approve') {
    hasAccess = canApprove(role);
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
