// GARUD AI ERP - Global TypeScript Types and Interfaces
// Designed for Enterprise SaaS Multi-Tenancy

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'operations'
  | 'fleet_manager'
  | 'driver'
  | 'customer'
  | 'accounts'
  | 'branch_manager'
  | 'maintenance'
  | 'sales';

export interface ERPUser {
  id: string;
  company_id: string; // Tenant ID
  branch_id?: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  manager_name: string;
  phone: string;
  status: 'active' | 'inactive';
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
  loading_locations: string[];
  unloading_locations: string[];
  contract_type: 'contract' | 'ad-hoc' | 'fixed-monthly';
  credit_period_days: number;
  outstanding_balance: number;
  status: 'active' | 'inactive';
}

export type VehicleType = 'trailer' | 'container' | 'hywa' | 'tipper' | 'reefer' | 'bus' | 'truck' | 'tempo';
export type OwnershipType = 'owned' | 'market' | 'attached';
export type VehicleStatus = 'available' | 'on_trip' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: string;
  company_id: string;
  branch_id?: string;
  reg_number: string;
  vehicle_type: VehicleType;
  ownership_type: OwnershipType;
  owner_name: string;
  owner_phone?: string;
  driver_id?: string;
  driver_name?: string;
  capacity_tons: number;
  gps_device_id?: string;
  cameras_active: number;
  fitness_expiry: string;
  insurance_expiry: string;
  puc_expiry: string;
  permit_expiry: string;
  rc_document_url?: string;
  status: VehicleStatus;
  current_location: string;
  last_gps_update?: string;
  speed?: number;
  ignition?: boolean;
}

export interface Driver {
  id: string;
  company_id: string;
  branch_id?: string;
  name: string;
  mobile: string;
  license_number: string;
  license_expiry: string;
  assigned_vehicle_id?: string;
  assigned_vehicle_reg?: string;
  salary_type: 'monthly' | 'per_trip' | 'fixed_plus_allowance';
  base_salary: number;
  kyc_documents: {
    aadhar?: string;
    pan?: string;
    verified: boolean;
  };
  emergency_contact: string;
  status: 'active' | 'on_trip' | 'leave' | 'inactive';
  safety_score: number;
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
  expected_loading_date: string;
  target_rate: number;
  status: 'new' | 'quoted' | 'confirmed' | 'lost';
  remarks?: string;
  created_at: string;
}

export type RateType = 'per_trip' | 'per_ton' | 'per_km' | 'per_day' | 'per_month' | 'per_ticket';

export interface Quotation {
  id: string;
  company_id: string;
  branch_id?: string;
  enquiry_id?: string;
  customer_id: string;
  customer_name: string;
  route_origin: string;
  route_destination: string;
  vehicle_type: VehicleType;
  rate_type: RateType;
  rate: number;
  gst_percent: number;
  validity_date: string;
  terms: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  created_at: string;
}

export interface ContractRate {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  origin: string;
  destination: string;
  vehicle_type: VehicleType;
  rate_type: RateType;
  rate: number;
  min_guarantee_tons?: number;
  detention_charge_per_day?: number;
  loading_unloading_charges?: number;
  status: 'active' | 'expired';
}

export type TripStatus =
  | 'planned'
  | 'assigned'
  | 'loading'
  | 'in_transit'
  | 'reached'
  | 'unloaded'
  | 'pod_pending'
  | 'completed'
  | 'billed'
  | 'paid';

export interface Trip {
  id: string;
  company_id: string;
  branch_id?: string;
  trip_id_label: string; // e.g. "TRIP-2026-001"
  customer_id: string;
  customer_name: string;
  vehicle_id: string;
  vehicle_reg: string;
  driver_id: string;
  driver_name: string;
  origin: string;
  destination: string;
  loading_date_time: string;
  unloading_date_time?: string;
  material: string;
  weight_tons: number;
  freight_amount: number;
  advance_paid: number;
  diesel_advance: number;
  driver_cash: number;
  status: TripStatus;
  pod_url?: string;
  pod_status?: 'pending' | 'submitted' | 'approved' | 'rejected';
  pod_remarks?: string;
  lr_number: string;
  eway_bill_number: string;
  remarks?: string;
  created_at: string;
}

