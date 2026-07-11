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

// Store initial state — ALWAYS empty for new production pattern
// Business data comes from Supabase via useModuleData hook
// Store is kept for UI state, navigation, and backward compat during migration

// No hardcoded company ID — organization comes from Supabase


















export const useStore = create<StoreState>()(
  persist(
    (set) => ({
  company: { id: '', name: '', address: '', city: '', state: '', gstin: '', pan: '', phone: '', email: '' },
  user: { id: '', name: '', email: '', role: 'super_admin' as const, phone: '', status: 'active' as const },
  vehicles: [],
  drivers: [],
  customers: [],
  trips: [],
  invoices: [],
  payments: [],
  expenses: [],
  fuelEntries: [],
  maintenance: [],
  alerts: [],
  enquiries: [],
  activeModule: 'dashboard',
  sidebarCollapsed: false,
  isLoggedIn: false,
  showModal: null,
  theme: 'light',
  notifications: [],
  quotations: [],
  branches: [{ id: 'branch_001', name: 'Head Office', code: 'HQ', city: '', state: '', address: '', manager_name: '', phone: '', status: 'active' as const }],
  activeBranch: 'all',
  activityLog: [],
  onboarding: { completed: false, current_step: 0, steps_completed: [] as string[] },

  addVehicle: (vehicle) => set((state) => {
    const newVeh = { ...vehicle, branch_id: vehicle.branch_id || state.activeBranch };
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'added', entity_type: 'vehicle', entity_id: vehicle.id, details: `${state.user.name} added vehicle ${vehicle.reg_number}`, timestamp: new Date().toISOString() };
    return { vehicles: [...state.vehicles, newVeh], activityLog: [log, ...state.activityLog] };
  }),
  updateVehicle: (id, updates) => set((state) => ({ vehicles: state.vehicles.map((v) => v.id === id ? { ...v, ...updates } : v) })),
  deleteVehicle: (id) => set((state) => {
    const v = state.vehicles.find(x => x.id === id);
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'deleted', entity_type: 'vehicle', entity_id: id, details: `${state.user.name} removed vehicle ${v?.reg_number || id}`, timestamp: new Date().toISOString() };
    return { vehicles: state.vehicles.filter((x) => x.id !== id), activityLog: [log, ...state.activityLog] };
  }),
  addDriver: (driver) => set((state) => {
    const newDrv = { ...driver, branch_id: driver.branch_id || state.activeBranch };
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'added', entity_type: 'driver', entity_id: driver.id, details: `${state.user.name} added driver ${driver.name}`, timestamp: new Date().toISOString() };
    return { drivers: [...state.drivers, newDrv], activityLog: [log, ...state.activityLog] };
  }),
  updateDriver: (id, updates) => set((state) => ({ drivers: state.drivers.map((d) => d.id === id ? { ...d, ...updates } : d) })),
  deleteDriver: (id) => set((state) => {
    const d = state.drivers.find(x => x.id === id);
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'deleted', entity_type: 'driver', entity_id: id, details: `${state.user.name} removed driver ${d?.name || id}`, timestamp: new Date().toISOString() };
    return { drivers: state.drivers.filter((x) => x.id !== id), activityLog: [log, ...state.activityLog] };
  }),
  addCustomer: (customer) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'added', entity_type: 'customer', entity_id: customer.id, details: `${state.user.name} added customer ${customer.name}`, timestamp: new Date().toISOString() };
    return { customers: [...state.customers, { ...customer, branch_id: customer.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  updateCustomer: (id, updates) => set((state) => ({ customers: state.customers.map((c) => c.id === id ? { ...c, ...updates } : c) })),
  addTrip: (trip) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'created', entity_type: 'trip', entity_id: trip.id, details: `${state.user.name} created trip ${trip.trip_number}`, timestamp: new Date().toISOString() };
    return { trips: [...state.trips, { ...trip, branch_id: trip.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  updateTrip: (id, updates) => set((state) => ({ trips: state.trips.map((t) => t.id === id ? { ...t, ...updates } : t) })),
  updateTripStatus: (id, status) => set((state) => {
    const trip = state.trips.find(t => t.id === id);
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'updated', entity_type: 'trip', entity_id: id, details: `${state.user.name} changed trip ${trip?.trip_number || id} status to ${status}`, timestamp: new Date().toISOString() };
    return { trips: state.trips.map((t) => t.id === id ? { ...t, status } : t), activityLog: [log, ...state.activityLog] };
  }),
  addInvoice: (invoice) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'generated', entity_type: 'invoice', entity_id: invoice.id, details: `${state.user.name} generated invoice ${invoice.invoice_number}`, timestamp: new Date().toISOString() };
    return { invoices: [...state.invoices, { ...invoice, branch_id: invoice.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  addPayment: (payment) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'recorded', entity_type: 'payment', entity_id: payment.id, details: `Payment ₹${payment.amount.toLocaleString()} recorded for ${payment.customer_name}`, timestamp: new Date().toISOString() };
    return { payments: [...state.payments, { ...payment, branch_id: payment.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  addExpense: (expense) => set((state) => ({ expenses: [...state.expenses, { ...expense, branch_id: expense.branch_id || state.activeBranch }] })),
  addFuelEntry: (entry) => set((state) => ({ fuelEntries: [...state.fuelEntries, { ...entry, branch_id: entry.branch_id || state.activeBranch }] })),
  addMaintenance: (record) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'scheduled', entity_type: 'maintenance', entity_id: record.id, details: `${state.user.name} scheduled maintenance for ${record.vehicle_reg}`, timestamp: new Date().toISOString() };
    return { maintenance: [...state.maintenance, { ...record, branch_id: record.branch_id || state.activeBranch }], activityLog: [log, ...state.activityLog] };
  }),
  addEnquiry: (enquiry) => set((state) => {
    const log: ActivityLog = { id: 'act_' + generateId(), user_name: state.user.name, action: 'created', entity_type: 'enquiry', entity_id: enquiry.id, details: `New enquiry from ${enquiry.customer_name}: ${enquiry.origin} → ${enquiry.destination}`, timestamp: new Date().toISOString() };
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
      name: 'garud-erp-ui-state',
      partialize: (state) => ({
        // Only persist UI state — business data comes from Supabase
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        isLoggedIn: state.isLoggedIn,
        user: state.user,
        activeModule: state.activeModule,
        activeBranch: state.activeBranch,
      }),
    }
  )
);
