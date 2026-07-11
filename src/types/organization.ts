// Multi-Tenant Organization Types

export type OrganizationRole =
  | 'organization_owner'
  | 'admin'
  | 'operations_manager'
  | 'dispatcher'
  | 'fleet_manager'
  | 'accountant'
  | 'maintenance_manager'
  | 'hr_manager'
  | 'driver'
  | 'customer'
  | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  gstin: string | null;
  pan: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: 'active' | 'suspended' | 'deactivated';
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled';
  created_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
}

export interface OrganizationSettings {
  id: string;
  organization_id: string;
  onboarding_completed: boolean;
  default_gst_percent: number;
  default_tds_percent: number;
  invoice_prefix: string;
  trip_prefix: string;
  lr_prefix: string;
  financial_year_start: number;
}

export interface OrganizationContextValue {
  organization: Organization | null;
  organizationId: string | null;
  membership: OrganizationMembership | null;
  role: OrganizationRole | null;
  permissions: string[];
  loading: boolean;
  error: Error | null;
  refreshOrganization: () => Promise<void>;
}