export interface MarketVehicleHire {
  id: string;
  company_id: string;
  trip_id: string;
  market_vehicle_reg: string;
  owner_name: string;
  owner_mobile: string;
  agreed_hire_amount: number;
  advance_paid: number;
  balance_payable: number;
  commission: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
}

export interface Invoice {
  id: string;
  company_id: string;
  branch_id?: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  linked_trip_ids: string[];
  freight_amount: number;
  detention_charges: number;
  loading_unloading_charges: number;
  gst_amount: number;
  tds_deduction: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  due_date: string;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
  created_at: string;
}

export interface PaymentCollection {
  id: string;
  company_id: string;
  customer_id: string;
  customer_name: string;
  invoice_id?: string;
  invoice_number?: string;
  amount_received: number;
  payment_mode: 'bank_transfer' | 'cheque' | 'cash' | 'upi';
  tds_deducted: number;
  payment_date: string;
  reference_number: string;
  remarks?: string;
}

export type ExpenseCategory =
  | 'diesel'
  | 'toll'
  | 'driver_allowance'
  | 'loading_unloading'
  | 'repair'
  | 'tyre'
  | 'rto'
  | 'fastag'
  | 'salary'
  | 'emi'
  | 'insurance'
  | 'permit'
  | 'misc';

export interface Expense {
  id: string;
  company_id: string;
  branch_id?: string;
  trip_id?: string;
  vehicle_id?: string;
  vehicle_reg?: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  description: string;
  paid_to?: string;
  payment_mode: 'cash' | 'fuel_card' | 'bank' | 'fastag';
}

export interface MaintenanceLog {
  id: string;
  company_id: string;
  vehicle_id: string;
  vehicle_reg: string;
  service_date: string;
  service_type: 'routine' | 'repair' | 'breakdown' | 'tyre_change' | 'puc_fitness';
  odometer: number;
  cost: number;
  workshop_name: string;
  next_service_due_date: string;
  notes?: string;
}

export interface FuelLog {
  id: string;
  company_id: string;
  vehicle_id: string;
  vehicle_reg: string;
  driver_id: string;
  driver_name: string;
  trip_id?: string;
  litres: number;
  amount: number;
  fuel_station: string;
  odometer: number;
  mileage_calculated?: number; // km/litre
  date: string;
}

export interface TyreLog {
  id: string;
  company_id: string;
  vehicle_id: string;
  vehicle_reg: string;
  tyre_number: string;
  position: 'front_left' | 'front_right' | 'rear_left_outer' | 'rear_left_inner' | 'rear_right_outer' | 'rear_right_inner' | 'spare';
  purchase_date: string;
  cost: number;
  running_km: number;
  retread_status: 'original' | 'once_retreaded' | 'twice_retreaded' | 'unserviceable';
  replacement_date?: string;
}

export interface DriverSalaryLog {
  id: string;
  company_id: string;
  driver_id: string;
  driver_name: string;
  month_year: string; // "MM-YYYY"
  base_salary: number;
  trip_allowance: number;
  advance_deduction: number;
  other_deductions: number;
  net_payable: number;
  payment_status: 'pending' | 'paid';
  payment_date?: string;
}

export interface SystemAlert {
  id: string;
  company_id: string;
  type: 'document_expiry' | 'payment_overdue' | 'pod_pending' | 'vehicle_idle' | 'trip_delayed' | 'maintenance_due' | 'driver_license_expiry' | 'credit_limit_crossed' | 'driver_behavior' | 'fuel_theft' | 'low_mileage';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  target_id?: string; // vehicle_id, trip_id, customer_id
  created_at: string;
  is_read: boolean;
}
