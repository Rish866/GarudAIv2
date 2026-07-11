import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Company,
  User,
  Vehicle,
  Driver,
  Customer,
  Trip,
  Invoice,
  Payment,
  Expense,
  FuelEntry,
  MaintenanceRecord,
  SystemAlert,
  Enquiry,
  ModuleName,
  TripStatus,
  Theme,
  Notification,
  Quotation,
  Branch,
  ActivityLog,
  OnboardingState,
} from '../types';

// Helper to generate unique IDs
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Helper to generate relative dates (days ago from today)
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// Store state interface
interface StoreState {
  company: Company;
  user: User;
  vehicles: Vehicle[];
  drivers: Driver[];
  customers: Customer[];
  trips: Trip[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  fuelEntries: FuelEntry[];
  maintenance: MaintenanceRecord[];
  alerts: SystemAlert[];
  enquiries: Enquiry[];
  activeModule: ModuleName;
  sidebarCollapsed: boolean;
  isLoggedIn: boolean;
  showModal: { type: string; data?: unknown } | null;
  theme: Theme;
  notifications: Notification[];
  quotations: Quotation[];
  branches: Branch[];
  activeBranch: string;
  activityLog: ActivityLog[];
  onboarding: OnboardingState;

  // Actions
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  addDriver: (driver: Driver) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  updateTripStatus: (id: string, status: TripStatus) => void;
  addInvoice: (invoice: Invoice) => void;
  addPayment: (payment: Payment) => void;
  addExpense: (expense: Expense) => void;
  addFuelEntry: (entry: FuelEntry) => void;
  addMaintenance: (record: MaintenanceRecord) => void;
  addEnquiry: (enquiry: Enquiry) => void;
  markAlertRead: (id: string) => void;
  setActiveModule: (module: ModuleName) => void;
  toggleSidebar: () => void;
  login: (user: User) => void;
  logout: () => void;
  toggleTheme: () => void;
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addQuotation: (q: Quotation) => void;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  convertEnquiryToQuotation: (enquiryId: string) => void;
  convertQuotationToTrip: (quotationId: string) => void;
  setActiveBranch: (branchId: string) => void;
  addActivityLog: (log: ActivityLog) => void;
}

// Dashboard metrics helper
export function getDashboardMetrics(state: StoreState) {
  const totalVehicles = state.vehicles.length;
  const activeVehicles = state.vehicles.filter((v) => v.status === 'on_trip').length;
  const availableVehicles = state.vehicles.filter((v) => v.status === 'available').length;
  const maintenanceVehicles = state.vehicles.filter((v) => v.status === 'maintenance' || v.status === 'breakdown').length;
  const totalTrips = state.trips.length;
  const activeTrips = state.trips.filter((t) => ['in_transit', 'loading', 'unloading', 'assigned'].includes(t.status)).length;
  const completedTrips = state.trips.filter((t) => ['completed', 'billed', 'settled'].includes(t.status)).length;
  const totalRevenue = state.invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalReceived = state.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = state.expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOutstanding = state.invoices.reduce((sum, inv) => sum + inv.balance_amount, 0);
  const totalDrivers = state.drivers.length;
  const availableDrivers = state.drivers.filter((d) => d.status === 'available').length;
  const unreadAlerts = state.alerts.filter((a) => !a.is_read).length;
  return { totalVehicles, activeVehicles, availableVehicles, maintenanceVehicles, totalTrips, activeTrips, completedTrips, totalRevenue, totalReceived, totalExpenses, totalOutstanding, totalDrivers, availableDrivers, unreadAlerts };
}

// Seed data
const COMPANY_ID = 'comp_garud_001';

const seedCompany: Company = { id: COMPANY_ID, name: 'Garud Transport Pvt Ltd', address: '45, Transport Nagar, GT Road', city: 'Pune', state: 'Maharashtra', gstin: '27AABCG1234A1Z5', pan: 'AABCG1234A', phone: '+91 20 2567 8900', email: 'info@garudtransport.in' };

const seedUser: User = { id: 'user_001', company_id: COMPANY_ID, name: 'Rajesh Sharma', email: 'rajesh@garudtransport.in', role: 'super_admin', phone: '+91 98765 43210', status: 'active' };

const seedBranches: Branch[] = [
  { id: 'branch_001', company_id: COMPANY_ID, name: 'Pune HQ', code: 'PNE', city: 'Pune', state: 'Maharashtra', address: '45, Transport Nagar, GT Road, Pune', manager_name: 'Rajesh Sharma', phone: '+91 20 2567 8900', status: 'active' },
  { id: 'branch_002', company_id: COMPANY_ID, name: 'Mumbai Branch', code: 'MUM', city: 'Mumbai', state: 'Maharashtra', address: '12, JNPT Road, Navi Mumbai', manager_name: 'Priya Mehta', phone: '+91 22 2345 6789', status: 'active' },
];

const seedNotifications: Notification[] = [
  { id: 'notif_001', company_id: COMPANY_ID, type: 'trip_update', title: 'Trip Delivered', message: 'Trip TRP-2025-0142 has been delivered successfully', link_module: 'trips', link_id: 'trip_001', is_read: false, created_at: daysAgo(0) },
  { id: 'notif_002', company_id: COMPANY_ID, type: 'payment_received', title: 'Payment Received', message: 'Payment of ₹1,88,490 received from Maruti Suzuki', link_module: 'billing', link_id: 'pay_001', is_read: false, created_at: daysAgo(0) },
  { id: 'notif_003', company_id: COMPANY_ID, type: 'document_expiry', title: 'Insurance Expiring', message: 'Vehicle RJ-14-JK-7890 insurance expires in 22 days', link_module: 'fleet', link_id: 'veh_005', is_read: false, created_at: daysAgo(0) },
  { id: 'notif_004', company_id: COMPANY_ID, type: 'maintenance_due', title: 'Maintenance Scheduled', message: 'Scheduled maintenance for MH-12-AB-1234 on Jul 15', link_module: 'maintenance', link_id: 'maint_002', is_read: true, created_at: daysAgo(1) },
  { id: 'notif_005', company_id: COMPANY_ID, type: 'system', title: 'New Enquiry', message: 'New enquiry received from UltraTech Cement', link_module: 'enquiries', link_id: 'enq_001', is_read: true, created_at: daysAgo(1) },
];

const seedQuotations: Quotation[] = [
  { id: 'quot_001', company_id: COMPANY_ID, quotation_number: 'QT-2025-0034', enquiry_id: 'enq_001', customer_id: 'cust_004', customer_name: 'UltraTech Cement', origin: 'Rajashree Nagar, Karnataka', destination: 'Chennai, Tamil Nadu', vehicle_type: 'truck', material: 'Cement Bags', weight_tons: 25, rate_type: 'per_trip', rate: 58000, total_amount: 60900, gst_percent: 5, validity_days: 7, terms: 'Loading/unloading at party scope. Detention ₹2000/day after 24hrs.', status: 'sent', created_at: '2025-07-09T10:00:00Z' },
  { id: 'quot_002', company_id: COMPANY_ID, quotation_number: 'QT-2025-0033', enquiry_id: 'enq_002', customer_id: 'cust_002', customer_name: 'Reliance Industries', origin: 'Jamnagar, Gujarat', destination: 'Delhi, NCR', vehicle_type: 'container', material: 'Polymer Granules', weight_tons: 20, rate_type: 'per_trip', rate: 105000, total_amount: 110250, gst_percent: 5, validity_days: 10, status: 'draft', created_at: '2025-07-08T16:30:00Z' },
];

const seedActivityLog: ActivityLog[] = [
  { id: 'act_001', company_id: COMPANY_ID, user_name: 'Rajesh Sharma', action: 'created', entity_type: 'trip', entity_id: 'trip_001', details: 'Rajesh Sharma created trip TRP-2025-0142', timestamp: daysAgo(0) },
  { id: 'act_002', company_id: COMPANY_ID, user_name: 'System', action: 'generated', entity_type: 'invoice', entity_id: 'inv_001', details: 'System generated invoice INV-2025-0089', timestamp: daysAgo(0) },
  { id: 'act_003', company_id: COMPANY_ID, user_name: 'Priya Mehta', action: 'added', entity_type: 'vehicle', entity_id: 'veh_001', details: 'Priya Mehta added vehicle MH-12-AB-1234', timestamp: daysAgo(1) },
  { id: 'act_004', company_id: COMPANY_ID, user_name: 'System', action: 'recorded', entity_type: 'payment', entity_id: 'pay_001', details: 'Payment ₹1,88,490 recorded for Maruti Suzuki', timestamp: daysAgo(1) },
  { id: 'act_005', company_id: COMPANY_ID, user_name: 'Rajesh Sharma', action: 'scheduled', entity_type: 'maintenance', entity_id: 'maint_001', details: 'Maintenance scheduled for RJ-14-JK-7890', timestamp: '2025-07-07T09:00:00Z' },
];

const seedVehicles: Vehicle[] = [
  { id: 'veh_001', company_id: COMPANY_ID, branch_id: 'branch_001', reg_number: 'MH-12-AB-1234', vehicle_type: 'trailer', make: 'Tata', model: 'Prima 4928', year: 2022, ownership_type: 'owned', owner_name: 'Garud Transport Pvt Ltd', capacity_tons: 28, fitness_expiry: '2025-12-15', insurance_expiry: '2025-09-30', puc_expiry: '2025-08-20', permit_expiry: '2026-03-31', driver_id: 'drv_001', driver_name: 'Suresh Kumar', status: 'on_trip', odometer: 145230, lat: 19.876, lng: 75.343, speed: 62, last_location: 'NH-44, near Aurangabad', last_gps_update: '2025-07-09T10:30:00Z', ignition: true, created_at: '2022-04-15T00:00:00Z' },
  { id: 'veh_002', company_id: COMPANY_ID, branch_id: 'branch_001', reg_number: 'MH-12-CD-5678', vehicle_type: 'container', make: 'Ashok Leyland', model: 'Captain 4023', year: 2021, ownership_type: 'owned', owner_name: 'Garud Transport Pvt Ltd', capacity_tons: 22, fitness_expiry: '2025-11-20', insurance_expiry: '2025-10-15', puc_expiry: '2025-09-10', permit_expiry: '2026-01-31', driver_id: 'drv_002', driver_name: 'Ramesh Yadav', status: 'on_trip', odometer: 198450, lat: 21.145, lng: 79.088, speed: 55, last_location: 'NH-44, near Nagpur', last_gps_update: '2025-07-09T10:25:00Z', ignition: true, created_at: '2021-08-10T00:00:00Z' },
  { id: 'veh_003', company_id: COMPANY_ID, branch_id: 'branch_001', reg_number: 'MH-14-EF-9012', vehicle_type: 'truck', make: 'BharatBenz', model: '3523R', year: 2023, ownership_type: 'owned', owner_name: 'Garud Transport Pvt Ltd', capacity_tons: 25, fitness_expiry: '2026-06-30', insurance_expiry: '2026-01-15', puc_expiry: '2025-12-01', permit_expiry: '2026-06-30', driver_id: 'drv_003', driver_name: 'Vikram Singh', status: 'available', odometer: 67800, lat: 18.520, lng: 73.856, speed: 0, last_location: 'Transport Nagar, Pune', last_gps_update: '2025-07-09T08:00:00Z', ignition: false, created_at: '2023-01-20T00:00:00Z' },
  { id: 'veh_004', company_id: COMPANY_ID, branch_id: 'branch_001', reg_number: 'GJ-05-GH-3456', vehicle_type: 'tanker', make: 'Tata', model: 'Signa 4825.TK', year: 2022, ownership_type: 'attached', owner_name: 'Mahesh Patel', owner_phone: '+91 94265 78901', capacity_tons: 24, fitness_expiry: '2025-10-31', insurance_expiry: '2025-08-15', puc_expiry: '2025-07-30', permit_expiry: '2025-12-31', driver_id: 'drv_004', driver_name: 'Ajay Chauhan', status: 'on_trip', odometer: 112340, lat: 23.022, lng: 72.571, speed: 48, last_location: 'Ahmedabad Ring Road', last_gps_update: '2025-07-09T10:15:00Z', ignition: true, created_at: '2022-06-05T00:00:00Z' },
  { id: 'veh_005', company_id: COMPANY_ID, branch_id: 'branch_001', reg_number: 'RJ-14-JK-7890', vehicle_type: 'tipper', make: 'Ashok Leyland', model: 'BOSS 2523', year: 2020, ownership_type: 'market', owner_name: 'Rajput Transport', owner_phone: '+91 93145 67890', capacity_tons: 20, fitness_expiry: '2025-08-15', insurance_expiry: '2025-07-31', puc_expiry: '2025-07-15', permit_expiry: '2025-09-30', status: 'maintenance', odometer: 234560, lat: 26.912, lng: 75.787, speed: 0, last_location: 'Jaipur Workshop', last_gps_update: '2025-07-08T18:00:00Z', ignition: false, created_at: '2020-11-10T00:00:00Z' },
  { id: 'veh_006', company_id: COMPANY_ID, branch_id: 'branch_002', reg_number: 'KA-01-LM-2345', vehicle_type: 'reefer', make: 'Eicher', model: 'Pro 6025T', year: 2023, ownership_type: 'owned', owner_name: 'Garud Transport Pvt Ltd', capacity_tons: 15, fitness_expiry: '2026-08-20', insurance_expiry: '2026-03-10', puc_expiry: '2026-01-05', permit_expiry: '2026-08-20', driver_id: 'drv_005', driver_name: 'Manoj Reddy', status: 'on_trip', odometer: 43200, lat: 15.317, lng: 75.713, speed: 70, last_location: 'NH-48, near Hubli', last_gps_update: '2025-07-09T10:20:00Z', ignition: true, created_at: '2023-05-12T00:00:00Z' },
  { id: 'veh_007', company_id: COMPANY_ID, branch_id: 'branch_002', reg_number: 'MP-09-NP-6789', vehicle_type: 'truck', make: 'Tata', model: 'LPT 3521', year: 2021, ownership_type: 'attached', owner_name: 'Sharma Logistics', owner_phone: '+91 97553 12345', capacity_tons: 21, fitness_expiry: '2025-09-25', insurance_expiry: '2025-11-30', puc_expiry: '2025-10-15', permit_expiry: '2026-02-28', driver_id: 'drv_006', driver_name: 'Dinesh Verma', status: 'available', odometer: 156780, lat: 23.259, lng: 77.412, speed: 0, last_location: 'Bhopal Transport Hub', last_gps_update: '2025-07-09T07:45:00Z', ignition: false, created_at: '2021-03-18T00:00:00Z' },
  { id: 'veh_008', company_id: COMPANY_ID, branch_id: 'branch_002', reg_number: 'TN-07-QR-4567', vehicle_type: 'lcv', make: 'Mahindra', model: 'Blazo X 28', year: 2024, ownership_type: 'owned', owner_name: 'Garud Transport Pvt Ltd', capacity_tons: 9, fitness_expiry: '2027-01-15', insurance_expiry: '2026-07-20', puc_expiry: '2026-04-10', permit_expiry: '2027-01-15', status: 'available', odometer: 12450, lat: 13.082, lng: 80.270, speed: 0, last_location: 'Chennai Port Area', last_gps_update: '2025-07-09T06:30:00Z', ignition: false, created_at: '2024-01-08T00:00:00Z' },
];

const seedDrivers: Driver[] = [
  { id: 'drv_001', company_id: COMPANY_ID, branch_id: 'branch_001', name: 'Suresh Kumar', phone: '+91 98765 11111', license_number: 'MH-1220220012345', license_expiry: '2027-03-15', aadhar: '1234-5678-9012', address: '12, Shivaji Nagar, Pune', emergency_contact: 'Sita Kumar', emergency_phone: '+91 98765 11112', date_of_joining: '2020-06-15', assigned_vehicle_id: 'veh_001', assigned_vehicle_reg: 'MH-12-AB-1234', salary_type: 'per_trip', base_salary: 8000, status: 'on_trip', safety_score: 92, total_trips: 245, total_km: 187500, created_at: '2020-06-15T00:00:00Z' },
  { id: 'drv_002', company_id: COMPANY_ID, branch_id: 'branch_001', name: 'Ramesh Yadav', phone: '+91 98765 22222', license_number: 'MH-1420210054321', license_expiry: '2026-11-20', aadhar: '2345-6789-0123', address: '78, Camp Area, Pune', emergency_contact: 'Geeta Yadav', emergency_phone: '+91 98765 22223', date_of_joining: '2019-03-10', assigned_vehicle_id: 'veh_002', assigned_vehicle_reg: 'MH-12-CD-5678', salary_type: 'monthly', base_salary: 25000, status: 'on_trip', safety_score: 88, total_trips: 312, total_km: 245000, created_at: '2019-03-10T00:00:00Z' },
  { id: 'drv_003', company_id: COMPANY_ID, branch_id: 'branch_001', name: 'Vikram Singh', phone: '+91 98765 33333', license_number: 'RJ-1420230098765', license_expiry: '2028-05-10', aadhar: '3456-7890-1234', address: '23, Aundh Road, Pune', emergency_contact: 'Pooja Singh', emergency_phone: '+91 98765 33334', date_of_joining: '2022-01-05', assigned_vehicle_id: 'veh_003', assigned_vehicle_reg: 'MH-14-EF-9012', salary_type: 'per_km', base_salary: 2, status: 'available', safety_score: 95, total_trips: 98, total_km: 76500, created_at: '2022-01-05T00:00:00Z' },
  { id: 'drv_004', company_id: COMPANY_ID, branch_id: 'branch_001', name: 'Ajay Chauhan', phone: '+91 98765 44444', license_number: 'GJ-0520200067890', license_expiry: '2026-08-25', aadhar: '4567-8901-2345', address: '56, Satellite Road, Ahmedabad', emergency_contact: 'Meena Chauhan', emergency_phone: '+91 98765 44445', date_of_joining: '2021-07-20', assigned_vehicle_id: 'veh_004', assigned_vehicle_reg: 'GJ-05-GH-3456', salary_type: 'per_trip', base_salary: 7500, status: 'on_trip', safety_score: 85, total_trips: 178, total_km: 134000, created_at: '2021-07-20T00:00:00Z' },
  { id: 'drv_005', company_id: COMPANY_ID, branch_id: 'branch_002', name: 'Manoj Reddy', phone: '+91 98765 55555', license_number: 'KA-0120220045678', license_expiry: '2027-12-01', aadhar: '5678-9012-3456', address: '34, Koramangala, Bangalore', emergency_contact: 'Lakshmi Reddy', emergency_phone: '+91 98765 55556', date_of_joining: '2023-02-14', assigned_vehicle_id: 'veh_006', assigned_vehicle_reg: 'KA-01-LM-2345', salary_type: 'monthly', base_salary: 28000, status: 'on_trip', safety_score: 91, total_trips: 67, total_km: 52000, created_at: '2023-02-14T00:00:00Z' },
  { id: 'drv_006', company_id: COMPANY_ID, branch_id: 'branch_002', name: 'Dinesh Verma', phone: '+91 98765 66666', license_number: 'MP-0920210034567', license_expiry: '2026-06-15', aadhar: '6789-0123-4567', address: '89, New Market, Bhopal', emergency_contact: 'Anita Verma', emergency_phone: '+91 98765 66667', date_of_joining: '2021-09-01', assigned_vehicle_id: 'veh_007', assigned_vehicle_reg: 'MP-09-NP-6789', salary_type: 'monthly', base_salary: 22000, status: 'available', safety_score: 78, total_trips: 156, total_km: 121000, created_at: '2021-09-01T00:00:00Z' },
];

const seedCustomers: Customer[] = [
  { id: 'cust_001', company_id: COMPANY_ID, branch_id: 'branch_001', name: 'Tata Motors Ltd', contact_person: 'Anil Deshmukh', phone: '+91 20 6613 4000', email: 'logistics@tatamotors.com', gstin: '27AAACR5055K1ZB', billing_address: 'Pimpri, Pune, Maharashtra - 411018', credit_limit: 5000000, credit_days: 30, outstanding: 875000, total_business: 12500000, status: 'active', created_at: '2020-01-15T00:00:00Z' },
  { id: 'cust_002', company_id: COMPANY_ID, branch_id: 'branch_001', name: 'Reliance Industries', contact_person: 'Pradeep Mehta', phone: '+91 22 3555 5000', email: 'supply.chain@ril.com', gstin: '27AAACR5055K2ZA', billing_address: 'Navi Mumbai, Maharashtra - 400701', credit_limit: 8000000, credit_days: 45, outstanding: 1250000, total_business: 18000000, status: 'active', created_at: '2019-06-20T00:00:00Z' },
  { id: 'cust_003', company_id: COMPANY_ID, branch_id: 'branch_001', name: 'Asian Paints Ltd', contact_person: 'Sunil Joshi', phone: '+91 22 6218 1000', email: 'logistics@asianpaints.com', gstin: '27AAACA8520F1Z2', billing_address: 'Andheri East, Mumbai - 400072', credit_limit: 3000000, credit_days: 30, outstanding: 450000, total_business: 7800000, status: 'active', created_at: '2020-09-10T00:00:00Z' },
  { id: 'cust_004', company_id: COMPANY_ID, branch_id: 'branch_002', name: 'UltraTech Cement', contact_person: 'Ravi Agarwal', phone: '+91 22 6692 8000', email: 'dispatch@ultratechcement.com', gstin: '27AAACK8785E1Z3', billing_address: 'Vikhroli, Mumbai - 400079', credit_limit: 4000000, credit_days: 21, outstanding: 320000, total_business: 9200000, status: 'active', created_at: '2021-02-05T00:00:00Z' },
  { id: 'cust_005', company_id: COMPANY_ID, branch_id: 'branch_002', name: 'Maruti Suzuki India', contact_person: 'Kavita Nair', phone: '+91 124 471 8000', email: 'transport@maruti.co.in', gstin: '06AABCM0027C1Z5', billing_address: 'Manesar, Gurugram, Haryana - 122051', credit_limit: 6000000, credit_days: 30, outstanding: 0, total_business: 5400000, status: 'active', created_at: '2022-04-15T00:00:00Z' },
];

const seedTrips: Trip[] = [
  { id: 'trip_001', company_id: COMPANY_ID, branch_id: 'branch_001', trip_number: 'TRP-2025-0142', lr_number: 'LR-7842', eway_bill: 'EWB-391847562', customer_id: 'cust_001', customer_name: 'Tata Motors Ltd', vehicle_id: 'veh_001', vehicle_reg: 'MH-12-AB-1234', driver_id: 'drv_001', driver_name: 'Suresh Kumar', driver_phone: '+91 98765 11111', origin: 'Pune, Maharashtra', origin_lat: 18.520, origin_lng: 73.856, destination: 'Mumbai, Maharashtra', dest_lat: 19.076, dest_lng: 72.877, distance_km: 150, material: 'Auto Parts', weight_tons: 18, num_packages: 240, booking_date: '2025-07-07', loading_date: '2025-07-08', departure_date: '2025-07-08', expected_delivery: '2025-07-09', freight_amount: 45000, advance_amount: 15000, balance_amount: 30000, detention_charges: 0, other_charges: 2000, total_amount: 47000, status: 'in_transit', created_at: '2025-07-07T09:00:00Z' },
  { id: 'trip_002', company_id: COMPANY_ID, branch_id: 'branch_001', trip_number: 'TRP-2025-0141', lr_number: 'LR-7841', eway_bill: 'EWB-391847123', customer_id: 'cust_002', customer_name: 'Reliance Industries', vehicle_id: 'veh_002', vehicle_reg: 'MH-12-CD-5678', driver_id: 'drv_002', driver_name: 'Ramesh Yadav', driver_phone: '+91 98765 22222', origin: 'Mumbai, Maharashtra', origin_lat: 19.076, origin_lng: 72.877, destination: 'Hyderabad, Telangana', dest_lat: 17.385, dest_lng: 78.486, distance_km: 710, material: 'Chemicals', weight_tons: 20, booking_date: '2025-07-06', loading_date: '2025-07-07', departure_date: '2025-07-07', expected_delivery: '2025-07-10', freight_amount: 85000, advance_amount: 30000, balance_amount: 55000, detention_charges: 0, other_charges: 3500, total_amount: 88500, status: 'in_transit', created_at: '2025-07-06T14:00:00Z' },
  { id: 'trip_003', company_id: COMPANY_ID, branch_id: 'branch_001', trip_number: 'TRP-2025-0140', lr_number: 'LR-7840', customer_id: 'cust_003', customer_name: 'Asian Paints Ltd', vehicle_id: 'veh_004', vehicle_reg: 'GJ-05-GH-3456', driver_id: 'drv_004', driver_name: 'Ajay Chauhan', driver_phone: '+91 98765 44444', origin: 'Ankleshwar, Gujarat', origin_lat: 21.626, origin_lng: 73.012, destination: 'Ahmedabad, Gujarat', dest_lat: 23.022, dest_lng: 72.571, distance_km: 230, material: 'Paint Chemicals', weight_tons: 22, booking_date: '2025-07-08', loading_date: '2025-07-09', departure_date: '2025-07-09', expected_delivery: '2025-07-10', freight_amount: 35000, advance_amount: 10000, balance_amount: 25000, detention_charges: 0, other_charges: 1500, total_amount: 36500, status: 'loading', created_at: '2025-07-08T11:00:00Z' },
  { id: 'trip_004', company_id: COMPANY_ID, branch_id: 'branch_001', trip_number: 'TRP-2025-0139', lr_number: 'LR-7839', eway_bill: 'EWB-391846789', customer_id: 'cust_004', customer_name: 'UltraTech Cement', vehicle_id: 'veh_006', vehicle_reg: 'KA-01-LM-2345', driver_id: 'drv_005', driver_name: 'Manoj Reddy', driver_phone: '+91 98765 55555', origin: 'Bangalore, Karnataka', origin_lat: 12.971, origin_lng: 77.594, destination: 'Goa', dest_lat: 15.299, dest_lng: 74.124, distance_km: 560, material: 'Cement Bags', weight_tons: 14, num_packages: 560, booking_date: '2025-07-05', loading_date: '2025-07-06', departure_date: '2025-07-06', expected_delivery: '2025-07-08', freight_amount: 62000, advance_amount: 20000, balance_amount: 42000, detention_charges: 2000, other_charges: 2500, total_amount: 66500, status: 'in_transit', created_at: '2025-07-05T08:30:00Z' },
  { id: 'trip_005', company_id: COMPANY_ID, branch_id: 'branch_002', trip_number: 'TRP-2025-0138', lr_number: 'LR-7838', eway_bill: 'EWB-391845432', customer_id: 'cust_001', customer_name: 'Tata Motors Ltd', vehicle_id: 'veh_003', vehicle_reg: 'MH-14-EF-9012', driver_id: 'drv_003', driver_name: 'Vikram Singh', driver_phone: '+91 98765 33333', origin: 'Pune, Maharashtra', origin_lat: 18.520, origin_lng: 73.856, destination: 'Delhi, NCR', dest_lat: 28.613, dest_lng: 77.209, distance_km: 1420, material: 'Engine Components', weight_tons: 22, num_packages: 180, booking_date: '2025-07-01', loading_date: '2025-07-02', departure_date: '2025-07-02', expected_delivery: '2025-07-05', actual_delivery: '2025-07-05', freight_amount: 125000, advance_amount: 40000, balance_amount: 0, detention_charges: 3000, other_charges: 5000, total_amount: 133000, status: 'completed', pod_date: '2025-07-05', created_at: '2025-07-01T10:00:00Z' },
  { id: 'trip_006', company_id: COMPANY_ID, branch_id: 'branch_002', trip_number: 'TRP-2025-0137', lr_number: 'LR-7837', eway_bill: 'EWB-391844321', customer_id: 'cust_005', customer_name: 'Maruti Suzuki India', vehicle_id: 'veh_007', vehicle_reg: 'MP-09-NP-6789', driver_id: 'drv_006', driver_name: 'Dinesh Verma', driver_phone: '+91 98765 66666', origin: 'Manesar, Haryana', origin_lat: 28.358, origin_lng: 76.935, destination: 'Chennai, Tamil Nadu', dest_lat: 13.082, dest_lng: 80.270, distance_km: 2180, material: 'Car Spare Parts', weight_tons: 19, num_packages: 320, booking_date: '2025-06-28', loading_date: '2025-06-29', departure_date: '2025-06-29', expected_delivery: '2025-07-03', actual_delivery: '2025-07-03', freight_amount: 175000, advance_amount: 60000, balance_amount: 0, detention_charges: 0, other_charges: 8000, total_amount: 183000, status: 'billed', pod_date: '2025-07-03', created_at: '2025-06-28T16:00:00Z' },
];

const seedInvoices: Invoice[] = [
  { id: 'inv_001', company_id: COMPANY_ID, branch_id: 'branch_001', invoice_number: 'INV-2025-0089', customer_id: 'cust_001', customer_name: 'Tata Motors Ltd', invoice_date: '2025-07-06', due_date: '2025-08-05', trip_ids: ['trip_005'], freight_total: 125000, detention_total: 3000, other_charges: 5000, subtotal: 133000, gst_percent: 5, gst_amount: 6650, tds_amount: 2660, total_amount: 136990, paid_amount: 0, balance_amount: 136990, status: 'sent', created_at: '2025-07-06T12:00:00Z' },
  { id: 'inv_002', company_id: COMPANY_ID, branch_id: 'branch_001', invoice_number: 'INV-2025-0088', customer_id: 'cust_005', customer_name: 'Maruti Suzuki India', invoice_date: '2025-07-04', due_date: '2025-08-03', trip_ids: ['trip_006'], freight_total: 175000, detention_total: 0, other_charges: 8000, subtotal: 183000, gst_percent: 5, gst_amount: 9150, tds_amount: 3660, total_amount: 188490, paid_amount: 188490, balance_amount: 0, status: 'paid', created_at: '2025-07-04T14:00:00Z' },
  { id: 'inv_003', company_id: COMPANY_ID, branch_id: 'branch_001', invoice_number: 'INV-2025-0087', customer_id: 'cust_002', customer_name: 'Reliance Industries', invoice_date: '2025-06-28', due_date: '2025-08-12', trip_ids: ['trip_002'], freight_total: 85000, detention_total: 0, other_charges: 3500, subtotal: 88500, gst_percent: 5, gst_amount: 4425, tds_amount: 1770, total_amount: 91155, paid_amount: 50000, balance_amount: 41155, status: 'partial', created_at: '2025-06-28T10:00:00Z' },
  { id: 'inv_004', company_id: COMPANY_ID, branch_id: 'branch_002', invoice_number: 'INV-2025-0086', customer_id: 'cust_003', customer_name: 'Asian Paints Ltd', invoice_date: '2025-06-20', due_date: '2025-07-20', trip_ids: [], freight_total: 95000, detention_total: 2500, other_charges: 4000, subtotal: 101500, gst_percent: 5, gst_amount: 5075, tds_amount: 2030, total_amount: 104545, paid_amount: 0, balance_amount: 104545, status: 'overdue', created_at: '2025-06-20T09:00:00Z' },
];

const seedPayments: Payment[] = [
  { id: 'pay_001', company_id: COMPANY_ID, branch_id: 'branch_001', invoice_id: 'inv_002', customer_id: 'cust_005', customer_name: 'Maruti Suzuki India', amount: 188490, payment_mode: 'bank_transfer', reference_number: 'NEFT-2025070712345', payment_date: '2025-07-07', tds_amount: 3660, status: 'cleared', created_at: '2025-07-07T11:00:00Z' },
  { id: 'pay_002', company_id: COMPANY_ID, branch_id: 'branch_001', invoice_id: 'inv_003', customer_id: 'cust_002', customer_name: 'Reliance Industries', amount: 50000, payment_mode: 'bank_transfer', reference_number: 'RTGS-2025070567890', payment_date: '2025-07-05', tds_amount: 1000, status: 'cleared', created_at: '2025-07-05T15:00:00Z' },
];

const seedExpenses: Expense[] = [
  { id: 'exp_001', company_id: COMPANY_ID, branch_id: 'branch_001', trip_id: 'trip_001', vehicle_id: 'veh_001', vehicle_reg: 'MH-12-AB-1234', category: 'diesel', amount: 12000, date: '2025-07-08', description: 'Diesel fill - Pune to Mumbai trip', paid_to: 'HP Petrol Pump, Lonavala', payment_mode: 'fuel_card', approved: true, created_at: '2025-07-08T06:30:00Z' },
  { id: 'exp_002', company_id: COMPANY_ID, branch_id: 'branch_001', trip_id: 'trip_002', vehicle_id: 'veh_002', vehicle_reg: 'MH-12-CD-5678', category: 'toll', amount: 4500, date: '2025-07-07', description: 'Toll charges Mumbai-Hyderabad NH-44', paid_to: 'Various toll plazas', payment_mode: 'fastag', approved: true, created_at: '2025-07-07T08:00:00Z' },
  { id: 'exp_003', company_id: COMPANY_ID, branch_id: 'branch_001', trip_id: 'trip_001', vehicle_id: 'veh_001', vehicle_reg: 'MH-12-AB-1234', category: 'driver_bata', amount: 800, date: '2025-07-08', description: 'Driver daily allowance', paid_to: 'Suresh Kumar', payment_mode: 'cash', approved: true, created_at: '2025-07-08T07:00:00Z' },
  { id: 'exp_004', company_id: COMPANY_ID, branch_id: 'branch_001', vehicle_id: 'veh_005', vehicle_reg: 'RJ-14-JK-7890', category: 'repair', amount: 35000, date: '2025-07-08', description: 'Engine overhaul and clutch plate replacement', paid_to: 'Sharma Auto Works, Jaipur', payment_mode: 'bank', approved: true, created_at: '2025-07-08T10:00:00Z' },
  { id: 'exp_005', company_id: COMPANY_ID, branch_id: 'branch_001', trip_id: 'trip_005', vehicle_id: 'veh_003', vehicle_reg: 'MH-14-EF-9012', category: 'toll', amount: 8200, date: '2025-07-02', description: 'Toll charges Pune-Delhi NH-48/NH-44', paid_to: 'Various toll plazas', payment_mode: 'fastag', approved: true, created_at: '2025-07-02T05:00:00Z' },
  { id: 'exp_006', company_id: COMPANY_ID, branch_id: 'branch_002', category: 'salary', amount: 125000, date: '2025-07-01', description: 'Monthly driver salaries - July 2025', paid_to: 'All drivers', payment_mode: 'bank', approved: true, created_at: '2025-07-01T12:00:00Z' },
  { id: 'exp_007', company_id: COMPANY_ID, branch_id: 'branch_002', category: 'office', amount: 15000, date: '2025-07-01', description: 'Office rent - July 2025', paid_to: 'Property Owner', payment_mode: 'bank', approved: true, created_at: '2025-07-01T10:00:00Z' },
];

const seedFuelEntries: FuelEntry[] = [
  { id: 'fuel_001', company_id: COMPANY_ID, branch_id: 'branch_001', vehicle_id: 'veh_001', vehicle_reg: 'MH-12-AB-1234', driver_id: 'drv_001', driver_name: 'Suresh Kumar', trip_id: 'trip_001', date: '2025-07-08', litres: 120, rate: 95.5, amount: 11460, odometer: 145100, station: 'HP Petrol Pump, Lonavala', mileage: 4.2, created_at: '2025-07-08T06:30:00Z' },
  { id: 'fuel_002', company_id: COMPANY_ID, branch_id: 'branch_001', vehicle_id: 'veh_002', vehicle_reg: 'MH-12-CD-5678', driver_id: 'drv_002', driver_name: 'Ramesh Yadav', trip_id: 'trip_002', date: '2025-07-07', litres: 200, rate: 94.8, amount: 18960, odometer: 198200, station: 'Indian Oil, Pune-Mumbai Expressway', mileage: 3.8, created_at: '2025-07-07T05:45:00Z' },
  { id: 'fuel_003', company_id: COMPANY_ID, branch_id: 'branch_002', vehicle_id: 'veh_006', vehicle_reg: 'KA-01-LM-2345', driver_id: 'drv_005', driver_name: 'Manoj Reddy', trip_id: 'trip_004', date: '2025-07-06', litres: 150, rate: 96.2, amount: 14430, odometer: 43050, station: 'BPCL, Bangalore-Hubli Highway', mileage: 4.5, created_at: '2025-07-06T07:00:00Z' },
];

const seedMaintenance: MaintenanceRecord[] = [
  { id: 'maint_001', company_id: COMPANY_ID, branch_id: 'branch_001', vehicle_id: 'veh_005', vehicle_reg: 'RJ-14-JK-7890', type: 'repair', description: 'Engine overhaul - excessive smoke and power loss', date: '2025-07-08', odometer: 234560, cost: 35000, vendor: 'Sharma Auto Works, Jaipur', next_due_date: '2025-10-08', next_due_km: 254560, status: 'in_progress', created_at: '2025-07-08T09:00:00Z' },
  { id: 'maint_002', company_id: COMPANY_ID, branch_id: 'branch_001', vehicle_id: 'veh_001', vehicle_reg: 'MH-12-AB-1234', type: 'preventive', description: 'Scheduled oil change and filter replacement', date: '2025-07-15', odometer: 145000, cost: 8500, vendor: 'Tata Authorized Service, Pune', next_due_date: '2025-10-15', next_due_km: 160000, status: 'scheduled', created_at: '2025-07-05T14:00:00Z' },
  { id: 'maint_003', company_id: COMPANY_ID, branch_id: 'branch_002', vehicle_id: 'veh_002', vehicle_reg: 'MH-12-CD-5678', type: 'tyre', description: 'Rear tyre replacement - 2 tyres', date: '2025-07-03', odometer: 197800, cost: 42000, vendor: 'MRF Tyre Zone, Pune', next_due_km: 247800, status: 'completed', created_at: '2025-07-03T11:00:00Z' },
];

const seedAlerts: SystemAlert[] = [
  { id: 'alert_001', company_id: COMPANY_ID, type: 'document_expiry', title: 'Insurance Expiring Soon', description: 'Vehicle RJ-14-JK-7890 insurance expires on Jul 31, 2025', severity: 'critical', entity_id: 'veh_005', is_read: false, created_at: '2025-07-09T06:00:00Z' },
  { id: 'alert_002', company_id: COMPANY_ID, type: 'document_expiry', title: 'PUC Expiring Soon', description: 'Vehicle RJ-14-JK-7890 PUC expires on Jul 15, 2025', severity: 'critical', entity_id: 'veh_005', is_read: false, created_at: '2025-07-09T06:00:00Z' },
  { id: 'alert_003', company_id: COMPANY_ID, type: 'payment_overdue', title: 'Invoice Overdue', description: 'Invoice INV-2025-0086 for Asian Paints Ltd is overdue by 19 days', severity: 'warning', entity_id: 'inv_004', is_read: false, created_at: '2025-07-09T06:00:00Z' },
  { id: 'alert_004', company_id: COMPANY_ID, type: 'maintenance_due', title: 'Scheduled Maintenance', description: 'Vehicle MH-12-AB-1234 oil change scheduled for Jul 15, 2025', severity: 'info', entity_id: 'veh_001', is_read: false, created_at: '2025-07-09T06:00:00Z' },
  { id: 'alert_005', company_id: COMPANY_ID, type: 'trip_delay', title: 'Trip Delay Warning', description: 'Trip TRP-2025-0139 (Bangalore to Goa) may be delayed due to heavy traffic on NH-48', severity: 'warning', entity_id: 'trip_004', is_read: true, created_at: '2025-07-08T18:00:00Z' },
];

const seedEnquiries: Enquiry[] = [
  { id: 'enq_001', company_id: COMPANY_ID, branch_id: 'branch_002', customer_id: 'cust_004', customer_name: 'UltraTech Cement', origin: 'Rajashree Nagar, Karnataka', destination: 'Chennai, Tamil Nadu', material: 'Cement Bags', vehicle_type: 'truck', weight_tons: 25, loading_date: '2025-07-12', target_rate: 55000, status: 'new', created_at: '2025-07-09T09:00:00Z' },
  { id: 'enq_002', company_id: COMPANY_ID, branch_id: 'branch_001', customer_id: 'cust_002', customer_name: 'Reliance Industries', origin: 'Jamnagar, Gujarat', destination: 'Delhi, NCR', material: 'Polymer Granules', vehicle_type: 'container', weight_tons: 20, loading_date: '2025-07-14', target_rate: 95000, status: 'quoted', remarks: 'Quoted at ₹1,05,000', created_at: '2025-07-08T16:00:00Z' },
];

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
  company: seedCompany,
  user: seedUser,
  vehicles: seedVehicles,
  drivers: seedDrivers,
  customers: seedCustomers,
  trips: seedTrips,
  invoices: seedInvoices,
  payments: seedPayments,
  expenses: seedExpenses,
  fuelEntries: seedFuelEntries,
  maintenance: seedMaintenance,
  alerts: seedAlerts,
  enquiries: seedEnquiries,
  activeModule: 'dashboard',
  sidebarCollapsed: false,
  isLoggedIn: false,
  showModal: null,
  theme: 'light',
  notifications: seedNotifications,
  quotations: seedQuotations,
  branches: seedBranches,
  activeBranch: 'all',
  activityLog: seedActivityLog,
  onboarding: { completed: true, current_step: 5, steps_completed: ['company_setup', 'add_vehicles', 'add_drivers', 'add_customers', 'first_trip'] },

