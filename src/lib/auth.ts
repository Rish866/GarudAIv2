// Authentication & Multi-Tenant System for Garud AI ERP
// Super Admin: rishkatiyar1@gmail.com / 123456789

export interface RegisteredUser {
  id: string;
  email: string;
  password: string;
  name: string;
  company_name: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'operations' | 'fleet_manager' | 'accounts' | 'driver';
  tenant_id: string;
  created_at: string;
  status: 'active' | 'inactive';
}

export interface Tenant {
  id: string;
  company_name: string;
  owner_email: string;
  created_at: string;
  status: 'active' | 'trial' | 'suspended';
}

const USERS_STORAGE_KEY = 'garud_registered_users';
const TENANTS_STORAGE_KEY = 'garud_tenants';
const CURRENT_TENANT_KEY = 'garud_current_tenant';

// Platform super admin (you)
const PLATFORM_SUPER_ADMIN: RegisteredUser = {
  id: 'platform_admin_001',
  email: 'rishkatiyar1@gmail.com',
  password: '123456789',
  name: 'Rish Katiyar',
  company_name: 'Garud AI (Platform)',
  phone: '+91 00000 00000',
  role: 'super_admin',
  tenant_id: 'platform',
  created_at: '2025-01-01T00:00:00Z',
  status: 'active',
};

// Demo user for testing
const DEMO_USER: RegisteredUser = {
  id: 'user_demo_001',
  email: 'demo@garudai.in',
  password: 'demo123',
  name: 'Demo User',
  company_name: 'Demo Transport Pvt Ltd',
  phone: '+91 99999 99999',
  role: 'super_admin',
  tenant_id: 'tenant_demo',
  created_at: '2025-07-01T00:00:00Z',
  status: 'active',
};

const DEMO_TENANT: Tenant = {
  id: 'tenant_demo',
  company_name: 'Demo Transport Pvt Ltd',
  owner_email: 'demo@garudai.in',
  created_at: '2025-07-01T00:00:00Z',
  status: 'active',
};

// Initialize default users
function initializeUsers(): RegisteredUser[] {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (stored) {
    const users = JSON.parse(stored) as RegisteredUser[];
    // Ensure platform admin always exists
    if (!users.find(u => u.email === PLATFORM_SUPER_ADMIN.email)) {
      users.push(PLATFORM_SUPER_ADMIN);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    if (!users.find(u => u.email === DEMO_USER.email)) {
      users.push(DEMO_USER);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    return users;
  }
  const defaultUsers = [PLATFORM_SUPER_ADMIN, DEMO_USER];
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function initializeTenants(): Tenant[] {
  const stored = localStorage.getItem(TENANTS_STORAGE_KEY);
  if (stored) {
    const tenants = JSON.parse(stored) as Tenant[];
    if (!tenants.find(t => t.id === DEMO_TENANT.id)) {
      tenants.push(DEMO_TENANT);
      localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenants));
    }
    return tenants;
  }
  const defaultTenants = [DEMO_TENANT];
  localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(defaultTenants));
  return defaultTenants;
}

// ========== AUTH FUNCTIONS ==========

export function authenticateUser(email: string, password: string): { success: boolean; user?: RegisteredUser; error?: string } {
  const users = initializeUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  
  if (!user) {
    return { success: false, error: 'No account found with this email. Please register first.' };
  }
  
  if (user.password !== password) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  if (user.status === 'inactive') {
    return { success: false, error: 'Your account has been deactivated. Contact support.' };
  }

  // Set current tenant
  localStorage.setItem(CURRENT_TENANT_KEY, user.tenant_id);
  
  return { success: true, user };
}

export function registerUser(data: { email: string; password: string; name: string; company_name: string; phone: string }): { success: boolean; user?: RegisteredUser; error?: string } {
  const users = initializeUsers();
  
  // Check if email already exists
  if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase().trim())) {
    return { success: false, error: 'An account with this email already exists. Please login.' };
  }

  // Create new tenant
  const tenantId = 'tenant_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const newTenant: Tenant = {
    id: tenantId,
    company_name: data.company_name,
    owner_email: data.email,
    created_at: new Date().toISOString(),
    status: 'trial',
  };

  // Create new user
  const newUser: RegisteredUser = {
    id: 'user_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    email: data.email.toLowerCase().trim(),
    password: data.password,
    name: data.name,
    company_name: data.company_name,
    phone: data.phone,
    role: 'super_admin', // Owner of their tenant
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    status: 'active',
  };

  // Save
  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  const tenants = initializeTenants();
  tenants.push(newTenant);
  localStorage.setItem(TENANTS_STORAGE_KEY, JSON.stringify(tenants));

  // Set current tenant
  localStorage.setItem(CURRENT_TENANT_KEY, tenantId);

  return { success: true, user: newUser };
}

// ========== TENANT FUNCTIONS ==========

export function getCurrentTenantId(): string {
  return localStorage.getItem(CURRENT_TENANT_KEY) || 'tenant_demo';
}

export function getStorageKeyForTenant(tenantId: string): string {
  // Each tenant gets their own localStorage key for ERP data
  return `garud-erp-${tenantId}`;
}

export function isPlatformAdmin(email: string): boolean {
  return email.toLowerCase() === PLATFORM_SUPER_ADMIN.email.toLowerCase();
}

export function getAllTenants(): Tenant[] {
  return initializeTenants();
}

export function getAllUsers(): RegisteredUser[] {
  return initializeUsers();
}

export function switchTenant(tenantId: string): void {
  localStorage.setItem(CURRENT_TENANT_KEY, tenantId);
}

export function getTenantUsers(tenantId: string): RegisteredUser[] {
  const users = initializeUsers();
  return users.filter(u => u.tenant_id === tenantId);
}
