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