  addVehicle: (vehicle) => set((state) => {
    const newVeh = { ...vehicle, branch_id: vehicle.branch_id || state.activeBranch };
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'added', entity_type: 'vehicle', entity_id: vehicle.id, details: `${state.user.name} added vehicle ${vehicle.reg_number}`, timestamp: new Date().toISOString() };
    return { vehicles: [...state.vehicles, newVeh], activityLog: [log, ...state.activityLog] };
  }),
  updateVehicle: (id, updates) => set((state) => ({ vehicles: state.vehicles.map((v) => v.id === id ? { ...v, ...updates } : v) })),
  deleteVehicle: (id) => set((state) => {
    const v = state.vehicles.find(x => x.id === id);
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'deleted', entity_type: 'vehicle', entity_id: id, details: `${state.user.name} removed vehicle ${v?.reg_number || id}`, timestamp: new Date().toISOString() };
    return { vehicles: state.vehicles.filter((x) => x.id !== id), activityLog: [log, ...state.activityLog] };
  }),
  addDriver: (driver) => set((state) => {
    const newDrv = { ...driver, branch_id: driver.branch_id || state.activeBranch };
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'added', entity_type: 'driver', entity_id: driver.id, details: `${state.user.name} added driver ${driver.name}`, timestamp: new Date().toISOString() };
    return { drivers: [...state.drivers, newDrv], activityLog: [log, ...state.activityLog] };
  }),
  updateDriver: (id, updates) => set((state) => ({ drivers: state.drivers.map((d) => d.id === id ? { ...d, ...updates } : d) })),
  deleteDriver: (id) => set((state) => {
    const d = state.drivers.find(x => x.id === id);
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'deleted', entity_type: 'driver', entity_id: id, details: `${state.user.name} removed driver ${d?.name || id}`, timestamp: new Date().toISOString() };
    return { drivers: state.drivers.filter((x) => x.id !== id), activityLog: [log, ...state.activityLog] };
  }),
  addCustomer: (customer) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'added', entity_type: 'customer', entity_id: customer.id, details: `${state.user.name} added customer ${customer.name}`, timestamp: new Date().toISOString() };
    return { customers: [...state.customers, { ...customer, branch_id: customer.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  updateCustomer: (id, updates) => set((state) => ({ customers: state.customers.map((c) => c.id === id ? { ...c, ...updates } : c) })),
  addTrip: (trip) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'created', entity_type: 'trip', entity_id: trip.id, details: `${state.user.name} created trip ${trip.trip_number}`, timestamp: new Date().toISOString() };
    return { trips: [...state.trips, { ...trip, branch_id: trip.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  updateTrip: (id, updates) => set((state) => ({ trips: state.trips.map((t) => t.id === id ? { ...t, ...updates } : t) })),
  updateTripStatus: (id, status) => set((state) => {
    const trip = state.trips.find(t => t.id === id);
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'updated', entity_type: 'trip', entity_id: id, details: `${state.user.name} changed trip ${trip?.trip_number || id} status to ${status}`, timestamp: new Date().toISOString() };
    return { trips: state.trips.map((t) => t.id === id ? { ...t, status } : t), activityLog: [log, ...state.activityLog] };
  }),
  addInvoice: (invoice) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'generated', entity_type: 'invoice', entity_id: invoice.id, details: `${state.user.name} generated invoice ${invoice.invoice_number}`, timestamp: new Date().toISOString() };
    return { invoices: [...state.invoices, { ...invoice, branch_id: invoice.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  addPayment: (payment) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'recorded', entity_type: 'payment', entity_id: payment.id, details: `Payment ₹${payment.amount.toLocaleString()} recorded for ${payment.customer_name}`, timestamp: new Date().toISOString() };
    return { payments: [...state.payments, { ...payment, branch_id: payment.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, { ...expense, branch_id: expense.branch_id || state.activeBranch }] })),
  addFuelEntry: (entry) => set((state) => ({ fuelEntries: [...state.fuelEntries, { ...entry, branch_id: entry.branch_id || state.activeBranch }] })),
  addMaintenance: (record) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'scheduled', entity_type: 'maintenance', entity_id: record.id, details: `${state.user.name} scheduled maintenance for ${record.vehicle_reg}`, timestamp: new Date().toISOString() };
    return { maintenance: [...state.maintenance, { ...record, branch_id: record.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  addEnquiry: (enquiry) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), company_id: state.company.id, user_name: state.user.name, action: 'created', entity_type: 'enquiry', entity_id: enquiry.id, details: `New enquiry from ${enquiry.customer_name}: ${enquiry.origin} → ${enquiry.destination}`, timestamp: new Date().toISOString() };
    return { enquiries: [...state.enquiries, { ...enquiry, branch_id: enquiry.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  markAlertRead: (id) => set((state) => ({ alerts: state.alerts.map((a) => a.id === id ? { ...a, is_read: true } : a) })),
  setActiveModule: (module) => set({ activeModule: module }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ isLoggedIn: false }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  addNotification: (n) => set((state) => ({ notifications: [n, ...state.notifications] })),
  markNotificationRead: (id) => set((state) => ({ notifications: state.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n) })),
  markAllNotificationsRead: () => set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, is_read: true })) })),
  addQuotation: (q) => set((state) => ({ quotations: [q, ...state.quotations] })),
  updateQuotation: (id, updates) => set((state) => ({ quotations: state.quotations.map((q) => q.id === id ? { ...q, ...updates } : q) })),
  convertEnquiryToQuotation: (enquiryId) => set((state) => {
    const enquiry = state.enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) return state;
    const quotation: Quotation = {
      id: 'quot_' + generateId(),
      company_id: enquiry.company_id,
      quotation_number: `QT-2025-${String(state.quotations.length + 35).padStart(4, '0')}`,
      enquiry_id: enquiry.id,
      customer_id: enquiry.customer_id,
      customer_name: enquiry.customer_name,
      origin: enquiry.origin,
      destination: enquiry.destination,
      vehicle_type: enquiry.vehicle_type,
      material: enquiry.material,
      weight_tons: enquiry.weight_tons,
      rate_type: 'per_trip',
      rate: enquiry.target_rate,
      total_amount: Math.round(enquiry.target_rate * 1.05),
      gst_percent: 5,
      validity_days: 7,
      status: 'draft',
      created_at: new Date().toISOString(),
    };
    return {
      quotations: [quotation, ...state.quotations],
      enquiries: state.enquiries.map((e) => e.id === enquiryId ? { ...e, status: 'quoted' as const } : e),
    };
  }),
  convertQuotationToTrip: (quotationId) => set((state) => {
    const quotation = state.quotations.find((q) => q.id === quotationId);
    if (!quotation) return state;
    const tripNumber = `TRP-2025-${String(state.trips.length + 143).padStart(4, '0')}`;
    const trip: Trip = {
      id: 'trip_' + generateId(),
      company_id: quotation.company_id,
      trip_number: tripNumber,
      lr_number: `LR-${7843 + state.trips.length}`,
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      vehicle_id: '',
      vehicle_reg: '',
      driver_id: '',
      driver_name: '',
      driver_phone: '',
      origin: quotation.origin,
      destination: quotation.destination,
      distance_km: 0,
      material: quotation.material,
      weight_tons: quotation.weight_tons,
      booking_date: new Date().toISOString().split('T')[0],
      freight_amount: quotation.rate,
      advance_amount: 0,
      balance_amount: quotation.rate,
      detention_charges: 0,
      other_charges: 0,
      total_amount: quotation.rate,
      status: 'booked',
      created_at: new Date().toISOString(),
    };
    return {
      trips: [trip, ...state.trips],
      quotations: state.quotations.map((q) => q.id === quotationId ? { ...q, status: 'accepted' as const } : q),
    };
  }),
  setActiveBranch: (branchId) => set({ activeBranch: branchId }),
  addActivityLog: (log) => set((state) => ({ activityLog: [log, ...state.activityLog] })),
}),
    {
      name: 'garud-erp-storage',
      partialize: (state) => ({
        vehicles: state.vehicles,
        drivers: state.drivers,
        customers: state.customers,
        trips: state.trips,
        invoices: state.invoices,
        payments: state.payments,
        expenses: state.expenses,
        fuelEntries: state.fuelEntries,
        maintenance: state.maintenance,
        alerts: state.alerts,
        enquiries: state.enquiries,
        notifications: state.notifications,
        quotations: state.quotations,
        activityLog: state.activityLog,
        theme: state.theme,
        company: state.company,
        isLoggedIn: state.isLoggedIn,
        user: state.user,
      }),
    }
  )
);
