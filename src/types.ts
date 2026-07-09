// GARUD AI - Transport ERP Platform
// Complete TypeScript Type System

// ═══════════════════════════════════════════════════════════
// AUTH & USERS
// ═══════════════════════════════════════════════════════════

export type UserRole = 'super_admin' | 'admin' | 'operations' | 'fleet_manager' | 'driver' | 'customer' | 'accounts' | 'sales';

export interface User {
  id: string;
  company_id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  logo_url?: string;
  address: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  plan: 'starter' | 'professional' | 'enterprise';
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// FLEET & VEHICLES
// ═══════════════════════════════════════════════════════════

export type VehicleType = 'trailer' | 'container' | 'hywa' | 'tipper' | 'reefer' | 'truck' | 'tanker' | 'bus' | 'tempo' | 'lcv';
export type VehicleStatus = 'available' | 'on_trip' | 'maintenance' | 'breakdown' | 'inactive';
export type OwnershipType = 'owned' | 'attached' | 'market';

export interface Vehicle {
  id: string;
  company_id: string;
  reg_number: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number;
  ownership_type: OwnershipType;
  owner_name: string;
  owner_phone?: string;
  capacity_tons: number;
  chassis_number?: string;
  engine_number?: string;
  // Documents
  fitness_expiry: string;
  insurance_expiry: string;
  puc_expiry: string;
  permit_expiry: string;
  rc_number?: string;
  // Assignment
  driver_id?: string;
  driver_name?: string;
  // GPS
  gps_device_id?: string;
  current_lat?: number;
  current_lng?: number;
  current_speed?: number;
  last_location?: string;
  last_gps_update?: string;
  ignition?: boolean;
  // Status
  status: VehicleStatus;
  odometer: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// DRIVERS
// ═══════════════════════════════════════════════════════════

export type DriverStatus = 'available' | 'on_trip' | 'on_leave' | 'inactive';

export interface Driver {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  alt_phone?: string;
  license_number: string;
  license_type: string;
  license_expiry: string;
  aadhar_number?: string;
  pan_number?: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
  date_of_birth?: string;
  date_of_joining: string;
  assigned_vehicle_id?: string;
  assigned_vehicle_reg?: string;
  salary_type: 'monthly' | 'per_trip' | 'per_km';
  base_salary: number;
  status: DriverStatus;
  safety_score: number;
  total_trips: number;
  total_km: number;
  photo_url?: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// CUSTOMERS & CRM
// ═══════════════════════════════════════════════════════════

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  pan?: string;
  billing_address: string;
  shipping_address?: string;
  credit_limit: number;
  credit_days: number;
  outstanding_balance: number;
  total_business: number;
  contract_type: 'contract' | 'spot' | 'monthly';
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

export interface Enquiry {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  origin: string;
  destination: string;
  material: string;
  vehicle_type: VehicleType;
  weight_tons: number;
  loading_date: string;
  target_rate: number;
  status: 'new' | 'quoted' | 'confirmed' | 'lost' | 'cancelled';
  remarks?: string;
  created_at: string;
}

export interface Quotation {
  id: string;
  company_id: string;
  quotation_number: string;
  enquiry_id?: string;
  customer_id: string;
  customer_name: string;
  origin: string;
  destination: string;
  vehicle_type: VehicleType;
  rate_type: 'per_trip' | 'per_ton' | 'per_km';
  rate: number;
  gst_percent: number;
  validity_date: string;
  terms: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// TRIPS & CONSIGNMENTS
// ═══════════════════════════════════════════════════════════

export type TripStatus = 'booked' | 'assigned' | 'loading' | 'in_transit' | 'reached' | 'unloading' | 'pod_pending' | 'pod_received' | 'completed' | 'billed' | 'settled' | 'cancelled';

export interface Trip {
  id: string;
  company_id: string;
  trip_number: string;
  lr_number: string;
  eway_bill?: string;
  // Parties
  customer_id: string;
  customer_name: string;
  consignor_name?: string;
  consignee_name?: string;
  // Vehicle & Driver
  vehicle_id: string;
  vehicle_reg: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  // Route
  origin: string;
  destination: string;
  distance_km: number;
  // Cargo
  material: string;
  weight_tons: number;
  num_packages?: number;
  // Timeline
  booking_date: string;
  loading_date?: string;
  departure_date?: string;
  expected_delivery?: string;
  actual_delivery?: string;
  // Financials
  freight_amount: number;
  advance_amount: number;
  balance_amount: number;
  detention_charges: number;
  other_charges: number;
  total_amount: number;
  // Status
  status: TripStatus;
  pod_url?: string;
  pod_date?: string;
  remarks?: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// BILLING & FINANCE
// ═══════════════════════════════════════════════════════════

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  trip_ids: string[];
  // Amounts
  freight_total: number;
  detention_total: number;
  other_charges: number;
  subtotal: number;
  gst_amount: number;
  tds_deduction: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  // Status
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  invoice_id?: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_mode: 'bank_transfer' | 'cheque' | 'cash' | 'upi' | 'online';
  reference_number: string;
  payment_date: string;
  tds_amount: number;
  remarks?: string;
  status: 'received' | 'cleared' | 'bounced';
  created_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  trip_id?: string;
  vehicle_id?: string;
  vehicle_reg?: string;
  category: 'diesel' | 'toll' | 'driver_bata' | 'loading' | 'unloading' | 'repair' | 'tyre' | 'rto' | 'insurance' | 'emi' | 'salary' | 'office' | 'misc';
  amount: number;
  date: string;
  description: string;
  paid_to: string;
  payment_mode: 'cash' | 'bank' | 'fuel_card' | 'fastag' | 'upi';
  bill_url?: string;
  approved: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// FUEL & MAINTENANCE
// ═══════════════════════════════════════════════════════════

export interface FuelEntry {
  id: string;
  company_id: string;
  vehicle_id: string;
  vehicle_reg: string;
  driver_id: string;
  driver_name: string;
  trip_id?: string;
  date: string;
  litres: number;
  rate_per_litre: number;
  amount: number;
  odometer: number;
  fuel_station: string;
  mileage?: number;
  payment_mode: 'cash' | 'fuel_card' | 'bank';
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  company_id: string;
  vehicle_id: string;
  vehicle_reg: string;
  service_type: 'preventive' | 'repair' | 'breakdown' | 'tyre' | 'accident' | 'inspection';
  description: string;
  date: string;
  odometer: number;
  cost: number;
  vendor_name: string;
  next_due_date?: string;
  next_due_km?: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// SYSTEM & ALERTS
// ═══════════════════════════════════════════════════════════

export type AlertType = 'document_expiry' | 'payment_overdue' | 'pod_pending' | 'maintenance_due' | 'trip_delayed' | 'fuel_anomaly' | 'driver_license' | 'vehicle_idle';

export interface SystemAlert {
  id: string;
  company_id: string;
  type: AlertType;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD METRICS
// ═══════════════════════════════════════════════════════════

export interface DashboardMetrics {
  total_vehicles: number;
  active_trips: number;
  available_vehicles: number;
  vehicles_in_maintenance: number;
  total_drivers: number;
  available_drivers: number;
  monthly_revenue: number;
  monthly_expenses: number;
  outstanding_receivables: number;
  pending_pod: number;
  overdue_invoices: number;
  expiring_documents: number;
}

// ═══════════════════════════════════════════════════════════
// APP STATE
// ═══════════════════════════════════════════════════════════

export type ModuleName = 'dashboard' | 'fleet' | 'trips' | 'drivers' | 'billing' | 'fuel' | 'maintenance' | 'customers' | 'reports' | 'settings';

export interface AppState {
  user: User | null;
  company: Company | null;
  activeModule: ModuleName;
  sidebarCollapsed: boolean;
}
