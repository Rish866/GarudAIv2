// Types for Transport ERP

export type UserRole = 'super_admin' | 'admin' | 'operations' | 'fleet_manager' | 'accounts' | 'driver';
export type VehicleType = 'trailer' | 'container' | 'truck' | 'tanker' | 'tipper' | 'reefer' | 'lcv';
export type VehicleStatus = 'available' | 'on_trip' | 'maintenance' | 'breakdown' | 'inactive';
export type OwnershipType = 'owned' | 'attached' | 'market';
export type DriverStatus = 'available' | 'on_trip' | 'on_leave' | 'inactive';
export type TripStatus = 'booked' | 'assigned' | 'loading' | 'in_transit' | 'reached' | 'unloading' | 'pod_pending' | 'completed' | 'billed' | 'settled' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type ExpenseCategory = 'diesel' | 'toll' | 'driver_bata' | 'loading' | 'unloading' | 'repair' | 'tyre' | 'insurance' | 'emi' | 'salary' | 'office' | 'misc';
export type AlertSeverity = 'critical' | 'warning' | 'info';

// Theme
export type Theme = 'light' | 'dark';

// Module names - expanded
export type ModuleName = 'dashboard' | 'fleet' | 'trips' | 'drivers' | 'customers' | 'billing' | 'fuel' | 'maintenance' | 'reports' | 'settings' | 'notifications' | 'enquiries' | 'tyres' | 'payroll' | 'contracts' | 'market' | 'documents' | 'gps' | 'accounts' | 'purchases' | 'sales' | 'inventory' | 'geofencing' | 'sla' | 'dashcam' | 'fueltheft' | 'challans' | 'workorders' | 'ewaybill' | 'audittrail' | 'portal';

// Branch (multi-branch support)
export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  manager_name: string;
  phone: string;
  status: 'active' | 'inactive';
}

// Notification
export interface Notification {
  id: string;
  company_id: string;
  type: 'trip_update' | 'payment_received' | 'document_expiry' | 'maintenance_due' | 'pod_received' | 'invoice_generated' | 'system';
  title: string;
  message: string;
  link_module?: ModuleName;
  link_id?: string;
  is_read: boolean;
  created_at: string;
}

// Quotation (for enquiry to quotation to trip flow)
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
  material: string;
  weight_tons: number;
  rate_type: 'per_trip' | 'per_ton' | 'per_km';
  rate: number;
  total_amount: number;
  gst_percent: number;
  validity_days: number;
  terms?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

// Trip POD details
export interface PODDetails {
  received_date?: string;
  received_by?: string;
  condition: 'good' | 'damaged' | 'partial';
  remarks?: string;
  image_url?: string;
}

// E-Way Bill
export interface EWayBill {
  number: string;
  generated_date: string;
  valid_until: string;
  distance_km: number;
  transporter_id?: string;
  status: 'active' | 'expired' | 'cancelled';
}

// GST Invoice details
export interface GSTDetails {
  place_of_supply: string;
  hsn_code: string;
  is_igst: boolean;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  reverse_charge: boolean;
}

// Activity Log (for audit trail)
export interface ActivityLog {
  id: string;
  company_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

// Dashboard Chart Data
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// Onboarding state
export interface OnboardingState {
  completed: boolean;
  current_step: number;
  steps_completed: string[];
}

export interface Company {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  logo_url?: string;
}

export interface User {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

export interface Vehicle {
  id: string;
  company_id: string;
  branch_id?: string;
  reg_number: string;
  vehicle_type: VehicleType;
  make: string;
  model: string;
  year: number;
  ownership_type: OwnershipType;
  owner_name: string;
  owner_phone?: string;
  capacity_tons: number;
  fitness_expiry: string;
  insurance_expiry: string;
  puc_expiry: string;
  permit_expiry: string;
  driver_id?: string;
  driver_name?: string;
  status: VehicleStatus;
  odometer: number;
  // GPS
  lat?: number;
  lng?: number;
  speed?: number;
  last_location?: string;
  last_gps_update?: string;
  ignition?: boolean;
  created_at: string;
}

export interface Driver {
  id: string;
  company_id: string;
  branch_id?: string;
  name: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  aadhar?: string;
  address: string;
  emergency_contact: string;
  emergency_phone: string;
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

export interface Customer {
  id: string;
  company_id: string;
  branch_id?: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  billing_address: string;
  credit_limit: number;
  credit_days: number;
  outstanding: number;
  total_business: number;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
}

export interface Trip {
  id: string;
  company_id: string;
  branch_id?: string;
  trip_number: string;
  lr_number: string;
  eway_bill?: string;
  customer_id: string;
  customer_name: string;
  vehicle_id: string;
  vehicle_reg: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  origin: string;
  origin_lat?: number;
  origin_lng?: number;
  destination: string;
  dest_lat?: number;
  dest_lng?: number;
  distance_km: number;
  material: string;
  weight_tons: number;
  num_packages?: number;
  booking_date: string;
  loading_date?: string;
  departure_date?: string;
  expected_delivery?: string;
  actual_delivery?: string;
  freight_amount: number;
  advance_amount: number;
  balance_amount: number;
  detention_charges: number;
  other_charges: number;
  total_amount: number;
  status: TripStatus;
  pod_url?: string;
  pod_date?: string;
  pod_details?: PODDetails;
  eway_bill_details?: EWayBill;
  remarks?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  branch_id?: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  trip_ids: string[];
  freight_total: number;
  detention_total: number;
  other_charges: number;
  subtotal: number;
  gst_percent: number;
  gst_amount: number;
  tds_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  gst_details?: GSTDetails;
  status: InvoiceStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  branch_id?: string;
  invoice_id?: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_mode: 'bank_transfer' | 'cheque' | 'cash' | 'upi';
  reference_number: string;
  payment_date: string;
  tds_amount: number;
  status: 'received' | 'cleared' | 'bounced';
  created_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  branch_id?: string;
  trip_id?: string;
  vehicle_id?: string;
  vehicle_reg?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  paid_to: string;
  payment_mode: 'cash' | 'bank' | 'fuel_card' | 'fastag' | 'upi';
  approved: boolean;
  created_at: string;
}

export interface FuelEntry {
  id: string;
  company_id: string;
  branch_id?: string;
  vehicle_id: string;
  vehicle_reg: string;
  driver_id: string;
  driver_name: string;
  trip_id?: string;
  date: string;
  litres: number;
  rate: number;
  amount: number;
  odometer: number;
  station: string;
  mileage?: number;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  company_id: string;
  branch_id?: string;
  vehicle_id: string;
  vehicle_reg: string;
  type: 'preventive' | 'repair' | 'breakdown' | 'tyre' | 'inspection';
  description: string;
  date: string;
  odometer: number;
  cost: number;
  vendor: string;
  next_due_date?: string;
  next_due_km?: number;
  status: 'scheduled' | 'in_progress' | 'completed';
  created_at: string;
}

export interface SystemAlert {
  id: string;
  company_id: string;
  type: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Enquiry {
  id: string;
  company_id: string;
  branch_id?: string;
  customer_id: string;
  customer_name: string;
  origin: string;
  destination: string;
  material: string;
  vehicle_type: VehicleType;
  weight_tons: number;
  loading_date: string;
  target_rate: number;
  status: 'new' | 'quoted' | 'confirmed' | 'lost';
  remarks?: string;
  created_at: string;
}
