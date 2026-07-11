// Tenant-awareness helper for modules with local state
// Returns true if the current session is the demo/default tenant (show seed data)
// Returns false for new registered tenants (show empty state)

export function isDemoTenant(): boolean {
  const activeTenant = localStorage.getItem('garud_active_tenant');
  return !activeTenant || activeTenant === 'default';
}
