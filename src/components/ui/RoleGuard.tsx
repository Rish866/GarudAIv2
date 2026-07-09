import React from 'react';
import { useStore } from '../../store/useStore';
import { canWrite, canAccessFinancials } from '../../lib/rbac';
import type { UserRole } from '../../types';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredPermission?: 'write' | 'financials' | 'settings';
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
}

export default function RoleGuard({ children, requiredPermission, allowedRoles, fallback }: RoleGuardProps) {
  const role = useStore((s) => s.user.role);

  let hasAccess = true;

  if (requiredPermission === 'write') {
    hasAccess = canWrite(role);
  } else if (requiredPermission === 'financials') {
    hasAccess = canAccessFinancials(role);
  } else if (requiredPermission === 'settings') {
    hasAccess = ['super_admin', 'admin'].includes(role);
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
