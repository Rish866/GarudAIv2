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

// ============================================================
// DEPRECATED: generateId() — DO NOT USE for new code.
// All business records use Postgres-generated UUIDs via useModuleData.
// This remains exported only for backward compatibility during migration.
// ============================================================
/** @deprecated Use useModuleData.create() which lets Postgres generate UUIDs */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}


// ============================================================
// STORE STATE INTERFACE
// 
// This store manages ONLY:
// 1. UI state (theme, sidebar, activeModule, activeBranch)
// 2. Auth session indicator (isLoggedIn, user identity)
// 3. Company display info (for PDF headers — will migrate to org context)
//
// ALL BUSINESS DATA comes from Supabase via useModuleData / usePaginatedData.
// The empty arrays below exist only for backward compatibility with Topbar search
// and will be removed in a future cleanup.
// ============================================================

interface StoreState {
  // Display / identity (populated on login, cleared on logout)
  company: Company;
  user: User;

  // UI state
  activeModule: ModuleName;
  sidebarCollapsed: boolean;
  isLoggedIn: boolean;
  showModal: { type: string; data?: unknown } | null;
  theme: Theme;
  activeBranch: string;
  onboarding: OnboardingState;

  // Legacy empty arrays — kept for Topbar search backward compat only
  // These are NEVER persisted and NEVER populated from Supabase here.
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
  notifications: Notification[];
  quotations: Quotation[];
  branches: Branch[];
  activityLog: ActivityLog[];

  // ===== ACTIONS =====

  // UI actions
  setActiveModule: (module: ModuleName) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setActiveBranch: (branchId: string) => void;

  // Auth actions
  login: (user: User) => void;
  logout: () => void;

  // Legacy no-op actions — kept for import compatibility.
  // These do NOTHING. All CRUD goes through useModuleData → Supabase.
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
  addNotification: (n: Notification) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addQuotation: (q: Quotation) => void;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  convertEnquiryToQuotation: (enquiryId: string) => void;
  convertQuotationToTrip: (quotationId: string) => void;
  addActivityLog: (log: ActivityLog) => void;
}

// ============================================================
// DEPRECATED: getDashboardMetrics — Dashboard now uses Supabase data directly
// ============================================================
/** @deprecated Dashboard uses useModuleData for real-time Supabase metrics */
export function getDashboardMetrics(state: StoreState) {
  return {
    totalVehicles: 0, activeVehicles: 0, availableVehicles: 0, maintenanceVehicles: 0,
    totalTrips: 0, activeTrips: 0, completedTrips: 0,
    totalRevenue: 0, totalReceived: 0, totalExpenses: 0, totalOutstanding: 0,
    totalDrivers: 0, availableDrivers: 0, unreadAlerts: 0,
  };
}

// No-op function for legacy action compatibility
const noop = () => {};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Identity
      company: { id: '', name: '', address: '', city: '', state: '', gstin: '', pan: '', phone: '', email: '' },
      user: { id: '', name: '', email: '', role: 'operations' as const, phone: '', status: 'active' as const },

      // UI state
      activeModule: 'dashboard' as ModuleName,
      sidebarCollapsed: false,
      isLoggedIn: false,
      showModal: null,
      theme: 'light' as Theme,
      activeBranch: 'all',
      onboarding: { completed: false, current_step: 0, steps_completed: [] as string[] },

      // Legacy empty arrays (never populated, backward compat only)
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
      notifications: [],
      quotations: [],
      branches: [],
      activityLog: [],

      // ===== UI ACTIONS =====
      setActiveModule: (module) => set({ activeModule: module }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setActiveBranch: (branchId) => set({ activeBranch: branchId }),

      // ===== AUTH ACTIONS =====
      login: (user) => set({ user, isLoggedIn: true }),
      logout: () => set({
        isLoggedIn: false,
        user: { id: '', name: '', email: '', role: 'operations' as const, phone: '', status: 'active' as const },
        activeModule: 'dashboard' as ModuleName,
        activeBranch: 'all',
      }),

      // ===== LEGACY NO-OP ACTIONS =====
      // All business CRUD goes through useModuleData → Supabase.
      // These are kept ONLY so existing imports don't break during migration.
      addVehicle: noop as any,
      updateVehicle: noop as any,
      deleteVehicle: noop as any,
      addDriver: noop as any,
      updateDriver: noop as any,
      deleteDriver: noop as any,
      addCustomer: noop as any,
      updateCustomer: noop as any,
      addTrip: noop as any,
      updateTrip: noop as any,
      updateTripStatus: noop as any,
      addInvoice: noop as any,
      addPayment: noop as any,
      addExpense: noop as any,
      addFuelEntry: noop as any,
      addMaintenance: noop as any,
      addEnquiry: noop as any,
      markAlertRead: noop as any,
      addNotification: noop as any,
      markNotificationRead: noop as any,
      markAllNotificationsRead: noop as any,
      addQuotation: noop as any,
      updateQuotation: noop as any,
      convertEnquiryToQuotation: noop as any,
      convertQuotationToTrip: noop as any,
      addActivityLog: noop as any,
    }),
    {
      name: 'garud-erp-ui-state',
      partialize: (state) => ({
        // Only persist non-sensitive UI preferences.
        // Authentication state is rehydrated from Supabase session on boot.
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        activeModule: state.activeModule,
        activeBranch: state.activeBranch,
        // isLoggedIn + user are persisted for instant render on refresh,
        // but validated against Supabase session immediately on boot.
        // If Supabase session is missing, these are cleared automatically.
        isLoggedIn: state.isLoggedIn,
        user: state.user,
      }),
    }
  )
);
