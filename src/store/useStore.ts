import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Company,
  User,
  ModuleName,
  Theme,
  OnboardingState,
} from '../types';

// ============================================================
// DEPRECATED: generateId() — DO NOT USE for new code.
// All business records use Postgres-generated UUIDs via useModuleData.
// This remains exported only because some modules still import it.
// The useModuleData sanitizer strips non-UUID IDs before INSERT.
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
// 3. Company display info (for PDF headers — migrating to org context)
//
// ALL BUSINESS DATA comes from Supabase via useModuleData / usePaginatedData.
// NO business CRUD actions exist here. They were removed because:
// - All modules already use useModuleData for Supabase CRUD
// - No-ops would silently swallow user actions without saving
// - The caller matrix confirmed zero runtime callers of store CRUD
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

  // ===== ACTIONS =====
  setActiveModule: (module: ModuleName) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setActiveBranch: (branchId: string) => void;
  login: (user: User) => void;
  logout: () => void;
}

// ============================================================
// DEPRECATED: getDashboardMetrics — Dashboard uses Supabase data directly
// ============================================================
/** @deprecated Dashboard uses useModuleData for real-time Supabase metrics */
export function getDashboardMetrics(_state: StoreState) {
  return {
    totalVehicles: 0, activeVehicles: 0, availableVehicles: 0, maintenanceVehicles: 0,
    totalTrips: 0, activeTrips: 0, completedTrips: 0,
    totalRevenue: 0, totalReceived: 0, totalExpenses: 0, totalOutstanding: 0,
    totalDrivers: 0, availableDrivers: 0, unreadAlerts: 0,
  };
}

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
