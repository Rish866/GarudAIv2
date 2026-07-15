// useProtectedModuleData — Permission-enforced wrapper around useModuleData
//
// This hook enforces action-level permissions at the handler level:
// - create() checks the module's 'create' permission before calling Supabase
// - update() checks the module's 'update' permission before calling Supabase
// - remove() checks the module's 'archive' permission before calling Supabase
//
// If the user lacks the required permission, the operation is DENIED
// and an error toast is shown. The Supabase call is never made.
//
// This is a SECURITY BOUNDARY — hidden buttons are not enough.
// Even if a user manipulates the DOM to show a button, the handler itself refuses.
//
// Usage:
//   const { data, create, update, remove, canCreate, canUpdate, canArchive } =
//     useProtectedModuleData<Vehicle>('vehicles', 'fleet');

import { useCallback } from 'react';
import { useModuleData } from './useModuleData';
import type { ModuleDataResult } from './useModuleData';
import { usePermission } from './usePermission';
import { MODULE_PERMISSIONS } from '../lib/modulePermissions';
import { showToast } from '../components/ui/Toast';
import type { ModuleName } from '../types';
import type { Permission } from '../lib/permissions';

export interface ProtectedModuleDataResult<T> extends ModuleDataResult<T> {
  /** Whether the current user can create records in this module */
  canCreate: boolean;
  /** Whether the current user can update records in this module */
  canUpdate: boolean;
  /** Whether the current user can archive/delete records in this module */
  canArchive: boolean;
  /** Whether the current user can export data from this module */
  canExport: boolean;
  /** Whether the current user can approve actions in this module */
  canApprove: boolean;
}

/**
 * Permission-enforced module data hook.
 *
 * @param tableName - Supabase table name (e.g. 'vehicles', 'trips')
 * @param moduleName - Module identifier for permission lookup (e.g. 'fleet', 'trips')
 * @param options - Same options as useModuleData
 */
export function useProtectedModuleData<T extends { id: string }>(
  tableName: string,
  moduleName: ModuleName,
  options?: {
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, string | number | boolean>;
    enabled?: boolean;
    fetchOnMount?: boolean;
  }
): ProtectedModuleDataResult<T> {
  const baseResult = useModuleData<T>(tableName, options);
  const { can } = usePermission();

  const perms = MODULE_PERMISSIONS[moduleName];

  // Resolve permission flags
  const canCreate = perms?.create ? can(perms.create) : false;
  const canUpdate = perms?.update ? can(perms.update) : false;
  const canArchive = perms?.archive ? can(perms.archive) : false;
  const canExport = perms?.export ? can(perms.export) : false;
  const canApprove = perms?.approve ? can(perms.approve) : false;

  // Permission-guarded create
  const protectedCreate = useCallback(async (record: Partial<T>) => {
    if (!canCreate) {
      const msg = 'Permission denied: you cannot create records in this module.';
      showToast('error', msg);
      return { data: null, error: msg };
    }
    return baseResult.create(record);
  }, [canCreate, baseResult.create]);

  // Permission-guarded update
  const protectedUpdate = useCallback(async (id: string, updates: Partial<T>) => {
    if (!canUpdate) {
      const msg = 'Permission denied: you cannot update records in this module.';
      showToast('error', msg);
      return { error: msg };
    }
    return baseResult.update(id, updates);
  }, [canUpdate, baseResult.update]);

  // Permission-guarded remove/archive
  const protectedRemove = useCallback(async (id: string) => {
    if (!canArchive) {
      const msg = 'Permission denied: you cannot delete or archive records in this module.';
      showToast('error', msg);
      return { error: msg };
    }
    return baseResult.remove(id);
  }, [canArchive, baseResult.remove]);

  return {
    ...baseResult,
    create: protectedCreate,
    update: protectedUpdate,
    remove: protectedRemove,
    canCreate,
    canUpdate,
    canArchive,
    canExport,
    canApprove,
  };
}

/**
 * Standalone permission check for a specific module action.
 * Use when you need to check a permission without the full hook.
 */
export function useModuleAction(moduleName: ModuleName, action: keyof typeof MODULE_PERMISSIONS[ModuleName]) {
  const { can } = usePermission();
  const perms = MODULE_PERMISSIONS[moduleName];
  const perm = perms?.[action as keyof typeof perms] as Permission | undefined;
  return perm ? can(perm) : false;
}
